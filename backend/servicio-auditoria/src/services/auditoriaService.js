const auditoriaRepository = require('../repositories/auditoriaRepository');

class AuditoriaService {

  /**
   * Registra el resultado de una verificación (evento 'voto.verificado_anonimo').
   * Idempotente: si ya existe un registro para esa sesionId (mensaje
   * reentregado por RabbitMQ), no se duplica.
   */
  async registrarVerificacion({ sesionId, eleccionId, candidatoId, resultado, motivo, eventoOrigenId }) {
    const existente = await auditoriaRepository.buscarPorSesion(sesionId);

    if (existente) {
      console.log(`[Service] Sesión ${sesionId} ya auditada (evento duplicado). Se ignora.`);
      return { registro: existente, duplicado: true };
    }

    const registro = await auditoriaRepository.crear({
      sesionId,
      eleccionId,
      candidatoId: candidatoId || null,
      resultado,
      motivo,
      eventoOrigenId,
    });

    console.log(`[Service] Registro de auditoría creado: sesión ${sesionId} → ${resultado}`);
    return { registro, duplicado: false };
  }

  /**
   * Resultado / conteo de una elección: se calcula agregando el log,
   * no leyendo un contador precomputado.
   */
  async obtenerResultado(eleccionId) {
    const { APROBADO, RECHAZADO } = await auditoriaRepository.contarPorResultado(eleccionId);
    return {
      eleccionId,
      votosAprobados: APROBADO,
      votosRechazados: RECHAZADO,
      totalProcesados: APROBADO + RECHAZADO,
    };
  }

  /**
   * Conteo real de votos por candidato — el propósito central de que
   * candidato_id viva en esta base: se puede tallar la elección sin
   * que ninguna fila revele quién votó por quién.
   */
  async obtenerConteoPorCandidato(eleccionId) {
    const filas = await auditoriaRepository.contarPorCandidato(eleccionId);
    return { eleccionId, resultados: filas };
  }

  async obtenerHistorial(eleccionId, paginacion) {
    const { count, rows } = await auditoriaRepository.listarPorEleccion(eleccionId, paginacion);
    return { total: count, registros: rows };
  }

  async listarElecciones() {
    const filas = await auditoriaRepository.listarEleccionesRegistradas();
    return filas.map((f) => f.eleccionId);
  }
}

module.exports = new AuditoriaService();
