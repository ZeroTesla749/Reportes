/* ============================================================
   LECTOR DE DATOS — Filtros y normalización
   ============================================================ */

/**
 * Helper centralizado para fechas.
 *
 * IMPORTANTE: el bug "selecciono 25 me da el 24" ocurría porque
 * `new Date("2026-05-25")` en JavaScript se interpreta como UTC
 * medianoche. En Perú (UTC-5) eso son las 19:00 del día 24 local.
 * Por eso ahora parseamos los strings YYYY-MM-DD construyendo
 * la fecha con los componentes locales explícitamente.
 */
const FechaUtil = {

  /**
   * Parsea un string "YYYY-MM-DD" como fecha LOCAL (medianoche local).
   * Para strings con T (ISO completo) usa new Date estándar.
   */
  parseLocal(s) {
    if (!s) return null;
    if (s instanceof Date) return s;
    if (typeof s !== 'string') return null;
    s = s.trim();

    // YYYY-MM-DD puro → fecha local a medianoche
    const m1 = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m1) {
      return new Date(parseInt(m1[1]), parseInt(m1[2]) - 1, parseInt(m1[3]),
                       0, 0, 0, 0);
    }

    // DD/MM/YYYY también soportado
    const m2 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m2) {
      return new Date(parseInt(m2[3]), parseInt(m2[2]) - 1, parseInt(m2[1]),
                       0, 0, 0, 0);
    }

    // ISO completo con hora
    const d = new Date(s);
    return isNaN(d) ? null : d;
  },

  /** Construye una fecha local desde año, mes (1-12), día. */
  local(anio, mes, dia) {
    return new Date(anio, mes - 1, dia, 0, 0, 0, 0);
  },

  /** Inicio del día (00:00:00) local */
  inicioDia(d) {
    const r = new Date(d);
    r.setHours(0, 0, 0, 0);
    return r;
  },

  /** Fin del día (23:59:59.999) local */
  finDia(d) {
    const r = new Date(d);
    r.setHours(23, 59, 59, 999);
    return r;
  },

  /** Convierte una fecha a string YYYY-MM-DD (componentes locales) */
  toInputDate(d) {
    if (!d) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dia}`;
  },

  /** Formatea DD/MM/YYYY */
  fmt(d) {
    if (!d) return '';
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    return `${dia}/${mes}/${d.getFullYear()}`;
  }
};


const LectorDatos = {

  // ============================================================
  // Parsea una fecha del Sheet (ISO string, Date, o lo que sea)
  // ============================================================
  parseFecha(v) {
    if (!v) return null;
    if (v instanceof Date) return v;
    if (typeof v === 'string') {
      const d = new Date(v);
      return isNaN(d) ? null : d;
    }
    if (typeof v === 'number') {
      // Excel serial
      return new Date((v - 25569) * 86400 * 1000);
    }
    return null;
  },

  // ============================================================
  // Devuelve fecha mínima y máxima entre las 3 hojas
  // ============================================================
  rangoFechas() {
    const fechas = [];
    ['recepcion', 'estiba', 'despacho'].forEach(h => {
      DatosCache.filas(h).forEach(r => {
        const f = this.parseFecha(r['FECHA']);
        if (f) fechas.push(f);
      });
    });
    if (fechas.length === 0) return { min: null, max: null };
    return {
      min: new Date(Math.min(...fechas.map(f => f.getTime()))),
      max: new Date(Math.max(...fechas.map(f => f.getTime())))
    };
  },

  // ============================================================
  // Lista de semanas con actividad (basado en columna SEMANA o WEEKNUM)
  // ============================================================
  semanasDisponibles() {
    const sem = new Set();
    DatosCache.filas('recepcion').forEach(r => {
      let s = r['SEMANA'];
      if (s === null || s === '' || s === undefined) {
        const f = this.parseFecha(r['FECHA']);
        if (f) s = this.semanaISO(f);
      }
      if (s) sem.add(parseInt(s));
    });
    return [...sem].filter(n => !isNaN(n)).sort((a, b) => a - b);
  },

  // ============================================================
  // Meses disponibles
  // ============================================================
  mesesDisponibles() {
    const meses = new Set();
    ['recepcion', 'estiba', 'despacho'].forEach(h => {
      DatosCache.filas(h).forEach(r => {
        const f = this.parseFecha(r['FECHA']);
        if (f) meses.add(f.getFullYear() * 100 + (f.getMonth() + 1));
      });
    });
    return [...meses].sort((a, b) => a - b).map(k => ({
      anio: Math.floor(k / 100),
      mes:  k % 100
    }));
  },

  // ============================================================
  // Semana ISO de una fecha
  // ============================================================
  semanaISO(f) {
    const d = new Date(Date.UTC(f.getFullYear(), f.getMonth(), f.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  },

  // ============================================================
  // FILTRAR POR RANGO DE FECHAS (local time)
  // Devuelve { recepcion: [], estiba: [], despacho: [] }
  // ============================================================
  filtrarPorRango(fDesde, fHasta) {
    const inicio = FechaUtil.inicioDia(fDesde);
    const fin = FechaUtil.finDia(fHasta);

    const filtro = filas => filas.filter(r => {
      const f = this.parseFecha(r['FECHA']);
      return f && f >= inicio && f <= fin;
    });

    return {
      recepcion: filtro(DatosCache.filas('recepcion')),
      estiba:    filtro(DatosCache.filas('estiba')),
      despacho:  filtro(DatosCache.filas('despacho'))
    };
  },

  // ============================================================
  // FILTRAR POR SEMANA ISO
  // ============================================================
  filtrarPorSemana(numSemana) {
    // Encuentro fechas de esa semana en recepción (si las hay)
    const fechas = [];
    DatosCache.filas('recepcion').forEach(r => {
      let s = r['SEMANA'];
      if (s === null || s === '' || s === undefined) {
        const f = this.parseFecha(r['FECHA']);
        if (f) s = this.semanaISO(f);
      }
      if (parseInt(s) === numSemana) {
        const f = this.parseFecha(r['FECHA']);
        if (f) fechas.push(f);
      }
    });

    let lunes, domingo;
    if (fechas.length > 0) {
      const min = new Date(Math.min(...fechas.map(d => d.getTime())));
      lunes = new Date(min);
      lunes.setDate(min.getDate() - ((min.getDay() + 6) % 7));
      domingo = new Date(lunes);
      domingo.setDate(lunes.getDate() + 6);
    } else {
      // Fallback: calcular semana ISO del año actual
      const anio = new Date().getFullYear();
      const ene4 = new Date(anio, 0, 4);
      const lunesS1 = new Date(ene4);
      lunesS1.setDate(ene4.getDate() - ((ene4.getDay() + 6) % 7));
      lunes = new Date(lunesS1);
      lunes.setDate(lunesS1.getDate() + (numSemana - 1) * 7);
      domingo = new Date(lunes);
      domingo.setDate(lunes.getDate() + 6);
    }

    return {
      ...this.filtrarPorRango(lunes, domingo),
      _periodo: { lunes, domingo, numSemana }
    };
  },

  // ============================================================
  // FILTRAR AVANCE TOTAL (todo el proyecto)
  // ============================================================
  filtrarAvanceTotal() {
    const r = this.rangoFechas();
    if (!r.min) return { recepcion: [], estiba: [], despacho: [] };
    return {
      ...this.filtrarPorRango(r.min, r.max),
      _periodo: { min: r.min, max: r.max }
    };
  },

  // ============================================================
  // CAMIONES ÚNICOS (placa + guía)
  // ============================================================
  camionesUnicos(filasRecepcion) {
    const ids = new Set();
    filasRecepcion.forEach(r => {
      const placa = String(r['PLACA TRACTO'] || '').trim().toUpperCase();
      const guia  = String(r['N° GUIA'] || '').trim().toUpperCase();
      ids.add(placa + '|' + guia);
    });
    return ids.size;
  }
};
