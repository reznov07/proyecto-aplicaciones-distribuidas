const { Router } = require('express');
const {
  obtenerEleccionActiva,
  votar,
  consultarEstado,
} = require('../controllers/sufragioController');

const router = Router();

/**
 * GET /api/sufragio/eleccion-activa
 * Devuelve { eleccion, candidatos } de la elección vigente.
 * El frontend llama esto primero para armar la papeleta —
 * no necesita conocer el eleccionId de antemano.
 */
router.get('/eleccion-activa', obtenerEleccionActiva);

/**
 * POST /api/sufragio/votar
 * body: { ciudadanoId, candidatoId }
 * El eleccionId se deduce en el backend a partir de la elección activa.
 * Crea la sesión en estado INICIADO y publica voto.intento_verificar.
 * Responde 202 Accepted — el resultado se resuelve de forma asíncrona.
 */
router.post('/votar', votar);

/**
 * GET /api/sufragio/estado/:sesionId
 * Permite hacer polling del resultado (INICIADO | APROBADO | RECHAZADO)
 */
router.get('/estado/:sesionId', consultarEstado);

module.exports = router;
