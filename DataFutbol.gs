/**
 * DataFutbol.gs — Backend UNIFICADO: Dashboard + Ficha Entrenador + Ficha Apoderado
 * Proyecto Apps Script independiente (cuenta informacion@accionfutbol.cl)
 *
 * Despliega como Web App: Ejecutar como → informacion@accionfutbol.cl
 * Acceso: Cualquiera (incluso anónimo)
 *
 * PLANILLA FUENTE: 1WhJ-XNDRC7HFy9psKuB4iM9xzY-5aWp8RduB3Jhw4jw
 *
 * ACCIONES:
 *   dashboard, jugadores, partidos, evaluaciones, cobranzas, historial, all
 *   fichaEntrenador  → raw rows (público, para portal entrenador)
 *   fichaApoderado   → raw rows filtradas por email (requiere idToken Firebase)
 *   checkEmail       → {exists:bool} (público, para registro apoderado)
 */

var SSID = '196dXsAPdaJIQEnBV5ieI51kaGfWzhCxHCZJULN6np7M';  // DATA FUTBOL A.F 2026
var ADMIN_EMAIL = 'informacion@accionfutbol.cl';

function doGet(e) {
  var p = (e && e.parameter) ? e.parameter : {};
  var action = p.action || '';
  var out;
  try {
    if (action === 'dashboard')          out = getDashboard_();
    else if (action === 'jugadores')     out = getJugadores_();
    else if (action === 'partidos')      out = getPartidos_();
    else if (action === 'evaluaciones')  out = getEvaluaciones_();
    else if (action === 'cobranzas')     out = getCobranzas_();
    else if (action === 'historial')     out = getHistorial_();
    else if (action === 'all')           out = getAll_();
    else if (action === 'fichaEntrenador') out = getFichaEntrenador_();
    else if (action === 'fichaApoderado')  out = getFichaApoderado_(p.idToken);
    else if (action === 'checkEmail')      out = getCheckEmail_(p.email);
    else if (action === 'checkRut')        out = getCheckRut_(p.rut);
    else out = { error: 'Acción no válida.' };
  } catch (err) {
    out = { error: err.message };
  }
  return ContentService.createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}

function getAll_() {
  return {
    dashboard:    getDashboard_(),
    jugadores:    getJugadores_(),
    partidos:     getPartidos_(),
    evaluaciones: getEvaluaciones_(),
    cobranzas:    getCobranzas_(),
    historial:    getHistorial_()
  };
}

function sheet_(name) {
  return SpreadsheetApp.openById(SSID).getSheetByName(name);
}

function rows_(name) {
  var s = sheet_(name);
  if (!s) return [];
  return s.getDataRange().getValues();
}

function getDashboard_() {
  var data = rows_('Dashboard');
  var kpis = {
    totalJugadores: val_(data, 3, 1),
    jugadoresEntrenando: val_(data, 1, 12),
    activoSeguro:   val_(data, 2, 12),
    activoInseguro: val_(data, 3, 12),
    activoNew:      val_(data, 4, 12),
    activoBecado:   val_(data, 5, 12),
    desactivados:   val_(data, 6, 12),
    lesionados:     val_(data, 7, 12),
    receso:         val_(data, 8, 12)
  };
  var porTipo = [];
  for (var i = 8; i <= 13; i++) {
    var r = data[i];
    if (r && r[7] && String(r[7]).trim()) {
      porTipo.push({ tipo: String(r[7]).trim(), cantidad: num_(r[8]), pct: String(r[9] || '') });
    }
  }
  var porSede = [];
  for (var i = 9; i < data.length; i++) {
    var r = data[i];
    if (!r || !r[1] || String(r[1]).trim() === '' || String(r[1]).trim() === 'TT'
        || String(r[1]).indexOf('DATA') >= 0 || String(r[1]).indexOf('SEDE') >= 0) continue;
    porSede.push({
      sede: String(r[1]).trim(),
      ar: num_(r[2]),
      comp: num_(r[3]),
      total: num_(r[4]),
      pct: String(r[5] || '')
    });
  }
  return { kpis: kpis, porTipo: porTipo, porSede: porSede };
}

