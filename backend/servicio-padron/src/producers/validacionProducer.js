const { getChannel, getExchange } = require('../config/rabbitmq');

const ROUTING_KEY = 'voto.verificado_anonimo';

/**
 * Publica el resultado de la verificación del padrón.
 *
 * IMPORTANTE — secreto del voto:
 * El payload de este evento NO incluye ciudadanoId — la db_auditoria
 * nunca sabe QUIÉN votó. candidatoId sí viaja aquí (pass-through,
 * servicio-padron no lo persiste) para que auditoría pueda registrar
 * QUÉ se votó de forma anónima y así calcular el conteo real por
 * candidato sin poder ligarlo jamás a un ciudadano.
 */
const publicarVerificacionAnonima = async ({
  sesionId,
  eleccionId,
  candidatoId,   // string | null — solo presente si resultado === 'APROBADO'
  resultado,     // 'APROBADO' | 'RECHAZADO'
  motivo,        // string | null
  eventoEntradaId,
}) => {
  try {
    const channel  = getChannel();
    const exchange = getExchange();

    const mensaje = {
      eventId:   `evt-${Date.now()}`,
      tipo:      'voto.verificado_anonimo',
      timestamp: new Date().toISOString(),
      origen:    'servicio-padron',
      payload: {
        sesionId,        // correlaciona con sufragio sin revelar identidad en auditoria
        eleccionId,
        candidatoId: candidatoId || null,
        resultado,
        motivo: motivo || null,
        eventoEntradaId, // referencia al evento voto.intento_verificar original
      },
    };

    const buffer = Buffer.from(JSON.stringify(mensaje));

    channel.publish(exchange, ROUTING_KEY, buffer, {
      persistent:  true,
      contentType: 'application/json',
      timestamp:   Date.now(),
      messageId:   mensaje.eventId,
    });

    console.log(`[Producer] Evento "${ROUTING_KEY}" publicado → ${resultado} (sesión ${sesionId})`);
    return mensaje;
  } catch (error) {
    console.error('[Producer] Error al publicar voto.verificado_anonimo:', error.message);
    throw error;
  }
};

module.exports = { publicarVerificacionAnonima };
