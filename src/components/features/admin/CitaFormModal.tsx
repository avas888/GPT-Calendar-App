import React, { useState, useEffect } from 'react';
import { supabase, Cita, Usuario, Personal, Servicio } from '../../../lib/supabaseClient';
import { calcularDuracionTotal, calcularPrecioTotal, generarHorariosDisponibles } from '../../../lib/calculos';
import { Button } from '../../atoms/Button';
import { Input } from '../../atoms/Input';
import { Modal } from '../../atoms/Modal';
import { ConfirmDialog } from '../../atoms/ConfirmDialog';
import { User, Calendar, Clock, DollarSign, Trash2 } from 'lucide-react';
import { format, addMinutes } from 'date-fns';

interface CitaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingCita?: Cita | null;
}

export const CitaFormModal: React.FC<CitaFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingCita
}) => {
  const [loading, setLoading] = useState(false);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [personal, setPersonal] = useState<Personal[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [horariosDisponibles, setHorariosDisponibles] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const [formData, setFormData] = useState({
    cliente_id: '',
    personal_id: '',
    fecha: '',
    hora_inicio: '',
    servicios_seleccionados: [] as string[],
    estado: 'confirmada' as const
  });

  useEffect(() => {
    if (isOpen) {
      fetchData();
      if (editingCita) {
        setFormData({
          cliente_id: editingCita.cliente_id,
          personal_id: editingCita.personal_id,
          fecha: editingCita.fecha,
          hora_inicio: editingCita.hora_inicio,
          servicios_seleccionados: editingCita.servicios || [],
          estado: editingCita.estado
        });
      } else {
        resetForm();
      }
    }
  }, [isOpen, editingCita]);

  useEffect(() => {
    if (formData.fecha && formData.personal_id && formData.servicios_seleccionados.length > 0) {
      fetchHorariosDisponibles();
    }
  }, [formData.fecha, formData.personal_id, formData.servicios_seleccionados]);

  const fetchData = async () => {
    try {
      // Fetch usuarios
      const { data: usuariosData } = await supabase
        .from('usuarios')
        .select('*')
        .order('nombre');

      // Fetch personal
      const { data: personalData } = await supabase
        .from('personal')
        .select('*')
        .eq('activo', true)
        .order('nombre');

      // Fetch servicios
      const { data: serviciosData } = await supabase
        .from('servicios')
        .select('*')
        .eq('activo', true)
        .order('nombre');

      setUsuarios(usuariosData || []);
      setPersonal(personalData || []);
      setServicios(serviciosData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const fetchHorariosDisponibles = async () => {
    if (!formData.fecha || !formData.personal_id || formData.servicios_seleccionados.length === 0) return;

    try {
      // Fetch disponibilidad
      const { data: disponibilidad } = await supabase
        .from('disponibilidad')
        .select('*')
        .eq('personal_id', formData.personal_id);

      // Fetch citas existentes (excluding current cita if editing)
      let citasQuery = supabase
        .from('citas')
        .select('*')
        .eq('personal_id', formData.personal_id)
        .eq('fecha', formData.fecha)
        .in('estado', ['confirmada']);

      if (editingCita) {
        citasQuery = citasQuery.neq('id', editingCita.id);
      }

      const { data: citas } = await citasQuery;

      const serviciosSeleccionados = servicios.filter(s => 
        formData.servicios_seleccionados.includes(s.id)
      );
      const duracionTotal = calcularDuracionTotal(serviciosSeleccionados);
      
      const horarios = generarHorariosDisponibles(
        formData.fecha,
        disponibilidad || [],
        citas || [],
        duracionTotal
      );

      setHorariosDisponibles(horarios);
    } catch (error) {
      console.error('Error fetching horarios:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      cliente_id: '',
      personal_id: '',
      fecha: '',
      hora_inicio: '',
      servicios_seleccionados: [],
      estado: 'confirmada'
    });
    setHorariosDisponibles([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const serviciosSeleccionados = servicios.filter(s => 
        formData.servicios_seleccionados.includes(s.id)
      );
      const duracionTotal = calcularDuracionTotal(serviciosSeleccionados);
      
      const horaFin = new Date(`2000-01-01T${formData.hora_inicio}`);
      horaFin.setMinutes(horaFin.getMinutes() + duracionTotal);

      const citaData = {
        cliente_id: formData.cliente_id,
        personal_id: formData.personal_id,
        fecha: formData.fecha,
        hora_inicio: formData.hora_inicio,
        hora_fin: format(horaFin, 'HH:mm'),
        estado: formData.estado,
        servicios: formData.servicios_seleccionados
      };

      if (editingCita) {
        const { error } = await supabase
          .from('citas')
          .update(citaData)
          .eq('id', editingCita.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('citas')
          .insert([citaData]);

        if (error) throw error;
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving cita:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!editingCita) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('citas')
        .delete()
        .eq('id', editingCita.id);

      if (error) throw error;

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error deleting cita:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleServicioChange = (servicioId: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        servicios_seleccionados: [...prev.servicios_seleccionados, servicioId]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        servicios_seleccionados: prev.servicios_seleccionados.filter(id => id !== servicioId)
      }));
    }
  };

  const getServiciosSeleccionados = () => {
    return servicios.filter(s => formData.servicios_seleccionados.includes(s.id));
  };

  const generateDateOptions = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i <= 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(format(date, 'yyyy-MM-dd'));
    }
    return dates;
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={editingCita ? 'Editar Cita' : 'Nueva Cita'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cliente Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 inline mr-2" />
              Cliente
            </label>
            <select
              value={formData.cliente_id}
              onChange={(e) => setFormData(prev => ({ ...prev, cliente_id: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Seleccionar cliente</option>
              {usuarios.map((usuario) => (
                <option key={usuario.id} value={usuario.id}>
                  {usuario.nombre} ({usuario.correo})
                </option>
              ))}
            </select>
          </div>

          {/* Personal Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Personal
            </label>
            <select
              value={formData.personal_id}
              onChange={(e) => setFormData(prev => ({ ...prev, personal_id: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Seleccionar personal</option>
              {personal.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                Fecha
              </label>
              <select
                value={formData.fecha}
                onChange={(e) => setFormData(prev => ({ ...prev, fecha: e.target.value, hora_inicio: '' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Seleccionar fecha</option>
                {generateDateOptions().map((date) => (
                  <option key={date} value={date}>
                    {format(new Date(date), 'dd/MM/yyyy')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4 inline mr-2" />
                Hora
              </label>
              <select
                value={formData.hora_inicio}
                onChange={(e) => setFormData(prev => ({ ...prev, hora_inicio: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={horariosDisponibles.length === 0}
              >
                <option value="">Seleccionar hora</option>
                {horariosDisponibles.map((hora) => (
                  <option key={hora} value={hora}>
                    {hora}
                  </option>
                ))}
              </select>
              {formData.fecha && formData.personal_id && formData.servicios_seleccionados.length > 0 && horariosDisponibles.length === 0 && (
                <p className="text-sm text-red-600 mt-1">No hay horarios disponibles</p>
              )}
            </div>
          </div>

          {/* Services Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <DollarSign className="w-4 h-4 inline mr-2" />
              Servicios
            </label>
            <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3">
              {servicios.map((servicio) => (
                <label key={servicio.id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.servicios_seleccionados.includes(servicio.id)}
                    onChange={(e) => handleServicioChange(servicio.id, e.target.checked)}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <span className="font-medium">{servicio.nombre}</span>
                    <span className="text-sm text-gray-600 ml-2">
                      {servicio.duracion_min} min • ${servicio.precio.toLocaleString()}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Services Summary */}
          {formData.servicios_seleccionados.length > 0 && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Resumen de servicios</h4>
              <div className="text-sm text-blue-700">
                <div>Duración total: {calcularDuracionTotal(getServiciosSeleccionados())} min</div>
                <div>Precio total: ${calcularPrecioTotal(getServiciosSeleccionados()).toLocaleString()}</div>
              </div>
            </div>
          )}

          {/* Estado (only for editing) */}
          {editingCita && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado
              </label>
              <select
                value={formData.estado}
                onChange={(e) => setFormData(prev => ({ ...prev, estado: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="confirmada">Confirmada</option>
                <option value="realizada">Realizada</option>
                <option value="cancelada">Cancelada</option>
                <option value="no_asistio">No asistió</option>
              </select>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={loading}
              disabled={loading}
              className="flex-1"
            >
              {editingCita ? 'Actualizar' : 'Crear'} Cita
            </Button>
            {editingCita && (
              <Button
                type="button"
                variant="error"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Eliminar
              </Button>
            )}
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Eliminar Cita"
        message="¿Estás seguro de que quieres eliminar esta cita? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        variant="error"
      />
    </>
  );
};