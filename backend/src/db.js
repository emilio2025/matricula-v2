// =====================================================================
// Acceso a datos: MySQL con mysql2 (pool de conexiones).
// TODAS las consultas son parametrizadas (marcadores ?): los datos del usuario
// nunca se concatenan dentro del SQL, así se evita la inyección SQL.
// La conexión se configura en .env (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME).
// =====================================================================
const mysql = require('mysql2/promise');
const semilla = require('./datos/semilla');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'matricula_db',
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true, // las fechas DATE llegan como 'AAAA-MM-DD'
  decimalNumbers: true, // DECIMAL llega como número
  charset: 'utf8mb4',
});

const hoy = () => new Date().toISOString().slice(0, 10);

// Ejecuta varias operaciones en una transacción (todo o nada)
async function transaccion(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const r = await fn(conn);
    await conn.commit();
    return r;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

const q = async (sql, params = [], conn = pool) => (await conn.query(sql, params))[0];

// ----------------------------------------------------------------- usuarios
const mapUsuario = (r) => r && ({ id: r.id, nombre: r.nombre, dni: r.dni, email: r.email, telefono: r.telefono, rol: r.rol, passwordHash: r.password_hash });

const usuarios = {
  async porEmail(email) {
    return mapUsuario((await q('SELECT * FROM usuarios WHERE LOWER(email) = LOWER(?)', [email]))[0]);
  },
  async porId(id) {
    return mapUsuario((await q('SELECT * FROM usuarios WHERE id = ?', [id]))[0]);
  },
  async emailUsadoPorOtro(email, idExcluir = '') {
    return (await q('SELECT 1 FROM usuarios WHERE LOWER(email) = LOWER(?) AND id <> ? LIMIT 1', [email, idExcluir])).length > 0;
  },
  async crear(u) {
    await q('INSERT INTO usuarios (id, nombre, dni, email, telefono, rol, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?)', [u.id, u.nombre, u.dni, u.email, u.telefono || '', u.rol, u.passwordHash]);
  },
  async actualizarPerfil(id, { nombre, email, telefono }) {
    await q('UPDATE usuarios SET nombre = ?, email = ?, telefono = ? WHERE id = ?', [nombre, email, telefono, id]);
  },
  async actualizarPassword(id, passwordHash) {
    await q('UPDATE usuarios SET password_hash = ? WHERE id = ?', [passwordHash, id]);
  },
};

// ------------------------------------------------------ institución y costos
const institucion = {
  async obtener(conn = pool) {
    const r = (await q('SELECT * FROM institucion WHERE id = 1', [], conn))[0];
    return { nombre: r.nombre, lema: r.lema, direccion: r.direccion, telefono: r.telefono, email: r.email, periodo: r.periodo, fechaInicioMatricula: r.fecha_inicio_matricula, fechaFinMatricula: r.fecha_fin_matricula };
  },
  async guardar(i) {
    await q(
      'UPDATE institucion SET nombre = ?, lema = ?, direccion = ?, telefono = ?, email = ?, periodo = ?, fecha_inicio_matricula = ?, fecha_fin_matricula = ? WHERE id = 1',
      [i.nombre, i.lema, i.direccion, i.telefono, i.email, i.periodo, i.fechaInicioMatricula, i.fechaFinMatricula],
    );
  },
};

const costos = {
  async obtener(conn = pool) {
    const filas = await q('SELECT nivel_id, matricula, pension FROM costos', [], conn);
    return Object.fromEntries(filas.map((f) => [f.nivel_id, { matricula: f.matricula, pension: f.pension }]));
  },
  async guardar(mapa) {
    await transaccion(async (conn) => {
      for (const [nivelId, c] of Object.entries(mapa)) {
        await q('UPDATE costos SET matricula = ?, pension = ? WHERE nivel_id = ?', [c.matricula, c.pension, nivelId], conn);
      }
    });
  },
  // Monto de la matrícula en céntimos (lo que se cobra)
  async matriculaCentimos(nivelId, conn = pool) {
    const r = (await q('SELECT matricula FROM costos WHERE nivel_id = ?', [nivelId], conn))[0];
    return Math.round(r.matricula * 100);
  },
};

// ---------------------------------------------------------------- secciones
const mapSeccion = (r) => r && ({ id: r.id, gradoId: r.grado_id, nombre: r.nombre, turno: r.turno, capacidad: r.capacidad, matriculados: r.matriculados });

const secciones = {
  async listar(conn = pool) {
    return (await q('SELECT * FROM secciones ORDER BY id', [], conn)).map(mapSeccion);
  },
  async obtener(id, conn = pool, bloquear = false) {
    return mapSeccion((await q(`SELECT * FROM secciones WHERE id = ?${bloquear ? ' FOR UPDATE' : ''}`, [id], conn))[0]);
  },
  async vacantesDelGrado(gradoId) {
    const r = (await q('SELECT COALESCE(SUM(GREATEST(capacidad - matriculados, 0)), 0) AS libres FROM secciones WHERE grado_id = ?', [gradoId]))[0];
    return Number(r.libres);
  },
  async actualizarCapacidad(id, capacidad) {
    await q('UPDATE secciones SET capacidad = ? WHERE id = ?', [capacidad, id]);
  },
  async sumarMatriculado(id, delta, conn) {
    await q('UPDATE secciones SET matriculados = matriculados + ? WHERE id = ?', [delta, id], conn);
  },
};

// -------------------------------------------------------------- solicitudes
const mapPago = (p) => p && Object.fromEntries(Object.entries({
  estado: p.estado, canal: p.canal, proveedor: p.proveedor, monto: p.monto, moneda: p.moneda, fecha: p.fecha,
  cargoId: p.cargo_id, referencia: p.referencia, tarjeta: p.tarjeta, marca: p.marca, intento: p.intento,
  preferenciaId: p.preferencia_id, codigo: p.codigo, ultimoError: p.ultimo_error, detalle: p.detalle,
  desde: p.desde === null || p.desde === undefined ? null : Number(p.desde),
}).filter(([, v]) => v !== null && v !== undefined));

function armarSolicitud(r, docs, hist, pago) {
  return {
    id: r.id,
    usuarioId: r.usuario_id,
    fecha: r.fecha,
    nivelId: r.nivel_id,
    gradoId: r.grado_id,
    seccionId: r.seccion_id,
    estado: r.estado,
    observacion: r.observacion,
    alumno: { dni: r.alumno_dni, nombres: r.alumno_nombres, apellidos: r.alumno_apellidos, fechaNacimiento: r.alumno_fecha_nacimiento, sexo: r.alumno_sexo, direccion: r.alumno_direccion },
    apoderado: r.apoderado_dni ? { dni: r.apoderado_dni, nombres: r.apoderado_nombres, parentesco: r.apoderado_parentesco, telefono: r.apoderado_telefono, email: r.apoderado_email } : null,
    documentos: docs,
    historial: hist,
    pago: mapPago(pago) || null,
  };
}

// Carga solicitudes completas (con documentos, historial y pago) según un filtro fijo
async function cargarSolicitudes(where, params, conn = pool, bloquear = false) {
  const filas = await q(`SELECT * FROM solicitudes ${where} ORDER BY fecha DESC, id DESC${bloquear ? ' FOR UPDATE' : ''}`, params, conn);
  if (!filas.length) return [];
  const ids = filas.map((f) => f.id);
  const docs = await q('SELECT solicitud_id, nombre FROM documentos_solicitud WHERE solicitud_id IN (?) ORDER BY id', [ids], conn);
  const hist = await q('SELECT solicitud_id, fecha, texto FROM historial_solicitud WHERE solicitud_id IN (?) ORDER BY fecha, id', [ids], conn);
  const pagosF = await q(`SELECT * FROM pagos WHERE solicitud_id IN (?)${bloquear ? ' FOR UPDATE' : ''}`, [ids], conn);
  return filas.map((f) => armarSolicitud(
    f,
    docs.filter((d) => d.solicitud_id === f.id).map((d) => d.nombre),
    hist.filter((h) => h.solicitud_id === f.id).map((h) => ({ fecha: h.fecha, texto: h.texto })),
    pagosF.find((p) => p.solicitud_id === f.id),
  ));
}

const solicitudes = {
  listar(usuarioId = null) {
    return usuarioId ? cargarSolicitudes('WHERE usuario_id = ?', [usuarioId]) : cargarSolicitudes('', []);
  },
  async obtener(id, conn = pool, bloquear = false) {
    return (await cargarSolicitudes('WHERE id = ?', [id], conn, bloquear))[0] || null;
  },
  async buscarPorCodigoODni(valor) {
    return (await cargarSolicitudes('WHERE id = ? OR alumno_dni = ?', [valor, valor]))[0] || null;
  },
  async existeActivaParaDni(dni) {
    return (await q("SELECT 1 FROM solicitudes WHERE alumno_dni = ? AND estado <> 'rechazada' LIMIT 1", [dni])).length > 0;
  },
  async siguienteId(periodo, conn = pool) {
    const r = (await q('SELECT COALESCE(MAX(CAST(RIGHT(id, 4) AS UNSIGNED)), 0) AS n FROM solicitudes FOR UPDATE', [], conn))[0];
    return `MAT-${periodo}-${String(Number(r.n) + 1).padStart(4, '0')}`;
  },
  async crear(s, conn) {
    await q(
      `INSERT INTO solicitudes (id, usuario_id, fecha, nivel_id, grado_id, seccion_id, estado, observacion,
        alumno_dni, alumno_nombres, alumno_apellidos, alumno_fecha_nacimiento, alumno_sexo, alumno_direccion,
        apoderado_dni, apoderado_nombres, apoderado_parentesco, apoderado_telefono, apoderado_email)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [s.id, s.usuarioId, s.fecha, s.nivelId, s.gradoId, s.seccionId, s.estado, s.observacion,
        s.alumno.dni, s.alumno.nombres, s.alumno.apellidos, s.alumno.fechaNacimiento, s.alumno.sexo, s.alumno.direccion,
        s.apoderado?.dni ?? null, s.apoderado?.nombres ?? null, s.apoderado?.parentesco ?? null, s.apoderado?.telefono ?? null, s.apoderado?.email ?? null],
      conn,
    );
    for (const d of s.documentos) await solicitudes.agregarDocumento(s.id, d, conn);
    for (const h of s.historial) await solicitudes.registrar(s.id, h.texto, conn, h.fecha);
  },
  async actualizarEstado(id, { estado, observacion, seccionId }, conn = pool) {
    await q('UPDATE solicitudes SET estado = ?, observacion = ?, seccion_id = ? WHERE id = ?', [estado, observacion, seccionId, id], conn);
  },
  async agregarDocumento(id, nombre, conn = pool) {
    await q('INSERT IGNORE INTO documentos_solicitud (solicitud_id, nombre) VALUES (?, ?)', [id, nombre], conn);
  },
  async registrar(id, texto, conn = pool, fecha = hoy()) {
    await q('INSERT INTO historial_solicitud (solicitud_id, fecha, texto) VALUES (?, ?, ?)', [id, fecha, String(texto).slice(0, 300)], conn);
  },
};

// -------------------------------------------------------------------- pagos
const COLUMNAS_PAGO = {
  estado: 'estado', canal: 'canal', proveedor: 'proveedor', monto: 'monto', moneda: 'moneda', fecha: 'fecha', cargoId: 'cargo_id',
  referencia: 'referencia', tarjeta: 'tarjeta', marca: 'marca', intento: 'intento', preferenciaId: 'preferencia_id', codigo: 'codigo',
  ultimoError: 'ultimo_error', detalle: 'detalle', desde: 'desde',
};
const CAMPOS_PAGO = Object.keys(COLUMNAS_PAGO);

const pagos = {
  // Reemplaza el pago de una solicitud (pago = null lo elimina)
  async guardar(solicitudId, pago, conn = pool) {
    if (!pago) { await q('DELETE FROM pagos WHERE solicitud_id = ?', [solicitudId], conn); return; }
    const valores = CAMPOS_PAGO.map((c) => {
      const v = pago[c];
      if (v === undefined || v === null) return null;
      if (typeof v === 'string') return v.slice(0, 200);
      if (typeof v === 'object') return JSON.stringify(v).slice(0, 200);
      return v;
    });
    await q(
      `REPLACE INTO pagos (solicitud_id, ${CAMPOS_PAGO.map((c) => COLUMNAS_PAGO[c]).join(', ')}) VALUES (?, ${CAMPOS_PAGO.map(() => '?').join(', ')})`,
      [solicitudId, ...valores],
      conn,
    );
  },
  async recuperarProcesando() {
    const r = await q("UPDATE pagos SET estado = 'por_confirmar' WHERE estado = 'procesando'");
    return r.affectedRows;
  },
  async reporte() {
    const filas = await q(`SELECT p.*, s.nivel_id, s.alumno_nombres, s.alumno_apellidos
              FROM pagos p JOIN solicitudes s ON s.id = p.solicitud_id
              ORDER BY p.actualizado_en DESC`);
    return filas.map((f) => ({ solicitudId: f.solicitud_id, alumno: `${f.alumno_apellidos}, ${f.alumno_nombres}`, nivelId: f.nivel_id, ...mapPago(f) }));
  },
};

// ------------------------------------------------------ antifraude y webhooks
const intentos = {
  async registrar({ usuarioId, solicitudId, codigo }, conn = pool) {
    await q('INSERT INTO intentos_pago (usuario_id, solicitud_id, ts, codigo) VALUES (?, ?, ?, ?)', [usuarioId, solicitudId, Date.now(), codigo ? String(codigo).slice(0, 60) : null], conn);
  },
  async recientes(usuarioId) {
    const r = (await q('SELECT COUNT(*) AS n FROM intentos_pago WHERE usuario_id = ? AND ts > ?', [usuarioId, Date.now() - 3600_000]))[0];
    return Number(r.n);
  },
};

const eventos = {
  async yaProcesado(id) {
    return (await q('SELECT 1 FROM eventos_procesados WHERE id = ?', [String(id).slice(0, 120)])).length > 0;
  },
  async marcar(id, conn = pool) {
    await q('INSERT IGNORE INTO eventos_procesados (id) VALUES (?)', [String(id).slice(0, 120)], conn);
  },
};

async function verificarConexion() {
  await q('SELECT 1 FROM usuarios LIMIT 1');
}

module.exports = {
  pool, transaccion, verificarConexion, hoy,
  usuarios, institucion, costos, secciones, solicitudes, pagos, intentos, eventos,
  catalogo: { niveles: semilla.niveles, grados: semilla.grados },
  getNivel: semilla.getNivel, getGrado: semilla.getGrado, calcularEdad: semilla.calcularEdad,
};
