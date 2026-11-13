import { createContext, useContext, useEffect, useState } from 'react';
import { api, guardarToken, hayToken } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [verificando, setVerificando] = useState(hayToken());

  // Si hay una sesión guardada (F5), se recupera el usuario desde la API
  useEffect(() => {
    if (!hayToken()) return;
    api('/auth/yo')
      .then((d) => setUsuario(d.usuario))
      .catch(() => guardarToken(null))
      .finally(() => setVerificando(false));
  }, []);

  const iniciar = (d) => {
    guardarToken(d.token);
    setUsuario(d.usuario);
    return { ok: true, usuario: d.usuario };
  };

  // V2: POST /api/auth/login (contraseña verificada con bcrypt y sesión con JWT)
  const login = async (email, password) => {
    try { return iniciar(await api('/auth/login', { method: 'POST', body: { email: email.trim(), password } })); }
    catch (e) { return { ok: false, error: e.message }; }
  };

  const registrar = async ({ nombre, dni, email, password }) => {
    try { return iniciar(await api('/auth/registro', { method: 'POST', body: { nombre, dni, email: email.trim(), password } })); }
    catch (e) { return { ok: false, error: e.message }; }
  };

  const logout = () => {
    guardarToken(null);
    setUsuario(null);
  };

  const actualizarPerfil = async (cambios) => {
    const d = await api('/auth/perfil', { method: 'PUT', body: cambios });
    setUsuario(d.usuario);
    return d.usuario;
  };

  const cambiarPassword = (actual, nueva) => api('/auth/password', { method: 'PUT', body: { actual, nueva } });

  return (
    <AuthContext.Provider value={{ usuario, verificando, login, logout, registrar, actualizarPerfil, cambiarPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

export const rutaInicioPorRol = (rol) =>
  ({ apoderado: '/portal', secretaria: '/secretaria', director: '/director' })[rol] || '/';
