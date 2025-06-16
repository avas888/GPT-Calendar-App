import React, { useState, useEffect } from 'react';
import { supabase, Servicio, Personal } from '../../../lib/supabaseClient';
import { calcularDuracionTotal, calcularPrecioTotal, generarHorariosDisponibles } from '../../../lib/calculos';
import { Button } from '../../atoms/Button';
import { Input } from '../../atoms/Input';
import { Card } from '../../atoms/Card';
import { ToastSuccess } from '../../atoms/ToastSuccess';
import { useAuth } from '../../../hooks/useAuth';
import { Calendar, Clock, DollarSign, User } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface PasoReserva {
  paso: 'fecha' | 'servicios' | 'personal' | 'confirmacion';
}

export const ReservarCita: React.FC = () => {
  const { user } = useAuth();
  const [paso, setPaso] = useState<'fecha' | 'servicios' | 'personal' | 'confirmacion'>('fecha');
  const [loading, setLoading] = useState(false);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [personal, setPersonal] = useState<Personal[]>([]);
  const [showToast, setShowToast] = useState(false);
  
  const [reserva, setReserva] = useState({
    fecha: '',
    serviciosSeleccionados: [] as Servicio[],
    personalSeleccionado: null as Personal | null,
    horario: ''
  });
  
  const [horariosDisponibles, setHorariosDisponibles] = useState<string[]>([]);

  useEffect(() => {
    fetchServicios();
    fetchPersonal();
  }, []);

  useEffect(() => {
    if (reserva.fecha && reserva.serviciosSeleccionados.length > 0 && reserva.personalSeleccionado) {
      fetchHorariosDisponibles();
    }
  }, [reserva.fecha, reserva.serviciosSeleccionados, reserva.personalSeleccionado]);

  const fetchServicios = async () => {
    try {
      const { data, error } = await supabase
        .from('servicios')
        .select('*')
        .eq('activo', true)
        .order('nombre');

      if (error) throw error;
      setServicios(data || []);
    } catch (error) {
      console.error('Error fetching servicios:', error);
    }
  };

  const fetchPersonal = async () => {
    try {
      const { data, error } = await supabase
        .from('personal')
        .select('*')
        .eq('activo', true)
        .order('nombre');

      if (error) throw error;
      setPersonal(data || []);
    } catch (error) {
      console.error('Error fetching personal:', error);
    }
  };

  const fetchHorariosDisponibles = async () => {
    if (!reserva.fecha || !reserva.personalSeleccionado) return;

    try {
      // Fetch disponibilidad
      const { data: disponibilidad, error: dispError } = await supabase
        .from('disponibilidad')
        .select('*')
        .eq('personal_id', reserva.personalSeleccionado.id);

      if (dispError) throw dispError;

      // Fetch citas existentes
      const { data: citas, error: citasError } = await supabase
        .from('citas')
        .select('*')
        .eq('personal_id', reserva.personalSeleccionado.id)
        .eq('fecha', reserva.fecha)
        .in('estado', ['confirmada']);

      if (citasError) throw citasError;

      const duracionTotal = calcularDuracionTotal(reserva.serviciosSeleccionados);
      const horarios = generarHorariosDisponibles(
        reserva.fecha,
        disponibilidad || [],
        citas || [],
        duracionTotal
      );

      setHorariosDisponibles(horarios);
    } catch (error) {
      console.error('Error fetching horarios:', error);
    }
  };

  const confirmarReserva = async () => {
    if (!user || !reserva.personalSeleccionado) return;

    setLoading(true);
    try {
      const duracionTotal = calcularDuracionTotal(reserva.serviciosSeleccionados);
      const horaFin = new Date(`2000-01-01T${reserva.horario}`);
      horaFin.setMinutes(horaFin.getMinutes() + duracionTotal);

      const { error } = await supabase
        .from('citas')
        .insert([
          {
            cliente_id: user.id,
            personal_id: reserva.personalSeleccionado.id,
            fecha: reserva.fecha,
            hora_inicio: reserva.horario,
            hora_fin: format(horaFin, 'HH:mm'),
            estado: 'confirmada',
            servicios: reserva.serviciosSeleccionados.map(s => s.id)
          }
        ]);

      if (error) throw error;

      setShowToast(true);
      // Reset form
      setReserva({
        fecha: '',
        serviciosSeleccionados: [],
        personalSeleccionado: null,
        horario: ''
      });
      setPaso('fecha');
    } catch (error) {
      console.error('Error confirming reservation:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateDateOptions = () => {
    const dates = [];
    for (let i = 1; i <= 14; i++) {
      const date = addDays(new Date(), i);
      dates.push({
        value: format(date, 'yyyy-MM-dd'),
        label: format(date, 'EEEE, dd MMMM', { locale: es })
      });
    }
    return dates;
  };

  const renderPasoFecha = () => (
    <Card>
      <div className="text-center mb-6">
        <Calendar className="mx-auto h-12 w-12 text-blue-600 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900">Selecciona una fecha</h2>
        <p className="text-gray-600">Elige cuándo te gustaría tu cita</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {generateDateOptions().map((date) => (
          <button
            key={date.value}
            onClick={() => {
              setReserva(prev => ({ ...prev, fecha: date.value }));
              setPaso('servicios');
            }}
            className="p-4 text-left border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <div className="font-medium text-gray-900 capitalize">
              {date.label}
            </div>
          </button>
        ))}
      </div>
    </Card>
  );

  const renderPasoServicios = () => (
    <Card>
      <div className="text-center mb-6">
        <DollarSign className="mx-auto h-12 w-12 text-blue-600 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900">Selecciona servicios</h2>
        <p className="text-gray-600">¿Qué servicios necesitas?</p>
      </div>

      <div className="space-y-3 mb-6">
        {servicios.map((servicio) => (
          <label
            key={servicio.id}
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={reserva.serviciosSeleccionados.some(s => s.id === servicio.id)}
              onChange={(e) => {
                if (e.target.checked) {
                  setReserva(prev => ({
                    ...prev,
                    serviciosSeleccionados: [...prev.serviciosSeleccionados, servicio]
                  }));
                } else {
                  setReserva(prev => ({
                    ...prev,
                    serviciosSeleccionados: prev.serviciosSeleccionados.filter(s => s.id !== servicio.id)
                  }));
                }
              }}
              className="mr-3"
            />
            <div className="flex-1">
              <div className="font-medium text-gray-900">{servicio.nombre}</div>
              <div className="text-sm text-gray-600">
                {servicio.duracion_min} min • ${servicio.precio.toLocaleString()}
              </div>
            </div>
          </label>
        ))}
      </div>

      {reserva.serviciosSeleccionados.length > 0 && (
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <div className="font-medium text-blue-900">Resumen</div>
          <div className="text-sm text-blue-700">
            Duración total: {calcularDuracionTotal(reserva.serviciosSeleccionados)} min
          </div>
          <div className="text-sm text-blue-700">
            Precio total: ${calcularPrecioTotal(reserva.serviciosSeleccionados).toLocaleString()}
          </div>
        </div>
      )}

      <div className="flex space-x-3">
        <Button
          variant="secondary"
          onClick={() => setPaso('fecha')}
          className="flex-1"
        >
          Atrás
        </Button>
        <Button
          onClick={() => setPaso('personal')}
          disabled={reserva.serviciosSeleccionados.length === 0}
          className="flex-1"
        >
          Continuar
        </Button>
      </div>
    </Card>
  );

  const renderPasoPersonal = () => (
    <Card>
      <div className="text-center mb-6">
        <User className="mx-auto h-12 w-12 text-blue-600 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900">Selecciona especialista</h2>
        <p className="text-gray-600">¿Con quién te gustaría tu cita?</p>
      </div>

      <div className="space-y-3 mb-6">
        {personal.map((especialista) => (
          <button
            key={especialista.id}
            onClick={() => {
              setReserva(prev => ({ ...prev, personalSeleccionado: especialista }));
              setPaso('confirmacion');
            }}
            className="w-full p-4 text-left border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <div className="font-medium text-gray-900">{especialista.nombre}</div>
            <div className="text-sm text-gray-600">
              {especialista.especialidades.join(', ')}
            </div>
          </button>
        ))}
      </div>

      <div className="flex space-x-3">
        <Button
          variant="secondary"
          onClick={() => setPaso('servicios')}
          className="flex-1"
        >
          Atrás
        </Button>
      </div>
    </Card>
  );

  const renderPasoConfirmacion = () => (
    <Card>
      <div className="text-center mb-6">
        <Clock className="mx-auto h-12 w-12 text-blue-600 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900">Confirma tu cita</h2>
        <p className="text-gray-600">Selecciona la hora y confirma</p>
      </div>

      {/* Resumen de la cita */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h3 className="font-medium text-gray-900 mb-3">Resumen de tu cita</h3>
        <div className="space-y-2 text-sm">
          <div><span className="font-medium">Fecha:</span> {format(new Date(reserva.fecha), 'EEEE, dd MMMM yyyy', { locale: es })}</div>
          <div><span className="font-medium">Especialista:</span> {reserva.personalSeleccionado?.nombre}</div>
          <div><span className="font-medium">Servicios:</span> {reserva.serviciosSeleccionados.map(s => s.nombre).join(', ')}</div>
          <div><span className="font-medium">Duración:</span> {calcularDuracionTotal(reserva.serviciosSeleccionados)} min</div>
          <div><span className="font-medium">Precio:</span> ${calcularPrecioTotal(reserva.serviciosSeleccionados).toLocaleString()}</div>
        </div>
      </div>

      {/* Horarios disponibles */}
      <div className="mb-6">
        <h3 className="font-medium text-gray-900 mb-3">Horarios disponibles</h3>
        {horariosDisponibles.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {horariosDisponibles.map((horario) => (
              <button
                key={horario}
                onClick={() => setReserva(prev => ({ ...prev, horario }))}
                className={`p-2 text-sm border rounded-md transition-colors ${
                  reserva.horario === horario
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50'
                }`}
              >
                {horario}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No hay horarios disponibles para esta fecha</p>
        )}
      </div>

      <div className="flex space-x-3">
        <Button
          variant="secondary"
          onClick={() => setPaso('personal')}
          className="flex-1"
        >
          Atrás
        </Button>
        <Button
          onClick={confirmarReserva}
          disabled={!reserva.horario || loading}
          loading={loading}
          className="flex-1"
        >
          Confirmar Cita
        </Button>
      </div>
    </Card>
  );

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {['fecha', 'servicios', 'personal', 'confirmacion'].map((stepName, index) => {
            const isActive = paso === stepName;
            const isCompleted = ['fecha', 'servicios', 'personal', 'confirmacion'].indexOf(paso) > index;
            
            return (
              <div key={stepName} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    isActive || isCompleted
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {index + 1}
                </div>
                {index < 3 && (
                  <div
                    className={`w-16 h-0.5 mx-2 ${
                      isCompleted ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Render current step */}
      {paso === 'fecha' && renderPasoFecha()}
      {paso === 'servicios' && renderPasoServicios()}
      {paso === 'personal' && renderPasoPersonal()}
      {paso === 'confirmacion' && renderPasoConfirmacion()}

      {/* Success toast */}
      <ToastSuccess
        message="¡Cita reservada exitosamente!"
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />
    </div>
  );
};