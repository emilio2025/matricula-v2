# Sistema de Matrícula en Línea – Versión 2 (API REST + pasarela de pago)

Proyecto N° 11 · AIS84 Comercio Electrónico y Marketing Digital – UNAMBA
Responsable: **Paniagua Ferrel, Jhosep Emilio** · Docente: Daryl Andrés Huamaní López

Sistema de matrícula para instituciones educativas (Inicial, Primaria, Secundaria e Instituto).
La **V1** era solo frontend con datos de prueba. La **V2** agrega:

- **Backend en Node.js + Express** con API REST, separado del frontend.
- El frontend React ya **no usa datos mock**: todo se lee y guarda mediante `fetch` a la API.
- **Login real**: contraseñas con hash (bcryptjs) y sesión con token JWT (8 horas).
- **Permisos por rol** en el servidor (apoderado, secretaría, dirección).
- **Pasarela de pago Mercado Pago (Checkout Pro)** para pagar la matrícula con tarjeta, en modo de prueba.
  Culqi queda como alternativa (requiere RUC) y sin llaves funciona un **modo simulado**.
- **Base de datos MySQL** (`matricula_db`, 10 tablas) con consultas parametrizadas (mysql2) y transacciones.

## Estructura

```
matricula-v2/
├── backend/                 API REST (Express)
│   ├── src/
│   │   ├── app.js           middlewares (helmet, cors, json) y rutas
│   │   ├── server.js        arranque, puerto desde process.env.PORT
│   │   ├── db.js            acceso a MySQL (mysql2, consultas parametrizadas)
│   │   ├── datos/semilla.js datos iniciales
│   │   ├── middleware/auth.js   JWT y control de roles
│   │   ├── utils/validar.js     validación de datos
│   │   ├── services/mercadopago.js  integración con Mercado Pago
│   │   ├── services/culqi.js    integración con Culqi (alternativa)
│   │   └── routes/          auth, catálogo, secciones, solicitudes, pagos
│   ├── database/            schema.sql, datos.sql, consultas.sql
│   ├── scripts/             crear-bd.js (npm run db:crear)
│   └── .env.example         variables de entorno (copiar como .env)
└── frontend/                React + Vite
    └── src/api.js           cliente de la API (fetch)
```

## Base de datos (MySQL)

Archivos en `backend/database/`:

| Archivo | Contenido |
|---|---|
| `schema.sql` | Crea la base `matricula_db` y sus 10 tablas (llaves, índices, restricciones CHECK) |
| `datos.sql` | Datos iniciales; las contraseñas ya van como **hash bcrypt** |
| `consultas.sql` | Consultas de verificación: hash de contraseñas, solicitudes, vacantes, pagos y recaudación |

Tablas: `usuarios`, `institucion`, `costos`, `secciones`, `solicitudes`, `documentos_solicitud`,
`historial_solicitud`, `pagos`, `intentos_pago`, `eventos_procesados`.

**Crear la base** (con MySQL encendido): en MySQL Workbench abrir y ejecutar `schema.sql` y luego `datos.sql`
(rayo ⚡), o desde Git Bash:

```bash
cd backend
npm run db:crear      # ejecuta schema.sql + datos.sql (borra y vuelve a crear la base)
```

**Contraseñas:** la columna `usuarios.password_hash` guarda solo el hash bcrypt (`$2a$10$...`, 60 caracteres,
salt distinto por usuario). Para comprobarlo, ejecutar la sección 1 de `consultas.sql`.

**Validación:** los datos de entrada se validan en el servidor con la librería **zod** (`src/utils/validar.js`).

**Seguridad del acceso a datos:** todas las consultas usan marcadores `?` (consultas parametrizadas) y las
operaciones que cambian varias tablas (aprobar, pagar) usan transacciones con bloqueo de filas (`FOR UPDATE`).

## Cómo ejecutarlo (Windows, Git Bash)

Requisitos: **Node.js 22** o superior. Se usan **dos terminales**.

**Terminal 1 – backend**

```bash
cd backend
npm install
cp .env.example .env      # completar DB_PASSWORD con la clave de su MySQL
npm run db:crear          # solo la primera vez (crea matricula_db)
npm run dev
```

Debe aparecer `API de matrícula V2 en http://localhost:3001/api`.
Para fijar la clave de las sesiones, genere una y péguela en `JWT_SECRET` dentro de `.env`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

**Terminal 2 – frontend**

```bash
cd frontend
npm install
npm run dev
```

Abrir http://localhost:5173. Vite redirige las llamadas `/api` al backend (ver `vite.config.mjs`).

Para volver a los datos iniciales: `cd backend && npm run db:crear`.

## Usuarios de prueba

