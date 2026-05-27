/* ============================================================
   UI — Selector de personal asistente (en sección Generar reporte)
   ============================================================ */

const UIPersonal = {

  // N° de personas marcadas como asistentes (array de números)
  _seleccionados: [],

  init() {
    // Restaurar selección guardada
    this._seleccionados = Prefs.getAsistenciaMarcada();

    // Listeners
    const btnTodos = document.getElementById('btn-personal-todos');
    if (btnTodos) btnTodos.addEventListener('click', () => this.marcarTodos());

    const btnNinguno = document.getElementById('btn-personal-ninguno');
    if (btnNinguno) btnNinguno.addEventListener('click', () => this.desmarcarTodos());

    const btnLimpiar = document.getElementById('btn-personal-limpiar-guardado');
    if (btnLimpiar) btnLimpiar.addEventListener('click', () => this._limpiarGuardado());
  },

  // ============================================================
  // Render del panel completo (lista de personal con checkboxes)
  // ============================================================
  renderizar() {
    const cont = document.getElementById('personal-grid');
    if (!cont) return;

    const personal = this._obtenerPersonal();

    if (personal.length === 0) {
      cont.innerHTML = `
        <div class="placeholder" style="padding: 20px;">
          La hoja PERSONAL está vacía o no se cargó. Verifica que exista la hoja
          y vuelve a recargar los datos.
        </div>
      `;
      this._actualizarInfo(0, 0);
      return;
    }

    // Render con checkboxes
    let html = '<div class="personal-checkbox-grid">';
    personal.forEach(p => {
      const checked = this._seleccionados.includes(p.numero) ? 'checked' : '';
      html += `
        <label class="personal-item ${checked ? 'marcado' : ''}">
          <input type="checkbox" data-num="${p.numero}" ${checked}>
          <span class="personal-num">${p.numero}</span>
          <span class="personal-nombre">${this._esc(p.nombre)}</span>
        </label>
      `;
    });
    html += '</div>';
    cont.innerHTML = html;

    // Listeners de checkboxes
    cont.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', e => {
        const num = parseInt(e.target.dataset.num);
        if (e.target.checked) {
          if (!this._seleccionados.includes(num)) this._seleccionados.push(num);
        } else {
          this._seleccionados = this._seleccionados.filter(n => n !== num);
        }
        // Actualizar visual del label
        const label = e.target.closest('.personal-item');
        if (label) label.classList.toggle('marcado', e.target.checked);
        // Guardar
        Prefs.setAsistenciaMarcada(this._seleccionados);
        this._actualizarInfo(this._seleccionados.length, personal.length);
      });
    });

    this._actualizarInfo(this._seleccionados.length, personal.length);
  },

  // ============================================================
  // Marcar/desmarcar todos
  // ============================================================
  marcarTodos() {
    const personal = this._obtenerPersonal();
    this._seleccionados = personal.map(p => p.numero);
    Prefs.setAsistenciaMarcada(this._seleccionados);
    this.renderizar();
  },

  desmarcarTodos() {
    this._seleccionados = [];
    Prefs.setAsistenciaMarcada(this._seleccionados);
    this.renderizar();
  },

  _limpiarGuardado() {
    if (!confirm('¿Borrar la asistencia guardada y desmarcar todos?')) return;
    Prefs.limpiarAsistencia();
    this._seleccionados = [];
    this.renderizar();
  },

  // ============================================================
  // Devuelve la lista del personal seleccionado (con nombres)
  // [{numero, nombre}]
  // ============================================================
  obtenerSeleccionados() {
    const personal = this._obtenerPersonal();
    return personal.filter(p => this._seleccionados.includes(p.numero));
  },

  // ============================================================
  // Obtener personal desde DatosCache
  // ============================================================
  _obtenerPersonal() {
    const filas = DatosCache.filas('personal');
    return filas
      .map(r => ({
        numero: parseInt(r['N°']) || null,
        nombre: String(r['NOMBRES Y APELLIDOS'] || '').trim()
      }))
      .filter(p => p.numero && p.nombre);
  },

  _actualizarInfo(seleccionados, total) {
    const info = document.getElementById('info-personal-seleccionados');
    if (info) {
      info.textContent = `${seleccionados} de ${total} personas marcadas como asistentes`;
    }
  },

  _esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
};
