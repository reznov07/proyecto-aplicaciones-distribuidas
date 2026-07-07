const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Catálogo de candidatos por elección (nombre, partido, etc.).
 * Es solo data de referencia — no registra votos. Nunca se cruza
 * con ciudadanoId: sesiones_sufragio no lo referencia y padrón no
 * lo conoce. candidatoId (el voto elegido) solo queda persistido,
 * de forma anónima, en registros_auditoria (db_auditoria).
 */
const Candidato = sequelize.define('Candidato', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  candidatoId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'candidato_id',
  },
  eleccionId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'eleccion_id',
  },
  nombre: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  partido: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
}, {
  tableName: 'candidatos',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['candidato_id', 'eleccion_id'], unique: true, name: 'candidatos_candidato_eleccion_unique' },
    { fields: ['eleccion_id'] },
  ],
});

module.exports = Candidato;
