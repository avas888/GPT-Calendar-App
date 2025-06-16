import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/organisms/Layout';
import { LoginForm } from './components/organisms/LoginForm';
import { ReservarCita } from './components/features/cliente/ReservarCita';
import { MisCitas } from './components/features/cliente/MisCitas';
import { AgendaPersonal } from './components/features/colaborador/AgendaPersonal';
import { PanelAdministrativo } from './components/features/admin/PanelAdministrativo';
import { useAuth } from './hooks/useAuth';

function App() {
  const { user, userRole, loading } = useAuth();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
        <Routes>
          {/* Default route based on user role */}
          <Route 
            path="/" 
            element={
              userRole === 'admin' ? (
                <Navigate to="/admin/agenda" replace />
              ) : userRole === 'colaborador' ? (
                <Navigate to="/agenda" replace />
              ) : (
                <Navigate to="/mis-citas" replace />
              )
            } 
          />
          
          {/* Cliente routes */}
          <Route path="/mis-citas" element={<MisCitas />} />
          <Route path="/reservar" element={<ReservarCita />} />
          
          {/* Colaborador routes */}
          <Route path="/agenda" element={<AgendaPersonal />} />
          
          {/* Admin routes - only accessible to admin users */}
          {userRole === 'admin' && (
            <Route path="/admin/*" element={<PanelAdministrativo />} />
          )}
          
          {/* Fallback route */}
          <Route 
            path="*" 
            element={
              userRole === 'admin' ? (
                <Navigate to="/admin/agenda" replace />
              ) : userRole === 'colaborador' ? (
                <Navigate to="/agenda" replace />
              ) : (
                <Navigate to="/mis-citas" replace />
              )
            } 
          />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;