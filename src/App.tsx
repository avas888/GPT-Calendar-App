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
  const { user, loading, debugSteps } = useAuth();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-2xl w-full p-6">
          <div className="text-center mb-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg">Verificando autenticación...</p>
            <div className="mt-4 text-xs text-gray-500">
              <p>Estado de carga: {loading ? 'Cargando...' : 'Completado'}</p>
              <p>Usuario: {user ? user.nombre : 'No autenticado'}</p>
            </div>
          </div>
          
          {/* Debug Steps Display */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Debug Steps (Últimos 10):</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {debugSteps.slice(-10).map((step, index) => (
                <div key={index} className="text-xs">
                  <div className="flex items-start justify-between">
                    <span className={`font-medium ${step.error ? 'text-red-600' : 'text-green-600'}`}>
                      {step.step}
                    </span>
                    <span className="text-gray-400 ml-2">
                      {new Date(step.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  {step.data && (
                    <div className="text-gray-600 ml-2">
                      Data: {JSON.stringify(step.data, null, 2)}
                    </div>
                  )}
                  {step.error && (
                    <div className="text-red-600 ml-2">
                      Error: {step.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Environment Info */}
          <div className="mt-4 bg-blue-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Environment Info:</h4>
            <div className="text-xs text-blue-700 space-y-1">
              <div>Supabase URL: {import.meta.env.VITE_SUPABASE_URL ? '✅ Set' : '❌ Missing'}</div>
              <div>Supabase Anon Key: {import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}</div>
              <div>Mode: {import.meta.env.MODE}</div>
              <div>Dev: {import.meta.env.DEV ? 'Yes' : 'No'}</div>
            </div>
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