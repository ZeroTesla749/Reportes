/* ============================================================
   UI — Personal Operativo (en sección Generar reporte)
   Ahora la hoja PERSONAL contiene PUESTOS con su CANTIDAD:
     - Columna A (N°)  = cantidad de personal en ese puesto
     - Columna B (NOMBRES Y APELLIDOS) = nombre del puesto
   Ya NO se marca asistencia; solo se muestra la composición del personal.
   ============================================================ */

const UIPersonal = {

  init() {
    // Ya no hay checkboxes ni asistencia. Solo mostramos un resumen.
  },

  renderizar() {
    const cont = document.getElementById('personal-grid');
    if (!cont) return;

    const puestos = this._obtenerPuestos();

    if (puestos.length === 0) {
      cont.innerHTML = `
        <div class="placeholder" style="padding: 20px;">
          La hoja PERSONAL está vacía o no se cargó. Verifica que exista la hoja
          con los puestos y cantidades, y recarga los datos.
        </div>`;
      this._actualizarInfo(0, 0);
      return;
    }

    const totalPersonal = puestos.reduce((a, p) => a + p.cantidad, 0);

    // Tabla resumen de puestos
    let html = '<table class="tabla-datos" style="margin-top: 8px;"><thead><tr>';
    html += '<th>PUESTO</th><th style="text-align:center;">CANTIDAD</th>';
    html += '</tr></thead><tbody>';
    puestos.forEach(p => {
      html += `<tr>
        <td>${this._esc(p.puesto)}</td>
        <td style="text-align:center; font-weight:600; color: var(--c-verde);">${p.cantidad}</td>
      </tr>`;
    });
    html += `<tr style="border-top: 2px solid var(--c-amarillo);">
      <td style="font-weight:600; color: var(--c-amarillo);">TOTAL</td>
      <td style="text-align:center; font-weight:700; color: var(--c-amarillo);">${totalPersonal}</td>
    </tr>`;
    html += '</tbody></table>';
    cont.innerHTML = html;

    this._actualizarInfo(puestos.length, totalPersonal);
  },

  // Devuelve [{ puesto, cantidad }]
  _obtenerPuestos() {
    const filas = DatosCache.filas('personal');
    return filas
      .map(r => ({
        cantidad: parseInt(r['N°']) || 0,
        puesto: String(r['NOMBRES Y APELLIDOS'] || '').trim()
      }))
      .filter(p => p.puesto);
  },

  _actualizarInfo(numPuestos, totalPersonal) {
    const info = document.getElementById('info-personal-seleccionados');
    if (info) {
      info.textContent = `${numPuestos} puestos · ${totalPersonal} personas en total`;
    }
  },

  _esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
};
