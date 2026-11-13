/* eslint-disable */
// Contraseña de las cuentas de demostración (se guarda con hash bcrypt en db.json)
const CLAVE_DEMO = process.env.CLAVE_DEMO || '123456';
// =====================================================================
// DATOS INICIALES (semilla) — se copian a data/db.json la primera vez que arranca la API
// =====================================================================

const institucion = {
  nombre: 'Institución Educativa Los Andes',
  lema: 'Educación de calidad para el Apurímac',
  direccion: 'Av. Núñez 245, Abancay – Apurímac',
  telefono: '(083) 321-456',
  email: 'informes@losandes.edu.pe',
  periodo: '2027',
  fechaInicioMatricula: '2026-09-15',
  fechaFinMatricula: '2027-03-15',
};

// Estructura genérica: Nivel → Grado/Ciclo → Sección
const niveles = [
  {
    id: 'inicial',
    nombre: 'Inicial',
    descripcion: 'Estimulación temprana y desarrollo integral para niños de 3 a 5 años.',
    etiquetaGrado: 'Edad',
    requiereApoderado: true,
    edadMin: 3,
    edadMax: 5,
    costoMatricula: 150,
    pension: 280,
    icono: 'bloques',
    imagen: 'inicial',
    requisitos: [
      'Partida de nacimiento (copia)',
      'DNI del alumno',
      'DNI del apoderado',
      'Tarjeta de vacunación',
      'Foto tamaño carné',
    ],
  },
  {
    id: 'primaria',
    nombre: 'Primaria',
    descripcion: 'Formación básica en comunicación, matemática, ciencia y valores.',
    etiquetaGrado: 'Grado',
    requiereApoderado: true,
    edadMin: 6,
    edadMax: 12,
    costoMatricula: 180,
    pension: 320,
    icono: 'libro',
    imagen: 'primaria',
    requisitos: [
      'DNI del alumno',
      'DNI del apoderado',
      'Certificado de estudios / Libreta del año anterior',
      'Constancia de no adeudo (si viene de otra IE)',
      'Foto tamaño carné',
    ],
  },
  {
    id: 'secundaria',
    nombre: 'Secundaria',
    descripcion: 'Preparación académica y orientación vocacional para la educación superior.',
    etiquetaGrado: 'Grado',
    requiereApoderado: true,
    edadMin: 11,
    edadMax: 17,
    costoMatricula: 200,
    pension: 350,
    icono: 'birrete',
    imagen: 'secundaria',
    requisitos: [
      'DNI del alumno',
      'DNI del apoderado',
      'Certificado de estudios de primaria o grado anterior',
      'Constancia de matrícula SIAGIE',
      'Foto tamaño carné',
    ],
  },
  {
    id: 'instituto',
    nombre: 'Instituto',
    descripcion: 'Carreras técnicas profesionales de 3 años con prácticas en empresas.',
    etiquetaGrado: 'Programa / Ciclo',
    requiereApoderado: false,
    edadMin: 16,
    edadMax: 99,
    costoMatricula: 250,
    pension: 420,
    icono: 'laptop',
    imagen: 'instituto',
    requisitos: [
      'DNI del postulante',
      'Certificado de estudios de secundaria completa',
      'Partida de nacimiento (copia)',
      'Foto tamaño carné',
    ],
  },
];

const grados = [
  // Inicial
  { id: 'ini-3', nivelId: 'inicial', nombre: '3 años', orden: 1 },
  { id: 'ini-4', nivelId: 'inicial', nombre: '4 años', orden: 2 },
  { id: 'ini-5', nivelId: 'inicial', nombre: '5 años', orden: 3 },
  // Primaria
  ...[1, 2, 3, 4, 5, 6].map((g) => ({ id: `pri-${g}`, nivelId: 'primaria', nombre: `${g}° grado`, orden: g })),
  // Secundaria
  ...[1, 2, 3, 4, 5].map((g) => ({ id: `sec-${g}`, nivelId: 'secundaria', nombre: `${g}° año`, orden: g })),
  // Instituto
  { id: 'ins-comp-1', nivelId: 'instituto', nombre: 'Computación e Informática – Ciclo I', orden: 1 },
  { id: 'ins-cont-1', nivelId: 'instituto', nombre: 'Contabilidad – Ciclo I', orden: 2 },
  { id: 'ins-enf-1', nivelId: 'instituto', nombre: 'Enfermería Técnica – Ciclo I', orden: 3 },
];

// Secciones con vacantes. Generadas para que haya datos en todos los grados.
const turnosPorNivel = { inicial: ['Mañana'], primaria: ['Mañana'], secundaria: ['Mañana', 'Tarde'], instituto: ['Mañana', 'Noche'] };
const capacidad = { inicial: 20, primaria: 30, secundaria: 32, instituto: 35 };

