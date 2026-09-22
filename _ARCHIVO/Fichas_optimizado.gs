/**
 * ACCIÓN FÚTBOL — API Fichas jugadores (OPTIMIZADO · a prueba de colisiones)
 * - Sin constantes globales (evita choques con otros archivos .gs del proyecto).
 * - Helpers con prefijo único afFichas_.
 * - Mismo formato de salida que el original (array 2D en JSON) => el index.html NO cambia.
 * - Caché de 5 min (chunked) + recorte a columnas usadas (0..72).
 * - Forzar recarga sin caché: agregar ?nocache=1 a la URL.
 */

function doGet(e) {
  try {
    var HOJA_FICHAS   = 'Base de Datos Apoderados';
    var NEEDED_COLS   = 73;      // índices 0..72 (Foto = 72 es el máximo que usa el portal)
    var CK            = 'FICHAS_V1';
    var TTL           = 300;     // 5 min

    var noCache = e && e.parameter && e.parameter.nocache;
    var cache   = CacheService.getScriptCache();

    // 1. Servir desde caché si existe
    if (!noCache) {
      var cached = afFichas_readCache_(cache, CK);
      if (cached !== null) return afFichas_json_(cached);
    }

    // 2. Cache miss: leer solo las columnas necesarias
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var ws = ss ? ss.getSheetByName(HOJA_FICHAS) : null;
    if (!ws) return afFichas_json_(JSON.stringify({ error: 'Hoja no encontrada' }));

    var lastRow = ws.getLastRow();
    var lastCol = ws.getLastColumn();
    if (lastRow < 1) return afFichas_json_(JSON.stringify([]));

    var cols = Math.min(NEEDED_COLS, lastCol);
    var data = ws.getRange(1, 1, lastRow, cols).getValues();
    var payload = JSON.stringify(data);

    // 3. Guardar en caché (chunked, por el límite de 100KB por clave)
    afFichas_writeCache_(cache, CK, payload, TTL);

    return afFichas_json_(payload);

  } catch (err) {
    return afFichas_json_(JSON.stringify({ error: err.toString() }));
  }
}

function afFichas_readCache_(cache, CK) {
  var meta = cache.get(CK + '_meta');
  if (!meta) return null;
  var n = parseInt(meta, 10);
  var keys = [];
  for (var i = 0; i < n; i++) keys.push(CK + '_' + i);
  var parts = cache.getAll(keys);
  var buf = '';
  for (var j = 0; j < n; j++) {
    var c = parts[CK + '_' + j];
    if (c == null) return null;   // algún chunk expiró: tratar como miss
    buf += c;
  }
  return buf;
}

function afFichas_writeCache_(cache, CK, payload, TTL) {
  var CHUNK = 90000;
  var chunks = Math.ceil(payload.length / CHUNK);
  var put = {};
  for (var i = 0; i < chunks; i++) put[CK + '_' + i] = payload.substr(i * CHUNK, CHUNK);
  put[CK + '_meta'] = String(chunks);
  cache.putAll(put, TTL);
}

function afFichas_json_(str) {
  return ContentService.createTextOutput(str)
    .setMimeType(ContentService.MimeType.JSON);
}
