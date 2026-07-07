-- =====================================================================
-- init-sufragio.sql
-- Base: db_sufragio (contenedor evoting-postgres-sufragio, puerto 5433)
-- Refleja exactamente el modelo Sequelize SesionSufragio (servicio-sufragio)
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- necesario para gen_random_uuid()

-- El nombre del tipo debe coincidir EXACTO con lo que Sequelize autogenera:
-- enum_<tabla>_<columna>. Si no coincide, sync({ alter: true }) falla al
-- intentar castear entre dos tipos ENUM distintos sin conversión implícita.
DO $$ BEGIN
    CREATE TYPE enum_sesiones_sufragio_estado AS ENUM ('INICIADO', 'APROBADO', 'RECHAZADO');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- IMPORTANTE — secreto del voto:
-- Esta tabla NUNCA guarda candidato_id. Solo sabe QUIÉN intentó votar
-- y en QUÉ elección, para poder validar contra el padrón y evitar
-- doble voto. El candidato elegido viaja de paso por los eventos de
-- RabbitMQ y solo queda persistido, de forma anónima, en db_auditoria.
CREATE TABLE IF NOT EXISTS sesiones_sufragio (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ciudadano_id        VARCHAR(20)  NOT NULL,
    eleccion_id         VARCHAR(50)  NOT NULL,
    estado              enum_sesiones_sufragio_estado NOT NULL DEFAULT 'INICIADO',
    motivo_resultado    VARCHAR(255),
    fecha_resolucion    TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sesiones_ciudadano_eleccion
    ON sesiones_sufragio (ciudadano_id, eleccion_id);

CREATE INDEX IF NOT EXISTS idx_sesiones_estado
    ON sesiones_sufragio (estado);

-- ── Tabla: elecciones ────────────────────────────────────────────────
-- Solo puede haber una elección con activa = true a la vez
-- (índice único parcial, igual que en el modelo Sequelize).
CREATE TABLE IF NOT EXISTS elecciones (
    id              VARCHAR(50) PRIMARY KEY,
    nombre          VARCHAR(150) NOT NULL,
    activa          BOOLEAN NOT NULL DEFAULT false,
    fecha_inicio    TIMESTAMPTZ,
    fecha_fin       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS una_eleccion_activa
    ON elecciones (activa) WHERE activa = true;

-- ── Tabla: candidatos ────────────────────────────────────────────────
-- Catálogo de candidatos por elección. Vive solo aquí:
-- Padrón y Auditoría nunca conocen candidato_id (secreto del voto).
CREATE TABLE IF NOT EXISTS candidatos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidato_id    VARCHAR(50)  NOT NULL,
    eleccion_id     VARCHAR(50)  NOT NULL REFERENCES elecciones(id),
    nombre          VARCHAR(150) NOT NULL,
    partido         VARCHAR(100),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT candidatos_candidato_eleccion_unique UNIQUE (candidato_id, eleccion_id)
);

CREATE INDEX IF NOT EXISTS idx_candidatos_eleccion ON candidatos (eleccion_id);

-- =====================================================================
-- Datos semilla (solo para pruebas del proyecto)
-- 'eleccion-2026-presidencial' queda marcada como ACTIVA.
-- (coincide con el ciudadano semilla 55555555-5 en db_padron, que
--  solo está habilitado para esta elección específica)
-- =====================================================================
INSERT INTO elecciones (id, nombre, activa, fecha_inicio, fecha_fin)
VALUES
    ('eleccion-2026-presidencial', 'Elección Presidencial 2026', true, now(), now() + interval '7 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO candidatos (candidato_id, eleccion_id, nombre, partido)
VALUES
    ('cand-001', 'eleccion-2026-presidencial', 'Ana Torres',     'Partido Azul'),
    ('cand-002', 'eleccion-2026-presidencial', 'Luis Fernández', 'Partido Verde'),
    ('cand-003', 'eleccion-2026-presidencial', 'Marta Díaz',     'Partido Rojo')
ON CONFLICT (candidato_id, eleccion_id) DO NOTHING;
