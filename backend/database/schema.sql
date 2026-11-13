-- =====================================================================
-- Sistema de Matrícula en Línea · Base de datos MySQL (V2)
-- Proyecto N° 11 · AIS84 Comercio Electrónico y Marketing Digital – UNAMBA
-- Autor: Paniagua Ferrel, Jhosep Emilio
--
-- Ejecutar en MySQL Workbench / phpMyAdmin (o con: npm run db:crear)
-- Orden: 1) schema.sql  2) datos.sql  3) consultas.sql (para revisar)
-- =====================================================================

CREATE DATABASE IF NOT EXISTS matricula_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE matricula_db;

-- Se borran en orden inverso a las dependencias (para poder volver a crear todo)
DROP TABLE IF EXISTS eventos_procesados;
DROP TABLE IF EXISTS intentos_pago;
DROP TABLE IF EXISTS pagos;
DROP TABLE IF EXISTS historial_solicitud;
DROP TABLE IF EXISTS documentos_solicitud;
DROP TABLE IF EXISTS solicitudes;
DROP TABLE IF EXISTS secciones;
DROP TABLE IF EXISTS costos;
DROP TABLE IF EXISTS institucion;
DROP TABLE IF EXISTS usuarios;

-- ---------------------------------------------------------------------
-- Usuarios del sistema. La contraseña NUNCA se guarda en texto plano:
-- password_hash contiene el hash bcrypt (60 caracteres, empieza con $2a$/$2b$).
-- ---------------------------------------------------------------------
CREATE TABLE usuarios (
  id             VARCHAR(30)  NOT NULL,
  nombre         VARCHAR(80)  NOT NULL,
  dni            CHAR(8)      NOT NULL,
  email          VARCHAR(120) NOT NULL,
  telefono       VARCHAR(9)   NOT NULL DEFAULT '',
  rol            ENUM('apoderado','secretaria','director') NOT NULL DEFAULT 'apoderado',
  password_hash  CHAR(60)     NOT NULL,
  creado_en      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuarios_email (email),
  CONSTRAINT ck_usuarios_dni  CHECK (dni REGEXP '^[0-9]{8}$'),
  CONSTRAINT ck_usuarios_hash CHECK (password_hash LIKE '$2_$%')
) ENGINE=InnoDB;

-- Datos de la institución (una sola fila)
CREATE TABLE institucion (
  id                      TINYINT      NOT NULL DEFAULT 1,
  nombre                  VARCHAR(150) NOT NULL,
  lema                    VARCHAR(150) NOT NULL,
  direccion               VARCHAR(150) NOT NULL,
  telefono                VARCHAR(30)  NOT NULL,
  email                   VARCHAR(120) NOT NULL,
  periodo                 CHAR(4)      NOT NULL,
  fecha_inicio_matricula  DATE         NOT NULL,
  fecha_fin_matricula     DATE         NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT ck_institucion_unica CHECK (id = 1)
) ENGINE=InnoDB;

-- Costos vigentes por nivel (los define dirección), en soles
CREATE TABLE costos (
  nivel_id   VARCHAR(20)   NOT NULL,
  matricula  DECIMAL(8,2)  NOT NULL,
  pension    DECIMAL(8,2)  NOT NULL,
  PRIMARY KEY (nivel_id),
  CONSTRAINT ck_costos_nivel CHECK (nivel_id IN ('inicial','primaria','secundaria','instituto')),
  CONSTRAINT ck_costos_montos CHECK (matricula > 0 AND pension >= 0)
) ENGINE=InnoDB;

-- Secciones con su capacidad (vacantes = capacidad - matriculados)
CREATE TABLE secciones (
  id            VARCHAR(30)  NOT NULL,
  grado_id      VARCHAR(20)  NOT NULL,
  nombre        VARCHAR(5)   NOT NULL,
  turno         ENUM('Mañana','Tarde','Noche') NOT NULL,
  capacidad     SMALLINT     NOT NULL,
  matriculados  SMALLINT     NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY ix_secciones_grado (grado_id),
  CONSTRAINT ck_secciones_cupo CHECK (matriculados >= 0 AND matriculados <= capacidad AND capacidad <= 60)
) ENGINE=InnoDB;

