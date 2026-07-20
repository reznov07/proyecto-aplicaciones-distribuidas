const { getChannel, getExchange } = require('../config/rabbitmq');

const ROUTING_KEY = 'voto.intento_verificar';

/**
 * Publica el intento de voto para que servicio-padron lo verifique.
 *
 * IMPORTANTE — secreto del voto:
 * candidatoId viaja DE PASO en este evento únicamente para que
 * servicio-padron lo reenvíe hacia servicio-auditoria (ver
 * validacionProducer.publicarVerificacionAnonima). servicio-padron
 * NUNCA lo persiste en su propia base — solo lo relee del mensaje y
 * lo reenvía. sesiones_sufragio (esta base) tampoco lo guarda.
 */
const publicarIntentoVerificacion = async ({ sesionId, ciudadanoId, eleccionId, candidatoId }) => {
  try {
    const channel  = getChannel();
    const exchange = getExchange();

    const mensaje = {
      eventId:   `evt-${Date.now()}`,
      tipo:      ROUTING_KEY,
      timestamp: new Date().toISOString(),
      origen:    'servicio-sufragio',
      payload: {
        sesionId,
        ciudadanoId,
        eleccionId,
        candidatoId,
      },
    };

    const buffer = Buffer.from(JSON.stringify(mensaje));

    channel.publish(exchange, ROUTING_KEY, buffer, {
      persistent:  true,
      contentType: 'application/json',
      timestamp:   Date.now(),
      messageId:   mensaje.eventId,
    });

    console.log(`[Producer] Evento "${ROUTING_KEY}" publicado → sesión ${sesionId}`);
    return mensaje;
  } catch (error) {
    console.error('[Producer] Error al publicar voto.intento_verificar:', error.message);
    throw error;
  }
};

module.exports = { publicarIntentoVerificacion };
