/* ============================================================
   UI — Sección "Ver/editar datos"
   ============================================================ */

const UIDatos = {

  hojaActual: 'recepcion',

  init() {
    document.querySelectorAll('.tab-hoja').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab-hoja').forEach(t => t.classList.remove('activa'));
        tab.classList.add('activa');
        this.hojaActual = tab.dataset.hoja;
        this.renderizar();
      });
    });
  },

  renderizar() {
    const cont = document.getElementById('tabla-datos-container');

    if (!DatosCache[this.hojaActual]) {
      cont.innerHTML = '<div class="placeholder">Carga los datos del Sheet primero.</div>';
      return;
    }

    const data = DatosCache[this.hojaActual];
    const headers = data.headers;
    const filas = data.filas;

    if (filas.length === 0) {
      cont.innerHTML = `<div class="placeholder">La hoja "${CONFIG.hojas[this.hojaActual]}" está vacía. Usa la sección "Agregar registros" para ingresar datos.</div>`;
      return;
    }

    // Tabla
    let html = '<table class="tabla-datos"><thead><tr>';
    html += '<th>#</th>';
    headers.forEach(h => html += `<th>${this._esc(h)}</th>`);
    html += '<th>Acciones</th></tr></thead><tbody>';

    filas.forEach((f, idx) => {
      html += `<tr data-fila="${f._fila}">`;
      html += `<td>${idx + 1}</td>`;
      headers.forEach((h, colIdx) => {
        const v = this._fmtValor(f[h], h);
        html += `<td class="editable" data-columna="${colIdx + 1}" data-key="${this._esc(h)}">${this._esc(v)}</td>`;
      });
      html += `<td><button class="btn-peligro" data-eliminar="${f._fila}">Eliminar</button></td>`;
      html += '</tr>';
    });
    html += '</tbody></table>';
    cont.innerHTML = html;

    // Event listeners para edición y eliminación
    cont.querySelectorAll('td.editable').forEach(td => {
      td.addEventListener('click', () => this._editarCelda(td));
    });
    cont.querySelectorAll('[data-eliminar]').forEach(btn => {
      btn.addEventListener('click', () => this._eliminarFila(parseInt(btn.dataset.eliminar)));
    });
  },

  async _editarCelda(td) {
    if (td.classList.contains('editando')) return;
    const valorOriginal = td.textContent;
    const fila = parseInt(td.parentElement.dataset.fila);
    const columna = parseInt(td.dataset.columna);

    td.classList.add('editando');
    td.innerHTML = `<input type="text" value="${this._esc(valorOriginal)}">`;
    const input = td.querySelector('input');
    input.focus();
    input.select();

    const guardar = async () => {
      const nuevo = input.value;
      if (nuevo === valorOriginal) {
        td.classList.remove('editando');
        td.textContent = valorOriginal;
        return;
      }
      td.textContent = '⏳';
      try {
        await SheetsAPI.actualizarCelda(this.hojaActual, fila, columna, nuevo);
        td.classList.remove('editando');
        td.textContent = nuevo;
      } catch (err) {
        td.classList.remove('editando');
        td.textContent = valorOriginal;
        alert('Error al guardar: ' + err.message);
      }
    };

    input.addEventListener('blur', guardar);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') input.blur();
      if (e.key === 'Escape') {
        td.classList.remove('editando');
        td.textContent = valorOriginal;
      }
    });
  },

  async _eliminarFila(fila) {
    if (!confirm(`¿Eliminar la fila ${fila}? Esta acción no se puede deshacer.`)) return;
    try {
      await SheetsAPI.eliminarFila(this.hojaActual, fila);
      await App.cargarDatos(true);
    } catch (err) {
      alert('Error al eliminar: ' + err.message);
    }
  },

  _fmtValor(v, key) {
    if (v === null || v === undefined || v === '') return '';
    // Fechas
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
      const d = new Date(v);
      if (!isNaN(d)) {
        // Si la clave es HORA, formatear como hh:mm
        if (key && key.includes('HORA')) {
          return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
        }
        return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
      }
    }
    if (typeof v === 'number') {
      return Number.isInteger(v) ? String(v) : v.toFixed(2);
    }
    return String(v);
  },

  _esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
};
