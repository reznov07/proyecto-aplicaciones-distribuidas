const { fn, col } = require('sequelize');
const RegistroAuditoria = require('../models/RegistroAuditoria');

class AuditoriaRepository {
  async buscarPorSesion(sesionId) {
    return await RegistroAuditoria.findOne({ where: { sesionId } });
  }

  async crear(datos) {
    return await RegistroAuditoria.create(datos);
  }

  /**
   * Conteo agregado por resultado (APROBADO / RECHAZADO) para una elección.
   * Este es el "conteo" real del sistema — se calcula desde el log,
   * nunca se guarda como número aparte que pueda desincronizarse.
   */
  async contarPorResultado(eleccionId) {
    const filas = await RegistroAuditoria.findAll({
      where: { eleccionId },
      attributes: ['resultado', [fn('COUNT', col('resultado')), 'total']],
      group: ['resultado'],
      raw: true,
    });

    const resumen = { APROBADO: 0, RECHAZADO: 0 };
    filas.forEach((f) => {
      resumen[f.resultado] = parseInt(f.total, 10);
    });
    return resumen;
  }

  /**
   * Conteo de votos APROBADOS agrupados por candidato — el tally
   * anónimo real de la elección.
   */
  async contarPorCandidato(eleccionId) {
    return await RegistroAuditoria.findAll({
      where: { eleccionId, resultado: 'APROBADO' },
      attributes: ['candidatoId', [fn('COUNT', col('candidato_id')), 'total']],
      group: ['candidatoId'],
      order: [[fn('COUNT', col('candidato_id')), 'DESC']],
      raw: true,
    });
  }

  async listarPorEleccion(eleccionId, { limit = 50, offset = 0 } = {}) {
    return await RegistroAuditoria.findAndCountAll({
      where: { eleccionId },
      order: [['fechaRegistro', 'DESC']],
      limit,
      offset,
    });
  }

  async listarEleccionesRegistradas() {
    return await RegistroAuditoria.findAll({
      attributes: [[fn('DISTINCT', col('eleccion_id')), 'eleccionId']],
      raw: true,
    });
  }
}

module.exports = new AuditoriaRepository();
