import { Navigate, Outlet, useLocation } from 'react-router';
import { useSession } from '../../api/auth';
import { Spinner } from '../../components/Spinner';

const HOME_PATH = '/';
const LOGIN_PATH = '/login';

/** Rutas que exigen sesión: sin ella redirige al login recordando a dónde se quería ir. */
export function ProtectedRoute() {
  const { data: user, isPending } = useSession();
  const location = useLocation();

  if (isPending) return <Spinner label="Recuperando tu sesión…" />;
  if (!user) return <Navigate to={LOGIN_PATH} replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

/** Rutas solo para visitantes (login y registro): con sesión activa redirige a la app. */
export function GuestRoute() {
  const { data: user, isPending } = useSession();
  const location = useLocation();

  if (isPending) return <Spinner label="Recuperando tu sesión…" />;
  if (user) {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from ?? HOME_PATH} replace />;
  }
  return <Outlet />;
}
