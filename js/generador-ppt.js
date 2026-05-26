/* ============================================================
   GENERADOR DE PRESENTACIONES — Reportes Laguna
   Usa PptxGenJS (cargado en index.html como <script src=...>)
   ============================================================ */

const GeneradorPPT = {

  // Colores en formato hex sin "#"
  C: CONFIG.colores,

  /**
   * Genera y descarga un .pptx
   * opciones: {
   *   tipoReporte: 'diario'|'semanal'|'mensual'|'rango'|'avance',
   *   datos: { recepcion, estiba, despacho },
   *   kpis: {...},
   *   acumulados: {...},
   *   periodoTitulo, periodoSubtitulo, fechasStr,
   *   etiquetasFotos: [],
   *   incluirFotos: bool,
   *   preparadoPor: ''
   * }
   */
  async generar(opciones) {
    const pres = new PptxGenJS();
    pres.layout = 'LAYOUT_WIDE';
    pres.title = 'Reporte Laguna - ' + opciones.periodoTitulo;

    // Cada slide se construye en su propio método
    this._slidePortada(pres, opciones);
    this._slideDashboard(pres, opciones);

    const esDiario = (opciones.tipoReporte === 'diario');

    if (!esDiario) {
      this._slideRecepcion(pres, opciones);
      this._slideEstiba(pres, opciones);
      this._slideDespacho(pres, opciones);
    } else {
      // Diario: solo lo que tenga actividad
      if (opciones.kpis.camiones_unicos > 0)  this._slideRecepcion(pres, opciones);
      if (opciones.kpis.estiba_ops > 0)       this._slideEstiba(pres, opciones);
      if (opciones.kpis.despacho_ops > 0)     this._slideDespacho(pres, opciones);
    }

    this._slideInventario(pres, opciones);

    // NUEVA SLIDE — Indicadores acumulados del proyecto
    // Aparece en todos los tipos de reporte
    this._slideIndicadoresAcumulados(pres, opciones);

    this._slideConclusiones(pres, opciones);

    if (opciones.incluirFotos && opciones.etiquetasFotos && opciones.etiquetasFotos.length > 0) {
      this._slideFotos(pres, opciones);
    }

    // Nombre del archivo
    const fecha = new Date();
    const ts = fecha.getFullYear() +
               String(fecha.getMonth() + 1).padStart(2, '0') +
               String(fecha.getDate()).padStart(2, '0') + '_' +
               String(fecha.getHours()).padStart(2, '0') +
               String(fecha.getMinutes()).padStart(2, '0');
    const nombre = `Reporte_${this._cap(opciones.tipoReporte)}_${ts}.pptx`;

    await pres.writeFile({ fileName: nombre });
    return nombre;
  },

  // ============================================================
  // BARRA DE TÍTULO ESTÁNDAR
  // ============================================================
  _addTitleBar(slide, titulo, subtitulo, accent) {
    // Fondo gris
    slide.addShape('rect', {
      x: 0, y: 0, w: 13.33, h: 0.75,
      fill: { color: this.C.gris }, line: { color: this.C.gris }
    });
    // Línea acento
    slide.addShape('rect', {
      x: 0, y: 0.75, w: 13.33, h: 0.05,
      fill: { color: accent }, line: { color: accent }
    });
    // Título
    slide.addText(titulo, {
      x: 0.35, y: 0.1, w: 9.5, h: 0.5,
      fontSize: 18, bold: true, color: this.C.blanco,
      fontFace: 'Calibri', align: 'left', valign: 'middle'
    });
    // Subtítulo
    slide.addText(subtitulo, {
      x: 9.5, y: 0.1, w: 3.6, h: 0.5,
      fontSize: 13, color: this.C.amarillo,
      fontFace: 'Calibri', align: 'right', valign: 'middle'
    });
  },

  // ============================================================
  // TARJETA KPI (panel blanco + barra superior + valor + 2 labels)
  // ============================================================
  _addKpiCard(slide, x, y, w, h, valor, label1, label2, barColor, opts = {}) {
    const valSize = opts.valSize || 28;
    const l1Size  = opts.l1Size  || 12;
    const l2Size  = opts.l2Size  || 10;

    // Panel blanco
    slide.addShape('rect', {
      x, y, w, h,
      fill: { color: this.C.blanco },
      line: { color: this.C.borde, width: 0.5 }
    });
    // Barra superior
    slide.addShape('rect', {
      x, y, w, h: 0.07,
      fill: { color: barColor }, line: { color: barColor }
    });
    // Valor
    slide.addText(valor, {
      x, y: y + 0.1, w, h: h * 0.5,
      fontSize: valSize, bold: true, color: this.C.negro,
      fontFace: 'Calibri', align: 'center', valign: 'middle'
    });
    // Label 1
    slide.addText(label1, {
      x, y: y + h * 0.58, w, h: h * 0.2,
      fontSize: l1Size, bold: true, color: this.C.gris,
      fontFace: 'Calibri', align: 'center', valign: 'middle'
    });
    // Label 2
    if (label2) {
      slide.addText(label2, {
        x, y: y + h * 0.78, w, h: h * 0.2,
        fontSize: l2Size, color: this.C.txtGris,
        fontFace: 'Calibri', align: 'center', valign: 'middle'
      });
    }
  },

  // ============================================================
  // SLIDE 1: PORTADA
  // ============================================================
  _slidePortada(pres, opt) {
    const slide = pres.addSlide();
    slide.background = { color: this.C.gris };

    // Barra lateral amarilla
    slide.addShape('rect', {
      x: 0, y: 0, w: 0.15, h: 7.5,
      fill: { color: this.C.amarillo }, line: { color: this.C.amarillo }
    });

    // Tag
    const tipoMap = {
      diario: 'REPORTE DIARIO',
      semanal: 'REPORTE SEMANAL',
      mensual: 'REPORTE MENSUAL',
      rango: 'REPORTE PERSONALIZADO',
      avance: 'AVANCE TOTAL DEL PROYECTO'
    };
    slide.addText(tipoMap[opt.tipoReporte] || 'REPORTE', {
      x: 0.5, y: 0.9, w: 8, h: 0.4,
      fontSize: 13, bold: true, color: this.C.amarillo,
      fontFace: 'Calibri'
    });

    // Título grande
    const tituloPortada = this._tituloPortada(opt);
    slide.addText(tituloPortada, {
      x: 0.5, y: 1.4, w: 11, h: 1.4,
      fontSize: 54, bold: true, color: this.C.blanco,
      fontFace: 'Calibri'
    });

    // Línea naranja
    slide.addShape('rect', {
      x: 0.5, y: 2.9, w: 6.5, h: 0.05,
      fill: { color: this.C.naranja }, line: { color: this.C.naranja }
    });

    // Subtítulo
    slide.addText('RECEPCIÓN · ESTIBA · DESPACHO', {
      x: 0.5, y: 3.05, w: 11, h: 0.4,
      fontSize: 18, color: this.C.blanco, fontFace: 'Calibri'
    });

    // Rango fechas
    slide.addText(opt.fechasStr, {
      x: 0.5, y: 3.55, w: 11, h: 0.3,
      fontSize: 14, color: 'D0D0D0', fontFace: 'Calibri'
    });

    // 4 KPIs principales
    const k = opt.kpis;
    const kpis = [
      [String(k.equipos_aib || 0),     'EQUIPOS AIB RECIBIDOS', this.C.verde],
      [this._n(k.estiba_tubos),        'TUBOS ESTIBADOS',       this.C.amarillo],
      [String(k.despacho_tubos || 0),  'TUBOS DESPACHADOS',     this.C.naranja],
      [String(k.despacho_actas || 0),  'ACTAS DE DESPACHO',     this.C.verde]
    ];
    const mleft = 0.5, kgap = 0.15;
    const kw = (12.3 - 3 * kgap) / 4;
    const ky = 4.5;
    const kh = 1.0;
    kpis.forEach((kpi, i) => {
      const kx = mleft + i * (kw + kgap);
      // Panel oscuro
      slide.addShape('rect', {
        x: kx, y: ky, w: kw, h: kh,
        fill: { color: this.C.grisOsc },
        line: { color: '5A5E63', width: 0.75 }
      });
      // Barra superior
      slide.addShape('rect', {
        x: kx, y: ky, w: kw, h: 0.06,
        fill: { color: kpi[2] }, line: { color: kpi[2] }
      });
      // Valor
      slide.addText(kpi[0], {
        x: kx, y: ky + 0.1, w: kw, h: 0.5,
        fontSize: 32, bold: true, color: kpi[2],
        fontFace: 'Calibri', align: 'center'
      });
      // Label
      slide.addText(kpi[1], {
        x: kx, y: ky + 0.6, w: kw, h: 0.35,
        fontSize: 11, bold: true, color: this.C.blanco,
        fontFace: 'Calibri', align: 'center'
      });
    });

    // Pie
    slide.addText(CONFIG.proyecto.ubicacion, {
      x: 0.5, y: 6.7, w: 9, h: 0.3,
      fontSize: 11, color: this.C.txtGris, fontFace: 'Calibri'
    });
    slide.addText('Preparado por: ' + (opt.preparadoPor || CONFIG.proyecto.preparadoPorDefault), {
      x: 0.5, y: 7.0, w: 9, h: 0.3,
      fontSize: 10, color: this.C.txtGris, fontFace: 'Calibri'
    });
  },

  _tituloPortada(opt) {
    const tipo = opt.tipoReporte;
    if (tipo === 'semanal' || tipo === 'mensual') {
      return opt.periodoTitulo.toUpperCase();
    }
    if (tipo === 'avance') return 'AVANCE TOTAL';
    if (tipo === 'rango')  return 'REPORTE PERSONALIZADO';
    return 'REPORTE DIARIO';
  },

  // ============================================================
  // SLIDE 2: DASHBOARD EJECUTIVO
  // ============================================================
  _slideDashboard(pres, opt) {
    const slide = pres.addSlide();
    slide.background = { color: this.C.gris };
    this._addTitleBar(slide,
      'DASHBOARD EJECUTIVO — ' + opt.periodoTitulo,
      opt.periodoSubtitulo, this.C.amarillo);

    const k = opt.kpis;

    // 5 KPIs comparativos
    const kpis = [
      [String(k.camiones_unicos || 0), 'Camiones',          this.C.amarillo],
      [this._n(k.tubos_casing),        'Tubos Casing',      this.C.verde],
      [String(k.equipos_aib || 0),     'Equipos AIB',       this.C.naranja],
      [String(k.despacho_tubos || 0),  'Tubos Despachados', this.C.amarillo],
      [k.eficiencia_general.toFixed(1) + '%', 'Eficiencia', this.C.verde]
    ];
    const mleft = 0.2, kgap = 0.12;
    const kw = (12.93 - 4 * kgap) / 5;
    const ky = 1.2;
    const kh = 1.3;
    kpis.forEach((kpi, i) => {
      const kx = mleft + i * (kw + kgap);
      this._addKpiCard(slide, kx, ky, kw, kh, kpi[0], kpi[1], '', kpi[2],
                       { valSize: 28, l1Size: 12 });
    });

    // Resumen por área
    slide.addText('RESUMEN POR ÁREA OPERATIVA', {
      x: 0.2, y: 2.8, w: 12.93, h: 0.4,
      fontSize: 12, bold: true, color: this.C.blanco, fontFace: 'Calibri'
    });

    const areas = [
      ['RECEPCIÓN',
       `${k.camiones_unicos} camiones · ${this._n(k.tubos_casing)} casing · ${k.equipos_aib} AIB`,
       `Eficiencia: ${k.eficiencia_general.toFixed(1)}%`,
       this.C.amarillo],
      ['ESTIBA',
       `${k.estiba_ops} ops · ${k.estiba_paquetes} paq · ${this._n(k.estiba_tubos)} tubos`,
       `${k.estiba_dias} días · ${k.estiba_pkth.toFixed(2)} paq/h`,
       this.C.verde],
      ['DESPACHO',
       `${k.despacho_actas} actas · ${k.despacho_tubos} tubos`,
       k.despacho_min > 0 ? `${Math.round(k.despacho_min)} min total` : '—',
       this.C.naranja]
    ];
    const fy = 3.3;
    const fh = 0.75;
    areas.forEach((a, i) => {
      const y = fy + i * (fh + 0.12);
      // Fondo
      slide.addShape('rect', {
        x: 0.2, y, w: 12.93, h: fh,
        fill: { color: this.C.grisOsc },
        line: { color: a[3], width: 0.75 }
      });
      // Barra lateral
      slide.addShape('rect', {
        x: 0.2, y, w: 0.08, h: fh,
        fill: { color: a[3] }, line: { color: a[3] }
      });
      // Etiqueta
      slide.addText(a[0], {
        x: 0.35, y, w: 2.2, h: fh,
        fontSize: 16, bold: true, color: a[3],
        fontFace: 'Calibri', valign: 'middle'
      });
      // Desc1
      slide.addText(a[1], {
        x: 2.7, y, w: 7.5, h: fh,
        fontSize: 12, color: this.C.blanco, fontFace: 'Calibri',
        valign: 'middle'
      });
      // Desc2
      slide.addText(a[2], {
        x: 10.2, y, w: 2.9, h: fh,
        fontSize: 11, bold: true, color: a[3], fontFace: 'Calibri',
        align: 'right', valign: 'middle'
      });
    });
  },

  // ============================================================
  // SLIDE: RECEPCIÓN (tabla de operaciones)
  // ============================================================
  _slideRecepcion(pres, opt) {
    const slide = pres.addSlide();
    slide.background = { color: this.C.gris };
    this._addTitleBar(slide,
      'RECEPCIÓN — ' + opt.periodoTitulo,
      opt.periodoSubtitulo, this.C.naranja);

    const k = opt.kpis;
    const kpis = [
      [String(k.camiones_unicos), 'Camiones únicos', 'placa + guía', this.C.naranja],
      [String(k.equipos_aib),     'Equipos AIB',     'recibidos',    this.C.verde],
      [this._n(k.tubos_casing),   'Tubos Casing',    'recibidos',    this.C.amarillo],
      [k.eficiencia_general.toFixed(1) + '%', 'Eficiencia', 'promedio', this.C.verde]
    ];
    const kw = 3.05, kh = 1.2, ky = 1.0;
    kpis.forEach((kpi, i) => {
      this._addKpiCard(slide, 0.2 + i * (kw + 0.1), ky, kw, kh,
                       kpi[0], kpi[1], kpi[2], kpi[3]);
    });

    // Tabla de operaciones
    const filas = opt.datos.recepcion || [];
    if (filas.length === 0) {
      slide.addText('Sin operaciones de recepción en el período seleccionado.', {
        x: 0.2, y: 3.0, w: 12.93, h: 0.5,
        fontSize: 14, color: this.C.txtGris, fontFace: 'Calibri',
        align: 'center'
      });
      return;
    }

    slide.addText(`DETALLE DE OPERACIONES (${filas.length} en total)`, {
      x: 0.2, y: 2.55, w: 12.93, h: 0.3,
      fontSize: 12, bold: true, color: this.C.blanco, fontFace: 'Calibri'
    });

    // Tabla con PptxGenJS
    const rows = [
      [
        { text: 'FECHA', options: { bold: true, color: this.C.blanco, fill: this.C.gris } },
        { text: 'PLACA', options: { bold: true, color: this.C.blanco, fill: this.C.gris } },
        { text: 'TIPO', options: { bold: true, color: this.C.blanco, fill: this.C.gris } },
        { text: 'MATERIAL', options: { bold: true, color: this.C.blanco, fill: this.C.gris } },
        { text: 'CANT.', options: { bold: true, color: this.C.blanco, fill: this.C.gris, align: 'center' } },
        { text: 'JORNADA', options: { bold: true, color: this.C.blanco, fill: this.C.gris, align: 'center' } },
        { text: 'EFIC.', options: { bold: true, color: this.C.blanco, fill: this.C.gris, align: 'center' } },
        { text: 'EXCED.', options: { bold: true, color: this.C.blanco, fill: this.C.gris, align: 'center' } }
      ]
    ];
    filas.slice(0, 12).forEach((r, idx) => {
      const fill = idx % 2 === 0 ? this.C.blanco : 'F5F5F5';
      const fecha = LectorDatos.parseFecha(r['FECHA']);
      const fechaStr = fecha ? this._fmtFecha(fecha) : '—';
      const tubos = parseFloat(r['TUBOS TOTALES / TOTAL AIB']) || 0;
      const jornada = parseFloat(r['TIEMPO JORNADA']) || 0;
      const efic = (parseFloat(r['EFICIENCIA']) || 0) * 100;
      const excedente = parseFloat(r['TIEMPO EXCEDENTE']) || 0;

      rows.push([
        { text: fechaStr, options: { fill, fontSize: 9 } },
        { text: String(r['PLACA TRACTO'] || '').slice(0, 10), options: { fill, fontSize: 9 } },
        { text: String(r['TIPO MATERIAL'] || ''), options: { fill, fontSize: 9 } },
        { text: String(r['MEDIDA CASING'] || '').slice(0, 35), options: { fill, fontSize: 9 } },
        { text: String(Math.round(tubos)), options: { fill, fontSize: 9, color: this.C.verde, bold: true, align: 'center' } },
        { text: `${Math.round(jornada)} min`, options: { fill, fontSize: 9, align: 'center' } },
        { text: `${efic.toFixed(1)}%`, options: { fill, fontSize: 9, color: this.C.verde, bold: true, align: 'center' } },
        { text: `${Math.round(excedente)} min`, options: { fill, fontSize: 9, align: 'center' } }
      ]);
    });

    slide.addTable(rows, {
      x: 0.2, y: 2.9, w: 12.93,
      fontFace: 'Calibri', fontSize: 9,
      border: { type: 'solid', pt: 0.25, color: 'E0E0E0' }
    });

    if (filas.length > 12) {
      slide.addText(`... y ${filas.length - 12} operaciones más`, {
        x: 0.2, y: 7.0, w: 12.93, h: 0.3,
        fontSize: 9, color: this.C.txtGris, fontFace: 'Calibri', italic: true
      });
    }
  },

  // ============================================================
  // SLIDE: ESTIBA
  // ============================================================
  _slideEstiba(pres, opt) {
    const slide = pres.addSlide();
    slide.background = { color: this.C.gris };
    this._addTitleBar(slide,
      'ESTIBA EN RACKS — ' + opt.periodoTitulo,
      opt.periodoSubtitulo, this.C.verde);

    const k = opt.kpis;
    const kpis = [
      [String(k.estiba_ops),      'Operaciones', `En ${k.estiba_dias} días`, this.C.verde],
      [String(k.estiba_paquetes), 'Paquetes',    'Estibados', this.C.amarillo],
      [this._n(k.estiba_tubos),   'Tubos',       'Estibados', this.C.verde],
      [k.estiba_pkth.toFixed(2),  'Paq./hora',   'Promedio',  this.C.naranja]
    ];
    const kw = 3.05, kh = 1.2, ky = 1.0;
    kpis.forEach((kpi, i) => {
      this._addKpiCard(slide, 0.2 + i * (kw + 0.1), ky, kw, kh,
                       kpi[0], kpi[1], kpi[2], kpi[3]);
    });

    const filas = opt.datos.estiba || [];
    if (filas.length === 0) {
      slide.addText('Sin operaciones de estiba en el período seleccionado.', {
        x: 0.2, y: 3.0, w: 12.93, h: 0.5,
        fontSize: 14, color: this.C.txtGris, fontFace: 'Calibri',
        align: 'center'
      });
      return;
    }

    slide.addText('DETALLE DE OPERACIONES', {
      x: 0.2, y: 2.55, w: 12.93, h: 0.3,
      fontSize: 12, bold: true, color: this.C.blanco, fontFace: 'Calibri'
    });

    const rows = [
      [
        { text: 'FECHA',      options: { bold: true, color: this.C.blanco, fill: this.C.gris } },
        { text: 'PASILLO',    options: { bold: true, color: this.C.blanco, fill: this.C.gris } },
        { text: 'RACK',       options: { bold: true, color: this.C.blanco, fill: this.C.gris } },
        { text: 'MATERIAL',   options: { bold: true, color: this.C.blanco, fill: this.C.gris } },
        { text: 'PAQUETES',   options: { bold: true, color: this.C.blanco, fill: this.C.gris, align: 'center' } },
        { text: 'TUBOS',      options: { bold: true, color: this.C.blanco, fill: this.C.gris, align: 'center' } },
        { text: 'MONTACARGA', options: { bold: true, color: this.C.blanco, fill: this.C.gris } }
      ]
    ];
    filas.slice(0, 12).forEach((r, idx) => {
      const fill = idx % 2 === 0 ? this.C.blanco : 'F5F5F5';
      const fecha = LectorDatos.parseFecha(r['FECHA']);
      const fechaStr = fecha ? this._fmtFecha(fecha) : '—';
      const mont = String(r['MONTACARGA'] || '').replace('HANGCHAN', 'HANGCHA');

      rows.push([
        { text: fechaStr, options: { fill, fontSize: 9 } },
        { text: String(r['PASILLO'] || ''), options: { fill, fontSize: 9 } },
        { text: String(r['RACK'] || ''), options: { fill, fontSize: 9 } },
        { text: String(r['DESCRIPCION'] || '').slice(0, 35), options: { fill, fontSize: 9 } },
        { text: String(Math.round(parseFloat(r['PAQUETES ESTIBADOS']) || 0)),
          options: { fill, fontSize: 9, bold: true, align: 'center' } },
        { text: String(Math.round(parseFloat(r['TOTAL DE TUBERIAS']) || 0)),
          options: { fill, fontSize: 9, color: this.C.verde, bold: true, align: 'center' } },
        { text: mont, options: { fill, fontSize: 9 } }
      ]);
    });

    slide.addTable(rows, {
      x: 0.2, y: 2.9, w: 12.93,
      fontFace: 'Calibri', fontSize: 9,
      border: { type: 'solid', pt: 0.25, color: 'E0E0E0' }
    });
  },

  // ============================================================
  // SLIDE: DESPACHO
  // ============================================================
  _slideDespacho(pres, opt) {
    const slide = pres.addSlide();
    slide.background = { color: this.C.gris };
    this._addTitleBar(slide,
      'DESPACHO — ' + opt.periodoTitulo,
      opt.periodoSubtitulo, this.C.naranja);

    const k = opt.kpis;
    const kpis = [
      [String(k.despacho_actas),  'Actas Emitidas',     '',     this.C.naranja],
      [String(k.despacho_tubos),  'Tubos Despachados',  '',     this.C.amarillo],
      [`${Math.round(k.despacho_min)} min`, 'Tiempo Total', '', this.C.verde],
      [String(k.despacho_ops),    'Operaciones',        'detalle por ítem', this.C.verde]
    ];
    const kw = 3.05, kh = 1.2, ky = 1.0;
    kpis.forEach((kpi, i) => {
      this._addKpiCard(slide, 0.2 + i * (kw + 0.1), ky, kw, kh,
                       kpi[0], kpi[1], kpi[2], kpi[3]);
    });

    const filas = opt.datos.despacho || [];
    if (filas.length === 0) {
      slide.addText('Sin despachos en el período seleccionado.', {
        x: 0.2, y: 3.0, w: 12.93, h: 0.5,
        fontSize: 14, color: this.C.txtGris, fontFace: 'Calibri',
        align: 'center'
      });
      return;
    }

    slide.addText('DETALLE POR ÍTEM', {
      x: 0.2, y: 2.55, w: 12.93, h: 0.3,
      fontSize: 12, bold: true, color: this.C.blanco, fontFace: 'Calibri'
    });

    const rows = [
      [
        { text: 'FECHA',       options: { bold: true, color: this.C.blanco, fill: this.C.gris } },
        { text: 'ACTA',        options: { bold: true, color: this.C.blanco, fill: this.C.gris } },
        { text: 'CÓDIGO',      options: { bold: true, color: this.C.blanco, fill: this.C.gris } },
        { text: 'DESCRIPCIÓN', options: { bold: true, color: this.C.blanco, fill: this.C.gris } },
        { text: 'TUBOS',       options: { bold: true, color: this.C.blanco, fill: this.C.gris, align: 'center' } },
        { text: 'TIEMPO',      options: { bold: true, color: this.C.blanco, fill: this.C.gris, align: 'center' } }
      ]
    ];
    filas.slice(0, 14).forEach((r, idx) => {
      const fill = idx % 2 === 0 ? this.C.blanco : 'F5F5F5';
      const fecha = LectorDatos.parseFecha(r['FECHA']);
      const fechaStr = fecha ? this._fmtFecha(fecha) : '—';
      const tiempo = (parseFloat(r['TIEMPO']) || 0) * 60;

      rows.push([
        { text: fechaStr, options: { fill, fontSize: 9 } },
        { text: String(r['N° DE ACTA'] || ''), options: { fill, fontSize: 9 } },
        { text: String(r['CODIGO'] || ''), options: { fill, fontSize: 9 } },
        { text: String(r['DESCRIPCION'] || '').slice(0, 40), options: { fill, fontSize: 9 } },
        { text: String(Math.round(parseFloat(r['TOTAL DE TUBERIAS']) || 0)),
          options: { fill, fontSize: 9, color: this.C.verde, bold: true, align: 'center' } },
        { text: `${Math.round(tiempo)} min`, options: { fill, fontSize: 9, align: 'center' } }
      ]);
    });

    slide.addTable(rows, {
      x: 0.2, y: 2.9, w: 12.93,
      fontFace: 'Calibri', fontSize: 9,
      border: { type: 'solid', pt: 0.25, color: 'E0E0E0' }
    });
  },

  // ============================================================
  // SLIDE: INVENTARIO (siempre acumulado del proyecto)
  // ============================================================
  _slideInventario(pres, opt) {
    const slide = pres.addSlide();
    slide.background = { color: this.C.gris };
    this._addTitleBar(slide,
      'INVENTARIO EN PATIO',
      'Acumulado del proyecto', this.C.amarillo);

    const a = opt.acumulados;
    const tubosNeto = a.tubos_casing - a.despacho_tubos;
    const pendiente = a.tubos_casing - a.estiba_tubos;
    const avanceEst = a.tubos_casing > 0
      ? (a.estiba_tubos / a.tubos_casing * 100) : 0;

    // 3 KPIs principales
    const kpis = [
      [this._n(tubosNeto), 'TUBOS CASING', 'En patio', this.C.verde],
      [String(a.equipos_aib), 'EQUIPOS AIB', 'En patio', this.C.naranja],
      [this._n(pendiente), 'TUBOS POR ESTIBAR',
       (100 - avanceEst).toFixed(1) + '% pendiente', this.C.amarillo]
    ];
    const kw = 4.1, kh = 1.3, ky = 1.0;
    kpis.forEach((kpi, i) => {
      this._addKpiCard(slide, 0.3 + i * (kw + 0.15), ky, kw, kh,
                       kpi[0], kpi[1], kpi[2], kpi[3],
                       { valSize: 30, l1Size: 13, l2Size: 10 });
    });

    // Barra de avance
    slide.addText('AVANCE DE ESTIBA — CASING', {
      x: 0.3, y: 2.6, w: 12.7, h: 0.3,
      fontSize: 12, bold: true, color: this.C.blanco, fontFace: 'Calibri'
    });

    const bx = 0.3, bw = 12.7, by = 2.95, bh = 0.4;
    slide.addShape('rect', {
      x: bx, y: by, w: bw, h: bh,
      fill: { color: this.C.grisOsc }, line: { color: this.C.grisOsc }
    });
    const adv = bw * avanceEst / 100;
    if (adv > 0) {
      slide.addShape('rect', {
        x: bx, y: by, w: adv, h: bh,
        fill: { color: this.C.verde }, line: { color: this.C.verde }
      });
      slide.addText(
        `${avanceEst.toFixed(1)}% ESTIBADO · ${this._n(a.estiba_tubos)} tubos`,
        {
          x: bx + 0.1, y: by, w: adv - 0.2, h: bh,
          fontSize: 12, bold: true, color: this.C.blanco,
          fontFace: 'Calibri', valign: 'middle'
        });
    }
    if (adv < bw) {
      slide.addText(`${(100 - avanceEst).toFixed(1)}% pendiente`, {
        x: bx + adv + 0.05, y: by, w: bw - adv - 0.1, h: bh,
        fontSize: 12, bold: true, color: this.C.naranja,
        fontFace: 'Calibri', valign: 'middle'
      });
    }

    // Resumen acumulado
    slide.addText('ACUMULADO DEL PROYECTO', {
      x: 0.3, y: 3.7, w: 12.7, h: 0.3,
      fontSize: 12, bold: true, color: this.C.blanco, fontFace: 'Calibri'
    });

    const res = [
      ['Camiones recibidos', String(a.camiones_unicos)],
      ['Tubos casing recibidos', this._n(a.tubos_casing)],
      ['Equipos AIB recibidos', String(a.equipos_aib)],
      ['Tubos estibados', this._n(a.estiba_tubos)],
      ['Operaciones de estiba', String(a.estiba_ops)],
      ['Actas de despacho', String(a.despacho_actas)],
      ['Tubos despachados', String(a.despacho_tubos)],
      ['Eficiencia general', a.eficiencia_general.toFixed(1) + '%']
    ];
    const fy = 4.1, rh = 0.32, colW = 6.4;
    res.forEach((par, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 0.3 + col * (colW + 0.1);
      const y = fy + row * rh;
      const bg = row % 2 === 0 ? this.C.grisOsc : this.C.gris;
      slide.addShape('rect', {
        x, y, w: colW, h: rh,
        fill: { color: bg }, line: { color: bg }
      });
      slide.addText(par[0], {
        x: x + 0.1, y, w: colW * 0.7, h: rh,
        fontSize: 11, color: this.C.blanco, fontFace: 'Calibri',
        valign: 'middle'
      });
      slide.addText(par[1], {
        x: x + colW * 0.7, y, w: colW * 0.3 - 0.1, h: rh,
        fontSize: 12, bold: true, color: this.C.amarillo,
        fontFace: 'Calibri', align: 'right', valign: 'middle'
      });
    });
  },

  // ============================================================
  // SLIDE: CONCLUSIONES
  // ============================================================
  _slideConclusiones(pres, opt) {
    const slide = pres.addSlide();
    slide.background = { color: this.C.gris };
    this._addTitleBar(slide, 'CONCLUSIONES Y ACCIONES',
                       opt.periodoTitulo, this.C.naranja);

    const logros = this._logros(opt);
    const atencion = this._atencion(opt);

    // LOGROS
    slide.addShape('rect', {
      x: 0.3, y: 1.2, w: 0.45, h: 0.45,
      fill: { color: this.C.verde }, line: { color: this.C.verde }
    });
    slide.addText('✓', {
      x: 0.3, y: 1.2, w: 0.45, h: 0.45,
      fontSize: 22, bold: true, color: this.C.blanco,
      fontFace: 'Calibri', align: 'center', valign: 'middle'
    });
    slide.addText('LOGROS', {
      x: 0.9, y: 1.2, w: 6, h: 0.45,
      fontSize: 16, bold: true, color: this.C.verde,
      fontFace: 'Calibri', valign: 'middle'
    });

    let oy = 1.85;
    logros.forEach(l => {
      slide.addText(l, {
        x: 0.4, y: oy, w: 12.6, h: 0.28,
        fontSize: 11, color: this.C.blanco, fontFace: 'Calibri',
        valign: 'middle'
      });
      oy += 0.3;
    });

    // PUNTOS DE ATENCIÓN
    oy += 0.3;
    slide.addShape('rect', {
      x: 0.3, y: oy, w: 0.45, h: 0.45,
      fill: { color: this.C.naranja }, line: { color: this.C.naranja }
    });
    slide.addText('!', {
      x: 0.3, y: oy, w: 0.45, h: 0.45,
      fontSize: 22, bold: true, color: this.C.blanco,
      fontFace: 'Calibri', align: 'center', valign: 'middle'
    });
    slide.addText('PUNTOS DE ATENCIÓN', {
      x: 0.9, y: oy, w: 6, h: 0.45,
      fontSize: 16, bold: true, color: this.C.naranja,
      fontFace: 'Calibri', valign: 'middle'
    });

    oy += 0.65;
    atencion.forEach(a => {
      slide.addText(a, {
        x: 0.4, y: oy, w: 12.6, h: 0.28,
        fontSize: 11, color: this.C.blanco, fontFace: 'Calibri',
        valign: 'middle'
      });
      oy += 0.3;
    });
  },

  _logros(opt) {
    const k = opt.kpis;
    const a = opt.acumulados;
    const L = [];
    if (k.equipos_aib > 0)
      L.push(`• ${k.equipos_aib} equipos AIB recepcionados con ${k.eficiencia_aib.toFixed(1)}% de eficiencia.`);
    if (k.tubos_casing > 0)
      L.push(`• ${this._n(k.tubos_casing)} tubos casing recibidos en ${k.casing_camiones} camiones.`);
    if (k.estiba_tubos > 0)
      L.push(`• ${this._n(k.estiba_tubos)} tubos estibados (${k.estiba_paquetes} paq. en ${k.estiba_dias} días).`);
    if (k.despacho_tubos > 0)
      L.push(`• ${k.despacho_tubos} tubos despachados en ${k.despacho_actas} acta(s).`);

    const avanceEst = a.tubos_casing > 0 ? (a.estiba_tubos / a.tubos_casing * 100) : 0;
    L.push(`• Avance acumulado de estiba: ${avanceEst.toFixed(1)}% del stock total de casing.`);
    return L.slice(0, 5).length > 0 ? L.slice(0, 5) : ['• Período sin actividad operativa registrada.'];
  },

  _atencion(opt) {
    const k = opt.kpis;
    const a = opt.acumulados;
    const A = [];
    const pendiente = a.tubos_casing - a.estiba_tubos;
    if (pendiente > 0)
      A.push(`• Quedan ${this._n(pendiente)} tubos casing por estibar.`);
    if (k.estiba_tubos > 0 && k.estiba_pkth < 3)
      A.push(`• Productividad de estiba baja: ${k.estiba_pkth.toFixed(2)} paq/h (referencia con 2 cuadrillas: ~4.36).`);
    if (k.tubos_casing === 0 && k.equipos_aib === 0)
      A.push('• Sin recepción de material en el período.');
    return A.length > 0 ? A : ['• Sin puntos de atención destacados.'];
  },

  // ============================================================
  // SLIDE: FOTOS
  // ============================================================
  _slideFotos(pres, opt) {
    const slide = pres.addSlide();
    slide.background = { color: this.C.gris };
    this._addTitleBar(slide, 'REGISTRO FOTOGRÁFICO',
                       opt.periodoTitulo, this.C.verde);

    const etiquetas = opt.etiquetasFotos;
    const n = etiquetas.length;
    let cols, rows;
    if (n <= 4) { cols = 2; rows = 2; }
    else if (n <= 6) { cols = 3; rows = 2; }
    else { cols = 4; rows = 2; }

    const fgx = 0.3, fgy = 1.1;
    const availW = 12.7, availH = 5.2;
    const gxGap = 0.2, gyGap = 0.3;
    const fw = (availW - (cols - 1) * gxGap) / cols;
    const fh = (availH - (rows - 1) * gyGap) / rows;

    const colores = [this.C.verde, this.C.amarillo, this.C.naranja];

    etiquetas.slice(0, cols * rows).forEach((et, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = fgx + col * (fw + gxGap);
      const y = fgy + row * (fh + gyGap);
      const border = colores[i % 3];

      // Marco
      slide.addShape('rect', {
        x, y, w: fw, h: fh,
        fill: { color: this.C.grisOsc },
        line: { color: border, width: 1.5, dashType: 'dash' }
      });
      // Texto central
      slide.addText('[ ESPACIO PARA FOTO ]', {
        x, y: y + fh / 2 - 0.25, w: fw, h: 0.5,
        fontSize: 11, bold: true, color: this.C.txtGris,
        fontFace: 'Calibri', align: 'center', valign: 'middle'
      });
      slide.addText(`#${i + 1}`, {
        x, y: y + fh / 2 + 0.1, w: fw, h: 0.3,
        fontSize: 9, color: this.C.txtGris,
        fontFace: 'Calibri', align: 'center', valign: 'middle'
      });
      // Etiqueta debajo
      slide.addText(et, {
        x, y: y + fh + 0.02, w: fw, h: 0.25,
        fontSize: 10, bold: true, color: 'D0D0D0',
        fontFace: 'Calibri', align: 'center', valign: 'middle'
      });
    });
  },

  // ============================================================
  // SLIDE: INDICADORES ACUMULADOS DEL PROYECTO
  // (Réplica del formato del reporte S20)
  // ============================================================
  _slideIndicadoresAcumulados(pres, opt) {
    const slide = pres.addSlide();
    slide.background = { color: this.C.blanco };

    // Encabezado oscuro
    slide.addShape('rect', {
      x: 0, y: 0, w: 13.33, h: 0.8,
      fill: { color: this.C.gris }, line: { color: this.C.gris }
    });
    slide.addShape('rect', {
      x: 0, y: 0.8, w: 13.33, h: 0.06,
      fill: { color: this.C.verde }, line: { color: this.C.verde }
    });
    slide.addText('INDICADORES ACUMULADOS — PROYECTO', {
      x: 0.35, y: 0.12, w: 9.5, h: 0.55,
      fontSize: 18, bold: true, color: this.C.blanco,
      fontFace: 'Calibri', valign: 'middle'
    });
    // Sub-rótulo en derecha: rango de semanas
    const semanas = KPIs.porSemana();
    const semStr = semanas.length > 0
      ? `Semanas ${semanas[0].semana} – ${semanas[semanas.length - 1].semana}  |  2026`
      : '2026';
    slide.addText(semStr, {
      x: 9.5, y: 0.12, w: 3.6, h: 0.55,
      fontSize: 13, color: this.C.amarillo,
      fontFace: 'Calibri', align: 'right', valign: 'middle'
    });

    const d = KPIs.acumuladosDetallados();

    // ============================================================
    // 3 COLUMNAS de tarjetas (AIB / CASING / ESTIBADO)
    // Cada columna tiene 2 filas x 2 tarjetas = 4 KPIs
    // ============================================================
    const colY = 1.1;
    const colHeader = 0.4;
    const cardH = 1.3;
    const cardGap = 0.12;
    const colGap = 0.25;
    const totalW = 13.33 - 0.5;  // margen 0.25 a cada lado
    const colW = (totalW - 2 * colGap) / 3;
    const cardW = (colW - cardGap) / 2;

    // === COLUMNA 1: AIB ===
    this._indicAcumColumna(slide,
      0.25, colY, colW, colHeader,
      'EQUIPOS AIB — ACUMULADO GENERAL',
      [
        [`${d.aib_prom_descarga.toFixed(1)} min`, 'Promedio Descarga AIB', 'Tiempo prom por camión', this.C.amarillo],
        [`${this._n(d.aib_stock_total)} eq.`,    'Stock Total AIB',       'Equipos en inventario',  this.C.verde],
        [`${d.aib_eficiencia.toFixed(1)}%`,       'Eficiencia General AIB','Vs. estándar 40 min',    this.C.naranja],
        [`${d.aib_productividad.toFixed(2)}`,     'Productividad AIB/Hora','Equipos por hora',       this.C.gris]
      ],
      cardW, cardH, cardGap
    );

    // === COLUMNA 2: CASING ===
    const col2X = 0.25 + colW + colGap;
    this._indicAcumColumna(slide,
      col2X, colY, colW, colHeader,
      'CASING — ACUMULADO GENERAL',
      [
        [`${d.casing_prom_descarga.toFixed(1)} min`, 'Promedio Descarga Casing','Tiempo prom por camión',this.C.amarillo],
        [`${this._n(d.casing_stock_total)}`,         'Stock Total Casing',      'Tubos en almacén',      this.C.verde],
        [`${d.casing_eficiencia.toFixed(1)}%`,       'Eficiencia General Casing','Vs. estándar 23.3 min',this.C.naranja],
        [`${d.casing_productividad.toFixed(1)}`,     'Productividad Tubos/Hora','Tubos por hora',        this.C.verde]
      ],
      cardW, cardH, cardGap
    );

    // === COLUMNA 3: ESTIBADO ===
    const col3X = 0.25 + 2 * (colW + colGap);
    this._indicAcumColumna(slide,
      col3X, colY, colW, colHeader,
      'ESTIBADO — ACUMULADO GENERAL',
      [
        [this._n(d.est_total_tubos),    'Total Tubos Estibados',    'Acumulado en racks',  this.C.amarillo],
        [this._n(d.est_total_paquetes), 'Total Paquetes Estibados', 'Acumulado en racks',  this.C.verde],
        [`${d.est_avance.toFixed(1)}%`, 'Avance de Estiba',         'Del stock total (Casing)', this.C.naranja],
        [`${d.est_productividad.toFixed(2)}`, 'Productividad Paq./Hora', 'Paquetes por hora', this.C.gris]
      ],
      cardW, cardH, cardGap
    );

    // ============================================================
    // GRÁFICO DE EVOLUCIÓN (últimas 4 semanas con actividad)
    // Eficiencia Casing (amarillo) vs Eficiencia AIB (naranja)
    // ============================================================
    // Filtrar semanas con actividad
    const semanasActivas = semanas.filter(s =>
      s.eficiencia_casing > 0 || s.eficiencia_aib > 0
    );
    const ultimas4 = semanasActivas.slice(-4);

    if (ultimas4.length > 0) {
      this._graficoEvolucion(slide, ultimas4, colY + colHeader + 2 * (cardH + cardGap) + 0.2);
    }
  },

  /**
   * Helper: dibuja una columna del slide de indicadores acumulados
   * (4 tarjetas en 2x2)
   */
  _indicAcumColumna(slide, x, y, colW, headerH, titulo, kpis, cardW, cardH, gap) {
    // Header de la columna
    slide.addText(titulo, {
      x, y, w: colW, h: headerH,
      fontSize: 12, bold: true, color: this.C.gris,
      fontFace: 'Calibri', valign: 'middle'
    });

    // 2x2 grid de tarjetas
    const yCard = y + headerH;
    for (let i = 0; i < kpis.length && i < 4; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const cx = x + col * (cardW + gap);
      const cy = yCard + row * (cardH + gap);
      const [valor, label1, label2, barColor] = kpis[i];

      // Panel blanco con borde sutil
      slide.addShape('rect', {
        x: cx, y: cy, w: cardW, h: cardH,
        fill: { color: this.C.blanco },
        line: { color: this.C.borde, width: 0.5 }
      });
      // Barra superior de color
      slide.addShape('rect', {
        x: cx, y: cy, w: cardW, h: 0.07,
        fill: { color: barColor }, line: { color: barColor }
      });
      // Valor grande
      slide.addText(valor, {
        x: cx, y: cy + 0.1, w: cardW, h: 0.55,
        fontSize: 24, bold: true, color: this.C.negro,
        fontFace: 'Calibri', align: 'center', valign: 'middle'
      });
      // Label 1
      slide.addText(label1, {
        x: cx, y: cy + 0.7, w: cardW, h: 0.3,
        fontSize: 11, bold: true, color: this.C.gris,
        fontFace: 'Calibri', align: 'center', valign: 'middle'
      });
      // Label 2 (sublabel)
      slide.addText(label2, {
        x: cx, y: cy + 1.0, w: cardW, h: 0.25,
        fontSize: 9, color: this.C.txtGris,
        fontFace: 'Calibri', align: 'center', valign: 'middle'
      });
    }
  },

  /**
   * Helper: dibuja el gráfico de barras de evolución por semana
   * (eficiencia casing amarilla vs eficiencia AIB naranja)
   */
  _graficoEvolucion(slide, semanas, yTop) {
    // Título
    slide.addText('EVOLUCIÓN EFICIENCIA — SEMANAS RECIENTES', {
      x: 0.25, y: yTop, w: 13, h: 0.3,
      fontSize: 12, bold: true, color: this.C.gris,
      fontFace: 'Calibri', valign: 'middle'
    });

    // Área del gráfico
    const chartY = yTop + 0.35;
    const chartH = 1.3;
    const chartX = 0.25;
    const chartW = 13;

    // Línea base (eje X)
    slide.addShape('line', {
      x: chartX + 0.3, y: chartY + chartH,
      w: chartW - 0.5, h: 0,
      line: { color: this.C.gris, width: 1 }
    });

    // Etiqueta "70" en eje Y como referencia mínima
    slide.addText('70', {
      x: chartX - 0.05, y: chartY + chartH - 0.2, w: 0.35, h: 0.25,
      fontSize: 9, color: this.C.gris,
      fontFace: 'Calibri', align: 'right', valign: 'middle'
    });

    // Barras
    const nSem = semanas.length;
    const slotW = (chartW - 0.6) / nSem;  // ancho por semana
    const barW = slotW * 0.22;             // ancho de cada barra (2 barras por semana)
    const gap = slotW * 0.06;

    // Mapeamos eficiencias al rango visual (70%–100% → 0–chartH)
    const minPct = 70, maxPct = 100;
    const mapH = pct => {
      const p = Math.max(minPct, Math.min(maxPct, pct));
      return chartH * ((p - minPct) / (maxPct - minPct));
    };

    semanas.forEach((s, i) => {
      const slotX = chartX + 0.5 + i * slotW;
      const efCasing = s.eficiencia_casing || 0;
      const efAib = s.eficiencia_aib || 0;
      const hCasing = mapH(efCasing);
      const hAib = mapH(efAib);

      // Barra amarilla (casing)
      if (efCasing > 0) {
        slide.addShape('rect', {
          x: slotX, y: chartY + chartH - hCasing, w: barW, h: hCasing,
          fill: { color: this.C.amarillo },
          line: { color: this.C.amarillo }
        });
        // Valor encima
        slide.addText(Math.round(efCasing).toString(), {
          x: slotX - 0.1, y: chartY + chartH - hCasing - 0.25,
          w: barW + 0.2, h: 0.22,
          fontSize: 10, bold: true, color: this.C.gris,
          fontFace: 'Calibri', align: 'center'
        });
      }

      // Barra naranja (AIB)
      const bx2 = slotX + barW + gap;
      if (efAib > 0) {
        slide.addShape('rect', {
          x: bx2, y: chartY + chartH - hAib, w: barW, h: hAib,
          fill: { color: this.C.naranja },
          line: { color: this.C.naranja }
        });
        slide.addText(Math.round(efAib).toString(), {
          x: bx2 - 0.1, y: chartY + chartH - hAib - 0.25,
          w: barW + 0.2, h: 0.22,
          fontSize: 10, bold: true, color: this.C.gris,
          fontFace: 'Calibri', align: 'center'
        });
      }

      // Etiqueta semana
      slide.addText(`S${s.semana}`, {
        x: slotX - 0.2, y: chartY + chartH + 0.05,
        w: barW * 2 + gap + 0.4, h: 0.3,
        fontSize: 11, bold: true, color: this.C.gris,
        fontFace: 'Calibri', align: 'center'
      });
    });

    // Leyenda (parte inferior derecha)
    const leyY = chartY + chartH + 0.4;
    slide.addShape('rect', {
      x: chartW - 2.5, y: leyY, w: 0.2, h: 0.15,
      fill: { color: this.C.amarillo }, line: { color: this.C.amarillo }
    });
    slide.addText('Casing', {
      x: chartW - 2.25, y: leyY - 0.04, w: 0.8, h: 0.22,
      fontSize: 9, color: this.C.gris, fontFace: 'Calibri'
    });
    slide.addShape('rect', {
      x: chartW - 1.3, y: leyY, w: 0.2, h: 0.15,
      fill: { color: this.C.naranja }, line: { color: this.C.naranja }
    });
    slide.addText('AIB', {
      x: chartW - 1.05, y: leyY - 0.04, w: 0.8, h: 0.22,
      fontSize: 9, color: this.C.gris, fontFace: 'Calibri'
    });
  },

  // ============================================================
  // HELPERS
  // ============================================================
  _n(num) {
    // Formatea número con separadores
    return String(Math.round(num || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  },

  _fmtFecha(d) {
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  },

  _cap(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
};
