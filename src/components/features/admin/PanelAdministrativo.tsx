import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card } from '../../atoms/Card';
import { Calendar, Users, Settings, BarChart3, DollarSign } from 'lucide-react';
import { AgendaAdmin } from './AgendaAdmin';
import { GestionPersonal } from './GestionPersonal';
import { GestionServicios } from './GestionServicios';
import { ConfiguracionAdmin } from './ConfiguracionAdmin';

type TabActivo = 'agenda' | 'personal' | 'servicios' | 'configuracion' | 'reportes';

export const PanelAdministrativo: React.FC = () => {
  const location = useLocation();
  
  // Extract tab from URL path
  const getTabFromPath = (pathname: string): TabActivo => {
    const segments = pathname.split('/');
    const lastSegment = segments[segments.length - 1];
    
    if (['agenda', 'personal', 'servicios', 'configuracion', 'reportes'].includes(lastSegment)) {
      return lastSegment as TabActivo;
    }
    
    return 'agenda'; // default
  };
  
  const [tabActivo, setTabActivo] = useState<TabActivo>(getTabFromPath(location.pathname));

  // Update tab when URL changes
  useEffect(() => {
    const newTab = getTabFromPath(location.pathname);
    setTabActivo(newTab);
  }, [location.pathname]);

  const tabs = [
    { id: 'agenda' as TabActivo, label: 'Agenda Administrativa', icon: Calendar },
    { id: 'personal' as TabActivo, label: 'Gestión de Personal', icon: Users },
    { id: 'servicios' as TabActivo, label: 'Gestión de Servicios', icon: DollarSign },
    { id: 'configuracion' as TabActivo, label: 'Configuración', icon: Settings },
    { id: 'reportes' as TabActivo, label: 'Reportes', icon: BarChart3 }
  ];


  const getCurrentTabLabel = () => {
    const currentTab = tabs.find(tab => tab.id === tabActivo);
    return currentTab ? currentTab.label : 'Panel Administrativo';
  };

  const renderContent = () => {
    switch (tabActivo) {
      case 'agenda':
        return <AgendaAdmin />;
      case 'personal':
        return <GestionPersonal />;
      case 'servicios':
        return <GestionServicios />;
      case 'configuracion':
        return <ConfiguracionAdmin />;
      case 'reportes':
        return (
          <Card className="text-center py-12">
            <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Reportes
            </h3>
            <p className="text-gray-600">
              Sección de reportes en desarrollo
            </p>
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full">
      {/* Dynamic Section Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {getCurrentTabLabel()}
        </h1>
      </div>

      {/* Content */}
      {renderContent()}
    </div>
  );
};