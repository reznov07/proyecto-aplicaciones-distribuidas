const auditoriaService = require('../services/auditoriaService');

const obtenerResultado = async (req, res, next) => {
  try {
    const { eleccionId } = req.params;
    const resultado = await auditoriaService.obtenerResultado(eleccionId);
    return res.status(200).json({ ok: true, data: resultado });
  } catch (error) {
    next(error);
  }
};

const obtenerConteoPorCandidato = async (req, res, next) => {
  try {
    const { eleccionId } = req.params;
    const conteo = await auditoriaService.obtenerConteoPorCandidato(eleccionId);
    return res.status(200).json({ ok: true, data: conteo });
  } catch (error) {
    next(error);
  }
};

const obtenerHistorial = async (req, res, next) => {
  try {
    const { eleccionId } = req.params;
    const limit  = parseInt(req.query.limit, 10)  || 50;
    const offset = parseInt(req.query.offset, 10) || 0;

    const { total, registros } = await auditoriaService.obtenerHistorial(eleccionId, { limit, offset });
    return res.status(200).json({ ok: true, total, data: registros });
  } catch (error) {
    next(error);
  }
};

const listarElecciones = async (req, res, next) => {
  try {
    const elecciones = await auditoriaService.listarElecciones();
    return res.status(200).json({ ok: true, total: elecciones.length, data: elecciones });
  } catch (error) {
    next(error);
  }
};

module.exports = { obtenerResultado, obtenerConteoPorCandidato, obtenerHistorial, listarElecciones };
