import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Usuario } from '../lib/supabaseClient';

export const useAuth = () => {
  const [user, setUser] = useState<Usuario | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [supabaseUser, setSupabaseUser] = useState<any>(null);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setLoading(false);
          return;
        }

        if (session?.user) {
          setSupabaseUser(session.user);
          await loadUserProfile(session.user);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error);
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session);
        
        if (session?.user) {
          setSupabaseUser(session.user);
          await loadUserProfile(session.user);
        } else {
          setUser(null);
          setUserRole(null);
          setSupabaseUser(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (authUser: any) => {
    try {
      console.log('Loading profile for user:', authUser.id);
      
      // Get user profile
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', authUser.id)
        .single();

      // Get user role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('rol')
        .eq('user_id', authUser.id)
        .single();

      // If user profile or role doesn't exist, create them
      if (!userData || !roleData) {
        console.log('User profile or role missing, creating...');
        
        try {
          await supabase.rpc('create_user_profile', {
            user_id: authUser.id,
            user_email: authUser.email,
            user_name: authUser.user_metadata?.nombre || authUser.email?.split('@')[0] || 'Usuario',
          });

          // Retry fetching after creation
          const { data: newUserData } = await supabase
            .from('usuarios')
            .select('*')
            .eq('id', authUser.id)
            .single();

          const { data: newRoleData } = await supabase
            .from('user_roles')
            .select('rol')
            .eq('user_id', authUser.id)
            .single();

          setUser(newUserData);
          setUserRole(newRoleData?.rol || 'cliente');
        } catch (createError) {
          console.error('Error creating user profile:', createError);
          // Fallback: create minimal user object
          setUser({
            id: authUser.id,
            correo: authUser.email,
            nombre: authUser.user_metadata?.nombre || authUser.email?.split('@')[0] || 'Usuario',
            created_at: new Date().toISOString()
          });
          setUserRole(authUser.email === 'admin@agendapro.com' ? 'admin' : 'cliente');
        }
      } else {
        setUser(userData);
        setUserRole(roleData?.rol || 'cliente');
      }

      setLoading(false);
    } catch (error) {
      console.error('Error in loadUserProfile:', error);
      
      // Fallback: create minimal user object from auth data
      setUser({
        id: authUser.id,
        correo: authUser.email,
        nombre: authUser.user_metadata?.nombre || authUser.email?.split('@')[0] || 'Usuario',
        created_at: new Date().toISOString()
      });
      setUserRole(authUser.email === 'admin@agendapro.com' ? 'admin' : 'cliente');
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      return data;
    } catch (error: any) {
      console.error('Sign in error:', error);
      setLoading(false);
      throw error;
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
            nombre: nombre,
          },
        },
      });

      if (error) throw error;

      // If user is created, create profile
      if (data.user) {
        try {
          await supabase.rpc('create_user_profile', {
            user_id: data.user.id,
            user_email: email,
            user_name: nombre,
          });
        } catch (profileError) {
          console.error('Error creating user profile:', profileError);
          // Don't throw here, as the user was created successfully
        }
      }

      return data;
    } catch (error: any) {
      console.error('Sign up error:', error);
      setLoading(false);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      setUserRole(null);
      setSupabaseUser(null);
    } catch (error: any) {
      console.error('Sign out error:', error);
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