/**
 * ACCIÓN FÚTBOL — Lesionados -> Asistencia (escribe "L" automático)
 * -----------------------------------------------------------------------
 * Cuando un jugador envía el formulario de LESIONADOS, busca su RUT en las
 * planillas de asistencia (vía LISTA MAESTRA) y escribe "L" en la columna de
 * la fecha de la lesión. Escribe "L" si la celda está vacía o tiene F o J;
 * respeta "OK".
 *
 * SETUP (proyecto Apps Script nuevo):
 *   1) Pega y Guarda.
 *   2) Ejecuta  marcarHistoricoSalvoUltimos7   (omite lo viejo, deja últimos 7 días).
 *   3) Ejecuta  procesarPendientes             (escribe la L de los últimos 7 días).
 *   4) Ejecuta  crearTriggerLesionados         (automático en cada envío).
 */

var LESION_ID = '1QAnU6YZzSW9CYN9xvo8IgX3790NTWLsc4YZw01isMSA';   // misma planilla de respuestas
var MAESTRA_ID = '1H5TfnLFvYlW-NgpOcbJezNpPm5PeINF5i52HW50PRhY';  // LISTA ASISTENCIA MAESTRA
var COL_FECHA = 8;   // Columna I (0-based) — Fecha de la lesión
var COL_RUT   = 2;   // Columna C (0-based) — RUT

function procesarPendientes() {
  var sh = hojaLesionados_();
  var last = sh.getLastRow();
  if (last < 2) return;

  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var procCol = headers.indexOf('PROCESADO L');
  if (procCol < 0) {
    procCol = sh.getLastColumn();
    sh.getRange(1, procCol + 1).setValue('PROCESADO L');
    sh.getRange(1, procCol + 2).setValue('RESULTADO L');
  }
  var notaCol = procCol + 1;

  var data = sh.getRange(1, 1, last, notaCol + 1).getValues();
  var idx = null, procesados = 0;

  for (var r = 1; r < data.length; r++) {
    if (String(data[r][procCol] || '').trim() !== '') continue;
    if (procesados >= 1500) break;

    var rut = normRut_(data[r][COL_RUT]);
    var key = fechaKey_(data[r][COL_FECHA]);
    var nota;

    if (!rut) nota = 'sin RUT válido';
    else if (!key) nota = 'fecha inválida';
    else {
      if (!idx) idx = construirIndice_();
      var info = idx[rut];
      if (!info) nota = 'RUT no está en las categorías';
      else {
        // Marca "L" desde la fecha de lesión HACIA ADELANTE (todas las fechas >= lesión),
        // hasta encontrar un "OK" (volvió a entrenar) -> ahí se detiene. Respeta OK, no pisa.
        var hc = info.headerCells;
        var rowVals = info.sheet.getRange(info.row, 1, 1, hc.length).getValues()[0];
        var cols = [];
        for (var c = 0; c < hc.length; c++) {
          var kc = fechaKey_(hc[c]);
          if (kc && kc >= key) cols.push({ c: c, k: kc });
        }
        cols.sort(function (a, b) { return a.k < b.k ? -1 : (a.k > b.k ? 1 : 0); });
        var escritas = 0;
        for (var z = 0; z < cols.length; z++) {
          var cur = String(rowVals[cols[z].c] || '').trim().toUpperCase();
          if (cur === 'OK') break;                 // volvió a entrenar -> no marcar más adelante
          if (cur !== 'L') { rowVals[cols[z].c] = 'L'; escritas++; }
        }
        if (!cols.length) nota = 'sin columnas de fecha >= lesión (' + info.cat + ')';
        else {
          if (escritas > 0) info.sheet.getRange(info.row, 1, 1, hc.length).setValues([rowVals]);
          nota = 'L escrita en ' + escritas + ' fecha(s) desde ' + key + ' (' + info.cat + ')';
        }
      }
    }
    sh.getRange(r + 1, procCol + 1).setValue(new Date());
    sh.getRange(r + 1, notaCol + 1).setValue(nota);
    procesados++;
  }
}

/* BACKFILL (ejecutar A MANO una vez): aplica el relleno de "L" hacia adelante a TODAS
   las lesiones ya registradas (aunque estén PROCESADO). Se detiene en el primer OK. */
function rellenarLesionesHaciaAdelante() {
  var sh = hojaLesionados_();
  var last = sh.getLastRow();
  if (last < 2) { Logger.log('Sin filas'); return; }
  var data = sh.getRange(1, 1, last, Math.max(COL_FECHA, COL_RUT) + 1).getValues();
  var idx = construirIndice_();
  var total = 0, filas = 0;
  for (var r = 1; r < data.length; r++) {
    var rut = normRut_(data[r][COL_RUT]);
    var key = fechaKey_(data[r][COL_FECHA]);
    if (!rut || !key) continue;
    var info = idx[rut];
    if (!info) continue;
    var hc = info.headerCells;
    var rowVals = info.sheet.getRange(info.row, 1, 1, hc.length).getValues()[0];
    var cols = [];
    for (var c = 0; c < hc.length; c++) { var kc = fechaKey_(hc[c]); if (kc && kc >= key) cols.push({ c: c, k: kc }); }
    cols.sort(function (a, b) { return a.k < b.k ? -1 : (a.k > b.k ? 1 : 0); });
    var esc = 0;
    for (var z = 0; z < cols.length; z++) {
      var cur = String(rowVals[cols[z].c] || '').trim().toUpperCase();
      if (cur === 'OK') break;
      if (cur !== 'L') { rowVals[cols[z].c] = 'L'; esc++; }
    }
    if (esc > 0) { info.sheet.getRange(info.row, 1, 1, hc.length).setValues([rowVals]); total += esc; filas++; }
  }
  Logger.log('Backfill listo: ' + filas + ' lesiones rellenadas, ' + total + ' celdas marcadas con L.');
}

