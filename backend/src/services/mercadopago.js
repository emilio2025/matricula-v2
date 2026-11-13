// =====================================================================
// Pasarela de pago: Mercado Pago (Checkout Pro)
// · El servidor crea una "preferencia" con el monto y redirige al comprador a Mercado Pago.
// · Al volver (o por webhook), el servidor CONSULTA el pago en la API de Mercado Pago:
//   nunca se confía en los parámetros que trae la URL de retorno.
// · El Access Token solo existe aquí, leído desde .env (usar el de la cuenta de PRUEBA).
// =====================================================================
const crypto = require('crypto');

const API = process.env.MP_API_URL || 'https://api.mercadopago.com';
const TOKEN = process.env.MP_ACCESS_TOKEN || '';

const activo = () => !!TOKEN;

function validarConfig() {
  if (TOKEN && !/^(APP_USR|TEST)-/.test(TOKEN)) {
    throw new Error('MP_ACCESS_TOKEN no tiene el formato de Mercado Pago (APP_USR-... o TEST-...). Revisa backend/.env');
  }
}

async function llamar(ruta, { method = 'GET', body, idempotencia } = {}) {
  const r = await fetch(`${API}${ruta}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      ...(body && { 'Content-Type': 'application/json' }),
      ...(idempotencia && { 'X-Idempotency-Key': idempotencia }),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const datos = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error(datos.message || `Mercado Pago respondió ${r.status}`);
    e.status = r.status;
    throw e;
  }
  return datos;
}

// Crea la preferencia de pago (Checkout Pro). Devuelve la URL a la que se redirige al comprador.
async function crearPreferencia({ solicitudId, intento, titulo, montoSoles, email, urlRetorno }) {
  const https = urlRetorno.startsWith('https://');
  const pref = await llamar('/checkout/preferences', {
    method: 'POST',
    idempotencia: intento,
    body: {
      items: [{ id: solicitudId, title: titulo.slice(0, 120), quantity: 1, currency_id: 'PEN', unit_price: montoSoles }],
      payer: { email },
      external_reference: `${solicitudId}|${intento}`,
      back_urls: { success: urlRetorno, failure: urlRetorno, pending: urlRetorno },
      // Mercado Pago solo regresa solo (auto_return) a direcciones https; en localhost se usa "Volver al sitio"
      ...(https && { auto_return: 'approved' }),
      ...(process.env.MP_NOTIFICATION_URL && { notification_url: process.env.MP_NOTIFICATION_URL }),
      statement_descriptor: 'MATRICULA',
      payment_methods: { installments: 1 },
      metadata: { solicitud_id: solicitudId, intento },
    },
  });
  return { id: pref.id, url: pref.init_point || pref.sandbox_init_point };
}

function normalizar(p) {
  return {
    id: String(p.id),
    estado: p.status, // approved | pending | in_process | rejected | cancelled | refunded ...
    detalle: p.status_detail,
    monto: Math.round(Number(p.transaction_amount) * 100), // en céntimos
    moneda: p.currency_id,
    referencia: p.external_reference || '',
    tarjeta: p.card?.last_four_digits || null,
    marca: p.payment_method_id || null,
  };
}

async function obtenerPago(id) {
  if (!/^\d{1,30}$/.test(String(id))) return null;
  return normalizar(await llamar(`/v1/payments/${id}`));
}

// Busca los pagos de una referencia (por si el usuario cerró la pestaña sin volver)
async function buscarPorReferencia(referencia) {
  const d = await llamar(`/v1/payments/search?external_reference=${encodeURIComponent(referencia)}&sort=date_created&criteria=desc`);
  return (d.results || []).map(normalizar);
}

// Verifica la firma x-signature del webhook (clave secreta del panel de Mercado Pago)
function firmaValida({ xSignature, xRequestId, dataId }) {
  const secreto = process.env.MP_WEBHOOK_SECRET;
  if (!secreto) return null; // sin clave configurada: no se puede verificar
  const partes = Object.fromEntries(String(xSignature || '').split(',').map((p) => p.trim().split('=')));
  if (!partes.ts || !partes.v1) return false;
  const id = /^[a-z0-9]+$/i.test(dataId) ? String(dataId).toLowerCase() : dataId;
  const manifiesto = `id:${id};request-id:${xRequestId};ts:${partes.ts};`;
  const esperado = crypto.createHmac('sha256', secreto).update(manifiesto).digest('hex');
  const a = Buffer.from(esperado); const b = Buffer.from(partes.v1);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Mensajes en español para los rechazos más comunes
const MENSAJES = {
  cc_rejected_insufficient_amount: 'Tu tarjeta no tiene fondos suficientes.',
  cc_rejected_bad_filled_security_code: 'El código de seguridad (CVV) no es correcto.',
  cc_rejected_bad_filled_date: 'La fecha de vencimiento no es correcta.',
  cc_rejected_bad_filled_other: 'Revisa los datos de la tarjeta.',
  cc_rejected_call_for_authorize: 'Tu banco pide que autorices el pago. Comunícate con él o usa otra tarjeta.',
  cc_rejected_card_disabled: 'Tu tarjeta está deshabilitada. Actívala con tu banco o usa otra.',
  cc_rejected_duplicated_payment: 'Ya hiciste un pago por este monto. Si necesitas pagar de nuevo, usa otra tarjeta.',
  cc_rejected_high_risk: 'El pago fue rechazado por seguridad. Usa otro medio de pago.',
  cc_rejected_blacklist: 'El pago fue rechazado. Usa otro medio de pago.',
  cc_rejected_max_attempts: 'Llegaste al límite de intentos. Usa otra tarjeta.',
};
const mensajeRechazo = (detalle) => MENSAJES[detalle] || 'El pago fue rechazado. Intenta con otra tarjeta o medio de pago.';

module.exports = { activo, validarConfig, crearPreferencia, obtenerPago, buscarPorReferencia, firmaValida, mensajeRechazo };
