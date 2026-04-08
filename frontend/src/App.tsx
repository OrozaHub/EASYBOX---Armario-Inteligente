import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Entregador from './pages/Entregador';
import AbrirPorta from './pages/AbrirPorta';
import ProviderDashboard from './pages/ProviderDashboard';
import AdminDashboard from './pages/AdminDashboard';
import HardwareSimulatorUI from './pages/HardwareSimulatorUI';

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { isAuthenticated, user } = useAuth();
  
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'PROVIDER' ? '/provedor' : '/admin'} replace />;
  }
  return <>{children}</>;
};

function RoutesApp() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/cliente-final/:hash" element={<AbrirPorta />} />
      <Route path="/entregas" element={<Entregador />} />

      <Route path="/admin/*" element={
        <ProtectedRoute allowedRoles={['ADMIN', 'PROVIDER']}>
          <AdminDashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/provedor/*" element={
        <ProtectedRoute allowedRoles={['PROVIDER']}>
          <ProviderDashboard />
        </ProtectedRoute>
      } />
      <Route path="/hardware" element={<HardwareSimulatorUI />} />
      <Route path="/provider/*" element={<Navigate to="/provedor" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <RoutesApp />
      </HashRouter>
    </AuthProvider>
  );
}

export default App;

