import React, { useState, useEffect } from 'react';
import { supabase, Cita, Personal, Servicio } from '../../../lib/supabaseClient';
import { useAuth } from '../../../hooks/useAuth';
import { Button } from '../../atoms/Button';
import { Card } from '../../atoms/Card';
import { ConfirmDialog } from '../../atoms/ConfirmDialog';
import { ToastSuccess } from '../../atoms/ToastSuccess';
import { Calendar, Clock, User, X, AlertCircle } from 'lucide-react';
import { format, parseISO, isBefore, addHours } from 'date-fns';
import { es } from 'date-fns/locale';

interface CitaDetallada extends Cita {
  personal: Personal;
  servicios_detalle: Servicio[];
}

export const MisCitas: React.FC = () => {
  const { user } = useAuth();
  const [citas, setCitas] = useState<CitaDetallada[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [citaACancelar, setCitaACancelar] = useState<CitaDetallada | null>(null);
  const [filtro, setFiltro] = useState<'todas' | 'proximas' | 'pasadas'>('proximas');

  useEffect(() => {
    if (user) {
      fetchCitas();
    }
  }, [user, filtro]);

  const fetchCitas = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      let query = supabase
        .from('citas')
        .select(`
          *,
          personal(*)
        `)
        .eq('cliente_id', user.id)
        .order('fecha', { ascending: false })
        .order('hora_inicio', { ascending: false });

      const { data: citasData, error } = await query;

      if (error) throw error;

      // Get services details for each cita
      const citasConServicios = await Promise.all(
        (citasData || []).map(async (cita) => {
          if (cita.servicios && cita.servicios.length > 0) {
            const { data: serviciosData } = await supabase
              .from('servicios')
              .select('*')
              .in('id', cita.servicios);
            
            return {
              ...cita,
              servicios_detalle: serviciosData || []
            };
          }
          return {
            ...cita,
            servicios_detalle: []
          };
        })
      );

      // Filter based on selected filter
      const ahora = new Date();
      let citasFiltradas = citasConServicios as CitaDetallada[];

      if (filtro === 'proximas') {
        citasFiltradas = citasFiltradas.filter(cita => {
          const fechaCita = parseISO(`${cita.fecha}T${cita.hora_inicio}`);
          return !isBefore(fechaCita, ahora) && cita.estado === 'confirmada';
        });
      } else if (filtro === 'pasadas') {
        citasFiltradas = citasFiltradas.filter(cita => {
          const fechaCita = parseISO(`${cita.fecha}T${cita.hora_inicio}`);
          return isBefore(fechaCita, ahora) || cita.estado !== 'confirmada';
        });
      }

      setCitas(citasFiltradas);
    } catch (error) {
      console.error('Error fetching citas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelarCita = (cita: CitaDetallada) => {
    setCitaACancelar(cita);
    setShowConfirmDialog(true);
  };

  const confirmarCancelacion = async () => {
    if (!citaACancelar) return;

    try {
      const { error } = await supabase
        .from('citas')
        .update({ estado: 'cancelada' })
        .eq('id', citaACancelar.id);

      if (error) throw error;

      setShowToast(true);
      await fetchCitas();
    } catch (error) {
      console.error('Error canceling cita:', error);
    }
  };

  const puedeSerCancelada = (cita: CitaDetallada): boolean => {
    if (cita.estado !== 'confirmada') return false;
    
    const fechaCita = parseISO(`${cita.fecha}T${cita.hora_inicio}`);
    const limiteCancelacion = addHours(new Date(), 24); // 24 horas de anticipación
    
    return !isBefore(fechaCita, limiteCancelacion);
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'confirmada':
        return 'bg-blue-100 text-blue-800';
      case 'realizada':
        return 'bg-green-100 text-green-800';
      case 'cancelada':
        return 'bg-red-100 text-red-800';
      case 'no_asistio':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getEstadoTexto = (estado: string) => {
    switch (estado) {
      case 'confirmada':
        return 'Confirmada';
      case 'realizada':
        return 'Realizada';
      case 'cancelada':
        return 'Cancelada';
      case 'no_asistio':
        return 'No asistió';
      default:
        return estado;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Mis Citas</h1>
        <p className="text-gray-600">Gestiona tus citas agendadas</p>
      </div>

      {/* Filter tabs */}
      <Card className="mb-6">
        <div className="flex space-x-1">
          {[
            { key: 'proximas', label: 'Próximas' },
            { key: 'pasadas', label: 'Historial' },
            { key: 'todas', label: 'Todas' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFiltro(tab.key as any)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filtro === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Citas list */}
      {citas.length === 0 ? (
        <Card className="text-center py-12">
          <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {filtro === 'proximas' ? 'No tienes citas próximas' : 'No hay citas para mostrar'}
          </h3>
          <p className="text-gray-600 mb-4">
            {filtro === 'proximas' 
              ? 'Agenda tu primera cita para comenzar' 
              : 'Las citas aparecerán aquí cuando las tengas'
            }
          </p>
          {filtro === 'proximas' && (
            <Button onClick={() => window.location.href = '/reservar'}>
              Reservar Cita
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {citas.map((cita) => (
            <Card key={cita.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="font-medium text-gray-900">
                      {format(parseISO(cita.fecha), 'EEEE, dd MMMM yyyy', { locale: es })}
                    </span>
                  </div>
                  
                  <div className="flex items-center mb-2">
                    <Clock className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-gray-900">
                      {cita.hora_inicio} - {cita.hora_fin}
                    </span>
                    <span
                      className={`ml-3 px-2 py-1 text-xs font-medium rounded-full ${getEstadoColor(cita.estado)}`}
                    >
                      {getEstadoTexto(cita.estado)}
                    </span>
                  </div>
                  
                  <div className="flex items-center mb-2">
                    <User className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-gray-900">{cita.personal.nombre}</span>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-2">
                    <strong>Servicios:</strong> {cita.servicios_detalle.map(s => s.nombre).join(', ')}
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    <strong>Total:</strong> ${cita.servicios_detalle.reduce((total, s) => total + s.precio, 0).toLocaleString()}
                  </div>
                </div>
                
                {puedeSerCancelada(cita) && (
                  <div className="ml-4">
                    <Button
                      size="sm"
                      variant="error"
                      onClick={() => handleCancelarCita(cita)}
                      className="flex items-center"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Cancelar
                    </Button>
                  </div>
                )}
                
                {cita.estado === 'confirmada' && !puedeSerCancelada(cita) && (
                  <div className="ml-4 flex items-center text-sm text-amber-600">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    No se puede cancelar
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Confirm dialog */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={confirmarCancelacion}
        title="Cancelar Cita"
        message={`¿Estás seguro de que quieres cancelar tu cita del ${citaACancelar ? format(parseISO(citaACancelar.fecha), 'dd/MM/yyyy', { locale: es }) : ''}?`}
        confirmText="Cancelar Cita"
        variant="error"
      />

      {/* Success toast */}
      <ToastSuccess
        message="Cita cancelada exitosamente"
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />
    </div>
  );
};