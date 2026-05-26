/* ============================================================
   CONFIG — Reportes Laguna
   Colores corporativos y configuración de la app.
   La URL del Apps Script se guarda en localStorage.
   ============================================================ */

const CONFIG = {
  // Colores corporativos (mismo formato que PptxGenJS espera: hex sin #)
  colores: {
    amarillo: 'FFD100',
    verde:    '97D700',
    naranja:  'F18448',
    gris:     '4B4F54',
    grisOsc:  '3A3D42',
    blanco:   'FFFFFF',
    negro:    '1A1A1A',
    txtGris:  '9EA3A8',
    borde:    'E0E0E0'
  },

  // Etiquetas de fotos por defecto
  etiquetasFotosDefault: [
    'Despacho — Acta 1',
    'Despacho — Acta 2',
    'Equipo en Base El Alto',
    'Operación de estibado',
    'Recepción de AIB',
    'Movimiento caja de herramientas AIB'
  ],

  // Metadatos del proyecto
  proyecto: {
    nombre: 'BASE LAGUNA',
    subtitulo: 'INSPECCIÓN DE TUBULARES',
    ubicacion: 'LAGUNA · EL ALTO · PROYECTO DE PERFORACIÓN · 2026',
    preparadoPorDefault: 'Dany Navarro'
  },

  // Hojas del Sheet
  hojas: {
    recepcion: 'BASE_LAGUNA_CONSOLIDADO',
    estiba:    'BASE_LAGUNA_CONTROL DE ESTIBADO',
    despacho:  'BASE_LAGUNA_DESPACHO'
  },

  // ============================================================
  // CATÁLOGO DE MATERIALES (extraído del Excel original)
  // Usado para autocompletar descripción al escribir el código
  // en los formularios de Agregar Registros.
  //
  // Para añadir nuevos códigos, agrega aquí una nueva entrada.
  // ============================================================
  catalogo: {
    // === CASING ===
    '440000024': { tipo: 'CASING', desc: 'CASING 5-1/2", K55, 15.5 LB/FT,LTC,BRD,R3' },
    '440000025': { tipo: 'CASING', desc: 'CASING 5-1/2", K55, 17.0 LB/FT,LTC,BRD,R3' },
    '440000026': { tipo: 'CASING', desc: 'CASING 5-1/2", N80Q, 17.0 LB/FT,LTC,BRD,R3' },
    '440000027': { tipo: 'CASING', desc: 'CASING 5-1/2", N80Q, 20.0 LB/FT,LTC,BTC,R3' },
    '440000028': { tipo: 'CASING', desc: 'CASING 9 5/8 - H40 32.3 LB/FT, LTC,BRD,R3' },
    '440000029': { tipo: 'CASING', desc: 'CASING 9 5/8 - N80 40.0 LB/FT, LTC,BRD,R3' },
    '440000030': { tipo: 'CASING', desc: 'CASING 13 3/8 - H40 48.0 LB/FT, LTC,BRD,R3' },
    // === AIB ===
    '290000246': { tipo: 'AIB', desc: 'UNIDAD BOMBEO, CONVENCIONAL AIB C-80D-133-54 API 11E CLASE I' },
    '290000247': { tipo: 'AIB', desc: 'UNIDAD BOMBEO, CONVENCIONAL AIB C160D-200-74TH API 11E CLASE I' },
    '290000566': { tipo: 'AIB', desc: 'UNIDAD BOMBEO, CONVENCIONAL AIB C-228D-213-86 API 11E CLASE I' },
    '290000567': { tipo: 'AIB', desc: 'UNIDAD BOMBEO, CONVENCIONAL AIB C320D-305 API 11E CLASE I' },
    '290000568': { tipo: 'AIB', desc: 'UNIDAD BOMBEO, CONVENCIONAL AIB C114D-173-64TH API 11E CLASE I' }
  }
};

// ============================================================
// HELPER: Lookup de código → descripción
// ============================================================
const Catalogo = {
  buscar(codigo) {
    if (!codigo) return null;
    // Normalizar: quitar espacios y ceros iniciales
    const cod = String(codigo).trim().replace(/^0+/, '');
    return CONFIG.catalogo[cod] || null;
  },

  buscarPorDescripcion(desc) {
    if (!desc) return null;
    const d = String(desc).trim().toLowerCase();
    for (const [cod, item] of Object.entries(CONFIG.catalogo)) {
      if (item.desc.toLowerCase() === d) {
        return { codigo: cod, ...item };
      }
    }
    return null;
  },

  todos() {
    return Object.entries(CONFIG.catalogo).map(([codigo, item]) => ({
      codigo, ...item
    }));
  },

  porTipo(tipo) {
    return this.todos().filter(i => i.tipo === tipo);
  }
};

// ============================================================
// PREFERENCIAS LOCALES (guardadas en navegador)
// ============================================================
const Prefs = {
  KEY_URL:          'reportes_laguna_url_api',
  KEY_ETIQUETAS:    'reportes_laguna_etiquetas',
  KEY_PREPARADO:    'reportes_laguna_preparado_por',

  // Leer/escribir URL del Apps Script
  getUrlApi() {
    return localStorage.getItem(this.KEY_URL) || '';
  },
  setUrlApi(url) {
    localStorage.setItem(this.KEY_URL, url);
  },

  // Etiquetas de fotos
  getEtiquetas() {
    const raw = localStorage.getItem(this.KEY_ETIQUETAS);
    if (!raw) return [...CONFIG.etiquetasFotosDefault];
    try {
      return JSON.parse(raw);
    } catch (e) {
      return [...CONFIG.etiquetasFotosDefault];
    }
  },
  setEtiquetas(arr) {
    localStorage.setItem(this.KEY_ETIQUETAS, JSON.stringify(arr));
  },

  // Preparado por
  getPreparadoPor() {
    return localStorage.getItem(this.KEY_PREPARADO) ||
           CONFIG.proyecto.preparadoPorDefault;
  },
  setPreparadoPor(nombre) {
    localStorage.setItem(this.KEY_PREPARADO, nombre);
  }
};
