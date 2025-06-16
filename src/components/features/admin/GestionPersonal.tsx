import React, { useState, useEffect } from 'react';
import { supabase, Personal } from '../../../lib/supabaseClient';
import { Button } from '../../atoms/Button';
import { Card } from '../../atoms/Card';
import { Input } from '../../atoms/Input';
import { Modal } from '../../atoms/Modal';
import { ToastSuccess } from '../../atoms/ToastSuccess';
import { ConfirmDialog } from '../../atoms/ConfirmDialog';
import { User, Plus, Edit, Trash2, UserCheck, UserX } from 'lucide-react';

export const GestionPersonal: React.FC = () => {
  const [personal, setPersonal] = useState<Personal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [editingPersonal, setEditingPersonal] = useState<Personal | null>(null);
  const [personalToDelete, setPersonalToDelete] = useState<Personal | null>(null);
  
  const [formData, setFormData] = useState({
    nombre: '',
    especialidades: [] as string[],
    activo: true
  });

  useEffect(() => {
    fetchPersonal();
  }, []);

  const fetchPersonal = async () => {
    try {
      const { data, error } = await supabase
        .from('personal')
        .select('*')
        .order('nombre');

      if (error) throw error;
      setPersonal(data || []);
    } catch (error) {
      console.error('Error fetching personal:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      especialidades: [],
      activo: true
    });
    setEditingPersonal(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingPersonal) {
        const { error } = await supabase
          .from('personal')
          .update({
            nombre: formData.nombre,
            especialidades: formData.especialidades,
            activo: formData.activo
          })
          .eq('id', editingPersonal.id);

        if (error) throw error;
        setToastMessage('Personal actualizado exitosamente');
      } else {
        const { error } = await supabase
          .from('personal')
          .insert([{
            nombre: formData.nombre,
            especialidades: formData.especialidades,
            activo: formData.activo
          }]);

        if (error) throw error;
        setToastMessage('Personal agregado exitosamente');
      }

      setShowToast(true);
      setShowModal(false);
      resetForm();
      await fetchPersonal();
    } catch (error) {
      console.error('Error saving personal:', error);
    }
  };

  const handleEdit = (person: Personal) => {
    setEditingPersonal(person);
    setFormData({
      nombre: person.nombre,
      especialidades: person.especialidades,
      activo: person.activo
    });
    setShowModal(true);
  };

  const handleDelete = (person: Personal) => {
    setPersonalToDelete(person);
    setShowConfirmDialog(true);
  };

  const confirmarEliminacion = async () => {
    if (!personalToDelete) return;

    try {
      const { error } = await supabase
        .from('personal')
        .delete()
        .eq('id', personalToDelete.id);

      if (error) throw error;

      setToastMessage('Personal eliminado exitosamente');
      setShowToast(true);
      await fetchPersonal();
    } catch (error) {
      console.error('Error deleting personal:', error);
    }
  };

  const toggleActivo = async (person: Personal) => {
    try {
      const { error } = await supabase
        .from('personal')
        .update({ activo: !person.activo })
        .eq('id', person.id);

      if (error) throw error;

      setToastMessage(
        person.activo 
          ? 'Personal desactivado exitosamente' 
          : 'Personal activado exitosamente'
      );
      setShowToast(true);
      await fetchPersonal();
    } catch (error) {
      console.error('Error toggling personal status:', error);
    }
  };

  const handleEspecialidadChange = (especialidad: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        especialidades: [...prev.especialidades, especialidad]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        especialidades: prev.especialidades.filter(e => e !== especialidad)
      }));
    }
  };

  const especialidadesDisponibles = [
    'Corte de cabello',
    'Coloración',
    'Peinado',
    'Manicure',
    'Pedicure',
    'Masajes',
    'Tratamientos faciales',
    'Depilación',
    'Maquillaje'
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Personal</h2>
          <p className="text-gray-600">Administra el equipo de trabajo</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Agregar Personal
        </Button>
      </div>

      {/* Personal list */}
      {personal.length === 0 ? (
        <Card className="text-center py-12">
          <User className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay personal registrado
          </h3>
          <p className="text-gray-600 mb-4">
            Comienza agregando miembros a tu equipo
          </p>
          <Button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
          >
            Agregar primer personal
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {personal.map((person) => (
            <Card key={person.id} hover>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <h3 className="font-semibold text-gray-900">{person.nombre}</h3>
                    <div className="flex items-center mt-1">
                      {person.activo ? (
                        <UserCheck className="w-4 h-4 text-green-500 mr-1" />
                      ) : (
                        <UserX className="w-4 h-4 text-red-500 mr-1" />
                      )}
                      <span className={`text-sm ${person.activo ? 'text-green-700' : 'text-red-700'}`}>
                        {person.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Especialidades:</h4>
                <div className="flex flex-wrap gap-1">
                  {person.especialidades.map((especialidad, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                    >
                      {especialidad}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleEdit(person)}
                  className="flex items-center flex-1"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant={person.activo ? 'warning' : 'success'}
                  onClick={() => toggleActivo(person)}
                  className="flex items-center"
                >
                  {person.activo ? (
                    <UserX className="w-4 h-4" />
                  ) : (
                    <UserCheck className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="error"
                  onClick={() => handleDelete(person)}
                  className="flex items-center"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal for add/edit */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingPersonal ? 'Editar Personal' : 'Agregar Personal'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre completo"
            value={formData.nombre}
            onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
            required
            placeholder="Nombre del personal"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Especialidades
            </label>
            <div className="grid grid-cols-2 gap-2">
              {especialidadesDisponibles.map((especialidad) => (
                <label key={especialidad} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.especialidades.includes(especialidad)}
                    onChange={(e) => handleEspecialidadChange(especialidad, e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">{especialidad}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.activo}
                onChange={(e) => setFormData(prev => ({ ...prev, activo: e.target.checked }))}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Activo</span>
            </label>
          </div>

          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1">
              {editingPersonal ? 'Actualizar' : 'Agregar'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm dialog */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={confirmarEliminacion}
        title="Eliminar Personal"
        message={`¿Estás seguro de que quieres eliminar a ${personalToDelete?.nombre}? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="error"
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