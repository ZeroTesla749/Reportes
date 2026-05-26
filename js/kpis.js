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

    const camionesUnicos = LectorDatos.camionesUnicos(rec);
    const casingCamiones = LectorDatos.camionesUnicos(recCasing);
    const aibCamiones    = LectorDatos.camionesUnicos(recAib);

    const tubosCasing = this._sum(recCasing, 'TUBOS TOTALES / TOTAL AIB');
    const equiposAib  = this._sum(recAib,    'TUBOS TOTALES / TOTAL AIB');

    const eficGeneral = this._avg(rec, 'EFICIENCIA') * 100;
    const eficCasing  = this._avg(recCasing, 'EFICIENCIA') * 100;
    const eficAib     = this._avg(recAib,    'EFICIENCIA') * 100;

    const jornadaPromCasing = this._avg(recCasing, 'TIEMPO JORNADA');
    const jornadaPromAib    = this._avg(recAib,    'TIEMPO JORNADA');

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

    return {
      // Recepción
      camiones_unicos:    camionesUnicos,
      casing_camiones:    casingCamiones,
      aib_camiones:       aibCamiones,
      tubos_casing:       tubosCasing,
      equipos_aib:        equiposAib,
      eficiencia_general: eficGeneral,
      eficiencia_casing:  eficCasing,
      eficiencia_aib:     eficAib,
      jornada_prom_casing: jornadaPromCasing,
      jornada_prom_aib:   jornadaPromAib,
      // Estiba
      estiba_ops:      estOps,
      estiba_paquetes: estPaquetes,
      estiba_tubos:    estTubos,
      estiba_pkth:     estPkth,
      estiba_dias:     diasEstiba,
      estiba_montac:   montacargas,
      estiba_racks:    racks,
      // Despacho
      despacho_ops:   desOps,
      despacho_actas: desActas,
      despacho_tubos: desTubos,
      despacho_min:   desMin
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
