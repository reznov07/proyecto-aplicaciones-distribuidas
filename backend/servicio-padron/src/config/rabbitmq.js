const amqplib = require('amqplib');

let connection = null;
let channel = null;

const EXCHANGE      = process.env.RABBITMQ_EXCHANGE      || 'evoting_exchange';
const EXCHANGE_TYPE = process.env.RABBITMQ_EXCHANGE_TYPE || 'topic';
const QUEUE_PADRON  = process.env.RABBITMQ_QUEUE_PADRON  || 'padron.verificar';

const connectRabbitMQ = async (retries = 5, delay = 3000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      connection = await amqplib.connect(process.env.RABBITMQ_URL);
      channel    = await connection.createChannel();

      // Exchange compartido — debe coincidir con servicio-sufragio
      await channel.assertExchange(EXCHANGE, EXCHANGE_TYPE, { durable: true });

      // Cola exclusiva del padrón: recibe eventos 'voto.intento_verificar'
      await channel.assertQueue(QUEUE_PADRON, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': `${EXCHANGE}.dlx`,
        },
      });

      await channel.bindQueue(QUEUE_PADRON, EXCHANGE, 'voto.intento_verificar');

      // Procesar de a un mensaje a la vez (fair dispatch)
      channel.prefetch(1);

      console.log(`[RabbitMQ] Conectado. Exchange "${EXCHANGE}" listo.`);
      console.log(`[RabbitMQ] Cola "${QUEUE_PADRON}" vinculada → voto.intento_verificar`);

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
const getQueue    = () => QUEUE_PADRON;

module.exports = { connectRabbitMQ, getChannel, getExchange, getQueue };
