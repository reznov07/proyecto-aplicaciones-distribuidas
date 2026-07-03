const { getChannel, getQueue } = require('../config/rabbitmq');
const padronService = require('../services/padronService');

/**
 * Consumer del evento 'voto.intento_verificar'.
 *
 * Flujo por cada mensaje:
 *  1. Parsear y validar estructura del payload
 *  2. Delegar verificación al padronService (reglas de negocio)
 *  3. ACK  → mensaje procesado correctamente, se elimina de la cola
 *  4. NACK → error inesperado, va a dead-letter sin reencolar
 */
const iniciarConsumer = async () => {
  const channel = getChannel();
  const queue   = getQueue();

  console.log(`[Consumer] Escuchando cola "${queue}"...`);

  channel.consume(queue, async (msg) => {
    if (!msg) return; // null = cola cancelada por el broker

    let payload;

    // ── Parseo del mensaje ────────────────────────────────────────────
    try {
      payload = JSON.parse(msg.content.toString());
    } catch {
      console.error('[Consumer] Mensaje no parseable. Descartando sin reencolar.');
      channel.nack(msg, false, false);
      return;
    }

    const { eventId, tipo, payload: datos } = payload;

    // ── Validar tipo de evento ────────────────────────────────────────
    if (tipo !== 'voto.intento_verificar') {
      console.warn(`[Consumer] Tipo inesperado "${tipo}" (${eventId}). Descartando.`);
      channel.nack(msg, false, false);
      return;
    }

    // ── Validar campos mínimos del payload ────────────────────────────
    // candidatoId es pass-through: servicio-padron lo relee del mensaje
    // y lo reenvía hacia auditoría, pero NUNCA lo persiste en db_padron
    // ni lo usa en las reglas de negocio (no le corresponde saberlo).
    const { sesionId, ciudadanoId, eleccionId, candidatoId } = datos || {};
    if (!sesionId || !ciudadanoId || !eleccionId) {
      console.error(`[Consumer] Payload incompleto en evento ${eventId}. Descartando.`);
      channel.nack(msg, false, false);
      return;
    }

    console.log(`[Consumer] Evento recibido: "${tipo}" | sesión ${sesionId} | ciudadano ${ciudadanoId}`);

    // ── Verificación en el padrón ─────────────────────────────────────
    try {
      await padronService.verificarCiudadano({
        sesionId,
        ciudadanoId,
        eleccionId,
        candidatoId,
        eventoEntradaId: eventId,
      });

      channel.ack(msg);
      console.log(`[Consumer] ACK enviado para evento ${eventId}`);

    } catch (error) {
      console.error(`[Consumer] Error procesando evento ${eventId}:`, error.message);
      // NACK sin reencolar → dead-letter para revisión manual
      channel.nack(msg, false, false);
    }
  });
};

module.exports = { iniciarConsumer };
