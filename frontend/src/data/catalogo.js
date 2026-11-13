// =====================================================================
// CATÁLOGO (V2) — Estructura fija de niveles y grados que usa la interfaz.
// Los datos que cambian (solicitudes, secciones, costos, institución, usuarios)
// vienen de la API Express (ver src/api.js y src/context/DataContext.jsx).
// =====================================================================

// Valores iniciales mientras responde la API
export const institucion = {
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
export const niveles = [
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

export const grados = [
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

export const ESTADOS = {
  pendiente: { texto: 'Pendiente', color: 'amber' },
  observada: { texto: 'Observada', color: 'orange' },
  aprobada: { texto: 'Aprobada', color: 'green' },
  rechazada: { texto: 'Rechazada', color: 'red' },
};

// Estados del pago de la matrícula
export const ESTADOS_PAGO = {
  pendiente: { texto: 'Pago pendiente', color: 'amber' },
  procesando: { texto: 'Procesando pago', color: 'blue' },
  por_confirmar: { texto: 'Pago por confirmar', color: 'blue' },
  fallido: { texto: 'Pago rechazado', color: 'red' },
  pagado: { texto: 'Pagado', color: 'green' },
};

export const PREGUNTAS_FRECUENTES = [
  { p: '¿Puedo matricular a más de un hijo con la misma cuenta?', r: 'Sí. Desde "Nueva matrícula" registras una solicitud por cada hijo y todas aparecen en tu panel.' },
  { p: '¿Qué pasa si me falta un documento?', r: 'Puedes enviar la solicitud igual. Secretaría la marcará como observada y desde tu panel adjuntas lo que falta sin volver a llenar todo.' },
  { p: '¿Cuánto demora la revisión?', r: 'Secretaría revisa las solicitudes en un máximo de 48 horas hábiles. Recibes el estado en tu panel y en la consulta de la página de inicio.' },
  { p: '¿Cómo pago la matrícula?', r: 'Cuando tu solicitud sea aprobada, entra a su detalle y paga en línea con tarjeta de crédito o débito, o con Yape, a través de Culqi. El pago se confirma al instante y tu constancia queda lista para imprimir. También puedes pagar en caja del colegio.' },
  { p: '¿Los postulantes al instituto necesitan apoderado?', r: 'No. Los postulantes al instituto son mayores de 16 años y hacen el trámite por su cuenta.' },
  { p: '¿Puedo cambiar de sección o turno después?', r: 'Sí, si hay vacantes. Solicítalo en secretaría; el cambio se refleja en tu constancia.' },
];

// Helpers
export const getNivel = (id) => niveles.find((n) => n.id === id);
export const getGrado = (id) => grados.find((g) => g.id === id);
export const gradosDeNivel = (nivelId) => grados.filter((g) => g.nivelId === nivelId).sort((a, b) => a.orden - b.orden);

export const calcularEdad = (fechaNacimiento, referencia = `${institucion.periodo}-03-31`) => {
  if (!fechaNacimiento) return null;
  const n = new Date(fechaNacimiento);
  const r = new Date(referencia);
  let edad = r.getFullYear() - n.getFullYear();
  const m = r.getMonth() - n.getMonth();
  if (m < 0 || (m === 0 && r.getDate() < n.getDate())) edad--;
  return edad;
};

export const formatearFecha = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};
