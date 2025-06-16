import React, { useState, useEffect } from 'react';
import { supabase, Cita, Usuario, Personal, Servicio } from '../../../lib/supabaseClient';
import { Button } from '../../atoms/Button';
import { Card } from '../../atoms/Card';
import { Input } from '../../atoms/Input';
import { Calendar, Clock, User, Search, Filter } from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';

interface CitaCompleta extends Cita {
  cliente: Usuario;
  personal: Personal;
  servicios_detalle: Servicio[];
}

export const AgendaAdmin: React.FC = () => {
  const [citas, setCitas] = useState<CitaCompleta[]>([]);
  const [loading, setLoading] = useState(true);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [filtroPersonal, setFiltroPersonal] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [personal, setPersonal] = useState<Personal[]>([]);

  useEffect(() => {
    fetchCitas();
    fetchPersonal();
  }, [fechaSeleccionada, filtroPersonal, filtroEstado]);

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

  const fetchCitas = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('citas')
        .select(`
          *,
          cliente:usuarios(*),
          personal(*)
        `)
        .eq('fecha', fechaSeleccionada);

      if (filtroPersonal) {
        query = query.eq('personal_id', filtroPersonal);
      }

      if (filtroEstado) {
        query = query.eq('estado', filtroEstado);
      }

      const { data: citasData, error } = await query.order('hora_inicio');

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

      setCitas(citasConServicios as CitaCompleta[]);
    } catch (error) {
      console.error('Error fetching citas:', error);
    } finally {
      setLoading(false);
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

  const generateWeekDates = () => {
    const today = new Date();
    const start = startOfWeek(today, { weekStartsOn: 1 }); // Monday
    const dates = [];
    
    for (let i = 0; i < 7; i++) {
      const date = addDays(start, i);
      dates.push({
        value: format(date, 'yyyy-MM-dd'),
        label: format(date, 'EEE dd', { locale: es }),
        isToday: format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
      });
    }
    
    return dates;
  };

  const calcularEstadisticas = () => {
    const total = citas.length;
    const confirmadas = citas.filter(c => c.estado === 'confirmada').length;
    const realizadas = citas.filter(c => c.estado === 'realizada').length;
    const canceladas = citas.filter(c => c.estado === 'cancelada').length;
    
    return { total, confirmadas, realizadas, canceladas };
  };

  const stats = calcularEstadisticas();

  return (
    <div>
      {/* Statistics cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card padding="sm" className="bg-blue-50 border-blue-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-blue-700">Total Citas</div>
          </div>
        </Card>
        <Card padding="sm" className="bg-yellow-50 border-yellow-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.confirmadas}</div>
            <div className="text-sm text-yellow-700">Confirmadas</div>
          </div>
        </Card>
        <Card padding="sm" className="bg-green-50 border-green-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.realizadas}</div>
            <div className="text-sm text-green-700">Realizadas</div>
          </div>
        </Card>
        <Card padding="sm" className="bg-red-50 border-red-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.canceladas}</div>
            <div className="text-sm text-red-700">Canceladas</div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
          {/* Date selector */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha
            </label>
            <div className="flex space-x-2 overflow-x-auto">
              {generateWeekDates().map((date) => (
                <button
                  key={date.value}
                  onClick={() => setFechaSeleccionada(date.value)}
                  className={`flex-shrink-0 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                    fechaSeleccionada === date.value
                      ? 'bg-blue-600 text-white border-blue-600'
                      : date.isToday
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="text-center capitalize">{date.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Personal filter */}
          <div className="w-full lg:w-48">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Personal
            </label>
            <select
              value={filtroPersonal}
              onChange={(e) => setFiltroPersonal(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos</option>
              {personal.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div className="w-full lg:w-48">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado
            </label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos</option>
              <option value="confirmada">Confirmada</option>
              <option value="realizada">Realizada</option>
              <option value="cancelada">Cancelada</option>
              <option value="no_asistio">No asistió</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Citas list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : citas.length === 0 ? (
        <Card className="text-center py-12">
          <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay citas para mostrar
          </h3>
          <p className="text-gray-600">
            No se encontraron citas con los filtros seleccionados
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {citas.map((cita) => (
            <Card key={cita.id} hover className="transition-all duration-200">
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
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="flex items-center mb-1">
                        <User className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="font-medium">Cliente:</span>
                      </div>
                      <span className="text-gray-900">{cita.cliente.nombre}</span>
                      <div className="text-gray-600">{cita.cliente.correo}</div>
                    </div>
                    
                    <div>
                      <div className="font-medium mb-1">Personal:</div>
                      <span className="text-gray-900">{cita.personal.nombre}</span>
                    </div>
                    
                    <div>
                      <div className="font-medium mb-1">Servicios:</div>
                      <div className="text-gray-900">
                        {cita.servicios_detalle.map(s => s.nombre).join(', ')}
                      </div>
                      <div className="text-gray-600">
                        {cita.servicios_detalle.reduce((total, s) => total + s.duracion_min, 0)} min • 
                        ${cita.servicios_detalle.reduce((total, s) => total + s.precio, 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};