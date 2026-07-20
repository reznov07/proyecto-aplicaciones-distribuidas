const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Registro de participación: ciudadano + elección.
 * NO guarda a quién votó (eso es secreto del voto).
 * Solo registra que el ciudadano YA ejerció su derecho,
 * para prevenir doble voto en la validación del padrón.
 */
const VotoEfectuado = sequelize.define('VotoEfectuado', {
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
  // Referencia al intento de voto (sesionId del servicio-sufragio)
  // Solo para correlación interna — no vincula al candidato
  sesionId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'sesion_id',
    comment: 'ID de sesión de sufragio — no el candidato votado',
  },
  fechaParticipacion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'fecha_participacion',
  },
}, {
  tableName: 'votos_efectuados',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['ciudadano_id', 'eleccion_id'],
      unique: true,
      name: 'unique_participacion_eleccion',
    },
    { fields: ['eleccion_id'] },
  ],
});

module.exports = VotoEfectuado;
