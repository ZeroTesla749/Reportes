/**
 * API WEB — Reportes Laguna  (v2 — con fix de "última fila real")
 *
 * v2: corrige el bug por el cual los registros nuevos iban a la fila 201
 *     (debido a que getLastRow() contaba las filas con fórmulas vacías).
 *     Ahora encontramos la última fila con datos reales en la columna A.
 *
 * DESPLIEGUE:
 * 1. Abre tu Sheet → Extensiones → Apps Script.
 * 2. Abre el archivo api.gs existente.
 * 3. BORRA todo su contenido y PEGA este código completo.
 * 4. Guarda (Ctrl+S).
 * 5. Implementar → Administrar implementaciones → ⚙ Editar (en tu implementación actual)
 *    → Versión: "Nueva versión" → Implementar.
 *    (La URL no cambia, solo se publica la versión nueva.)
 */

var HOJAS = {
  recepcion: 'BASE_LAGUNA_CONSOLIDADO',
  estiba:    'BASE_LAGUNA_CONTROL DE ESTIBADO',
  despacho:  'BASE_LAGUNA_DESPACHO'
};

// Las cabeceras reales están en estas filas (1-indexed)
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
  var ultFilaReal = ultimaFilaConDatos_(hoja, filaHeader);
  var ultCol = hoja.getLastColumn();

  // Leer encabezados
  var headers = hoja.getRange(filaHeader, 1, 1, ultCol).getValues()[0]
    .map(function(h){ return String(h).trim(); });

  if (ultFilaReal < filaHeader + 1) {
    // No hay datos, solo encabezados
    return { headers: headers, filas: [], fila_header: filaHeader };
  }

  // Leer todas las filas con datos
  var nFilas = ultFilaReal - filaHeader;
  var datos = hoja.getRange(filaHeader + 1, 1, nFilas, ultCol).getValues();

  // Convertir a array de objetos y serializar fechas
  var filas = [];
  for (var i = 0; i < datos.length; i++) {
    var row = datos[i];
    // Saltar filas completamente vacías (por si las hay en medio)
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
// ÚLTIMA FILA CON DATOS REALES (FIX BUG fila 201)
// 
// Recorre desde abajo hacia arriba buscando la primera fila con
// datos reales en la columna A o B (donde van N° y FECHA).
// Ignora filas que solo contienen fórmulas vacías o formato.
// ============================================================
function ultimaFilaConDatos_(hoja, filaHeader) {
  var ultFilaSheet = hoja.getLastRow();
  if (ultFilaSheet <= filaHeader) return filaHeader;

  // Leemos las primeras 2 columnas desde el inicio de datos hasta la última
  // fila del sheet. Esto es seguro incluso para hojas grandes.
  var nFilas = ultFilaSheet - filaHeader;
  if (nFilas <= 0) return filaHeader;

  var rango = hoja.getRange(filaHeader + 1, 1, nFilas, 2).getValues();

  // Recorrer al revés buscando la primera con dato real
  for (var i = rango.length - 1; i >= 0; i--) {
    var celA = rango[i][0];
    var celB = rango[i][1];
    if ((celA !== '' && celA !== null) || (celB !== '' && celB !== null)) {
      return filaHeader + 1 + i;
    }
  }
  return filaHeader;
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

  // FIX: usar ultimaFilaConDatos_ en vez de getLastRow()
  var ultRealReal = ultimaFilaConDatos_(hoja, filaHeader);
  var siguienteFila = Math.max(ultRealReal + 1, filaHeader + 1);

  // Para cada columna, ver si la celda destino YA tiene una fórmula
  // (porque el configurador pre-llenó hasta la 200). Si tiene fórmula,
  // NO la sobrescribimos con el valor "vacío" del usuario.
  for (var j = 0; j < headers.length; j++) {
    var key = String(headers[j]).trim();
    var v = datos[key];

    // Verificar si la celda destino ya tiene fórmula
    var celdaDestino = hoja.getRange(siguienteFila, j + 1);
    var formulaExistente = celdaDestino.getFormula();
    var tieneFormula = (formulaExistente && formulaExistente.charAt(0) === '=');

    if (v === undefined || v === null || v === '') {
      // No hay valor para esta columna
      if (tieneFormula) {
        // Dejar la fórmula intacta
        continue;
      } else {
        // Limpiar por si tiene basura
        celdaDestino.setValue('');
        continue;
      }
    }

    // Si la celda tiene fórmula pero el usuario manda un valor, advertimos
    // pero respetamos lo que mandó el usuario (sobrescribimos la fórmula)
    // EXCEPCIÓN: si la columna es "calculada" (SEMANA, TUBOS TOTALES, TIEMPO, etc.)
    // mantenemos la fórmula
    var columnasCalculadas = [
      'SEMANA', 'TUBOS TOTALES / TOTAL AIB', 'TIEMPO JORNADA',
      'TIEMPO EXCEDENTE', 'EFICIENCIA', 'PRODUCTIVIDAD (TUBOS/HORA)',
      'TIEMPO', 'PAQUETES/HORA'
    ];
    if (tieneFormula && columnasCalculadas.indexOf(key) !== -1) {
      // Mantener la fórmula, ignorar el valor enviado
      continue;
    }

    // Si parece fecha ISO, convertir a Date local
    if (typeof v === 'string') {
      var mFecha = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (mFecha) {
        v = new Date(parseInt(mFecha[1]), parseInt(mFecha[2]) - 1, parseInt(mFecha[3]));
      }
      // Fecha+hora (YYYY-MM-DDTHH:MM:SS)
      else if (/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.test(v)) {
        var mFH = v.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(:(\d{2}))?/);
        v = new Date(
          parseInt(mFH[1]),
          parseInt(mFH[2]) - 1,
          parseInt(mFH[3]),
          parseInt(mFH[4]),
          parseInt(mFH[5]),
          parseInt(mFH[7] || '0')
        );
      }
    }

    celdaDestino.setValue(v);
  }

  // N° autonumerado (columna A) si no se envió y no hay fórmula
  if (!datos['N°']) {
    var celdaN = hoja.getRange(siguienteFila, 1);
    if (!celdaN.getFormula()) {
      celdaN.setValue(siguienteFila - filaHeader);
    }
  }

  return siguienteFila;
}

function actualizarCelda_(claveHoja, fila, columna, valor) {
  var nombreHoja = HOJAS[claveHoja];
  if (!nombreHoja) throw new Error('Hoja inválida: ' + claveHoja);
  var hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nombreHoja);
  if (!hoja) throw new Error('Hoja no encontrada');

  // Si el valor parece fecha, convertir a Date local
  if (typeof valor === 'string') {
    var mFecha = valor.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (mFecha) {
      valor = new Date(parseInt(mFecha[1]), parseInt(mFecha[2]) - 1, parseInt(mFecha[3]));
    } else if (/^(\d{4})-(\d{2})-(\d{2})T/.test(valor)) {
      var d = new Date(valor);
      if (!isNaN(d)) valor = d;
    }
  }

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
