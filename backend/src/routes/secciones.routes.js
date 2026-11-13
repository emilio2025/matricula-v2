const { Router } = require('express');
const { secciones } = require('../db');
const { verificarToken, permitir } = require('../middleware/auth');

const router = Router();

// GET /api/secciones — público (vacantes)
router.get('/', async (req, res) => res.json(await secciones.listar()));

// PATCH /api/secciones/:id — secretaría cambia la capacidad
router.patch('/:id', verificarToken, permitir('secretaria'), async (req, res) => {
  const s = await secciones.obtener(String(req.params.id));
  if (!s) return res.status(404).json({ error: 'Sección no encontrada.' });
  const capacidad = Number(req.body?.capacidad);
  if (!Number.isInteger(capacidad) || capacidad < s.matriculados || capacidad > 60) {
    return res.status(400).json({ error: `La capacidad debe ser un número entre ${s.matriculados} (matriculados actuales) y 60.` });
  }
  await secciones.actualizarCapacidad(s.id, capacidad);
  res.json({ ...s, capacidad });
});

module.exports = router;
