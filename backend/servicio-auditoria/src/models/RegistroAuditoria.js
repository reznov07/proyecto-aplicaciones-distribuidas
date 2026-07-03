const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Registro 100% anónimo del resultado de una verificación de voto.
 *
 * NUNCA contiene ciudadanoId — solo:
 *  - sesionId    (correlaciona con servicio-sufragio, no identifica a la persona)
 *  - eleccionId
 *  - candidatoId (QUÉ se votó — solo presente si resultado = APROBADO;
 *                 esta es la ÚNICA tabla del sistema donde vive el
 *                 candidato elegido, y nunca junto a un ciudadanoId)
 *  - resultado   (APROBADO | RECHAZADO)
 *  - motivo      (solo si fue rechazado)
 *
 * Es un log INMUTABLE (no hay UPDATE ni DELETE en el flujo normal):
 * el "conteo" de votos aprobados/rechazados se calcula agregando
 * estas filas (COUNT / GROUP BY), nunca con un contador incremental,
 * para poder auditar, recontar y detectar duplicados/anomalías.
 *
 * unique(sesion_id) garantiza idempotencia: si RabbitMQ reentrega el
 * mismo mensaje (at-least-once delivery), el segundo INSERT se
 * detecta y se descarta en vez de inflar el conteo.
 */
const RegistroAuditoria = sequelize.define('RegistroAuditoria', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  sesionId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'sesion_id',
    comment: 'ID de sesión de sufragio — nunca el ciudadano ni el candidato',
  },
  eleccionId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'eleccion_id',
  },
  candidatoId: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'candidato_id',
    comment: 'QUÉ se votó — solo si resultado = APROBADO. Nunca junto a ciudadanoId.',
  },
  resultado: {
    type: DataTypes.ENUM('APROBADO', 'RECHAZADO'),
    allowNull: false,
  },
  motivo: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  eventoOrigenId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'evento_origen_id',
    comment: 'eventId de voto.verificado_anonimo — trazabilidad del evento, no de la persona',
  },
  fechaRegistro: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'fecha_registro',
  },
}, {
  tableName: 'registros_auditoria',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['sesion_id'], unique: true, name: 'registros_auditoria_sesion_id_unique' },
    { fields: ['eleccion_id'] },
    { fields: ['eleccion_id', 'resultado'] },
  ],
});

module.exports = RegistroAuditoria;
