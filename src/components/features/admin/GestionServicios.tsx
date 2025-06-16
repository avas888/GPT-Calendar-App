import React, { useState, useEffect } from 'react';
import { supabase, Servicio } from '../../../lib/supabaseClient';
import { Button } from '../../atoms/Button';
import { Card } from '../../atoms/Card';
import { Input } from '../../atoms/Input';
import { Modal } from '../../atoms/Modal';
import { ToastSuccess } from '../../atoms/ToastSuccess';
import { ConfirmDialog } from '../../atoms/ConfirmDialog';
import { DollarSign, Plus, Edit, Trash2, Clock, Eye, EyeOff } from 'lucide-react';

export const GestionServicios: React.FC = () => {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [editingServicio, setEditingServicio] = useState<Servicio | null>(null);
  const [servicioToDelete, setServicioToDelete] = useState<Servicio | null>(null);
  
  const [formData, setFormData] = useState({
    nombre: '',
    duracion_min: 30,
    precio: 0,
    activo: true
  });

  useEffect(() => {
    fetchServicios();
  }, []);

  const fetchServicios = async () => {
    try {
      const { data, error } = await supabase
        .from('servicios')
        .select('*')
        .order('nombre');

      if (error) throw error;
      setServicios(data || []);
    } catch (error) {
      console.error('Error fetching servicios:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      duracion_min: 30,
      precio: 0,
      activo: true
    });
    setEditingServicio(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingServicio) {
        const { error } = await supabase
          .from('servicios')
          .update({
            nombre: formData.nombre,
            duracion_min: formData.duracion_min,
            precio: formData.precio,
            activo: formData.activo
          })
          .eq('id', editingServicio.id);

        if (error) throw error;
        setToastMessage('Servicio actualizado exitosamente');
      } else {
        const { error } = await supabase
          .from('servicios')
          .insert([{
            nombre: formData.nombre,
            duracion_min: formData.duracion_min,
            precio: formData.precio,
            activo: formData.activo
          }]);

        if (error) throw error;
        setToastMessage('Servicio agregado exitosamente');
      }

      setShowToast(true);
      setShowModal(false);
      resetForm();
      await fetchServicios();
    } catch (error) {
      console.error('Error saving servicio:', error);
    }
  };

  const handleEdit = (servicio: Servicio) => {
    setEditingServicio(servicio);
    setFormData({
      nombre: servicio.nombre,
      duracion_min: servicio.duracion_min,
      precio: servicio.precio,
      activo: servicio.activo
    });
    setShowModal(true);
  };

  const handleDelete = (servicio: Servicio) => {
    setServicioToDelete(servicio);
    setShowConfirmDialog(true);
  };

  const confirmarEliminacion = async () => {
    if (!servicioToDelete) return;

    try {
      const { error } = await supabase
        .from('servicios')
        .delete()
        .eq('id', servicioToDelete.id);

      if (error) throw error;

      setToastMessage('Servicio eliminado exitosamente');
      setShowToast(true);
      await fetchServicios();
    } catch (error) {
      console.error('Error deleting servicio:', error);
    }
  };

  const toggleActivo = async (servicio: Servicio) => {
    try {
      const { error } = await supabase
        .from('servicios')
        .update({ activo: !servicio.activo })
        .eq('id', servicio.id);

      if (error) throw error;

      setToastMessage(
        servicio.activo 
          ? 'Servicio desactivado exitosamente' 
          : 'Servicio activado exitosamente'
      );
      setShowToast(true);
      await fetchServicios();
    } catch (error) {
      console.error('Error toggling servicio status:', error);
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
    <div>
      <div className="flex justify-between items-center mb-6">
        <Button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center ml-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Agregar Servicio
        </Button>
      </div>

      {/* Services list */}
      {servicios.length === 0 ? (
        <Card className="text-center py-12">
          <DollarSign className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay servicios registrados
          </h3>
          <p className="text-gray-600 mb-4">
            Comienza agregando los servicios que ofreces
          </p>
          <Button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
          >
            Agregar primer servicio
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {servicios.map((servicio) => (
            <Card key={servicio.id} hover>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <DollarSign className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <h3 className="font-semibold text-gray-900">{servicio.nombre}</h3>
                    <div className="flex items-center mt-1">
                      {servicio.activo ? (
                        <Eye className="w-4 h-4 text-green-500 mr-1" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-red-500 mr-1" />
                      )}
                      <span className={`text-sm ${servicio.activo ? 'text-green-700' : 'text-red-700'}`}>
                        {servicio.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="w-4 h-4 mr-2" />
                  <span>{servicio.duracion_min} minutos</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <DollarSign className="w-4 h-4 mr-2" />
                  <span>${servicio.precio.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleEdit(servicio)}
                  className="flex items-center flex-1"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant={servicio.activo ? 'warning' : 'success'}
                  onClick={() => toggleActivo(servicio)}
                  className="flex items-center"
                >
                  {servicio.activo ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
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
        title={editingServicio ? 'Editar Servicio' : 'Agregar Servicio'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre del servicio"
            value={formData.nombre}
            onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
            required
            placeholder="Ej: Corte de cabello"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Duración (minutos)"
              type="number"
              min="15"
              max="480"
              step="15"
              value={formData.duracion_min}
              onChange={(e) => setFormData(prev => ({ ...prev, duracion_min: parseInt(e.target.value) }))}
              required
            />
            <Input
              label="Precio"
              type="number"
              min="0"
              step="1000"
              value={formData.precio}
              onChange={(e) => setFormData(prev => ({ ...prev, precio: parseFloat(e.target.value) }))}
              required
            />
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.activo}
                onChange={(e) => setFormData(prev => ({ ...prev, activo: e.target.checked }))}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Servicio activo</span>
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
              {editingServicio ? 'Actualizar' : 'Agregar'}
            </Button>
            {editingServicio && (
              <Button
                type="button"
                variant="error"
                onClick={() => handleDelete(editingServicio)}
                className="flex items-center"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Eliminar
              </Button>
            )}
          </div>
        </form>
      </Modal>

      {/* Confirm dialog */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={confirmarEliminacion}
        title="Eliminar Servicio"
        message={`¿Estás seguro de que quieres eliminar el servicio "${servicioToDelete?.nombre}"? Esta acción no se puede deshacer.`}
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