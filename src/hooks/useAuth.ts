import { useState, useEffect } from 'react';
import { Usuario } from '../lib/supabaseClient';

// Mock user data for MVP development
const MOCK_ADMIN_USER: Usuario = {
  id: 'mock-admin-id',
  correo: 'admin@agendapro.com',
  nombre: 'Administrador',
  created_at: new Date().toISOString()
};

export const useAuth = () => {
  // Simple state management for MVP
  const [user] = useState<Usuario | null>(MOCK_ADMIN_USER);
  const [userRole] = useState<string | null>('admin');
  const [loading] = useState(false); // Always false for MVP
  const [supabaseUser] = useState(null);

  // Mock authentication functions
  const signIn = async (email: string, password: string) => {
    console.log('Mock signIn called with:', email);
    return { user: MOCK_ADMIN_USER, session: null };
  };

  const signUp = async (email: string, password: string, nombre: string) => {
    console.log('Mock signUp called with:', email, nombre);
    return { user: MOCK_ADMIN_USER, session: null };
  };

  const signOut = async () => {
    console.log('Mock signOut called');
    // For MVP, we'll just reload the page
    window.location.reload();
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