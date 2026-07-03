const sufragioService = require('../services/sufragioService');

const obtenerEleccionActiva = async (req, res, next) => {
  try {
    const data = await sufragioService.obtenerEleccionActiva();
    return res.status(200).json({ ok: true, data });
  } catch (error) {
    next(error);
  }
};

const votar = async (req, res, next) => {
  try {
    const { ciudadanoId, candidatoId } = req.body;
    const resultado = await sufragioService.votar({ ciudadanoId, candidatoId });
    return res.status(202).json({ ok: true, data: resultado }); // 202 Accepted: procesamiento asíncrono
  } catch (error) {
    next(error);
  }
};

const consultarEstado = async (req, res, next) => {
  try {
    const { sesionId } = req.params;
    const estado = await sufragioService.consultarEstado(sesionId);
    return res.status(200).json({ ok: true, data: estado });
  } catch (error) {
    next(error);
  }
};

module.exports = { obtenerEleccionActiva, votar, consultarEstado };
