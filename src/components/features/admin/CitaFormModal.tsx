import React, { useState, useEffect } from 'react';
import { supabase, Cita, Usuario, Personal, Servicio } from '../../../lib/supabaseClient';
import { Button } from '../../atoms/Button';
import { Input } from '../../atoms/Input';
import { Modal } from '../../atoms/Modal';
import { ConfirmDialog } from '../../atoms/ConfirmDialog';
import { User, Calendar, Clock, DollarSign, Trash2, UserPlus, Users } from 'lucide-react';

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
  
  // Client creation states
  const [isNewClient, setIsNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [clientCreationError, setClientCreationError] = useState('');
  
  const [formData, setFormData] = useState({
    cliente_id: '',
    personal_id: '',
    fecha: '',
    hora_inicio: '',
    servicios_seleccionados: [] as string[],
    estado: 'confirmada' as const
  });

  // Helper functions
  const calcularDuracionTotal = (servicios: Servicio[]): number => {
    return servicios.reduce((total, servicio) => total + servicio.duracion_min, 0);
  };

  const calcularPrecioTotal = (servicios: Servicio[]): number => {
    return servicios.reduce((total, servicio) => total + servicio.precio, 0);
  };

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const generateHorarios = (): string[] => {
    const horarios = [];
    for (let hour = 8; hour <= 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        horarios.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
      }
    }
    return horarios;
  };

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
        setIsNewClient(false);
      } else {
        resetForm();
      }
    }
  }, [isOpen, editingCita]);

  useEffect(() => {
    if (formData.fecha && formData.personal_id && formData.servicios_seleccionados.length > 0) {
      setHorariosDisponibles(generateHorarios());
    } else {
      setHorariosDisponibles([]);
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
    setIsNewClient(false);
    setNewClientName('');
    setNewClientEmail('');
    setClientCreationError('');
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const createNewClient = async (): Promise<string | null> => {
    // Validate new client data
    if (!newClientName.trim()) {
      setClientCreationError('El nombre del cliente es requerido');
      return null;
    }

    if (!newClientEmail.trim()) {
      setClientCreationError('El email del cliente es requerido');
      return null;
    }

    if (!validateEmail(newClientEmail)) {
      setClientCreationError('Por favor ingresa un email válido');
      return null;
    }

    try {
      // Generate new UUID for the client
      const clientId = crypto.randomUUID();

      // Insert new client into usuarios table
      const { error: usuarioError } = await supabase
        .from('usuarios')
        .insert([{
          id: clientId,
          correo: newClientEmail.trim(),
          nombre: newClientName.trim()
        }]);

      if (usuarioError) {
        if (usuarioError.code === '23505') { // Unique constraint violation
          setClientCreationError('Ya existe un cliente con este email');
        } else {
          setClientCreationError('Error al crear el cliente: ' + usuarioError.message);
        }
        return null;
      }

      // Insert client role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert([{
          user_id: clientId,
          rol: 'cliente'
        }]);

      if (roleError) {
        console.error('Error creating client role:', roleError);
        // Don't fail the process if role creation fails
      }

      // Refresh usuarios list to include the new client
      await fetchData();

      return clientId;
    } catch (error) {
      console.error('Error creating new client:', error);
      setClientCreationError('Error inesperado al crear el cliente');
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setClientCreationError('');

    try {
      let clienteId = formData.cliente_id;

      // If creating a new client, create it first
      if (isNewClient) {
        const newClientId = await createNewClient();
        if (!newClientId) {
          setLoading(false);
          return;
        }
        clienteId = newClientId;
      }

      const serviciosSeleccionados = servicios.filter(s => 
        formData.servicios_seleccionados.includes(s.id)
      );
      const duracionTotal = calcularDuracionTotal(serviciosSeleccionados);
      
      // Calculate end time
      const [hours, minutes] = formData.hora_inicio.split(':').map(Number);
      const startMinutes = hours * 60 + minutes;
      const endMinutes = startMinutes + duracionTotal;
      const horaFin = formatTime(endMinutes);

      const citaData = {
        cliente_id: clienteId,
        personal_id: formData.personal_id,
        fecha: formData.fecha,
        hora_inicio: formData.hora_inicio,
        hora_fin: horaFin,
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
      setClientCreationError('Error al guardar la cita');
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
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
    }
    return dates;
  };

  const formatDateForDisplay = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES');
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={editingCita ? 'Editar Cita' : 'Nueva Cita'}
        size="xl"
      >
        <div className="max-h-[80vh] overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Cliente Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <User className="w-4 h-4 inline mr-2" />
                Cliente
              </label>
              
              {/* Client Type Toggle */}
              {!editingCita && (
                <div className="flex space-x-4 mb-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="clientType"
                      checked={!isNewClient}
                      onChange={() => {
                        setIsNewClient(false);
                        setClientCreationError('');
                        setFormData(prev => ({ ...prev, cliente_id: '' }));
                      }}
                      className="mr-2"
                    />
                    <Users className="w-4 h-4 mr-1" />
                    <span className="text-sm font-medium">Cliente existente</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="clientType"
                      checked={isNewClient}
                      onChange={() => {
                        setIsNewClient(true);
                        setClientCreationError('');
                        setFormData(prev => ({ ...prev, cliente_id: '' }));
                      }}
                      className="mr-2"
                    />
                    <UserPlus className="w-4 h-4 mr-1" />
                    <span className="text-sm font-medium">Nuevo cliente</span>
                  </label>
                </div>
              )}

              {/* Existing Client Selection */}
              {!isNewClient && (
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
              )}

              {/* New Client Form */}
              {isNewClient && (
                <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center mb-2">
                    <UserPlus className="w-4 h-4 text-blue-600 mr-2" />
                    <span className="text-sm font-medium text-blue-800">Datos del nuevo cliente</span>
                  </div>
                  
                  <Input
                    label="Nombre completo"
                    value={newClientName}
                    onChange={(e) => {
                      setNewClientName(e.target.value);
                      setClientCreationError('');
                    }}
                    placeholder="Nombre del cliente"
                    required
                  />
                  
                  <Input
                    label="Email"
                    type="email"
                    value={newClientEmail}
                    onChange={(e) => {
                      setNewClientEmail(e.target.value);
                      setClientCreationError('');
                    }}
                    placeholder="cliente@ejemplo.com"
                    required
                  />
                  
                  {clientCreationError && (
                    <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                      {clientCreationError}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Personal Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Personal
              </label>
              <select
                value={formData.personal_id}
                onChange={(e) => setFormData(prev => ({ ...prev, personal_id: e.target.value, hora_inicio: '' }))}
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

            {/* Services Selection - MOVED BEFORE DATE AND TIME */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <DollarSign className="w-4 h-4 inline mr-2" />
                Servicios
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                {servicios.map((servicio) => (
                  <label key={servicio.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.servicios_seleccionados.includes(servicio.id)}
                      onChange={(e) => {
                        handleServicioChange(servicio.id, e.target.checked);
                        // Reset time when services change
                        setFormData(prev => ({ ...prev, hora_inicio: '' }));
                      }}
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
              {formData.servicios_seleccionados.length === 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  Selecciona al menos un servicio para continuar
                </p>
              )}
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

            {/* Date and Time - NOW AFTER SERVICES */}
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
                  disabled={formData.servicios_seleccionados.length === 0}
                >
                  <option value="">Seleccionar fecha</option>
                  {generateDateOptions().map((date) => (
                    <option key={date} value={date}>
                      {formatDateForDisplay(date)}
                    </option>
                  ))}
                </select>
                {formData.servicios_seleccionados.length === 0 && (
                  <p className="text-sm text-gray-500 mt-1">Primero selecciona los servicios</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="w-4 h-4 inline mr-2" />
                  Hora
                </label>
                <div className="relative">
                  <select
                    value={formData.hora_inicio}
                    onChange={(e) => setFormData(prev => ({ ...prev, hora_inicio: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 max-h-40"
                    required
                    disabled={horariosDisponibles.length === 0}
                    size={8}
                  >
                    <option value="">Seleccionar hora</option>
                    {horariosDisponibles.map((hora) => (
                      <option key={hora} value={hora}>
                        {hora}
                      </option>
                    ))}
                  </select>
                </div>
                {formData.servicios_seleccionados.length === 0 && (
                  <p className="text-sm text-gray-500 mt-1">Primero selecciona los servicios</p>
                )}
                {formData.servicios_seleccionados.length > 0 && !formData.fecha && (
                  <p className="text-sm text-gray-500 mt-1">Selecciona una fecha primero</p>
                )}
                {formData.servicios_seleccionados.length > 0 && !formData.personal_id && (
                  <p className="text-sm text-gray-500 mt-1">Selecciona el personal primero</p>
                )}
                {formData.fecha && formData.personal_id && formData.servicios_seleccionados.length > 0 && horariosDisponibles.length === 0 && (
                  <p className="text-sm text-red-600 mt-1">No hay horarios disponibles</p>
                )}
              </div>
            </div>

            {/* Estado (only for editing) */}
            {editingCita && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado
                </label>
                <select
                  value={formData.estado}
                  onChange={(e) =>
                    setFormData(prev => ({
                      ...prev,
                      estado: e.target.value as 'confirmada' | 'realizada' | 'cancelada' | 'no_asistio'
                    }))
                  }
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
            <div className="flex space-x-3 pt-4 border-t border-gray-200">
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
                disabled={loading || formData.servicios_seleccionados.length === 0}
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
        </div>
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