import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate Supabase configuration
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase configuration. Please check your .env file and ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.');
}

// Create Supabase client - production only
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

console.log('🚀 Supabase client initialized for production database');

// Types for database tables
export interface Usuario {
  id: string;
  correo: string;
  nombre: string;
  created_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  rol: 'admin' | 'colaborador' | 'cliente';
}

export interface Cita {
  id: string;
  cliente_id: string;
  personal_id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: 'confirmada' | 'cancelada' | 'realizada' | 'no_asistio';
  servicios: string[];
  created_at: string;
}

export interface Servicio {
  id: string;
  nombre: string;
  duracion_min: number;
  precio: number;
  activo: boolean;
}

export interface Personal {
  id: string;
  nombre: string;
  especialidades: string[];
  activo: boolean;
  user_id?: string;
}

export interface Disponibilidad {
  id: string;
  personal_id: string;
  dia_semana: number; // 0-6 (domingo-sábado)
  hora_inicio: string;
  hora_fin: string;
}

export interface Ausencia {
  id: string;
  personal_id: string;
  fecha: string;
  motivo: string;
}

export interface Configuracion {
  id: string;
  key: string;
  valor: string;
}