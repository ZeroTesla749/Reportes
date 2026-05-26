/* ============================================================
   UI — Sección "Agregar registros"
   ============================================================ */

const UIAgregar = {

  hojaActual: 'recepcion',

  // Campos del formulario por hoja
  campos: {
    recepcion: [
      { key: 'FECHA',            label: 'Fecha',              tipo: 'date',   req: true },
      { key: 'PLACA TRACTO',     label: 'Placa del tracto',   tipo: 'text' },
      { key: 'N° GUIA',          label: 'N° de guía',         tipo: 'text' },
      { key: 'TIPO MATERIAL',    label: 'Tipo de material',   tipo: 'select', opciones: ['CASING', 'AIB'], req: true },
      { key: 'CODIGO SPRING',    label: 'Código Spring',      tipo: 'text' },
      { key: 'MEDIDA CASING',    label: 'Descripción / Medida', tipo: 'text', full: true },
      { key: 'N° FOR',           label: 'N° FOR',             tipo: 'text' },
      { key: 'PAQUETE POR CAMIÓN',  label: 'Paquetes por camión', tipo: 'number' },
      { key: 'TUBOS POR PAQUETE',   label: 'Tubos por paquete',   tipo: 'number' },
      { key: 'HORA INICIO',      label: 'Hora inicio (HH:MM)',tipo: 'time' },
      { key: 'HORA FIN',         label: 'Hora fin (HH:MM)',   tipo: 'time' },
      { key: 'OPERADOR',         label: 'Operador',           tipo: 'text' },
      { key: 'OBSERVACIONES',    label: 'Observaciones',      tipo: 'textarea', full: true }
    ],
    estiba: [
      { key: 'FECHA',                label: 'Fecha',             tipo: 'date', req: true },
      { key: 'PASILLO',              label: 'Pasillo',           tipo: 'select', opciones: ['1.1', '1.2', '1.3'] },
      { key: 'RACK',                 label: 'Rack',              tipo: 'text' },
      { key: 'CODIGO',               label: 'Código',            tipo: 'text' },
      { key: 'DESCRIPCION',          label: 'Descripción',       tipo: 'text', full: true },
      { key: 'HORA INICIO',          label: 'Hora inicio',       tipo: 'time' },
      { key: 'HORA FIN',             label: 'Hora fin',          tipo: 'time' },
      { key: 'PAQUETES ESTIBADOS',   label: 'Paquetes estibados',tipo: 'number' },
      { key: 'TOTAL DE TUBERIAS',    label: 'Total tubos',       tipo: 'number' },
      { key: 'MONTACARGA',           label: 'Montacarga',        tipo: 'select', opciones: ['ZOMLION', 'HANGCHA'] },
      { key: 'OPERADOR',             label: 'Operador',          tipo: 'text' },
      { key: 'OBSERVACIONES',        label: 'Observaciones',     tipo: 'textarea', full: true }
    ],
    despacho: [
      { key: 'FECHA',             label: 'Fecha',             tipo: 'date', req: true },
      { key: 'DESTINO',           label: 'Destino',           tipo: 'text' },
      { key: 'N° DE ACTA',        label: 'N° de acta',        tipo: 'text', req: true },
      { key: 'CODIGO',            label: 'Código',            tipo: 'text' },
      { key: 'DESCRIPCION',       label: 'Descripción',       tipo: 'text', full: true },
      { key: 'HORA INICIO',       label: 'Hora inicio',       tipo: 'time' },
      { key: 'HORA FIN',          label: 'Hora fin',          tipo: 'time' },
      { key: 'TOTAL DE TUBERIAS', label: 'Total tubos',       tipo: 'number' },
      { key: 'MONTACARGA',        label: 'Montacarga',        tipo: 'select', opciones: ['ZOMLION', 'HANGCHA'] },
      { key: 'OBSERVACIONES',     label: 'Observaciones',     tipo: 'textarea', full: true }
    ]
  },

  init() {
    document.querySelectorAll('.tab-agregar').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab-agregar').forEach(t => t.classList.remove('activa'));
        tab.classList.add('activa');
        this.hojaActual = tab.dataset.hoja;
        this.renderizar();
      });
    });
    this.renderizar();
  },

  renderizar() {
    const cont = document.getElementById('form-agregar-container');
    const campos = this.campos[this.hojaActual];

    let html = '<div class="form-grid">';
    campos.forEach(c => {
      const id = 'fld-' + this.hojaActual + '-' + c.key.replace(/[^a-z0-9]/gi, '_');
      const cls = c.full ? 'form-grupo full' : 'form-grupo';
      html += `<div class="${cls}"><label>${this._esc(c.label)}${c.req ? ' *' : ''}</label>`;
      if (c.tipo === 'select') {
        html += `<select id="${id}"><option value="">— seleccionar —</option>` +
                c.opciones.map(o => `<option value="${this._esc(o)}">${this._esc(o)}</option>`).join('') +
                '</select>';
      } else if (c.tipo === 'textarea') {
        html += `<textarea id="${id}"></textarea>`;
      } else {
        html += `<input type="${c.tipo}" id="${id}">`;
      }
      html += '</div>';
    });
    html += '</div>';
    html += `
      <div class="acciones-finales">
        <button class="btn-principal" id="btn-agregar-fila">+ Agregar a ${CONFIG.hojas[this.hojaActual]}</button>
        <button class="btn-secundario" id="btn-limpiar-form">Limpiar</button>
        <span class="resultado-info" id="resultado-agregar"></span>
      </div>
    `;
    cont.innerHTML = html;

    // Auto-rellenar fecha con hoy (componentes locales)
    const fechaInput = cont.querySelector('input[type=date]');
    if (fechaInput) {
      fechaInput.value = FechaUtil.toInputDate(new Date());
    }

    document.getElementById('btn-agregar-fila').addEventListener('click', () => this.guardar());
    document.getElementById('btn-limpiar-form').addEventListener('click', () => this.renderizar());
  },

  async guardar() {
    const campos = this.campos[this.hojaActual];
    const datos = {};
    const errores = [];

    campos.forEach(c => {
      const id = 'fld-' + this.hojaActual + '-' + c.key.replace(/[^a-z0-9]/gi, '_');
      const el = document.getElementById(id);
      if (!el) return;
      let v = el.value;
      if (c.req && !v) {
        errores.push(c.label);
      }
      // Convertir time a Date para que Apps Script lo guarde como hora
      if (c.tipo === 'time' && v) {
        // Combinar con la fecha del formulario
        const fechaInput = document.getElementById('fld-' + this.hojaActual + '-FECHA');
        const fechaStr = fechaInput ? fechaInput.value : null;
        if (fechaStr) {
          v = `${fechaStr}T${v}:00`;
        }
      }
      // Convertir number a número real
      if (c.tipo === 'number' && v) v = parseFloat(v);
      datos[c.key] = v;
    });

    if (errores.length > 0) {
      alert('Faltan campos obligatorios: ' + errores.join(', '));
      return;
    }

    const btn = document.getElementById('btn-agregar-fila');
    const res = document.getElementById('resultado-agregar');
    btn.disabled = true;
    btn.textContent = '⏳ Guardando...';
    res.textContent = '';

    try {
      const filaAgregada = await SheetsAPI.agregarFila(this.hojaActual, datos);
      res.textContent = '✓ Agregado en fila ' + filaAgregada;
      res.className = 'resultado-info exito';
      this.renderizar();
      // Refrescar caché
      await App.cargarDatos(true);
    } catch (err) {
      res.textContent = '❌ ' + err.message;
      res.className = 'resultado-info error';
    } finally {
      btn.disabled = false;
      btn.innerHTML = `+ Agregar a ${CONFIG.hojas[this.hojaActual]}`;
    }
  },

  _esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
};
