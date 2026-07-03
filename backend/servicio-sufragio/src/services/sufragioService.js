const sesionRepository    = require('../repositories/sesionRepository');
const eleccionRepository  = require('../repositories/eleccionRepository');
const candidatoRepository = require('../repositories/candidatoRepository');
const { publicarIntentoVerificacion } = require('../producers/votoProducer');

class SufragioService {

  /**
   * Devuelve la elección activa junto con sus candidatos.
   * Es lo primero que el frontend consulta antes de mostrar la papeleta.
   */
  async obtenerEleccionActiva() {
    const eleccion = await eleccionRepository.obtenerActiva();
    if (!eleccion) {
      const err = new Error('No hay ninguna elección activa en este momento.');
      err.statusCode = 404;
      throw err;
    }

    const candidatos = await candidatoRepository.listarPorEleccion(eleccion.id);

    return {
      eleccion: {
        id: eleccion.id,
        nombre: eleccion.nombre,
        fechaInicio: eleccion.fechaInicio,
        fechaFin: eleccion.fechaFin,
      },
      candidatos,
    };
  }

  /**
   * Registra el intento de voto: crea la sesión en estado INICIADO
   * y publica el evento para que servicio-padron lo verifique.
   * La confirmación (APROBADO/RECHAZADO) llega de forma asíncrona.
   *
   * El frontend SOLO manda ciudadanoId + candidatoId. El eleccionId
   * se deduce acá: se toma la elección activa y se valida que el
   * candidato efectivamente pertenezca a ella.
   *
   * candidatoId se usa para validar y luego viaja de paso en el
   * evento hacia padrón → auditoría; nunca se guarda en esta base.
   */
  async votar({ ciudadanoId, candidatoId }) {
    if (!ciudadanoId || !candidatoId) {
      const err = new Error('ciudadanoId y candidatoId son obligatorios.');
      err.statusCode = 400;
      throw err;
    }

    // 1. ¿Hay una elección activa ahora mismo?
    const eleccion = await eleccionRepository.obtenerActiva();
    if (!eleccion) {
      const err = new Error('No hay ninguna elección activa en este momento.');
      err.statusCode = 409;
      throw err;
    }

    // 2. ¿El candidato pertenece a la elección activa?
    const candidato = await candidatoRepository.buscarPorCandidatoYEleccion(candidatoId, eleccion.id);
    if (!candidato) {
      const err = new Error(`El candidato "${candidatoId}" no pertenece a la elección activa ("${eleccion.id}").`);
      err.statusCode = 400;
      throw err;
    }

    const eleccionId = eleccion.id;

    // candidatoId NUNCA se guarda en sesiones_sufragio (ver modelo).
    // Solo viaja en el evento, de paso, hasta que servicio-auditoria
    // lo persista de forma anónima (sin ciudadanoId).
    const sesion = await sesionRepository.crear({ ciudadanoId, eleccionId });

    await publicarIntentoVerificacion({
      sesionId: sesion.id,
      ciudadanoId,
      eleccionId,
      candidatoId,
    });

    console.log(`[Service] Sesión ${sesion.id} creada en estado INICIADO (elección ${eleccionId}).`);

    return {
      sesionId: sesion.id,
      estado: sesion.estado,
      eleccionId,
      mensaje: 'Voto recibido. Verificación en proceso — consulta el estado con GET /api/sufragio/estado/:sesionId',
    };
  }

  async consultarEstado(sesionId) {
    const sesion = await sesionRepository.buscarPorId(sesionId);
    if (!sesion) {
      const err = new Error(`Sesión ${sesionId} no encontrada.`);
      err.statusCode = 404;
      throw err;
    }
    return {
      sesionId: sesion.id,
      estado: sesion.estado,
      motivoResultado: sesion.motivoResultado,
      fechaResolucion: sesion.fechaResolucion,
    };
  }

  /**
   * Invocado por el consumer al recibir 'voto.verificado_anonimo'.
   * Idempotente: si la sesión ya fue resuelta, ignora el mensaje repetido.
   */
  async resolverSesion(sesionId, { resultado, motivo }) {
    const sesion = await sesionRepository.obtenerEstadoCrudo(sesionId);

    if (!sesion) {
      console.warn(`[Service] Resultado recibido para sesión inexistente: ${sesionId}`);
      return { actualizado: false };
    }

    if (sesion.estado !== 'INICIADO') {
      console.log(`[Service] Sesión ${sesionId} ya estaba resuelta (${sesion.estado}). Evento duplicado ignorado.`);
      return { actualizado: false };
    }

    await sesionRepository.actualizarResultado(sesionId, {
      estado: resultado,
      motivoResultado: motivo,
    });

    console.log(`[Service] Sesión ${sesionId} resuelta → ${resultado}`);
    return { actualizado: true };
  }
}

module.exports = new SufragioService();
