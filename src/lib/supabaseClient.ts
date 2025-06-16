import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if we have valid Supabase configuration
const hasValidConfig = supabaseUrl && supabaseAnonKey && 
  supabaseUrl !== 'https://mock-project.supabase.co' && 
  supabaseAnonKey !== 'mock-anon-key';

// Create mock Supabase client for MVP development
const createMockSupabaseClient = () => {
  const mockResponse = {
    data: [],
    error: null,
    count: null,
    status: 200,
    statusText: 'OK'
  };

  const mockQueryBuilder = {
    select: () => mockQueryBuilder,
    insert: () => mockQueryBuilder,
    update: () => mockQueryBuilder,
    delete: () => mockQueryBuilder,
    upsert: () => mockQueryBuilder,
    eq: () => mockQueryBuilder,
    neq: () => mockQueryBuilder,
    gt: () => mockQueryBuilder,
    gte: () => mockQueryBuilder,
    lt: () => mockQueryBuilder,
    lte: () => mockQueryBuilder,
    like: () => mockQueryBuilder,
    ilike: () => mockQueryBuilder,
    is: () => mockQueryBuilder,
    in: () => mockQueryBuilder,
    contains: () => mockQueryBuilder,
    containedBy: () => mockQueryBuilder,
    rangeGt: () => mockQueryBuilder,
    rangeGte: () => mockQueryBuilder,
    rangeLt: () => mockQueryBuilder,
    rangeLte: () => mockQueryBuilder,
    rangeAdjacent: () => mockQueryBuilder,
    overlaps: () => mockQueryBuilder,
    textSearch: () => mockQueryBuilder,
    match: () => mockQueryBuilder,
    not: () => mockQueryBuilder,
    or: () => mockQueryBuilder,
    filter: () => mockQueryBuilder,
    order: () => mockQueryBuilder,
    limit: () => mockQueryBuilder,
    range: () => mockQueryBuilder,
    abortSignal: () => mockQueryBuilder,
    single: () => Promise.resolve({ ...mockResponse, data: null }),
    maybeSingle: () => Promise.resolve({ ...mockResponse, data: null }),
    csv: () => Promise.resolve({ ...mockResponse, data: '' }),
    geojson: () => Promise.resolve({ ...mockResponse, data: null }),
    explain: () => Promise.resolve({ ...mockResponse, data: null }),
    rollback: () => Promise.resolve({ ...mockResponse }),
    returns: () => mockQueryBuilder,
    then: (resolve: any) => resolve(mockResponse),
    catch: (reject: any) => Promise.resolve(mockResponse)
  };

  const mockAuth = {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    onAuthStateChange: (callback: any) => {
      // Call callback immediately with no session
      setTimeout(() => callback('SIGNED_OUT', null), 0);
      return {
        data: { subscription: { unsubscribe: () => {} } }
      };
    },
    signUp: () => Promise.resolve({ data: { user: null, session: null }, error: null }),
    signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: null }),
    signInWithOtp: () => Promise.resolve({ data: null, error: null }),
    signInWithOAuth: () => Promise.resolve({ data: { provider: '', url: '' }, error: null }),
    signOut: () => Promise.resolve({ error: null }),
    resetPasswordForEmail: () => Promise.resolve({ data: null, error: null }),
    updateUser: () => Promise.resolve({ data: { user: null }, error: null }),
    setSession: () => Promise.resolve({ data: { session: null }, error: null }),
    refreshSession: () => Promise.resolve({ data: { session: null }, error: null })
  };

  return {
    from: () => mockQueryBuilder,
    auth: mockAuth,
    rpc: () => Promise.resolve(mockResponse),
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ data: null, error: null }),
        download: () => Promise.resolve({ data: null, error: null }),
        list: () => Promise.resolve({ data: [], error: null }),
        remove: () => Promise.resolve({ data: [], error: null }),
        createSignedUrl: () => Promise.resolve({ data: null, error: null }),
        createSignedUrls: () => Promise.resolve({ data: [], error: null }),
        getPublicUrl: () => ({ data: { publicUrl: '' } })
      })
    },
    realtime: {
      channel: () => ({
        on: () => ({}),
        subscribe: () => Promise.resolve('ok'),
        unsubscribe: () => Promise.resolve('ok')
      })
    }
  };
};

// Export either real or mock Supabase client
export const supabase = hasValidConfig 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })
  : createMockSupabaseClient() as any;

// Log the mode for debugging
if (!hasValidConfig) {
  console.log('🔧 Running in MVP Mode - Supabase client mocked');
} else {
  console.log('🚀 Running with real Supabase connection');
}

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