/**
 * ACCIÓN FÚTBOL — API Partidos (SEGURO · PROYECTO INDEPENDIENTE)
 * -----------------------------------------------------------------
 * Proyecto Apps Script NUEVO y VACÍO (sin otros doGet).
 * 1) Pon el ID de la planilla de PARTIDOS en SHEET_ID.
 *    Producción: 14h1exYm9Ye-U5OaIOOtln8byJUSQ_PFBimL_bnWak9E
 * 2) Implementar -> App web -> Ejecutar como: Yo · Acceso: Cualquier usuario.
 *
 * Requiere ID token (?idToken=...). Devuelve SOLO los partidos del correo
 * autenticado. El admin puede consultar por ?rut=... (uno o varios con coma).
 */

function doGet(e) {
  try {
    var SHEET_ID = 'PON_AQUI_EL_ID_DE_PARTIDOS';
    var HOJA     = 'DATA';
    var ADMIN    = 'informacion@accionfutbol.cl';

    var p = (e && e.parameter) ? e.parameter : {};
    var email = afVerificarToken_(p.idToken);
    if (!email) return afOut_(JSON.stringify({ error: 'No autorizado' }));

    var ws = SpreadsheetApp.openById(SHEET_ID).getSheetByName(HOJA);
    if (!ws) return afOut_(JSON.stringify({ error: 'Hoja no encontrada' }));
    var data = ws.getDataRange().getValues();

    // Filtro: apoderado -> por su correo (col 19). Admin -> por RUT(s) del parámetro.
    var esAdmin = (email === ADMIN);
    var rutsAdmin = {};
    if (esAdmin && p.rut) {
      String(p.rut).split(',').forEach(function (r) { rutsAdmin[afNorm_(r)] = true; });
    }

    var out = [];
    for (var i = 0; i < data.length; i++) {
      var r = data[i];
      var rutCel = String(r[18] || '');
      if (!rutCel || rutCel.trim().toUpperCase() === 'RUT') continue; // salta encabezado/vacías

      var permitido;
      if (esAdmin) {
        permitido = p.rut ? !!rutsAdmin[afNorm_(rutCel)] : false; // admin debe indicar rut
      } else {
        permitido = String(r[19] || '').toLowerCase().trim() === email; // correoAp
      }
      if (!permitido) continue;

      out.push({
        fecha:     r[0],
        equipo:    r[1],
        rival:     r[2],
        estado:    r[9],
        minutos:   r[10],
        goles:     r[12],
        tarjAma:   r[14],
        tarjRoja:  r[15],
        nota:      r[16],
        linkVideo: r[17],
        rut:       rutCel
      });
    }

    return afOut_(JSON.stringify({ partidos: out }));

  } catch (err) {
    return afOut_(JSON.stringify({ error: err.toString() }));
  }
}

function afNorm_(s) {
  return String(s || '').replace(/[.\-\s]/g, '').toUpperCase();
}

function afVerificarToken_(idToken) {
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
      method: 'post', contentType: 'application/json',
      payload: JSON.stringify({ idToken: idToken }), muteHttpExceptions: true
    });
    if (res.getResponseCode() !== 200) return null;
    var d = JSON.parse(res.getContentText());
    if (!d.users || !d.users.length) return null;
    var email = (d.users[0].email || '').toLowerCase().trim();
    if (email) cache.put(ckey, email, 300);
    return email || null;
  } catch (e) { return null; }
}

function afOut_(str) {
  return ContentService.createTextOutput(str).setMimeType(ContentService.MimeType.JSON);
}
