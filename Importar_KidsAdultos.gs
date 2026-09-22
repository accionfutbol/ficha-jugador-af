/**
 * ACCIÓN FÚTBOL — Importar KIDS y ADULTOS
 * De la pestaña "Base de Datos Entrenador" a "Base de Datos Apoderados".
 * Copia solo jugadores KIDS y ADULTOS (no toca PRO), mapeando por NOMBRE de columna
 * (no importa el orden), y sin duplicar (salta los RUT que ya existan en el destino).
 *
 * USO:
 *   1) Pega este código en un proyecto Apps Script (o en Extensiones > Apps Script de la planilla).
 *   2) Ejecuta primero  diagImport   para ver qué haría (no escribe nada).
 *   3) Si el conteo se ve bien, ejecuta  importarKidsAdultos   para escribir.
 */

var IMP_SS_ID = '1WhJ-XNDRC7HFy9psKuB4iM9xzY-5aWp8RduB3Jhw4jw';

function _impHojas_() {
  var ss = SpreadsheetApp.openById(IMP_SS_ID);
  return { src: _impHoja_(ss, 'ENTRENADOR'), dst: _impHoja_(ss, 'APODERADO') };
}
function _impHoja_(ss, contiene) {
  var all = ss.getSheets();
  for (var i = 0; i < all.length; i++) {
    if (_normHdr_(all[i].getName()).indexOf(contiene) >= 0) return all[i];
  }
  return null;
}

/* Diagnóstico: no escribe. Muestra mapeo de columnas y cuántos se importarían. */
function diagImport() {
  var h = _impHojas_();
  if (!h.src || !h.dst) { Logger.log('No encontré las pestañas (ENTRENADOR / APODERADO).'); return; }
  var plan = _impPlan_(h.src, h.dst);
  if (plan.error) { Logger.log('ERROR: ' + plan.error); return; }
  Logger.log('Origen: "' + h.src.getName() + '"  ->  Destino: "' + h.dst.getName() + '"');
  Logger.log('Columnas mapeadas (origen -> destino): ' + plan.mapCount);
  if (plan.sinMapear.length) Logger.log('Columnas del origen SIN equivalente en destino (quedan afuera): ' + plan.sinMapear.join(' | '));
  Logger.log('A IMPORTAR (KIDS+ADULTOS nuevos): ' + plan.nuevos.length);
  Logger.log('Ya existían en destino (se saltan): ' + plan.saltados);
  Logger.log('-- Ejemplos a importar --');
  for (var i = 0; i < Math.min(plan.ejemplos.length, 8); i++) Logger.log('  ' + plan.ejemplos[i]);
}

/* Ejecuta la importación (escribe en el destino). */
function importarKidsAdultos() {
  var h = _impHojas_();
  if (!h.src || !h.dst) { Logger.log('No encontré las pestañas (ENTRENADOR / APODERADO).'); return; }
  var plan = _impPlan_(h.src, h.dst);
  if (plan.error) { Logger.log('ERROR: ' + plan.error); return; }
  if (!plan.nuevos.length) { Logger.log('Nada nuevo que importar.'); return; }
  var start = h.dst.getLastRow() + 1;
  h.dst.getRange(start, 1, plan.nuevos.length, plan.dstWidth).setValues(plan.nuevos);
  Logger.log('LISTO. Importados: ' + plan.nuevos.length + ' | Saltados (ya existían): ' + plan.saltados);
  Logger.log('IMPORTANTE: revisa el CORREO DEL APODERADO de estas filas; sin ese correo el portal no los muestra.');
}

