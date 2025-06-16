import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/organisms/Layout';
import { AuthGuard } from './components/AuthGuard';
import { LoginForm } from './components/organisms/LoginForm';
import { ReservarCita } from './components/features/cliente/ReservarCita';
import { MisCitas } from './components/features/cliente/MisCitas';
import { AgendaPersonal } from './components/features/colaborador/AgendaPersonal';
import { PanelAdministrativo } from './components/features/admin/PanelAdministrativo';
import { useAuth } from './hooks/useAuth';

function App() {
  const { user, userRole, loading } = useAuth();

  // Show loading screen while authentication is being determined
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  const getDefaultRoute = () => {
    // If no user or no role, redirect to login
    if (!user || !userRole) return '/login';
    
    switch (userRole) {
      case 'cliente':
        return '/mis-citas';
      case 'colaborador':
        return '/agenda';
      case 'admin':
        return '/admin/agenda';
      default:
        return '/login';
    }
  };

  return (
    <Router>
      <Routes>
        {/* Login route - accessible to everyone */}
        <Route 
          path="/login" 
          element={
            user && userRole ? <Navigate to={getDefaultRoute()} replace /> : <LoginForm />
          } 
        />
        
        {/* Protected routes wrapped in Layout */}
        <Route 
          path="/*" 
          element={
            user && userRole ? (
              <Layout>
                <Routes>
                  {/* Default route */}
                  <Route 
                    path="/" 
                    element={<Navigate to={getDefaultRoute()} replace />} 
                  />
                  
                  {/* Cliente routes */}
                  <Route
                    path="/mis-citas"
                    element={
                      <AuthGuard requiredRole="cliente">
                        <MisCitas />
                      </AuthGuard>
                    }
                  />
                  <Route
                    path="/reservar"
                    element={
                      <AuthGuard requiredRole="cliente">
                        <ReservarCita />
                      </AuthGuard>
                    }
                  />
                  
                  {/* Colaborador routes */}
                  <Route
                    path="/agenda"
                    element={
                      <AuthGuard requiredRole="colaborador">
                        <AgendaPersonal />
                      </AuthGuard>
                    }
                  />
                  
                  {/* Admin routes */}
                  <Route
                    path="/admin/*"
                    element={
                      <AuthGuard requiredRole="admin">
                        <PanelAdministrativo />
                      </AuthGuard>
                    }
                  />
                  
                  {/* Fallback route */}
                  <Route
                    path="*"
                    element={<Navigate to={getDefaultRoute()} replace />}
                  />
                </Routes>
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;