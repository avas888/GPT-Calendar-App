import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { Layout } from './components/organisms/Layout';
import { LoginForm } from './components/organisms/LoginForm';
import { ReservarCita } from './components/features/cliente/ReservarCita';
import { MisCitas } from './components/features/cliente/MisCitas';
import { AgendaPersonal } from './components/features/colaborador/AgendaPersonal';
import { PanelAdministrativo } from './components/features/admin/PanelAdministrativo';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  return (
    <Router>
      <Layout>
        <Routes>
          {/* Default route - redirect to admin panel */}
          <Route path="/" element={<Navigate to="/admin/agenda" replace />} />
          
          {/* Cliente routes */}
          <Route path="/mis-citas" element={<MisCitas />} />
          <Route path="/reservar" element={<ReservarCita />} />
          
          {/* Colaborador routes */}
          <Route path="/agenda" element={<AgendaPersonal />} />
          
          {/* Admin routes */}
          <Route path="/admin/*" element={<PanelAdministrativo />} />
          
          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/admin/agenda" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;