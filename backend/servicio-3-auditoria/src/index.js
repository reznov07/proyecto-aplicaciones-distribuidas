const amqp = require('amqplib');

const RABBITMQ_URI = process.env.RABBITMQ_URI || 'amqp://localhost';

async function init() {
  try {
    const connection = await amqp.connect(RABBITMQ_URI);
    const channel = await connection.createChannel();
    
    await channel.assertQueue('votante.apto', { durable: true });
    await channel.assertQueue('proceso.concluido', { durable: true });

    console.log('🔄 S3: Registro de Auditoría escuchando eventos...');

    channel.consume('votante.apto', async (msg) => {
      if (msg !== null) {
        const datosApto = JSON.parse(msg.content.toString());
        console.log(`💾 S3: Anonimizando y registrando auditoría para el proceso.`);

        // --- LÓGICA DE NEGOCIO ---
        // Aquí incrementas el contador en la BD aislada de auditoría de forma anónima
        
        const confirmacionFinal = {
          eventId: `done_${Date.now()}`,
          rut: datosApto.rut, // Se pasa de vuelta para limpiar el mapa del S1
          status: "COMPLETED",
          certificado_digital: `CERT-${Math.floor(Math.random() * 900000) + 100000}`,
          timestamp: new Date().toISOString()
        };

        channel.sendToQueue('proceso.concluido', Buffer.from(JSON.stringify(confirmacionFinal)), { persistent: true });
        console.log(`🎉 S3: Auditoría consolidada. Fin del flujo distribuído.`);
        
        channel.ack(msg);
      }
    });
  } catch (err) {
    console.error('❌ Error S3:', err.message);
    setTimeout(init, 5000);
  }
}

init();