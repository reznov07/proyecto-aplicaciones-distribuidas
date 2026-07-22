const amqplib = require('amqplib');

let connection = null;
let channel = null;

const EXCHANGE          = process.env.RABBITMQ_EXCHANGE          || 'evoting_exchange';
const EXCHANGE_TYPE     = process.env.RABBITMQ_EXCHANGE_TYPE     || 'topic';
const QUEUE_AUDITORIA   = process.env.RABBITMQ_QUEUE_AUDITORIA   || 'auditoria.registrar';

const connectRabbitMQ = async (retries = 10, delay = 5000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[RabbitMQ] Intentando conectar (Intento ${attempt}/${retries})...`);
      
      connection = await amqplib.connect(process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672');
      channel    = await connection.createChannel();

      await channel.assertExchange(EXCHANGE, EXCHANGE_TYPE, { durable: true });

      await channel.assertQueue(QUEUE_AUDITORIA, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': `${EXCHANGE}.dlx`,
        },
      });

      await channel.bindQueue(QUEUE_AUDITORIA, EXCHANGE, 'voto.verificado_anonimo');

      channel.prefetch(1);

      console.log(`[RabbitMQ] Conectado exitosamente. Exchange "${EXCHANGE}" listo.`);
      console.log(`[RabbitMQ] Cola "${QUEUE_AUDITORIA}" vinculada -> voto.verificado_anonimo`);

      connection.on('error', (err) =>
        console.error('[RabbitMQ] Error en la conexión:', err.message)
      );

      connection.on('close', () => {
        console.warn('[RabbitMQ] Conexión cerrada con el broker. Reintentando en breve...');
        connection = null;
        channel = null;
        setTimeout(() => connectRabbitMQ(retries, delay), delay);
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

const getChannel = () => {
  if (!channel) throw new Error('[RabbitMQ] Canal no inicializado. Llama a connectRabbitMQ primero.');
  return channel;
};

const getExchange = () => EXCHANGE;
const getQueue    = () => QUEUE_AUDITORIA;

module.exports = { connectRabbitMQ, getChannel, getExchange, getQueue };
