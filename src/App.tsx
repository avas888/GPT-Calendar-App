import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/organisms/Layout';
import { ReservarCita } from './components/features/cliente/ReservarCita';
import { MisCitas } from './components/features/cliente/MisCitas';
import { AgendaPersonal } from './components/features/colaborador/AgendaPersonal';
import { PanelAdministrativo } from './components/features/admin/PanelAdministrativo';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          {/* Default route - redirect to admin panel for MVP */}
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