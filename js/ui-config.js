/* ============================================================
   UI — Sección "Configuración"
   ============================================================ */

const UIConfig = {

  init() {
    // Cargar valores guardados
    document.getElementById('config-url-api').value = Prefs.getUrlApi();
    document.getElementById('config-preparado-por').value = Prefs.getPreparadoPor();
    this._renderizarEtiquetas();
    this._renderizarMontacargas();

    // Botones
    document.getElementById('btn-guardar-url').addEventListener('click', () => this._guardarUrl());
    document.getElementById('btn-guardar-preparado').addEventListener('click', () => this._guardarPreparado());
    document.getElementById('btn-agregar-etiqueta').addEventListener('click', () => this._agregarEtiqueta());
    document.getElementById('btn-guardar-etiquetas').addEventListener('click', () => this._guardarEtiquetas());
    document.getElementById('btn-guardar-montac').addEventListener('click', () => this._guardarMontacargas());
  },

  _renderizarMontacargas() {
    const cont = document.getElementById('config-montacargas');
    if (!cont) return;
    const estados = Prefs.getEstadoMontacargas();
    let html = '';
    CONFIG.montacargas.forEach(m => {
      const actual = estados[m] || 'OPERATIVO';
      html += `
        <div class="montacarga-row">
          <strong>${m}</strong>
          <select id="cfg-montac-${m}" class="select-grande" data-montac="${m}">
            ${CONFIG.estadosMontacarga.map(e =>
              `<option value="${e}" ${actual === e ? 'selected' : ''}>${e}</option>`
            ).join('')}
          </select>
          <span class="estado-badge estado-${actual.toLowerCase().replace(/ /g, '-')}" id="cfg-montac-badge-${m}">${actual}</span>
        </div>
      `;
    });
    cont.innerHTML = html;

    // Listeners para actualizar el badge visual cuando cambia el select
    CONFIG.montacargas.forEach(m => {
      const sel = document.getElementById(`cfg-montac-${m}`);
      if (sel) {
        sel.addEventListener('change', e => {
          const badge = document.getElementById(`cfg-montac-badge-${m}`);
          if (badge) {
            badge.textContent = e.target.value;
            badge.className = `estado-badge estado-${e.target.value.toLowerCase().replace(/ /g, '-')}`;
          }
        });
      }
    });
  },

  _guardarMontacargas() {
    const estados = {};
    CONFIG.montacargas.forEach(m => {
      const sel = document.getElementById(`cfg-montac-${m}`);
      if (sel) estados[m] = sel.value;
    });
    Prefs.setEstadoMontacargas(estados);
    const res = document.getElementById('config-montac-resultado');
    res.textContent = '✓ Estado guardado';
    res.className = 'resultado-info exito';
    setTimeout(() => { res.textContent = ''; }, 2500);
  },

  abrirSeccion() {
    document.querySelector('.nav-item[data-seccion="config"]').click();
  },

  async _guardarUrl() {
    const url = document.getElementById('config-url-api').value.trim();
    const res = document.getElementById('config-resultado');

    if (!url) {
      res.textContent = 'Ingresa una URL.';
      res.className = 'resultado-info error';
      return;
    }
    if (!/^https:\/\/script\.google(usercontent)?\.com\//.test(url)) {
      res.textContent = 'La URL no parece de Apps Script. Debe comenzar con https://script.google.com/...';
      res.className = 'resultado-info error';
      return;
    }

    Prefs.setUrlApi(url);
    res.textContent = '⏳ Probando conexión...';
    res.className = 'resultado-info';

    try {
      const r = await SheetsAPI.ping();
      if (r.ok) {
        res.textContent = `✓ Conexión OK. ${r.mensaje}`;
        res.className = 'resultado-info exito';
        // Cargar datos automáticamente
        await App.cargarDatos(true);
      } else {
        throw new Error(r.error || 'Respuesta inválida');
      }
    } catch (err) {
      res.textContent = '❌ Error: ' + err.message;
      res.className = 'resultado-info error';
    }
  },

  _guardarPreparado() {
    const v = document.getElementById('config-preparado-por').value.trim();
    Prefs.setPreparadoPor(v || CONFIG.proyecto.preparadoPorDefault);
    alert('Nombre guardado.');
  },

  _renderizarEtiquetas() {
    const cont = document.getElementById('config-etiquetas-lista');
    const etiquetas = Prefs.getEtiquetas();
    cont.innerHTML = etiquetas.map((et, i) => `
      <div class="etiqueta-fila">
        <input type="text" data-idx="${i}" value="${this._esc(et)}">
        <button class="btn-peligro" data-quitar="${i}">✕</button>
      </div>
    `).join('');

    cont.querySelectorAll('[data-quitar]').forEach(btn => {
      btn.addEventListener('click', () => this._quitarEtiqueta(parseInt(btn.dataset.quitar)));
    });
  },

  _agregarEtiqueta() {
    const cont = document.getElementById('config-etiquetas-lista');
    const inputs = cont.querySelectorAll('input');
    const actuales = Array.from(inputs).map(i => i.value);
    actuales.push('Nueva foto');
    Prefs.setEtiquetas(actuales);
    this._renderizarEtiquetas();
  },

  _quitarEtiqueta(idx) {
    const cont = document.getElementById('config-etiquetas-lista');
    const inputs = cont.querySelectorAll('input');
    const actuales = Array.from(inputs).map(i => i.value);
    actuales.splice(idx, 1);
    if (actuales.length === 0) {
      alert('Debe haber al menos una etiqueta.');
      return;
    }
    Prefs.setEtiquetas(actuales);
    this._renderizarEtiquetas();
  },

  _guardarEtiquetas() {
    const cont = document.getElementById('config-etiquetas-lista');
    const inputs = cont.querySelectorAll('input');
    const nuevas = Array.from(inputs).map(i => i.value.trim()).filter(v => v);
    if (nuevas.length === 0) {
      alert('Debe haber al menos una etiqueta.');
      return;
    }
    Prefs.setEtiquetas(nuevas);
    UIGenerar.refrescarInfoEtiquetas();
    alert('Etiquetas guardadas (' + nuevas.length + ').');
  },

  _esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
};
