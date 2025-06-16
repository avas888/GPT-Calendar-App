import { useState, useEffect, useRef } from 'react';
import { supabase, Usuario, UserRole } from '../lib/supabaseClient';
import { User } from '@supabase/supabase-js';

export const useAuth = () => {
  // All useState hooks first
  const [user, setUser] = useState<Usuario | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  
  // All useRef hooks next
  const initializingRef = useRef(false);
  const fetchingUserRef = useRef(false);

  // All useEffect hooks last
  useEffect(() => {
    console.log('🔄 useAuth: useEffect started');
    let mounted = true;

    const initializeAuth = async () => {
      // Prevent multiple simultaneous initializations
      if (initializingRef.current) {
        console.log('🚫 useAuth: Already initializing, skipping');
        return;
      }

      initializingRef.current = true;
      console.log('🚀 useAuth: Initializing auth...');
      
      try {
        console.log('📡 useAuth: Getting session...');
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        console.log('📡 useAuth: Session result:', { 
          hasSession: !!session, 
          hasUser: !!session?.user, 
          userEmail: session?.user?.email,
          error: error?.message 
        });

        if (error) {
          console.error('❌ useAuth: Error getting session:', error);
          if (mounted) {
            setLoading(false);
          }
          return;
        }

        if (session?.user && mounted) {
          console.log('👤 useAuth: Session user found, setting supabase user');
          setSupabaseUser(session.user);
          await fetchUserData(session.user.id);
        } else if (mounted) {
          console.log('❌ useAuth: No session user, setting loading to false');
          setLoading(false);
        }
      } catch (error) {
        console.error('💥 useAuth: Error initializing auth:', error);
        if (mounted) {
          setLoading(false);
        }
      } finally {
        initializingRef.current = false;
      }
    };

    initializeAuth();

    // Listen for auth changes
    console.log('👂 useAuth: Setting up auth state listener');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) {
          console.log('🚫 useAuth: Component unmounted, ignoring auth change');
          return;
        }

        console.log('🔄 useAuth: Auth state changed:', { 
          event, 
          hasSession: !!session,
          hasUser: !!session?.user,
          userEmail: session?.user?.email 
        });

        if (session?.user) {
          console.log('👤 useAuth: Auth change - user found, setting supabase user');
          setSupabaseUser(session.user);
          await fetchUserData(session.user.id);
        } else {
          console.log('❌ useAuth: Auth change - no user, clearing state');
          setUser(null);
          setUserRole(null);
          setSupabaseUser(null);
          setLoading(false);
        }
      }
    );

    return () => {
      console.log('🧹 useAuth: Cleanup - unmounting');
      mounted = false;
      initializingRef.current = false;
      fetchingUserRef.current = false;
      subscription.unsubscribe();
    };
  }, []); // Empty dependency array to run only once

  const fetchUserData = async (userId: string) => {
    // Prevent multiple simultaneous fetches for the same user
    if (fetchingUserRef.current) {
      console.log('🚫 fetchUserData: Already fetching, skipping');
      return;
    }

    fetchingUserRef.current = true;
    console.log('🔍 fetchUserData: Starting for userId:', userId);
    
    try {
      console.log('📊 fetchUserData: Fetching user from usuarios table...');

      // First check if user exists in usuarios table
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      console.log('📊 fetchUserData: User query result:', { 
        userData: userData ? 'found' : 'not found', 
        error: userError?.message,
        errorCode: userError?.code 
      });

      if (userError && userError.code !== 'PGRST116') {
        console.error('❌ fetchUserData: Error fetching user:', userError);
        setLoading(false);
        return;
      }

      // If user doesn't exist in usuarios table, they might be a new user
      if (!userData) {
        console.log('❌ fetchUserData: User not found in usuarios table');
        setUser(null);
        setUserRole(null);
        setLoading(false);
        return;
      }

      console.log('🎭 fetchUserData: Fetching user role...');
      
      // Fetch user role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('rol')
        .eq('user_id', userId)
        .maybeSingle();

      console.log('🎭 fetchUserData: Role query result:', { 
        roleData: roleData ? roleData.rol : 'not found', 
        error: roleError?.message,
        errorCode: roleError?.code 
      });

      if (roleError && roleError.code !== 'PGRST116') {
        console.error('❌ fetchUserData: Error fetching role:', roleError);
        // Continue with user data but no role
        setUser(userData);
        setUserRole(null);
        setLoading(false);
        return;
      }

      console.log('✅ fetchUserData: User data loaded successfully:', { 
        userName: userData.nombre, 
        userRole: roleData?.rol || 'no role' 
      });
      setUser(userData);
      setUserRole(roleData?.rol || null);
    } catch (error) {
      console.error('💥 fetchUserData: Unexpected error:', error);
      setUser(null);
      setUserRole(null);
    } finally {
      setLoading(false);
      fetchingUserRef.current = false;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 signIn: Starting sign in for:', email);
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('🔐 signIn: Sign in result:', { 
        hasData: !!data, 
        hasUser: !!data?.user,
        hasSession: !!data?.session,
        error: error?.message 
      });

      if (error) {
        setLoading(false);
        // Provide more helpful error messages
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Credenciales incorrectas. Verifica tu email y contraseña.');
        } else if (error.message.includes('Email not confirmed')) {
          throw new Error('Por favor verifica tu email antes de iniciar sesión.');
        } else {
          throw error;
        }
      }

      console.log('✅ signIn: Sign in successful');
      // Don't set loading to false here - let the auth state change handle it
      return data;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, nombre: string) => {
    try {
      console.log('📝 signUp: Starting sign up for:', email);
      setLoading(true);

      // First, sign up the user with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nombre: nombre
          }
        }
      });

      console.log('📝 signUp: Auth sign up result:', { 
        hasData: !!data, 
        hasUser: !!data?.user,
        hasSession: !!data?.session,
        error: error?.message 
      });

      if (error) {
        setLoading(false);
        if (error.message.includes('User already registered')) {
          throw new Error('Ya existe una cuenta con este email. Intenta iniciar sesión.');
        }
        throw error;
      }

      if (data.user) {
        try {
          console.log('👤 signUp: Creating user profile for:', data.user.id);
          // Create user profile using the database function
          const { error: profileError } = await supabase.rpc('create_user_profile', {
            user_id: data.user.id,
            user_email: email,
            user_name: nombre
          });

          console.log('👤 signUp: Profile creation result:', { 
            error: profileError?.message 
          });

          if (profileError) {
            console.error('❌ signUp: Error creating user profile:', profileError);
            // Don't throw here as the auth user was created successfully
          }
        } catch (profileError) {
          console.error('💥 signUp: Exception creating user profile:', profileError);
          // Don't throw here as the auth user was created successfully
        }
      }

      console.log('✅ signUp: Sign up completed');
      // Don't set loading to false here - let the auth state change handle it
      return data;
    } catch (error) {
      setLoading(false);
      console.error('Sign up error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      console.log('🚪 signOut: Starting sign out');
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      console.log('🚪 signOut: Sign out successful, resetting state');
      // Reset state immediately
      setUser(null);
      setUserRole(null);
      setSupabaseUser(null);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  // Log current state whenever it changes (but don't cause re-renders)
  console.log('📊 useAuth: Current state:', { 
    hasUser: !!user, 
    userRole, 
    loading, 
    hasSupabaseUser: !!supabaseUser 
  });

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