| Rol | Correo | Contraseña |
|---|---|---|
| Apoderado | apoderado@demo.pe | 123456 |
| Alumno de instituto | alumno@demo.pe | 123456 |
| Secretaría | secretaria@demo.pe | 123456 |
| Director | director@demo.pe | 123456 |

La solicitud **MAT-2027-0001** (apoderado@demo.pe) está aprobada y con el pago pendiente: sirve para probar la pasarela.

## Pasarela de pago (Mercado Pago)

### Obtener las credenciales de prueba

1. Ingresar a https://www.mercadopago.com.pe/developers con una cuenta de Mercado Pago (no requiere RUC).
2. **Tus integraciones > Crear aplicación**: tipo de pago en línea, producto **Checkout Pro**.
3. En la aplicación, abrir **Credenciales de prueba** y copiar el **Access Token**.
4. Pegarlo solo en `backend/.env` (nunca en el código ni en el frontend):
   ```
   MP_ACCESS_TOKEN=APP_USR-...   (o TEST-...)
   ```
5. Reiniciar el backend: debe decir `Pagos: Mercado Pago (Checkout Pro)`.

### Probar un pago

1. Ingresar como `apoderado@demo.pe`, abrir **MAT-2027-0001** y pulsar **Pagar con Mercado Pago**.
2. Mercado Pago se abre en la misma pestaña. Para probar, usar una **ventana de incógnito** (sin sesión de Mercado Pago)
   o iniciar sesión con la **cuenta de prueba compradora** (Tus integraciones > Cuentas de prueba).
3. Usar una **tarjeta de prueba** (en el panel: Tus integraciones > tu aplicación > Tarjetas de prueba).
   El **nombre del titular** define el resultado:

| Titular | Resultado |
|---|---|
| APRO | Pago aprobado |
| FUND | Rechazado por fondos insuficientes |
| SECU | Rechazado por código de seguridad |
| CONT | Pendiente (queda "por confirmar") |
| OTHE | Rechazado por error general |

4. Al terminar, pulsar **Volver al sitio**. El sistema consulta el pago en Mercado Pago y, si está aprobado, habilita la constancia.

### Flujo con Mercado Pago

1. El frontend pide al backend `POST /api/pagos/solicitudes/:id/mercadopago`.
2. El backend calcula el monto, crea una **preferencia** con referencia `MAT-xxxx|intento` y devuelve la URL de pago.
3. El apoderado paga en Mercado Pago (los datos de la tarjeta nunca pasan por nuestro servidor).
4. Al volver, el frontend envía el `payment_id` a `POST .../mercadopago/confirmar`.
5. El backend **consulta el pago en la API de Mercado Pago** y verifica estado, referencia, moneda y monto antes de marcarlo como pagado.
6. Opcional: el webhook `POST /api/pagos/webhook/mercadopago` (con firma `x-signature` verificada con `MP_WEBHOOK_SECRET`)
   confirma pagos aunque el usuario cierre la pestaña. Requiere una URL pública https en `MP_NOTIFICATION_URL`.

## Pasarela alternativa (Culqi)

### Modo simulado (sin cuenta)

Si no hay `MP_ACCESS_TOKEN` ni llaves de Culqi, el backend funciona en **modo simulado** y la pantalla de pago lo indica.
Se elige una tarjeta de prueba y el servidor imita las respuestas de Culqi: aprobada, fondos insuficientes, tarjeta robada, vencida o sin respuesta.

### Modo Culqi (llaves de prueba, requiere RUC)

Se usa solo si `MP_ACCESS_TOKEN` está vacío.

1. Crear una cuenta en https://culqi.com e ingresar a **CulqiPanel** en el entorno de **integración**.
2. Ir a **Desarrollo > API Keys** y copiar la llave pública (`pk_test_...`) y la secreta (`sk_test_...`).
3. Pegarlas en `backend/.env` (nunca en el código ni en el frontend):
   ```
   CULQI_PUBLIC_KEY=pk_test_...
   CULQI_SECRET_KEY=sk_test_...
   ```
4. Reiniciar el backend: debe decir `Pagos: Culqi (llaves de prueba)`.
   El servidor **rechaza llaves que no sean de prueba**.

Tarjetas de prueba habituales (cualquier fecha de vencimiento futura; verificar en la documentación de Culqi):

| Marca | Número | CVV | Resultado esperado |
|---|---|---|---|
| Visa | 4111 1111 1111 1111 | 123 | Aprobada |
| Mastercard | 5111 1111 1111 1118 | 039 | Aprobada |
| American Express | 3712 121212 12122 | 2841 | Aprobada |
| Visa | 4000 0200 0000 0000 | 123 | Rechazada |

### Flujo del pago

