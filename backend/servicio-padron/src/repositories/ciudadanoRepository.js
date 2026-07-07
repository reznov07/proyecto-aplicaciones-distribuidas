const Ciudadano = require('../models/Ciudadano');

class CiudadanoRepository {
  async buscarPorCiudadanoId(ciudadanoId) {
    return await Ciudadano.findOne({ where: { ciudadanoId } });
  }

  async crear(datos) {
    return await Ciudadano.create(datos);
  }

  async listarTodos() {
    return await Ciudadano.findAll({ order: [['apellido', 'ASC']] });
  }

  async actualizarHabilitacion(ciudadanoId, habilitado, motivo = null) {
    const [filas] = await Ciudadano.update(
      { habilitado, motivoInhabilitacion: motivo },
      { where: { ciudadanoId } }
    );
    return filas > 0;
  }
}

module.exports = new CiudadanoRepository();
