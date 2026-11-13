import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useUI } from '../context/UIContext';
import { ESTADOS_PAGO } from '../data/catalogo';
import Icono from './Icono';

const CULQI_JS = 'https://checkout.culqi.com/js/v4';

// Tarjetas del modo simulado (sin llaves de Culqi). Cada opción genera un token de prueba
// que el backend reconoce; así se pueden demostrar los casos aprobado, rechazado y timeout.
const TARJETAS_SIMULADAS = [
  { token: 'tkn_sim_visa_aprobada', texto: 'Visa ···· 1111', detalle: 'Aprobada' },
  { token: 'tkn_sim_mc_aprobada', texto: 'Mastercard ···· 1118', detalle: 'Aprobada' },
  { token: 'tkn_sim_fondos', texto: 'Visa ···· 0002', detalle: 'Fondos insuficientes' },
  { token: 'tkn_sim_robada', texto: 'Visa ···· 0000', detalle: 'Tarjeta robada' },
  { token: 'tkn_sim_vencida', texto: 'Mastercard ···· 0010', detalle: 'Tarjeta vencida' },
  { token: 'tkn_sim_timeout', texto: 'Visa ···· 9999', detalle: 'Sin respuesta (timeout)' },
];

let promesaScript = null;
function cargarCulqi() {
  if (window.Culqi) return Promise.resolve(window.Culqi);
  if (!promesaScript) {
    promesaScript = new Promise((ok, falla) => {
      const s = document.createElement('script');
      s.src = CULQI_JS;
      s.async = true;
      s.onload = () => (window.Culqi ? ok(window.Culqi) : falla(new Error('Culqi no se inicializó.')));
      s.onerror = () => { promesaScript = null; falla(new Error('No se pudo cargar el checkout de Culqi. Revisa tu conexión.')); };
      document.head.appendChild(s);
    });
  }
  return promesaScript;
}

