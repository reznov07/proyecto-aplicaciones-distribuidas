const ciudadanoRepository    = require('../repositories/ciudadanoRepository');
const votoEfectuadoRepository = require('../repositories/votoEfectuadoRepository');
const historialRepository    = require('../repositories/historialRepository');
const { publicarVerificacionAnonima } = require('../producers/validacionProducer');

class PadronService {

  /**
   * Valida si el ciudadano puede votar en la elección indicada.
   * Aplica 3 reglas en orden y publica el resultado de forma anónima.
   *
   * @param {Object} params
   * @param {string} params.sesionId       — ID de la sesión de sufragio
   * @param {string} params.ciudadanoId    — RUT u identificador del ciudadano
   * @param {string} params.eleccionId     — ID de la elección
   * @param {string} params.candidatoId    — pass-through, NUNCA se persiste en db_padron
   * @param {string} params.eventoEntradaId — eventId del mensaje voto.intento_verificar
   */
  async verificarCiudadano({ sesionId, ciudadanoId, eleccionId, candidatoId, eventoEntradaId }) {
    let resultado = 'APROBADO';
    let motivo    = null;

    // ── Regla 1: ciudadano existe en el padrón ──────────────────────────
    const ciudadano = await ciudadanoRepository.buscarPorCiudadanoId(ciudadanoId);

    if (!ciudadano) {
      resultado = 'RECHAZADO';
      motivo    = `Ciudadano ${ciudadanoId} no está inscrito en el padrón electoral.`;
    }

    // ── Regla 2: ciudadano está habilitado ──────────────────────────────
    else if (!ciudadano.habilitado) {
      resultado = 'RECHAZADO';
      motivo    = ciudadano.motivoInhabilitacion
        || `Ciudadano ${ciudadanoId} se encuentra inhabilitado para votar.`;
    }

    // ── Regla 3: ciudadano habilitado para esta elección específica ──────
    else if (
      ciudadano.eleccionesHabilitadas.length > 0 &&
      !ciudadano.eleccionesHabilitadas.includes(eleccionId)
    ) {
      resultado = 'RECHAZADO';
      motivo    = `Ciudadano ${ciudadanoId} no está habilitado para la elección "${eleccionId}".`;
    }

    // ── Regla 4: no ha votado ya en esta elección (doble voto) ──────────
    else {
      const yaVoto = await votoEfectuadoRepository.buscarParticipacion(ciudadanoId, eleccionId);
      if (yaVoto) {
        resultado = 'RECHAZADO';
        motivo    = `Ciudadano ${ciudadanoId} ya ejerció su voto en la elección "${eleccionId}".`;
      }
    }

    // ── Si fue aprobado, registrar participación (prevenir doble voto) ──
    if (resultado === 'APROBADO') {
      await votoEfectuadoRepository.registrarParticipacion(ciudadanoId, eleccionId, sesionId);
      console.log(`[Service] Participación registrada: ciudadano ${ciudadanoId} en ${eleccionId}`);
    }

    console.log(`[Service] Verificación: ${ciudadanoId} → ${resultado}${motivo ? ` | ${motivo}` : ''}`);

    // ── Publicar resultado anónimo hacia servicio-auditoria ──────────────
    // NOTA: NO se incluye ciudadanoId en el evento — secreto del voto.
    // candidatoId solo se reenvía si el voto fue APROBADO: un intento
    // RECHAZADO no debe dejar constancia de una intención de voto.
    const eventoSalida = await publicarVerificacionAnonima({
      sesionId,
      eleccionId,
      candidatoId: resultado === 'APROBADO' ? candidatoId : null,
      resultado,
      motivo,
      eventoEntradaId,
    });

    return { resultado, motivo, eventoSalida };
  }

  // ── Métodos de consulta (API REST interna) ───────────────────────────

  async listarCiudadanos() {
    return await ciudadanoRepository.listarTodos();
  }

  async buscarCiudadano(ciudadanoId) {
    const ciudadano = await ciudadanoRepository.buscarPorCiudadanoId(ciudadanoId);
    if (!ciudadano) {
      const err = new Error(`Ciudadano ${ciudadanoId} no encontrado en el padrón.`);
      err.statusCode = 404;
      throw err;
    }
    return ciudadano;
  }

  async obtenerParticipacion(eleccionId) {
    const total = await votoEfectuadoRepository.contarPorEleccion(eleccionId);
    return { eleccionId, totalParticipantes: total };
  }
}

module.exports = new PadronService();
