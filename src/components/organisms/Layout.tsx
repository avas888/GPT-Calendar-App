import React from 'react';
import { Button } from '../atoms/Button';
import { LogOut, Calendar, Users, Settings, User, DollarSign, BarChart3 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface LayoutProps {
  children: React.ReactNode;
}

interface NavigationItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  roles: string[];
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userRole, signOut } = useAuth();
  
  const getNavigationItems = (): NavigationItem[] => {
    return [
      { icon: Calendar, label: 'Agenda Admin', href: '/admin/agenda', roles: ['admin'] },
      { icon: Users, label: 'Personal', href: '/admin/personal', roles: ['admin'] },
      { icon: DollarSign, label: 'Servicios', href: '/admin/servicios', roles: ['admin'] },
      { icon: Settings, label: 'Configuración', href: '/admin/configuracion', roles: ['admin'] },
      { icon: BarChart3, label: 'Reportes', href: '/admin/reportes', roles: ['admin'] },
      { icon: User, label: 'Mi Agenda', href: '/agenda', roles: ['colaborador'] },
      { icon: Calendar, label: 'Mis Citas', href: '/mis-citas', roles: ['cliente', 'admin', 'colaborador'] },
      { icon: Calendar, label: 'Reservar', href: '/reservar', roles: ['cliente', 'admin', 'colaborador'] }
    ];
  };
  
  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const isActiveRoute = (href: string): boolean => {
    return location.pathname === href || 
           (href.startsWith('/admin') && location.pathname.startsWith(href));
  };
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left side: Logo + App name */}
            <div className="flex items-center">
              <Calendar className="w-8 h-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">
                AgendaPro
              </h1>
              {userRole && (
                <span className="ml-3 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full capitalize">
                  {userRole}
                </span>
              )}
            </div>
            
            {/* Mobile Navigation - only visible on small screens */}
            <div className="lg:hidden flex-1 mx-8">
              <div className="flex space-x-1 overflow-x-auto">
                {getNavigationItems().map((item) => (
                  <button
                    key={item.href}
                    onClick={() => navigate(item.href)}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                      isActiveRoute(item.href)
                        ? 'text-blue-600 bg-blue-50'
                        : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    <item.icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Right side: User info + Sign out */}
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 hidden sm:block">
                Hola, {user?.nombre || 'Usuario'}
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
      
      {/* Main Container with Sidebar and Content */}
      <div className="flex flex-1 max-w-7xl mx-auto w-full">
        {/* Vertical Sidebar - hidden on mobile */}
        <nav className="hidden lg:flex lg:flex-col w-64 bg-white shadow-sm border-r border-gray-200">
          <div className="flex-1 px-4 py-6 space-y-1">
            {getNavigationItems().map((item) => (
              <button
                key={item.href}
                onClick={() => navigate(item.href)}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isActiveRoute(item.href)
                    ? 'text-blue-600 bg-blue-50 border-r-2 border-blue-600'
                    : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.label}
              </button>
            ))}
          </div>
        </nav>
        
        {/* Main Content Area */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-40">
          {children}
        </main>
      </div>
    </div>
  );
};