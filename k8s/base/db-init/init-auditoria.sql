-- =====================================================================
-- init-auditoria.sql
-- Base: db_auditoria (contenedor evoting-postgres-auditoria, puerto 5435)
-- Refleja el modelo Sequelize RegistroAuditoria (servicio-auditoria)
--
-- 100% anónima: nunca contiene ciudadano_id ni candidato_id.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Nombre alineado con el autogenerado por Sequelize: enum_<tabla>_<columna>
DO $$ BEGIN
    CREATE TYPE enum_registros_auditoria_resultado AS ENUM ('APROBADO', 'RECHAZADO');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- IMPORTANTE — secreto del voto:
-- candidato_id vive AQUÍ, nunca junto a ciudadano_id. Esta tabla nunca
-- tiene ciudadano_id, así que nadie puede reconstruir "el ciudadano X
-- votó por el candidato Y" leyendo una sola fila ni una sola base.
-- Solo se llena cuando resultado = APROBADO (un voto RECHAZADO no
-- eligió candidato válido, así que queda NULL).
CREATE TABLE IF NOT EXISTS registros_auditoria (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sesion_id           UUID NOT NULL,                 -- correlaciona con sufragio, no identifica a la persona
    eleccion_id         VARCHAR(50) NOT NULL,
    candidato_id        VARCHAR(50),                   -- solo si resultado = APROBADO
    resultado           enum_registros_auditoria_resultado NOT NULL,
    motivo              VARCHAR(255),
    evento_origen_id    VARCHAR(100),
    fecha_registro      TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT registros_auditoria_sesion_id_unique UNIQUE (sesion_id)
);

CREATE INDEX IF NOT EXISTS idx_auditoria_eleccion            ON registros_auditoria (eleccion_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_eleccion_resultado  ON registros_auditoria (eleccion_id, resultado);
CREATE INDEX IF NOT EXISTS idx_auditoria_candidato           ON registros_auditoria (eleccion_id, candidato_id);

-- No lleva datos semilla: los registros nacen del evento voto.verificado_anonimo
