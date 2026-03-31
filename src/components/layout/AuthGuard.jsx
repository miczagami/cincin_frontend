import { Navigate, useLocation } from 'react-router-dom';
import { Spinner } from '../ui';
import useAuthStore from '../../context/authStore';

export function RequireAuth({ children }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();
  if (isLoading) return <div className="min-h-dvh bg-cin-black flex items-center justify-center"><Spinner size={32} /></div>;
  if (!isAuthenticated) return <Navigate to="/auth" state={{ from: location }} replace />;
  return children;
}

export function RedirectIfAuth({ children }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return <div className="min-h-dvh bg-cin-black flex items-center justify-center"><Spinner size={32} /></div>;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return children;
}
