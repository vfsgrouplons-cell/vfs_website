import { useQuery } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { api } from '../services/api.js';

export function ProtectedRoute({ allowedRoles, children }) {
  const session = useQuery({ queryKey: ['session'], queryFn: async () => (await api.get('/auth/me')).data.data.user, retry: false, staleTime: 30_000 });
  if (session.isLoading) return <div className="shell route-loading" role="status">Checking secure session…</div>;
  if (session.isError) return <Navigate to="/sign-in" replace />;
  const roles = session.data.roles?.map((role) => role.slug) || [];
  if (!allowedRoles.some((role) => roles.includes(role))) return <Navigate to="/sign-in" replace />;
  return children;
}
