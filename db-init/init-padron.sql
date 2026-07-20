-- =====================================================================
-- init-padron.sql
-- Base: db_padron (contenedor evoting-postgres-padron, puerto 5434)
-- Refleja los modelos Sequelize Ciudadano, HistorialHabilitacion y
-- VotoEfectuado (servicio-padron)
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Nombre alineado con el autogenerado por Sequelize: enum_<tabla>_<columna>
DO $$ BEGIN
    CREATE TYPE enum_historial_habilitacion_accion AS ENUM ('HABILITADO', 'INHABILITADO');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ── Tabla: ciudadanos ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ciudadanos (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ciudadano_id            VARCHAR(20)  NOT NULL,
    nombre                  VARCHAR(120) NOT NULL,
    apellido                VARCHAR(120) NOT NULL,
    habilitado              BOOLEAN NOT NULL DEFAULT true,
    motivo_inhabilitacion   VARCHAR(255),
    elecciones_habilitadas  TEXT[] NOT NULL DEFAULT '{}',  -- vacío = habilitado para todas
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ciudadanos_ciudadano_id_unique UNIQUE (ciudadano_id)
);

CREATE INDEX IF NOT EXISTS idx_ciudadanos_habilitado ON ciudadanos (habilitado);

-- ── Tabla: historial_habilitacion ───────────────────────────────────
CREATE TABLE IF NOT EXISTS historial_habilitacion (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ciudadano_id   VARCHAR(20) NOT NULL,
    accion         enum_historial_habilitacion_accion NOT NULL,
    motivo         VARCHAR(255),
    operador       VARCHAR(100),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_historial_ciudadano ON historial_habilitacion (ciudadano_id);
CREATE INDEX IF NOT EXISTS idx_historial_accion    ON historial_habilitacion (accion);

-- ── Tabla: votos_efectuados ──────────────────────────────────────────
-- Previene doble voto: un ciudadano solo puede participar una vez por elección.
-- NO guarda candidato_id — eso vive únicamente en db_sufragio.
CREATE TABLE IF NOT EXISTS votos_efectuados (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ciudadano_id          VARCHAR(20) NOT NULL,
    eleccion_id           VARCHAR(50) NOT NULL,
    sesion_id             UUID NOT NULL,  -- referencia a sesiones_sufragio, solo para correlación
    fecha_participacion   TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_participacion_eleccion UNIQUE (ciudadano_id, eleccion_id)
);

CREATE INDEX IF NOT EXISTS idx_votos_eleccion ON votos_efectuados (eleccion_id);

-- =====================================================================
-- Datos semilla (solo para pruebas del proyecto)
-- =====================================================================
INSERT INTO ciudadanos (ciudadano_id, nombre, apellido, habilitado, motivo_inhabilitacion, elecciones_habilitadas)
VALUES
    ('11111111-1', 'Juan',    'Pérez',    true,  NULL,                                  '{}'),
    ('22222222-2', 'María',   'González', true,  NULL,                                  '{}'),
    ('33333333-3', 'Pedro',   'Soto',     false, 'Fallecido según registro civil',       '{}'),
    ('44444444-4', 'Camila',  'Rojas',    false, 'Suspensión de derechos políticos',     '{}'),
    ('55555555-5', 'Andrés',  'Muñoz',    true,  NULL,                                  ARRAY['eleccion-2026-presidencial']),
    ('66666666-6', 'Valentina','Castro',  true,  NULL,                                  '{}')
ON CONFLICT (ciudadano_id) DO NOTHING;
