/**
 * CONFIGURADOR DE GOOGLE SHEETS — Base Laguna
 *
 * Este script crea las 3 hojas necesarias para el sistema de reportes:
 *   - BASE_LAGUNA_CONSOLIDADO (recepción de tubulares)
 *   - BASE_LAGUNA_CONTROL DE ESTIBADO (estiba en racks)
 *   - BASE_LAGUNA_DESPACHO (actas de despacho)
 *
 * INSTRUCCIONES:
 * 1. Abre tu Google Sheet.
 * 2. Ve a Extensiones → Apps Script.
 * 3. Borra todo el contenido del editor.
 * 4. Pega este código completo.
 * 5. Guarda (Ctrl+S) y dale un nombre al proyecto (ej: "Configurador Laguna").
 * 6. En la barra superior, selecciona la función "configurarHojas".
 * 7. Pulsa "Ejecutar" (▶).
 * 8. Acepta los permisos que pida Google.
 * 9. Cuando termine, vuelve al Sheet y verás las 3 hojas creadas.
 *
 * Si necesitas regenerar la estructura, borra primero las hojas existentes
 * y vuelve a ejecutar configurarHojas().
 */

// ============================================================
// COLORES CORPORATIVOS
// ============================================================
var COLOR_AMARILLO = '#FFD100';
var COLOR_VERDE    = '#97D700';
var COLOR_NARANJA  = '#F18448';
var COLOR_GRIS     = '#4B4F54';
var COLOR_BLANCO   = '#FFFFFF';
var COLOR_TEXTO    = '#1A1A1A';

// ============================================================
// FUNCIÓN PRINCIPAL
// ============================================================
function configurarHojas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Crear las 3 hojas
  crearHojaConsolidado_(ss);
  crearHojaEstibado_(ss);
  crearHojaDespacho_(ss);

  // Opcional: borrar la hoja por defecto "Hoja 1" si está vacía
  try {
    var hojaDefault = ss.getSheetByName('Hoja 1') || ss.getSheetByName('Sheet1');
    if (hojaDefault && hojaDefault.getLastRow() === 0) {
      ss.deleteSheet(hojaDefault);
    }
  } catch (e) {}

  SpreadsheetApp.getUi().alert(
    '✓ Configuración completa',
    'Se crearon las 3 hojas correctamente:\n\n' +
    '• BASE_LAGUNA_CONSOLIDADO\n' +
    '• BASE_LAGUNA_CONTROL DE ESTIBADO\n' +
    '• BASE_LAGUNA_DESPACHO\n\n' +
    'Ya puedes comenzar a ingresar datos.',
    SpreadsheetApp.getUi().ButtonSet.OK);
}