function construirIndice_() {
  var lista = leerMaestra_(), idx = {};
  lista.forEach(function (c) {
    var sh;
    try { sh = SpreadsheetApp.openById(c.id).getSheetByName('ASISTENCIA'); } catch (e) { return; }
    if (!sh) return;
    var data = sh.getDataRange().getValues();
    var hdr = filaEncabezado_(data);
    if (hdr < 0) return;
    for (var r = hdr + 1; r < data.length; r++) {
      var rut = normRut_(data[r][0]);
      if (!rut) continue;
      if (!idx[rut]) idx[rut] = { sheet: sh, headerCells: data[hdr], row: r + 1, cat: c.sede + ' · ' + c.categoria };
    }
  });
  return idx;
}

function marcarHistoricoSalvoUltimos7() {
  var sh = hojaLesionados_();
  var last = sh.getLastRow();
  if (last < 2) return;
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var procCol = headers.indexOf('PROCESADO L');
  if (procCol < 0) {
    procCol = sh.getLastColumn();
    sh.getRange(1, procCol + 1).setValue('PROCESADO L');
    sh.getRange(1, procCol + 2).setValue('RESULTADO L');
  }
  var full = sh.getRange(1, 1, last, procCol + 2).getValues();
  var limite = new Date(); limite.setDate(limite.getDate() - 7);
  var limKey = Utilities.formatDate(limite, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var now = new Date(), salida = [];
  for (var r = 1; r < full.length; r++) {
    var fila = [full[r][procCol] || '', full[r][procCol + 1] || ''];
    if (String(full[r][procCol] || '').trim() === '') {
      var key = fechaKey_(full[r][COL_FECHA]);
      if (!key || key < limKey) fila = [now, 'histórico (omitido)'];
    }
    salida.push(fila);
  }
  sh.getRange(2, procCol + 1, salida.length, 2).setValues(salida);
}

function crearTriggerLesionados() {
  var ss = SpreadsheetApp.openById(LESION_ID);
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'procesarPendientes') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('procesarPendientes').forSpreadsheet(ss).onFormSubmit().create();
}

function diagnostico() {
  var ss = SpreadsheetApp.openById(LESION_ID);
  ss.getSheets().forEach(function (s) { Logger.log('"' + s.getName() + '" -> ' + s.getLastRow() + ' filas'); });
  var sh = hojaLesionados_();
  Logger.log('== Elegida: "' + sh.getName() + '" (' + sh.getLastRow() + ' filas) ==');
  var d = sh.getRange(1, 1, Math.min(4, sh.getLastRow()), Math.max(COL_FECHA + 1, COL_RUT + 1)).getValues();
  for (var r = 1; r < d.length; r++)
    Logger.log('fila ' + (r+1) + ' | RUT(C)="' + d[r][COL_RUT] + '" | Fecha(I)="' + d[r][COL_FECHA] + '" key=' + fechaKey_(d[r][COL_FECHA]));
}

/* ── Helpers ── */
function hojaLesionados_() {
  var ss = SpreadsheetApp.openById(LESION_ID);
  var sh = ss.getSheetByName('LESIONADOS');
  if (sh) return sh;
  var all = ss.getSheets();
  for (var i = 0; i < all.length; i++) {
    if (all[i].getName().toUpperCase().indexOf('LESIONAD') >= 0) return all[i];
  }
  throw new Error('No encontré la pestaña LESIONADOS');
}

function leerMaestra_() {
  var sh = SpreadsheetApp.openById(MAESTRA_ID).getSheets()[0];
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

function filaEncabezado_(data) {
  for (var i = 0; i < Math.min(data.length, 20); i++) {
    if (String(data[i][0]).trim().toUpperCase() === 'RUT') return i;
  }
  return -1;
}

function columnaFecha_(headerRow, objetivo) {
  if (!objetivo) return -1;
  for (var c = 0; c < headerRow.length; c++) {
    if (fechaKey_(headerRow[c]) === objetivo) return c;
  }
  return -1;
}

function fechaKey_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var s = String(v || '').trim();
  var m = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})$/);
  if (m) { var d = ('0'+m[1]).slice(-2), mo = ('0'+m[2]).slice(-2), y = m[3]; if (y.length === 2) y = '20'+y; return y+'-'+mo+'-'+d; }
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return m[1]+'-'+('0'+m[2]).slice(-2)+'-'+('0'+m[3]).slice(-2);
  return '';
}

function normRut_(r) { return String(r || '').replace(/[.\-\s]/g, '').toUpperCase().trim(); }
