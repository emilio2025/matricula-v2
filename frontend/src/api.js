// Cliente de la API REST (V2). En desarrollo, Vite redirige /api al backend (vite.config.mjs).
// En producción se define VITE_API_URL (por ejemplo https://api.midominio.com/api).
const BASE = import.meta.env.VITE_API_URL || '/api';
const CLAVE_SESION = 'matricula.token';

let token = null;
try { token = sessionStorage.getItem(CLAVE_SESION); } catch { /* almacenamiento bloqueado */ }

export function guardarToken(nuevo) {
  token = nuevo;
  try { nuevo ? sessionStorage.setItem(CLAVE_SESION, nuevo) : sessionStorage.removeItem(CLAVE_SESION); } catch { /* sin almacenamiento */ }
}
export const hayToken = () => !!token;

export class ErrorApi extends Error {
  constructor(mensaje, status, datos) {
    super(mensaje);
    this.status = status;
    this.datos = datos;
  }
}

export async function api(ruta, { method = 'GET', body } = {}) {
  let r;
  try {
    r = await fetch(`${BASE}${ruta}`, {
      method,
      headers: {
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ErrorApi('No hay conexión con el servidor. Verifica que el backend esté encendido (npm run dev en /backend).', 0);
  }
  const datos = r.status === 204 ? null : await r.json().catch(() => null);
  if (!r.ok) {
    if (r.status === 401 && token) guardarToken(null);
    throw new ErrorApi(datos?.error || `Error ${r.status} del servidor.`, r.status, datos);
  }
  return datos;
}
