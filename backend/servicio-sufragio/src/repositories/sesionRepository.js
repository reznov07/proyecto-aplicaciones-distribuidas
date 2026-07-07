const SesionSufragio = require('../models/SesionSufragio');

class SesionRepository {
  async crear({ ciudadanoId, eleccionId }) {
    return await SesionSufragio.create({ ciudadanoId, eleccionId });
  }

  async buscarPorId(sesionId) {
    return await SesionSufragio.findByPk(sesionId);
  }

  async actualizarResultado(sesionId, { estado, motivoResultado }) {
    const [filas] = await SesionSufragio.update(
      { estado, motivoResultado, fechaResolucion: new Date() },
      { where: { id: sesionId } }
    );
    return filas > 0;
  }

  async obtenerEstadoCrudo(sesionId) {
    // Uso interno del consumer (necesita saber el estado actual para idempotencia)
    return await SesionSufragio.findByPk(sesionId);
  }
}

module.exports = new SesionRepository();
