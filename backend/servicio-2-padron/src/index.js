const amqp = require('amqplib');

const RABBITMQ_URI = process.env.RABBITMQ_URI || 'amqp://localhost';

async function init() {
  try {
    const connection = await amqp.connect(RABBITMQ_URI);
    const channel = await connection.createChannel();
    
    await channel.assertQueue('voto.intentado', { durable: true });
    await channel.assertQueue('votante.apto', { durable: true });

    console.log('🔄 S2: Padrón Electoral escuchando eventos...');

    channel.consume('voto.intentado', async (msg) => {
      if (msg !== null) {
        const datosVoto = JSON.parse(msg.content.toString());
        console.log(`🔍 S2: Validando elegibilidad del RUT: ${datosVoto.rut}`);

        // --- LÓGICA DE NEGOCIO ---
        // Aquí interactúas con tu BD aislada de PostgreSQL para verificar estado
        const votanteApto = true; 

        if (votanteApto) {
          const respuesta = {
            eventId: `apto_${Date.now()}`,
            rut: datosVoto.rut,
            status: "VALIDATED",
            timestamp: new Date().toISOString()
          };
          channel.sendToQueue('votante.apto', Buffer.from(JSON.stringify(respuesta)), { persistent: true });
          console.log(`✅ S2: Votante verificado y apto para RUT: ${datosVoto.rut}`);
        }
        
        channel.ack(msg);
      }
    });
  } catch (err) {
    console.error('❌ Error S2:', err.message);
    setTimeout(init, 5000);
  }
}

init();