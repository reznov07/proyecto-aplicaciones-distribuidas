const { Router } = require('express');
const {
  listarCiudadanos,
  buscarCiudadano,
  obtenerParticipacion,
} = require('../controllers/padronController');

const router = Router();

/**
 * GET /api/padron
 * Lista todos los ciudadanos del padrón
 */
router.get('/', listarCiudadanos);

/**
 * GET /api/padron/participacion?eleccionId=XXXX
 * Total de participantes en una elección (sin revelar identidades)
 */
router.get('/participacion', obtenerParticipacion);

/**
 * GET /api/padron/:ciudadanoId
 * Consulta un ciudadano específico por su ID
 */
router.get('/:ciudadanoId', buscarCiudadano);

module.exports = router;
