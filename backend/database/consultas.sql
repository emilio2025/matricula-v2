-- =====================================================================
-- CONSULTAS DE VERIFICACIÓN · Sistema de Matrícula (MySQL)
-- Ejecutar en MySQL Workbench: seleccionar una consulta y pulsar Ctrl+Enter
-- (o el rayo ⚡ para ejecutar todo el archivo).
-- =====================================================================
USE matricula_db;

-- ---------------------------------------------------------------------
-- 1. SEGURIDAD: las contraseñas están guardadas con hash bcrypt
-- ---------------------------------------------------------------------

-- 1.1 Usuarios con su hash (nunca aparece la contraseña real)
SELECT id, nombre, email, rol, password_hash
FROM usuarios
ORDER BY rol, id;

-- 1.2 Análisis del hash: algoritmo, costo y longitud
--     $2a$ / $2b$ = bcrypt · 10 = costo (2^10 rondas) · 60 caracteres siempre
SELECT email,
       LEFT(password_hash, 4)              AS algoritmo,
       SUBSTRING(password_hash, 5, 2)      AS costo,
       SUBSTRING(password_hash, 8, 22)     AS salt,
       LENGTH(password_hash)               AS longitud,
       CASE WHEN password_hash REGEXP '^\\$2[aby]\\$[0-9]{2}\\$.{53}$'
            THEN 'SÍ (bcrypt)' ELSE 'NO' END AS esta_hasheada
FROM usuarios;

-- 1.3 Prueba: ¿alguien tiene la contraseña "123456" en texto plano? (debe dar 0)
SELECT COUNT(*) AS contrasenas_en_texto_plano
FROM usuarios
WHERE password_hash = '123456' OR password_hash NOT LIKE '$2%';

-- 1.4 Misma contraseña (123456), hashes DIFERENTES: cada usuario tiene su propio salt
SELECT COUNT(*) AS usuarios, COUNT(DISTINCT password_hash) AS hashes_distintos
FROM usuarios;

-- ---------------------------------------------------------------------
-- 2. ESTRUCTURA
-- ---------------------------------------------------------------------
SHOW TABLES;
DESCRIBE usuarios;
DESCRIBE solicitudes;
DESCRIBE pagos;

-- Cantidad de registros por tabla
SELECT 'usuarios' AS tabla, COUNT(*) AS registros FROM usuarios
UNION ALL SELECT 'solicitudes', COUNT(*) FROM solicitudes
UNION ALL SELECT 'documentos_solicitud', COUNT(*) FROM documentos_solicitud
UNION ALL SELECT 'historial_solicitud', COUNT(*) FROM historial_solicitud
UNION ALL SELECT 'secciones', COUNT(*) FROM secciones
UNION ALL SELECT 'pagos', COUNT(*) FROM pagos
UNION ALL SELECT 'intentos_pago', COUNT(*) FROM intentos_pago
UNION ALL SELECT 'costos', COUNT(*) FROM costos;

-- ---------------------------------------------------------------------
-- 3. SOLICITUDES DE MATRÍCULA
-- ---------------------------------------------------------------------

-- 3.1 Solicitudes por estado
SELECT estado, COUNT(*) AS cantidad
FROM solicitudes
GROUP BY estado
ORDER BY cantidad DESC;

-- 3.2 Solicitudes por nivel y estado
SELECT nivel_id AS nivel,
       SUM(estado = 'pendiente') AS pendientes,
       SUM(estado = 'observada') AS observadas,
       SUM(estado = 'aprobada')  AS aprobadas,
       SUM(estado = 'rechazada') AS rechazadas,
       COUNT(*)                  AS total
FROM solicitudes
GROUP BY nivel_id;

-- 3.3 Solicitudes de un apoderado (las que ve en su portal)
SELECT s.id, CONCAT(s.alumno_nombres, ' ', s.alumno_apellidos) AS alumno, s.grado_id, s.estado, p.estado AS pago
FROM solicitudes s
LEFT JOIN pagos p ON p.solicitud_id = s.id
WHERE s.usuario_id = (SELECT id FROM usuarios WHERE email = 'apoderado@demo.pe');

