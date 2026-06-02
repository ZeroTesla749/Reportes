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
    this._slideIndicadoresAcumulados(pres, opciones);

    // NUEVAS SLIDES — Inventario real por código (CASING, AIB y VIGAS)
    this._slideInventarioCodigo(pres, opciones, 'CASING');
    this._slideInventarioCodigo(pres, opciones, 'AIB');
    this._slideInventarioCodigo(pres, opciones, 'VIGA');

    // SLIDE — Personal operativo (puestos)
    if (opciones.personalPuestos && opciones.personalPuestos.length > 0) {
      this._slidePersonal(pres, opciones);
    }

    // SLIDE — Horómetro de montacargas
    if (opciones.horometroDatos) {
      this._slideHorometro(pres, opciones);
    }

    this._slideConclusiones(pres, opciones);

    if (opciones.incluirFotos && opciones.imagenes && opciones.imagenes.length > 0) {
      await this._slideFotos(pres, opciones);
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

    // 4 KPIs principales (despacho separado por tipo)
    const k = opt.kpis;
    const desCasing = k.despacho_tubos_casing || 0;
    const desAib    = k.despacho_tubos_aib || 0;
    const desViga   = k.despacho_unidades_viga || 0;
    // Texto de despacho: muestra lo que haya despachado por tipo
    const desParts = [];
    if (desCasing > 0) desParts.push(`${this._n(desCasing)} CAS`);
    if (desAib > 0)    desParts.push(`${desAib} AIB`);
    if (desViga > 0)   desParts.push(`${desViga} VIG`);
    const despachoTxt = desParts.length > 0 ? desParts.join(' + ') : '0';
    // Texto AIB+VIGAS recibidos
    const aibRec = k.equipos_aib || 0;
    const vigaRec = k.unidades_viga || 0;
    const recAibVigaTxt = (vigaRec > 0)
      ? `${aibRec} AIB · ${vigaRec} VIG`
      : String(aibRec);
    const kpis = [
      [recAibVigaTxt,                  'EQUIPOS AIB / VIGAS',   this.C.verde],
      [this._n(k.estiba_tubos),        'TUBOS ESTIBADOS',       this.C.amarillo],
      [despachoTxt,                    'DESPACHADO',            this.C.naranja],
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
      // Valor - tamaño dinámico según largo del texto
      const valStr = String(kpi[0]);
      const valFontSize = valStr.length > 12 ? 18 : (valStr.length > 8 ? 22 : 32);
      slide.addText(valStr, {
        x: kx, y: ky + 0.1, w: kw, h: 0.5,
        fontSize: valFontSize, bold: true, color: kpi[2],
        fontFace: 'Calibri', align: 'center', valign: 'middle'
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
    const desCasingD = k.despacho_tubos_casing || 0;
    const desAibD    = k.despacho_tubos_aib || 0;
    const desVigaD   = k.despacho_unidades_viga || 0;
    const desPartsD = [];
    if (desCasingD > 0) desPartsD.push(`${this._n(desCasingD)} CAS`);
    if (desAibD > 0)    desPartsD.push(`${desAibD} AIB`);
    if (desVigaD > 0)   desPartsD.push(`${desVigaD} VIG`);
    const desTxtD = desPartsD.length > 0 ? desPartsD.join(' + ') : '0';

    // Texto combinado AIB+VIGAS para card
    const aibVigaTxt = (k.unidades_viga > 0)
      ? `${k.equipos_aib} · ${k.unidades_viga}`
      : String(k.equipos_aib || 0);
    const aibVigaLabel = (k.unidades_viga > 0) ? 'AIB · Vigas' : 'Equipos AIB';

    const kpis = [
      [String(k.camiones_unicos || 0), 'Camiones',          this.C.amarillo],
      [this._n(k.tubos_casing),        'Tubos Casing',      this.C.verde],
      [aibVigaTxt,                     aibVigaLabel,        this.C.naranja],
      [desTxtD,                        'Despachado',        this.C.amarillo],
      [k.eficiencia_general.toFixed(1) + '%', 'Eficiencia', this.C.verde]
    ];
    const mleft = 0.2, kgap = 0.12;
    const kw = (12.93 - 4 * kgap) / 5;
    const ky = 1.2;
    const kh = 1.3;
    kpis.forEach((kpi, i) => {
      const kx = mleft + i * (kw + kgap);
      // tamaño dinámico del valor para que no se desborde
      const valStr = String(kpi[0]);
      const valSize = valStr.length > 10 ? 18 : (valStr.length > 6 ? 22 : 28);
      this._addKpiCard(slide, kx, ky, kw, kh, kpi[0], kpi[1], '', kpi[2],
                       { valSize, l1Size: 12 });
    });

    // Resumen por área
    slide.addText('RESUMEN POR ÁREA OPERATIVA', {
      x: 0.2, y: 2.8, w: 12.93, h: 0.4,
      fontSize: 12, bold: true, color: this.C.blanco, fontFace: 'Calibri'
    });

    // Texto de despacho desglosado por tipo presente
    const partsLin = [];
    if (desCasingD > 0) partsLin.push(`${this._n(desCasingD)} casing`);
    if (desAibD > 0)    partsLin.push(`${desAibD} AIB`);
    if (desVigaD > 0)   partsLin.push(`${desVigaD} vigas`);
    const despachoLinea = `${k.despacho_actas} actas · ${partsLin.length > 0 ? partsLin.join(' + ') : '0 unidades'}`;

    // Texto de recepción que incluye vigas si las hay
    const recPartsLin = [
      `${k.camiones_unicos} camiones`,
      `${this._n(k.tubos_casing)} casing`,
      `${k.equipos_aib} AIB`
    ];
    if ((k.unidades_viga || 0) > 0) {
      recPartsLin.push(`${k.unidades_viga} vigas`);
    }
    const recepcionLinea = recPartsLin.join(' · ');

    const areas = [
      ['RECEPCIÓN',
       recepcionLinea,
       `Eficiencia: ${k.eficiencia_general.toFixed(1)}%`,
       this.C.amarillo],
      ['ESTIBA',
       `${k.estiba_ops} ops · ${k.estiba_paquetes} paq · ${this._n(k.estiba_tubos)} tubos`,
       `${k.estiba_dias} días · ${k.estiba_pkth.toFixed(2)} paq/h`,
       this.C.verde],
      ['DESPACHO',
       despachoLinea,
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
    const hayVigas = (k.unidades_viga || 0) > 0;
    let kpis;
    if (hayVigas) {
      // 5 tarjetas: camiones, casing, AIB, vigas, eficiencia
      kpis = [
        [String(k.camiones_unicos),    'Camiones únicos', 'placa + guía', this.C.naranja],
        [this._n(k.tubos_casing),      'Tubos Casing',    'recibidos',    this.C.amarillo],
        [String(k.equipos_aib),        'Equipos AIB',     'recibidos',    this.C.verde],
        [String(k.unidades_viga),      'Vigas',           'concreto',     this.C.amarillo],
        [k.eficiencia_general.toFixed(1) + '%', 'Eficiencia', 'promedio',  this.C.verde]
      ];
    } else {
      kpis = [
        [String(k.camiones_unicos), 'Camiones únicos', 'placa + guía', this.C.naranja],
        [String(k.equipos_aib),     'Equipos AIB',     'recibidos',    this.C.verde],
        [this._n(k.tubos_casing),   'Tubos Casing',    'recibidos',    this.C.amarillo],
        [k.eficiencia_general.toFixed(1) + '%', 'Eficiencia', 'promedio', this.C.verde]
      ];
    }
    const totalKpis = kpis.length;
    const kpiGap = 0.1;
    const kw = (12.93 - (totalKpis - 1) * kpiGap) / totalKpis;
    const kh = 1.2, ky = 1.0;
    kpis.forEach((kpi, i) => {
      this._addKpiCard(slide, 0.2 + i * (kw + kpiGap), ky, kw, kh,
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
    const dCas = k.despacho_tubos_casing || 0;
    const dAib = k.despacho_tubos_aib || 0;
    const dVig = k.despacho_unidades_viga || 0;
    const subActas = `${k.despacho_actas_casing || 0} cas · ${k.despacho_actas_aib || 0} AIB · ${k.despacho_actas_viga || 0} vig`;
    const subOps   = `${k.despacho_ops_casing || 0} cas · ${k.despacho_ops_aib || 0} AIB · ${k.despacho_ops_viga || 0} vig`;
    const kpis = [
      [String(k.despacho_actas),  'Actas Emitidas',  subActas,        this.C.naranja],
      [this._n(dCas),             'Tubos Casing',    'despachados',   this.C.amarillo],
      [String(dAib),              'Equipos AIB',     'despachados',   this.C.verde],
      [String(dVig),              'Vigas Concreto',  'despachadas',   this.C.amarillo],
      [String(k.despacho_ops),    'Operaciones',     subOps,          this.C.verde]
    ];
    // 5 tarjetas: anchura calculada para que entren
    const kw = (12.93 - 4 * 0.1) / 5, kh = 1.2, ky = 1.0;
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
    const desCasA = a.despacho_tubos_casing || 0;
    const desAibA = a.despacho_tubos_aib || 0;
    const desVigA = a.despacho_unidades_viga || 0;
    const tubosNeto = a.tubos_casing - desCasA;
    const aibNeto = a.equipos_aib - desAibA;
    const vigaNeto = (a.unidades_viga || 0) - desVigA;
    const pendiente = a.tubos_casing - a.estiba_tubos;
    const avanceEst = a.tubos_casing > 0
      ? (a.estiba_tubos / a.tubos_casing * 100) : 0;

    // 4 KPIs principales (incluye VIGAS)
    const kpis = [
      [this._n(tubosNeto), 'TUBOS CASING',
        `${this._n(a.tubos_casing)} − ${this._n(desCasA)} desp`, this.C.verde],
      [String(aibNeto), 'EQUIPOS AIB',
        `${a.equipos_aib} − ${desAibA} desp`, this.C.naranja],
      [this._n(vigaNeto), 'VIGAS CONCRETO',
        `${this._n(a.unidades_viga || 0)} − ${desVigA} desp`, this.C.amarillo],
      [this._n(pendiente), 'TUBOS POR ESTIBAR',
       (100 - avanceEst).toFixed(1) + '% pendiente', this.C.naranja]
    ];
    const kw = (13.33 - 0.6 - 0.45) / 4, kh = 1.3, ky = 1.0;
    kpis.forEach((kpi, i) => {
      this._addKpiCard(slide, 0.3 + i * (kw + 0.15), ky, kw, kh,
                       kpi[0], kpi[1], kpi[2], kpi[3],
                       { valSize: 28, l1Size: 12, l2Size: 9 });
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
      ['Vigas concreto recibidas', String(a.unidades_viga || 0)],
      ['Tubos estibados', this._n(a.estiba_tubos)],
      ['Operaciones de estiba', String(a.estiba_ops)],
      ['Actas de despacho', String(a.despacho_actas)],
      ['Casing despachados', this._n(desCasA)],
      ['AIB despachados', String(desAibA)],
      ['Vigas despachadas', String(desVigA)],
      ['Tubos casing en patio', this._n(tubosNeto)],
      ['Equipos AIB en patio', String(aibNeto)],
      ['Vigas en patio', String(vigaNeto)],
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
    if ((k.unidades_viga || 0) > 0)
      L.push(`• ${k.unidades_viga} viga(s) de concreto recepcionada(s) en ${k.viga_camiones || 0} camión(es).`);
    if (k.estiba_tubos > 0)
      L.push(`• ${this._n(k.estiba_tubos)} tubos estibados (${k.estiba_paquetes} paq. en ${k.estiba_dias} días).`);
    // Despacho separado por tipo
    const dCas = k.despacho_tubos_casing || 0;
    const dAib = k.despacho_tubos_aib || 0;
    const dVig = k.despacho_unidades_viga || 0;
    if (dCas > 0)
      L.push(`• ${this._n(dCas)} tubos casing despachados en ${k.despacho_actas_casing || 0} acta(s).`);
    if (dAib > 0)
      L.push(`• ${dAib} equipo(s) AIB despachado(s) en ${k.despacho_actas_aib || 0} acta(s).`);
    if (dVig > 0)
      L.push(`• ${dVig} viga(s) de concreto despachada(s) en ${k.despacho_actas_viga || 0} acta(s).`);

    const avanceEst = a.tubos_casing > 0 ? (a.estiba_tubos / a.tubos_casing * 100) : 0;
    L.push(`• Avance acumulado de estiba: ${avanceEst.toFixed(1)}% del stock total de casing.`);
    return L.length > 0 ? L.slice(0, 7) : ['• Período sin actividad operativa registrada.'];
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
    if (k.tubos_casing === 0 && k.equipos_aib === 0 && (k.unidades_viga || 0) === 0)
      A.push('• Sin recepción de material en el período.');
    return A.length > 0 ? A : ['• Sin puntos de atención destacados.'];
  },

  // ============================================================
  // SLIDE: FOTOS
  // ============================================================
  async _slideFotos(pres, opt) {
    const slide = pres.addSlide();
    slide.background = { color: this.C.gris };
    this._addTitleBar(slide, 'REGISTRO FOTOGRÁFICO',
                       opt.periodoTitulo, this.C.verde);

    // Recibe opt.imagenes (nuevo formato): array de { dataUrl, etiqueta }
    // El nro de slots = opt.imagenes.length
    const imagenes = opt.imagenes || [];
    const n = imagenes.length;
    if (n === 0) return;

    let cols, rows;
    if (n <= 2) { cols = 2; rows = 1; }
    else if (n <= 4) { cols = 2; rows = 2; }
    else if (n <= 6) { cols = 3; rows = 2; }
    else { cols = 4; rows = 2; }

    const fgx = 0.3, fgy = 1.1;
    const availW = 12.7;
    const availH = (rows === 1) ? 3.0 : 5.2;
    const gxGap = 0.2, gyGap = 0.3;
    const fw = (availW - (cols - 1) * gxGap) / cols;
    const fh = (availH - (rows - 1) * gyGap) / rows;

    const colores = [this.C.verde, this.C.amarillo, this.C.naranja];

    // Procesar cada imagen (con recorte cover) en paralelo
    // PptxGenJS necesita dimensiones razonables del recorte
    const recortePromises = imagenes.slice(0, cols * rows).map(item => {
      if (!item || !item.dataUrl) return Promise.resolve(null);
      return ImagenUtil.recortarCover(item.dataUrl, fw, fh)
        .catch(err => {
          console.warn('Error al recortar imagen:', err);
          return null;  // Si falla, usar dataUrl original
        });
    });
    const recortadas = await Promise.all(recortePromises);

    imagenes.slice(0, cols * rows).forEach((item, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = fgx + col * (fw + gxGap);
      const y = fgy + row * (fh + gyGap);
      const border = colores[i % 3];

      const etiqueta = (item && item.etiqueta) || `Foto ${i + 1}`;
      const tieneImg = item && item.dataUrl;

      if (tieneImg) {
        // Insertar la imagen recortada (cover)
        const dataUrlFinal = (recortadas[i] && recortadas[i].dataUrl) || item.dataUrl;
        slide.addImage({
          data: dataUrlFinal,
          x, y, w: fw, h: fh,
          sizing: { type: 'cover', w: fw, h: fh }
        });
        // Borde de color sobre la imagen
        slide.addShape('rect', {
          x, y, w: fw, h: fh,
          fill: { type: 'none' },
          line: { color: border, width: 2 }
        });
      } else {
        // Placeholder cuando no hay imagen
        slide.addShape('rect', {
          x, y, w: fw, h: fh,
          fill: { color: this.C.grisOsc },
          line: { color: border, width: 1.5, dashType: 'dash' }
        });
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
      }

      // Etiqueta debajo del marco
      slide.addText(etiqueta, {
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
    // 4 COLUMNAS de tarjetas (AIB / CASING / VIGAS / ESTIBADO)
    // Cada columna tiene 2 filas x 2 tarjetas = 4 KPIs
    // ============================================================
    const colY = 1.1;
    const colHeader = 0.4;
    const cardH = 1.3;
    const cardGap = 0.1;
    const colGap = 0.18;
    const totalW = 13.33 - 0.5;  // margen 0.25 a cada lado
    const colW = (totalW - 3 * colGap) / 4;
    const cardW = (colW - cardGap) / 2;

    // === COLUMNA 1: AIB ===
    this._indicAcumColumna(slide,
      0.25, colY, colW, colHeader,
      'EQUIPOS AIB — ACUMULADO',
      [
        [`${d.aib_prom_descarga.toFixed(1)} min`, 'Promedio Descarga',    'Tiempo prom por camión', this.C.amarillo],
        [`${this._n(d.aib_stock_total)} eq.`,    'Stock Total',           'Equipos en inventario',  this.C.verde],
        [`${d.aib_eficiencia.toFixed(1)}%`,       'Eficiencia General',   'Vs. estándar 40 min',    this.C.naranja],
        [`${d.aib_productividad.toFixed(2)}`,     'Productividad/Hora',   'Equipos por hora',       this.C.gris]
      ],
      cardW, cardH, cardGap
    );

    // === COLUMNA 2: CASING ===
    const col2X = 0.25 + colW + colGap;
    this._indicAcumColumna(slide,
      col2X, colY, colW, colHeader,
      'CASING — ACUMULADO',
      [
        [`${d.casing_prom_descarga.toFixed(1)} min`, 'Promedio Descarga',     'Tiempo prom por camión',this.C.amarillo],
        [`${this._n(d.casing_stock_total)}`,         'Stock Total',           'Tubos en almacén',      this.C.verde],
        [`${d.casing_eficiencia.toFixed(1)}%`,       'Eficiencia General',    'Vs. estándar 23.3 min', this.C.naranja],
        [`${d.casing_productividad.toFixed(1)}`,     'Productividad/Hora',    'Tubos por hora',        this.C.verde]
      ],
      cardW, cardH, cardGap
    );

    // === COLUMNA 3: VIGAS ===
    const col3X = 0.25 + 2 * (colW + colGap);
    this._indicAcumColumna(slide,
      col3X, colY, colW, colHeader,
      'VIGAS — ACUMULADO',
      [
        [`${d.viga_prom_descarga.toFixed(1)} min`, 'Promedio Descarga',    'Tiempo prom por camión', this.C.amarillo],
        [`${this._n(d.viga_stock_total)} und`,    'Stock Total',           'Vigas en inventario',    this.C.verde],
        [`${d.viga_eficiencia.toFixed(1)}%`,       'Eficiencia General',   'Promedio del tipo',      this.C.naranja],
        [`${d.viga_productividad.toFixed(2)}`,     'Productividad/Hora',   'Vigas por hora',         this.C.gris]
      ],
      cardW, cardH, cardGap
    );

    // === COLUMNA 4: ESTIBADO ===
    const col4X = 0.25 + 3 * (colW + colGap);
    this._indicAcumColumna(slide,
      col4X, colY, colW, colHeader,
      'ESTIBADO — ACUMULADO',
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
  // SLIDE: PERSONAL OPERATIVO (puestos con cantidad + foto)
  // ============================================================
  _slidePersonal(pres, opt) {
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
    slide.addText('PERSONAL OPERATIVO', {
      x: 0.35, y: 0.12, w: 9.5, h: 0.55,
      fontSize: 18, bold: true, color: this.C.blanco,
      fontFace: 'Calibri', valign: 'middle'
    });
    slide.addText(opt.periodoTitulo, {
      x: 9.5, y: 0.12, w: 3.6, h: 0.55,
      fontSize: 13, color: this.C.amarillo,
      fontFace: 'Calibri', align: 'right', valign: 'middle'
    });

    const puestos = opt.personalPuestos || [];
    const totalPersonal = puestos.reduce((a, p) => a + p.cantidad, 0);

    // Sub-encabezado
    slide.addText(
      `${puestos.length} puestos  ·  ${totalPersonal} personas en total`,
      {
        x: 0.35, y: 1.0, w: 12.6, h: 0.4,
        fontSize: 13, color: this.C.gris, bold: true,
        fontFace: 'Calibri', valign: 'middle'
      }
    );

    if (puestos.length === 0) {
      slide.addText('Sin datos de personal en la hoja PERSONAL.', {
        x: 0.35, y: 2.5, w: 12.6, h: 0.5,
        fontSize: 14, color: this.C.txtGris,
        fontFace: 'Calibri', align: 'center', valign: 'middle'
      });
      return;
    }

    // ============================================================
    // Layout: tabla de puestos a la IZQUIERDA, foto a la DERECHA
    // ============================================================
    const tablaX = 0.35;
    const tablaY = 1.6;
    const tablaW = 7.0;

    // Header de la tabla
    slide.addShape('rect', {
      x: tablaX, y: tablaY, w: tablaW, h: 0.45,
      fill: { color: this.C.gris }, line: { color: this.C.gris }
    });
    slide.addText('PUESTO', {
      x: tablaX + 0.15, y: tablaY, w: tablaW - 1.6, h: 0.45,
      fontSize: 12, bold: true, color: this.C.blanco,
      fontFace: 'Calibri', valign: 'middle'
    });
    slide.addText('CANTIDAD', {
      x: tablaX + tablaW - 1.5, y: tablaY, w: 1.4, h: 0.45,
      fontSize: 12, bold: true, color: this.C.blanco,
      fontFace: 'Calibri', align: 'center', valign: 'middle'
    });

    // Filas de puestos
    const rowH = Math.min(0.5, (4.8 / Math.max(puestos.length, 1)));
    const rowHFinal = Math.max(0.33, rowH);
    puestos.forEach((p, i) => {
      const rowY = tablaY + 0.45 + i * rowHFinal;
      const bg = (i % 2 === 0) ? 'F8F8F8' : this.C.blanco;
      slide.addShape('rect', {
        x: tablaX, y: rowY, w: tablaW, h: rowHFinal,
        fill: { color: bg }, line: { color: this.C.borde, w: 0.25 }
      });
      // Barra lateral verde
      slide.addShape('rect', {
        x: tablaX, y: rowY, w: 0.06, h: rowHFinal,
        fill: { color: this.C.verde }, line: { color: this.C.verde }
      });
      slide.addText(p.puesto, {
        x: tablaX + 0.2, y: rowY, w: tablaW - 1.7, h: rowHFinal,
        fontSize: 11, color: this.C.negro,
        fontFace: 'Calibri', valign: 'middle'
      });
      slide.addText(String(p.cantidad), {
        x: tablaX + tablaW - 1.5, y: rowY, w: 1.4, h: rowHFinal,
        fontSize: 13, bold: true, color: this.C.verde,
        fontFace: 'Calibri', align: 'center', valign: 'middle'
      });
    });

    // Fila TOTAL
    const totalY = tablaY + 0.45 + puestos.length * rowHFinal;
    slide.addShape('rect', {
      x: tablaX, y: totalY, w: tablaW, h: 0.45,
      fill: { color: this.C.amarillo }, line: { color: this.C.amarillo }
    });
    slide.addText('TOTAL PERSONAL', {
      x: tablaX + 0.2, y: totalY, w: tablaW - 1.7, h: 0.45,
      fontSize: 12, bold: true, color: '412402',
      fontFace: 'Calibri', valign: 'middle'
    });
    slide.addText(String(totalPersonal), {
      x: tablaX + tablaW - 1.5, y: totalY, w: 1.4, h: 0.45,
      fontSize: 15, bold: true, color: '412402',
      fontFace: 'Calibri', align: 'center', valign: 'middle'
    });

    // ============================================================
    // Espacio para FOTO a la derecha
    // ============================================================
    const fotoX = tablaX + tablaW + 0.4;
    const fotoY = 1.6;
    const fotoW = 13.33 - fotoX - 0.35;
    const fotoH = 5.3;

    const fotoPersonal = opt.fotoPersonal || null;
    if (fotoPersonal && fotoPersonal.dataUrl) {
      slide.addImage({
        data: fotoPersonal.dataUrl,
        x: fotoX, y: fotoY, w: fotoW, h: fotoH,
        sizing: { type: 'cover', w: fotoW, h: fotoH }
      });
      slide.addShape('rect', {
        x: fotoX, y: fotoY, w: fotoW, h: fotoH,
        fill: { type: 'none' },
        line: { color: this.C.verde, width: 2 }
      });
    } else {
      // Placeholder
      slide.addShape('rect', {
        x: fotoX, y: fotoY, w: fotoW, h: fotoH,
        fill: { color: 'F0F0F0' },
        line: { color: this.C.verde, width: 1.5, dashType: 'dash' }
      });
      slide.addText('[ ESPACIO PARA FOTO\nDEL PERSONAL ]', {
        x: fotoX, y: fotoY + fotoH / 2 - 0.4, w: fotoW, h: 0.8,
        fontSize: 13, bold: true, color: this.C.txtGris,
        fontFace: 'Calibri', align: 'center', valign: 'middle'
      });
    }
    slide.addText('Personal operativo en Base Laguna', {
      x: fotoX, y: fotoY + fotoH + 0.05, w: fotoW, h: 0.3,
      fontSize: 10, italic: true, color: this.C.txtGris,
      fontFace: 'Calibri', align: 'center'
    });
  },

  // ============================================================
  // SLIDE: INVENTARIO REAL POR CÓDIGO (CASING, AIB o VIGA)
  // Stock = recibido − despachado, por cada código del catálogo
  // ============================================================
  _slideInventarioCodigo(pres, opt, tipoFiltro) {
    const slide = pres.addSlide();
    slide.background = { color: this.C.blanco };

    // Color de acento por tipo
    let accent;
    if (tipoFiltro === 'AIB') accent = this.C.naranja;
    else if (tipoFiltro === 'VIGA') accent = this.C.verde;
    else accent = this.C.amarillo;  // CASING

    // Título por tipo
    const titulo = (tipoFiltro === 'VIGA')
      ? 'INVENTARIO REAL VIGAS DE CONCRETO — POR CÓDIGO'
      : `INVENTARIO REAL ${tipoFiltro} — POR CÓDIGO`;

    // Encabezado oscuro
    slide.addShape('rect', {
      x: 0, y: 0, w: 13.33, h: 0.8,
      fill: { color: this.C.gris }, line: { color: this.C.gris }
    });
    slide.addShape('rect', {
      x: 0, y: 0.8, w: 13.33, h: 0.06,
      fill: { color: accent }, line: { color: accent }
    });
    slide.addText(titulo, {
      x: 0.35, y: 0.12, w: 9.5, h: 0.55,
      fontSize: 18, bold: true, color: this.C.blanco,
      fontFace: 'Calibri', valign: 'middle'
    });
    slide.addText('Stock acumulado del proyecto', {
      x: 9.5, y: 0.12, w: 3.6, h: 0.55,
      fontSize: 12, color: this.C.amarillo,
      fontFace: 'Calibri', align: 'right', valign: 'middle'
    });

    // Calcular inventario por código
    const inventario = this._calcularInventarioPorCodigo(tipoFiltro);

    // Totales
    const totRecibido = inventario.reduce((a, r) => a + r.recibido, 0);
    const totDespachado = inventario.reduce((a, r) => a + r.despachado, 0);
    const totStock = inventario.reduce((a, r) => a + r.stock, 0);

    // 3 KPIs arriba
    let unidad;
    if (tipoFiltro === 'AIB') unidad = 'equipos';
    else if (tipoFiltro === 'VIGA') unidad = 'vigas';
    else unidad = 'tubos';

    const kpis = [
      [this._n(totRecibido),   'TOTAL RECIBIDO',   unidad, this.C.verde],
      [this._n(totDespachado), 'TOTAL DESPACHADO', unidad, this.C.naranja],
      [this._n(totStock),      'STOCK ACTUAL',     unidad, accent]
    ];
    const kw = 4.1, kh = 1.0, ky = 1.0;
    kpis.forEach((kpi, i) => {
      const kx = 0.35 + i * (kw + 0.2);
      slide.addShape('rect', {
        x: kx, y: ky, w: kw, h: kh,
        fill: { color: this.C.blanco }, line: { color: this.C.borde, width: 0.5 }
      });
      slide.addShape('rect', {
        x: kx, y: ky, w: kw, h: 0.06,
        fill: { color: kpi[3] }, line: { color: kpi[3] }
      });
      slide.addText(kpi[0], {
        x: kx, y: ky + 0.1, w: kw, h: 0.45,
        fontSize: 24, bold: true, color: this.C.negro,
        fontFace: 'Calibri', align: 'center', valign: 'middle'
      });
      slide.addText(kpi[1], {
        x: kx, y: ky + 0.58, w: kw, h: 0.25,
        fontSize: 11, bold: true, color: this.C.gris,
        fontFace: 'Calibri', align: 'center'
      });
      slide.addText(kpi[2], {
        x: kx, y: ky + 0.78, w: kw, h: 0.2,
        fontSize: 9, color: this.C.txtGris,
        fontFace: 'Calibri', align: 'center'
      });
    });

    // Tabla: CÓDIGO | DESCRIPCIÓN | RECIBIDO | DESPACHADO | STOCK
    const rows = [[
      { text: 'CÓDIGO',      options: { bold: true, color: this.C.blanco, fill: this.C.gris, fontSize: 10 } },
      { text: 'DESCRIPCIÓN', options: { bold: true, color: this.C.blanco, fill: this.C.gris, fontSize: 10 } },
      { text: 'RECIBIDO',    options: { bold: true, color: this.C.blanco, fill: this.C.gris, fontSize: 10, align: 'center' } },
      { text: 'DESPACHADO',  options: { bold: true, color: this.C.blanco, fill: this.C.gris, fontSize: 10, align: 'center' } },
      { text: 'STOCK',       options: { bold: true, color: this.C.blanco, fill: this.C.gris, fontSize: 10, align: 'center' } }
    ]];
    inventario.forEach((r, idx) => {
      const fill = idx % 2 === 0 ? this.C.blanco : 'F5F5F5';
      rows.push([
        { text: r.codigo, options: { fill, fontSize: 10, bold: true } },
        { text: r.desc, options: { fill, fontSize: 9 } },
        { text: this._n(r.recibido), options: { fill, fontSize: 10, align: 'center', color: '2E7D32' } },
        { text: this._n(r.despachado), options: { fill, fontSize: 10, align: 'center', color: 'C62828' } },
        { text: this._n(r.stock), options: { fill, fontSize: 11, align: 'center', bold: true, color: this.C.negro } }
      ]);
    });
    // Fila total
    rows.push([
      { text: 'TOTAL', options: { bold: true, fill: accent, fontSize: 10, color: '412402' } },
      { text: '', options: { fill: accent } },
      { text: this._n(totRecibido), options: { bold: true, fill: accent, fontSize: 10, align: 'center', color: '412402' } },
      { text: this._n(totDespachado), options: { bold: true, fill: accent, fontSize: 10, align: 'center', color: '412402' } },
      { text: this._n(totStock), options: { bold: true, fill: accent, fontSize: 11, align: 'center', color: '412402' } }
    ]);

    slide.addTable(rows, {
      x: 0.35, y: 2.25, w: 12.63,
      colW: [1.6, 6.43, 1.5, 1.6, 1.5],
      fontFace: 'Calibri',
      border: { type: 'solid', pt: 0.25, color: 'E0E0E0' },
      valign: 'middle'
    });
  },

  /**
   * Calcula el inventario por código para un tipo (CASING o AIB).
   * Stock = recibido − despachado.
   * Muestra TODOS los códigos del catálogo de ese tipo.
   */
  _calcularInventarioPorCodigo(tipoFiltro) {
    const rec = DatosCache.filas('recepcion');
    const des = DatosCache.filas('despacho');

    // Normaliza código (quita ceros iniciales y espacios)
    const normCod = (c) => String(c || '').trim().replace(/^0+/, '');

    // Sumar recibido por código
    const recibidoPorCod = {};
    rec.forEach(r => {
      const cod = normCod(r['CODIGO SPRING']);
      if (!cod) return;
      const cant = parseFloat(r['TUBOS TOTALES / TOTAL AIB']) || 0;
      recibidoPorCod[cod] = (recibidoPorCod[cod] || 0) + cant;
    });

    // Sumar despachado por código
    const despachadoPorCod = {};
    des.forEach(r => {
      const cod = normCod(r['CODIGO']);
      if (!cod) return;
      const cant = parseFloat(r['TOTAL DE TUBERIAS']) || 0;
      despachadoPorCod[cod] = (despachadoPorCod[cod] || 0) + cant;
    });

    // Recorrer TODOS los códigos del catálogo de ese tipo
    const items = Catalogo.porTipo(tipoFiltro);
    return items.map(it => {
      const cod = normCod(it.codigo);
      const recibido = recibidoPorCod[cod] || 0;
      const despachado = despachadoPorCod[cod] || 0;
      return {
        codigo: it.codigo,
        desc: it.desc,
        recibido,
        despachado,
        stock: recibido - despachado
      };
    });
  },

  // ============================================================
  // SLIDE: HORÓMETRO DE MONTACARGAS
  // ============================================================
  _slideHorometro(pres, opt) {
    const slide = pres.addSlide();
    slide.background = { color: this.C.blanco };

    // Encabezado oscuro
    slide.addShape('rect', {
      x: 0, y: 0, w: 13.33, h: 0.8,
      fill: { color: this.C.gris }, line: { color: this.C.gris }
    });
    slide.addShape('rect', {
      x: 0, y: 0.8, w: 13.33, h: 0.06,
      fill: { color: this.C.amarillo }, line: { color: this.C.amarillo }
    });
    slide.addText('HORÓMETRO DE MONTACARGAS', {
      x: 0.35, y: 0.12, w: 9.5, h: 0.55,
      fontSize: 18, bold: true, color: this.C.blanco,
      fontFace: 'Calibri', valign: 'middle'
    });
    slide.addText(opt.periodoTitulo, {
      x: 9.5, y: 0.12, w: 3.6, h: 0.55,
      fontSize: 13, color: this.C.amarillo,
      fontFace: 'Calibri', align: 'right', valign: 'middle'
    });

    const h = opt.horometroDatos || {};
    const periodo = h.periodo || {};
    const total = h.total || {};
    const estados = opt.estadosMontacarga || {};

    const hangchaP = periodo.HANGCHA || { horas: 0, dias: 0, registros: 0 };
    const zomlionP = periodo.ZOMLION || { horas: 0, dias: 0, registros: 0 };
    const hangchaT = total.HANGCHA || { horas: 0, horometroActual: 0, diasOperativos: 0 };
    const zomlionT = total.ZOMLION || { horas: 0, horometroActual: 0, diasOperativos: 0 };

    // ============================================================
    // 4 KPIs principales arriba
    // ============================================================
    const totalPeriodoHoras = hangchaP.horas + zomlionP.horas;
    const totalProyectoHoras = hangchaT.horas + zomlionT.horas;
    const diasUnicos = Math.max(hangchaP.dias, zomlionP.dias);
    const promDia = diasUnicos > 0 ? totalPeriodoHoras / diasUnicos : 0;

    const kpis = [
      [`${totalPeriodoHoras.toFixed(1)} h`, 'Horas Totales',     'en el período',    this.C.amarillo],
      [`${hangchaP.horas.toFixed(1)} h`,    'HANGCHA',           'horas en período', this.C.verde],
      [`${zomlionP.horas.toFixed(1)} h`,    'ZOMLION',           'horas en período', this.C.naranja],
      [`${promDia.toFixed(1)} h`,           'Promedio Diario',   'consolidado',      this.C.gris]
    ];
    const kx = 0.3, kgap = 0.15;
    const kw = (13.33 - 2 * kx - 3 * kgap) / 4;
    const ky = 1.05;
    const kh = 1.15;
    kpis.forEach((kpi, i) => {
      const x = kx + i * (kw + kgap);
      // Panel blanco
      slide.addShape('rect', {
        x, y: ky, w: kw, h: kh,
        fill: { color: this.C.blanco },
        line: { color: this.C.borde, width: 0.5 }
      });
      // Barra superior
      slide.addShape('rect', {
        x, y: ky, w: kw, h: 0.06,
        fill: { color: kpi[3] }, line: { color: kpi[3] }
      });
      slide.addText(kpi[0], {
        x, y: ky + 0.1, w: kw, h: 0.45,
        fontSize: 22, bold: true, color: this.C.negro,
        fontFace: 'Calibri', align: 'center', valign: 'middle'
      });
      slide.addText(kpi[1], {
        x, y: ky + 0.6, w: kw, h: 0.25,
        fontSize: 10, bold: true, color: this.C.gris,
        fontFace: 'Calibri', align: 'center', valign: 'middle'
      });
      slide.addText(kpi[2], {
        x, y: ky + 0.85, w: kw, h: 0.25,
        fontSize: 9, color: this.C.txtGris,
        fontFace: 'Calibri', align: 'center', valign: 'middle'
      });
    });

    // ============================================================
    // 2 PANELES COMPARATIVOS (HANGCHA vs ZOMLION)
    // ============================================================
    const py = 2.45;
    const pw = (13.33 - 2 * 0.3 - 0.3) / 2;
    const ph = 2.5;

    this._panelMontacarga(slide,
      0.3, py, pw, ph,
      'HANGCHA',
      estados['HANGCHA'] || 'OPERATIVO',
      hangchaP, hangchaT,
      this.C.verde
    );
    this._panelMontacarga(slide,
      0.3 + pw + 0.3, py, pw, ph,
      'ZOMLION',
      estados['ZOMLION'] || 'OPERATIVO',
      zomlionP, zomlionT,
      this.C.naranja
    );

    // ============================================================
    // Gráfico de evolución (últimas 4 semanas con actividad)
    // ============================================================
    const semanasActivas = (h.porSemana || []).filter(s =>
      (s.HANGCHA || 0) > 0 || (s.ZOMLION || 0) > 0
    );
    const ultimas4 = semanasActivas.slice(-4);
    if (ultimas4.length > 0) {
      this._graficoHorometroSemana(slide, ultimas4, 5.15);
    }
  },

  /**
   * Helper: panel individual de un montacarga
   */
  _panelMontacarga(slide, x, y, w, h, nombre, estado, periodo, total, color) {
    const enMant = (estado !== 'OPERATIVO');
    const colorBorde = enMant ? this.C.naranja : color;
    const colorBg = enMant ? 'FFF4ED' : 'F8FCE8';

    // Fondo del panel
    slide.addShape('rect', {
      x, y, w, h,
      fill: { color: colorBg },
      line: { color: colorBorde, width: 1.5 }
    });
    // Barra lateral de color
    slide.addShape('rect', {
      x, y, w: 0.1, h,
      fill: { color: colorBorde }, line: { color: colorBorde }
    });
    // Nombre del montacarga
    slide.addText(nombre, {
      x: x + 0.2, y: y + 0.05, w: w - 0.4, h: 0.4,
      fontSize: 18, bold: true, color: this.C.gris,
      fontFace: 'Calibri', valign: 'middle'
    });
    // Badge de estado
    slide.addShape('rect', {
      x: x + w - 1.65, y: y + 0.13, w: 1.45, h: 0.32,
      fill: { color: enMant ? this.C.naranja : this.C.verde },
      line: { color: enMant ? this.C.naranja : this.C.verde }
    });
    slide.addText(estado, {
      x: x + w - 1.65, y: y + 0.13, w: 1.45, h: 0.32,
      fontSize: 9, bold: true, color: this.C.blanco,
      fontFace: 'Calibri', align: 'center', valign: 'middle'
    });

    // 6 datos en grid 2x3 (agregamos combustible y consumo)
    const dy = y + 0.55;
    const nivelStr = (total.nivelCombustible !== null && total.nivelCombustible !== undefined)
      ? `${total.nivelCombustible.toFixed(0)}%`
      : '—';
    const consumoStr = (total.consumoPorHora !== null && total.consumoPorHora !== undefined)
      ? `${total.consumoPorHora.toFixed(1)}%/h`
      : '—';
    const dgrid = [
      ['Horas en período',  `${periodo.horas.toFixed(1)} h`],
      ['Horas totales',     `${total.horas.toFixed(1)} h`],
      ['Días operativos',   `${periodo.dias}`],
      ['Horómetro actual',  total.horometroActual !== null ? `${total.horometroActual.toFixed(0)} h` : '—'],
      ['Nivel combustible', nivelStr],
      ['Consumo promedio',  consumoStr]
    ];
    const dw = (w - 0.5) / 2;
    const dh = (h - 0.7) / 3;
    dgrid.forEach((dat, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const dx = x + 0.2 + col * (dw + 0.1);
      const dyy = dy + row * (dh + 0.03);
      slide.addText(dat[0], {
        x: dx, y: dyy, w: dw, h: 0.2,
        fontSize: 9, color: this.C.txtGris,
        fontFace: 'Calibri', valign: 'middle'
      });
      // Resaltar combustible en color
      const esColor = (i >= 4);
      slide.addText(dat[1], {
        x: dx, y: dyy + 0.18, w: dw, h: 0.32,
        fontSize: 15, bold: true,
        color: esColor ? (enMant ? this.C.naranja : this.C.verde) : this.C.negro,
        fontFace: 'Calibri', valign: 'middle'
      });
    });
  },

  /**
   * Helper: gráfico de barras horas por semana (HANGCHA vs ZOMLION)
   */
  _graficoHorometroSemana(slide, semanas, yTop) {
    slide.addText('EVOLUCIÓN HORAS POR SEMANA', {
      x: 0.3, y: yTop, w: 13, h: 0.3,
      fontSize: 12, bold: true, color: this.C.gris,
      fontFace: 'Calibri', valign: 'middle'
    });

    const chartY = yTop + 0.35;
    const chartH = 1.7;
    const chartX = 0.3;
    const chartW = 13;

    // Línea base
    slide.addShape('line', {
      x: chartX + 0.3, y: chartY + chartH,
      w: chartW - 0.5, h: 0,
      line: { color: this.C.gris, width: 1 }
    });

    const maxH = Math.max(
      ...semanas.flatMap(s => [s.HANGCHA || 0, s.ZOMLION || 0]),
      1
    );

    const nSem = semanas.length;
    const slotW = (chartW - 0.6) / nSem;
    const barW = slotW * 0.22;
    const gap = slotW * 0.06;

    semanas.forEach((s, i) => {
      const slotX = chartX + 0.5 + i * slotW;
      const hH = s.HANGCHA || 0;
      const hZ = s.ZOMLION || 0;
      const hBarHangcha = (hH / maxH) * chartH;
      const hBarZomlion = (hZ / maxH) * chartH;

      // HANGCHA (verde)
      if (hH > 0) {
        slide.addShape('rect', {
          x: slotX, y: chartY + chartH - hBarHangcha,
          w: barW, h: hBarHangcha,
          fill: { color: this.C.verde }, line: { color: this.C.verde }
        });
        slide.addText(hH.toFixed(1), {
          x: slotX - 0.1, y: chartY + chartH - hBarHangcha - 0.25,
          w: barW + 0.2, h: 0.22,
          fontSize: 10, bold: true, color: this.C.gris,
          fontFace: 'Calibri', align: 'center'
        });
      }
      // ZOMLION (naranja)
      const bx2 = slotX + barW + gap;
      if (hZ > 0) {
        slide.addShape('rect', {
          x: bx2, y: chartY + chartH - hBarZomlion,
          w: barW, h: hBarZomlion,
          fill: { color: this.C.naranja }, line: { color: this.C.naranja }
        });
        slide.addText(hZ.toFixed(1), {
          x: bx2 - 0.1, y: chartY + chartH - hBarZomlion - 0.25,
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

    // Leyenda
    const leyY = chartY + chartH + 0.4;
    slide.addShape('rect', {
      x: chartW - 2.7, y: leyY, w: 0.2, h: 0.15,
      fill: { color: this.C.verde }, line: { color: this.C.verde }
    });
    slide.addText('HANGCHA', {
      x: chartW - 2.45, y: leyY - 0.04, w: 1, h: 0.22,
      fontSize: 9, color: this.C.gris, fontFace: 'Calibri'
    });
    slide.addShape('rect', {
      x: chartW - 1.3, y: leyY, w: 0.2, h: 0.15,
      fill: { color: this.C.naranja }, line: { color: this.C.naranja }
    });
    slide.addText('ZOMLION', {
      x: chartW - 1.05, y: leyY - 0.04, w: 1, h: 0.22,
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
