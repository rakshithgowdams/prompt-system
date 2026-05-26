import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AppShell } from './AppShell';

export function ProtectedRoute() {
  const { session, loading, emailConfirmed } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-ink-500 text-sm">Loading aiwithrakshith.tech...</p>
        </div>
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  // Signed in but email not yet confirmed — hold at verify page
  if (!emailConfirmed) {
    const email = session.user.email ?? '';
    return <Navigate to={`/verify-email${email ? `?email=${encodeURIComponent(email)}` : ''}`} replace />;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
