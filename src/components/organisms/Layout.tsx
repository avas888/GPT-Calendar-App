import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../atoms/Button';
import { LogOut, Calendar, Users, Settings, User, DollarSign, BarChart3 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, userRole, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const getNavigationItems = () => {
    if (!userRole) return [];
    
    const items = [];
    
    if (userRole === 'cliente') {
      items.push({ icon: Calendar, label: 'Mis Citas', href: '/mis-citas' });
      items.push({ icon: Calendar, label: 'Reservar', href: '/reservar' });
    }
    
    if (userRole === 'colaborador') {
      items.push({ icon: Calendar, label: 'Mi Agenda', href: '/agenda' });
      items.push({ icon: User, label: 'Perfil', href: '/perfil' });
    }
    
    if (userRole === 'admin') {
      items.push({ icon: Calendar, label: 'Agenda', href: '/admin/agenda' });
      items.push({ icon: Users, label: 'Personal', href: '/admin/personal' });
      items.push({ icon: DollarSign, label: 'Servicios', href: '/admin/servicios' });
      items.push({ icon: Settings, label: 'Configuración', href: '/admin/configuracion' });
      items.push({ icon: BarChart3, label: 'Reportes', href: '/admin/reportes' });
    }
    
    return items;
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Calendar className="w-8 h-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">
                AgendaPro
              </h1>
            </div>
            
            {user && (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600 hidden sm:block">
                  Hola, {user.nombre}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={signOut}
                  className="flex items-center"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Salir</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Navigation */}
        {user && userRole && (
          <nav className="mb-6 sm:mb-8">
            <div className="flex space-x-1 bg-white rounded-lg p-1 shadow-sm border border-gray-200 overflow-x-auto">
              {getNavigationItems().map((item) => (
                <button
                  key={item.href}
                  onClick={() => navigate(item.href)}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                    location.pathname === item.href || 
                    (item.href.startsWith('/admin') && location.pathname.startsWith(item.href))
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  <item.icon className="w-4 h-4 mr-2" />
                  {item.label}
                </button>
              ))}
            </div>
          </nav>
        )}
        
        {/* Main Content */}
        <main>{children}</main>
      </div>
    </div>
  );
};