/* Construye el plan de importación (compartido por diag e import). */
function _impPlan_(shSrc, shDst) {
  var src = shSrc.getDataRange().getValues();
  var dst = shDst.getDataRange().getValues();
  var hsr = _findHdr_(src), hdr = _findHdr_(dst);
  if (hsr < 0 || hdr < 0) return { error: 'No encontré la fila de encabezado (RUT) en una de las pestañas.' };

  var srcH = src[hsr].map(_normHdr_);
  var dstH = dst[hdr].map(_normHdr_);
  var map = {}, sinMapear = [];
  for (var i = 0; i < srcH.length; i++) {
    if (!srcH[i]) continue;
    var di = dstH.indexOf(srcH[i]);
    if (di >= 0) map[i] = di; else sinMapear.push(String(src[hsr][i]));
  }
  var srcRut = srcH.indexOf('RUT'), srcTipo = srcH.indexOf('TIPO');
  var dstRut = dstH.indexOf('RUT'), dstWidth = dst[hdr].length;
  if (srcRut < 0 || dstRut < 0) return { error: 'No encontré la columna RUT.' };

  var existe = {};
  for (var r = hdr + 1; r < dst.length; r++) { var k = _normRut_(dst[r][dstRut]); if (k) existe[k] = true; }

  var nuevos = [], ejemplos = [], saltados = 0;
  for (var r = hsr + 1; r < src.length; r++) {
    var rut = _normRut_(src[r][srcRut]);
    var nombre = String(src[r][1] || '').trim();
    if (!rut || !nombre) continue;
    var tipo = String(srcTipo >= 0 ? src[r][srcTipo] : '').toUpperCase();
    var esKid = tipo.indexOf('KID') >= 0;
    var esAdulto = tipo.indexOf('ADULT') >= 0 || tipo.indexOf('SENIOR') >= 0;
    var esPro = tipo.indexOf('PRO') >= 0;
    if (!esKid && !esAdulto && !esPro) continue;    // KIDS, ADULTOS y PRO
    if (existe[rut]) { saltados++; continue; }
    existe[rut] = true;
    var fila = [];
    for (var c = 0; c < dstWidth; c++) fila.push('');
    for (var sc in map) fila[map[sc]] = src[r][sc];
    nuevos.push(fila);
    if (ejemplos.length < 8) ejemplos.push(nombre + ' (' + tipo + ')');
  }
  return { nuevos: nuevos, saltados: saltados, dstWidth: dstWidth, mapCount: Object.keys(map).length, sinMapear: sinMapear, ejemplos: ejemplos };
}

/* ─────────── COPIAR TORNEOS (columna AT) ─────────── */
/* Origen: "DATA FUTBOL A.F. 2026" (RUT col A, TORNEOS col AT).
   Destino: Base de Datos Apoderados, columna AT, emparejando por RUT. */
var TORNEOS_SRC_ID = '196dXsAPdaJIQEnBV5ieI51kaGfWzhCxHCZJULN6np7M';
var COL_AT = 45; // columna AT (0-based)

function _mapaTorneos_() {
  var all = SpreadsheetApp.openById(TORNEOS_SRC_ID).getSheets();
  var shSrc = null, hsr = -1, nombres = [];
  for (var s = 0; s < all.length; s++) {
    nombres.push(all[s].getName());
    var d = all[s].getDataRange().getValues();
    for (var r = 0; r < Math.min(d.length, 15); r++) {
      if (String(d[r][0]).trim().toUpperCase() === 'RUT') { shSrc = all[s]; hsr = r; break; }
    }
    if (shSrc) break;
  }
  if (!shSrc) return { mapa: {}, n: 0, sheet: '(ninguna pestaña con RUT en col A). Pestañas: ' + nombres.join(', ') };
  var src = shSrc.getDataRange().getValues();
  var mapa = {}, n = 0;
  for (var r = hsr + 1; r < src.length; r++) {
    var rut = _normRut_(src[r][0]);
    if (!rut) continue;
    var tor = String(src[r][COL_AT] || '').trim();
    if (tor) { mapa[rut] = tor; n++; }
  }
  return { mapa: mapa, n: n, sheet: shSrc.getName() };
}

/* Previsualiza (no escribe). */
function diagTorneos() {
  var m = _mapaTorneos_();
  var ss = SpreadsheetApp.openById(IMP_SS_ID);
  var shDst = _impHoja_(ss, 'APODERADO');
  if (!shDst) { Logger.log('No encontré la pestaña Apoderados'); return; }
  var dst = shDst.getDataRange().getValues();
  var hdr = _findHdr_(dst);
  if (hdr < 0) { Logger.log('No encontré encabezado (RUT) en Apoderados'); return; }
  var esc = 0, sinMatch = 0, ej = [];
  for (var i = hdr + 1; i < dst.length; i++) {
    var rut = _normRut_(dst[i][0]);
    if (!rut) continue;
    if (m.mapa[rut] !== undefined) { esc++; if (ej.length < 8) ej.push(String(dst[i][1]) + ' -> ' + m.mapa[rut]); }
    else sinMatch++;
  }
  Logger.log('Origen "' + m.sheet + '": ' + m.n + ' RUTs con torneo.');
  Logger.log('Se ESCRIBIRÍAN torneos en Apoderados: ' + esc + ' | jugadores de Apoderados SIN torneo en origen: ' + sinMatch);
  Logger.log('-- Ejemplos --'); for (var k = 0; k < ej.length; k++) Logger.log('  ' + ej[k]);
}

