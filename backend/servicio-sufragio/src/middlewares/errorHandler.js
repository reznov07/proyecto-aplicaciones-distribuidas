const errorHandler = (err, req, res, next) => {
  const statusCode   = err.statusCode || 500;
  const esProduccion = process.env.NODE_ENV === 'production';

  console.error(`[Error] ${statusCode} - ${err.message}`, esProduccion ? '' : err.stack);

  return res.status(statusCode).json({
    ok: false,
    mensaje: err.message || 'Error interno del servidor.',
    ...(esProduccion ? {} : { stack: err.stack }),
  });
};

module.exports = errorHandler;
