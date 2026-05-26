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

    // Botón editar etiquetas
    document.getElementById('btn-editar-etiquetas').addEventListener('click', () =>
      this.abrirEditorEtiquetas());

    // Checkbox fotos
    document.getElementById('opt-incluir-fotos').addEventListener('change', e => {
      document.getElementById('btn-editar-etiquetas').disabled = !e.target.checked;
    });

    this.refrescarInfoEtiquetas();
    this.refrescarPanelConfig();
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
    const etiquetas = Prefs.getEtiquetas();
    const preparadoPor = Prefs.getPreparadoPor();

    return {
      tipoReporte: tipo,
      datos, kpis, acumulados,
      periodoTitulo, periodoSubtitulo, fechasStr,
      etiquetasFotos: etiquetas,
      incluirFotos,
      preparadoPor
    };
  },

  refrescarInfoEtiquetas() {
    const et = Prefs.getEtiquetas();
    document.getElementById('info-etiquetas').textContent =
      `${et.length} etiquetas configuradas`;
  },

  abrirEditorEtiquetas() {
    // Reutiliza el editor que está en la sección Configuración
    UIConfig.abrirSeccion();
    // Hace scroll al panel de etiquetas
    const panel = document.querySelector('#seccion-config .panel-titulo.verde');
    if (panel) panel.scrollIntoView({ behavior: 'smooth' });
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