-- 3.4 Detalle completo de una solicitud con su sección
SELECT s.id, s.fecha, s.estado,
       CONCAT(s.alumno_nombres, ' ', s.alumno_apellidos) AS alumno, s.alumno_dni,
       s.apoderado_nombres AS apoderado, s.apoderado_telefono,
       sec.nombre AS seccion, sec.turno
FROM solicitudes s
LEFT JOIN secciones sec ON sec.id = s.seccion_id
WHERE s.id = 'MAT-2027-0001';

-- 3.5 Línea de tiempo (historial) de una solicitud
SELECT fecha, texto
FROM historial_solicitud
WHERE solicitud_id = 'MAT-2027-0001'
ORDER BY fecha, id;

-- 3.6 Documentos entregados por solicitud
SELECT solicitud_id, COUNT(*) AS documentos, GROUP_CONCAT(nombre SEPARATOR ' | ') AS lista
FROM documentos_solicitud
GROUP BY solicitud_id
ORDER BY solicitud_id
LIMIT 10;

-- 3.7 Solicitudes observadas (lo que falta subsanar)
SELECT id, CONCAT(alumno_nombres, ' ', alumno_apellidos) AS alumno, observacion
FROM solicitudes
WHERE estado = 'observada';

-- ---------------------------------------------------------------------
-- 4. VACANTES
-- ---------------------------------------------------------------------

-- 4.1 Vacantes por sección
SELECT id, grado_id, nombre, turno, capacidad, matriculados,
       capacidad - matriculados AS vacantes,
       ROUND(matriculados * 100 / capacidad, 1) AS ocupacion_pct
FROM secciones
ORDER BY grado_id, nombre, turno;

-- 4.2 Secciones casi llenas (más del 85 % ocupado)
SELECT id, capacidad, matriculados, capacidad - matriculados AS vacantes
FROM secciones
WHERE matriculados / capacidad > 0.85
ORDER BY vacantes;

-- ---------------------------------------------------------------------
-- 5. PAGOS DE MATRÍCULA (montos en céntimos: 18000 = S/ 180.00)
-- ---------------------------------------------------------------------

-- 5.1 Pagos con alumno y monto en soles
SELECT p.solicitud_id, CONCAT(s.alumno_apellidos, ', ', s.alumno_nombres) AS alumno,
       s.nivel_id, p.estado, p.canal, p.monto / 100 AS monto_soles, p.referencia, p.fecha
FROM pagos p
JOIN solicitudes s ON s.id = p.solicitud_id
ORDER BY p.estado, p.solicitud_id;

-- 5.2 Recaudación por nivel y canal (caja / Mercado Pago)
SELECT s.nivel_id AS nivel, p.canal, COUNT(*) AS pagos, SUM(p.monto) / 100 AS total_soles
FROM pagos p
JOIN solicitudes s ON s.id = p.solicitud_id
WHERE p.estado = 'pagado'
GROUP BY s.nivel_id, p.canal
ORDER BY total_soles DESC;

-- 5.3 Total recaudado
SELECT COUNT(*) AS matriculas_pagadas, SUM(monto) / 100 AS recaudado_soles
FROM pagos
WHERE estado = 'pagado';

-- 5.4 Matrículas aprobadas pendientes de pago
SELECT s.id, CONCAT(s.alumno_nombres, ' ', s.alumno_apellidos) AS alumno, c.matricula AS debe_soles
FROM solicitudes s
JOIN pagos p  ON p.solicitud_id = s.id
JOIN costos c ON c.nivel_id = s.nivel_id
WHERE p.estado IN ('pendiente', 'fallido');

-- 5.5 Pagos hechos con Mercado Pago (solo se guardan los 4 últimos dígitos de la tarjeta)
SELECT solicitud_id, cargo_id AS operacion_mp, monto / 100 AS soles, marca, tarjeta, fecha
FROM pagos
WHERE canal = 'mercadopago';

-- 5.6 Antifraude: intentos de pago rechazados en la última hora
SELECT usuario_id, solicitud_id, codigo, FROM_UNIXTIME(ts / 1000) AS fecha_hora
FROM intentos_pago
WHERE ts > (UNIX_TIMESTAMP() - 3600) * 1000;

-- ---------------------------------------------------------------------
-- 6. CONFIGURACIÓN
-- ---------------------------------------------------------------------
SELECT * FROM institucion;
SELECT nivel_id, matricula AS matricula_soles, pension AS pension_soles FROM costos;
