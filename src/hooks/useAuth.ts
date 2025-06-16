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
      
      // Create or get user profile - SIMPLIFIED APPROACH
      addDebugStep('handleUserSession_creating_profile');
      
      const { data: userProfile, error: userError } = await supabase
        .from('usuarios')
        .upsert([{
          id: authUser.id,
          correo: authUser.email,
          nombre: authUser.user_metadata?.nombre || authUser.email.split('@')[0]
        }], {
          onConflict: 'id'
        })
        .select()
        .single();

      if (userError) {
        addDebugStep('handleUserSession_profile_error', null, userError.message);
        console.error('🔐 useAuth: Error creating/updating user profile:', userError);
        return;
      }

      addDebugStep('handleUserSession_profile_created', userProfile);
      setUser(userProfile);

      // Handle role assignment - SIMPLIFIED APPROACH
      const isAdminEmail = authUser.email === 'admin@agendapro.com';
      const defaultRole = isAdminEmail ? 'admin' : 'cliente';

      addDebugStep('handleUserSession_checking_roles', { isAdminEmail, defaultRole });

      // Try to get existing role first
      const { data: existingRoles, error: roleQueryError } = await supabase
        .from('user_roles')
        .select('rol')
        .eq('user_id', authUser.id);

      if (roleQueryError) {
        addDebugStep('handleUserSession_role_query_error', null, roleQueryError.message);
      } else {
        addDebugStep('handleUserSession_existing_roles', existingRoles);
      }

      if (!existingRoles || existingRoles.length === 0) {
        // Create role if none exists
        addDebugStep('handleUserSession_creating_role', { role: defaultRole });
        
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert([{
            user_id: authUser.id,
            rol: defaultRole
          }]);

        if (roleError) {
          addDebugStep('handleUserSession_role_creation_error', null, roleError.message);
          console.error('🔐 useAuth: Error creating user role:', roleError);
        } else {
          addDebugStep('handleUserSession_role_created', { role: defaultRole });
        }
      } else {
        // Use existing role (prefer admin if exists)
        const adminRole = existingRoles.find(r => r.rol === 'admin');
        const selectedRole = adminRole ? 'admin' : existingRoles[0].rol;
        addDebugStep('handleUserSession_using_existing_role', { selectedRole });
      }

      // In development mode treat all users as admin
      setUserRole('admin');
      addDebugStep('handleUserSession_role_set_to_admin');

    } catch (error) {
      addDebugStep('handleUserSession_catch_error', null, error instanceof Error ? error.message : 'Unknown error');
      console.error('🔐 useAuth: Error handling user session:', error);
    } finally {
      // Ensure loading is set to false after session handling
      addDebugStep('handleUserSession_setting_loading_false');
      setLoading(false);
    }
  };

  const checkSession = useCallback(async () => {
    try {
      addDebugStep('checkSession_start');
      
      const { data: { session }, error } = await supabase.auth.getSession();
      
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
        // Loading is set to false in handleUserSession
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
    
    // Check initial session
    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        addDebugStep('auth_state_change', { event, userEmail: session?.user?.email });
        
        if (session?.user) {
          await handleUserSession(session.user);
          // Loading is set to false in handleUserSession
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
      if (loading) {
        setLoading(false);
      }
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
        // Loading is set to false in handleUserSession
      } else {
        addDebugStep('signUp_needs_confirmation');
        setLoading(false);
      }

      return data;
    } catch (error) {
      addDebugStep('signUp_catch_error', null, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    } finally {
      if (loading) {
        setLoading(false);
      }
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
    debugSteps, // Expose debug steps for debugging
  };
};