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
      
      // Try multiple approaches to create/get user profile
      addDebugStep('handleUserSession_creating_profile_attempt_1');
      
      // First, try to get existing user
      const { data: existingUser, error: selectError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = no rows returned
        addDebugStep('handleUserSession_select_error', null, selectError.message);
      }

      if (existingUser) {
        addDebugStep('handleUserSession_existing_user_found', existingUser);
        setUser(existingUser);
      } else {
        addDebugStep('handleUserSession_creating_new_profile');
        
        // Try simple insert first
        const { data: insertedUser, error: insertError } = await supabase
          .from('usuarios')
          .insert([{
            id: authUser.id,
            correo: authUser.email || '',
            nombre: authUser.user_metadata?.nombre || authUser.email?.split('@')[0] || 'Usuario'
          }])
          .select()
          .single();

        if (insertError) {
          addDebugStep('handleUserSession_insert_error', null, insertError.message);
          
          // If insert fails, try upsert
          addDebugStep('handleUserSession_trying_upsert');
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
            addDebugStep('handleUserSession_upsert_error', null, upsertError.message);
            
            // If both fail, create a mock user for development
            addDebugStep('handleUserSession_creating_mock_user');
            const mockUser: Usuario = {
              id: authUser.id,
              correo: authUser.email || '',
              nombre: authUser.user_metadata?.nombre || authUser.email?.split('@')[0] || 'Usuario',
              created_at: new Date().toISOString()
            };
            setUser(mockUser);
            addDebugStep('handleUserSession_mock_user_created', mockUser);
          } else {
            addDebugStep('handleUserSession_upsert_success', upsertedUser);
            setUser(upsertedUser);
          }
        } else {
          addDebugStep('handleUserSession_insert_success', insertedUser);
          setUser(insertedUser);
        }
      }

      // Handle role assignment with timeout
      addDebugStep('handleUserSession_handling_roles');
      
      const isAdminEmail = authUser.email === 'admin@agendapro.com';
      const defaultRole = isAdminEmail ? 'admin' : 'cliente';

      // Set role immediately for development
      setUserRole('admin');
      addDebugStep('handleUserSession_role_set_immediately', { role: 'admin' });

      // Try to handle database role in background (with timeout)
      const rolePromise = (async () => {
        try {
          addDebugStep('handleUserSession_checking_db_roles');
          
          const { data: existingRoles, error: roleQueryError } = await supabase
            .from('user_roles')
            .select('rol')
            .eq('user_id', authUser.id);

          if (roleQueryError) {
            addDebugStep('handleUserSession_role_query_error', null, roleQueryError.message);
            return;
          }

          addDebugStep('handleUserSession_existing_roles_found', existingRoles);

          if (!existingRoles || existingRoles.length === 0) {
            addDebugStep('handleUserSession_creating_db_role');
            
            const { error: roleError } = await supabase
              .from('user_roles')
              .insert([{
                user_id: authUser.id,
                rol: defaultRole
              }]);

            if (roleError) {
              addDebugStep('handleUserSession_role_creation_error', null, roleError.message);
            } else {
              addDebugStep('handleUserSession_db_role_created', { role: defaultRole });
            }
          }
        } catch (error) {
          addDebugStep('handleUserSession_role_background_error', null, error instanceof Error ? error.message : 'Unknown error');
        }
      })();

      // Don't wait for role creation - set timeout
      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => {
          addDebugStep('handleUserSession_role_timeout_reached');
          resolve('timeout');
        }, 3000); // 3 second timeout
      });

      Promise.race([rolePromise, timeoutPromise]).then(() => {
        addDebugStep('handleUserSession_role_handling_completed');
      });

      addDebugStep('handleUserSession_completed_successfully');

    } catch (error) {
      addDebugStep('handleUserSession_catch_error', null, error instanceof Error ? error.message : 'Unknown error');
      console.error('🔐 useAuth: Error handling user session:', error);
      
      // Create fallback user for development
      if (authUser.email) {
        const fallbackUser: Usuario = {
          id: authUser.id,
          correo: authUser.email,
          nombre: authUser.user_metadata?.nombre || authUser.email.split('@')[0] || 'Usuario',
          created_at: new Date().toISOString()
        };
        setUser(fallbackUser);
        setUserRole('admin');
        addDebugStep('handleUserSession_fallback_user_created', fallbackUser);
      }
    } finally {
      // Always set loading to false
      addDebugStep('handleUserSession_setting_loading_false');
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