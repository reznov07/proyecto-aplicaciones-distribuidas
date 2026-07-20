const VotoEfectuado = require('../models/VotoEfectuado');

class VotoEfectuadoRepository {
  async buscarParticipacion(ciudadanoId, eleccionId) {
    return await VotoEfectuado.findOne({ where: { ciudadanoId, eleccionId } });
  }

  async registrarParticipacion(ciudadanoId, eleccionId, sesionId) {
    return await VotoEfectuado.create({ ciudadanoId, eleccionId, sesionId });
  }

  async contarPorEleccion(eleccionId) {
    return await VotoEfectuado.count({ where: { eleccionId } });
  }
}

module.exports = new VotoEfectuadoRepository();
