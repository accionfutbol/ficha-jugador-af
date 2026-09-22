/**
 * ACCIÓN FÚTBOL — Justificaciones -> Asistencia (escribe "J" automático)
 * -----------------------------------------------------------------------
 * VERSIÓN PREFIJADA "jf" para convivir en el MISMO proyecto que Lesionados.gs
 * sin chocar de nombres. Cuando un jugador envía el formulario de inasistencia,
 * busca su RUT en las planillas de asistencia (vía LISTA MAESTRA) y escribe "J"
 * en la columna de la fecha indicada. No pisa "OK" ni "L"; convierte "F"/vacío en "J".
 *
 * SETUP (una sola vez):
 *   1) Pega este código como archivo nuevo y Guarda.
 *   2) Ejecuta  jfMarcarHistoricoSalvoUltimos7   (marca lo viejo como omitido,
 *      deja pendientes solo los últimos 7 días). Autoriza permisos.
 *   3) Ejecuta  jfProcesarPendientes   (escribe la "J" del backlog reciente).
 *   4) Ejecuta  crearTriggerJustif   (activa la "J" automática en cada envío).
 */

var JF_JUSTIF_ID  = '1QAnU6YZzSW9CYN9xvo8IgX3790NTWLsc4YZw01isMSA';   // planilla de respuestas del formulario
var JF_MAESTRA_ID = '1H5TfnLFvYlW-NgpOcbJezNpPm5PeINF5i52HW50PRhY';   // LISTA ASISTENCIA MAESTRA
var JF_COL_FECHA  = 2;   // Columna C (0-based) — Fecha de inasistencia
var JF_COL_RUT    = 3;   // Columna D (0-based) — RUT

/* Se ejecuta en cada envío del formulario (y también sirve manual). */
function jfProcesarPendientes() {
  var sh = jfHoja_();
  var last = sh.getLastRow();
  if (last < 2) return;

  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var procCol = headers.indexOf('PROCESADO');          // 0-based
  if (procCol < 0) {
    procCol = sh.getLastColumn();
    sh.getRange(1, procCol + 1).setValue('PROCESADO');
    sh.getRange(1, procCol + 2).setValue('RESULTADO');
  }
  var notaCol = procCol + 1;

  var data = sh.getRange(1, 1, last, notaCol + 1).getValues();
  var idx = null, procesados = 0;

  for (var r = 1; r < data.length; r++) {
    if (String(data[r][procCol] || '').trim() !== '') continue;   // ya procesado
    if (procesados >= 1500) break;                                 // tope por ejecución

    var rut = jfNormRut_(data[r][JF_COL_RUT]);
    var key = jfFechaKey_(data[r][JF_COL_FECHA]);
    var nota;

    if (!rut) nota = 'sin RUT válido';
    else if (!key) nota = 'fecha inválida';
    else {
      if (!idx) idx = jfConstruirIndice_();
      var info = idx[rut];
      if (!info) nota = 'RUT no está en las categorías';
      else {
        var col = jfColumnaFecha_(info.headerCells, key);
        if (col < 0) nota = 'fecha sin columna (' + info.cat + ')';
        else {
          var cell = info.sheet.getRange(info.row, col + 1);
          var actual = String(cell.getValue() || '').trim().toUpperCase();
          if (actual === 'OK' || actual === 'L') nota = 'ya estaba ' + actual + ' (respetado)';
          else if (actual === 'J') nota = 'ya estaba J';
          else { cell.setValue('J'); nota = 'J escrita (' + info.cat + ')'; }
        }
      }
    }
    sh.getRange(r + 1, procCol + 1).setValue(new Date());
    sh.getRange(r + 1, notaCol + 1).setValue(nota);
    procesados++;
  }
}