/* Escribe los torneos en la columna AT de Apoderados. */
function copiarTorneos() {
  var m = _mapaTorneos_();
  var ss = SpreadsheetApp.openById(IMP_SS_ID);
  var shDst = _impHoja_(ss, 'APODERADO');
  if (!shDst) { Logger.log('No encontré la pestaña Apoderados'); return; }
  var dst = shDst.getDataRange().getValues();
  var hdr = _findHdr_(dst);
  if (hdr < 0) { Logger.log('No encontré encabezado (RUT) en Apoderados'); return; }
  var primera = hdr + 2, alto = shDst.getLastRow() - primera + 1;
  if (alto < 1) { Logger.log('Sin jugadores'); return; }
  var rng = shDst.getRange(primera, COL_AT + 1, alto, 1);
  var vals = rng.getValues(), esc = 0;
  for (var i = 0; i < alto; i++) {
    var rut = _normRut_(dst[primera - 1 + i][0]);
    if (rut && m.mapa[rut] !== undefined) { vals[i][0] = m.mapa[rut]; esc++; }
  }
  rng.setValues(vals);
  Logger.log('Torneos escritos en columna AT: ' + esc);
}

/* ─────────── SINCRONIZAR TODO (automático) ─────────── */
/* Copia toda la información de "DATA FUTBOL A.F. 2026" a la Base de Datos App
   (pestaña Apoderados), emparejando por RUT y por NOMBRE de columna.
   - Actualiza los RUT que ya existen (solo sobre-escribe cuando el origen trae valor).
   - Agrega los RUT nuevos.
   - Solo toca columnas que existen en AMBAS planillas (mismo encabezado). */

/* Ubica en DATA FUTBOL la pestaña de origen: primero la llamada "BASE";
   si no está, la primera pestaña con RUT en la columna A. */
function _fuenteData_() {
  var ss = SpreadsheetApp.openById(TORNEOS_SRC_ID);
  var all = ss.getSheets();

  // 1) Preferir la pestaña "BASE".
  for (var s = 0; s < all.length; s++) {
    if (all[s].getName().trim().toUpperCase() === 'BASE') {
      var db = all[s].getDataRange().getValues();
      var hb = -1;
      for (var r = 0; r < Math.min(db.length, 20); r++) {
        if (String(db[r][0]).trim().toUpperCase() === 'RUT') { hb = r; break; }
      }
      if (hb >= 0) return { values: db, hdrRow: hb, nombre: all[s].getName() };
    }
  }

  // 2) Respaldo: primera pestaña con RUT en la columna A.
  for (var s = 0; s < all.length; s++) {
    var d = all[s].getDataRange().getValues();
    for (var r = 0; r < Math.min(d.length, 15); r++) {
      if (String(d[r][0]).trim().toUpperCase() === 'RUT') {
        return { values: d, hdrRow: r, nombre: all[s].getName() };
      }
    }
  }
  return { error: 'No encontré en DATA FUTBOL la pestaña BASE ni una con RUT en la columna A.' };
}

/* Previsualiza (no escribe): cuántos se actualizarían y cuántos se agregarían. */
function diagSync() {
  var r = _sync_(true);
  if (r.error) { Logger.log('ERROR: ' + r.error); return; }
  Logger.log('Origen: "' + r.origen + '"  ->  Destino: "' + r.destino + '"');
  Logger.log('Columnas que se sincronizan (coinciden por nombre): ' + r.cols);
  Logger.log('Se ACTUALIZARÍAN (RUT ya existentes): ' + r.upd);
  Logger.log('Se AGREGARÍAN (RUT nuevos): ' + r.add);
}

/* Ejecuta la sincronización (escribe). */
function sincronizarTodo() {
  var r = _sync_(false);
  if (r.error) { Logger.log('ERROR: ' + r.error); return; }
  Logger.log('LISTO. Actualizados: ' + r.upd + ' | Agregados: ' + r.add + ' | Columnas: ' + r.cols);
}