// ============================================================
// HOJA 1: BASE_LAGUNA_CONSOLIDADO (recepción)
// ============================================================
function crearHojaConsolidado_(ss) {
  var nombre = 'BASE_LAGUNA_CONSOLIDADO';
  var hoja = ss.getSheetByName(nombre) || ss.insertSheet(nombre);
  hoja.clear();

  // Fila 1-3: Cabecera de resumen (similar al Excel original)
  hoja.getRange('A1:N1').merge()
    .setValue('BASE LAGUNA — CONSOLIDADO DE RECEPCIÓN DE TUBULARES')
    .setBackground(COLOR_GRIS).setFontColor(COLOR_BLANCO)
    .setFontSize(13).setFontWeight('bold')
    .setHorizontalAlignment('center');

  hoja.getRange('A2:N2').merge()
    .setValue('Hoja base para recepción · No modificar encabezados de la fila 4')
    .setBackground(COLOR_AMARILLO).setFontColor(COLOR_TEXTO)
    .setFontSize(10).setFontStyle('italic')
    .setHorizontalAlignment('center');

  // Fila 3: resumen automático
  hoja.getRange('A3').setValue('Total filas:').setFontWeight('bold');
  hoja.getRange('B3').setFormula('=COUNTA(A5:A) ');
  hoja.getRange('C3').setValue('Casing total:').setFontWeight('bold');
  hoja.getRange('D3').setFormula('=SUMIF(F5:F,"CASING",L5:L)');
  hoja.getRange('E3').setValue('AIB total:').setFontWeight('bold');
  hoja.getRange('F3').setFormula('=SUMIF(F5:F,"AIB",L5:L)');
  hoja.getRange('G3').setValue('Eficiencia prom:').setFontWeight('bold');
  hoja.getRange('H3').setFormula('=IFERROR(AVERAGE(N5:N),0)');
  hoja.getRange('A3:H3').setBackground('#F5F5F5');

  // Fila 4: Encabezados de las columnas (cabecera real)
  var encabezados = [
    'N°',                              // A
    'FECHA',                           // B
    'SEMANA',                          // C
    'PLACA TRACTO',                    // D
    'N° GUIA',                         // E
    'TIPO MATERIAL',                   // F
    'CODIGO SPRING',                   // G
    'MEDIDA CASING',                   // H
    'N° FOR',                          // I
    'PAQUETE POR CAMIÓN',              // J
    'TUBOS POR PAQUETE',               // K
    'TUBOS TOTALES / TOTAL AIB',       // L
    'HORA INICIO',                     // M
    'HORA FIN',                        // N
    'TIEMPO JORNADA',                  // O (minutos)
    'TIEMPO EXCEDENTE',                // P (minutos)
    'EFICIENCIA',                      // Q (0-1)
    'PRODUCTIVIDAD (TUBOS/HORA)',      // R
    'OPERADOR',                        // S
    'OBSERVACIONES'                    // T
  ];
  hoja.getRange(4, 1, 1, encabezados.length)
    .setValues([encabezados])
    .setBackground(COLOR_GRIS).setFontColor(COLOR_BLANCO)
    .setFontWeight('bold').setFontSize(10)
    .setHorizontalAlignment('center')
    .setBorder(true, true, true, true, true, true,
               '#000000', SpreadsheetApp.BorderStyle.SOLID);

  // Anchos de columna
  var anchos = [40, 90, 60, 90, 100, 90, 110, 200, 90, 90, 90, 110,
                75, 75, 90, 90, 75, 110, 130, 200];
  for (var i = 0; i < anchos.length; i++) {
    hoja.setColumnWidth(i + 1, anchos[i]);
  }

  // Formato de columnas
  hoja.getRange('B5:B').setNumberFormat('dd/MM/yyyy');         // FECHA
  hoja.getRange('M5:N').setNumberFormat('HH:mm');              // HORAS
  hoja.getRange('O5:P').setNumberFormat('0.0');                // TIEMPOS min
  hoja.getRange('Q5:Q').setNumberFormat('0.00%');              // EFICIENCIA
  hoja.getRange('R5:R').setNumberFormat('0.00');               // PRODUCTIVIDAD

  // Fórmulas autocalculadas para las primeras 200 filas
  // SEMANA = WEEKNUM(FECHA)
  hoja.getRange('C5:C200').setFormula('=IF(B5="","",WEEKNUM(B5,2))');
  // TUBOS TOTALES = paquetes * tubos_por_paquete (solo CASING; AIB se ingresa manual)
  hoja.getRange('L5:L200').setFormula(
    '=IF(F5="CASING",IFERROR(J5*K5,0),IF(F5="AIB",J5,0))'
  );
  // TIEMPO JORNADA = (hora_fin - hora_inicio) en minutos
  hoja.getRange('O5:O200').setFormula(
    '=IF(OR(M5="",N5=""),"",(N5-M5)*24*60)'
  );
  // TIEMPO EXCEDENTE = MAX(0, JORNADA - estandar) | estandar: 23.3 casing, 40 AIB
  hoja.getRange('P5:P200').setFormula(
    '=IF(O5="","",IF(F5="CASING",MAX(0,O5-23.3),IF(F5="AIB",MAX(0,O5-40),0)))'
  );
  // EFICIENCIA = estandar / jornada (cap a 1)
  hoja.getRange('Q5:Q200').setFormula(
    '=IF(O5="","",IF(F5="CASING",MIN(1,23.3/O5),IF(F5="AIB",MIN(1,40/O5),"")))'
  );
  // PRODUCTIVIDAD = TUBOS / (JORNADA/60)
  hoja.getRange('R5:R200').setFormula(
    '=IF(OR(L5="",O5=""),"",IFERROR(L5/(O5/60),0))'
  );

  // Validaciones de datos
  var rangoTipo = hoja.getRange('F5:F');
  rangoTipo.setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(['CASING', 'AIB'], true)
      .setAllowInvalid(false).build()
  );

  // Filas alternadas para mejor lectura (banding)
  try {
    hoja.getRange('A4:T200').applyRowBanding(
      SpreadsheetApp.BandingTheme.LIGHT_GREY, true, false
    );
  } catch (e) {}

  // Congelar primeras 4 filas (cabecera)
  hoja.setFrozenRows(4);

  // Comentario de ayuda en celda A4
  hoja.getRange('A4').setNote(
    'Esta fila contiene los encabezados (cabecera real).\n' +
    'No la borres ni la modifiques.\n' +
    'Ingresa los datos a partir de la fila 5.'
  );

  // Texto de ayuda en A5
  hoja.getRange('A5').setNote(
    'Empieza aquí. Las columnas SEMANA, TUBOS TOTALES, TIEMPO JORNADA,\n' +
    'TIEMPO EXCEDENTE, EFICIENCIA y PRODUCTIVIDAD se calculan automáticamente.'
  );
}

