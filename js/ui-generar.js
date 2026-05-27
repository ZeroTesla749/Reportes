/* ============================================================
   UI — Sección "Generar reporte"
   ============================================================ */

const UIGenerar = {

  tipoSeleccionado: 'diario',

  init() {
    // Click en tarjetas de tipo
    document.querySelectorAll('.tipo-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.tipo-card').forEach(c => c.classList.remove('activa'));
        card.classList.add('activa');
        this.tipoSeleccionado = card.dataset.tipo;
        this.refrescarPanelConfig();
      });
    });

    // Botón generar
    document.getElementById('btn-generar').addEventListener('click', () => this.generar());

    // Botón recargar
    document.getElementById('btn-recargar-datos').addEventListener('click', async () => {
      await App.cargarDatos(true);
    });

    // Checkbox fotos: muestra/oculta panel de imágenes
    document.getElementById('opt-incluir-fotos').addEventListener('change', e => {
      document.getElementById('imagenes-panel').style.display =
        e.target.checked ? 'block' : 'none';
    });

    // Selector de cantidad de fotos
    document.getElementById('opt-cantidad-fotos').addEventListener('change', e => {
      this._renderizarSlotsImagenes(parseInt(e.target.value));
    });

    // Render inicial de slots de imágenes
    this._renderizarSlotsImagenes(6);

    // Inicializar selector de personal
    UIPersonal.init();

    this.refrescarPanelConfig();
  },

  // ============================================================
  // SLOTS DE IMÁGENES
  // ============================================================
  _renderizarSlotsImagenes(cantidad) {
    const grid = document.getElementById('imagenes-grid');
    const etiquetasGuardadas = Prefs.getEtiquetas();

    // Ajustar el array de imágenes activas a la nueva cantidad
    ImagenesActivas.ajustarLongitud(cantidad);

    let html = '';
    for (let i = 0; i < cantidad; i++) {
      const item = ImagenesActivas.get(i);
      const etiqueta = (item && item.etiqueta) ||
                       etiquetasGuardadas[i] ||
                       `Foto ${i + 1}`;
      const tieneImg = item && item.dataUrl;
      html += `
        <div class="imagen-slot ${tieneImg ? 'con-imagen' : ''}" data-slot="${i}">
          <div class="imagen-slot-preview ${tieneImg ? '' : 'vacio'}"
               style="${tieneImg ? `background-image: url('${item.dataUrl}');` : ''}">
          </div>
          <input type="text" class="etiqueta-imagen"
                 placeholder="Descripción de la foto"
                 value="${this._escAttr(etiqueta)}"
                 data-slot="${i}">
          <input type="file" accept="image/*" data-slot="${i}">
          ${tieneImg ? `
            <div class="imagen-slot-acciones">
              <button class="btn-quitar-imagen" data-quitar="${i}">✕ Quitar</button>
            </div>
            <div class="imagen-slot-info">${item.width}×${item.height} · ${item.sizeKB}KB</div>
          ` : ''}
        </div>
      `;
    }
    grid.innerHTML = html;

    // Conectar listeners
    grid.querySelectorAll('input[type="file"]').forEach(input => {
      input.addEventListener('change', e => this._onFileSelected(e));
    });
    grid.querySelectorAll('.etiqueta-imagen').forEach(input => {
      input.addEventListener('change', e => this._onEtiquetaChange(e));
      // No re-render onclick para no perder foco
      input.addEventListener('click', e => e.stopPropagation());
    });
    grid.querySelectorAll('[data-quitar]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        e.preventDefault();
        const idx = parseInt(btn.dataset.quitar);
        ImagenesActivas.quitar(idx);
        this._renderizarSlotsImagenes(cantidad);
        this._actualizarInfoImagenes();
      });
    });

    this._actualizarInfoImagenes();
  },

  async _onFileSelected(e) {
    const input = e.target;
    const idx = parseInt(input.dataset.slot);
    const file = input.files && input.files[0];
    if (!file) return;

    const slot = input.closest('.imagen-slot');
    slot.querySelector('.imagen-slot-preview').textContent = '⏳ Procesando...';

    try {
      const procesada = await ImagenUtil.procesar(file);
      // Conservar etiqueta si ya existía
      const itemPrevio = ImagenesActivas.get(idx);
      const etiqueta = itemPrevio && itemPrevio.etiqueta;

      ImagenesActivas.set(idx, {
        dataUrl: procesada.dataUrl,
        etiqueta: etiqueta || `Foto ${idx + 1}`,
        width: procesada.width,
        height: procesada.height,
        sizeKB: procesada.sizeKB
      });

      // Re-render
      const cantidad = parseInt(document.getElementById('opt-cantidad-fotos').value);
      this._renderizarSlotsImagenes(cantidad);
    } catch (err) {
      alert('Error al cargar imagen: ' + err.message);
      console.error(err);
    }
  },

  _onEtiquetaChange(e) {
    const idx = parseInt(e.target.dataset.slot);
    ImagenesActivas.setEtiqueta(idx, e.target.value);
  },

  _actualizarInfoImagenes() {
    const conImg = ImagenesActivas.conImagen().length;
    const total = ImagenesActivas.todas().length;
    const info = document.getElementById('info-imagenes');
    if (info) {
      const totalKB = ImagenesActivas.todas()
        .filter(i => i && i.sizeKB)
        .reduce((a, i) => a + i.sizeKB, 0);
      info.textContent = `${conImg} / ${total} imágenes cargadas` +
        (totalKB > 0 ? ` · ${totalKB}KB` : '');
    }
  },

  _escAttr(s) {
    return String(s == null ? '' : s).replace(/"/g, '&quot;');
  },

  // Refresca panel de configuración del tipo seleccionado
  refrescarPanelConfig() {
    const titulo = {
      diario: 'REPORTE DIARIO · Selecciona la fecha',
      semanal: 'REPORTE SEMANAL · Selecciona la semana',
      mensual: 'REPORTE MENSUAL · Selecciona el mes',
      rango: 'RANGO PERSONALIZADO · Selecciona desde y hasta',
      avance: 'AVANCE TOTAL · Toma todo el rango disponible'
    }[this.tipoSeleccionado];

    document.querySelector('#panel-config-tipo .panel-titulo').textContent = titulo;

    const cont = document.getElementById('config-tipo-contenido');
    cont.innerHTML = '';

    const tieneDatos = DatosCache.recepcion !== null;
    if (!tieneDatos) {
      cont.innerHTML = '<div class="placeholder">Carga los datos del Sheet primero (sección Configuración).</div>';
      return;
    }

    const rango = LectorDatos.rangoFechas();
    const fminStr = rango.min ? this._fmtFecha(rango.min) : '—';
    const fmaxStr = rango.max ? this._fmtFecha(rango.max) : '—';

    if (this.tipoSeleccionado === 'diario') {
      cont.innerHTML = `
        <div class="config-fila">
          <label class="config-label">Fecha:</label>
          <input type="date" id="cfg-fecha-diaria" class="input-fecha"
                 value="${FechaUtil.toInputDate(rango.max || new Date())}">
          <span class="config-help-text">Datos disponibles: ${fminStr} – ${fmaxStr}</span>
        </div>
      `;
    } else if (this.tipoSeleccionado === 'semanal') {
      const semanas = LectorDatos.semanasDisponibles();
      if (semanas.length === 0) {
        cont.innerHTML = '<div class="placeholder">No hay semanas con actividad registrada.</div>';
        return;
      }
      cont.innerHTML = `
        <div class="config-fila">
          <label class="config-label">Semana:</label>
          <select id="cfg-semana" class="select-grande">
            ${semanas.map(s => `<option value="${s}" ${s === semanas[semanas.length-1] ? 'selected' : ''}>Semana ${s}</option>`).join('')}
          </select>
          <span class="config-help-text">${semanas.length} semanas con actividad</span>
        </div>
      `;
    } else if (this.tipoSeleccionado === 'mensual') {
      const meses = LectorDatos.mesesDisponibles();
      if (meses.length === 0) {
        cont.innerHTML = '<div class="placeholder">No hay meses con actividad.</div>';
        return;
      }
      const nombres = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
      const ultimo = meses[meses.length - 1];
      cont.innerHTML = `
        <div class="config-fila">
          <label class="config-label">Mes:</label>
          <select id="cfg-mes" class="select-grande">
            ${meses.map(m => {
              const sel = (m.anio === ultimo.anio && m.mes === ultimo.mes) ? 'selected' : '';
              return `<option value="${m.anio}-${m.mes}" ${sel}>${nombres[m.mes-1]} ${m.anio}</option>`;
            }).join('')}
          </select>
        </div>
      `;
    } else if (this.tipoSeleccionado === 'rango') {
      cont.innerHTML = `
        <div class="config-fila">
          <label class="config-label">Desde:</label>
          <input type="date" id="cfg-desde" class="input-fecha"
                 value="${FechaUtil.toInputDate(rango.min || new Date())}">
          <label class="config-label">Hasta:</label>
          <input type="date" id="cfg-hasta" class="input-fecha"
                 value="${FechaUtil.toInputDate(rango.max || new Date())}">
        </div>
      `;
    } else if (this.tipoSeleccionado === 'avance') {
      cont.innerHTML = `
        <div class="config-fila">
          <span class="config-help-text">
            El reporte abarcará desde <b>${fminStr}</b> hasta <b>${fmaxStr}</b> (todo el proyecto).
          </span>
        </div>
      `;
    }
  },

  // Generar
  async generar() {
    if (!DatosCache.recepcion) {
      alert('Carga primero los datos del Sheet (sección Configuración).');
      return;
    }

    const btn = document.getElementById('btn-generar');
    const res = document.getElementById('resultado-info');
    btn.disabled = true;
    btn.textContent = '⏳ Generando...';
    res.textContent = 'Procesando datos...';
    res.className = 'resultado-info';

    try {
      const opciones = this._construirOpciones();
      const nombre = await GeneradorPPT.generar(opciones);
      res.textContent = '✓ Generado: ' + nombre;
      res.className = 'resultado-info exito';
    } catch (err) {
      res.textContent = '❌ Error: ' + err.message;
      res.className = 'resultado-info error';
      console.error(err);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '▶ Generar y descargar PPT';
    }
  },

  _construirOpciones() {
    const tipo = this.tipoSeleccionado;
    let datos, periodoTitulo, periodoSubtitulo, fechasStr;

    if (tipo === 'diario') {
      const fStr = document.getElementById('cfg-fecha-diaria').value;
      if (!fStr) throw new Error('Selecciona una fecha.');
      const f = FechaUtil.parseLocal(fStr);  // FIX: parsea como local, no UTC
      datos = LectorDatos.filtrarPorRango(f, f);
      periodoTitulo = this._fmtFecha(f);
      periodoSubtitulo = this._diaSemanaTexto(f);
      fechasStr = this._fmtFecha(f);

    } else if (tipo === 'semanal') {
      const num = parseInt(document.getElementById('cfg-semana').value);
      datos = LectorDatos.filtrarPorSemana(num);
      const p = datos._periodo;
      periodoTitulo = `SEMANA ${num}`;
      periodoSubtitulo = `${this._fmtFecha(p.lunes)} – ${this._fmtFecha(p.domingo)}`;
      fechasStr = `${this._fmtFecha(p.lunes)} – ${this._fmtFecha(p.domingo)} · Semana ${num}`;

    } else if (tipo === 'mensual') {
      const [anio, mes] = document.getElementById('cfg-mes').value.split('-').map(Number);
      const fd = FechaUtil.local(anio, mes, 1);
      // Último día del mes: día 0 del mes siguiente
      const fh = new Date(anio, mes, 0, 0, 0, 0, 0);
      datos = LectorDatos.filtrarPorRango(fd, fh);
      const nombres = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
      periodoTitulo = `${nombres[mes-1].toUpperCase()} ${anio}`;
      periodoSubtitulo = `Mes de ${nombres[mes-1]} ${anio}`;
      fechasStr = `${this._fmtFecha(fd)} – ${this._fmtFecha(fh)}`;

    } else if (tipo === 'rango') {
      const fdStr = document.getElementById('cfg-desde').value;
      const fhStr = document.getElementById('cfg-hasta').value;
      if (!fdStr || !fhStr) throw new Error('Selecciona ambas fechas.');
      const fd = FechaUtil.parseLocal(fdStr);  // FIX
      const fh = FechaUtil.parseLocal(fhStr);  // FIX
      if (fd > fh) throw new Error('La fecha "desde" debe ser anterior a "hasta".');
      datos = LectorDatos.filtrarPorRango(fd, fh);
      periodoTitulo = `${this._fmtFecha(fd)} – ${this._fmtFecha(fh)}`;
      periodoSubtitulo = 'Rango personalizado';
      fechasStr = `${this._fmtFecha(fd)} – ${this._fmtFecha(fh)}`;

    } else if (tipo === 'avance') {
      datos = LectorDatos.filtrarAvanceTotal();
      const r = datos._periodo;
      periodoTitulo = 'AVANCE TOTAL';
      periodoSubtitulo = 'Desde el inicio del proyecto';
      fechasStr = `${this._fmtFecha(r.min)} – ${this._fmtFecha(r.max)}`;
    }

    const kpis = KPIs.calcular(datos);
    const acumulados = KPIs.acumuladosProyecto();
    const incluirFotos = document.getElementById('opt-incluir-fotos').checked;
    const preparadoPor = Prefs.getPreparadoPor();

    // Extraer las imágenes y etiquetas del estado actual
    // (mantiene posiciones aunque algunas estén vacías)
    const imagenes = ImagenesActivas.todas().map((item, i) => {
      if (!item) return { dataUrl: null, etiqueta: `Foto ${i + 1}` };
      return {
        dataUrl: item.dataUrl || null,
        etiqueta: item.etiqueta || `Foto ${i + 1}`
      };
    });

    // ============================================================
    // PERSONAL ASISTENTE — array de { numero, nombre } seleccionados
    // ============================================================
    const personalAsistente = UIPersonal.obtenerSeleccionados();

    // Total personal disponible (para mostrar "X de Y asistieron")
    const personalTotal = DatosCache.filas('personal')
      .map(r => ({
        numero: parseInt(r['N°']),
        nombre: String(r['NOMBRES Y APELLIDOS'] || '').trim()
      }))
      .filter(p => p.numero && p.nombre);

    // ============================================================
    // HORÓMETRO — calcular para el rango del reporte
    // ============================================================
    let fDesdeHoro, fHastaHoro;
    if (tipo === 'diario') {
      fDesdeHoro = FechaUtil.parseLocal(document.getElementById('cfg-fecha-diaria').value);
      fHastaHoro = fDesdeHoro;
    } else if (tipo === 'semanal') {
      const p = datos._periodo;
      fDesdeHoro = p.lunes; fHastaHoro = p.domingo;
    } else if (tipo === 'mensual') {
      const [anio, mes] = document.getElementById('cfg-mes').value.split('-').map(Number);
      fDesdeHoro = FechaUtil.local(anio, mes, 1);
      fHastaHoro = new Date(anio, mes, 0);
    } else if (tipo === 'rango') {
      fDesdeHoro = FechaUtil.parseLocal(document.getElementById('cfg-desde').value);
      fHastaHoro = FechaUtil.parseLocal(document.getElementById('cfg-hasta').value);
    } else if (tipo === 'avance') {
      const r = datos._periodo;
      fDesdeHoro = r.min; fHastaHoro = r.max;
    }

    const horometroDatos = Horometro.calcular(fDesdeHoro, fHastaHoro);
    const estadosMontac = Prefs.getEstadoMontacargas();

    return {
      tipoReporte: tipo,
      datos, kpis, acumulados,
      periodoTitulo, periodoSubtitulo, fechasStr,
      imagenes,
      incluirFotos,
      preparadoPor,
      // Nuevos
      personalAsistente,
      personalTotal,
      horometroDatos,
      estadosMontacarga: estadosMontac
    };
  },

  _fmtFecha(d) {
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  },

  _isoDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  },

  _diaSemanaTexto(d) {
    const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    return `${dias[d.getDay()]}, ${this._fmtFecha(d)}`;
  }
};