1. La secretaría aprueba la solicitud y asigna sección → el pago queda **pendiente**.
2. El apoderado abre su solicitud y pulsa **Pagar**. Se abre el **Checkout de Culqi** (tarjeta o Yape).
3. Culqi devuelve un **token** al navegador; los datos de la tarjeta nunca pasan por nuestro servidor.
4. El frontend envía solo el token a `POST /api/pagos/solicitudes/:id/cargo`.
5. El backend **calcula el monto** con el costo vigente del nivel (el navegador no lo decide) y crea el cargo en Culqi con la llave secreta.
6. Si se aprueba: pago **pagado**, se registra en el historial y se habilita la **constancia de matrícula**.

### Decisiones de seguridad

| Riesgo | Medida en la V2 |
|---|---|
| Cambiar el precio desde el navegador | El monto se calcula en el servidor (`costos[nivel] × 100` céntimos, PEN). |
| Falsificar la URL de retorno de Mercado Pago | El servidor ignora el `status` de la URL y consulta el pago en la API; valida referencia, moneda y monto. |
| Usar el pago de otra matrícula | La referencia `MAT-xxxx\|intento` debe coincidir con la solicitud (HTTP 400). |
| Exponer la llave secreta | Solo vive en `backend/.env` (ignorado por Git); el frontend recibe solo la pública. |
| Cobrar dos veces (doble clic, reintento) | Idempotencia: si ya está pagada, devuelve el mismo resultado; estado `procesando` bloquea un segundo cobro; botón deshabilitado. |
| Culqi no responde a tiempo | La matrícula queda **por confirmar** y no se permite pagar de nuevo; el webhook la confirma. |
| Caída del servidor a mitad del cobro | Al arrancar, los pagos `procesando` pasan a `por_confirmar`. |
| Pruebas masivas de tarjetas robadas | Máximo 5 intentos fallidos por usuario por hora (HTTP 429). |
| Webhook falso | Mercado Pago: firma `x-signature` (HMAC-SHA256). Culqi: autenticación Basic opcional; cada evento se procesa una sola vez y el cargo se **vuelve a consultar en Culqi** y se compara el monto. |
| Pagar una solicitud ajena | Se verifica que la solicitud pertenezca al usuario del token (HTTP 403). |

Webhook (opcional, requiere una URL pública): en CulqiPanel > Desarrollo > Eventos, registrar
`https://<su-dominio>/api/pagos/webhook/culqi` con el evento `charge.creation.succeeded` y, si se desea, usuario y clave
(los mismos en `CULQI_WEBHOOK_USER` y `CULQI_WEBHOOK_PASSWORD`).

El servicio educativo está exonerado de IGV, por eso no se desglosa impuesto.

## Endpoints de la API

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | /api/salud | público | Estado del servidor |
| POST | /api/auth/login | público | Inicia sesión, devuelve token JWT |
| POST | /api/auth/registro | público | Crea cuenta de apoderado |
| GET | /api/auth/yo | sesión | Usuario actual |
| PUT | /api/auth/perfil | sesión | Actualiza nombre, correo y celular |
| PUT | /api/auth/password | sesión | Cambia la contraseña |
| GET | /api/niveles · /api/grados · /api/institucion · /api/costos | público | Catálogo y costos |
| PUT | /api/institucion · /api/costos | director | Configuración |
| GET | /api/secciones | público | Vacantes por sección |
| PATCH | /api/secciones/:id | secretaría | Cambia la capacidad |
| GET | /api/solicitudes/consulta?q= | público | Consulta por código o DNI (datos mínimos) |
| GET | /api/solicitudes | sesión | Apoderado: las suyas; secretaría/dirección: todas |
| GET | /api/solicitudes/:id | sesión | Detalle |
| POST | /api/solicitudes | apoderado | Nueva solicitud (validada) |
| POST | /api/solicitudes/:id/subsanar | apoderado | Adjunta documentos observados |
| POST | /api/solicitudes/:id/aprobar | secretaría | Aprueba y asigna sección |
| POST | /api/solicitudes/:id/observar · /rechazar | secretaría | Observa o rechaza con motivo |
| GET | /api/pagos/config | público | Pasarela activa (mercadopago, culqi o simulado) |
| POST | /api/pagos/solicitudes/:id/mercadopago | apoderado | Crea la preferencia y devuelve la URL de pago |
| POST | /api/pagos/solicitudes/:id/mercadopago/confirmar | apoderado | Verifica el pago en Mercado Pago al volver |
| POST | /api/pagos/webhook/mercadopago | Mercado Pago | Aviso de pago con firma verificada |
| POST | /api/pagos/solicitudes/:id/cargo | apoderado | Cobra con token de Culqi o del modo simulado |
| POST | /api/pagos/webhook/culqi | Culqi | Confirmación asíncrona de pagos |
| GET | /api/pagos | secretaría, director | Reporte de pagos y recaudación |

## Próxima versión (V3)

Validación con librería (zod/express-validator), migración del pago a la API de Orders de Mercado Pago y despliegue.