// ============================================================
// HOJA 2: BASE_LAGUNA_CONTROL DE ESTIBADO
// ============================================================
function crearHojaEstibado_(ss) {
  var nombre = 'BASE_LAGUNA_CONTROL DE ESTIBADO';
  var hoja = ss.getSheetByName(nombre) || ss.insertSheet(nombre);
  hoja.clear();

  // Filas 1-3: cabecera de resumen
  hoja.getRange('A1:L1').merge()
    .setValue('BASE LAGUNA — CONTROL DE ESTIBADO EN RACKS')
    .setBackground(COLOR_GRIS).setFontColor(COLOR_BLANCO)
    .setFontSize(13).setFontWeight('bold')
    .setHorizontalAlignment('center');

  hoja.getRange('A2:L2').merge()
    .setValue('Hoja base para estiba · No modificar encabezados de la fila 6')
    .setBackground(COLOR_VERDE).setFontColor(COLOR_TEXTO)
    .setFontSize(10).setFontStyle('italic')
    .setHorizontalAlignment('center');

  // Resumen automático
  hoja.getRange('A3').setValue('Total ops:').setFontWeight('bold');
  hoja.getRange('B3').setFormula('=COUNTA(A7:A)');
  hoja.getRange('C3').setValue('Paquetes:').setFontWeight('bold');
  hoja.getRange('D3').setFormula('=SUM(I7:I)');
  hoja.getRange('E3').setValue('Tubos:').setFontWeight('bold');
  hoja.getRange('F3').setFormula('=SUM(J7:J)');
  hoja.getRange('G3').setValue('Pkt/h prom:').setFontWeight('bold');
  hoja.getRange('H3').setFormula('=IFERROR(AVERAGE(L7:L),0)');
  hoja.getRange('A3:H3').setBackground('#F5F5F5');

  // Fila 4 vacía
  // Fila 5 vacía
  // Fila 6: encabezados
  var encabezados = [
    'N°',                       // A
    'FECHA',                    // B
    'PASILLO',                  // C
    'RACK',                     // D
    'CODIGO',                   // E
    'DESCRIPCION',              // F
    'HORA INICIO',              // G
    'HORA FIN',                 // H
    'PAQUETES ESTIBADOS',       // I
    'TOTAL DE TUBERIAS',        // J
    'TIEMPO',                   // K (horas)
    'PAQUETES/HORA',            // L
    'MONTACARGA',               // M
    'OPERADOR',                 // N
    'OBSERVACIONES'             // O
  ];
  hoja.getRange(6, 1, 1, encabezados.length)
    .setValues([encabezados])
    .setBackground(COLOR_GRIS).setFontColor(COLOR_BLANCO)
    .setFontWeight('bold').setFontSize(10)
    .setHorizontalAlignment('center');

  // Anchos
  var anchos = [40, 90, 70, 60, 100, 240, 75, 75, 120, 110, 70, 110, 100, 130, 200];
  for (var i = 0; i < anchos.length; i++) {
    hoja.setColumnWidth(i + 1, anchos[i]);
  }

  // Formato
  hoja.getRange('B7:B').setNumberFormat('dd/MM/yyyy');
  hoja.getRange('G7:H').setNumberFormat('HH:mm');
  hoja.getRange('I7:J').setNumberFormat('0');
  hoja.getRange('K7:K').setNumberFormat('0.00');
  hoja.getRange('L7:L').setNumberFormat('0.00');

  // Fórmulas
  // TUBOS POR PAQUETE: lo deducimos de paquetes_estibados (usuario ingresa total directo)
  // TIEMPO en horas = (hora_fin - hora_inicio) * 24
  hoja.getRange('K7:K200').setFormula(
    '=IF(OR(G7="",H7=""),"",(H7-G7)*24)'
  );
  // PAQUETES/HORA = paquetes / tiempo
  hoja.getRange('L7:L200').setFormula(
    '=IF(OR(I7="",K7="",K7=0),"",IFERROR(I7/K7,0))'
  );

  // Validaciones
  hoja.getRange('M7:M').setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(['ZOMLION', 'HANGCHA'], true)
      .setAllowInvalid(false).build()
  );
  hoja.getRange('C7:C').setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(['1.1', '1.2', '1.3'], true)
      .setAllowInvalid(false).build()
  );

  // Banding y congelado
  try {
    hoja.getRange('A6:O200').applyRowBanding(
      SpreadsheetApp.BandingTheme.LIGHT_GREEN, true, false
    );
  } catch (e) {}
  hoja.setFrozenRows(6);

  hoja.getRange('A6').setNote(
    'Esta fila contiene los encabezados (cabecera real).\n' +
    'Ingresa los datos a partir de la fila 7.'
  );
  hoja.getRange('A7').setNote(
    'TIEMPO y PAQUETES/HORA se calculan automáticamente al ingresar las horas.'
  );
}

