import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if we have valid Supabase configuration
const hasValidConfig = supabaseUrl && supabaseAnonKey && 
  supabaseUrl !== 'https://mock-project.supabase.co' && 
  supabaseAnonKey !== 'mock-anon-key';

// Mock data storage for development (removed in production)
const mockData = {
  servicios: [
    {
      id: '1',
      nombre: 'Corte de cabello',
      duracion_min: 30,
      precio: 25000,
      activo: true,
      created_at: new Date().toISOString()
    },
    {
      id: '2',
      nombre: 'Coloración',
      duracion_min: 90,
      precio: 80000,
      activo: true,
      created_at: new Date().toISOString()
    },
    {
      id: '3',
      nombre: 'Peinado',
      duracion_min: 45,
      precio: 35000,
      activo: true,
      created_at: new Date().toISOString()
    },
    {
      id: '4',
      nombre: 'Manicure',
      duracion_min: 60,
      precio: 20000,
      activo: true,
      created_at: new Date().toISOString()
    },
    {
      id: '5',
      nombre: 'Pedicure',
      duracion_min: 60,
      precio: 25000,
      activo: true,
      created_at: new Date().toISOString()
    }
  ],
  personal: [
    {
      id: '1',
      nombre: 'María García',
      especialidades: ['Corte de cabello', 'Coloración', 'Peinado'],
      activo: true,
      user_id: null,
      created_at: new Date().toISOString()
    },
    {
      id: '2',
      nombre: 'Ana López',
      especialidades: ['Manicure', 'Pedicure'],
      activo: true,
      user_id: null,
      created_at: new Date().toISOString()
    }
  ],
  usuarios: [],
  user_roles: [],
  citas: [],
  disponibilidad: [],
  ausencias: [],
  configuracion: [
    { id: '1', key: 'negocio_nombre', valor: 'Mi Negocio', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: '2', key: 'negocio_telefono', valor: '', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: '3', key: 'negocio_email', valor: '', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: '4', key: 'negocio_direccion', valor: '', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: '5', key: 'horario_apertura', valor: '08:00', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: '6', key: 'horario_cierre', valor: '18:00', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: '7', key: 'dias_laborales', valor: '1,2,3,4,5,6', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: '8', key: 'tiempo_minimo_reserva', valor: '60', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: '9', key: 'cancelacion_limite', valor: '24', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: '10', key: 'comision_plataforma', valor: '0', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: '11', key: 'moneda', valor: 'COP', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
  ],
  terceros: [],
  facturas: [],
  integraciones: []
};

// Create mock Supabase client for MVP development
const createMockSupabaseClient = () => {
  let currentTable = '';
  let currentFilters: any = {};
  let currentOrder: any = {};

  const createMockQueryBuilder = (tableName: string) => {
    currentTable = tableName;
    currentFilters = {};
    currentOrder = {};

    const mockQueryBuilder = {
      select: (columns?: string) => {
        return mockQueryBuilder;
      },
      insert: (data: any) => {
        return {
          ...mockQueryBuilder,
          then: (resolve: any) => {
            try {
              const tableData = mockData[currentTable as keyof typeof mockData] as any[];
              
              if (Array.isArray(data)) {
                data.forEach(item => {
                  const newItem = {
                    ...item,
                    id: item.id || crypto.randomUUID(),
                    created_at: item.created_at || new Date().toISOString()
                  };
                  tableData.push(newItem);
                });
              } else {
                const newItem = {
                  ...data,
                  id: data.id || crypto.randomUUID(),
                  created_at: data.created_at || new Date().toISOString()
                };
                tableData.push(newItem);
              }
              
              console.log(`Mock INSERT into ${currentTable}:`, data);
              resolve({ data: data, error: null });
            } catch (error) {
              console.error(`Mock INSERT error:`, error);
              resolve({ data: null, error: error });
            }
          }
        };
      },
      update: (data: any) => {
        return {
          ...mockQueryBuilder,
          eq: (column: string, value: any) => {
            return {
              ...mockQueryBuilder,
              then: (resolve: any) => {
                try {
                  const tableData = mockData[currentTable as keyof typeof mockData] as any[];
                  const itemIndex = tableData.findIndex(item => item[column] === value);
                  
                  if (itemIndex !== -1) {
                    tableData[itemIndex] = {
                      ...tableData[itemIndex],
                      ...data,
                      updated_at: new Date().toISOString()
                    };
                    console.log(`Mock UPDATE in ${currentTable} where ${column}=${value}:`, data);
                    console.log('Updated item:', tableData[itemIndex]);
                    resolve({ data: tableData[itemIndex], error: null });
                  } else {
                    console.log(`Mock UPDATE: No item found in ${currentTable} where ${column}=${value}`);
                    resolve({ data: null, error: { message: 'No rows updated' } });
                  }
                } catch (error) {
                  console.error(`Mock UPDATE error:`, error);
                  resolve({ data: null, error: error });
                }
              }
            };
          }
        };
      },
      delete: () => {
        return {
          ...mockQueryBuilder,
          eq: (column: string, value: any) => {
            return {
              ...mockQueryBuilder,
              then: (resolve: any) => {
                try {
                  const tableData = mockData[currentTable as keyof typeof mockData] as any[];
                  const itemIndex = tableData.findIndex(item => item[column] === value);
                  
                  if (itemIndex !== -1) {
                    const deletedItem = tableData.splice(itemIndex, 1)[0];
                    console.log(`Mock DELETE from ${currentTable} where ${column}=${value}:`, deletedItem);
                    resolve({ data: deletedItem, error: null });
                  } else {
                    console.log(`Mock DELETE: No item found in ${currentTable} where ${column}=${value}`);
                    resolve({ data: null, error: { message: 'No rows deleted' } });
                  }
                } catch (error) {
                  console.error(`Mock DELETE error:`, error);
                  resolve({ data: null, error: error });
                }
              }
            };
          }
        };
      },
      upsert: (data: any, options?: any) => {
        return {
          ...mockQueryBuilder,
          then: (resolve: any) => {
            try {
              const tableData = mockData[currentTable as keyof typeof mockData] as any[];
              
              if (Array.isArray(data)) {
                data.forEach(item => {
                  const existingIndex = tableData.findIndex(existing => 
                    options?.onConflict ? existing[options.onConflict] === item[options.onConflict] : existing.id === item.id
                  );
                  
                  if (existingIndex !== -1) {
                    tableData[existingIndex] = {
                      ...tableData[existingIndex],
                      ...item,
                      updated_at: new Date().toISOString()
                    };
                  } else {
                    const newItem = {
                      ...item,
                      id: item.id || crypto.randomUUID(),
                      created_at: item.created_at || new Date().toISOString()
                    };
                    tableData.push(newItem);
                  }
                });
              } else {
                const existingIndex = tableData.findIndex(existing => 
                  options?.onConflict ? existing[options.onConflict] === data[options.onConflict] : existing.id === data.id
                );
                
                if (existingIndex !== -1) {
                  tableData[existingIndex] = {
                    ...tableData[existingIndex],
                    ...data,
                    updated_at: new Date().toISOString()
                  };
                } else {
                  const newItem = {
                    ...data,
                    id: data.id || crypto.randomUUID(),
                    created_at: data.created_at || new Date().toISOString()
                  };
                  tableData.push(newItem);
                }
              }
              
              console.log(`Mock UPSERT into ${currentTable}:`, data);
              resolve({ data: data, error: null });
            } catch (error) {
              console.error(`Mock UPSERT error:`, error);
              resolve({ data: null, error: error });
            }
          }
        };
      },
      eq: (column: string, value: any) => {
        currentFilters[column] = { operator: 'eq', value };
        return mockQueryBuilder;
      },
      neq: (column: string, value: any) => {
        currentFilters[column] = { operator: 'neq', value };
        return mockQueryBuilder;
      },
      gt: (column: string, value: any) => {
        currentFilters[column] = { operator: 'gt', value };
        return mockQueryBuilder;
      },
      gte: (column: string, value: any) => {
        currentFilters[column] = { operator: 'gte', value };
        return mockQueryBuilder;
      },
      lt: (column: string, value: any) => {
        currentFilters[column] = { operator: 'lt', value };
        return mockQueryBuilder;
      },
      lte: (column: string, value: any) => {
        currentFilters[column] = { operator: 'lte', value };
        return mockQueryBuilder;
      },
      like: (column: string, value: any) => {
        currentFilters[column] = { operator: 'like', value };
        return mockQueryBuilder;
      },
      ilike: (column: string, value: any) => {
        currentFilters[column] = { operator: 'ilike', value };
        return mockQueryBuilder;
      },
      is: (column: string, value: any) => {
        currentFilters[column] = { operator: 'is', value };
        return mockQueryBuilder;
      },
      in: (column: string, values: any[]) => {
        currentFilters[column] = { operator: 'in', value: values };
        return mockQueryBuilder;
      },
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
      order: (column: string, options?: { ascending?: boolean }) => {
        currentOrder = { column, ascending: options?.ascending !== false };
        return mockQueryBuilder;
      },
      limit: () => mockQueryBuilder,
      range: () => mockQueryBuilder,
      abortSignal: () => mockQueryBuilder,
      single: () => {
        return {
          then: (resolve: any) => {
            const tableData = mockData[currentTable as keyof typeof mockData] as any[];
            let filteredData = [...tableData];
            
            // Apply filters
            Object.entries(currentFilters).forEach(([column, filter]: [string, any]) => {
              filteredData = filteredData.filter(item => {
                switch (filter.operator) {
                  case 'eq':
                    return item[column] === filter.value;
                  case 'neq':
                    return item[column] !== filter.value;
                  case 'in':
                    return filter.value.includes(item[column]);
                  default:
                    return true;
                }
              });
            });
            
            const result = filteredData.length > 0 ? filteredData[0] : null;
            console.log(`Mock SELECT single from ${currentTable}:`, result);
            resolve({ data: result, error: null });
          }
        };
      },
      maybeSingle: () => {
        return mockQueryBuilder.single();
      },
      csv: () => Promise.resolve({ data: '', error: null }),
      geojson: () => Promise.resolve({ data: null, error: null }),
      explain: () => Promise.resolve({ data: null, error: null }),
      rollback: () => Promise.resolve({ data: null, error: null }),
      returns: () => mockQueryBuilder,
      then: (resolve: any) => {
        const tableData = mockData[currentTable as keyof typeof mockData] as any[];
        let filteredData = [...tableData];
        
        // Apply filters
        Object.entries(currentFilters).forEach(([column, filter]: [string, any]) => {
          filteredData = filteredData.filter(item => {
            switch (filter.operator) {
              case 'eq':
                return item[column] === filter.value;
              case 'neq':
                return item[column] !== filter.value;
              case 'in':
                return filter.value.includes(item[column]);
              default:
                return true;
            }
          });
        });
        
        // Apply ordering
        if (currentOrder.column) {
          filteredData.sort((a, b) => {
            const aVal = a[currentOrder.column];
            const bVal = b[currentOrder.column];
            
            if (aVal < bVal) return currentOrder.ascending ? -1 : 1;
            if (aVal > bVal) return currentOrder.ascending ? 1 : -1;
            return 0;
          });
        }
        
        console.log(`Mock SELECT from ${currentTable}:`, filteredData);
        resolve({ data: filteredData, error: null, count: filteredData.length, status: 200, statusText: 'OK' });
      },
      catch: (reject: any) => Promise.resolve({ data: [], error: null })
    };

    return mockQueryBuilder;
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
    from: (tableName: string) => createMockQueryBuilder(tableName),
    auth: mockAuth,
    rpc: () => Promise.resolve({ data: null, error: null }),
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
  console.log('🔧 Running in MVP Mode - Supabase client mocked with data persistence');
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