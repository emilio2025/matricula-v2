// =====================================================================
// Pasarela de pago: Culqi (Perú)
// · Modo "culqi": usa la API real de Culqi con llaves de PRUEBA (sk_test_ / pk_test_).
// · Modo "simulado": si no hay llaves en .env, imita las respuestas de Culqi para
//   poder demostrar el flujo sin cuenta. La interfaz lo indica claramente.
// La clave secreta solo existe aquí, en el servidor, leída desde .env.
// =====================================================================
const API = process.env.CULQI_API_URL || 'https://api.culqi.com/v2';
const SECRETA = process.env.CULQI_SECRET_KEY || '';
const PUBLICA = process.env.CULQI_PUBLIC_KEY || '';

function modo() {
  if (!SECRETA && !PUBLICA) return 'simulado';
  if (!SECRETA.startsWith('sk_test_') || !PUBLICA.startsWith('pk_test_')) {
    throw new Error('Las llaves de Culqi deben ser de PRUEBA (sk_test_ y pk_test_). Revisa backend/.env');
  }
  return 'culqi';
}

// Configuración que sí puede ver el navegador (nunca la secreta)
function configPublica() {
  const m = modo();
  return {
    modo: m,
    moneda: 'PEN',
    publicKey: m === 'culqi' ? PUBLICA : null,
    rsaId: m === 'culqi' ? process.env.CULQI_RSA_ID || null : null,
    rsaPublicKey: m === 'culqi' ? process.env.CULQI_RSA_PUBLIC_KEY || null : null,
  };
}

// Resultado normalizado: { tipo: 'aprobado' | 'rechazado' | 'requiere_3ds' | 'desconocido', ... }
async function crearCargo({ montoCentimos, email, token, descripcion, metadata, cliente }) {
  if (modo() === 'simulado') return cargoSimulado({ montoCentimos, token });

  let r;
  try {
    r = await fetch(`${API}/charges`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SECRETA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: montoCentimos,
        currency_code: 'PEN',
        email,
        source_id: token,
        description: descripcion.slice(0, 80),
        metadata,
        antifraud_details: cliente,
      }),
      signal: AbortSignal.timeout(20000),
    });
  } catch (err) {
    // Sin respuesta (red o tiempo agotado): no sabemos si se cobró
    return { tipo: 'desconocido', detalle: err.name === 'TimeoutError' ? 'Tiempo agotado' : err.message };
  }

  const datos = await r.json().catch(() => ({}));
  if (r.ok && datos.object === 'charge') {
    if (datos.action_code === 'REVIEW') return { tipo: 'requiere_3ds', cargo: datos };
    return { tipo: 'aprobado', cargo: normalizar(datos) };
  }
  if (datos.object === 'error') {
    return {
      tipo: 'rechazado',
      codigo: datos.decline_code || datos.code || datos.type,
      mensaje: datos.user_message || 'El pago no fue aprobado. Intenta con otra tarjeta.',
      mensajeComercio: datos.merchant_message,
      cargoId: datos.charge_id || null,
      errorIntegracion: datos.type !== 'card_error',
    };
  }
  if (r.status >= 500) return { tipo: 'desconocido', detalle: `Culqi respondió ${r.status}` };
  return { tipo: 'rechazado', codigo: `http_${r.status}`, mensaje: 'No pudimos procesar el pago. Intenta nuevamente.', errorIntegracion: true };
}

// Consulta un cargo en Culqi (para confirmar lo que dice un webhook)
async function obtenerCargo(id) {
  if (modo() === 'simulado') return null;
  const r = await fetch(`${API}/charges/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${SECRETA}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) return null;
  return normalizar(await r.json());
}

function normalizar(c) {
  return {
    id: c.id,
    monto: c.amount,
    moneda: c.currency_code,
    email: c.email,
    referencia: c.reference_code || null,
    tarjeta: c.source?.card_number || null,
    marca: c.source?.iin?.card_brand || null,
    metadata: c.metadata || {},
    // Un cargo creado sin error es una venta exitosa; si trae "outcome", se respeta lo que dice
    exitoso: c.outcome?.type ? c.outcome.type === 'venta_exitosa' : true,
  };
}

// ---------------------------------------------------------------------
// Simulación (solo si no hay llaves). El "token" lo genera la pantalla de
// prueba del frontend e indica qué tarjeta de prueba eligió el usuario.
// ---------------------------------------------------------------------
const ESCENARIOS = {
  tkn_sim_visa_aprobada: { tipo: 'aprobado', tarjeta: '411111******1111', marca: 'Visa' },
  tkn_sim_mc_aprobada: { tipo: 'aprobado', tarjeta: '511111******1118', marca: 'Mastercard' },
  tkn_sim_fondos: { tipo: 'rechazado', codigo: 'insufficient_funds', mensaje: 'Su tarjeta no tiene fondos suficientes. Para realizar la compra, verifica tus fondos disponibles con el banco emisor o inténtalo nuevamente con otra tarjeta.' },
  tkn_sim_robada: { tipo: 'rechazado', codigo: 'stolen_card', mensaje: 'Su tarjeta fue rechazada. Comuníquese con su banco emisor o use otra tarjeta.' },
  tkn_sim_vencida: { tipo: 'rechazado', codigo: 'expired_card', mensaje: 'Su tarjeta está vencida. Intente con otra tarjeta.' },
  tkn_sim_timeout: { tipo: 'desconocido', detalle: 'Tiempo agotado (simulado)' },
};

async function cargoSimulado({ montoCentimos, token }) {
  await new Promise((r) => setTimeout(r, 900)); // latencia de red simulada
  const e = ESCENARIOS[token];
  if (!e) return { tipo: 'rechazado', codigo: 'invalid_token', mensaje: 'El token de pago no es válido o ya fue usado.', errorIntegracion: true };
  if (e.tipo !== 'aprobado') return { ...e, cargoId: null };
  const id = `chr_sim_${Date.now().toString(36)}`;
  return { tipo: 'aprobado', cargo: { id, monto: montoCentimos, moneda: 'PEN', referencia: `SIM${Date.now().toString().slice(-8)}`, tarjeta: e.tarjeta, marca: e.marca, exitoso: true } };
}

module.exports = { modo, configPublica, crearCargo, obtenerCargo };
