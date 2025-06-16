import { useState, useEffect } from 'react';
import { supabase, Usuario } from '../lib/supabaseClient';

export const useAuth = () => {
  const [user, setUser] = useState<Usuario | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [supabaseUser, setSupabaseUser] = useState<any>(null);

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
        } else {
          console.log('🔐 useAuth: No session, clearing user state');
          setUser(null);
          setUserRole(null);
          setSupabaseUser(null);
        }
        setLoading(false);
      }
    );

    return () => {
      console.log('🔐 useAuth: Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, []);

  const checkSession = async () => {
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
      } else {
        console.log('🔐 useAuth: No existing session found');
        setLoading(false);
      }
    } catch (error) {
      console.error('🔐 useAuth: Error checking session:', error);
      setLoading(false);
    }
  };

  const handleUserSession = async (authUser: any) => {
    try {
      console.log('🔐 useAuth: Handling user session for:', authUser.email);
      setSupabaseUser(authUser);
      
      // Get or create user profile
      console.log('🔐 useAuth: Fetching user profile...');
      let { data: userProfile, error: userError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (userError && userError.code === 'PGRST116') {
        // User doesn't exist, create profile
        console.log('🔐 useAuth: Creating user profile for:', authUser.email);
        
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
          console.error('🔐 useAuth: Error creating user profile:', createError);
          return;
        }
        
        console.log('🔐 useAuth: Created user profile:', newUser);
        userProfile = newUser;
      } else if (userError) {
        console.error('🔐 useAuth: Error fetching user profile:', userError);
        return;
      } else {
        console.log('🔐 useAuth: Found existing user profile:', userProfile);
      }

      setUser(userProfile);

      // Get or create user role
      console.log('🔐 useAuth: Fetching user roles...');
      let { data: roles, error: roleError } = await supabase
        .from('user_roles')
        .select('rol')
        .eq('user_id', authUser.id);

      if (roleError) {
        console.error('🔐 useAuth: Error fetching user roles:', roleError);
        return;
      }

      console.log('🔐 useAuth: Found roles:', roles);

      // If no roles exist, assign admin role for admin email or cliente for others
      if (!roles || roles.length === 0) {
        const defaultRole = authUser.email === 'admin@agendapro.com' ? 'admin' : 'cliente';
        
        console.log('🔐 useAuth: Creating role for user:', authUser.email, 'Role:', defaultRole);
        
        const { error: roleCreateError } = await supabase
          .from('user_roles')
          .insert([{
            user_id: authUser.id,
            rol: defaultRole
          }]);

        if (roleCreateError) {
          console.error('🔐 useAuth: Error creating user role:', roleCreateError);
        } else {
          console.log('🔐 useAuth: Successfully created role:', defaultRole);
          setUserRole(defaultRole);
        }
      } else {
        // Set the first role (or admin if exists)
        const adminRole = roles.find(r => r.rol === 'admin');
        const selectedRole = adminRole ? 'admin' : roles[0].rol;
        console.log('🔐 useAuth: Setting user role:', selectedRole);
        setUserRole(selectedRole);
      }

    } catch (error) {
      console.error('🔐 useAuth: Error handling user session:', error);
    }
  };

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
      }

      return data;
    } catch (error) {
      console.error('🔐 useAuth: Sign up failed:', error);
      throw error;
    } finally {
      setLoading(false);
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