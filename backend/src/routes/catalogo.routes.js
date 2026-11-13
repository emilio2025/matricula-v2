const { Router } = require('express');
const { catalogo, costos: repoCostos, institucion: repoInst } = require('../db');
const { verificarToken, permitir } = require('../middleware/auth');
const v = require('../utils/validar');

const router = Router();

// GET /api/niveles — niveles con los costos vigentes
router.get('/niveles', async (req, res) => {
  const costos = await repoCostos.obtener();
  res.json(catalogo.niveles.map((n) => ({ ...n, costoMatricula: costos[n.id].matricula, pension: costos[n.id].pension })));
});

// GET /api/grados
router.get('/grados', (req, res) => res.json(catalogo.grados));

// GET /api/institucion
router.get('/institucion', async (req, res) => res.json(await repoInst.obtener()));

// PUT /api/institucion (dirección)
router.put('/institucion', verificarToken, permitir('director'), async (req, res) => {
  const b = req.body || {};
  const campos = ['nombre', 'lema', 'direccion', 'telefono', 'email', 'periodo', 'fechaInicioMatricula', 'fechaFinMatricula'];
  for (const c of campos) {
    if (!v.texto(b[c], 1, 150) || !v.sinHtml(b[c])) return res.status(400).json({ error: `Revisa el campo ${c}.` });
  }
  if (!/^\d{4}$/.test(b.periodo)) return res.status(400).json({ error: 'El periodo debe ser un año, por ejemplo 2027.' });
  if (!v.fecha(b.fechaInicioMatricula) || !v.fecha(b.fechaFinMatricula) || b.fechaFinMatricula < b.fechaInicioMatricula) {
    return res.status(400).json({ error: 'Las fechas de matrícula no son válidas.' });
  }
  await repoInst.guardar(Object.fromEntries(campos.map((c) => [c, b[c].trim()])));
  res.json(await repoInst.obtener());
});

// GET /api/costos
router.get('/costos', async (req, res) => res.json(await repoCostos.obtener()));

// PUT /api/costos (dirección) — montos en soles
router.put('/costos', verificarToken, permitir('director'), async (req, res) => {
  const b = req.body || {};
  const nuevos = {};
  for (const n of catalogo.niveles) {
    const c = b[n.id] || {};
    const matricula = Number(c.matricula);
    const pension = Number(c.pension);
    if (!Number.isFinite(matricula) || !Number.isFinite(pension) || matricula < 1 || matricula > 5000 || pension < 0 || pension > 5000) {
      return res.status(400).json({ error: `Los costos de ${n.nombre} deben estar entre S/ 1 y S/ 5000.` });
    }
    nuevos[n.id] = { matricula: Math.round(matricula * 100) / 100, pension: Math.round(pension * 100) / 100 };
  }
  await repoCostos.guardar(nuevos);
  res.json(await repoCostos.obtener());
});

module.exports = router;
