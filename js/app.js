/* ============================================================
   APP — Punto de entrada, router y orquestación
   ============================================================ */

const App = {

  async init() {
    // Activar router del menú lateral
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', e => {
        e.preventDefault();
        const seccion = item.dataset.seccion;
        this.mostrarSeccion(seccion);
      });
    });

    // Inicializar las UIs
    UIGenerar.init();
    UIDatos.init();
    UIAgregar.init();
    UIIndicadores.init();
    UIConfig.init();

    // Si hay URL configurada, intentar cargar datos automáticamente
    if (Prefs.getUrlApi()) {
      try {
        await this.cargarDatos(true);
      } catch (e) {
        console.warn('No se pudieron cargar datos automáticamente:', e);
        this._actualizarBadge(false, 'Sin conexión');
      }
    } else {
      this._actualizarBadge(false, 'Configura la URL en "Configuración"');
    }
  },

  // Cambiar de sección
  mostrarSeccion(seccion) {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    document.querySelector(`.nav-item[data-seccion="${seccion}"]`).classList.add('active');

    document.querySelectorAll('.seccion').forEach(s => s.classList.remove('activa'));
    document.getElementById('seccion-' + seccion).classList.add('activa');

    // Refrescar contenido si aplica
    if (seccion === 'datos')        UIDatos.renderizar();
    if (seccion === 'indicadores')  UIIndicadores.renderizar();
    if (seccion === 'generar')      UIGenerar.refrescarPanelConfig();
  },

  // Cargar datos del Sheet
  async cargarDatos(forzar = false) {
    if (!Prefs.getUrlApi()) {
      throw new Error('URL del Apps Script no configurada.');
    }

    this._actualizarBadge(false, 'Cargando datos...');

    try {
      await DatosCache.cargar(forzar);
      const total =
        (DatosCache.recepcion?.filas?.length || 0) +
        (DatosCache.estiba?.filas?.length || 0) +
        (DatosCache.despacho?.filas?.length || 0);
      const personal = DatosCache.personal?.filas?.length || 0;
      const horometro = DatosCache.horometro?.filas?.length || 0;
      const extras = (personal > 0 || horometro > 0)
        ? ` + ${personal} personal + ${horometro} horómetro`
        : '';
      this._actualizarBadge(true, `Sheet conectado · ${total} registros${extras}`);

      // Refrescar UI actual
      const activa = document.querySelector('.seccion.activa');
      if (activa) {
        const id = activa.id.replace('seccion-', '');
        if (id === 'datos')       UIDatos.renderizar();
        if (id === 'indicadores') UIIndicadores.renderizar();
        if (id === 'generar') {
          UIGenerar.refrescarPanelConfig();
          UIPersonal.renderizar();
        }
      } else {
        // Renderizar siempre el panel de personal cuando cambian los datos
        UIPersonal.renderizar();
      }
    } catch (err) {
      this._actualizarBadge(false, 'Error: ' + err.message);
      throw err;
    }
  },

  _actualizarBadge(ok, texto) {
    const badge = document.getElementById('estado-conexion');
    const txt = badge.querySelector('.texto');
    txt.textContent = texto;
    badge.className = 'badge ' + (ok ? 'badge-success' : 'badge-warning');
  }
};

// Arranque
document.addEventListener('DOMContentLoaded', () => App.init());
