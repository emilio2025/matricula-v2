// Genera database/datos.sql a partir de la semilla (src/datos/semilla.js).
// Las contraseñas se convierten a hash bcrypt ANTES de escribirse: el archivo
// SQL nunca contiene la contraseña en texto plano.
// Uso: npm run db:generar
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { format } = require('mysql2');
const semilla = require('../src/datos/semilla');

const L = [];
const ins = (tabla, filas) => {
  if (!filas.length) return;
  const cols = Object.keys(filas[0]);
  L.push(`INSERT INTO ${tabla} (${cols.join(', ')}) VALUES`);
  L.push(filas.map((f) => format(`  (${cols.map(() => '?').join(', ')})`, cols.map((c) => f[c]))).join(',\n') + ';\n');
};

L.push('-- =====================================================================');
L.push('-- Datos iniciales del Sistema de Matrícula (generado con: npm run db:generar)');
L.push('-- Las contraseñas están guardadas como hash bcrypt (costo 10).');
L.push('-- Contraseña de las cuentas de demostración: 123456 (solo para pruebas).');
L.push('-- =====================================================================\n');
L.push('USE matricula_db;\n');

ins('usuarios', semilla.usuarios.map((u) => ({
  id: u.id, nombre: u.nombre, dni: u.dni, email: u.email, telefono: '', rol: u.rol,
  password_hash: bcrypt.hashSync(u.clave, 10),
})));

const i = semilla.institucion;
ins('institucion', [{ id: 1, nombre: i.nombre, lema: i.lema, direccion: i.direccion, telefono: i.telefono, email: i.email, periodo: i.periodo, fecha_inicio_matricula: i.fechaInicioMatricula, fecha_fin_matricula: i.fechaFinMatricula }]);

const costos = Object.fromEntries(semilla.niveles.map((n) => [n.id, n.costoMatricula]));
ins('costos', semilla.niveles.map((n) => ({ nivel_id: n.id, matricula: n.costoMatricula, pension: n.pension })));

ins('secciones', semilla.seccionesIniciales.map((s) => ({ id: s.id, grado_id: s.gradoId, nombre: s.nombre, turno: s.turno, capacidad: s.capacidad, matriculados: s.matriculados })));

const sol = semilla.solicitudesIniciales;
ins('solicitudes', sol.map((s) => ({
  id: s.id, usuario_id: s.usuarioId, fecha: s.fecha, nivel_id: s.nivelId, grado_id: s.gradoId, seccion_id: s.seccionId, estado: s.estado, observacion: s.observacion || '',
  alumno_dni: s.alumno.dni, alumno_nombres: s.alumno.nombres, alumno_apellidos: s.alumno.apellidos, alumno_fecha_nacimiento: s.alumno.fechaNacimiento, alumno_sexo: s.alumno.sexo, alumno_direccion: s.alumno.direccion,
  apoderado_dni: s.apoderado?.dni ?? null, apoderado_nombres: s.apoderado?.nombres ?? null, apoderado_parentesco: s.apoderado?.parentesco ?? null, apoderado_telefono: s.apoderado?.telefono ?? null, apoderado_email: s.apoderado?.email ?? null,
})));

ins('documentos_solicitud', sol.flatMap((s) => [...new Set(s.documentos)].map((d) => ({ solicitud_id: s.id, nombre: d }))));
ins('historial_solicitud', sol.flatMap((s) => s.historial.map((h) => ({ solicitud_id: s.id, fecha: h.fecha, texto: h.texto }))));

// Aprobadas: la mayoría pagó en caja (antes del sistema en línea); algunas quedan pendientes de pago
ins('pagos', sol.map((s, idx) => ({ s, idx })).filter(({ s }) => s.estado === 'aprobada').map(({ s, idx }) => {
  const pendiente = s.id === 'MAT-2027-0001' || idx % 4 === 0;
  const base = { solicitud_id: s.id, estado: 'pendiente', canal: null, monto: null, moneda: null, fecha: null, referencia: null };
  return pendiente ? base : { ...base, estado: 'pagado', canal: 'caja', monto: costos[s.nivelId] * 100, moneda: 'PEN', fecha: s.historial.at(-1).fecha, referencia: `CAJA-${s.id.slice(-4)}` };
}));

const salida = path.join(__dirname, '..', 'database', 'datos.sql');
fs.writeFileSync(salida, L.join('\n'), 'utf8');
console.log(`Generado ${salida}`);
