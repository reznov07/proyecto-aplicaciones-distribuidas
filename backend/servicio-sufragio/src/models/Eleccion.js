const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Elección. Vive únicamente en db_sufragio.
 * Solo puede haber UNA elección con activa=true a la vez
 * (constraint de índice parcial único, ver index 'una_eleccion_activa').
 *
 * El frontend consulta la elección activa para saber qué candidatos
 * mostrar, sin necesitar conocer el eleccionId de antemano.
 */
const Eleccion = sequelize.define('Eleccion', {
  id: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    comment: 'Código legible de la elección, ej: eleccion-2026-presidencial',
  },
  nombre: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  activa: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  fechaInicio: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'fecha_inicio',
  },
  fechaFin: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'fecha_fin',
  },
}, {
  tableName: 'elecciones',
  timestamps: true,
  underscored: true,
  indexes: [
    // Solo una elección puede estar activa a la vez
    {
      unique: true,
      fields: ['activa'],
      where: { activa: true },
      name: 'una_eleccion_activa',
    },
  ],
});

module.exports = Eleccion;