// ============================================================
// HOJA 3: BASE_LAGUNA_DESPACHO
// ============================================================
function crearHojaDespacho_(ss) {
  var nombre = 'BASE_LAGUNA_DESPACHO';
  var hoja = ss.getSheetByName(nombre) || ss.insertSheet(nombre);
  hoja.clear();

  hoja.getRange('A1:K1').merge()
    .setValue('BASE LAGUNA — DESPACHO DE TUBULARES')
    .setBackground(COLOR_GRIS).setFontColor(COLOR_BLANCO)
    .setFontSize(13).setFontWeight('bold')
    .setHorizontalAlignment('center');

  hoja.getRange('A2:K2').merge()
    .setValue('Hoja base para despacho · No modificar encabezados de la fila 6')
    .setBackground(COLOR_NARANJA).setFontColor(COLOR_TEXTO)
    .setFontSize(10).setFontStyle('italic')
    .setHorizontalAlignment('center');

  // Resumen automático
  hoja.getRange('A3').setValue('Total ops:').setFontWeight('bold');
  hoja.getRange('B3').setFormula('=COUNTA(A7:A)');
  hoja.getRange('C3').setValue('Actas:').setFontWeight('bold');
  hoja.getRange('D3').setFormula('=IFERROR(SUMPRODUCT(1/COUNTIF(D7:D,D7:D&"")),0)');
  hoja.getRange('E3').setValue('Tubos despachados:').setFontWeight('bold');
  hoja.getRange('F3').setFormula('=SUM(I7:I)');
  hoja.getRange('G3').setValue('Tiempo total (min):').setFontWeight('bold');
  hoja.getRange('H3').setFormula('=IFERROR(SUM(J7:J)*60,0)');
  hoja.getRange('A3:H3').setBackground('#F5F5F5');

  // Encabezados
  var encabezados = [
    'N°',                  // A
    'FECHA',               // B
    'DESTINO',             // C
    'N° DE ACTA',          // D
    'CODIGO',              // E
    'DESCRIPCION',         // F
    'HORA INICIO',         // G
    'HORA FIN',            // H
    'TOTAL DE TUBERIAS',   // I
    'TIEMPO',              // J (horas)
    'MONTACARGA',          // K
    'OBSERVACIONES'        // L
  ];
  hoja.getRange(6, 1, 1, encabezados.length)
    .setValues([encabezados])
    .setBackground(COLOR_GRIS).setFontColor(COLOR_BLANCO)
    .setFontWeight('bold').setFontSize(10)
    .setHorizontalAlignment('center');

  var anchos = [40, 90, 130, 130, 100, 260, 75, 75, 110, 70, 100, 200];
  for (var i = 0; i < anchos.length; i++) {
    hoja.setColumnWidth(i + 1, anchos[i]);
  }

  hoja.getRange('B7:B').setNumberFormat('dd/MM/yyyy');
  hoja.getRange('G7:H').setNumberFormat('HH:mm');
  hoja.getRange('I7:I').setNumberFormat('0');
  hoja.getRange('J7:J').setNumberFormat('0.00');

  // Fórmulas: TIEMPO = (hora_fin - hora_inicio)
  hoja.getRange('J7:J200').setFormula(
    '=IF(OR(G7="",H7=""),"",(H7-G7)*24)'
  );

  // Validación montacargas
  hoja.getRange('K7:K').setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(['ZOMLION', 'HANGCHA'], true)
      .setAllowInvalid(false).build()
  );

  try {
    hoja.getRange('A6:L200').applyRowBanding(
      SpreadsheetApp.BandingTheme.LIGHT_ORANGE, true, false
    );
  } catch (e) {}
  hoja.setFrozenRows(6);

  hoja.getRange('A6').setNote(
    'Encabezados (cabecera). Ingresa los datos a partir de la fila 7.'
  );
  hoja.getRange('A7').setNote(
    'TIEMPO se calcula automáticamente. Formato de acta sugerido: DDMMAAAA-NNN'
  );
}

// ============================================================
// MENÚ PERSONALIZADO (se ejecuta al abrir el Sheet)
// ============================================================
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🛠 Reportes Laguna')
    .addItem('Configurar hojas (primera vez)', 'configurarHojas')
    .addItem('Limpiar y reconfigurar', 'limpiarYReconfigurar')
    .addSeparator()
    .addItem('Ver IDs del Sheet', 'mostrarIDs')
    .addToUi();
}

function limpiarYReconfigurar() {
  var ui = SpreadsheetApp.getUi();
  var resp = ui.alert(
    '¿Reconfigurar las hojas?',
    'Esto borrará todos los datos existentes en las 3 hojas\n' +
    'y volverá a crearlas en blanco. ¿Continuar?',
    ui.ButtonSet.YES_NO
  );
  if (resp === ui.Button.YES) {
    configurarHojas();
  }
}

function mostrarIDs() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  SpreadsheetApp.getUi().alert(
    'IDs del Sheet',
    'Spreadsheet ID:\n' + ss.getId() + '\n\n' +
    'URL:\n' + ss.getUrl(),
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}
