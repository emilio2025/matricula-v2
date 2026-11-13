const { Router } = require('express');
const { solicitudes, secciones, institucion, pagos, transaccion, hoy, getNivel, getGrado, calcularEdad } = require('../db');
const { verificarToken, permitir } = require('../middleware/auth');
const v = require('../utils/validar');

const router = Router();
const vacantes = (sec) => Math.max(0, sec.capacidad - sec.matriculados);

// El apoderado solo puede ver o tocar sus propias solicitudes (control de acceso)
async function buscarPropia(req, res) {
  const s = await solicitudes.obtener(String(req.params.id));
  if (!s) { res.status(404).json({ error: 'Solicitud no encontrada.' }); return null; }
  if (req.usuario.rol === 'apoderado' && s.usuarioId !== req.usuario.id) { res.status(403).json({ error: 'Esta solicitud no te pertenece.' }); return null; }
  return s;
}

// GET /api/solicitudes/consulta?q=MAT-2027-0001 | DNI — consulta pública con datos mínimos
router.get('/consulta', async (req, res) => {
  const q = String(req.query.q || '').trim().toUpperCase();
  if (!/^(MAT-\d{4}-\d{4}|\d{8})$/.test(q)) return res.status(400).json({ error: 'Escribe el código de solicitud (ej. MAT-2027-0001) o el DNI del alumno (8 dígitos).' });
  const s = await solicitudes.buscarPorCodigoODni(q);
  if (!s) return res.status(404).json({ error: `No encontramos una solicitud con "${q}". Revisa el código o el DNI.` });
  const sec = s.seccionId ? await secciones.obtener(s.seccionId) : null;
  res.json({
    id: s.id, estado: s.estado, observacion: s.estado === 'observada' ? s.observacion : '',
    nivelId: s.nivelId, gradoId: s.gradoId,
    alumno: { nombres: s.alumno.nombres, apellidos: s.alumno.apellidos },
    seccion: sec ? { nombre: sec.nombre, turno: sec.turno } : null,
    pagoEstado: s.pago?.estado || null,
  });
});

router.use(verificarToken);

// GET /api/solicitudes — apoderado: las suyas · secretaría y dirección: todas
router.get('/', async (req, res) => {
  res.json(await solicitudes.listar(req.usuario.rol === 'apoderado' ? req.usuario.id : null));
});

// GET /api/solicitudes/:id
router.get('/:id', async (req, res) => {
  const s = await buscarPropia(req, res);
  if (s) res.json(s);
});

// POST /api/solicitudes — nueva solicitud de matrícula
router.post('/', permitir('apoderado'), async (req, res) => {
  const { nivelId, gradoId, alumno = {}, apoderado, documentos = [] } = req.body || {};
  const inst = await institucion.obtener();
  const nivel = getNivel(nivelId);
  const grado = getGrado(gradoId);
  const e = [];
  if (!nivel) e.push('Nivel no válido.');
  if (!grado || grado.nivelId !== nivelId) e.push('Grado no válido para el nivel.');
  if (!v.dni(alumno.dni)) e.push('El DNI del alumno debe tener 8 dígitos.');
  if (!v.texto(alumno.nombres, 2, 60) || !v.texto(alumno.apellidos, 2, 60)) e.push('Nombres y apellidos del alumno son obligatorios.');
  if (!['M', 'F'].includes(alumno.sexo)) e.push('Selecciona el sexo del alumno.');
  if (!v.texto(alumno.direccion, 5, 120)) e.push('La dirección es obligatoria.');
  if (!v.fecha(alumno.fechaNacimiento)) e.push('Fecha de nacimiento no válida.');
  else if (nivel) {
    const edad = calcularEdad(alumno.fechaNacimiento, `${inst.periodo}-03-31`);
    if (edad < nivel.edadMin || edad > nivel.edadMax) e.push(`Para ${nivel.nombre} la edad debe estar entre ${nivel.edadMin} y ${nivel.edadMax} años (al 31/03).`);
  }
  if (nivel?.requiereApoderado) {
    const a = apoderado || {};
    if (!v.dni(a.dni) || a.dni === alumno.dni) e.push('DNI del apoderado no válido.');
    if (!v.texto(a.nombres, 5, 80) || !v.texto(a.parentesco, 3, 30)) e.push('Completa los datos del apoderado.');
    if (!v.celular(a.telefono)) e.push('Celular del apoderado no válido.');
    if (!v.email(a.email)) e.push('Correo del apoderado no válido.');
  }
  if (!Array.isArray(documentos) || documentos.some((d) => !nivel?.requisitos.includes(d))) e.push('Lista de documentos no válida.');
  const textos = [alumno.nombres, alumno.apellidos, alumno.direccion, apoderado?.nombres, apoderado?.parentesco, apoderado?.email];
  if (!v.sinHtml(...textos)) e.push('No se permiten etiquetas HTML (< >).');
  if (e.length) return res.status(400).json({ error: e.join(' ') });

  if (await secciones.vacantesDelGrado(gradoId) === 0) return res.status(409).json({ error: 'Este grado ya no tiene vacantes.' });
  if (await solicitudes.existeActivaParaDni(alumno.dni)) {
    return res.status(409).json({ error: 'Ya existe una solicitud activa para ese DNI de alumno.' });
  }

  const nueva = {
    id: null,
    usuarioId: req.usuario.id,
    fecha: hoy(),
    nivelId, gradoId,
    seccionId: null,
    estado: 'pendiente',
    observacion: '',
    alumno: { dni: alumno.dni, nombres: alumno.nombres.trim(), apellidos: alumno.apellidos.trim(), fechaNacimiento: alumno.fechaNacimiento, sexo: alumno.sexo, direccion: alumno.direccion.trim() },
    apoderado: nivel.requiereApoderado ? { dni: apoderado.dni, nombres: apoderado.nombres.trim(), parentesco: apoderado.parentesco, telefono: apoderado.telefono, email: apoderado.email.trim() } : null,
    documentos: [...new Set(documentos)],
    historial: [{ fecha: hoy(), texto: 'Solicitud enviada' }],
    pago: null,
  };
  await transaccion(async (conn) => {
    nueva.id = await solicitudes.siguienteId(inst.periodo, conn);
    await solicitudes.crear(nueva, conn);
  });
  res.status(201).json(await solicitudes.obtener(nueva.id));
});

