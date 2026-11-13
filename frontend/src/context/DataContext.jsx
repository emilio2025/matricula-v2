import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { institucion as institucionInicial, niveles } from '../data/catalogo';
import { api } from '../api';
import { useAuth } from './AuthContext';

const DataContext = createContext(null);
const costosIniciales = Object.fromEntries(niveles.map((n) => [n.id, { matricula: n.costoMatricula, pension: n.pension }]));

export function DataProvider({ children }) {
  const { usuario } = useAuth();
  const [solicitudes, setSolicitudes] = useState([]);
  const [secciones, setSecciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [institucion, setInstitucionState] = useState(institucionInicial);
  const [costos, setCostosState] = useState(costosIniciales);

  // Datos públicos: institución, costos y vacantes por sección
  const cargarPublico = useCallback(async () => {
    const [inst, cost, secs] = await Promise.all([api('/institucion'), api('/costos'), api('/secciones')]);
    setInstitucionState(inst);
    setCostosState(cost);
    setSecciones(secs);
  }, []);

  // Datos privados según el rol (la API filtra: el apoderado solo recibe las suyas)
  const cargarSolicitudes = useCallback(async () => {
    if (!usuario) { setSolicitudes([]); return; }
    setSolicitudes(await api('/solicitudes'));
  }, [usuario]);

  useEffect(() => {
    let vivo = true;
    setCargando(true);
    setErrorCarga('');
    let reintento;
    // Si el backend aún no estaba listo, se reintenta cada 3 s hasta que responda
    const cargar = () => Promise.all([cargarPublico(), cargarSolicitudes()])
      .then(() => vivo && setErrorCarga(''))
      .catch((e) => { if (vivo) { setErrorCarga(e.message); reintento = setTimeout(cargar, 3000); } })
      .finally(() => vivo && setCargando(false));
    cargar();
    return () => { vivo = false; clearTimeout(reintento); };
  }, [cargarPublico, cargarSolicitudes]);

  // Nivel con los costos vigentes (los define dirección en la API)
  const nivelCfg = (nivelId) => {
    const n = niveles.find((x) => x.id === nivelId);
    return n && { ...n, costoMatricula: costos[nivelId]?.matricula ?? n.costoMatricula, pension: costos[nivelId]?.pension ?? n.pension };
  };

  const reemplazar = (s) => setSolicitudes((prev) => (prev.some((x) => x.id === s.id) ? prev.map((x) => (x.id === s.id ? s : x)) : [s, ...prev]));

  const crearSolicitud = async (datos) => {
    const nueva = await api('/solicitudes', { method: 'POST', body: datos });
    reemplazar(nueva);
    return nueva;
  };

  const subsanarSolicitud = async (id, documentos) => reemplazar(await api(`/solicitudes/${id}/subsanar`, { method: 'POST', body: { documentos } }));

  const aprobarSolicitud = async (id, seccionId) => {
    const d = await api(`/solicitudes/${id}/aprobar`, { method: 'POST', body: { seccionId } });
    reemplazar(d.solicitud);
    setSecciones(await api('/secciones'));
    return d;
  };

  const observarSolicitud = async (id, texto, rechazar = false) => {
    const d = await api(`/solicitudes/${id}/${rechazar ? 'rechazar' : 'observar'}`, { method: 'POST', body: { texto } });
    reemplazar(d.solicitud);
    setSecciones(d.secciones);
  };

  const actualizarSeccion = async (id, cambios) => {
    const s = await api(`/secciones/${id}`, { method: 'PATCH', body: cambios });
    setSecciones((prev) => prev.map((x) => (x.id === id ? s : x)));
  };

  const guardarConfiguracion = async (inst, cost) => {
    const [i, c] = await Promise.all([
      api('/institucion', { method: 'PUT', body: inst }),
      api('/costos', { method: 'PUT', body: cost }),
    ]);
    setInstitucionState(i);
    setCostosState(c);
  };

  // Pago de la matrícula: el servidor calcula el monto y cobra con Culqi
  const pagarMatricula = async (id, token, email) => {
    try {
      const d = await api(`/pagos/solicitudes/${id}/cargo`, { method: 'POST', body: { token, email } });
      reemplazar(d.solicitud);
      return { ok: true, porConfirmar: !!d.mensaje, mensaje: d.mensaje, solicitud: d.solicitud };
    } catch (e) {
      if (e.datos?.solicitud) reemplazar(e.datos.solicitud);
      return { ok: false, error: e.message, codigo: e.datos?.codigo, intentosRestantes: e.datos?.intentosRestantes };
    }
  };

  // Mercado Pago: el servidor crea la preferencia y devuelve la URL del checkout
  const iniciarMercadoPago = async (id) => {
    const d = await api(`/pagos/solicitudes/${id}/mercadopago`, { method: 'POST' });
    if (d.solicitud) reemplazar(d.solicitud);
    return d;
  };

  // Al volver de Mercado Pago, el servidor consulta el pago real y actualiza la solicitud
  const confirmarMercadoPago = async (id, paymentId) => {
    try {
      const d = await api(`/pagos/solicitudes/${id}/mercadopago/confirmar`, { method: 'POST', body: { paymentId: paymentId || null } });
      reemplazar(d.solicitud);
      return { ok: true, resultado: d.resultado };
    } catch (e) {
      if (e.datos?.solicitud) reemplazar(e.datos.solicitud);
      return { ok: false, error: e.message, intentosRestantes: e.datos?.intentosRestantes };
    }
  };

  const recargarSolicitud = async (id) => reemplazar(await api(`/solicitudes/${id}`));

  const vacantesLibres = (seccion) => Math.max(0, seccion.capacidad - seccion.matriculados);

  return (
    <DataContext.Provider
      value={{
        solicitudes, secciones, cargando, errorCarga, institucion, costos, nivelCfg,
        crearSolicitud, subsanarSolicitud, aprobarSolicitud, observarSolicitud, actualizarSeccion,
        guardarConfiguracion, pagarMatricula, iniciarMercadoPago, confirmarMercadoPago, recargarSolicitud, vacantesLibres,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
