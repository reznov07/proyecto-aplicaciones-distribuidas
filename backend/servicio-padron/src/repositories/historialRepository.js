const HistorialHabilitacion = require('../models/HistorialHabilitacion');

class HistorialRepository {
  async registrar({ ciudadanoId, accion, motivo, operador }) {
    return await HistorialHabilitacion.create({ ciudadanoId, accion, motivo, operador });
  }

  async buscarPorCiudadano(ciudadanoId) {
    return await HistorialHabilitacion.findAll({
      where: { ciudadanoId },
      order: [['createdAt', 'DESC']],
    });
  }
}

module.exports = new HistorialRepository();
