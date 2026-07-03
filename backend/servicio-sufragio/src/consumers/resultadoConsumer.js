const { getChannel, getQueue } = require('../config/rabbitmq');
const sufragioService = require('../services/sufragioService');

/**
 * Consumer del evento 'voto.verificado_anonimo' (publicado por servicio-padron).
 * Cierra el ciclo asíncrono: actualiza la sesión de INICIADO → APROBADO/RECHAZADO.
 */
const iniciarConsumer = async () => {
  const channel = getChannel();
  const queue   = getQueue();

  console.log(`[Consumer] Escuchando cola "${queue}"...`);

  channel.consume(queue, async (msg) => {
    if (!msg) return;

    let payload;
    try {
      payload = JSON.parse(msg.content.toString());
    } catch {
      console.error('[Consumer] Mensaje no parseable. Descartando sin reencolar.');
      channel.nack(msg, false, false);
      return;
    }

    const { eventId, tipo, payload: datos } = payload;

    if (tipo !== 'voto.verificado_anonimo') {
      console.warn(`[Consumer] Tipo inesperado "${tipo}" (${eventId}). Descartando.`);
      channel.nack(msg, false, false);
      return;
    }

    const { sesionId, resultado, motivo } = datos || {};
    if (!sesionId || !resultado) {
      console.error(`[Consumer] Payload incompleto en evento ${eventId}. Descartando.`);
      channel.nack(msg, false, false);
      return;
    }

    console.log(`[Consumer] Evento recibido: "${tipo}" | sesión ${sesionId} | ${resultado}`);

    try {
      await sufragioService.resolverSesion(sesionId, { resultado, motivo });
      channel.ack(msg);
      console.log(`[Consumer] ACK enviado para evento ${eventId}`);
    } catch (error) {
      console.error(`[Consumer] Error procesando evento ${eventId}:`, error.message);
      channel.nack(msg, false, false);
    }
  });
};

module.exports = { iniciarConsumer };
