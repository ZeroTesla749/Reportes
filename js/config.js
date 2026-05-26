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
