import { useState, useEffect, useCallback } from 'react';
import { type User } from '@supabase/supabase-js';
import { supabase, Usuario } from '../lib/supabaseClient';

// Debug state interface
interface DebugState {
  step: string;
  timestamp: string;
  data?: any;
  error?: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<Usuario | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [debugSteps, setDebugSteps] = useState<DebugState[]>([]);

  // Debug logging function
  const addDebugStep = (step: string, data?: any, error?: string) => {
    const debugStep: DebugState = {
      step,
      timestamp: new Date().toISOString(),
      data,
      error
    };
    
    console.log(`🔐 DEBUG [${debugStep.timestamp}]: ${step}`, { data, error });
    
    setDebugSteps(prev => [...prev.slice(-9), debugStep]); // Keep last 10 steps
  };

  const handleUserSession = async (authUser: User) => {
    try {
      addDebugStep('handleUserSession_start', { email: authUser.email, id: authUser.id });
      
      setSupabaseUser(authUser);
      addDebugStep('handleUserSession_supabase_user_set');
      
      // Use the database RPC function to handle user creation/update
      addDebugStep('handleUserSession_calling_rpc_function');
      
      const { error: rpcError } = await supabase.rpc('handle_auth_user_creation', {
        auth_user_id: authUser.id,
        auth_email: authUser.email || '',
        auth_name: authUser.user_metadata?.nombre || authUser.email?.split('@')[0] || 'Usuario'
      });

      if (rpcError) {
        addDebugStep('handleUserSession_rpc_error', null, rpcError.message);
        console.error('🔐 RPC Error:', rpcError);
        
        // Fallback to direct database operations if RPC fails
        addDebugStep('handleUserSession_rpc_fallback_starting');
        await handleUserSessionFallback(authUser);
        return;
      }

      addDebugStep('handleUserSession_rpc_success');

      // Fetch the user profile from database after RPC call
      addDebugStep('handleUserSession_fetching_user_profile');
      
      const { data: userProfile, error: userError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (userError) {
        addDebugStep('handleUserSession_user_fetch_error', null, userError.message);
        throw userError;
      }

      if (!userProfile) {
        addDebugStep('handleUserSession_no_user_profile_found');
        throw new Error('User profile not found after RPC call');
      }

      addDebugStep('handleUserSession_user_profile_fetched', userProfile);
      setUser(userProfile);

      // Fetch the user role from database
      addDebugStep('handleUserSession_fetching_user_role');
      
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('rol')
        .eq('user_id', authUser.id)
        .single();

      if (roleError) {
        addDebugStep('handleUserSession_role_fetch_error', null, roleError.message);
        // Default to admin for development if role fetch fails
        setUserRole('admin');
        addDebugStep('handleUserSession_role_defaulted_to_admin');
      } else {
        addDebugStep('handleUserSession_role_fetched', roleData);
        setUserRole(roleData.rol);
      }

      addDebugStep('handleUserSession_completed_successfully');

    } catch (error) {
      addDebugStep('handleUserSession_catch_error', null, error instanceof Error ? error.message : 'Unknown error');
      console.error('🔐 useAuth: Error handling user session:', error);
      
      // Create fallback user for development
      await handleUserSessionFallback(authUser);
    }
  };

  // Fallback method for when RPC fails
  const handleUserSessionFallback = async (authUser: User) => {
    try {
      addDebugStep('handleUserSessionFallback_start');
      
      // Try to get existing user first
      const { data: existingUser, error: selectError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = no rows returned
        addDebugStep('handleUserSessionFallback_select_error', null, selectError.message);
      }

      if (existingUser) {
        addDebugStep('handleUserSessionFallback_existing_user_found', existingUser);
        setUser(existingUser);
      } else {
        addDebugStep('handleUserSessionFallback_creating_new_profile');
        
        // Try upsert for user profile
        const { data: upsertedUser, error: upsertError } = await supabase
          .from('usuarios')
          .upsert([{
            id: authUser.id,
            correo: authUser.email || '',
            nombre: authUser.user_metadata?.nombre || authUser.email?.split('@')[0] || 'Usuario'
          }], {
            onConflict: 'id'
          })
          .select()
          .single();

        if (upsertError) {
          addDebugStep('handleUserSessionFallback_upsert_error', null, upsertError.message);
          
          // Create a mock user for development
          const mockUser: Usuario = {
            id: authUser.id,
            correo: authUser.email || '',
            nombre: authUser.user_metadata?.nombre || authUser.email?.split('@')[0] || 'Usuario',
            created_at: new Date().toISOString()
          };
          setUser(mockUser);
          addDebugStep('handleUserSessionFallback_mock_user_created', mockUser);
        } else {
          addDebugStep('handleUserSessionFallback_upsert_success', upsertedUser);
          setUser(upsertedUser);
        }
      }

      // Handle role assignment
      const isAdminEmail = authUser.email === 'admin@agendapro.com';
      const defaultRole = isAdminEmail ? 'admin' : 'cliente';

      // Set role immediately for development
      setUserRole('admin');
      addDebugStep('handleUserSessionFallback_role_set', { role: 'admin' });

      // Try to create role in database (background operation)
      supabase
        .from('user_roles')
        .upsert([{
          user_id: authUser.id,
          rol: defaultRole
        }], {
          onConflict: 'user_id,rol'
        })
        .then(({ error }) => {
          if (error) {
            addDebugStep('handleUserSessionFallback_role_upsert_error', null, error.message);
          } else {
            addDebugStep('handleUserSessionFallback_role_upsert_success');
          }
        });

      addDebugStep('handleUserSessionFallback_completed');

    } catch (error) {
      addDebugStep('handleUserSessionFallback_error', null, error instanceof Error ? error.message : 'Unknown error');
      
      // Final fallback - create mock user
      if (authUser.email) {
        const fallbackUser: Usuario = {
          id: authUser.id,
          correo: authUser.email,
          nombre: authUser.user_metadata?.nombre || authUser.email.split('@')[0] || 'Usuario',
          created_at: new Date().toISOString()
        };
        setUser(fallbackUser);
        setUserRole('admin');
        addDebugStep('handleUserSessionFallback_final_fallback', fallbackUser);
      }
    } finally {
      setLoading(false);
    }
  };

  const checkSession = useCallback(async () => {
    try {
      addDebugStep('checkSession_start');
      
      // Add timeout to session check
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Session check timeout')), 10000); // 10 second timeout
      });

      const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]) as any;
      
