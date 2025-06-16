import React, { useState, useEffect } from 'react';
import { useConfig } from '../../../hooks/useConfig';
import { Button } from '../../atoms/Button';
import { Card } from '../../atoms/Card';
import { Input } from '../../atoms/Input';
import { ToastSuccess } from '../../atoms/ToastSuccess';
import { Settings, Clock, DollarSign, Calendar, Mail } from 'lucide-react';

export const ConfiguracionAdmin: React.FC = () => {
  const { config, updateConfig, loading } = useConfig();
  const [showToast, setShowToast] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    negocio_nombre: '',
    negocio_telefono: '',
    negocio_email: '',
    negocio_direccion: '',
    horario_apertura: '08:00',
    horario_cierre: '18:00',
    dias_laborales: '1,2,3,4,5,6', // 1=lunes, 7=domingo
    tiempo_minimo_reserva: '60', // minutos de anticipación
    cancelacion_limite: '24', // horas límite para cancelar
    comision_plataforma: '0',
    moneda: 'COP'
  });

  useEffect(() => {
    if (!loading && config) {
      setFormData({
        negocio_nombre: config.negocio_nombre || '',
        negocio_telefono: config.negocio_telefono || '',
        negocio_email: config.negocio_email || '',
        negocio_direccion: config.negocio_direccion || '',
        horario_apertura: config.horario_apertura || '08:00',
        horario_cierre: config.horario_cierre || '18:00',
        dias_laborales: config.dias_laborales || '1,2,3,4,5,6',
        tiempo_minimo_reserva: config.tiempo_minimo_reserva || '60',
        cancelacion_limite: config.cancelacion_limite || '24',
        comision_plataforma: config.comision_plataforma || '0',
        moneda: config.moneda || 'COP'
      });
    }
  }, [config, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      // Update all configuration values
      const updates = Object.entries(formData).map(([key, value]) =>
        updateConfig(key, value.toString())
      );
      
      await Promise.all(updates);
      
      setShowToast(true);
    } catch (error) {
      console.error('Error updating configuration:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const diasSemana = [
    { value: '1', label: 'Lunes' },
    { value: '2', label: 'Martes' },
    { value: '3', label: 'Miércoles' },
    { value: '4', label: 'Jueves' },
    { value: '5', label: 'Viernes' },
    { value: '6', label: 'Sábado' },
    { value: '7', label: 'Domingo' }
  ];

  const handleDiaLaboralChange = (dia: string, checked: boolean) => {
    const diasActuales = formData.dias_laborales.split(',').filter(d => d);
    
    if (checked) {
      diasActuales.push(dia);
    } else {
      const index = diasActuales.indexOf(dia);
      if (index > -1) {
        diasActuales.splice(index, 1);
      }
    }
    
    handleInputChange('dias_laborales', diasActuales.join(','));
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
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información del negocio */}
        <Card>
          <div className="flex items-center mb-4">
            <Settings className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Información del Negocio</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nombre del negocio"
              value={formData.negocio_nombre}
              onChange={(e) => handleInputChange('negocio_nombre', e.target.value)}
              placeholder="Nombre de tu negocio"
            />
            <Input
              label="Teléfono"
              type="tel"
              value={formData.negocio_telefono}
              onChange={(e) => handleInputChange('negocio_telefono', e.target.value)}
              placeholder="+57 300 123 4567"
            />
            <Input
              label="Email"
              type="email"
              value={formData.negocio_email}
              onChange={(e) => handleInputChange('negocio_email', e.target.value)}
              placeholder="contacto@negocio.com"
            />
            <Input
              label="Dirección"
              value={formData.negocio_direccion}
              onChange={(e) => handleInputChange('negocio_direccion', e.target.value)}
              placeholder="Calle 123 #45-67"
            />
          </div>
        </Card>

        {/* Horarios de operación */}
        <Card>
          <div className="flex items-center mb-4">
            <Clock className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Horarios de Operación</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Input
              label="Hora de apertura"
              type="time"
              value={formData.horario_apertura}
              onChange={(e) => handleInputChange('horario_apertura', e.target.value)}
            />
            <Input
              label="Hora de cierre"
              type="time"
              value={formData.horario_cierre}
              onChange={(e) => handleInputChange('horario_cierre', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Días laborales
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {diasSemana.map((dia) => (
                <label key={dia.value} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.dias_laborales.includes(dia.value)}
                    onChange={(e) => handleDiaLaboralChange(dia.value, e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">{dia.label}</span>
                </label>
              ))}
            </div>
          </div>
        </Card>

        {/* Políticas de reserva */}
        <Card>
          <div className="flex items-center mb-4">
            <Calendar className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Políticas de Reserva</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Tiempo mínimo de reserva (minutos)"
              type="number"
              value={formData.tiempo_minimo_reserva}
              onChange={(e) => handleInputChange('tiempo_minimo_reserva', e.target.value)}
              helper="Tiempo mínimo de anticipación para reservar"
            />
            <Input
              label="Límite de cancelación (horas)"
              type="number"
              value={formData.cancelacion_limite}
              onChange={(e) => handleInputChange('cancelacion_limite', e.target.value)}
              helper="Horas límite antes de la cita para cancelar"
            />
          </div>
        </Card>

        {/* Configuración financiera */}
        <Card>
          <div className="flex items-center mb-4">
            <DollarSign className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Configuración Financiera</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Moneda
              </label>
              <select
                value={formData.moneda}
                onChange={(e) => handleInputChange('moneda', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="COP">Peso Colombiano (COP)</option>
                <option value="USD">Dólar Americano (USD)</option>
                <option value="EUR">Euro (EUR)</option>
              </select>
            </div>
            <Input
              label="Comisión plataforma (%)"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={formData.comision_plataforma}
              onChange={(e) => handleInputChange('comision_plataforma', e.target.value)}
              helper="Porcentaje de comisión por transacción"
            />
          </div>
        </Card>

        {/* Submit button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            loading={saving}
            disabled={saving}
            size="lg"
          >
            Guardar Configuración
          </Button>
        </div>
      </form>

      {/* Success toast */}
      <ToastSuccess
        message="Configuración guardada exitosamente"
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />
    </div>
  );
};