const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Sesión de sufragio.
 *
 * IMPORTANTE — secreto del voto:
 * Esta tabla NUNCA guarda candidatoId. Solo sabe QUIÉN intentó votar
 * y en QUÉ elección, para poder validar contra el padrón y evitar
 * doble voto. candidatoId viaja de paso por los eventos de RabbitMQ
 * (nunca se escribe aquí) y solo queda persistido, de forma anónima
 * y sin ciudadanoId, en db_auditoria.
 *
 * Ciclo de vida de 'estado':
 *   INICIADO   → se creó la sesión y se publicó voto.intento_verificar
 *   APROBADO   → servicio-padron validó al ciudadano (voto contabilizado)
 *   RECHAZADO  → servicio-padron rechazó (no inscrito, inhabilitado, doble voto, etc.)
 */
const SesionSufragio = sequelize.define('SesionSufragio', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  ciudadanoId: {
    type: DataTypes.STRING(20),
    allowNull: false,
    field: 'ciudadano_id',
  },
  eleccionId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'eleccion_id',
  },
  estado: {
    type: DataTypes.ENUM('INICIADO', 'APROBADO', 'RECHAZADO'),
    allowNull: false,
    defaultValue: 'INICIADO',
  },
  motivoResultado: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'motivo_resultado',
  },
  fechaResolucion: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'fecha_resolucion',
  },
}, {
  tableName: 'sesiones_sufragio',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['ciudadano_id', 'eleccion_id'] },
    { fields: ['estado'] },
  ],
});

module.exports = SesionSufragio;
