/* ============================================================
   KPIs — Cálculo de indicadores
   ============================================================ */

const KPIs = {

  // Calcula todos los KPIs sobre un subconjunto filtrado
  calcular(datos) {
    const rec = datos.recepcion || [];
    const est = datos.estiba    || [];
    const des = datos.despacho  || [];

    // ----- Recepción -----
    const recCasing = rec.filter(r => r['TIPO MATERIAL'] === 'CASING');
    const recAib    = rec.filter(r => r['TIPO MATERIAL'] === 'AIB');
    const recViga   = rec.filter(r => r['TIPO MATERIAL'] === 'VIGA');

    const camionesUnicos = LectorDatos.camionesUnicos(rec);
    const casingCamiones = LectorDatos.camionesUnicos(recCasing);
    const aibCamiones    = LectorDatos.camionesUnicos(recAib);
    const vigaCamiones   = LectorDatos.camionesUnicos(recViga);

    const tubosCasing  = this._sum(recCasing, 'TUBOS TOTALES / TOTAL AIB');
    const equiposAib   = this._sum(recAib,    'TUBOS TOTALES / TOTAL AIB');
    const unidadesViga = this._sum(recViga,   'TUBOS TOTALES / TOTAL AIB');

    const eficGeneral = this._avg(rec, 'EFICIENCIA') * 100;
    const eficCasing  = this._avg(recCasing, 'EFICIENCIA') * 100;
    const eficAib     = this._avg(recAib,    'EFICIENCIA') * 100;
    const eficViga    = this._avg(recViga,   'EFICIENCIA') * 100;

    const jornadaPromCasing = this._avg(recCasing, 'TIEMPO JORNADA');
    const jornadaPromAib    = this._avg(recAib,    'TIEMPO JORNADA');
    const jornadaPromViga   = this._avg(recViga,   'TIEMPO JORNADA');

    // ----- Estiba -----
    const estOps      = est.length;
    const estPaquetes = this._sum(est, 'PAQUETES ESTIBADOS');
    const estTubos    = this._sum(est, 'TOTAL DE TUBERIAS');
    const estPkth     = this._avg(est, 'PAQUETES/HORA');
    const diasEstiba  = new Set(est.map(r => {
      const f = LectorDatos.parseFecha(r['FECHA']);
      return f ? f.toDateString() : null;
    }).filter(Boolean)).size;
    const racks = new Set(est.map(r =>
      `${r['PASILLO']}-${r['RACK']}`
    )).size;
    const montacargas = new Set(est.map(r =>
      String(r['MONTACARGA'] || '').replace('HANGCHAN', 'HANGCHA').trim()
    ).filter(m => m)).size;

    // ----- Despacho -----
    const desOps    = des.length;
    const desActas  = new Set(des.map(r => r['N° DE ACTA']).filter(a => a)).size;
    const desTubos  = this._sum(des, 'TOTAL DE TUBERIAS');
    const desMin    = this._sum(des, 'TIEMPO') * 60;  // horas → min

    // Clasificar despachos por tipo usando el CÓDIGO con catálogo
    // (290xxx puede ser AIB o VIGA, por eso necesitamos el catálogo)
    const esTipoDespacho = (r) => {
      const cod = String(r['CODIGO'] || '').trim().replace(/^0+/, '');
      const item = Catalogo.buscar(cod);
      if (item) return item.tipo;
      // Fallback: por descripción
      const desc = String(r['DESCRIPCION'] || '').toUpperCase();
      if (desc.includes('VIGA') || desc.includes('CONCRETO')) {
        return 'VIGA';
      }
      if (desc.includes('AIB') || desc.includes('UNIDAD BOMBEO') || desc.includes('BOMBEO')) {
        return 'AIB';
      }
      return 'CASING';  // por defecto
    };
    const desCasing = des.filter(r => esTipoDespacho(r) === 'CASING');
    const desAib    = des.filter(r => esTipoDespacho(r) === 'AIB');
    const desViga   = des.filter(r => esTipoDespacho(r) === 'VIGA');
    const desTubosCasing  = this._sum(desCasing, 'TOTAL DE TUBERIAS');
    const desTubosAib     = this._sum(desAib,    'TOTAL DE TUBERIAS');
    const desUnidadesViga = this._sum(desViga,   'TOTAL DE TUBERIAS');
    const desActasCasing = new Set(desCasing.map(r => r['N° DE ACTA']).filter(a => a)).size;
    const desActasAib    = new Set(desAib.map(r => r['N° DE ACTA']).filter(a => a)).size;
    const desActasViga   = new Set(desViga.map(r => r['N° DE ACTA']).filter(a => a)).size;
    const desOpsCasing   = desCasing.length;
    const desOpsAib      = desAib.length;
    const desOpsViga     = desViga.length;

    return {
      // Recepción
      camiones_unicos:    camionesUnicos,
      casing_camiones:    casingCamiones,
      aib_camiones:       aibCamiones,
      viga_camiones:      vigaCamiones,
      tubos_casing:       tubosCasing,
      equipos_aib:        equiposAib,
      unidades_viga:      unidadesViga,
      eficiencia_general: eficGeneral,
      eficiencia_casing:  eficCasing,
      eficiencia_aib:     eficAib,
      eficiencia_viga:    eficViga,
      jornada_prom_casing: jornadaPromCasing,
      jornada_prom_aib:   jornadaPromAib,
      jornada_prom_viga:  jornadaPromViga,
      // Estiba
      estiba_ops:      estOps,
      estiba_paquetes: estPaquetes,
      estiba_tubos:    estTubos,
      estiba_pkth:     estPkth,
      estiba_dias:     diasEstiba,
      estiba_montac:   montacargas,
      estiba_racks:    racks,
      // Despacho - totales mezclados (para compatibilidad)
      despacho_ops:   desOps,
      despacho_actas: desActas,
      despacho_tubos: desTubos,
      despacho_min:   desMin,
      // Despacho - separado por tipo
      despacho_tubos_casing:    desTubosCasing,
      despacho_tubos_aib:       desTubosAib,
      despacho_unidades_viga:   desUnidadesViga,
      despacho_actas_casing:    desActasCasing,
      despacho_actas_aib:       desActasAib,
      despacho_actas_viga:      desActasViga,
      despacho_ops_casing:      desOpsCasing,
      despacho_ops_aib:         desOpsAib,
      despacho_ops_viga:        desOpsViga
    };
  },

  // Acumulados del proyecto entero
  acumuladosProyecto() {
    const todo = {
      recepcion: DatosCache.filas('recepcion'),
      estiba:    DatosCache.filas('estiba'),
      despacho:  DatosCache.filas('despacho')
    };
    return this.calcular(todo);
  },

  /**
   * Indicadores detallados para la slide "Indicadores Acumulados"
   * (basada en el formato del reporte S20).
   */
  acumuladosDetallados() {
    const rec = DatosCache.filas('recepcion');
    const est = DatosCache.filas('estiba');

    const recCasing = rec.filter(r => r['TIPO MATERIAL'] === 'CASING');
    const recAib    = rec.filter(r => r['TIPO MATERIAL'] === 'AIB');
    const recViga   = rec.filter(r => r['TIPO MATERIAL'] === 'VIGA');

    // === AIB ===
    const stockAib = this._sum(recAib, 'TUBOS TOTALES / TOTAL AIB');
    const promDescargaAib = this._avg(recAib, 'TIEMPO JORNADA');
    const eficAib = this._avg(recAib, 'EFICIENCIA') * 100;
    const horasAib = this._sum(recAib, 'TIEMPO JORNADA') / 60;
    const prodAib = horasAib > 0 ? stockAib / horasAib : 0;

    // === CASING ===
    const stockCasing = this._sum(recCasing, 'TUBOS TOTALES / TOTAL AIB');
    const promDescargaCasing = this._avg(recCasing, 'TIEMPO JORNADA');
    const eficCasing = this._avg(recCasing, 'EFICIENCIA') * 100;
    const horasCasing = this._sum(recCasing, 'TIEMPO JORNADA') / 60;
    const prodTubosHora = horasCasing > 0 ? stockCasing / horasCasing : 0;

    // === VIGA ===
    const stockViga = this._sum(recViga, 'TUBOS TOTALES / TOTAL AIB');
    const promDescargaViga = this._avg(recViga, 'TIEMPO JORNADA');
    const eficViga = this._avg(recViga, 'EFICIENCIA') * 100;
    const horasViga = this._sum(recViga, 'TIEMPO JORNADA') / 60;
    const prodViga = horasViga > 0 ? stockViga / horasViga : 0;

    // === ESTIBADO ===
    const totalTubosEst = this._sum(est, 'TOTAL DE TUBERIAS');
    const totalPaqEst = this._sum(est, 'PAQUETES ESTIBADOS');
    const avanceEstiba = stockCasing > 0 ? (totalTubosEst / stockCasing * 100) : 0;
    const prodPaqHora = this._avg(est, 'PAQUETES/HORA');

    return {
      // AIB
      aib_prom_descarga: promDescargaAib,
      aib_stock_total: stockAib,
      aib_eficiencia: eficAib,
      aib_productividad: prodAib,
      // CASING
      casing_prom_descarga: promDescargaCasing,
      casing_stock_total: stockCasing,
      casing_eficiencia: eficCasing,
      casing_productividad: prodTubosHora,
      // VIGA
      viga_prom_descarga: promDescargaViga,
      viga_stock_total: stockViga,
      viga_eficiencia: eficViga,
      viga_productividad: prodViga,
      // ESTIBADO
      est_total_tubos: totalTubosEst,
      est_total_paquetes: totalPaqEst,
      est_avance: avanceEstiba,
      est_productividad: prodPaqHora,
    };
  },

  /**
   * KPIs agregados por semana — útil para gráfico de evolución.
   * Devuelve array ordenado por semana ascendente:
   * [ { semana: N, efic_casing, efic_aib, tubos_casing, tubos_aib, ... }, ... ]
   */
  porSemana() {
    const rec = DatosCache.filas('recepcion');
    const est = DatosCache.filas('estiba');
    const semanasMap = {};

    // Recepción
    rec.forEach(r => {
      let sem = parseInt(r['SEMANA']);
      if (!sem || isNaN(sem)) {
        const f = LectorDatos.parseFecha(r['FECHA']);
        if (f) sem = LectorDatos.semanaISO(f);
      }
      if (!sem) return;

      if (!semanasMap[sem]) {
        semanasMap[sem] = {
          semana: sem,
          tubos_casing: 0, tubos_aib: 0,
          ef_casing_sum: 0, ef_casing_n: 0,
          ef_aib_sum: 0, ef_aib_n: 0,
          paq_estiba: 0, tubos_estiba: 0,
          pkth_sum: 0, pkth_n: 0
        };
      }
      const t = parseFloat(r['TUBOS TOTALES / TOTAL AIB']) || 0;
      const ef = parseFloat(r['EFICIENCIA']) || 0;
      if (r['TIPO MATERIAL'] === 'CASING') {
        semanasMap[sem].tubos_casing += t;
        if (!isNaN(ef) && ef > 0) {
          semanasMap[sem].ef_casing_sum += ef;
          semanasMap[sem].ef_casing_n++;
        }
      } else if (r['TIPO MATERIAL'] === 'AIB') {
        semanasMap[sem].tubos_aib += t;
        if (!isNaN(ef) && ef > 0) {
          semanasMap[sem].ef_aib_sum += ef;
          semanasMap[sem].ef_aib_n++;
        }
      }
    });

    // Estiba
    est.forEach(r => {
      const f = LectorDatos.parseFecha(r['FECHA']);
      if (!f) return;
      const sem = LectorDatos.semanaISO(f);
      if (!semanasMap[sem]) {
        semanasMap[sem] = {
          semana: sem,
          tubos_casing: 0, tubos_aib: 0,
          ef_casing_sum: 0, ef_casing_n: 0,
          ef_aib_sum: 0, ef_aib_n: 0,
          paq_estiba: 0, tubos_estiba: 0,
          pkth_sum: 0, pkth_n: 0
        };
      }
      semanasMap[sem].paq_estiba += parseFloat(r['PAQUETES ESTIBADOS']) || 0;
      semanasMap[sem].tubos_estiba += parseFloat(r['TOTAL DE TUBERIAS']) || 0;
      const pkth = parseFloat(r['PAQUETES/HORA']);
      if (!isNaN(pkth) && pkth > 0) {
        semanasMap[sem].pkth_sum += pkth;
        semanasMap[sem].pkth_n++;
      }
    });

    // Calcular promedios y convertir a array ordenado
    return Object.values(semanasMap)
      .map(s => ({
        semana: s.semana,
        tubos_casing: s.tubos_casing,
        tubos_aib: s.tubos_aib,
        eficiencia_casing: s.ef_casing_n > 0 ? (s.ef_casing_sum / s.ef_casing_n * 100) : 0,
        eficiencia_aib:    s.ef_aib_n > 0    ? (s.ef_aib_sum / s.ef_aib_n * 100)    : 0,
        paquetes_estiba: s.paq_estiba,
        tubos_estiba: s.tubos_estiba,
        pkth: s.pkth_n > 0 ? (s.pkth_sum / s.pkth_n) : 0
      }))
      .sort((a, b) => a.semana - b.semana);
  },

  _sum(arr, key) {
    let s = 0;
    arr.forEach(r => {
      const v = parseFloat(r[key]);
      if (!isNaN(v)) s += v;
    });
    return s;
  },

  _avg(arr, key) {
    let s = 0, n = 0;
    arr.forEach(r => {
      const v = parseFloat(r[key]);
      if (!isNaN(v)) { s += v; n++; }
    });
    return n > 0 ? s / n : 0;
  }
};
