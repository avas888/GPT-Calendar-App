import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card } from '../../atoms/Card';
import { Calendar, Users, Settings, BarChart3, DollarSign } from 'lucide-react';
import { AgendaAdmin } from './AgendaAdmin';
import { GestionPersonal } from './GestionPersonal';
import { GestionServicios } from './GestionServicios';
import { ConfiguracionAdmin } from './ConfiguracionAdmin';

type TabActivo = 'agenda' | 'personal' | 'servicios' | 'configuracion' | 'reportes';

export const PanelAdministrativo: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
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
    { id: 'agenda' as TabActivo, label: 'Agenda', icon: Calendar },
    { id: 'personal' as TabActivo, label: 'Personal', icon: Users },
    { id: 'servicios' as TabActivo, label: 'Servicios', icon: DollarSign },
    { id: 'configuracion' as TabActivo, label: 'Configuración', icon: Settings },
    { id: 'reportes' as TabActivo, label: 'Reportes', icon: BarChart3 }
  ];

  const handleTabClick = (tabId: TabActivo) => {
    navigate(`/admin/${tabId}`);
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
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Panel Administrativo</h1>
        <p className="text-gray-600">Gestiona tu negocio desde aquí</p>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                    tabActivo === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      {renderContent()}
    </div>
  );
};