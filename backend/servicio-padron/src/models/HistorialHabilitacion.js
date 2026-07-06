const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Guarda cada cambio de estado de habilitación de un ciudadano.
 * Permite auditar quién fue inhabilitado, cuándo y por qué,
 * sin depender del campo booleano actual.
 */
const HistorialHabilitacion = sequelize.define('HistorialHabilitacion', {
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
  accion: {
    type: DataTypes.ENUM('HABILITADO', 'INHABILITADO'),
    allowNull: false,
  },
  motivo: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  operador: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Sistema o usuario que realizó el cambio',
  },
}, {
  tableName: 'historial_habilitacion',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['ciudadano_id'] },
    { fields: ['accion'] },
  ],
});

module.exports = HistorialHabilitacion;