export default function PagoMatricula({ solicitud: s, nivel, soloLectura = false }) {
  const { usuario } = useAuth();
  const { pagarMatricula, recargarSolicitud, iniciarMercadoPago, confirmarMercadoPago, institucion } = useData();
  const [params, setParams] = useSearchParams();
  const { toast } = useUI();
  const [config, setConfig] = useState(null);
  const [estado, setEstado] = useState('idle'); // idle | abriendo | procesando
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [tarjetaSim, setTarjetaSim] = useState(TARJETAS_SIMULADAS[0].token);
  const enCurso = useRef(false);

  const monto = nivel.costoMatricula;
  const pago = s.pago || { estado: 'pendiente' };
  const infoEstado = ESTADOS_PAGO[pago.estado] || ESTADOS_PAGO.pendiente;

  useEffect(() => {
    api('/pagos/config').then(setConfig).catch((e) => setError(e.message));
  }, []);

  // Regreso desde Mercado Pago: la URL trae payment_id y status, pero el servidor
  // vuelve a consultar el pago en Mercado Pago antes de darlo por pagado.
  useEffect(() => {
    const paymentId = params.get('payment_id') || params.get('collection_id');
    const status = params.get('status') || params.get('collection_status');
    if (soloLectura || (!paymentId && !status)) return;
    setParams({}, { replace: true });
    setEstado('procesando');
    confirmarMercadoPago(s.id, paymentId && paymentId !== 'null' ? paymentId : null).then((r) => {
      setEstado('idle');
      if (!r.ok) return setError(r.intentosRestantes !== undefined ? `${r.error} (Te quedan ${Math.max(0, r.intentosRestantes)} intentos esta hora.)` : r.error);
      if (r.resultado === 'aprobado') toast('¡Pago confirmado por Mercado Pago! Tu matrícula está completa.');
      else if (r.resultado === 'pendiente') setAviso('Mercado Pago está procesando tu pago. Te avisaremos cuando se confirme; no vuelvas a pagar.');
      else setError('No se completó el pago. Puedes intentarlo de nuevo.');
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pagarMercadoPago = async () => {
    if (enCurso.current) return;
    enCurso.current = true;
    setError('');
    setEstado('abriendo');
    try {
      const d = await iniciarMercadoPago(s.id);
      if (d.url) { window.location.assign(d.url); return; } // se va a Mercado Pago
      if (d.yaPagado) toast('Esta matrícula ya estaba pagada.');
    } catch (e) {
      setError(e.message);
    }
    enCurso.current = false;
    setEstado('idle');
  };

  // Envía el token al backend: el servidor calcula el monto y hace el cargo
  const cobrar = async (token, email) => {
    if (enCurso.current) return;
    enCurso.current = true;
    setEstado('procesando');
    setError('');
    const r = await pagarMatricula(s.id, token, email);
    enCurso.current = false;
    setEstado('idle');
    if (r.ok && r.porConfirmar) { setAviso(r.mensaje); return; }
    if (r.ok) { toast('¡Pago confirmado! Tu matrícula está completa.'); return; }
    setError(r.intentosRestantes !== undefined ? `${r.error} (Te quedan ${Math.max(0, r.intentosRestantes)} intentos esta hora.)` : r.error);
  };

  const abrirCulqi = async () => {
    setError('');
    setEstado('abriendo');
    try {
      const Culqi = await cargarCulqi();
      Culqi.publicKey = config.publicKey;
      Culqi.settings({
        title: institucion.nombre,
        currency: 'PEN',
        amount: Math.round(monto * 100),
        ...(config.rsaId && config.rsaPublicKey && { xculqirsaid: config.rsaId, rsapublickey: config.rsaPublicKey }),
      });
      Culqi.options({
        lang: 'auto',
        installments: false,
        paymentMethods: { tarjeta: true, yape: true, bancaMovil: false, agente: false, billetera: false, cuotealo: false },
        style: { bannerColor: '#0b3d91', buttonBackground: '#0b3d91', menuColor: '#0b3d91', linksColor: '#0b3d91', buttonText: 'Pagar matrícula', priceColor: '#0b3d91' },
      });
      // Culqi llama a esta función global al terminar el formulario
      window.culqi = () => {
        if (window.Culqi.token) {
          const { id, email } = window.Culqi.token;
          window.Culqi.close();
          cobrar(id, email || usuario.email);
        } else if (window.Culqi.error) {
          setError(window.Culqi.error.user_message || 'No se pudo procesar la tarjeta.');
        }
      };
      Culqi.open();
    } catch (e) {
      setError(e.message);
    } finally {
      setEstado('idle');
    }
  };

  const pagarSimulado = () => cobrar(tarjetaSim, usuario.email);

  const verificar = async () => {
    if (config?.proveedor === 'mercadopago') {
      const r = await confirmarMercadoPago(s.id, pago.cargoId);
      if (!r.ok) setError(r.error);
      else if (r.resultado === 'aprobado') toast('¡Pago confirmado!');
      return;
    }
    try { await recargarSolicitud(s.id); setAviso(''); } catch (e) { setError(e.message); }
  };

  const ocupado = estado !== 'idle';
  const bloqueado = pago.estado === 'por_confirmar' || pago.estado === 'procesando';

  return (
    <section className="card pago mt">
      <div className="pago-top">
        <div>
          <h3><Icono nombre="billetera" tamano={18} /> Pago de matrícula</h3>
          <p className="muted">Tu solicitud fue aprobada. Paga la matrícula para reservar la vacante y descargar tu constancia.</p>
        </div>
        <span className={`badge badge-${infoEstado.color}`}>{infoEstado.texto}</span>
      </div>

      <dl className="pago-monto">
        <div><dt>Concepto</dt><dd>Matrícula {institucion.periodo} · {nivel.nombre}</dd></div>
        <div><dt>Código</dt><dd className="mono">{s.id}</dd></div>
        <div className="pago-total"><dt>Total a pagar</dt><dd>S/ {monto.toFixed(2)}</dd></div>
      </dl>
      <p className="pago-nota">Servicio educativo exonerado de IGV. El monto lo calcula el servidor con los costos vigentes.</p>

      {soloLectura ? (
        <p className="muted">El apoderado verá aquí el botón de pago.{pago.ultimoError && ` Último intento: ${pago.ultimoError}`}</p>
      ) : bloqueado ? (
        <div className="pago-alerta info">
          <p>{aviso || 'Estamos verificando tu pago con la pasarela. No vuelvas a pagar; se confirmará automáticamente.'}</p>
          <button type="button" className="btn btn-sm" onClick={verificar}>Actualizar estado</button>
        </div>
      ) : (
        <>
          {(error || pago.ultimoError) && <div className="pago-alerta error" role="alert">{error || pago.ultimoError}</div>}

          {!config ? (
            <p className="muted">Cargando métodos de pago…</p>
          ) : config.proveedor === 'mercadopago' ? (
            <div className="pago-acciones">
              <button type="button" className="btn btn-primary btn-mp" onClick={pagarMercadoPago} disabled={ocupado}>
                {estado === 'procesando' ? 'Verificando pago…' : estado === 'abriendo' ? 'Conectando con Mercado Pago…' : `Pagar S/ ${monto.toFixed(2)} con Mercado Pago`}
              </button>
              <small className="muted">Serás redirigido a Mercado Pago para pagar con tarjeta o tu cuenta. Al terminar, pulsa «Volver al sitio».</small>
            </div>
          ) : config.modo === 'culqi' ? (
            <div className="pago-acciones">
              <button type="button" className="btn btn-primary" onClick={abrirCulqi} disabled={ocupado}>
                {estado === 'procesando' ? 'Procesando pago…' : estado === 'abriendo' ? 'Abriendo Culqi…' : `Pagar S/ ${monto.toFixed(2)} con tarjeta o Yape`}
              </button>
              <small className="muted">Pago seguro con Culqi. Los datos de tu tarjeta no pasan por nuestro servidor.</small>
            </div>
          ) : (
            <div className="pago-sim">
              <p className="pago-sim-aviso"><strong>Modo simulado.</strong> El backend no tiene llaves de pago en <code>.env</code>; elige una tarjeta de prueba para demostrar el flujo.</p>
              <div className="pago-sim-lista" role="radiogroup" aria-label="Tarjeta de prueba">
                {TARJETAS_SIMULADAS.map((t) => (
                  <label key={t.token} className={`pago-sim-op ${tarjetaSim === t.token ? 'activa' : ''}`}>
                    <input type="radio" name="tarjeta" value={t.token} checked={tarjetaSim === t.token} onChange={() => setTarjetaSim(t.token)} />
                    <span className="mono">{t.texto}</span>
                    <small>{t.detalle}</small>
                  </label>
                ))}
              </div>
              <button type="button" className="btn btn-primary" onClick={pagarSimulado} disabled={ocupado}>
                {estado === 'procesando' ? 'Procesando pago…' : `Pagar S/ ${monto.toFixed(2)} (simulado)`}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
