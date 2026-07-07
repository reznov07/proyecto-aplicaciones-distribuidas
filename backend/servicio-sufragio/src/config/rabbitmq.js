const amqplib = require('amqplib');

let connection = null;
let channel = null;

const EXCHANGE          = process.env.RABBITMQ_EXCHANGE          || 'evoting_exchange';
const EXCHANGE_TYPE     = process.env.RABBITMQ_EXCHANGE_TYPE     || 'topic';
const QUEUE_SUFRAGIO    = process.env.RABBITMQ_QUEUE_SUFRAGIO    || 'sufragio.resultado';

const connectRabbitMQ = async (retries = 5, delay = 3000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      connection = await amqplib.connect(process.env.RABBITMQ_URL);
      channel    = await connection.createChannel();

      // Exchange compartido — debe coincidir con servicio-padron / servicio-auditoria
      await channel.assertExchange(EXCHANGE, EXCHANGE_TYPE, { durable: true });

      // Cola exclusiva de sufragio: recibe el resultado final ya verificado
      // por servicio-padron, para cerrar el ciclo de la sesión (INICIADO → APROBADO/RECHAZADO)
      await channel.assertQueue(QUEUE_SUFRAGIO, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': `${EXCHANGE}.dlx`,
        },
      });

      await channel.bindQueue(QUEUE_SUFRAGIO, EXCHANGE, 'voto.verificado_anonimo');

      // Procesar de a un mensaje a la vez (fair dispatch)
      channel.prefetch(1);

      console.log(`[RabbitMQ] Conectado. Exchange "${EXCHANGE}" listo.`);
      console.log(`[RabbitMQ] Cola "${QUEUE_SUFRAGIO}" vinculada → voto.verificado_anonimo`);

      connection.on('error', (err) =>
        console.error('[RabbitMQ] Error en conexión:', err.message)
      );
      connection.on('close', () => {
        console.warn('[RabbitMQ] Conexión cerrada. Reconectando...');
        setTimeout(() => connectRabbitMQ(), delay);
      });

      return { connection, channel };
    } catch (error) {
      console.error(`[RabbitMQ] Intento ${attempt}/${retries} fallido:`, error.message);
      if (attempt < retries) {
        await new Promise((res) => setTimeout(res, delay));
      } else {
        console.error('[RabbitMQ] No se pudo conectar después de todos los intentos.');
        process.exit(1);
      }
    }
  }
};

const getChannel  = () => {
  if (!channel) throw new Error('[RabbitMQ] Canal no inicializado. Llama a connectRabbitMQ primero.');
  return channel;
};

const getExchange = () => EXCHANGE;
const getQueue    = () => QUEUE_SUFRAGIO;

module.exports = { connectRabbitMQ, getChannel, getExchange, getQueue };
