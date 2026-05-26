/* ============================================================
   UI — Sección "Indicadores"
   ============================================================ */

const UIIndicadores = {

  init() {
    // Se refresca cuando se cargan los datos (lo llama App.js)
  },

  renderizar() {
    const cont = document.getElementById('indicadores-container');

    if (!DatosCache.recepcion) {
      cont.innerHTML = '<div class="placeholder">Carga los datos del Sheet primero.</div>';
      return;
    }

    const a = KPIs.acumuladosProyecto();
    const tubosNeto = a.tubos_casing - a.despacho_tubos;
    const pendiente = a.tubos_casing - a.estiba_tubos;
    const avance = a.tubos_casing > 0 ? (a.estiba_tubos / a.tubos_casing * 100) : 0;

    cont.innerHTML = `
      <div class="kpi-grid">
        <div class="kpi-card amarillo">
          <div class="kpi-bar"></div>
          <div class="kpi-valor">${this._n(a.camiones_unicos)}</div>
          <div class="kpi-label">CAMIONES RECIBIDOS</div>
          <div class="kpi-sublabel">placa + guía únicos</div>
        </div>
        <div class="kpi-card verde">
          <div class="kpi-bar"></div>
          <div class="kpi-valor">${this._n(a.tubos_casing)}</div>
          <div class="kpi-label">TUBOS CASING</div>
          <div class="kpi-sublabel">recibidos</div>
        </div>
        <div class="kpi-card naranja">
          <div class="kpi-bar"></div>
          <div class="kpi-valor">${a.equipos_aib}</div>
          <div class="kpi-label">EQUIPOS AIB</div>
          <div class="kpi-sublabel">recibidos</div>
        </div>
        <div class="kpi-card amarillo">
          <div class="kpi-bar"></div>
          <div class="kpi-valor">${a.eficiencia_general.toFixed(1)}%</div>
          <div class="kpi-label">EFICIENCIA GENERAL</div>
          <div class="kpi-sublabel">promedio</div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-titulo verde">AVANCE DE ESTIBA</div>
        <div class="barra-progreso">
          <div class="barra-progreso-fill" style="width: ${avance.toFixed(1)}%">
            ${avance > 8 ? `${avance.toFixed(1)}% · ${this._n(a.estiba_tubos)} tubos` : ''}
          </div>
          ${avance < 92 ? `<div class="barra-progreso-resto">${(100-avance).toFixed(1)}% pendiente</div>` : ''}
        </div>
        <div style="display: flex; justify-content: space-between; color: var(--c-txt-gris); font-size: 12px; margin-top: 4px;">
          <span>0</span>
          <span>${this._n(a.estiba_tubos)} de ${this._n(a.tubos_casing)} tubos</span>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card verde">
          <div class="kpi-bar"></div>
          <div class="kpi-valor">${a.estiba_ops}</div>
          <div class="kpi-label">OPERACIONES ESTIBA</div>
          <div class="kpi-sublabel">en ${a.estiba_dias} días</div>
        </div>
        <div class="kpi-card amarillo">
          <div class="kpi-bar"></div>
          <div class="kpi-valor">${this._n(a.estiba_paquetes)}</div>
          <div class="kpi-label">PAQUETES ESTIBADOS</div>
          <div class="kpi-sublabel">${a.estiba_pkth.toFixed(2)} paq/h prom</div>
        </div>
        <div class="kpi-card naranja">
          <div class="kpi-bar"></div>
          <div class="kpi-valor">${a.despacho_actas}</div>
          <div class="kpi-label">ACTAS DE DESPACHO</div>
          <div class="kpi-sublabel">${a.despacho_tubos} tubos</div>
        </div>
        <div class="kpi-card naranja">
          <div class="kpi-bar"></div>
          <div class="kpi-valor">${this._n(pendiente)}</div>
          <div class="kpi-label">PENDIENTE ESTIBA</div>
          <div class="kpi-sublabel">tubos por colocar</div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-titulo amarillo">INVENTARIO EN PATIO</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div>
            <div style="color: var(--c-txt-gris); font-size: 11px;">Tubos casing en patio</div>
            <div style="color: var(--c-verde); font-size: 22px; font-weight: 600;">${this._n(tubosNeto)}</div>
            <div style="color: var(--c-txt-gris); font-size: 11px;">recibido − despachado</div>
          </div>
          <div>
            <div style="color: var(--c-txt-gris); font-size: 11px;">Equipos AIB en patio</div>
            <div style="color: var(--c-naranja); font-size: 22px; font-weight: 600;">${a.equipos_aib}</div>
            <div style="color: var(--c-txt-gris); font-size: 11px;">total recibidos</div>
          </div>
        </div>
      </div>

      <div class="resultado-info" style="text-align: center; margin-top: 20px;">
        Última actualización: ${DatosCache.ultimaCarga ? DatosCache.ultimaCarga.toLocaleString('es-PE') : '—'}
      </div>
    `;
  },

  _n(num) {
    return String(Math.round(num || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
};
