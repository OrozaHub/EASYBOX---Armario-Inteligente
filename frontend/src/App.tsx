import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Entregador from './pages/Entregador';
import AbrirPorta from './pages/AbrirPorta';
import ProviderDashboard from './pages/ProviderDashboard';
import AdminDashboard from './pages/AdminDashboard';

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { isAuthenticated, user } = useAuth();
  
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Redirect to their respective dashboards if they hit the wrong admin area
    return <Navigate to={user.role === 'PROVIDER' ? '/provider' : '/admin'} replace />;
  }
  return <>{children}</>;
};

function RoutesApp() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/abrir/:hash" element={<AbrirPorta />} />
      <Route path="/entrega" element={<Entregador />} />

      {/* Protected Routes */}
      <Route path="/admin/*" element={
        <ProtectedRoute allowedRoles={['ADMIN', 'PROVIDER']}>
          <AdminDashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/provider/*" element={
        <ProtectedRoute allowedRoles={['PROVIDER']}>
          <ProviderDashboard />
        </ProtectedRoute>
      } />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <RoutesApp />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
