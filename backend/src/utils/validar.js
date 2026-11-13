// Validación de datos con la librería zod. El servidor nunca confía en lo que envía el navegador.
// Cada regla es un esquema zod; las rutas usan estas funciones o los esquemas completos de abajo.
const { z } = require('zod');

const esquemas = {
  dni: z.string().regex(/^\d{8}$/, 'El DNI debe tener 8 dígitos.'),
  email: z.string().trim().max(120).email('Correo no válido.'),
  celular: z.string().regex(/^9\d{8}$/, 'Celular de 9 dígitos que empiece con 9.'),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((v) => !Number.isNaN(Date.parse(v)), 'Fecha no válida.'),
  sinHtml: z.string().refine((v) => !/[<>]/.test(v), 'No se permiten etiquetas HTML (< >).'),
  password: z.string().min(6, 'La contraseña debe tener entre 6 y 72 caracteres.').max(72, 'La contraseña debe tener entre 6 y 72 caracteres.'),
};
const nombre = z.string().trim().min(5, 'Escribe tus nombres y apellidos.').max(80).pipe(esquemas.sinHtml);

// Esquemas de los cuerpos (body) de las peticiones
esquemas.login = z.object({
  email: esquemas.email,
  password: z.string().min(1, 'Ingresa tu correo y contraseña.').max(72),
});
esquemas.registro = z.object({
  nombre,
  dni: esquemas.dni,
  email: esquemas.email,
  password: esquemas.password,
});
esquemas.perfil = z.object({
  nombre,
  email: esquemas.email,
  telefono: z.union([z.literal(''), esquemas.celular]).optional(),
});

// Funciones cortas (devuelven true/false) construidas sobre zod
const cumple = (esquema, v) => esquema.safeParse(v).success;
const texto = (v, min = 1, max = 120) => cumple(z.string().max(max).refine((s) => s.trim().length >= min), v);
const dni = (v) => cumple(esquemas.dni, v);
const email = (v) => cumple(esquemas.email, v);
const celular = (v) => cumple(esquemas.celular, v);
const fecha = (v) => cumple(esquemas.fecha, v);
const sinHtml = (...valores) => valores.every((v) => typeof v !== 'string' || cumple(esquemas.sinHtml, v));
const entero = (v, min, max) => cumple(z.number().int().min(min).max(max), v);

// Valida un body con un esquema: devuelve { datos } o { error } con todos los mensajes juntos
function validarBody(esquema, body) {
  const r = esquema.safeParse(body || {});
  if (r.success) return { datos: r.data };
  return { error: [...new Set(r.error.issues.map((i) => i.message))].join(' ') };
}

module.exports = { z, esquemas, validarBody, texto, dni, email, celular, fecha, sinHtml, entero };