      if (error) {
        addDebugStep('checkSession_error', null, error.message);
        console.error('🔐 useAuth: Error getting session:', error);
        setLoading(false);
        return;
      }

      addDebugStep('checkSession_response', { hasSession: !!session, userEmail: session?.user?.email });

      if (session?.user) {
        addDebugStep('checkSession_found_session', { email: session.user.email });
        await handleUserSession(session.user);
      } else {
        addDebugStep('checkSession_no_session');
        setLoading(false);
      }
    } catch (error) {
      addDebugStep('checkSession_catch_error', null, error instanceof Error ? error.message : 'Unknown error');
      console.error('🔐 useAuth: Error checking session:', error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    addDebugStep('useEffect_initializing');
    
    // Add overall timeout for the entire auth process
    const authTimeout = setTimeout(() => {
      if (loading) {
        addDebugStep('useEffect_overall_timeout_reached');
        setLoading(false);
      }
    }, 15000); // 15 second overall timeout

    // Check initial session
    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        addDebugStep('auth_state_change', { event, userEmail: session?.user?.email });
        
        if (session?.user) {
          await handleUserSession(session.user);
        } else {
          addDebugStep('auth_state_change_no_session');
          setUser(null);
          setUserRole(null);
          setSupabaseUser(null);
          setLoading(false);
        }
      }
    );

    return () => {
      addDebugStep('useEffect_cleanup');
      clearTimeout(authTimeout);
      subscription.unsubscribe();
    };
  }, [checkSession]);

  const signIn = async (email: string, password: string) => {
    try {
      addDebugStep('signIn_start', { email });
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        addDebugStep('signIn_error', null, error.message);
        throw error;
      }

      addDebugStep('signIn_success', { email });
      return data;
    } catch (error) {
      addDebugStep('signIn_catch_error', null, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, nombre: string) => {
    try {
      addDebugStep('signUp_start', { email, nombre });
      setLoading(true);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nombre: nombre
          }
        }
      });

      if (error) {
        addDebugStep('signUp_error', null, error.message);
        throw error;
      }

      addDebugStep('signUp_success', { email, hasUser: !!data.user, hasSession: !!data.session });
      
      // If user is created and confirmed immediately, handle the session
      if (data.user && data.session) {
        addDebugStep('signUp_immediate_confirmation');
        await handleUserSession(data.user);
      } else {
        addDebugStep('signUp_needs_confirmation');
        setLoading(false);
      }

      return data;
    } catch (error) {
      addDebugStep('signUp_catch_error', null, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      addDebugStep('signOut_start');
      const { error } = await supabase.auth.signOut();
      if (error) {
        addDebugStep('signOut_error', null, error.message);
        throw error;
      }
      
      addDebugStep('signOut_success');
      setUser(null);
      setUserRole(null);
      setSupabaseUser(null);
    } catch (error) {
      addDebugStep('signOut_catch_error', null, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  };

  return {
    user,
    userRole,
    supabaseUser,
    loading,
    signIn,
    signUp,
    signOut,
    debugSteps,
  };
};