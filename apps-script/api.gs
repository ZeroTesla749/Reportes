/**
 * API WEB — Reportes Laguna
 *
 * Este script expone el Sheet como una API REST simple para la página web.
 * La web hace fetch() a la URL del Web App y obtiene/envía datos.
 *
 * INSTRUCCIONES DE DESPLIEGUE:
 * 1. Abre tu Sheet → Extensiones → Apps Script.
 * 2. Crea un archivo nuevo (.gs) y pega este código.
 * 3. Guarda.
 * 4. En Apps Script: Implementar → Nueva implementación.
 * 5. Tipo: "Aplicación web".
 * 6. Descripción: "API Reportes Laguna v1".
 * 7. Ejecutar como: "Yo (tu_correo@gmail.com)".
 * 8. Quién tiene acceso: "Cualquier persona".
 * 9. Implementar → Autorizar permisos.
 * 10. COPIA LA URL que aparece. Esa URL va en config.js de la web.
 *
 * Cada vez que modifiques este script, debes:
 *  - Apps Script: Implementar → Administrar implementaciones
 *  - Engranaje → Editar → Versión: Nueva versión → Implementar
 *  (La URL se mantiene si haces "editar implementación existente")
 *
 * SEGURIDAD: cualquiera con la URL puede leer/escribir tus datos.
 * No la publiques en sitios públicos.
 */

var HOJAS = {
  recepcion: 'BASE_LAGUNA_CONSOLIDADO',
  estiba:    'BASE_LAGUNA_CONTROL DE ESTIBADO',
  despacho:  'BASE_LAGUNA_DESPACHO'
};

// Las cabeceras reales empiezan en estas filas (1-indexed)
var FILA_HEADER = {
  recepcion: 4,
  estiba: 6,
  despacho: 6
};

// ============================================================
// PUNTO DE ENTRADA — GET
// ============================================================
function doGet(e) {
  try {
    var action = (e.parameter.action || 'leer').toLowerCase();

    if (action === 'leer') {
      return _json({ ok: true, datos: leerTodo_() });
    }
    if (action === 'leer_hoja') {
      var hoja = e.parameter.hoja;
      return _json({ ok: true, datos: leerHoja_(hoja) });
    }
    if (action === 'ping') {
      return _json({ ok: true, mensaje: 'API operativa', timestamp: new Date().toISOString() });
    }
    return _json({ ok: false, error: 'Acción desconocida: ' + action });
  } catch (err) {
    return _json({ ok: false, error: String(err) });
  }
}

// ============================================================
// PUNTO DE ENTRADA — POST
// ============================================================
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = (body.action || '').toLowerCase();

    if (action === 'agregar') {
      // Agrega una fila a la hoja indicada
      var fila = agregarFila_(body.hoja, body.datos);
      return _json({ ok: true, fila_agregada: fila });
    }

    if (action === 'actualizar') {
      actualizarCelda_(body.hoja, body.fila, body.columna, body.valor);
      return _json({ ok: true });
    }

    if (action === 'eliminar') {
      eliminarFila_(body.hoja, body.fila);
      return _json({ ok: true });
    }

    return _json({ ok: false, error: 'Acción POST desconocida: ' + action });
  } catch (err) {
    return _json({ ok: false, error: String(err) });
  }
}

// ============================================================
// FUNCIONES DE LECTURA
// ============================================================
function leerTodo_() {
  return {
    recepcion: leerHoja_('recepcion'),
    estiba:    leerHoja_('estiba'),
    despacho:  leerHoja_('despacho')
  };
}

function leerHoja_(claveHoja) {
  var nombreHoja = HOJAS[claveHoja];
  if (!nombreHoja) throw new Error('Hoja inválida: ' + claveHoja);

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(nombreHoja);
  if (!hoja) throw new Error('No se encontró la hoja: ' + nombreHoja);

  var filaHeader = FILA_HEADER[claveHoja];
  var ultFila = hoja.getLastRow();
  var ultCol = hoja.getLastColumn();

  if (ultFila <= filaHeader) return { headers: [], filas: [] };

  // Leer encabezados
  var headers = hoja.getRange(filaHeader, 1, 1, ultCol).getValues()[0]
    .map(function(h){ return String(h).trim(); });

  // Leer datos
  var datos = hoja.getRange(filaHeader + 1, 1, ultFila - filaHeader, ultCol)
    .getValues();

  // Convertir a array de objetos y serializar fechas
  var filas = [];
  for (var i = 0; i < datos.length; i++) {
    var row = datos[i];
    // Saltar filas completamente vacías
    var esVacia = row.every(function(c){ return c === '' || c === null; });
    if (esVacia) continue;

    var obj = { _fila: filaHeader + 1 + i };
    for (var j = 0; j < headers.length; j++) {
      var v = row[j];
      if (v instanceof Date) {
        v = v.toISOString();
      }
      obj[headers[j]] = v;
    }
    filas.push(obj);
  }

  return { headers: headers, filas: filas, fila_header: filaHeader };
}

// ============================================================
// FUNCIONES DE ESCRITURA
// ============================================================
function agregarFila_(claveHoja, datos) {
  var nombreHoja = HOJAS[claveHoja];
  if (!nombreHoja) throw new Error('Hoja inválida: ' + claveHoja);

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(nombreHoja);
  if (!hoja) throw new Error('No se encontró la hoja: ' + nombreHoja);

  var filaHeader = FILA_HEADER[claveHoja];
  var ultCol = hoja.getLastColumn();
  var headers = hoja.getRange(filaHeader, 1, 1, ultCol).getValues()[0];

  // Construir array en orden de columnas
  var nueva = [];
  for (var j = 0; j < headers.length; j++) {
    var key = String(headers[j]).trim();
    var v = datos[key];
    if (v === undefined || v === null) v = '';
    // Si parece fecha ISO, convertir a Date
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) {
      var d = new Date(v);
      if (!isNaN(d)) v = d;
    }
    nueva.push(v);
  }

  var siguienteFila = Math.max(hoja.getLastRow() + 1, filaHeader + 1);
  hoja.getRange(siguienteFila, 1, 1, nueva.length).setValues([nueva]);

  // N° autonumerado (columna A)
  if (!datos['N°']) {
    hoja.getRange(siguienteFila, 1).setValue(siguienteFila - filaHeader);
  }

  return siguienteFila;
}

function actualizarCelda_(claveHoja, fila, columna, valor) {
  var nombreHoja = HOJAS[claveHoja];
  if (!nombreHoja) throw new Error('Hoja inválida: ' + claveHoja);
  var hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nombreHoja);
  if (!hoja) throw new Error('Hoja no encontrada');
  hoja.getRange(fila, columna).setValue(valor);
}

function eliminarFila_(claveHoja, fila) {
  var nombreHoja = HOJAS[claveHoja];
  if (!nombreHoja) throw new Error('Hoja inválida: ' + claveHoja);
  var hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nombreHoja);
  if (!hoja) throw new Error('Hoja no encontrada');
  hoja.deleteRow(fila);
}

// ============================================================
// HELPER
// ============================================================
function _json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