function getJugadores_() {
  var data = rows_('Base de Datos Apoderados');
  var hdr = data[2];
  var jugadores = [];
  for (var i = 3; i < data.length; i++) {
    var r = data[i];
    if (!r[0] && !r[1]) continue;
    jugadores.push({
      rut: s_(r[0]), nombre: s_(r[1]), estadoGen: s_(r[2]), estadoMes: s_(r[3]),
      pago: s_(r[4]), morosidad: num_(r[5]), fechaNac: s_(r[6]), anio: s_(r[7]),
      edad: num_(r[8]), sede: s_(r[9]), categoria: s_(r[10]), cat: s_(r[11]),
      nivel: s_(r[12]), subNivel: s_(r[13]), torneos: s_(r[14]), pagoTorneo: s_(r[15]),
      minutaje: num_(r[16]), mesIngreso: s_(r[17]), mesSalida: s_(r[18]),
      duracion: s_(r[19]), posicion: s_(r[20]), pie: s_(r[21])
    });
  }
  return jugadores;
}

function getPartidos_() {
  var data = rows_('PARTIDOS');
  var result = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    if (!r[0]) continue;
    result.push({
      jugador: s_(r[0]),
      convocatorias: num_(r[1]), titularidades: num_(r[2]),
      ingresos: num_(r[3]), suplencias: num_(r[4]),
      minutos: num_(r[5]), goles: num_(r[6]), golesRecibidos: num_(r[7]),
      tarjetasAmarillas: num_(r[8]), tarjetasRojas: num_(r[9]),
      nota: num_(r[10]), ultimoPartido: s_(r[11])
    });
  }
  return result;
}

function getEvaluaciones_() {
  var data = rows_('EVALUACIONES TEC.');
  var result = [];
  for (var i = 2; i < data.length; i++) {
    var r = data[i];
    if (!r[0] && !r[1]) continue;
    result.push({
      rut: s_(r[0]), jugador: s_(r[1]), estado: s_(r[2]), estadoMes: s_(r[3]),
      categoria: s_(r[4]), anio: s_(r[5]), nivel: s_(r[6]), sede: s_(r[7]),
      subNivel: s_(r[8]), posicion: s_(r[9]), posicion2: s_(r[10]), pie: s_(r[11]),
      torneo1S: s_(r[12]), torneo2S: s_(r[13]),
      notaTecTac: num_(r[15]), notaFisica: num_(r[17]),
      notaActitudinal: num_(r[21]), promedio: num_(r[23]),
      comentario: s_(r[24]), estadoEval: s_(r[25])
    });
  }
  return result;
}

function getCobranzas_() {
  var data = rows_('IMP. COBRANZAS');
  var result = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    if (!r[0] && !r[1]) continue;
    result.push({
      rut: s_(r[0]), jugador: s_(r[1]), email: s_(r[3]),
      apoderado: s_(r[4]), telefono: s_(r[5]),
      sede: s_(r[7]), estadoGen: s_(r[8]), estadoMes: s_(r[9]),
      categoria: s_(r[10]),
      morosidadMeses: num_(r[18]), morosidadTotal: num_(r[20]),
      montoAtrasado: s_(r[21]), montoTotal: s_(r[23]),
      pagoMensualidad: s_(r[24]), cuotaTorneo: s_(r[25])
    });
  }
  return result;
}

function getHistorial_() {
  var data = rows_('Historial 2026');
  var meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  var result = {};
  for (var i = 0; i < data.length; i++) {
    var r = data[i];
    var label = String(r[0] || '').trim();
    if (!label) continue;
    var vals = [];
    for (var m = 1; m <= 12; m++) {
      vals.push(r[m] !== undefined && r[m] !== '' ? num_(r[m]) : null);
    }
    result[label] = vals;
  }
  result.meses = meses;
  return result;
}

function s_(v) { return v == null ? '' : String(v).trim(); }
function num_(v) {
  if (v == null || v === '') return 0;
  var n = Number(String(v).replace(/[$.,]/g, '').replace(/,/g, '.'));
  return isNaN(n) ? 0 : n;
}
function val_(data, row, col) {
  if (!data[row]) return 0;
  return num_(data[row][col]);
}

// ═══════════════════════════════════════════════════════
// FICHA ENTRENADOR — raw rows (público, sin auth)
// Devuelve el mismo formato que esperan los portales:
// array de arrays con header + filas de datos.
// ═══════════════════════════════════════════════════════

function getFichaEntrenador_() {
  var ws = SpreadsheetApp.openById(SSID).getSheetByName('Base');
  if (!ws) return { error: 'Hoja no encontrada' };
  var lastRow = ws.getLastRow();
  var cols = Math.min(80, ws.getLastColumn());
  var data = ws.getRange(1, 1, lastRow, cols).getValues();
  return data;
}

// ═══════════════════════════════════════════════════════
// FICHA APODERADO — raw rows filtradas por email (Firebase auth)
// Solo devuelve los jugadores del apoderado autenticado.
// Admin ve todos.
// ═══════════════════════════════════════════════════════

