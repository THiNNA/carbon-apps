import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/auth-context.js';
import { LoadingSpinner } from './loading-spinner.js';

interface ProtectedRouteProps {
  requiredPermission?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredPermission }) => {
  const { isAuthenticated, payload, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated || !payload) {
    return <Navigate to="/login" replace />;
  }

  if (requiredPermission) {
    const hasPermission =
      payload.permissions.includes(requiredPermission) || payload.roles.includes('SuperAdmin');
    if (!hasPermission) {
      return <Navigate to="/" replace />;
    }
  }

  return <Outlet />;
};
