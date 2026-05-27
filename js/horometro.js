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
      return {
        fecha: LectorDatos.parseFecha(r['FECHA']),
        montacarga: normalizar(r['MONTACARGA']),
        horoIni,
        horoFin,
        horas
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
      total[m] = {
        horas,
        horometroActual,
        primerRegistro: fechas[0] || null,
        ultimoRegistro: fechas[fechas.length - 1] || null,
        diasOperativos: new Set(filas.map(r => r.fecha.toDateString())).size
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
  }
};
