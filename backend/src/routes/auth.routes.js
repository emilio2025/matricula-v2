const { Router } = require('express');
const bcrypt = require('bcryptjs');
const { usuarios } = require('../db');
const { firmarToken, verificarToken } = require('../middleware/auth');
const v = require('../utils/validar');

const router = Router();

// Nunca se devuelve el hash de la contraseña
const publico = ({ passwordHash, ...u }) => u;

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { datos, error } = v.validarBody(v.esquemas.login, req.body);
  if (error) return res.status(400).json({ error: 'Ingresa tu correo y contraseña.' });
  const { email, password } = datos;
  const u = await usuarios.porEmail(email);
  const valida = u ? await bcrypt.compare(password, u.passwordHash) : false;
  if (!valida) return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
  res.json({ token: firmarToken(u), usuario: publico(u) });
});

// POST /api/auth/registro (solo apoderados o alumnos de instituto)
router.post('/registro', async (req, res) => {
  const { datos, error } = v.validarBody(v.esquemas.registro, req.body);
  if (error) return res.status(400).json({ error });
  const { nombre, dni, email, password } = datos;

  if (await usuarios.emailUsadoPorOtro(email.trim())) {
    return res.status(409).json({ error: 'Ya existe una cuenta con ese correo.' });
  }
  const nuevo = {
    id: `u${Date.now()}`,
    nombre: nombre.trim(),
    dni,
    email: email.trim(),
    telefono: '',
    rol: 'apoderado',
    passwordHash: await bcrypt.hash(password, 10),
  };
  await usuarios.crear(nuevo);
  res.status(201).json({ token: firmarToken(nuevo), usuario: publico(nuevo) });
});

// GET /api/auth/yo — datos de la sesión actual
router.get('/yo', verificarToken, async (req, res) => {
  const u = await usuarios.porId(req.usuario.id);
  if (!u) return res.status(404).json({ error: 'Usuario no encontrado.' });
  res.json({ usuario: publico(u) });
});

// PUT /api/auth/perfil
router.put('/perfil', verificarToken, async (req, res) => {
  const { nombre, email, telefono } = req.body || {};
  if (!v.texto(nombre, 5, 80) || !v.sinHtml(nombre)) return res.status(400).json({ error: 'Escribe tus nombres y apellidos.' });
  if (!v.email(email)) return res.status(400).json({ error: 'Correo no válido.' });
  if (telefono && !v.celular(telefono)) return res.status(400).json({ error: 'Celular de 9 dígitos que empiece con 9.' });
  if (await usuarios.emailUsadoPorOtro(email.trim(), req.usuario.id)) {
    return res.status(409).json({ error: 'Ese correo ya lo usa otra cuenta.' });
  }
  await usuarios.actualizarPerfil(req.usuario.id, { nombre: nombre.trim(), email: email.trim(), telefono: telefono || '' });
  res.json({ usuario: publico(await usuarios.porId(req.usuario.id)) });
});

// PUT /api/auth/password
router.put('/password', verificarToken, async (req, res) => {
  const { actual, nueva } = req.body || {};
  const u = await usuarios.porId(req.usuario.id);
  if (!u || !(await bcrypt.compare(String(actual || ''), u.passwordHash))) {
    return res.status(400).json({ error: 'La contraseña actual no es correcta.', campo: 'actual' });
  }
  if (typeof nueva !== 'string' || nueva.length < 6 || nueva.length > 72) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener entre 6 y 72 caracteres.', campo: 'nueva' });
  }
  await usuarios.actualizarPassword(u.id, await bcrypt.hash(nueva, 10));
  res.json({ ok: true });
});

module.exports = router;
