const { Router } = require('express');
const {
  obtenerResultado,
  obtenerConteoPorCandidato,
  obtenerHistorial,
  listarElecciones,
} = require('../controllers/auditoriaController');

const router = Router();

/**
 * GET /api/auditoria/elecciones
 * Lista los eleccionId que ya tienen registros de auditoría
 */
router.get('/elecciones', listarElecciones);

/**
 * GET /api/auditoria/:eleccionId/resultado
 * Conteo agregado (votosAprobados / votosRechazados / total) — calculado
 * en vivo desde el log de auditoría, no desde un contador precomputado.
 */
router.get('/:eleccionId/resultado', obtenerResultado);

/**
 * GET /api/auditoria/:eleccionId/conteo-candidatos
 * Tally real de la elección: votos APROBADOS agrupados por candidato,
 * calculado desde el log anónimo (nunca desde una fila con ciudadanoId).
 */
router.get('/:eleccionId/conteo-candidatos', obtenerConteoPorCandidato);

/**
 * GET /api/auditoria/:eleccionId/historial?limit=&offset=
 * Historial paginado de registros anónimos (sin ciudadanoId; candidatoId
 * solo presente en filas APROBADO)
 */
router.get('/:eleccionId/historial', obtenerHistorial);

module.exports = router;
