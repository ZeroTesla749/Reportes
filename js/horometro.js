/* ============================================================
   HORÓMETRO — Cálculos para la slide de montacargas
   ============================================================ */

const Horometro = {

  /**
   * Procesa los registros de horómetro filtrados por rango de fechas.
   * Devuelve totales por máquina + comparativa con histórico.
   *
   * Estructura del retorno:
   * {
   *   periodo: {
   *     HANGCHA: { horas, registros, primerHorometro, ultimoHorometro, dias },
   *     ZOMLION: { horas, registros, primerHorometro, ultimoHorometro, dias }
   *   },
   *   total: {  // acumulado del proyecto
   *     HANGCHA: { horas, horometroActual, primerRegistro, ultimoRegistro },
   *     ZOMLION: { ... }
   *   },
   *   porSemana: [ { semana, HANGCHA: horas, ZOMLION: horas }, ... ]
   * }
   */
  calcular(fechaDesde, fechaHasta) {
    const todos = DatosCache.filas('horometro');

    // Normaliza nombres de máquina (HANGCHAN → HANGCHA por si hay errores tipográficos)
    const normalizar = (m) => {
      const s = String(m || '').trim().toUpperCase().replace('HANGCHAN', 'HANGCHA');
      return s;
    };

    // Calcular horas por fila: HORO. FINAL - HORO. INICIAL
    const enriquecidos = todos.map(r => {
      const horoIni = parseFloat(r['HORO. INICIAL']) || parseFloat(r['HORO INICIAL']) || 0;
      const horoFin = parseFloat(r['HORO. FINAL']) || parseFloat(r['HORO FINAL']) || 0;
      const horas = Math.max(0, horoFin - horoIni);
      // Nivel de combustible: viene como "25%" o "100%" o número
      let nivelComb = r['NIVEL COMBUSTIBLE'];
      if (typeof nivelComb === 'string') {
        nivelComb = parseFloat(nivelComb.replace('%', '').trim());
      } else {
        nivelComb = parseFloat(nivelComb);
      }
      if (isNaN(nivelComb)) nivelComb = null;
      // Si viene como fracción (0.25), convertir a porcentaje
      if (nivelComb !== null && nivelComb > 0 && nivelComb <= 1) {
        nivelComb = nivelComb * 100;
      }
      return {
        fecha: LectorDatos.parseFecha(r['FECHA']),
        montacarga: normalizar(r['MONTACARGA']),
        horoIni,
        horoFin,
        horas,
        nivelComb
      };
    }).filter(r => r.fecha && r.montacarga);

    // ---- Acumulados del PERIODO ----
    const inicio = FechaUtil.inicioDia(fechaDesde);
    const fin    = FechaUtil.finDia(fechaHasta);
    const enPeriodo = enriquecidos.filter(r =>
      r.fecha >= inicio && r.fecha <= fin
    );

    const periodo = {};
    CONFIG.montacargas.forEach(m => {
      const filas = enPeriodo.filter(r => r.montacarga === m);
      const dias = new Set(filas.map(r => r.fecha.toDateString())).size;
      const horas = filas.reduce((a, r) => a + r.horas, 0);
      const horoMax = filas.length > 0 ? Math.max(...filas.map(r => r.horoFin)) : null;
      const horoMin = filas.length > 0 ? Math.min(...filas.map(r => r.horoIni)) : null;
      periodo[m] = {
        horas,
        registros: filas.length,
        primerHorometro: horoMin,
        ultimoHorometro: horoMax,
        dias,
        promedioPorDia: dias > 0 ? horas / dias : 0
      };
    });

    // ---- Acumulado TOTAL del proyecto ----
    const total = {};
    CONFIG.montacargas.forEach(m => {
      const filas = enriquecidos.filter(r => r.montacarga === m);
      const horas = filas.reduce((a, r) => a + r.horas, 0);
      const horometroActual = filas.length > 0
        ? Math.max(...filas.map(r => r.horoFin))
        : null;
      const fechas = filas.map(r => r.fecha).sort((a, b) => a - b);

      // Nivel de combustible actual = último registro con nivel (por fecha)
      const filasConNivel = filas
        .filter(r => r.nivelComb !== null)
        .sort((a, b) => a.fecha - b.fecha);
      const nivelActual = filasConNivel.length > 0
        ? filasConNivel[filasConNivel.length - 1].nivelComb
        : null;

      // Consumo promedio = % combustible / horas trabajadas
      // (cuánto % de tanque gasta por hora de trabajo)
      const consumoPorHora = horas > 0 && nivelActual !== null
        ? null  // se calcula abajo de forma más robusta
        : null;

      total[m] = {
        horas,
        horometroActual,
        primerRegistro: fechas[0] || null,
        ultimoRegistro: fechas[fechas.length - 1] || null,
        diasOperativos: new Set(filas.map(r => r.fecha.toDateString())).size,
        nivelCombustible: nivelActual,
        consumoPorHora: this._calcConsumo(filas)
      };
    });

    // ---- Por semana (últimas 4 con actividad) ----
    const semanasMap = {};
    enriquecidos.forEach(r => {
      const sem = LectorDatos.semanaISO(r.fecha);
      if (!semanasMap[sem]) {
        semanasMap[sem] = { semana: sem };
        CONFIG.montacargas.forEach(m => { semanasMap[sem][m] = 0; });
      }
      semanasMap[sem][r.montacarga] = (semanasMap[sem][r.montacarga] || 0) + r.horas;
    });
    const porSemana = Object.values(semanasMap).sort((a, b) => a.semana - b.semana);

    return { periodo, total, porSemana };
  },

  /**
   * Calcula el consumo promedio de combustible (% por hora trabajada).
   *
   * Lógica: cuando el nivel BAJA entre un registro y el siguiente,
   * ese descenso dividido entre las horas trabajadas da el % consumido/hora.
   * Cuando el nivel SUBE (reabastecimiento), se ignora ese tramo.
   *
   * Si no hay suficientes datos, usa una estimación simple:
   * (suma de descensos de nivel) / (horas en esos tramos).
   */
  _calcConsumo(filas) {
    const ordenadas = [...filas]
      .filter(r => r.nivelComb !== null)
      .sort((a, b) => a.fecha - b.fecha);

    if (ordenadas.length < 2) {
      // Solo 1 registro: no podemos calcular consumo entre tramos.
      return null;
    }

    let totalConsumido = 0;  // % total que bajó
    let totalHoras = 0;      // horas en esos tramos

    for (let i = 1; i < ordenadas.length; i++) {
      const prev = ordenadas[i - 1];
      const curr = ordenadas[i];
      const baja = prev.nivelComb - curr.nivelComb;  // positivo si bajó
      if (baja > 0) {
        // Hubo consumo. Las horas del tramo: las horas del registro actual
        totalConsumido += baja;
        totalHoras += curr.horas > 0 ? curr.horas : 0;
      }
      // Si subió (reabastecimiento), ignoramos
    }

    if (totalHoras <= 0) return null;
    return totalConsumido / totalHoras;  // % por hora
  }
};
