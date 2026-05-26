/* ============================================================
   SHEETS API — Cliente para hablar con el Apps Script Web App
   ============================================================ */

const SheetsAPI = {

  _url() {
    const u = Prefs.getUrlApi();
    if (!u) throw new Error(
      'URL del Apps Script no configurada. Ve a la sección "Configuración" para pegarla.'
    );
    return u;
  },

  // ============================================================
  // PING — Verifica conexión
  // ============================================================
  async ping() {
    const resp = await fetch(this._url() + '?action=ping');
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    return await resp.json();
  },

  // ============================================================
  // LEER TODOS LOS DATOS (las 3 hojas)
  // ============================================================
  async leerTodo() {
    const resp = await fetch(this._url() + '?action=leer');
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const j = await resp.json();
    if (!j.ok) throw new Error(j.error || 'Error del servidor');
    return j.datos;
  },

  // ============================================================
  // LEER UNA SOLA HOJA
  // ============================================================
  async leerHoja(claveHoja) {
    const resp = await fetch(
      this._url() + '?action=leer_hoja&hoja=' + encodeURIComponent(claveHoja)
    );
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const j = await resp.json();
    if (!j.ok) throw new Error(j.error || 'Error del servidor');
    return j.datos;
  },

  // ============================================================
  // AGREGAR FILA
  // hoja: 'recepcion' | 'estiba' | 'despacho'
  // datos: objeto { 'NOMBRE_COLUMNA': valor, ... }
  // ============================================================
  async agregarFila(hoja, datos) {
    // Apps Script Web Apps tienen un comportamiento especial con CORS.
    // Para evitar problemas se envía sin Content-Type custom.
    const resp = await fetch(this._url(), {
      method: 'POST',
      body: JSON.stringify({ action: 'agregar', hoja, datos }),
      redirect: 'follow'
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const j = await resp.json();
    if (!j.ok) throw new Error(j.error || 'Error del servidor');
    return j.fila_agregada;
  },

  // ============================================================
  // ACTUALIZAR CELDA
  // ============================================================
  async actualizarCelda(hoja, fila, columna, valor) {
    const resp = await fetch(this._url(), {
      method: 'POST',
      body: JSON.stringify({
        action: 'actualizar', hoja, fila, columna, valor
      }),
      redirect: 'follow'
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const j = await resp.json();
    if (!j.ok) throw new Error(j.error || 'Error del servidor');
    return true;
  },

  // ============================================================
  // ELIMINAR FILA
  // ============================================================
  async eliminarFila(hoja, fila) {
    const resp = await fetch(this._url(), {
      method: 'POST',
      body: JSON.stringify({ action: 'eliminar', hoja, fila }),
      redirect: 'follow'
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const j = await resp.json();
    if (!j.ok) throw new Error(j.error || 'Error del servidor');
    return true;
  }
};

// ============================================================
// CACHÉ EN MEMORIA DE LOS DATOS LEÍDOS
// ============================================================
const DatosCache = {
  recepcion: null,  // { headers, filas, fila_header }
  estiba:    null,
  despacho:  null,
  ultimaCarga: null,

  async cargar(forzar = false) {
    if (!forzar && this.recepcion && this.estiba && this.despacho) {
      return this;
    }
    const todo = await SheetsAPI.leerTodo();
    this.recepcion = todo.recepcion;
    this.estiba    = todo.estiba;
    this.despacho  = todo.despacho;
    this.ultimaCarga = new Date();
    return this;
  },

  // Devuelve los datos transformados a estructuras útiles
  filas(hoja) {
    return (this[hoja] && this[hoja].filas) || [];
  }
};
