import React from 'react';
import { Button } from '../atoms/Button';
import { LogOut, Calendar, Users, Settings, User, DollarSign, BarChart3 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Mock user data for MVP
  const mockUser = {
    nombre: 'Administrador'
  };
  
  const getNavigationItems = () => {
    // For MVP, show all navigation items
    return [
      { icon: Calendar, label: 'Agenda Admin', href: '/admin/agenda' },
      { icon: Users, label: 'Personal', href: '/admin/personal' },
      { icon: DollarSign, label: 'Servicios', href: '/admin/servicios' },
      { icon: Settings, label: 'Configuración', href: '/admin/configuracion' },
      { icon: BarChart3, label: 'Reportes', href: '/admin/reportes' },
      { icon: Calendar, label: 'Mis Citas', href: '/mis-citas' },
      { icon: Calendar, label: 'Reservar', href: '/reservar' },
      { icon: User, label: 'Mi Agenda', href: '/agenda' }
    ];
  };
  
  const handleSignOut = () => {
    console.log('Sign out clicked - reloading page for MVP');
    window.location.reload();
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
              <span className="ml-3 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                MVP Mode
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 hidden sm:block">
                Hola, {mockUser.nombre}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="flex items-center"
              >
                <LogOut className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Salir</span>
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Navigation */}
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
        
        {/* Main Content */}
        <main>{children}</main>
      </div>
    </div>
  );
};