/* Índice normRut -> ubicación en la planilla de su categoría */
function jfConstruirIndice_() {
  var lista = jfLeerMaestra_(), idx = {};
  lista.forEach(function (c) {
    var sh;
    try { sh = SpreadsheetApp.openById(c.id).getSheetByName('ASISTENCIA'); } catch (e) { return; }
    if (!sh) return;
    var data = sh.getDataRange().getValues();
    var hdr = jfFilaEncabezado_(data);
    if (hdr < 0) return;
    for (var r = hdr + 1; r < data.length; r++) {
      var rut = jfNormRut_(data[r][0]);
      if (!rut) continue;
      if (!idx[rut]) idx[rut] = { sheet: sh, headerCells: data[hdr], row: r + 1, cat: c.sede + ' · ' + c.categoria };
    }
  });
  return idx;
}

/* Marca TODAS las respuestas actuales como procesadas (sin actuar) */
function jfMarcarHistoricoComoProcesado() {
  var sh = jfHoja_();
  var last = sh.getLastRow();
  if (last < 2) return;
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var procCol = headers.indexOf('PROCESADO');
  if (procCol < 0) {
    procCol = sh.getLastColumn();
    sh.getRange(1, procCol + 1).setValue('PROCESADO');
    sh.getRange(1, procCol + 2).setValue('RESULTADO');
  }
  var rng = sh.getRange(2, procCol + 1, last - 1, 2);
  var vals = rng.getValues(), now = new Date();
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][0] || '').trim() === '') { vals[i][0] = now; vals[i][1] = 'histórico (omitido)'; }
  }
  rng.setValues(vals);
}

/* Omite lo más viejo que 7 días, deja PENDIENTES los últimos 7 días (backfill) */
function jfMarcarHistoricoSalvoUltimos7() {
  var sh = jfHoja_();
  var last = sh.getLastRow();
  if (last < 2) return;
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var procCol = headers.indexOf('PROCESADO');
  if (procCol < 0) {
    procCol = sh.getLastColumn();
    sh.getRange(1, procCol + 1).setValue('PROCESADO');
    sh.getRange(1, procCol + 2).setValue('RESULTADO');
  }
  var full = sh.getRange(1, 1, last, procCol + 2).getValues();
  var limite = new Date(); limite.setDate(limite.getDate() - 7);
  var limKey = Utilities.formatDate(limite, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var now = new Date(), salida = [];
  for (var r = 1; r < full.length; r++) {
    var fila = [full[r][procCol] || '', full[r][procCol + 1] || ''];
    if (String(full[r][procCol] || '').trim() === '') {
      var key = jfFechaKey_(full[r][JF_COL_FECHA]);
      if (!key || key < limKey) fila = [now, 'histórico (omitido)'];
    }
    salida.push(fila);
  }
  sh.getRange(2, procCol + 1, salida.length, 2).setValues(salida);
}

/* Crea el disparador que corre en cada envío del formulario */
function crearTriggerJustif() {
  var ss = SpreadsheetApp.openById(JF_JUSTIF_ID);
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'jfProcesarPendientes') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('jfProcesarPendientes').forSpreadsheet(ss).onFormSubmit().create();
}

/* Diagnóstico: pestañas y cuál usa */
function jfDiagnostico() {
  var ss = SpreadsheetApp.openById(JF_JUSTIF_ID);
  Logger.log('== Pestañas ==');
  ss.getSheets().forEach(function (s) {
    Logger.log('  "' + s.getName() + '"  ->  ' + s.getLastRow() + ' filas, ' + s.getLastColumn() + ' columnas');
  });
  var sh = jfHoja_();
  Logger.log('== jfHoja_ eligió: "' + sh.getName() + '" con ' + sh.getLastRow() + ' filas ==');
}

