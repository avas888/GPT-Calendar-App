import React, { useState, useEffect } from 'react';
import { supabase, Cita, Usuario, Personal, Servicio } from '../../../lib/supabaseClient';
import { Button } from '../../atoms/Button';
import { Card } from '../../atoms/Card';
import { Input } from '../../atoms/Input';
import { ToastSuccess } from '../../atoms/ToastSuccess';
import { CitaFormModal } from './CitaFormModal';
import { Calendar, Clock, User, Search, Filter, Plus, Edit } from 'lucide-react';
import { 
  format, 
  addDays, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  addMonths, 
  subMonths, 
  eachDayOfInterval, 
  isSameDay, 
  isToday,
  isSameMonth,
  startOfDay,
  endOfDay
} from 'date-fns';
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
  const [dateRangeFilter, setDateRangeFilter] = useState<'none' | 'today' | 'tomorrow' | 'week' | 'month'>('none');
  const [filtroPersonal, setFiltroPersonal] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [personal, setPersonal] = useState<Personal[]>([]);
  const [showCitaModal, setShowCitaModal] = useState(false);
  const [editingCita, setEditingCita] = useState<CitaCompleta | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    console.log('Fetching citas for date range filter:', dateRangeFilter, 'specific date:', fechaSeleccionada);
    fetchCitas();
    fetchPersonal();
  }, [fechaSeleccionada, dateRangeFilter, filtroPersonal, filtroEstado]);

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
        `);

      // Apply date range filter
      let filterStartDate: Date;
      let filterEndDate: Date;

      switch (dateRangeFilter) {
        case 'today':
          filterStartDate = startOfDay(new Date());
          filterEndDate = endOfDay(new Date());
          break;
        case 'tomorrow':
          const tomorrow = addDays(new Date(), 1);
          filterStartDate = startOfDay(tomorrow);
          filterEndDate = endOfDay(tomorrow);
          break;
        case 'week':
          filterStartDate = startOfWeek(new Date(), { weekStartsOn: 1 });
          filterEndDate = endOfWeek(new Date(), { weekStartsOn: 1 });
          break;
        case 'month':
          filterStartDate = startOfMonth(new Date());
          filterEndDate = endOfMonth(new Date());
          break;
        default: // 'none' - use specific selected date
          filterStartDate = startOfDay(new Date(fechaSeleccionada));
          filterEndDate = endOfDay(new Date(fechaSeleccionada));
          break;
      }

      query = query
        .gte('fecha', format(filterStartDate, 'yyyy-MM-dd'))
        .lte('fecha', format(filterEndDate, 'yyyy-MM-dd'));

      if (filtroPersonal) {
        query = query.eq('personal_id', filtroPersonal);
      }

      if (filtroEstado) {
        query = query.eq('estado', filtroEstado);
      }

      const { data: citasData, error } = await query.order('fecha').order('hora_inicio');

      if (error) {
        console.error('Error fetching citas:', error);
        setCitas([]);
        return;
      }

      console.log('Fetched citas data:', citasData);

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

      console.log('Processed citas with services:', citasConServicios);
      setCitas(citasConServicios as CitaCompleta[]);
    } catch (error) {
      console.error('Error fetching citas:', error);
      setCitas([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEditCita = (cita: CitaCompleta) => {
    setEditingCita(cita);
    setShowCitaModal(true);
  };

  const handleNewCita = () => {
    setEditingCita(null);
    setShowCitaModal(true);
  };

  const handleCitaSuccess = () => {
    console.log('Cita operation successful, refreshing data...');
    setToastMessage(editingCita ? 'Cita actualizada exitosamente' : 'Cita creada exitosamente');
    setShowToast(true);
    fetchCitas();
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

  // Get display text for current date filter
  const getDisplayDateText = () => {
    switch (dateRangeFilter) {
      case 'today':
        return 'Hoy';
      case 'tomorrow':
        return 'Mañana';
      case 'week':
        return 'Esta semana';
      case 'month':
        return 'Este mes';
      default:
        return format(new Date(fechaSeleccionada), 'EEEE, dd MMMM yyyy', { locale: es });
    }
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
      {/* Header with Add Button */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Agenda Administrativa</h2>
          <p className="text-gray-600">Gestiona todas las citas del negocio</p>
        </div>
        <Button
          onClick={handleNewCita}
          className="flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nueva Cita
        </Button>
      </div>

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

      {/* Date Range Filter and Other Filters */}
      <Card className="mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
          {/* Date Range Filter */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filtro de fecha
            </label>
            <select
              value={dateRangeFilter}
              onChange={(e) => setDateRangeFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="none">Fecha específica</option>
              <option value="today">Hoy</option>
              <option value="tomorrow">Mañana</option>
              <option value="week">Esta semana</option>
              <option value="month">Este mes</option>
            </select>
          </div>

          {/* Active Date Display */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha activa
            </label>
            <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 font-medium">
              {getDisplayDateText()}
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

      {/* Debug info */}
      {import.meta.env.DEV && (
        <Card className="mb-4 bg-yellow-50 border-yellow-200">
          <div className="text-sm text-yellow-800">
            <strong>Debug Info:</strong><br/>
            Filtro de rango: {dateRangeFilter}<br/>
            Fecha específica: {fechaSeleccionada}<br/>
            Filtro personal: {filtroPersonal || 'Ninguno'}<br/>
            Filtro estado: {filtroEstado || 'Ninguno'}<br/>
            Citas encontradas: {citas.length}<br/>
            Loading: {loading ? 'Sí' : 'No'}
          </div>
        </Card>
      )}

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
          <p className="text-gray-600 mb-4">
            No se encontraron citas con los filtros seleccionados
          </p>
          <Button onClick={handleNewCita}>
            <Plus className="w-4 h-4 mr-2" />
            Crear Primera Cita
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {citas.map((cita) => (
            <Card key={cita.id} hover className="transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="font-medium text-gray-900 mr-4">
                      {format(new Date(cita.fecha), 'EEEE, dd MMMM yyyy', { locale: es })}
                    </span>
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
                      <span className="text-gray-900">{cita.cliente?.nombre || 'Cliente no encontrado'}</span>
                      <div className="text-gray-600">{cita.cliente?.correo || ''}</div>
                    </div>
                    
                    <div>
                      <div className="font-medium mb-1">Personal:</div>
                      <span className="text-gray-900">{cita.personal?.nombre || 'Personal no encontrado'}</span>
                    </div>
                    
                    <div>
                      <div className="font-medium mb-1">Servicios:</div>
                      <div className="text-gray-900">
                        {cita.servicios_detalle.length > 0 
                          ? cita.servicios_detalle.map(s => s.nombre).join(', ')
                          : 'Servicios no encontrados'
                        }
                      </div>
                      {cita.servicios_detalle.length > 0 && (
                        <div className="text-gray-600">
                          {cita.servicios_detalle.reduce((total, s) => total + s.duracion_min, 0)} min • 
                          ${cita.servicios_detalle.reduce((total, s) => total + s.precio, 0).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="ml-4">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleEditCita(cita)}
                    className="flex items-center"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Cita Form Modal */}
      <CitaFormModal
        isOpen={showCitaModal}
        onClose={() => setShowCitaModal(false)}
        onSuccess={handleCitaSuccess}
        editingCita={editingCita}
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