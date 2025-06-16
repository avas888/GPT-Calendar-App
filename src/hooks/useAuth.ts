import { useState, useEffect } from 'react';
import { supabase, Usuario } from '../lib/supabaseClient';

export const useAuth = () => {
  const [user, setUser] = useState<Usuario | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [supabaseUser, setSupabaseUser] = useState<any>(null);

  useEffect(() => {
    // Check initial session
    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session);
        
        if (session?.user) {
          await handleUserSession(session.user);
        } else {
          setUser(null);
          setUserRole(null);
          setSupabaseUser(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
        setLoading(false);
        return;
      }

      if (session?.user) {
        await handleUserSession(session.user);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error checking session:', error);
      setLoading(false);
    }
  };

  const handleUserSession = async (authUser: any) => {
    try {
      setSupabaseUser(authUser);
      
      // Get or create user profile
      let { data: userProfile, error: userError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (userError && userError.code === 'PGRST116') {
        // User doesn't exist, create profile
        console.log('Creating user profile for:', authUser.email);
        
        const { data: newUser, error: createError } = await supabase
          .from('usuarios')
          .insert([{
            id: authUser.id,
            correo: authUser.email,
            nombre: authUser.user_metadata?.nombre || authUser.email.split('@')[0]
          }])
          .select()
          .single();

        if (createError) {
          console.error('Error creating user profile:', createError);
          return;
        }
        
        userProfile = newUser;
      } else if (userError) {
        console.error('Error fetching user profile:', userError);
        return;
      }

      setUser(userProfile);

      // Get or create user role
      let { data: roles, error: roleError } = await supabase
        .from('user_roles')
        .select('rol')
        .eq('user_id', authUser.id);

      if (roleError) {
        console.error('Error fetching user roles:', roleError);
        return;
      }

      // If no roles exist, assign admin role for admin email or cliente for others
      if (!roles || roles.length === 0) {
        const defaultRole = authUser.email === 'admin@agendapro.com' ? 'admin' : 'cliente';
        
        console.log('Creating role for user:', authUser.email, 'Role:', defaultRole);
        
        const { error: roleCreateError } = await supabase
          .from('user_roles')
          .insert([{
            user_id: authUser.id,
            rol: defaultRole
          }]);

        if (roleCreateError) {
          console.error('Error creating user role:', roleCreateError);
        } else {
          setUserRole(defaultRole);
        }
      } else {
        // Set the first role (or admin if exists)
        const adminRole = roles.find(r => r.rol === 'admin');
        setUserRole(adminRole ? 'admin' : roles[0].rol);
      }

    } catch (error) {
      console.error('Error handling user session:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('Sign in error:', error);
        throw error;
      }

      console.log('Sign in successful:', data);
      return data;
    } catch (error) {
      console.error('Sign in failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, nombre: string) => {
    try {
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
        console.error('Sign up error:', error);
        throw error;
      }

      console.log('Sign up successful:', data);
      
      // If user is created and confirmed immediately, handle the session
      if (data.user && data.session) {
        await handleUserSession(data.user);
      }

      return data;
    } catch (error) {
      console.error('Sign up failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
        throw error;
      }
      
      setUser(null);
      setUserRole(null);
      setSupabaseUser(null);
    } catch (error) {
      console.error('Sign out failed:', error);
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