const seccionesIniciales = grados.flatMap((g, i) => {
  const turnos = turnosPorNivel[g.nivelId];
  const letras = g.nivelId === 'instituto' ? ['A'] : ['A', 'B'];
  return letras.flatMap((letra, j) =>
    turnos.slice(0, j === 0 ? turnos.length : 1).map((turno, k) => {
      const cap = capacidad[g.nivelId];
      const ocupadas = Math.min(cap, Math.round(cap * (0.45 + ((i * 7 + j * 3 + k * 5) % 10) / 20)));
      return {
        id: `${g.id}-${letra}-${turno[0]}`,
        gradoId: g.id,
        nombre: letra,
        turno,
        capacidad: cap,
        matriculados: ocupadas,
      };
    }),
  );
});

// Usuarios de demostración. Al sembrar la base, la clave se reemplaza por su hash bcrypt.
const usuarios = [
  { id: 'u1', email: 'apoderado@demo.pe', clave: CLAVE_DEMO, nombre: 'Rosa Quispe Huamán', dni: '45879632', rol: 'apoderado' },
  { id: 'u2', email: 'alumno@demo.pe', clave: CLAVE_DEMO, nombre: 'Kevin Huillca Soto', dni: '74125896', rol: 'apoderado' },
  { id: 'u3', email: 'secretaria@demo.pe', clave: CLAVE_DEMO, nombre: 'Lucía Mendoza Ayala', dni: '41236985', rol: 'secretaria' },
  { id: 'u4', email: 'director@demo.pe', clave: CLAVE_DEMO, nombre: 'Jorge Palomino Rivas', dni: '31258746', rol: 'director' },
];

const ESTADOS = {
  pendiente: { texto: 'Pendiente', color: 'amber' },
  observada: { texto: 'Observada', color: 'orange' },
  aprobada: { texto: 'Aprobada', color: 'green' },
  rechazada: { texto: 'Rechazada', color: 'red' },
};

const solicitudesBase = [
  {
    id: 'MAT-2027-0001',
    usuarioId: 'u1',
    fecha: '2026-09-26',
    nivelId: 'primaria',
    gradoId: 'pri-3',
    seccionId: 'pri-3-A-M',
    estado: 'aprobada',
    observacion: '',
    alumno: { dni: '78945612', nombres: 'Mateo', apellidos: 'Quispe Huamán', fechaNacimiento: '2019-04-12', sexo: 'M', direccion: 'Jr. Lima 120, Tamburco' },
    apoderado: { dni: '45879632', nombres: 'Rosa Quispe Huamán', parentesco: 'Madre', telefono: '987654321', email: 'apoderado@demo.pe' },
    documentos: ['DNI del alumno', 'DNI del apoderado', 'Certificado de estudios / Libreta del año anterior', 'Foto tamaño carné'],
  },
  {
    id: 'MAT-2027-0002',
    usuarioId: 'u1',
    fecha: '2026-09-28',
    nivelId: 'inicial',
    gradoId: 'ini-4',
    seccionId: null,
    estado: 'observada',
    observacion: 'Falta adjuntar la tarjeta de vacunación actualizada.',
    alumno: { dni: '91234567', nombres: 'Valentina', apellidos: 'Quispe Huamán', fechaNacimiento: '2022-09-03', sexo: 'F', direccion: 'Jr. Lima 120, Tamburco' },
    apoderado: { dni: '45879632', nombres: 'Rosa Quispe Huamán', parentesco: 'Madre', telefono: '987654321', email: 'apoderado@demo.pe' },
    documentos: ['Partida de nacimiento (copia)', 'DNI del alumno', 'DNI del apoderado', 'Foto tamaño carné'],
  },
  {
    id: 'MAT-2027-0003',
    usuarioId: 'u2',
    fecha: '2026-09-30',
    nivelId: 'instituto',
    gradoId: 'ins-comp-1',
    seccionId: null,
    estado: 'pendiente',
    observacion: '',
    alumno: { dni: '74125896', nombres: 'Kevin', apellidos: 'Huillca Soto', fechaNacimiento: '2008-02-21', sexo: 'M', direccion: 'Av. Arenas 540, Abancay' },
    apoderado: null,
    documentos: ['DNI del postulante', 'Certificado de estudios de secundaria completa', 'Partida de nacimiento (copia)', 'Foto tamaño carné'],
  },
  {
    id: 'MAT-2027-0004',
    usuarioId: 'u9',
    fecha: '2026-10-01',
    nivelId: 'secundaria',
    gradoId: 'sec-1',
    seccionId: null,
    estado: 'pendiente',
    observacion: '',
    alumno: { dni: '76543219', nombres: 'Camila', apellidos: 'Ccahuana Rojas', fechaNacimiento: '2015-06-30', sexo: 'F', direccion: 'Psje. Los Pinos 33, Abancay' },
    apoderado: { dni: '42587413', nombres: 'Wilber Ccahuana Pérez', parentesco: 'Padre', telefono: '956321478', email: 'wilber.cc@gmail.com' },
    documentos: ['DNI del alumno', 'DNI del apoderado', 'Certificado de estudios de primaria o grado anterior', 'Constancia de matrícula SIAGIE', 'Foto tamaño carné'],
  },
  {
    id: 'MAT-2027-0005',
    usuarioId: 'u9',
    fecha: '2026-10-02',
    nivelId: 'secundaria',
    gradoId: 'sec-4',
    seccionId: 'sec-4-A-T',
    estado: 'aprobada',
    observacion: '',
    alumno: { dni: '73214569', nombres: 'Diego', apellidos: 'Ccahuana Rojas', fechaNacimiento: '2012-11-15', sexo: 'M', direccion: 'Psje. Los Pinos 33, Abancay' },
    apoderado: { dni: '42587413', nombres: 'Wilber Ccahuana Pérez', parentesco: 'Padre', telefono: '956321478', email: 'wilber.cc@gmail.com' },
    documentos: ['DNI del alumno', 'DNI del apoderado', 'Certificado de estudios de primaria o grado anterior', 'Constancia de matrícula SIAGIE', 'Foto tamaño carné'],
  },
  {
    id: 'MAT-2027-0006',
    usuarioId: 'u8',
    fecha: '2026-10-03',
    nivelId: 'instituto',
    gradoId: 'ins-enf-1',
    seccionId: null,
    estado: 'rechazada',
    observacion: 'El certificado de secundaria presentado no es válido.',
    alumno: { dni: '72589634', nombres: 'Yesenia', apellidos: 'Taipe Condori', fechaNacimiento: '2007-03-08', sexo: 'F', direccion: 'Av. Díaz Bárcenas 210, Abancay' },
    apoderado: null,
    documentos: ['DNI del postulante', 'Certificado de estudios de secundaria completa', 'Foto tamaño carné'],
  },
  {
    id: 'MAT-2027-0007',
    usuarioId: 'u8',
    fecha: '2026-10-04',
    nivelId: 'primaria',
    gradoId: 'pri-1',
    seccionId: null,
    estado: 'pendiente',
    observacion: '',
    alumno: { dni: '93652147', nombres: 'Thiago', apellidos: 'Sánchez Loayza', fechaNacimiento: '2021-01-19', sexo: 'M', direccion: 'Urb. Santa Rosa Mz. B Lt. 4, Abancay' },
    apoderado: { dni: '46325871', nombres: 'Milagros Loayza Vargas', parentesco: 'Madre', telefono: '974125836', email: 'mila.lv@hotmail.com' },
    documentos: ['DNI del alumno', 'DNI del apoderado', 'Foto tamaño carné'],
  },
];

