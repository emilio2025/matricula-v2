const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('./utils/erroresAsync');

const app = express();
const ORIGENES = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',');

app.use(helmet());
app.use(cors({ origin: ORIGENES }));
app.use(express.json({ limit: '50kb' }));

app.get('/api/salud', (req, res) => res.json({ ok: true, version: '2.0.0' }));
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api', require('./routes/catalogo.routes'));
app.use('/api/secciones', require('./routes/secciones.routes'));
app.use('/api/solicitudes', require('./routes/solicitudes.routes'));
app.use('/api/pagos', require('./routes/pagos.routes'));

app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));

// Errores no controlados: mensaje genérico al cliente, detalle solo en la consola
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'El cuerpo de la petición no es JSON válido.' });
  console.error('[error]', err);
  res.status(500).json({ error: 'Ocurrió un error interno. Intenta más tarde.' });
});

module.exports = app;
