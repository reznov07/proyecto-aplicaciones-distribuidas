const express = require('express');
const amqp = require('amqplib');
const { Client } = require('pg');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;
const RABBITMQ_URI = process.env.RABBITMQ_URI || 'amqp://localhost';
let channel, connection;

// Mapa temporal para rastrear solicitudes HTTP activas
const solicitudesActivas = new Map();

async function initRabbitMQ() {
  try {
    connection = await amqp.connect(RABBITMQ_URI);
    channel = await connection.createChannel();
    
    await channel.assertQueue('voto.intentado', { durable: true });
    await channel.assertQueue('proceso.concluido', { durable: true });

    // Escuchar el evento final del flujo para responder al cliente
    channel.consume('proceso.concluido', (msg) => {
      if (msg !== null) {
        const eventoFin = JSON.parse(msg.content.toString());
        const res = solicitudesActivas.get(eventoFin.rut);
        if (res) {
          res.status(200).json({
            status: "Éxito",
            mensaje: "Sufragio procesado correctamente de forma asíncrona.",
            certificado: eventoFin.certificado_digital
          });
          solicitudesActivas.delete(eventoFin.rut);
        }
        channel.ack(msg);
      }
    });

    console.log('🔄 S1: Conectado a RabbitMQ de forma exitosa.');
  } catch (err) {
    console.error('❌ Error de conexión en RabbitMQ S1:', err.message);
    setTimeout(initRabbitMQ, 5000);
  }
}

// REST Endpoint para recibir el voto
app.post('/api/sufragio', async (req, res) => {
  const { rut } = req.body;
  if (!rut) return res.status(400).json({ error: "El RUT es obligatorio" });

  console.log(`📥 S1: Solicitud de sufragio recibida para RUT: ${rut}`);
  
  const payload = {
    eventId: `evt_${Date.now()}`,
    timestamp: new Date().toISOString(),
    rut: rut
  };

  // Guardar la referencia de la respuesta HTTP y publicar el evento inicial
  solicitudesActivas.set(rut, res);
  channel.sendToQueue('voto.intentado', Buffer.from(JSON.stringify(payload)), { persistent: true });
});

app.listen(PORT, () => {
  console.log(`🚀 S1: Gestión de Sufragio corriendo en puerto ${PORT}`);
  initRabbitMQ();
});