// ---------------------------------------------------------------------
// Solicitudes adicionales generadas (determinísticas) para que los
// reportes y tablas tengan volumen realista
// ---------------------------------------------------------------------
const NOMBRES_M = ['Santiago', 'Mateo', 'Liam', 'Sebastián', 'Gael', 'Thiago', 'Adrián', 'Joaquín', 'Dylan', 'Fabricio', 'Jhon', 'Rodrigo', 'Alexander', 'Iker'];
const NOMBRES_F = ['Valeria', 'Camila', 'Luciana', 'Ximena', 'Mía', 'Antonella', 'Danna', 'Kiara', 'Abigail', 'Nicole', 'Fernanda', 'Brenda', 'Yuliana', 'Ariana'];
const APELLIDOS = ['Quispe', 'Huamán', 'Mamani', 'Condori', 'Ccahuana', 'Huillca', 'Soto', 'Palomino', 'Vargas', 'Rojas', 'Taipe', 'Ayala', 'Loayza', 'Chipana', 'Sullca', 'Ferro', 'Pumacayo', 'Gutiérrez'];
const CALLES = ['Jr. Lima', 'Av. Arenas', 'Av. Núñez', 'Jr. Cusco', 'Av. Díaz Bárcenas', 'Psje. Los Pinos', 'Jr. Apurímac', 'Av. Seoane'];
const PARENTESCOS = ['Madre', 'Padre', 'Madre', 'Padre', 'Abuelo(a)', 'Tío(a)'];

function rng(seed) {
  let x = seed;
  return () => { x = (x * 9301 + 49297) % 233280; return x / 233280; };
}