// POST /api/solicitudes/:id/subsanar — el apoderado adjunta lo que faltaba
router.post('/:id/subsanar', permitir('apoderado'), async (req, res) => {
  const s = await buscarPropia(req, res);
  if (!s) return;
  if (s.estado !== 'observada') return res.status(409).json({ error: 'Solo se puede subsanar una solicitud observada.' });
  const nivel = getNivel(s.nivelId);
  const nuevos = req.body?.documentos;
  if (!Array.isArray(nuevos) || nuevos.some((d) => !nivel.requisitos.includes(d))) return res.status(400).json({ error: 'Lista de documentos no válida.' });
  await transaccion(async (conn) => {
    for (const d of nuevos) await solicitudes.agregarDocumento(s.id, d, conn);
    await solicitudes.actualizarEstado(s.id, { estado: 'pendiente', observacion: '', seccionId: s.seccionId }, conn);
    await solicitudes.registrar(s.id, 'Subsanada por el apoderado, vuelve a revisión', conn);
  });
  res.json(await solicitudes.obtener(s.id));
});

// POST /api/solicitudes/:id/aprobar — secretaría asigna sección (transacción con bloqueo de filas)
router.post('/:id/aprobar', permitir('secretaria'), async (req, res) => {
  const r = await transaccion(async (conn) => {
    const s = await solicitudes.obtener(String(req.params.id), conn, true);
    if (!s) return { status: 404, error: 'Solicitud no encontrada.' };
    if (s.pago?.estado === 'pagado') return { status: 409, error: 'La matrícula ya fue pagada; no se puede volver a aprobar.' };
    const sec = await secciones.obtener(String(req.body?.seccionId || ''), conn, true);
    if (!sec || sec.gradoId !== s.gradoId) return { status: 400, error: 'Sección no válida para este grado.' };
    if (s.seccionId !== sec.id && vacantes(sec) === 0) return { status: 409, error: 'La sección ya no tiene vacantes.' };
    if (s.estado === 'aprobada' && s.seccionId && s.seccionId !== sec.id) await secciones.sumarMatriculado(s.seccionId, -1, conn);
    if (s.seccionId !== sec.id) await secciones.sumarMatriculado(sec.id, 1, conn);
    await solicitudes.actualizarEstado(s.id, { estado: 'aprobada', observacion: '', seccionId: sec.id }, conn);
    if (!s.pago) await pagos.guardar(s.id, { estado: 'pendiente' }, conn);
    await solicitudes.registrar(s.id, `Aprobada: sección ${sec.nombre}, turno ${sec.turno.toLowerCase()}. Pendiente de pago de matrícula`, conn);
    return { id: s.id, seccionId: sec.id };
  });
  if (r.error) return res.status(r.status).json({ error: r.error });
  res.json({ solicitud: await solicitudes.obtener(r.id), seccion: await secciones.obtener(r.seccionId) });
});

// POST /api/solicitudes/:id/observar  y  /:id/rechazar — secretaría
for (const accion of ['observar', 'rechazar']) {
  router.post(`/:id/${accion}`, permitir('secretaria'), async (req, res) => {
    const texto = String(req.body?.texto || '').trim();
    const r = await transaccion(async (conn) => {
      const s = await solicitudes.obtener(String(req.params.id), conn, true);
      if (!s) return { status: 404, error: 'Solicitud no encontrada.' };
      if (s.pago?.estado === 'pagado') return { status: 409, error: 'La matrícula ya fue pagada; anúlala con un reembolso.' };
      if (texto.length < 5 || texto.length > 300 || !v.sinHtml(texto)) return { status: 400, error: 'Escribe el motivo (5 a 300 caracteres, sin < >).' };
      if (s.estado === 'aprobada' && s.seccionId) await secciones.sumarMatriculado(s.seccionId, -1, conn);
      const rech = accion === 'rechazar';
      await solicitudes.actualizarEstado(s.id, { estado: rech ? 'rechazada' : 'observada', observacion: texto, seccionId: null }, conn);
      await pagos.guardar(s.id, null, conn);
      await solicitudes.registrar(s.id, `${rech ? 'Rechazada' : 'Observada por secretaría'}: ${texto}`, conn);
      return { id: s.id };
    });
    if (r.error) return res.status(r.status).json({ error: r.error });
    res.json({ solicitud: await solicitudes.obtener(r.id), secciones: await secciones.listar() });
  });
}

module.exports = router;
