// Electronic Invoicing Client for DIAN integration
// This module handles electronic invoicing integration with Colombian DIAN

export interface FacturaElectronica {
  numero: string;
  fecha_emision: string;
  cliente_id: string;
  cliente_nombre: string;
  cliente_nit: string;
  items: FacturaItem[];
  subtotal: number;
  impuestos: number;
  total: number;
  cufe?: string;
}

export interface FacturaItem {
  codigo: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
  impuesto_porcentaje: number;
}

export interface DIANResponse {
  success: boolean;
  cufe?: string;
  qr_code?: string;
  pdf_url?: string;
  xml_url?: string;
  error?: string;
}

export class FacturacionClient {
  private baseUrl: string;
  private nit: string;
  private token: string;
  private testMode: boolean;

  constructor(config: {
    baseUrl: string;
    nit: string;
    token: string;
    testMode?: boolean;
  }) {
    this.baseUrl = config.baseUrl;
    this.nit = config.nit;
    this.token = config.token;
    this.testMode = config.testMode || false;
  }

  async enviarFactura(factura: FacturaElectronica): Promise<DIANResponse> {
    try {
      const endpoint = this.testMode 
        ? `${this.baseUrl}/api/v1/test/invoice`
        : `${this.baseUrl}/api/v1/invoice`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`,
          'X-Company-NIT': this.nit,
        },
        body: JSON.stringify({
          ...factura,
          ambiente: this.testMode ? 'test' : 'production',
        }),
      });

      const result = await response.json();

      if (response.ok) {
        return {
          success: true,
          cufe: result.cufe,
          qr_code: result.qr_code,
          pdf_url: result.pdf_url,
          xml_url: result.xml_url,
        };
      } else {
        return {
          success: false,
          error: result.error || 'Error desconocido',
        };
      }
    } catch (error) {
      console.error('Error sending invoice to DIAN:', error);
      return {
        success: false,
        error: 'Error de conexión con DIAN',
      };
    }
  }

  async consultarEstadoFactura(cufe: string): Promise<{
    estado: 'procesando' | 'aceptada' | 'rechazada';
    observaciones?: string;
  }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/invoice/${cufe}/status`,
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'X-Company-NIT': this.nit,
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        return {
          estado: result.status,
          observaciones: result.observations,
        };
      }

      return { estado: 'procesando' };
    } catch (error) {
      console.error('Error checking invoice status:', error);
      return { estado: 'procesando' };
    }
  }

  async anularFactura(cufe: string, motivo: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/invoice/${cufe}/cancel`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`,
            'X-Company-NIT': this.nit,
          },
          body: JSON.stringify({
            motivo,
            ambiente: this.testMode ? 'test' : 'production',
          }),
        }
      );

      return response.ok;
    } catch (error) {
      console.error('Error canceling invoice:', error);
      return false;
    }
  }

  // Helper method to generate invoice from cita
  generarFacturaDesdeReserva(
    cita: any,
    cliente: any,
    servicios: any[]
  ): FacturaElectronica {
    const items: FacturaItem[] = servicios.map((servicio, index) => ({
      codigo: `SRV-${servicio.id}`,
      descripcion: servicio.nombre,
      cantidad: 1,
      precio_unitario: servicio.precio,
      total: servicio.precio,
      impuesto_porcentaje: 19, // IVA Colombia
    }));

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const impuestos = subtotal * 0.19;
    const total = subtotal + impuestos;

    return {
      numero: `FAC-${Date.now()}`,
      fecha_emision: new Date().toISOString(),
      cliente_id: cliente.id,
      cliente_nombre: cliente.nombre,
      cliente_nit: cliente.nit || '222222222222',
      items,
      subtotal,
      impuestos,
      total,
    };
  }
}

// Factory function to create facturacion client from configuration
export const createFacturacionClient = (config: {
  baseUrl: string;
  nit: string;
  token: string;
  testMode?: boolean;
}): FacturacionClient => {
  return new FacturacionClient(config);
};