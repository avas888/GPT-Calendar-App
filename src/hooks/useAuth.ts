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
      
      // Reduced timeout for database operations
      const dbTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Database operation timeout')), 3000);
      });

      // Try to fetch existing user profile with timeout
      addDebugStep('handleUserSession_fetching_user_profile');
      
      let userProfile: Usuario | null = null;
      
      try {
        const userFetchPromise = supabase
          .from('usuarios')
          .select('*')
          .eq('id', authUser.id)
          .single();

        const { data: existingUser, error: selectError } = await Promise.race([
          userFetchPromise,
          dbTimeout
        ]) as any;

        if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = no rows returned
          addDebugStep('handleUserSession_user_select_error', null, selectError.message);
        }

        if (existingUser) {
          addDebugStep('handleUserSession_existing_user_found', existingUser);
          userProfile = existingUser;
        }
      } catch (error) {
        addDebugStep('handleUserSession_user_fetch_failed', null, error instanceof Error ? error.message : 'Unknown error');
        
        // If database fetch fails, create a mock user immediately
        userProfile = {
          id: authUser.id,
          correo: authUser.email || '',
          nombre: authUser.user_metadata?.nombre || authUser.email?.split('@')[0] || 'Usuario',
          created_at: new Date().toISOString()
        };
        addDebugStep('handleUserSession_created_mock_user_after_fetch_fail', userProfile);
      }

      // If no user profile found, try to create one (with timeout)
      if (!userProfile) {
        addDebugStep('handleUserSession_creating_user_profile');
        
        try {
          const userCreatePromise = supabase
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

          const { data: upsertedUser, error: upsertError } = await Promise.race([
            userCreatePromise,
            dbTimeout
          ]) as any;

          if (upsertError) {
            addDebugStep('handleUserSession_user_upsert_error', null, upsertError.message);
          } else {
            addDebugStep('handleUserSession_user_upsert_success', upsertedUser);
            userProfile = upsertedUser;
          }
        } catch (error) {
          addDebugStep('handleUserSession_user_upsert_failed', null, error instanceof Error ? error.message : 'Unknown error');
          
          // Create mock user if upsert fails
          userProfile = {
            id: authUser.id,
            correo: authUser.email || '',
            nombre: authUser.user_metadata?.nombre || authUser.email?.split('@')[0] || 'Usuario',
            created_at: new Date().toISOString()
          };
          addDebugStep('handleUserSession_created_mock_user_after_upsert_fail', userProfile);
        }
      }

      // If still no user profile, create a mock one for development
      if (!userProfile) {
        addDebugStep('handleUserSession_creating_final_mock_user');
        userProfile = {
          id: authUser.id,
          correo: authUser.email || '',
          nombre: authUser.user_metadata?.nombre || authUser.email?.split('@')[0] || 'Usuario',
          created_at: new Date().toISOString()
        };
      }

      setUser(userProfile);
      addDebugStep('handleUserSession_user_set', userProfile);

      // Handle role assignment with timeout
      addDebugStep('handleUserSession_handling_role');
      
      let userRoleValue = 'admin'; // Default to admin for development
      
      try {
        const roleFetchPromise = supabase
          .from('user_roles')
          .select('rol')
          .eq('user_id', authUser.id)
          .single();

        const { data: roleData, error: roleError } = await Promise.race([
          roleFetchPromise,
          dbTimeout
        ]) as any;

        if (roleError && roleError.code !== 'PGRST116') {
          addDebugStep('handleUserSession_role_fetch_error', null, roleError.message);
        }

        if (roleData) {
          addDebugStep('handleUserSession_role_found', roleData);
          userRoleValue = roleData.rol;
        } else {
          // Try to create role with timeout
          addDebugStep('handleUserSession_creating_role');
          
          const isAdminEmail = authUser.email === 'admin@agendapro.com';
          const defaultRole = isAdminEmail ? 'admin' : 'cliente';
          
          try {
            const roleCreatePromise = supabase
              .from('user_roles')
              .upsert([{
                user_id: authUser.id,
                rol: defaultRole
              }], {
                onConflict: 'user_id,rol'
              });

            await Promise.race([roleCreatePromise, dbTimeout]);
            
            addDebugStep('handleUserSession_role_upsert_success');
            userRoleValue = defaultRole;
          } catch (error) {
            addDebugStep('handleUserSession_role_upsert_failed', null, error instanceof Error ? error.message : 'Unknown error');
            // Keep default admin role
          }
        }
      } catch (error) {
        addDebugStep('handleUserSession_role_handling_failed', null, error instanceof Error ? error.message : 'Unknown error');
        // Keep default admin role
      }

      setUserRole(userRoleValue);
      addDebugStep('handleUserSession_role_set', { role: userRoleValue });

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
      // CRITICAL: Always set loading to false when handleUserSession completes
      addDebugStep('handleUserSession_setting_loading_false');
      setLoading(false);
    }
  };

  const checkSession = useCallback(async () => {
    try {
      addDebugStep('checkSession_start');
      
      // Reduced timeout for session check
      const sessionTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Session check timeout')), 2000);
      });

      const sessionPromise = supabase.auth.getSession();
      
      const { data: { session }, error } = await Promise.race([
        sessionPromise,
        sessionTimeout
      ]) as any;
      
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
    
    // Reduced overall timeout for the entire auth process
    const authTimeout = setTimeout(() => {
      if (loading) {
        addDebugStep('useEffect_overall_timeout_reached');
        setLoading(false);
      }
    }, 5000); // 5 seconds total timeout

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
        
        // Enhanced error handling for common authentication issues
        if (error.message.includes('Invalid login credentials')) {
          addDebugStep('signIn_invalid_credentials');
          throw new Error('Credenciales inválidas. Verifica tu email y contraseña.');
        }
        
        throw error;
      }

      addDebugStep('signIn_success', { email, hasUser: !!data.user, hasSession: !!data.session });
      
      // handleUserSession will be called automatically by the auth state change listener
      return data;
    } catch (error) {
      addDebugStep('signIn_catch_error', null, error instanceof Error ? error.message : 'Unknown error');
      setLoading(false); // Set loading to false on error
      throw error;
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
          setLoading(false);
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
      
      // handleUserSession will be called automatically by the auth state change listener
      return {
        user: data.user,
        session: data.session
      };
    } catch (error) {
      addDebugStep('signUp_catch_error', null, error instanceof Error ? error.message : 'Unknown error');
      setLoading(false); // Set loading to false on error
      
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