const express         = require('express');
const auditoriaRoutes = require('./routes/auditoriaRoutes');
const errorHandler    = require('./middlewares/errorHandler');

const app = express();

// Middlewares globales
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    servicio: 'servicio-auditoria',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Rutas REST (consulta pública / dashboard de resultados)
app.use('/api/auditoria', auditoriaRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ ok: false, mensaje: `Ruta ${req.method} ${req.path} no encontrada.` });
});

// Manejo centralizado de errores
app.use(errorHandler);

module.exports = app;
