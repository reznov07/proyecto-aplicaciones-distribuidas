require('dotenv').config();
const app                 = require('./app');
const { connectDB }       = require('./config/database');
const { connectRabbitMQ } = require('./config/rabbitmq');
const { iniciarConsumer } = require('./consumers/verificacionConsumer');

const PORT = process.env.PORT || 3003;

const iniciar = async () => {
  console.log('=================================================');
  console.log('       servicio-auditoria - Iniciando...          ');
  console.log('=================================================');

  // 1. Conectar PostgreSQL y sincronizar modelos
  await connectDB();

  // 2. Conectar RabbitMQ, declarar exchange + cola + binding
  await connectRabbitMQ();

  // 3. Iniciar consumer de 'voto.verificado_anonimo'
  await iniciarConsumer();

  // 4. Levantar servidor HTTP (consulta de resultados / dashboard)
  app.listen(PORT, () => {
    console.log(`[Server] servicio-auditoria escuchando en http://localhost:${PORT}`);
    console.log(`[Server] Health check: http://localhost:${PORT}/health`);
    console.log('=================================================');
  });
};

// Cierre limpio
process.on('SIGTERM', () => {
  console.log('[Server] Señal SIGTERM recibida. Cerrando...');
  process.exit(0);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Server] Promesa rechazada no manejada:', reason);
  process.exit(1);
});

iniciar();
