const Candidato = require('../models/Candidato');

class CandidatoRepository {
  async buscarPorCandidatoYEleccion(candidatoId, eleccionId) {
    return await Candidato.findOne({ where: { candidatoId, eleccionId } });
  }

  async listarPorEleccion(eleccionId) {
    return await Candidato.findAll({ where: { eleccionId }, order: [['nombre', 'ASC']] });
  }
}

module.exports = new CandidatoRepository();