-- Solicitudes de matrícula (alumno y apoderado van en la misma fila)
CREATE TABLE solicitudes (
  id                       VARCHAR(20)  NOT NULL,
  usuario_id               VARCHAR(30)  NOT NULL,
  fecha                    DATE         NOT NULL,
  nivel_id                 VARCHAR(20)  NOT NULL,
  grado_id                 VARCHAR(20)  NOT NULL,
  seccion_id               VARCHAR(30)  NULL,
  estado                   ENUM('pendiente','observada','aprobada','rechazada') NOT NULL DEFAULT 'pendiente',
  observacion              VARCHAR(300) NOT NULL DEFAULT '',
  alumno_dni               CHAR(8)      NOT NULL,
  alumno_nombres           VARCHAR(60)  NOT NULL,
  alumno_apellidos         VARCHAR(60)  NOT NULL,
  alumno_fecha_nacimiento  DATE         NOT NULL,
  alumno_sexo              ENUM('M','F') NOT NULL,
  alumno_direccion         VARCHAR(120) NOT NULL,
  apoderado_dni            CHAR(8)      NULL,
  apoderado_nombres        VARCHAR(80)  NULL,
  apoderado_parentesco     VARCHAR(30)  NULL,
  apoderado_telefono       VARCHAR(9)   NULL,
  apoderado_email          VARCHAR(120) NULL,
  PRIMARY KEY (id),
  KEY ix_solicitudes_usuario (usuario_id),
  KEY ix_solicitudes_estado (estado),
  KEY ix_solicitudes_alumno_dni (alumno_dni),
  CONSTRAINT fk_solicitudes_seccion FOREIGN KEY (seccion_id) REFERENCES secciones(id)
) ENGINE=InnoDB;
-- Nota: usuario_id no tiene llave foránea porque las solicitudes de demostración
-- (ux0, ux1, ...) pertenecen a apoderados que no tienen cuenta en el sistema.

-- Documentos marcados como entregados en cada solicitud
CREATE TABLE documentos_solicitud (
  id            INT          NOT NULL AUTO_INCREMENT,
  solicitud_id  VARCHAR(20)  NOT NULL,
  nombre        VARCHAR(100) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_documento (solicitud_id, nombre),
  CONSTRAINT fk_documentos_solicitud FOREIGN KEY (solicitud_id) REFERENCES solicitudes(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Línea de tiempo de cada solicitud
CREATE TABLE historial_solicitud (
  id            INT          NOT NULL AUTO_INCREMENT,
  solicitud_id  VARCHAR(20)  NOT NULL,
  fecha         DATE         NOT NULL,
  texto         VARCHAR(300) NOT NULL,
  PRIMARY KEY (id),
  KEY ix_historial_solicitud (solicitud_id),
  CONSTRAINT fk_historial_solicitud FOREIGN KEY (solicitud_id) REFERENCES solicitudes(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Pago de la matrícula (uno por solicitud aprobada). Montos en CÉNTIMOS.
CREATE TABLE pagos (
  solicitud_id    VARCHAR(20)  NOT NULL,
  estado          ENUM('pendiente','procesando','por_confirmar','fallido','pagado') NOT NULL DEFAULT 'pendiente',
  canal           VARCHAR(20)  NULL,          -- caja | mercadopago | culqi | simulado
  proveedor       VARCHAR(20)  NULL,
  monto           INT          NULL,          -- 18000 = S/ 180.00
  moneda          CHAR(3)      NULL,
  fecha           DATE         NULL,
  cargo_id        VARCHAR(60)  NULL,          -- id de la operación en la pasarela
  referencia      VARCHAR(60)  NULL,
  tarjeta         VARCHAR(20)  NULL,          -- solo últimos 4 dígitos, nunca el número completo
  marca           VARCHAR(30)  NULL,
  intento         CHAR(36)     NULL,          -- UUID del intento (idempotencia)
  preferencia_id  VARCHAR(80)  NULL,
  codigo          VARCHAR(60)  NULL,
  ultimo_error    VARCHAR(200) NULL,
  detalle         VARCHAR(200) NULL,
  desde           BIGINT       NULL,
  actualizado_en  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (solicitud_id),
  KEY ix_pagos_estado (estado),
  CONSTRAINT fk_pagos_solicitud FOREIGN KEY (solicitud_id) REFERENCES solicitudes(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Registro antifraude: intentos de pago rechazados (máx. 5 por hora)
CREATE TABLE intentos_pago (
  id            INT          NOT NULL AUTO_INCREMENT,
  usuario_id    VARCHAR(30)  NOT NULL,
  solicitud_id  VARCHAR(20)  NOT NULL,
  ts            BIGINT       NOT NULL,       -- milisegundos (Date.now())
  codigo        VARCHAR(60)  NULL,
  PRIMARY KEY (id),
  KEY ix_intentos_usuario_ts (usuario_id, ts)
) ENGINE=InnoDB;

-- Avisos (webhooks) ya procesados, para no aplicarlos dos veces
CREATE TABLE eventos_procesados (
  id         VARCHAR(120) NOT NULL,
  creado_en  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;
