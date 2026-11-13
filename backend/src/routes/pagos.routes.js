// =====================================================================
// Pago de la matrícula
// Pasarela principal: Mercado Pago (Checkout Pro). Alternativa: Culqi.
// Sin llaves en .env, los pagos funcionan en MODO SIMULADO.
// En todos los casos el servidor calcula el monto y verifica el pago.
// =====================================================================
const { Router } = require('express');
const crypto = require('crypto');
const db = require('../db');
const { verificarToken, permitir } = require('../middleware/auth');
const culqi = require('../services/culqi');
const mp = require('../services/mercadopago');
const v = require('../utils/validar');

const { solicitudes, pagos, costos, intentos, eventos, usuarios, institucion, transaccion, hoy, getNivel } = db;
const router = Router();
const soles = (c) => `S/ ${(c / 100).toFixed(2)}`;

// Regla antifraude: máximo 5 intentos rechazados por usuario en una hora
const LIMITE_INTENTOS = 5;

// GET /api/pagos/config — lo que necesita el checkout del navegador
router.get('/config', (req, res) => {
  if (mp.activo()) return res.json({ proveedor: 'mercadopago', modo: 'mercadopago', moneda: 'PEN' });
  try {
    const c = culqi.configPublica();
    res.json({ proveedor: c.modo === 'culqi' ? 'culqi' : 'simulado', ...c });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Validaciones comunes antes de cobrar: dueño y estado
function validarCobro(s, usuarioId) {
  if (!s) return { status: 404, error: 'Solicitud no encontrada.' };
  if (s.usuarioId !== usuarioId) return { status: 403, error: 'Esta solicitud no te pertenece.' };
  if (s.estado !== 'aprobada') return { status: 409, error: 'Solo se paga una solicitud aprobada.' };
  return null;
}

// Aplica a la solicitud el resultado de un pago consultado en Mercado Pago (dentro de una transacción)
async function aplicarPagoMP(conn, s, pago, usuarioId) {
  const [refId] = pago.referencia.split('|');
  if (refId !== s.id) return { tipo: 'ajeno' };
  const esperado = await costos.matriculaCentimos(s.nivelId, conn);
  if (pago.moneda !== 'PEN' || pago.monto !== esperado) {
    console.warn(`[mercadopago] monto o moneda distinta en ${s.id}: ${pago.monto} ${pago.moneda}`);
    return { tipo: 'monto_invalido' };
  }
  if (s.pago?.estado === 'pagado') return { tipo: 'ya_pagado' };
  if (pago.estado === 'approved') {
    await pagos.guardar(s.id, { estado: 'pagado', canal: 'mercadopago', proveedor: 'mercadopago', monto: pago.monto, moneda: 'PEN', fecha: hoy(), cargoId: pago.id, referencia: `MP-${pago.id}`, tarjeta: pago.tarjeta, marca: pago.marca, intento: s.pago?.intento }, conn);
    await solicitudes.registrar(s.id, `Pago de matrícula confirmado por Mercado Pago: ${soles(pago.monto)} (operación ${pago.id})`, conn);
    return { tipo: 'aprobado' };
  }
  if (['pending', 'in_process', 'authorized'].includes(pago.estado)) {
    if (s.pago?.estado !== 'por_confirmar') await solicitudes.registrar(s.id, 'Pago en proceso en Mercado Pago, pendiente de confirmación', conn);
    await pagos.guardar(s.id, { ...s.pago, estado: 'por_confirmar', cargoId: pago.id }, conn);
    return { tipo: 'pendiente' };
  }
  // rechazado o cancelado: se registra para la regla antifraude (una vez por operación)
  const mensaje = pago.estado === 'rejected' ? mp.mensajeRechazo(pago.detalle) : 'El pago fue cancelado.';
  if (s.pago?.cargoId !== pago.id || s.pago?.estado !== 'fallido') {
    if (usuarioId) await intentos.registrar({ usuarioId, solicitudId: s.id, codigo: pago.detalle }, conn);
    await solicitudes.registrar(s.id, `Pago rechazado en Mercado Pago (${pago.detalle || pago.estado})`, conn);
  }
  await pagos.guardar(s.id, { ...s.pago, estado: 'fallido', cargoId: pago.id, codigo: pago.detalle, ultimoError: mensaje, fecha: hoy() }, conn);
  return { tipo: 'rechazado', mensaje };
}

// POST /api/pagos/solicitudes/:id/mercadopago — crea la preferencia y devuelve la URL de pago
router.post('/solicitudes/:id/mercadopago', verificarToken, permitir('apoderado'), async (req, res) => {
  if (!mp.activo()) return res.status(409).json({ error: 'Mercado Pago no está configurado en el servidor.' });
  const id = String(req.params.id);
  let s = await solicitudes.obtener(id);
  const err = validarCobro(s, req.usuario.id);
  if (err) return res.status(err.status).json({ error: err.error });
  if (s.pago?.estado === 'pagado') return res.json({ solicitud: s, yaPagado: true });
  if (await intentos.recientes(req.usuario.id) >= LIMITE_INTENTOS) {
    return res.status(429).json({ error: 'Superaste el número de intentos de pago. Por seguridad, espera una hora o paga en caja.' });
  }

  try {
    // Antes de crear otro cobro, se revisa si el intento anterior ya se pagó (evita cobrar dos veces)
    if (s.pago?.intento) {
      const previos = await mp.buscarPorReferencia(`${s.id}|${s.pago.intento}`);
      const bueno = previos.find((p) => p.estado === 'approved') || previos.find((p) => ['pending', 'in_process'].includes(p.estado));
      if (bueno) {
        await transaccion(async (conn) => aplicarPagoMP(conn, await solicitudes.obtener(id, conn, true), bueno, req.usuario.id));
        s = await solicitudes.obtener(id);
        if (s.pago?.estado === 'pagado') return res.json({ solicitud: s, yaPagado: true });
        return res.status(409).json({ error: 'Tienes un pago en proceso en Mercado Pago. Espera su confirmación antes de pagar de nuevo.', solicitud: s });
      }
    }
    const intento = crypto.randomUUID();
    const monto = await costos.matriculaCentimos(s.nivelId);
    const inst = await institucion.obtener();
    const usuario = await usuarios.porId(req.usuario.id);
    const urlBase = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0];
    const pref = await mp.crearPreferencia({
      solicitudId: s.id,
      intento,
      titulo: `Matrícula ${inst.periodo} ${getNivel(s.nivelId).nombre} ${s.id}`,
      montoSoles: monto / 100,
      email: usuario?.email,
      urlRetorno: `${urlBase}/portal/solicitud/${s.id}`,
    });
    await pagos.guardar(s.id, { estado: 'pendiente', proveedor: 'mercadopago', intento, preferenciaId: pref.id, monto, moneda: 'PEN' });
    res.json({ url: pref.url });
  } catch (e) {
    console.error('[mercadopago] preferencia:', e.message);
    res.status(502).json({ error: 'No se pudo conectar con Mercado Pago. Intenta en unos minutos.' });
  }
});

// POST /api/pagos/solicitudes/:id/mercadopago/confirmar  { paymentId? }
// Se llama al volver de Mercado Pago. El servidor consulta el pago real en la API.
router.post('/solicitudes/:id/mercadopago/confirmar', verificarToken, permitir('apoderado'), async (req, res) => {
  if (!mp.activo()) return res.status(409).json({ error: 'Mercado Pago no está configurado en el servidor.' });
  const id = String(req.params.id);
  const s = await solicitudes.obtener(id);
  const err = validarCobro(s, req.usuario.id);
  if (err) return res.status(err.status).json({ error: err.error });
  if (s.pago?.estado === 'pagado') return res.json({ solicitud: s, resultado: 'aprobado' });

  const { paymentId } = req.body || {};
  if (paymentId !== undefined && paymentId !== null && !/^\d{1,30}$/.test(String(paymentId))) {
    return res.status(400).json({ error: 'Identificador de pago no válido.' });
  }
  let pago;
  try {
    pago = paymentId ? await mp.obtenerPago(paymentId) : null;
    if (!pago && s.pago?.intento) {
      const lista = await mp.buscarPorReferencia(`${s.id}|${s.pago.intento}`);
      pago = lista.find((p) => p.estado === 'approved') || lista[0] || null;
    }
  } catch (e) {
    console.error('[mercadopago] confirmar:', e.message);
    return res.status(502).json({ error: 'No se pudo verificar el pago con Mercado Pago. Intenta en unos minutos.' });
  }
  if (!pago) return res.json({ solicitud: s, resultado: 'sin_pago' });

  const r = await transaccion(async (conn) => aplicarPagoMP(conn, await solicitudes.obtener(id, conn, true), pago, req.usuario.id));
  const actual = await solicitudes.obtener(id);
  if (r.tipo === 'ajeno' || r.tipo === 'monto_invalido') return res.status(400).json({ error: 'El pago no corresponde a esta matrícula.', solicitud: actual });
  if (r.tipo === 'rechazado') {
    return res.status(402).json({ error: r.mensaje, codigo: pago.detalle, solicitud: actual, intentosRestantes: LIMITE_INTENTOS - await intentos.recientes(req.usuario.id) });
  }
  res.json({ solicitud: actual, resultado: r.tipo === 'pendiente' ? 'pendiente' : 'aprobado' });
});

// POST /api/pagos/webhook/mercadopago — Mercado Pago avisa cambios de un pago
router.post('/webhook/mercadopago', async (req, res) => {
  if (!mp.activo()) return res.sendStatus(200);
  const tipo = req.body?.type || req.query.type || req.query.topic;
  const dataId = String(req.body?.data?.id || req.query['data.id'] || req.query.id || '');
  if (tipo !== 'payment' || !/^\d{1,30}$/.test(dataId)) return res.sendStatus(200); // otros avisos se ignoran

  const firma = mp.firmaValida({ xSignature: req.headers['x-signature'], xRequestId: req.headers['x-request-id'] || '', dataId });
  if (firma === false) return res.status(401).json({ error: 'Firma no válida.' });

  let pago;
  try { pago = await mp.obtenerPago(dataId); } catch { pago = null; }
  if (!pago) return res.status(503).json({ error: 'No se pudo verificar el pago. Reintenta.' });

  const idEvento = `mp:${pago.id}:${pago.estado}`;
  if (!(await eventos.yaProcesado(idEvento))) {
    await transaccion(async (conn) => {
      const s = await solicitudes.obtener(pago.referencia.split('|')[0], conn, true);
      if (s) await aplicarPagoMP(conn, s, pago, s.usuarioId);
      await eventos.marcar(idEvento, conn);
    });
  }
  res.sendStatus(200);
});

// POST /api/pagos/solicitudes/:id/cargo   { token, email }  — Culqi o modo simulado
router.post('/solicitudes/:id/cargo', verificarToken, permitir('apoderado'), async (req, res) => {
  if (mp.activo()) return res.status(409).json({ error: 'Los pagos se realizan con Mercado Pago.' });
  const id = String(req.params.id);
  const { token, email } = req.body || {};

  // 1) Bloqueo: en una transacción se marca el pago como "procesando" (evita el doble cobro)
  const r = await transaccion(async (conn) => {
    const s = await solicitudes.obtener(id, conn, true);
    const err = validarCobro(s, req.usuario.id);
    if (err) return err;
    // Idempotencia: si ya está pagada, se devuelve el mismo resultado sin cobrar de nuevo
    if (s.pago?.estado === 'pagado') return { yaPagado: true };
    if (s.pago?.estado === 'procesando') return { status: 409, error: 'Ya hay un pago en curso para esta matrícula. Espera unos segundos.' };
    if (s.pago?.estado === 'por_confirmar') return { status: 409, error: 'Estamos verificando un pago anterior de esta matrícula. Te avisaremos cuando se confirme.' };
    if (typeof token !== 'string' || !/^(tkn|ype)_[\w-]{4,80}$/.test(token)) return { status: 400, error: 'Token de pago no válido.' };
    if (!v.email(email)) return { status: 400, error: 'Correo no válido.' };
    if (await intentos.recientes(req.usuario.id) >= LIMITE_INTENTOS) {
      return { status: 429, error: 'Superaste el número de intentos de pago. Por seguridad, espera una hora o paga en caja.' };
    }
    // El monto lo decide el servidor con el costo vigente, nunca el navegador
    const monto = await costos.matriculaCentimos(s.nivelId, conn);
    const intento = crypto.randomUUID();
    await pagos.guardar(s.id, { estado: 'procesando', intento, monto, moneda: 'PEN', desde: Date.now() }, conn);
    return { s, monto, intento };
  });
  if (r.yaPagado) return res.json({ solicitud: await solicitudes.obtener(id), yaPagado: true });
  if (r.error) return res.status(r.status).json({ error: r.error });

  // 2) Cobro en la pasarela (fuera de la transacción)
  const { s, monto, intento } = r;
  const inst = await institucion.obtener();
  const usuario = await usuarios.porId(req.usuario.id);
  const [nombre, ...ap] = (usuario?.nombre || '').split(' ');
  const c = await culqi.crearCargo({
    montoCentimos: monto,
    email,
    token,
    descripcion: `Matrícula ${inst.periodo} ${getNivel(s.nivelId).nombre} ${s.id}`,
    metadata: { solicitud_id: s.id, intento },
    cliente: { first_name: nombre || 'Apoderado', last_name: ap.join(' ') || '-', email, phone_number: usuario?.telefono || undefined },
  });

  // 3) Resultado
  if (c.tipo === 'aprobado' && c.cargo.exitoso !== false) {
    const pago = {
      estado: 'pagado', canal: culqi.modo() === 'culqi' ? 'culqi' : 'simulado', proveedor: culqi.modo(), monto: c.cargo.monto ?? monto, moneda: 'PEN',
      fecha: hoy(), cargoId: c.cargo.id, referencia: c.cargo.referencia, tarjeta: c.cargo.tarjeta, marca: c.cargo.marca, intento,
    };
    await transaccion(async (conn) => {
      await pagos.guardar(s.id, pago, conn);
      await solicitudes.registrar(s.id, `Pago de matrícula confirmado: ${soles(pago.monto)} (${pago.marca || 'tarjeta'} ${pago.tarjeta ? pago.tarjeta.slice(-4) : ''})`.trim(), conn);
    });
    return res.json({ solicitud: await solicitudes.obtener(s.id) });
  }

  if (c.tipo === 'desconocido') {
    // No sabemos si se cobró: no se marca como fallido ni se reintenta; lo confirmará el webhook
    await transaccion(async (conn) => {
      await pagos.guardar(s.id, { estado: 'por_confirmar', intento, monto, moneda: 'PEN', detalle: c.detalle }, conn);
      await solicitudes.registrar(s.id, 'Pago enviado; Culqi no respondió a tiempo, pendiente de confirmación', conn);
    });
    return res.status(202).json({ solicitud: await solicitudes.obtener(s.id), mensaje: 'Estamos verificando tu pago con Culqi. No vuelvas a pagar; te avisaremos cuando se confirme.' });
  }

  if (c.tipo === 'requiere_3ds') {
    await pagos.guardar(s.id, { estado: 'pendiente', ultimoError: 'Tu banco pide autenticación adicional (3-D Secure).' });
    return res.status(402).json({ error: 'Tu banco pide una autenticación adicional (3-D Secure) que esta versión aún no admite. Intenta con otra tarjeta o paga con Yape.', codigo: 'requiere_3ds', solicitud: await solicitudes.obtener(s.id) });
  }

  // Rechazado: se registra el intento para la regla antifraude
  await transaccion(async (conn) => {
    await intentos.registrar({ usuarioId: req.usuario.id, solicitudId: s.id, codigo: c.codigo }, conn);
    await pagos.guardar(s.id, { estado: 'fallido', ultimoError: c.mensaje, codigo: c.codigo, fecha: hoy() }, conn);
    await solicitudes.registrar(s.id, `Pago rechazado (${c.codigo})`, conn);
  });
  if (c.errorIntegracion) console.error('[culqi] error de integración:', c.codigo, c.mensajeComercio || c.mensaje);
  return res.status(402).json({ error: c.mensaje, codigo: c.codigo, solicitud: await solicitudes.obtener(s.id), intentosRestantes: LIMITE_INTENTOS - await intentos.recientes(req.usuario.id) });
});

// POST /api/pagos/webhook/culqi — Culqi avisa al servidor aunque el navegador se haya cerrado
router.post('/webhook/culqi', async (req, res) => {
  // 1) Autenticación del aviso: usuario y clave configurados en el panel de Culqi
  const usuarioWh = process.env.CULQI_WEBHOOK_USER;
  const claveWh = process.env.CULQI_WEBHOOK_PASSWORD;
  if (usuarioWh && claveWh) {
    const esperado = `Basic ${Buffer.from(`${usuarioWh}:${claveWh}`).toString('base64')}`;
    const recibido = req.headers.authorization || '';
    const a = Buffer.from(recibido); const b = Buffer.from(esperado);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(401).json({ error: 'Webhook no autorizado.' });
  } else if (culqi.modo() === 'culqi') {
    console.warn('[webhook] Sin CULQI_WEBHOOK_USER/CULQI_WEBHOOK_PASSWORD: el aviso se acepta, pero se confirma consultando a Culqi.');
  }

  const evento = req.body || {};
  let datos;
  try { datos = typeof evento.data === 'string' ? JSON.parse(evento.data || '{}') : evento.data || {}; }
  catch { return res.status(400).json({ error: 'Evento no válido.' }); }
  const idEvento = evento.id || `${evento.type}:${datos.id}`;

  // 2) Procesar una sola vez
  if (await eventos.yaProcesado(idEvento)) return res.sendStatus(200);

  let cargo = null;
  if (evento.type === 'charge.creation.succeeded' && datos.id) {
    // 3) No confiar en el contenido del aviso: se vuelve a consultar el cargo en Culqi
    cargo = await culqi.obtenerCargo(datos.id).catch(() => null);
    // Si no se pudo consultar a Culqi, se responde error para que Culqi reintente el aviso
    if (!cargo) return res.status(503).json({ error: 'No se pudo verificar el cargo. Reintenta.' });
  }
  await transaccion(async (conn) => {
    if (cargo?.exitoso && cargo.metadata?.solicitud_id) {
      const s = await solicitudes.obtener(String(cargo.metadata.solicitud_id), conn, true);
      // Se acepta solo si el monto cobrado coincide con el costo vigente de la matrícula
      const esperado = s && await costos.matriculaCentimos(s.nivelId, conn);
      if (s && cargo.monto !== esperado) console.warn(`[webhook] monto distinto en ${s.id}: ${cargo.monto} vs ${esperado}`);
      else if (s && s.pago?.estado !== 'pagado') {
        await pagos.guardar(s.id, { estado: 'pagado', canal: 'culqi', proveedor: 'culqi', monto: cargo.monto, moneda: cargo.moneda, fecha: hoy(), cargoId: cargo.id, referencia: cargo.referencia, tarjeta: cargo.tarjeta, marca: cargo.marca }, conn);
        await solicitudes.registrar(s.id, `Pago de matrícula confirmado por Culqi (webhook): ${soles(cargo.monto)}`, conn);
      }
    }
    await eventos.marcar(idEvento, conn);
  });
  res.sendStatus(200); // 4) Responder rápido
});

// GET /api/pagos — reporte de pagos para secretaría y dirección
router.get('/', verificarToken, permitir('secretaria', 'director'), async (req, res) => {
  const lista = await pagos.reporte();
  const pagados = lista.filter((p) => p.estado === 'pagado');
  res.json({
    pagos: lista,
    resumen: {
      recaudado: pagados.reduce((n, p) => n + (p.monto || 0), 0),
      pagados: pagados.length,
      enLinea: pagados.filter((p) => p.canal !== 'caja').length,
      pendientes: lista.filter((p) => ['pendiente', 'fallido'].includes(p.estado)).length,
      porConfirmar: lista.filter((p) => ['procesando', 'por_confirmar'].includes(p.estado)).length,
    },
  });
});

module.exports = router;