/* Diagnóstico 2: pendientes/histórico y ejemplos */
function jfDiagnostico2() {
  var sh = jfHoja_();
  var last = sh.getLastRow();
  var lastCol = sh.getLastColumn();
  var headers = sh.getRange(1, 1, 1, lastCol).getValues()[0];
  var procCol = headers.indexOf('PROCESADO');
  Logger.log('Hoja: "' + sh.getName() + '" | filas: ' + last + ' | procCol(0-based): ' + procCol);
  Logger.log('Encabezado C (fecha): "' + headers[JF_COL_FECHA] + '"  |  D (rut): "' + headers[JF_COL_RUT] + '"');
  var data = sh.getRange(1, 1, last, Math.max(lastCol, procCol + 2)).getValues();
  var limite = new Date(); limite.setDate(limite.getDate() - 7);
  var limKey = Utilities.formatDate(limite, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  Logger.log('Límite (hoy-7): ' + limKey);
  var proc = 0, hist = 0, pend = 0, sinfecha = 0;
  for (var r = 1; r < data.length; r++) {
    var yp = String(procCol >= 0 ? (data[r][procCol] || '') : '').trim();
    if (yp !== '') { proc++; continue; }
    var key = jfFechaKey_(data[r][JF_COL_FECHA]);
    if (!key) sinfecha++;
    else if (key < limKey) hist++;
    else pend++;
  }
  Logger.log('Ya procesadas: ' + proc + ' | Se marcarían histórico: ' + (hist + sinfecha) + ' | PENDIENTES últimos 7d: ' + pend);
  for (var r = Math.max(1, data.length - 3); r < data.length; r++)
    Logger.log('fila ' + (r+1) + ' | C="' + data[r][JF_COL_FECHA] + '" key=' + jfFechaKey_(data[r][JF_COL_FECHA]) + ' | D="' + data[r][JF_COL_RUT] + '"');
  try { var idx = jfConstruirIndice_(); Logger.log('Índice OK — RUTs indexados: ' + Object.keys(idx).length); }
  catch (e) { Logger.log('ERROR al construir índice: ' + e); }
}

/* ── Helpers (prefijados jf) ── */
function jfHoja_() {
  var ss = SpreadsheetApp.openById(JF_JUSTIF_ID);
  var sh = ss.getSheetByName('Justificación Inasistencia') || ss.getSheetByName('JUSTIFICACIÓN INASISTENCIA');
  if (sh) return sh;
  var all = ss.getSheets();
  for (var i = 0; i < all.length; i++) {
    if (all[i].getName().toUpperCase().indexOf('JUSTIFICAC') >= 0) return all[i];
  }
  throw new Error('No encontré la pestaña de Justificación Inasistencia');
}

function jfLeerMaestra_() {
  var sh = SpreadsheetApp.openById(JF_MAESTRA_ID).getSheets()[0];
  var data = sh.getDataRange().getValues(), out = [];
  for (var i = 1; i < data.length; i++) {
    var sede = String(data[i][0] || '').trim(), cat = String(data[i][1] || '').trim(), raw = String(data[i][2] || '').trim();
    if (!sede || !cat || !raw) continue;
    var m = raw.match(/[-\w]{25,}/);
    if (!m) continue;
    out.push({ sede: sede, categoria: cat, id: m[0] });
  }
  return out;
}

function jfFilaEncabezado_(data) {
  for (var i = 0; i < Math.min(data.length, 20); i++) {
    if (String(data[i][0]).trim().toUpperCase() === 'RUT') return i;
  }
  return -1;
}

function jfColumnaFecha_(headerRow, objetivo) {
  if (!objetivo) return -1;
  for (var c = 0; c < headerRow.length; c++) {
    if (jfFechaKey_(headerRow[c]) === objetivo) return c;
  }
  return -1;
}

function jfFechaKey_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var s = String(v || '').trim();
  var m = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})$/);
  if (m) { var d = ('0'+m[1]).slice(-2), mo = ('0'+m[2]).slice(-2), y = m[3]; if (y.length === 2) y = '20'+y; return y+'-'+mo+'-'+d; }
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return m[1]+'-'+('0'+m[2]).slice(-2)+'-'+('0'+m[3]).slice(-2);
  return '';
}

function jfNormRut_(r) { return String(r || '').replace(/[.\-\s]/g, '').toUpperCase().trim(); }
