const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Ciudadano = sequelize.define('Ciudadano', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  ciudadanoId: {
    type: DataTypes.STRING(20),
    allowNull: false,
    field: 'ciudadano_id',
    comment: 'RUT u otro identificador único del ciudadano',
  },
  nombre: {
    type: DataTypes.STRING(120),
    allowNull: false,
  },
  apellido: {
    type: DataTypes.STRING(120),
    allowNull: false,
  },
  habilitado: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    comment: 'true = puede votar | false = inhabilitado',
  },
  motivoInhabilitacion: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'motivo_inhabilitacion',
  },
  eleccionesHabilitadas: {
    // Array vacío = habilitado para TODAS las elecciones
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
    field: 'elecciones_habilitadas',
    comment: 'IDs de elecciones en las que puede participar. Vacío = todas.',
  },
}, {
  tableName: 'ciudadanos',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['ciudadano_id'], unique: true, name: 'ciudadanos_ciudadano_id_unique' },
    { fields: ['habilitado'] },
  ],
});

module.exports = Ciudadano;
