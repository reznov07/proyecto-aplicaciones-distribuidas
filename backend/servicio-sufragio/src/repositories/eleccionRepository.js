const Eleccion = require('../models/Eleccion');

class EleccionRepository {
  async obtenerActiva() {
    return await Eleccion.findOne({ where: { activa: true } });
  }

  async buscarPorId(id) {
    return await Eleccion.findByPk(id);
  }

  async listarTodas() {
    return await Eleccion.findAll({ order: [['fechaInicio', 'DESC']] });
  }
}

module.exports = new EleccionRepository();
