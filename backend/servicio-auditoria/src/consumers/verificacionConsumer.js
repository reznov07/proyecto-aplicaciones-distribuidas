const { getChannel, getQueue } = require('../config/rabbitmq');
const auditoriaService = require('../services/auditoriaService');

/**
 * Consumer del evento 'voto.verificado_anonimo' (publicado por servicio-padron).
 *
 * Flujo por cada mensaje:
 *  1. Parsear y validar estructura del payload
 *  2. Registrar el resultado en db_auditoria (idempotente por sesionId)
 *  3. ACK  → mensaje procesado correctamente, se elimina de la cola
 *  4. NACK → error inesperado o payload inválido, va a dead-letter sin reencolar
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
    if (tipo !== 'voto.verificado_anonimo') {
      console.warn(`[Consumer] Tipo inesperado "${tipo}" (${eventId}). Descartando.`);
      channel.nack(msg, false, false);
      return;
    }

    // ── Validar campos mínimos del payload ────────────────────────────
    // candidatoId puede venir null (voto RECHAZADO) — es válido y esperado.
    const { sesionId, eleccionId, candidatoId, resultado, motivo, eventoEntradaId } = datos || {};
    if (!sesionId || !eleccionId || !resultado) {
      console.error(`[Consumer] Payload incompleto en evento ${eventId}. Descartando.`);
      channel.nack(msg, false, false);
      return;
    }

    console.log(`[Consumer] Evento recibido: "${tipo}" | sesión ${sesionId} | ${resultado}`);

    // ── Registrar en db_auditoria ──────────────────────────────────────
    try {
      await auditoriaService.registrarVerificacion({
        sesionId,
        eleccionId,
        candidatoId: candidatoId || null,
        resultado,
        motivo,
        eventoOrigenId: eventoEntradaId || eventId,
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
