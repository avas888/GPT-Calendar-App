import React, { useState, useEffect, useCallback } from 'react';
import { supabase, Cita, Usuario, Servicio } from '../../../lib/supabaseClient';
import { useAuth } from '../../../hooks/useAuth';
import { Button } from '../../atoms/Button';
import { Card } from '../../atoms/Card';
import { ConfirmDialog } from '../../atoms/ConfirmDialog';
import { ToastSuccess } from '../../atoms/ToastSuccess';
import { Calendar, Clock, User, CheckCircle, X } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface CitaDetallada extends Cita {
  cliente: Usuario;
  servicios_detalle: Servicio[];
}

export const AgendaPersonal: React.FC = () => {
  const { user } = useAuth();
  const [citas, setCitas] = useState<CitaDetallada[]>([]);
  const [loading, setLoading] = useState(true);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [actionCita, setActionCita] = useState<{ cita: CitaDetallada; action: 'completar' | 'cancelar' } | null>(null);

  const fetchCitas = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      // First get the personal record for this user
      const { data: personalData, error: personalError } = await supabase
        .from('personal')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (personalError) throw personalError;

      // Then get citas for this personal
      const { data: citasData, error: citasError } = await supabase
        .from('citas')
        .select(`
          *,
          cliente:usuarios(*)
        `)
        .eq('personal_id', personalData.id)
        .eq('fecha', fechaSeleccionada)
        .order('hora_inicio');

      if (citasError) throw citasError;

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

      setCitas(citasConServicios as CitaDetallada[]);
    } catch (error) {
      console.error('Error fetching citas:', error);
    } finally {
      setLoading(false);
    }
  }, [user, fechaSeleccionada]);

  useEffect(() => {
    if (user) {
      fetchCitas();
    }
  }, [user, fechaSeleccionada, fetchCitas]);

  const handleActionCita = (cita: CitaDetallada, action: 'completar' | 'cancelar') => {
    setActionCita({ cita, action });
    setShowConfirmDialog(true);
  };

  const confirmarAccion = async () => {
    if (!actionCita) return;

    try {
      const nuevoEstado = actionCita.action === 'completar' ? 'realizada' : 'cancelada';
      
      const { error } = await supabase
        .from('citas')
        .update({ estado: nuevoEstado })
        .eq('id', actionCita.cita.id);

      if (error) throw error;

      setToastMessage(
        actionCita.action === 'completar' 
          ? 'Cita marcada como realizada' 
          : 'Cita cancelada exitosamente'
      );
      setShowToast(true);
      
      await fetchCitas();
    } catch (error) {
      console.error('Error updating cita:', error);
    }
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

  const generateDateOptions = () => {
    const dates = [];
    for (let i = -2; i <= 7; i++) {
      const date = addDays(new Date(), i);
      dates.push({
        value: format(date, 'yyyy-MM-dd'),
        label: format(date, 'EEE dd', { locale: es }),
        isToday: i === 0
      });
    }
    return dates;
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Mi Agenda</h1>
        <p className="text-gray-600">Gestiona tus citas del día</p>
      </div>

      {/* Date selector */}
      <Card className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Selecciona fecha</h2>
        <div className="flex space-x-2 overflow-x-auto">
          {generateDateOptions().map((date) => (
            <button
              key={date.value}
              onClick={() => setFechaSeleccionada(date.value)}
              className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                fechaSeleccionada === date.value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : date.isToday
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="text-center">
                <div className="capitalize">{date.label}</div>
                {date.isToday && <div className="text-xs">Hoy</div>}
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* Citas list */}
      {citas.length === 0 ? (
        <Card className="text-center py-12">
          <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay citas para este día
          </h3>
          <p className="text-gray-600">
            Disfruta tu día libre o revisa otras fechas
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {citas.map((cita) => (
            <Card key={cita.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <Clock className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="font-medium text-gray-900">
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
                    <span className="text-gray-900">{cita.cliente.nombre}</span>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    <strong>Servicios:</strong> {cita.servicios_detalle.map(s => s.nombre).join(', ')}
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    <strong>Duración:</strong> {cita.servicios_detalle.reduce((total, s) => total + s.duracion_min, 0)} min
                  </div>
                </div>
                
                {cita.estado === 'confirmada' && (
                  <div className="flex space-x-2 ml-4">
                    <Button
                      size="sm"
                      variant="success"
                      onClick={() => handleActionCita(cita, 'completar')}
                      className="flex items-center"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Completar
                    </Button>
                    <Button
                      size="sm"
                      variant="error"
                      onClick={() => handleActionCita(cita, 'cancelar')}
                      className="flex items-center"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Cancelar
                    </Button>
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
        onConfirm={confirmarAccion}
        title={actionCita?.action === 'completar' ? 'Confirmar cita realizada' : 'Cancelar cita'}
        message={
          actionCita?.action === 'completar'
            ? '¿Confirmas que esta cita se ha realizado correctamente?'
            : '¿Estás seguro de que quieres cancelar esta cita?'
        }
        confirmText={actionCita?.action === 'completar' ? 'Marcar como realizada' : 'Cancelar cita'}
        variant={actionCita?.action === 'completar' ? 'warning' : 'error'}
      />

      {/* Success toast */}
      <ToastSuccess
        message={toastMessage}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />
    </div>
  );
};