function _sync_(soloDiag) {
  var src = _fuenteData_();
  if (src.error) return { error: src.error };
  var ss = SpreadsheetApp.openById(IMP_SS_ID);
  var shDst = _impHoja_(ss, 'APODERADO');
  if (!shDst) return { error: 'No encontré la pestaña Apoderados en la Base de Datos App.' };
  var dst = shDst.getDataRange().getValues();
  var hdr = _findHdr_(dst);
  if (hdr < 0) return { error: 'No encontré el encabezado RUT en Apoderados.' };

  var srcH = src.values[src.hdrRow].map(_normHdr_);
  var dstH = dst[hdr].map(_normHdr_);
  var dstWidth = dst[hdr].length;

  // Mapa: SOLO columnas de meses (AGOSTO, SEPTIEMBRE, etc.) que existan en ambas planillas.
  // Estas no tienen validación, así se evita el error de la columna R.
  var MESES = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
  var map = {}, nCols = 0;
  for (var d = 0; d < dstH.length; d++) {
    if (!dstH[d]) continue;
    if (MESES.indexOf(dstH[d]) < 0) continue;      // solo meses
    var s = srcH.indexOf(dstH[d]);
    if (s >= 0) { map[d] = s; nCols++; }
  }
  if (nCols === 0) return { error: 'No encontré columnas de meses (AGOSTO, etc.) que coincidan en ambas planillas.' };

  // Mapa COMPLETO (todas las columnas que coinciden por nombre) para armar los jugadores NUEVOS.
  var mapFull = {};
  for (var d = 0; d < dstH.length; d++) {
    if (!dstH[d]) continue;
    var s2 = srcH.indexOf(dstH[d]);
    if (s2 >= 0) mapFull[d] = s2;
  }
  // Columna de estado en el ORIGEN (Estado Gen. -> NEW/ACTIVO/FULL).
  var srcEstado = 2;
  for (var i = 0; i < srcH.length; i++) { if (srcH[i].indexOf('ESTADO') >= 0 && srcH[i].indexOf('GEN') >= 0) { srcEstado = i; break; } }

  // Índice de filas destino por RUT.
  var filaPorRut = {};
  for (var r = hdr + 1; r < dst.length; r++) {
    var k = _normRut_(dst[r][0]);
    if (k) filaPorRut[k] = r;
  }

  var upd = 0, add = 0, nuevos = [];
  for (var r = src.hdrRow + 1; r < src.values.length; r++) {
    var rut = _normRut_(src.values[r][0]);
    if (!rut) continue;
    if (filaPorRut[rut] != null) {
      var dr = filaPorRut[rut];
      for (var dc in map) {
        var v = src.values[r][map[dc]];
        if (v !== '' && v != null) dst[dr][dc] = v;   // escribe el valor del mes (incluye 0)
      }
      upd++;
    } else {
      // RUT nuevo: agregar solo si su estado es ACTIVO/FULL/NEW.
      if (!_estadoOk_(src.values[r][srcEstado])) continue;
      var fila = [];
      for (var c = 0; c < dstWidth; c++) fila.push('');
      for (var dc2 in mapFull) fila[dc2] = src.values[r][mapFull[dc2]];
      nuevos.push(fila);
      add++;
    }
  }

  if (!soloDiag) {
    var alto = dst.length - (hdr + 1);
    // 1) Actualiza columnas de meses en las filas existentes.
    if (alto > 0) {
      for (var dc in map) {
        var col = Number(dc);
        var colVals = [];
        for (var i = hdr + 1; i < dst.length; i++) colVals.push([dst[i][col]]);
        shDst.getRange(hdr + 2, col + 1, alto, 1).setValues(colVals);
      }
    }
    // 2) Agrega los jugadores NUEVOS al final (no toca filas existentes).
    if (nuevos.length) {
      var start = shDst.getLastRow() + 1;
      var rngN = shDst.getRange(start, 1, nuevos.length, dstWidth);
      try {
        rngN.setValues(nuevos);
      } catch (e) {
        // Si la validación de alguna columna lo bloquea, la quitamos en el rango nuevo y reintentamos.
        rngN.clearDataValidations();
        SpreadsheetApp.flush();
        rngN.setValues(nuevos);
      }
    }
  }

  return { upd: upd, add: add, cols: nCols, origen: src.nombre, destino: shDst.getName() };
}

function _estadoOk_(v) {
  var s = String(v || '').toUpperCase().trim();
  if (s.indexOf('DESACTIV') >= 0) return false;
  return s === 'ACTIVO' || s === 'FULL' || s === 'NEW';
}

/* Instala el activador automático (cada 6 horas). Ejecuta esta función UNA sola vez. */
function crearSyncAutomatico() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'sincronizarTodo') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sincronizarTodo').timeBased().everyHours(6).create();
  Logger.log('Listo: se sincronizará automáticamente cada 6 horas.');
}

/* Quita el activador automático (si alguna vez quieres detenerlo). */
function quitarSyncAutomatico() {
  var n = 0;
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'sincronizarTodo') { ScriptApp.deleteTrigger(t); n++; }
  });
  Logger.log('Activadores eliminados: ' + n);
}

function _findHdr_(data) {
  for (var i = 0; i < Math.min(data.length, 15); i++) {
    if (String(data[i][0]).trim().toUpperCase() === 'RUT') return i;
  }
  return -1;
}
function _normHdr_(s) {
  return String(s || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
}
function _normRut_(s) {
  return String(s || '').replace(/[.\-\s]/g, '').toUpperCase().trim();
}