function getFichaApoderado_(idToken) {
  var email = dfVerificarToken_(idToken);
  if (!email) return { error: 'No autorizado' };

  var ws = SpreadsheetApp.openById(SSID).getSheetByName('Base');
  if (!ws) return { error: 'Hoja no encontrada' };
  var lastRow = ws.getLastRow();
  var cols = Math.min(80, ws.getLastColumn());
  var data = ws.getRange(1, 1, lastRow, cols).getValues();

  var header = 0;
  for (var i = 0; i < Math.min(data.length, 12); i++) {
    if (String(data[i][0]).trim().toUpperCase() === 'RUT') { header = i; break; }
  }

  if (email === ADMIN_EMAIL) return data;

  var filtradas = data.slice(0, header + 1);
  for (var i = header + 1; i < data.length; i++) {
    var emailApo = String(data[i][26] || '').toLowerCase().trim();
    var emailJug = String(data[i][22] || '').toLowerCase().trim();
    if (emailApo === email || emailJug === email) {
      filtradas.push(data[i]);
    }
  }
  return filtradas;
}

// ═══════════════════════════════════════════════════════
// CHECK EMAIL — ruta pública para registro de apoderados
// ═══════════════════════════════════════════════════════

function getCheckEmail_(emailParam) {
  var em = (emailParam || '').toLowerCase().trim();
  if (!em) return { exists: false };
  var ws = SpreadsheetApp.openById(SSID).getSheetByName('Base');
  if (!ws) return { exists: false };
  var data = ws.getDataRange().getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][26] || '').toLowerCase().trim() === em ||
        String(data[i][22] || '').toLowerCase().trim() === em) {
      return { exists: true };
    }
  }
  return { exists: false };
}

// ═══════════════════════════════════════════════════════
// CHECK RUT — validar jugador por RUT para registro
// Devuelve nombre del jugador + correo enmascarado del apoderado
// ═══════════════════════════════════════════════════════

function getCheckRut_(rutParam) {
  var rut = normRut_(rutParam);
  if (!rut) return { exists: false };
  var ws = SpreadsheetApp.openById(SSID).getSheetByName('Base');
  if (!ws) return { exists: false };
  var data = ws.getDataRange().getValues();

  var hdr = 0;
  for (var i = 0; i < Math.min(data.length, 12); i++) {
    if (String(data[i][0]).trim().toUpperCase() === 'RUT') { hdr = i; break; }
  }

  for (var i = hdr + 1; i < data.length; i++) {
    if (normRut_(data[i][0]) === rut) {
      var nombre = String(data[i][1] || '').trim();
      var emailApo = String(data[i][26] || '').toLowerCase().trim();
      var emailJug = String(data[i][22] || '').toLowerCase().trim();
      var email = emailApo || emailJug;
      return {
        exists: true,
        nombre: nombre,
        emailHint: email ? maskEmail_(email) : '',
        sede: String(data[i][9] || '').trim(),
        cat: String(data[i][11] || '').trim()
      };
    }
  }
  return { exists: false };
}

function normRut_(s) {
  return String(s || '').replace(/[.\-\s]/g, '').toUpperCase().trim();
}

function maskEmail_(email) {
  var parts = email.split('@');
  if (parts.length !== 2) return '***';
  var local = parts[0];
  if (local.length <= 2) return local.charAt(0) + '***@' + parts[1];
  return local.charAt(0) + '***' + local.charAt(local.length - 1) + '@' + parts[1];
}

// ═══════════════════════════════════════════════════════
// VERIFICACIÓN FIREBASE TOKEN (proyecto accion---futbol-f0b72)
// ═══════════════════════════════════════════════════════

function dfVerificarToken_(idToken) {
  if (!idToken) return null;
  var cache = CacheService.getScriptCache();
  var ckey = 'tok_' + Utilities.base64EncodeWebSafe(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, idToken)
  ).substring(0, 24);
  var hit = cache.get(ckey);
  if (hit) return hit;

  var API_KEY = 'AIzaSyCUAjo8Y2UboI7yf1Hx0t-RGB5MnFlhqRw';
  var url = 'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + API_KEY;
  try {
    var res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ idToken: idToken }),
      muteHttpExceptions: true
    });
    if (res.getResponseCode() !== 200) return null;
    var data = JSON.parse(res.getContentText());
    if (!data.users || !data.users.length) return null;
    var email = (data.users[0].email || '').toLowerCase().trim();
    if (email) cache.put(ckey, email, 300);
    return email || null;
  } catch (e) {
    return null;
  }
}
