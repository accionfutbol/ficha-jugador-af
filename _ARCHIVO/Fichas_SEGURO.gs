/**
 * ACCIÓN FÚTBOL — API Fichas (SEGURO · verificación de token Firebase)
 * -------------------------------------------------------------------
 * - Requiere el ID token de Firebase (?idToken=...). Lo valida contra Google.
 * - Devuelve SOLO los jugadores del correo autenticado. El admin recibe todo.
 * - Ruta pública mínima para registro: ?action=checkEmail&email=...  -> {exists:bool}
 *   (no entrega datos personales, solo si el correo existe en la academia).
 * - Sin constantes globales (evita choques con otros archivos .gs del proyecto).
 * - Mismo formato de salida que antes (array 2D) => cambio mínimo en el cliente.
 */

function doGet(e) {
  try {
    var p = (e && e.parameter) ? e.parameter : {};

    // ── Ruta 1: verificación de correo para el registro (sin PII, sin token) ──
    if (p.action === 'checkEmail') {
      var em = (p.email || '').toLowerCase().trim();
      if (!em) return afOut_(JSON.stringify({ exists: false }));
      var body0 = afLeerBase_();
      var existe = body0.rows.some(function (r) {
        return String(r[26]).toLowerCase().trim() === em;
      });
      return afOut_(JSON.stringify({ exists: existe }));
    }

    // ── Ruta 2: datos (requiere token válido) ──
    var email = afVerificarToken_(p.idToken);
    if (!email) return afOut_(JSON.stringify({ error: 'No autorizado' }));

    var ADMIN = 'informacion@accionfutbol.cl';
    var base = afLeerBase_();

    var filtradas = (email === ADMIN)
      ? base.rows
      : base.rows.filter(function (r) {
          return String(r[26]).toLowerCase().trim() === email;
        });

    // Encabezado + filas permitidas (mismo formato que el original)
    return afOut_(JSON.stringify(base.head.concat(filtradas)));

  } catch (err) {
    return afOut_(JSON.stringify({ error: err.toString() }));
  }
}

/** Lee la hoja una vez y separa encabezado / cuerpo. Recorta a 73 columnas usadas. */
function afLeerBase_() {
  var ws = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Base de Datos Apoderados');
  if (!ws) throw new Error('Hoja no encontrada');
  var lastRow = ws.getLastRow();
  var cols = Math.min(73, ws.getLastColumn());
  var data = ws.getRange(1, 1, lastRow, cols).getValues();

  var header = 0;
  for (var i = 0; i < Math.min(data.length, 12); i++) {
    if (String(data[i][0]).trim().toUpperCase() === 'RUT') { header = i; break; }
  }
  return { head: data.slice(0, header + 1), rows: data.slice(header + 1) };
}

/** Verifica el ID token de Firebase vía Identity Toolkit. Devuelve el email o null. */
function afVerificarToken_(idToken) {
  if (!idToken) return null;

  // Caché corta token->email para no llamar a Google en cada request
  var cache = CacheService.getScriptCache();
  var ckey = 'tok_' + Utilities.base64EncodeWebSafe(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, idToken)
  ).substring(0, 24);
  var hit = cache.get(ckey);
  if (hit) return hit;

  var API_KEY = 'AIzaSyCUAjo8Y2UboI7yf1Hx0t-RGB5MnFlhqRw'; // apiKey pública de Firebase
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
    if (email) cache.put(ckey, email, 300); // 5 min
    return email || null;
  } catch (e) {
    return null;
  }
}

function afOut_(str) {
  return ContentService.createTextOutput(str)
    .setMimeType(ContentService.MimeType.JSON);
}
