// Crea (o vuelve a crear) la base de datos matricula_db con sus tablas y datos iniciales.
// Ejecuta database/schema.sql y luego database/datos.sql usando los datos de conexión de .env.
// Uso: npm run db:crear      (¡borra los datos actuales y deja la base como nueva!)
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true, // solo este script de instalación ejecuta archivos .sql completos
    charset: 'utf8mb4',
  });
  for (const archivo of ['schema.sql', 'datos.sql']) {
    const sql = fs.readFileSync(path.join(__dirname, '..', 'database', archivo), 'utf8');
    await conn.query(sql);
    console.log(`✔ ${archivo} ejecutado`);
  }
  const [[u]] = await conn.query('SELECT COUNT(*) AS n FROM matricula_db.usuarios');
  const [[s]] = await conn.query('SELECT COUNT(*) AS n FROM matricula_db.solicitudes');
  console.log(`Base matricula_db lista: ${u.n} usuarios, ${s.n} solicitudes.`);
  await conn.end();
})().catch((e) => {
  console.error('No se pudo crear la base de datos:', e.code || '', e.message);
  console.error('Revisa que MySQL esté encendido y los datos DB_HOST, DB_PORT, DB_USER, DB_PASSWORD en backend/.env');
  process.exit(1);
});
