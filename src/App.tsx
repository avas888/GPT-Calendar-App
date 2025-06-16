import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/organisms/Layout';
import { LoginForm } from './components/organisms/LoginForm';
import { ReservarCita } from './components/features/cliente/ReservarCita';
import { MisCitas } from './components/features/cliente/MisCitas';
import { AgendaPersonal } from './components/features/colaborador/AgendaPersonal';
import { PanelAdministrativo } from './components/features/admin/PanelAdministrativo';
import { DebugInfo } from './components/DebugInfo';
import { useAuth } from './hooks/useAuth';

function App() {
  const { user, loading } = useAuth();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando autenticación...</p>
          <div className="mt-4 text-xs text-gray-500">
            <p>Estado de carga: {loading ? 'Cargando...' : 'Completado'}</p>
            <p>Usuario: {user ? user.nombre : 'No autenticado'}</p>
          </div>
        </div>
      </div>
    );
  }

  // Show login form if user is not authenticated
  if (!user) {
    return <LoginForm />;
  }

  // User is authenticated, show the main app
  return (
    <Router>
      <Layout>
        <DebugInfo />
        <Routes>
          {/* Default route - all users go to admin agenda in dev mode */}
          <Route path="/" element={<Navigate to="/admin/agenda" replace />} />
          
          {/* Cliente routes */}
          <Route path="/mis-citas" element={<MisCitas />} />
          <Route path="/reservar" element={<ReservarCita />} />
          
          {/* Colaborador routes */}
          <Route path="/agenda" element={<AgendaPersonal />} />
          
          {/* Admin routes - accessible to all users in dev mode */}
          <Route path="/admin/*" element={<PanelAdministrativo />} />
          
          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/admin/agenda" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;