const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development'
      ? (msg) => console.log(`[DB] ${msg}`)
      : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('[DB] Conexión a PostgreSQL (db_auditoria) establecida correctamente.');
    // En desarrollo: alter:true ayuda a iterar rápido sobre el modelo.
    // En producción: el esquema ya lo define init.sql — un sync() simple
    // solo verifica que los modelos calcen, sin intentar migrar tipos
    // (evita el error de casteo de ENUMs vistos con alter:true).
    if (process.env.NODE_ENV === 'production') {
      await sequelize.sync();
    } else {
      await sequelize.sync({ alter: true });
    }
    console.log('[DB] Modelos sincronizados.');
  } catch (error) {
    console.error('[DB] Error al conectar con PostgreSQL:', error.message);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
