const app = require('./app');
const db = require('./db');
const culqi = require('./services/culqi');
const mp = require('./services/mercadopago');

async function iniciar() {
  let modoPago;
  try { mp.validarConfig(); modoPago = mp.activo() ? 'mercadopago' : culqi.modo(); } catch (e) { console.error(e.message); process.exit(1); }

  // Conexión a MySQL
  try {
    await db.verificarConexion();
  } catch (e) {
    console.error(`No se pudo conectar a MySQL (${e.code || e.message}).`);
    console.error('Revisa que MySQL esté encendido, los datos DB_* de backend/.env y que hayas creado la base con: npm run db:crear');
    process.exit(1);
  }

  // Un pago que quedó "procesando" (el servidor se cayó a mitad del cobro)
  // pasa a "por_confirmar" para que lo resuelva el webhook y no se cobre dos veces.
  const recuperados = await db.pagos.recuperarProcesando();
  if (recuperados) console.log(`${recuperados} pago(s) quedaron por confirmar.`);

  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`API de matrícula V2 en http://localhost:${PORT}/api`);
    console.log(`Base de datos: MySQL ${process.env.DB_NAME || 'matricula_db'} en ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}`);
    console.log({ mercadopago: 'Pagos: Mercado Pago (Checkout Pro)', culqi: 'Pagos: Culqi (llaves de prueba)' }[modoPago] || 'Pagos: MODO SIMULADO (agrega MP_ACCESS_TOKEN en backend/.env)');
  });
}

iniciar();