function generarSolicitudes(cantidad, desde) {
  const r = rng(2027);
  const pick = (arr) => arr[Math.floor(r() * arr.length)];
  const inicio = new Date('2026-09-15T00:00:00');
  const lista = [];
  for (let i = 0; i < cantidad; i++) {
    const g = pick(grados);
    const nivel = niveles.find((n) => n.id === g.nivelId);
    const sexo = r() > 0.5 ? 'M' : 'F';
    const ap1 = pick(APELLIDOS); const ap2 = pick(APELLIDOS);
    const edadBase = { inicial: 3 + g.orden - 1, primaria: 5 + g.orden, secundaria: 11 + g.orden, instituto: 17 + Math.floor(r() * 6) }[g.nivelId];
    const nac = `${2027 - edadBase - 1}-${String(1 + Math.floor(r() * 12)).padStart(2, '0')}-${String(1 + Math.floor(r() * 28)).padStart(2, '0')}`;
    const dia = new Date(inicio); dia.setDate(inicio.getDate() + Math.floor(Math.pow(r(), 0.7) * 30));
    const fecha = dia.toISOString().slice(0, 10);
    const t = r();
    const estado = t < 0.5 ? 'aprobada' : t < 0.78 ? 'pendiente' : t < 0.92 ? 'observada' : 'rechazada';
    const docs = estado === 'observada' ? nivel.requisitos.slice(0, -1) : nivel.requisitos;
    const dniAl = String(70000000 + Math.floor(r() * 9999999));
    const parentesco = pick(PARENTESCOS);
    const apNombre = `${pick(parentesco === 'Padre' ? NOMBRES_M : parentesco === 'Madre' ? NOMBRES_F : r() > 0.5 ? NOMBRES_M : NOMBRES_F)} ${parentesco === 'Padre' ? ap1 : ap2} ${pick(APELLIDOS)}`;
    lista.push({
      id: `MAT-2027-${String(desde + i).padStart(4, '0')}`,
      usuarioId: `ux${i}`,
      fecha,
      nivelId: g.nivelId,
      gradoId: g.id,
      seccionId: estado === 'aprobada' ? `${g.id}-A-M` : null,
      estado,
      observacion: estado === 'observada' ? `Falta adjuntar: ${nivel.requisitos[nivel.requisitos.length - 1]}.` : estado === 'rechazada' ? 'La edad del alumno no corresponde al grado solicitado.' : '',
      alumno: { dni: dniAl, nombres: pick(sexo === 'M' ? NOMBRES_M : NOMBRES_F), apellidos: `${ap1} ${ap2}`, fechaNacimiento: nac, sexo, direccion: `${pick(CALLES)} ${100 + Math.floor(r() * 800)}, Abancay` },
      apoderado: nivel.requiereApoderado
        ? { dni: String(40000000 + Math.floor(r() * 9999999)), nombres: apNombre, parentesco, telefono: `9${String(Math.floor(r() * 99999999)).padStart(8, '0')}`, email: `${apNombre.split(' ')[0].toLowerCase()}.${apNombre.split(" ")[1].toLowerCase()}@gmail.com`.normalize('NFD').replace(/[\u0300-\u036f]/g, '') }
        : null,
      documentos: docs,
    });
  }
  return lista;
}

// Historial de cada solicitud (para la línea de tiempo)
function conHistorial(s) {
  const h = [{ fecha: s.fecha, texto: 'Solicitud enviada' }];
  const sig = (dias) => { const d = new Date(`${s.fecha}T00:00:00`); d.setDate(d.getDate() + dias); return d.toISOString().slice(0, 10); };
  if (s.estado === 'observada') h.push({ fecha: sig(1), texto: `Observada por secretaría: ${s.observacion}` });
  if (s.estado === 'aprobada') h.push({ fecha: sig(2), texto: 'Aprobada y sección asignada' });
  if (s.estado === 'rechazada') h.push({ fecha: sig(1), texto: `Rechazada: ${s.observacion}` });
  return { ...s, historial: s.historial || h };
}

const solicitudesIniciales = [...solicitudesBase, ...generarSolicitudes(38, solicitudesBase.length + 1)]
  .map(conHistorial)
  .sort((a, b) => b.fecha.localeCompare(a.fecha));


// Helpers
const getNivel = (id) => niveles.find((n) => n.id === id);
const getGrado = (id) => grados.find((g) => g.id === id);
const gradosDeNivel = (nivelId) => grados.filter((g) => g.nivelId === nivelId).sort((a, b) => a.orden - b.orden);

const calcularEdad = (fechaNacimiento, referencia = `${institucion.periodo}-03-31`) => {
  if (!fechaNacimiento) return null;
  const n = new Date(fechaNacimiento);
  const r = new Date(referencia);
  let edad = r.getFullYear() - n.getFullYear();
  const m = r.getMonth() - n.getMonth();
  if (m < 0 || (m === 0 && r.getDate() < n.getDate())) edad--;
  return edad;
};

const formatearFecha = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

module.exports = { institucion, niveles, grados, seccionesIniciales, usuarios, solicitudesIniciales, getNivel, getGrado, calcularEdad };
