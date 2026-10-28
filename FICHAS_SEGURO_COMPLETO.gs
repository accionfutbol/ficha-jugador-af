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
    var SHEET_ID = '1WhJ-XNDRC7HFy9psKuB4iM9xzY-5aWp8RduB3Jhw4jw';
    var HOJA     = 'Base de Datos Apoderados';
    var ADMIN    = 'informacion@accionfutbol.cl';

    var p = (e && e.parameter) ? e.parameter : {};

    // Ruta pública mínima para el registro (sin datos personales, sin token)
    if (p.action === 'checkEmail') {
      var em = (p.email || '').toLowerCase().trim();
      if (!em) return afOut_(JSON.stringify({ exists: false }));
      var b0 = afLeerBase_(SHEET_ID, HOJA);
      var existe = b0.rows.some(function (r) {
        return String(r[26]).toLowerCase().trim() === em ||
               String(r[22]).toLowerCase().trim() === em;
      });
      return afOut_(JSON.stringify({ exists: existe }));
    }

    // Ruta de evaluaciones (SIN token, acceso público)
    if (p.accion === 'obtenerEvaluacionesEntrenador') {
      var resultado = obtenerEvaluacionesEntrenador(p.rut);
      return afOut_(JSON.stringify(resultado));
    }

    // Ruta de datos: requiere token válido
    var email = afVerificarToken_(p.idToken);
    if (!email) return afOut_(JSON.stringify({ error: 'No autorizado' }));

    var base = afLeerBase_(SHEET_ID, HOJA);
    var filtradas = (email === ADMIN)
      ? base.rows
      : base.rows.filter(function (r) {
          return String(r[26]).toLowerCase().trim() === email ||
                 String(r[22]).toLowerCase().trim() === email;
        });

    return afOut_(JSON.stringify(base.head.concat(filtradas)));

  } catch (err) {
    return afOut_(JSON.stringify({ error: err.toString() }));
  }
}

// Delegue POST a GET para evitar problemas de CORS
function doPost(e) {
  return doGet(e);
}

function afLeerBase_(sheetId, hoja) {
  var ws = SpreadsheetApp.openById(sheetId).getSheetByName(hoja);
  if (!ws) throw new Error('Hoja no encontrada');
  var lastRow = ws.getLastRow();
  var cols = Math.min(77, ws.getLastColumn());
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
// EVALUACIONES (técnica, física, antropométrica) — ambos semestres
// ═══════════════════════════════════════════════════════════════════

function obtenerEvaluacionesEntrenador(rut) {
  try {
    var PLANILLA_ID = "1s90v7MoQ3tHLBYnOaoq3SsArNKeNQqbxiI2bCcmPoKA";
    var ss = SpreadsheetApp.openById(PLANILLA_ID);
    var rutStr = String(rut).trim();
    var resultado = { rut: rut };

    // ── Evaluación técnica (NOTAS EV. TECN 2026) ──
    var hTec = ss.getSheetByName("NOTAS EV. TECN 2026");
    if (hTec) {
      var dTec = hTec.getDataRange().getValues();
      for (var i = 2; i < dTec.length; i++) {
        if (String(dTec[i][0]).trim() === rutStr) {
          resultado.primerSemestre = {
            notaTecnica: dTec[i][15], notaActitud: dTec[i][21],
            promedio: dTec[i][23], observacion: dTec[i][24] || ""
          };
          resultado.segundoSemestre = {
            notaTecnica: dTec[i][26], notaActitud: dTec[i][28],
            promedio: dTec[i][30], observacion: dTec[i][32] || ""
          };
          break;
        }
      }
    }

    // ── Evaluación física (EV. FISICA) ──
    var hFis = ss.getSheetByName("EV. FISICA");
    if (hFis) {
      var dFis = hFis.getDataRange().getValues();
      for (var i = 1; i < dFis.length; i++) {
        if (String(dFis[i][0]).trim() === rutStr) {
          resultado.fisica = {
            primerSemestre: { salto: dFis[i][16], vel30: dFis[i][17], ift: dFis[i][18], estado: dFis[i][19] },
            segundoSemestre: { salto: dFis[i][20], vel30: dFis[i][21], ift: dFis[i][22], estado: dFis[i][23] }
          };
          break;
        }
      }
    }

    // ── Evaluación antropométrica (EV. ANTROPOMETRICA) ──
    var hAntro = ss.getSheetByName("EV. ANTROPOMETRICA");
    if (hAntro) {
      var dAntro = hAntro.getDataRange().getValues();
      for (var i = 1; i < dAntro.length; i++) {
        if (String(dAntro[i][0]).trim() === rutStr) {
          resultado.antropometrica = {
            primerSemestre: { altura: dAntro[i][19], peso: dAntro[i][20], gc: dAntro[i][21], imc: dAntro[i][22], mm: dAntro[i][23] },
            segundoSemestre: { altura: dAntro[i][25], peso: dAntro[i][26], gc: dAntro[i][27], imc: dAntro[i][28], mm: dAntro[i][29] }
          };
          break;
        }
      }
    }

    if (!resultado.primerSemestre && !resultado.fisica && !resultado.antropometrica) return null;
    return resultado;

  } catch (error) {
    Logger.log("ERROR en obtenerEvaluacionesEntrenador: " + error.message);
    return null;
  }
}
