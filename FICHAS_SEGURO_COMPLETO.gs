/**
 * ACCIÓN FÚTBOL — API Fichas (SEGURO · PROYECTO INDEPENDIENTE)
 * -----------------------------------------------------------------
 * Usar en un proyecto Apps Script NUEVO y VACÍO (sin otros doGet).
 *   script.google.com -> Nuevo proyecto -> pegar SOLO esto.
 *
 * 1) Pon el ID de la planilla en SHEET_ID (abajo).
 *    - Para PROBAR: el ID de tu COPIA.
 *    - Para PRODUCCIÓN: 1WhJ-XNDRC7HFy9psKuB4iM9xzY-5aWp8RduB3Jhw4jw
 *    El ID está en la URL de la planilla: /spreadsheets/d/ESTE_ID/edit
 * 2) Implementar -> App web -> Ejecutar como: Yo · Acceso: Cualquier usuario.
 *
 * Requiere ID token de Firebase (?idToken=...). Devuelve solo los jugadores
 * del correo autenticado (todo si es admin). Ruta de registro sin PII:
 *   ?action=checkEmail&email=...  -> {exists:bool}
 */

function doGet(e) {
  try {
    var SHEET_ID = '1WhJ-XNDRC7HFy9psKuB4iM9xzY-5aWp8RduB3Jhw4jw';;
    var HOJA     = 'Base de Datos Apoderados';
    var ADMIN    = 'informacion@accionfutbol.cl';

    var p = (e && e.parameter) ? e.parameter : {};

    // Ruta pública mínima para el registro (sin datos personales, sin token)
    if (p.action === 'checkEmail') {
      var em = (p.email || '').toLowerCase().trim();
      if (!em) return afOut_(JSON.stringify({ exists: false }));
      var b0 = afLeerBase_(SHEET_ID, HOJA);
      var existe = b0.rows.some(function (r) {
        return String(r[26]).toLowerCase().trim() === em;
      });
      return afOut_(JSON.stringify({ exists: existe }));
    }

    // Ruta de datos: requiere token válido
    var email = afVerificarToken_(p.idToken);
    if (!email) return afOut_(JSON.stringify({ error: 'No autorizado' }));

    var base = afLeerBase_(SHEET_ID, HOJA);
    var filtradas = (email === ADMIN)
      ? base.rows
      : base.rows.filter(function (r) {
          return String(r[26]).toLowerCase().trim() === email;
        });

    return afOut_(JSON.stringify(base.head.concat(filtradas)));

  } catch (err) {
    return afOut_(JSON.stringify({ error: err.toString() }));
  }
}

function afLeerBase_(sheetId, hoja) {
  var ws = SpreadsheetApp.openById(sheetId).getSheetByName(hoja);
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

function afOut_(str) {
  return ContentService.createTextOutput(str)
    .setMimeType(ContentService.MimeType.JSON);
}

// ═══════════════════════════════════════════════════════════════════
// EVALUACIONES DEL ENTRENADOR (POST)
// ═══════════════════════════════════════════════════════════════════

function doPost(e) {
  try {
    var p = (e && e.parameter) ? e.parameter : {};

    // Acción: obtener evaluaciones del entrenador
    if (p.accion === 'obtenerEvaluacionesEntrenador') {
      var resultado = obtenerEvaluacionesEntrenador(p.rut);
      return ContentService.createTextOutput(JSON.stringify(resultado))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ error: 'Acción no válida' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function obtenerEvaluacionesEntrenador(rut) {
  try {
    const PLANILLA_ID = "1s90v7MoQ3tHLBYnOaoq3SsArNKeNQqbxiI2bCcmPoKA"; // ← REEMPLAZA CON ID REAL
    const NOMBRE_HOJA = "NOTAS EV. TECN 2026";

    const ss = SpreadsheetApp.openById(PLANILLA_ID);
    const hoja = ss.getSheetByName(NOMBRE_HOJA);

    if (!hoja) {
      Logger.log("ERROR: No se encontró la hoja " + NOMBRE_HOJA);
      return null;
    }

    const datos = hoja.getDataRange().getValues();

    const INDICE_RUT = 0;
    const INDICE_P1_TECNICA = 15;   // P
    const INDICE_P1_ACTITUD = 21;   // V
    const INDICE_P1_PROMEDIO = 23;  // X
    const INDICE_P1_OBSERVACION = 24; // Y
    const INDICE_P2_TECNICA = 26;   // AA
    const INDICE_P2_ACTITUD = 28;   // AC
    const INDICE_P2_PROMEDIO = 30;  // AE
    const INDICE_P2_OBSERVACION = 32; // AG

    for (let i = 2; i < datos.length; i++) {
      if (datos[i][INDICE_RUT] === rut || String(datos[i][INDICE_RUT]).trim() === String(rut).trim()) {
        return {
          rut: rut,
          primerSemestre: {
            notaTecnica: datos[i][INDICE_P1_TECNICA],
            notaActitud: datos[i][INDICE_P1_ACTITUD],
            promedio: datos[i][INDICE_P1_PROMEDIO],
            observacion: datos[i][INDICE_P1_OBSERVACION] || ""
          },
          segundoSemestre: {
            notaTecnica: datos[i][INDICE_P2_TECNICA],
            notaActitud: datos[i][INDICE_P2_ACTITUD],
            promedio: datos[i][INDICE_P2_PROMEDIO],
            observacion: datos[i][INDICE_P2_OBSERVACION] || ""
          }
        };
      }
    }

    Logger.log("No se encontró jugador con RUT: " + rut);
    return null;

  } catch (error) {
    Logger.log("ERROR en obtenerEvaluacionesEntrenador: " + error.message);
    return null;
  }
}
