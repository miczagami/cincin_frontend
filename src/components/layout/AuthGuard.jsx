import { Navigate, useLocation } from 'react-router-dom';
import { Spinner } from '../ui';
import useAuthStore from '../../context/authStore';
import { rememberReturnPath } from '../../services/returnPath';

export function RequireAuth({ children }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();
  if (isLoading) return <div className="min-h-dvh bg-cin-espresso flex items-center justify-center"><Spinner size={32} /></div>;
  if (!isAuthenticated) {
    // Signing in (or up) comes back here, e.g. to the join a link opened
    rememberReturnPath(location);
    return <Navigate to="/auth" replace />;
  }
  return children;
}

export function RedirectIfAuth({ children }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return <div className="min-h-dvh bg-cin-espresso flex items-center justify-center"><Spinner size={32} /></div>;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return children;
}
