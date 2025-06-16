// ERP Integration Client
// This module handles external ERP system integrations

export interface ERPCita {
  id: string;
  cliente_id: string;
  fecha: string;
  servicios: string[];
  total: number;
  estado: string;
}

export interface ERPCliente {
  id: string;
  nombre: string;
  email: string;
  telefono?: string;
}

export class ERPClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async sincronizarCitas(citas: ERPCita[]): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/citas/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ citas }),
      });

      return response.ok;
    } catch (error) {
      console.error('Error syncing citas to ERP:', error);
      return false;
    }
  }

  async obtenerClientes(): Promise<ERPCliente[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/clientes`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (response.ok) {
        return await response.json();
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching clients from ERP:', error);
      return [];
    }
  }

  async crearCliente(cliente: Omit<ERPCliente, 'id'>): Promise<string | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/clientes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(cliente),
      });

      if (response.ok) {
        const result = await response.json();
        return result.id;
      }
      
      return null;
    } catch (error) {
      console.error('Error creating client in ERP:', error);
      return null;
    }
  }
}

// Factory function to create ERP client from configuration
export const createERPClient = (config: { baseUrl: string; apiKey: string }): ERPClient => {
  return new ERPClient(config.baseUrl, config.apiKey);
};