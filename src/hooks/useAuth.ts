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

// Custom signup result interface
interface SignUpResult {
  user: User | null;
  session: any;
  userAlreadyExists?: boolean;
  error?: any;
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
      
      const { data: rpcResult, error: rpcError } = await supabase.rpc('handle_auth_user_creation', {
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

      // Check if RPC result indicates success
      if (rpcResult && typeof rpcResult === 'object' && rpcResult.success === false) {
        addDebugStep('handleUserSession_rpc_returned_failure', rpcResult);
        console.error('🔐 RPC returned failure:', rpcResult);
        
        // Fallback to direct database operations
        addDebugStep('handleUserSession_rpc_failure_fallback_starting');
        await handleUserSessionFallback(authUser);
        return;
      }

      addDebugStep('handleUserSession_rpc_success', rpcResult);

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
    } finally {
      // CRITICAL: Always set loading to false when handleUserSession completes
      addDebugStep('handleUserSession_setting_loading_false');
      setLoading(false);
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
      // CRITICAL: Always set loading to false in fallback
      addDebugStep('handleUserSessionFallback_setting_loading_false');
      setLoading(false);
    }
  };

  const checkSession = useCallback(async () => {
    try {
      addDebugStep('checkSession_start');
      
      // Session check (no manual timeout)
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        addDebugStep('checkSession_error', null, error.message);
        console.error('🔐 useAuth: Error getting session:', error);
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
    } finally {
      // CRITICAL: Always set loading to false when checkSession completes
      addDebugStep('checkSession_setting_loading_false_finally');
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
    }, 10000); // Reduced to 10 seconds for faster feedback

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
      
      const { data: userData } = await supabase.auth.admin.getUserByEmail(email);

      if (error) {
        addDebugStep('signIn_error', null, error.message);
        
        // Enhanced error handling for common authentication issues
        if (error.message.includes('Invalid login credentials')) {
          // Check if user exists but is unconfirmed
          const { data: userData } = await supabase.auth.admin.getUserById(email);
          if (userData) {
            addDebugStep('signIn_user_exists_but_invalid_creds');
            throw new Error('Credenciales inválidas. Verifica tu contraseña o que tu cuenta esté confirmada en Supabase.');
          }
        }
        
        throw error;
      }

      addDebugStep('signIn_success', { email });
      return data;
    } catch (error) {
      addDebugStep('signIn_catch_error', null, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    } finally {
      // CRITICAL: Set loading to false in signIn finally block
      // Note: handleUserSession will also set loading to false, but this ensures it's set even if handleUserSession fails
      addDebugStep('signIn_setting_loading_false_finally');
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, nombre: string): Promise<SignUpResult> => {
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
        
        // Handle "user already exists" error gracefully
        if (error.message.includes('User already registered') || 
            error.message.includes('user_already_exists') ||
            error.status === 422) {
          addDebugStep('signUp_user_already_exists');
          return {
            user: null,
            session: null,
            userAlreadyExists: true,
            error: error
          };
        }
        
        // For other errors, still throw
        throw error;
      }

      addDebugStep('signUp_success', { email, hasUser: !!data.user, hasSession: !!data.session });
      
      // If user is created and confirmed immediately, handle the session
      if (data.user && data.session) {
        addDebugStep('signUp_immediate_confirmation');
        await handleUserSession(data.user);
      }

      return {
        user: data.user,
        session: data.session
      };
    } catch (error) {
      addDebugStep('signUp_catch_error', null, error instanceof Error ? error.message : 'Unknown error');
      
      // Additional check for user already exists in catch block
      if (error instanceof Error && 
          (error.message.includes('User already registered') || 
           error.message.includes('user_already_exists'))) {
        return {
          user: null,
          session: null,
          userAlreadyExists: true,
          error: error
        };
      }
      
      throw error;
    } finally {
      // CRITICAL: Set loading to false in signUp finally block
      addDebugStep('signUp_setting_loading_false_finally');
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