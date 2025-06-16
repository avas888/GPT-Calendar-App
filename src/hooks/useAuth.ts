import { useState, useEffect, useCallback } from 'react';
import { type User } from '@supabase/supabase-js';
import { supabase, Usuario } from '../lib/supabaseClient';

export const useAuth = () => {
  const [user, setUser] = useState<Usuario | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);

  const handleUserSession = async (authUser: User) => {
    try {
      console.log('🔐 useAuth: Handling user session for:', authUser.email);
      setSupabaseUser(authUser);
      
      // Create or get user profile - SIMPLIFIED APPROACH
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
        console.error('🔐 useAuth: Error creating/updating user profile:', userError);
        return;
      }

      console.log('🔐 useAuth: User profile ready:', userProfile);
      setUser(userProfile);

      // Handle role assignment - SIMPLIFIED APPROACH
      const isAdminEmail = authUser.email === 'admin@agendapro.com';
      const defaultRole = isAdminEmail ? 'admin' : 'cliente';

      // Try to get existing role first
      const { data: existingRoles } = await supabase
        .from('user_roles')
        .select('rol')
        .eq('user_id', authUser.id);

      if (!existingRoles || existingRoles.length === 0) {
        // Create role if none exists
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert([{
            user_id: authUser.id,
            rol: defaultRole
          }]);

        if (roleError) {
          console.error('🔐 useAuth: Error creating user role:', roleError);
        } else {
          console.log('🔐 useAuth: Created role:', defaultRole);
        }
      } else {
        // Use existing role (prefer admin if exists)
        const adminRole = existingRoles.find(r => r.rol === 'admin');
        const selectedRole = adminRole ? 'admin' : existingRoles[0].rol;
        console.log('🔐 useAuth: Using existing role:', selectedRole);
      }

      // In development mode treat all users as admin
      setUserRole('admin');

    } catch (error) {
      console.error('🔐 useAuth: Error handling user session:', error);
    } finally {
      // Ensure loading is set to false after session handling
      setLoading(false);
    }
  };

  const checkSession = useCallback(async () => {
    try {
      console.log('🔐 useAuth: Checking existing session...');
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('🔐 useAuth: Error getting session:', error);
        setLoading(false);
        return;
      }

      if (session?.user) {
        console.log('🔐 useAuth: Found existing session for:', session.user.email);
        await handleUserSession(session.user);
        // Loading is set to false in handleUserSession
      } else {
        console.log('🔐 useAuth: No existing session found');
        setLoading(false);
      }
    } catch (error) {
      console.error('🔐 useAuth: Error checking session:', error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    console.log('🔐 useAuth: Initializing authentication...');
    
    // Check initial session
    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 useAuth: Auth state changed:', event, session?.user?.email || 'no user');
        
        if (session?.user) {
          await handleUserSession(session.user);
          // Loading is set to false in handleUserSession
        } else {
          console.log('🔐 useAuth: No session, clearing user state');
          setUser(null);
          setUserRole(null);
          setSupabaseUser(null);
          setLoading(false);
        }
      }
    );

    return () => {
      console.log('🔐 useAuth: Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, [checkSession]);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 useAuth: Attempting sign in for:', email);
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('🔐 useAuth: Sign in error:', error);
        throw error;
      }

      console.log('🔐 useAuth: Sign in successful for:', email);
      return data;
    } catch (error) {
      console.error('🔐 useAuth: Sign in failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, nombre: string) => {
    try {
      console.log('🔐 useAuth: Attempting sign up for:', email);
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
        console.error('🔐 useAuth: Sign up error:', error);
        throw error;
      }

      console.log('🔐 useAuth: Sign up successful for:', email);
      
      // If user is created and confirmed immediately, handle the session
      if (data.user && data.session) {
        console.log('🔐 useAuth: User confirmed immediately, handling session');
        await handleUserSession(data.user);
        // Loading is set to false in handleUserSession
      } else {
        setLoading(false);
      }

      return data;
    } catch (error) {
      console.error('🔐 useAuth: Sign up failed:', error);
      throw error;
    } finally {
      if (loading) {
        setLoading(false);
      }
    }
  };

  const signOut = async () => {
    try {
      console.log('🔐 useAuth: Signing out...');
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('🔐 useAuth: Sign out error:', error);
        throw error;
      }
      
      console.log('🔐 useAuth: Sign out successful');
      setUser(null);
      setUserRole(null);
      setSupabaseUser(null);
    } catch (error) {
      console.error('🔐 useAuth: Sign out failed:', error);
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
  };
};