import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, rutaInicioPorRol } from '../context/AuthContext';
import Loader from './Loader';

export default function ProtectedRoute({ roles, children }) {
  const { usuario, verificando } = useAuth();
  const location = useLocation();
  if (verificando) return <div className="container"><Loader filas={3} /></div>; // recuperando la sesión tras F5
  if (!usuario) return <Navigate to="/login" replace state={{ desde: location.pathname }} />;
  if (roles && !roles.includes(usuario.rol)) return <Navigate to={rutaInicioPorRol(usuario.rol)} replace />;
  return children;
}
