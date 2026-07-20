const padronService = require('../services/padronService');

const listarCiudadanos = async (req, res, next) => {
  try {
    const ciudadanos = await padronService.listarCiudadanos();
    return res.status(200).json({ ok: true, total: ciudadanos.length, data: ciudadanos });
  } catch (error) {
    next(error);
  }
};

const buscarCiudadano = async (req, res, next) => {
  try {
    const ciudadano = await padronService.buscarCiudadano(req.params.ciudadanoId);
    return res.status(200).json({ ok: true, data: ciudadano });
  } catch (error) {
    next(error);
  }
};

const obtenerParticipacion = async (req, res, next) => {
  try {
    const { eleccionId } = req.query;
    if (!eleccionId) {
      return res.status(400).json({ ok: false, mensaje: 'Parámetro eleccionId requerido.' });
    }
    const resultado = await padronService.obtenerParticipacion(eleccionId);
    return res.status(200).json({ ok: true, data: resultado });
  } catch (error) {
    next(error);
  }
};

module.exports = { listarCiudadanos, buscarCiudadano, obtenerParticipacion };
