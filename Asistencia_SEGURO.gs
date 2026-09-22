/**
 * ACCIÓN FÚTBOL — API Asistencia (SEGURO · proyecto independiente)
 * -----------------------------------------------------------------
 * Cuenta compartida de entrenadores: token de Firebase requerido.
 * Rutea Sede+Categoría -> planilla, leyendo la LISTA MAESTRA (extrae el ID de la URL).
 * Escribe SOLO la celda [fila del jugador × columna de la fecha] con OK/F/J/L.
 *
 * Acciones:
 *   GET  ?action=config&idToken=...                         -> {sedes:[{sede,categoria}]}
 *   GET  ?action=roster&sede=..&cat=..&fecha=YYYY-MM-DD&idToken=..
 *                                                           -> {ok,jugadores:[{row,rut,nombre,marca}]}
 *   POST {action:'save',idToken,sede,cat,fecha,marcas:[{row,marca}]}  -> {ok,escritos}
 */

function doGet(e) {
  try {
    var p = (e && e.parameter) ? e.parameter : {};
    var email = afAuth_(p.idToken);
    if (!email) return afOut_({ error: 'No autorizado' });

    if (p.action === 'config') return afOut_({ sedes: afLeerMaestra_().map(function(x){ return {sede:x.sede, categoria:x.categoria}; }) });
    if (p.action === 'roster') return afOut_(afRoster_(p.sede, p.cat, p.fecha));
    if (p.action === 'motivo') return afOut_(afMotivoJ_(p.sede, p.cat, p.fecha, p.rut));
    if (p.action === 'uniroster') return afOut_(afUniRoster_(p.sede, p.cat));
    if (p.action === 'partidos') return afOut_(afPartidos_(p.rut));
    if (p.action === 'analisis') return afOut_(afAnalisis_(p.sede, p.cat));
    if (p.action === 'plantel') return afOut_(afPlantel_(p.sede, p.cat));
    if (p.action === 'todos') return afOut_(afTodos_());
    if (p.action === 'reporte') return afOut_(afReporte_(p.desde, p.hasta, p.sede, p.cat));
    if (p.action === 'evalconfig') return afOut_(afEvalConfig_());
    if (p.action === 'evalroster') return afOut_(afEvalRoster_(p.sede, p.cat));
    if (p.action === 'srfechas') return afOut_(afSrFechas_(p.turno));
    if (p.action === 'srroster') return afOut_(afSrRoster_(p.turno, p.col, p.fecha));
    if (p.action === 'srplantel') return afOut_(afSrPlantel_(p.turno));
    return afOut_({ error: 'action no reconocida' });
  } catch (err) {
    return afOut_({ error: err.toString() });
  }
}

function doPost(e) {
  try {
    var body = {};
    try { body = JSON.parse(e.postData.contents); } catch (x) { return afOut_({ error: 'JSON inválido' }); }
    var email = afAuth_(body.idToken);
    if (!email) return afOut_({ error: 'No autorizado' });
    if (body.action === 'save') return afOut_(afGuardar_(body));
    if (body.action === 'motivoent') return afOut_(afMotivoEntrenador_(body));
    if (body.action === 'unisave') return afOut_(afUniGuardar_(body));
    if (body.action === 'observacion') return afOut_(afGuardarObs_(body));
    if (body.action === 'repoent') return afOut_(afRepoEntrenamiento_(body));
    if (body.action === 'evalsave') return afOut_(afEvalGuardar_(body));
    if (body.action === 'noinscrito') return afOut_(afNoInscrito_(body));
    if (body.action === 'srsave') return afOut_(afSrGuardar_(body));
    if (body.action === 'srcitsave') return afOut_(afSrCitGuardar_(body));
    return afOut_({ error: 'action no reconocida' });
  } catch (err) {
    return afOut_({ error: err.toString() });
  }
}

/* ─────────── LISTA MAESTRA ─────────── */
var MAESTRA_ID = '1H5TfnLFvYlW-NgpOcbJezNpPm5PeINF5i52HW50PRhY';

function afLeerMaestra_() {
  var sh = SpreadsheetApp.openById(MAESTRA_ID).getSheets()[0]; // primera pestaña (gid=0)
  var data = sh.getDataRange().getValues();
  var out = [];
  for (var i = 1; i < data.length; i++) { // salta encabezado
    var sede = String(data[i][0] || '').trim();
    var cat  = String(data[i][1] || '').trim();
    var raw  = String(data[i][2] || '').trim();
    if (!sede || !cat || !raw) continue;
    var m = raw.match(/[-\w]{25,}/); // extrae el ID de la URL (o acepta el ID pelado)
    if (!m) continue;
    out.push({ sede: sede, categoria: cat, id: m[0] });
  }
  // Listas fijas que NO están en la LISTA MAESTRA (se agregan aquí directamente).
  out.push({ sede: 'PROYECCIÓN', categoria: 'PROYECCIÓN', id: '1gnKwi19ehEb-bMmGOyx5QSiBMJYcV7Ltw0qdp_9iXPs' });
  out.push({ sede: 'PRO ELITE',  categoria: 'PRO ELITE',  id: '17JQJbAd_M_luRIIhAXRFzYpZF90JqFgqd6KwsEE16cA' });
  out.push({ sede: 'FEMENINO',   categoria: 'FEMENINO',   id: '1TO4DmeiX22BT_2fp2_AUOhwUUxaN87N9WamWIs5NtGc' });
  return out;
}

function afBuscarPlanilla_(sede, cat) {
  var s = String(sede || '').trim().toUpperCase();
  var c = String(cat || '').trim().toUpperCase();
  var lista = afLeerMaestra_();
  for (var i = 0; i < lista.length; i++) {
    if (lista[i].sede.toUpperCase() === s && lista[i].categoria.toUpperCase() === c) return lista[i].id;
  }
  return null;
}

/* ─────────── ROSTER ─────────── */
function afRoster_(sede, cat, fecha) {
  var id = afBuscarPlanilla_(sede, cat);
  if (!id) return { error: 'No encontré la planilla para ' + sede + ' · ' + cat };

  var sh = SpreadsheetApp.openById(id).getSheetByName('ASISTENCIA');
  if (!sh) return { error: 'La planilla no tiene pestaña ASISTENCIA' };

  var data = sh.getDataRange().getValues();
  var L = afHdrLayout_(data);
  var hdr = L.hdr;
  if (hdr < 0) return { error: 'No encontré la fila de encabezado (RUT/JUGADORES)' };

  var col = afColumnaFecha_(data[hdr], fecha);
  if (col < 0) return { error: 'La fecha ' + fecha + ' no existe como columna en la planilla' };

  // Columna CATEGORIA (si existe en el encabezado), para mostrarla en la lista (KIDS)
  var catCol = -1;
  for (var cc = 0; cc < data[hdr].length; cc++) {
    if (String(data[hdr][cc] || '').toUpperCase().indexOf('CATEG') >= 0) { catCol = cc; break; }
  }

  // Columnas de fecha (para sugerir "L" a lesionados que siguen activos en fechas nuevas)
  var dcols = [];
  for (var dc = 0; dc < data[hdr].length; dc++) { var dk = afFechaKey_(data[hdr][dc]); if (dk) dcols.push({ c: dc, k: dk }); }
  var curKey = afFechaKey_(data[hdr][col]);

  var jugadores = [];
  for (var r = hdr + 1; r < data.length; r++) {
    var nombre = String(data[r][L.cNom] || '').trim();
    if (!nombre) continue;
    var marca = String(data[r][col] || '').trim();
    var sugeridoL = false;
    if (!marca && curKey) {
      // ¿lesionado activo? -> última L anterior sin un OK posterior
      var lastL = '', lastOK = '';
      for (var d = 0; d < dcols.length; d++) {
        if (dcols[d].k >= curKey) continue;
        var v = String(data[r][dcols[d].c] || '').trim().toUpperCase();
        if (v === 'L'  && dcols[d].k > lastL)  lastL  = dcols[d].k;
        if (v === 'OK' && dcols[d].k > lastOK) lastOK = dcols[d].k;
      }
      if (lastL && (!lastOK || lastL > lastOK)) { marca = 'L'; sugeridoL = true; }
    }
    jugadores.push({
      row: r + 1,                       // fila real (1-based)
      rut: (L.cRut >= 0 ? String(data[r][L.cRut] || '').trim() : ''),
      nombre: nombre,
      marca: marca,
      sugeridoL: sugeridoL,
      estado: String(data[r][L.cEst] || '').trim(),   // estado (ACTIVO/NEW/SIN ESTADO...)
      categoria: (catCol >= 0 ? String(data[r][catCol] || '').trim() : ''),
      telJug: (L.cTelJ >= 0 ? String(data[r][L.cTelJ] || '').trim() : ''),   // teléfono jugador
      telApo: (L.cTelA >= 0 ? String(data[r][L.cTelA] || '').trim() : '')    // teléfono apoderado
    });
  }
  return { ok: true, dateCol: col + 1, jugadores: jugadores };
}

/* ─────────── GUARDAR ─────────── */
function afGuardar_(body) {
  var id = afBuscarPlanilla_(body.sede, body.cat);
  if (!id) return { error: 'No encontré la planilla para ' + body.sede + ' · ' + body.cat };

  var sh = SpreadsheetApp.openById(id).getSheetByName('ASISTENCIA');
  if (!sh) return { error: 'La planilla no tiene pestaña ASISTENCIA' };

  var data = sh.getDataRange().getValues();
  var hdr = afHdrLayout_(data).hdr;
  if (hdr < 0) return { error: 'No encontré la fila de encabezado (RUT/JUGADORES)' };

  var col = afColumnaFecha_(data[hdr], body.fecha);
  if (col < 0) return { error: 'La fecha ' + body.fecha + ' no existe como columna' };

  var VALIDAS = { 'OK':1, 'F':1, 'J':1, 'L':1, 'N/A':1, '':1 };
  var marcas = body.marcas || [];

  // Lee la columna de la fecha SOLO en la región de jugadores y actualiza las filas indicadas
  var primera = hdr + 2;                       // primera fila de jugador (1-based)
  var alto = sh.getLastRow() - primera + 1;
  if (alto < 1) return { error: 'Sin filas de jugadores' };
  var rango = sh.getRange(primera, col + 1, alto, 1);
  var vals = rango.getValues();

  var escritos = 0;
  for (var i = 0; i < marcas.length; i++) {
    var fila = parseInt(marcas[i].row, 10);
    var marca = String(marcas[i].marca || '').trim().toUpperCase();
    if (marca === 'N/A') marca = 'N/A';
    if (!(marca in VALIDAS)) continue;
    var idx = fila - primera;
    if (idx < 0 || idx >= vals.length) continue;
    vals[idx][0] = marca;
    escritos++;
  }
  rango.setValues(vals);

  // ── Al marcar OK, borrar las "L" de las fechas POSTERIORES (el jugador volvió a entrenar).
  //    Las L de fechas anteriores NO se tocan (estuvo lesionado). ──
  var fechaKeyOK = afFechaKey_(body.fecha);
  var forward = [];
  for (var dc = 0; dc < data[hdr].length; dc++) {
    var k = afFechaKey_(data[hdr][dc]);
    if (k && fechaKeyOK && k > fechaKeyOK) forward.push(dc);
  }
  var oks = [];
  for (var q = 0; q < marcas.length; q++) {
    if (String(marcas[q].marca || '').trim().toUpperCase() === 'OK') {
      var f = parseInt(marcas[q].row, 10);
      if (!isNaN(f)) oks.push(f);
    }
  }
  if (forward.length && oks.length) {
    var cStart = forward[0], cEnd = forward[forward.length - 1], width = cEnd - cStart + 1;
    var blk = sh.getRange(primera, cStart + 1, alto, width).getValues();
    var fset = {}; for (var z = 0; z < forward.length; z++) fset[forward[z] - cStart] = true;
    var cambio = false;
    for (var o = 0; o < oks.length; o++) {
      var ridx = oks[o] - primera;
      if (ridx < 0 || ridx >= blk.length) continue;
      for (var bc = 0; bc < width; bc++) {
        if (fset[bc] && String(blk[ridx][bc] || '').trim().toUpperCase() === 'L') { blk[ridx][bc] = ''; cambio = true; }
      }
    }
    if (cambio) sh.getRange(primera, cStart + 1, alto, width).setValues(blk);
  }
  return { ok: true, escritos: escritos };
}

/* Limpieza única: borra las notas viejas "Informado al entrenador:" de todas las
   planillas de asistencia. Ejecutar A MANO una vez desde el editor. */
function afLimpiarNotasEntrenador() {
  var lista = afLeerMaestra_(), borradas = 0;
  for (var i = 0; i < lista.length; i++) {
    var sh;
    try { sh = SpreadsheetApp.openById(lista[i].id).getSheetByName('ASISTENCIA'); } catch (e) { continue; }
    if (!sh) continue;
    var rng = sh.getDataRange();
    var notas = rng.getNotes();
    var cambio = false;
    for (var r = 0; r < notas.length; r++) {
      for (var c = 0; c < notas[r].length; c++) {
        if (/^Informado al entrenador:/i.test(String(notas[r][c] || '').trim())) {
          notas[r][c] = ''; borradas++; cambio = true;
        }
      }
    }
    if (cambio) rng.setNotes(notas);
  }
  Logger.log('Notas borradas: ' + borradas);
}

var JUSTIF_ID = '1QAnU6YZzSW9CYN9xvo8IgX3790NTWLsc4YZw01isMSA';
var JUSTIF_COL_N = 14;   // columna N (1-based) — "INFORMADO POR EL ENTRENADOR"

/* Ubica la fila de una justificación por RUT + fecha en la pestaña JUSTIFICACIÓN */
function afJustifRow_(rut, fecha) {
  var ss = SpreadsheetApp.openById(JUSTIF_ID);
  var sh = null, all = ss.getSheets();
  for (var i = 0; i < all.length; i++) {
    if (all[i].getName().toUpperCase().indexOf('JUSTIFICAC') >= 0) { sh = all[i]; break; }
  }
  if (!sh) return { found: false, sheet: null };
  var data = sh.getDataRange().getValues();
  var hdr = data[0] || [];
  var motCol = 9; // por defecto col J
  for (var c = 0; c < hdr.length; c++) {
    var h = String(hdr[c] || '').toUpperCase();
    if (h.indexOf('A QUE SE DEBE') >= 0 || h.indexOf('INASISTENCIA AL ENTREN') >= 0) { motCol = c; break; }
  }
  var key = afFechaKey_(fecha), rutN = afNormRut_(rut);
  for (var r = 1; r < data.length; r++) {
    if (afNormRut_(data[r][3]) === rutN && afFechaKey_(data[r][2]) === key) {
      return { found: true, sheet: sh, row: r,
               motivo: String(data[r][motCol] || '').trim(),
               informado: String(data[r][JUSTIF_COL_N - 1] || '').trim() };
    }
  }
  return { found: false, sheet: sh };
}

/* MOTIVO de una "J": justificación del jugador (formulario) + lo informado por el entrenador (col N) */
function afMotivoJ_(sede, cat, fecha, rut) {
  var jr = afJustifRow_(rut, fecha);
  return { ok: true, formulario: jr.found ? jr.motivo : '', entrenador: jr.found ? jr.informado : '' };
}

/* Guarda lo que el entrenador escogió en la columna N del sheet de JUSTIFICACIÓN.
   Si el jugador no llenó el formulario, agrega una fila nueva con fecha+rut+opción. */
function afGuardarMotivoEntrenador_(fecha, rut, opcion) {
  var jr = afJustifRow_(rut, fecha);
  var sh = jr.sheet;
  if (!sh) return { error: 'No encontré la pestaña JUSTIFICACIÓN' };
  if (jr.found) {
    sh.getRange(jr.row + 1, JUSTIF_COL_N).setValue(opcion);
  } else {
    var key = afFechaKey_(fecha), fechaVal = fecha;
    if (key) { var pz = key.split('-'); fechaVal = new Date(+pz[0], +pz[1] - 1, +pz[2]); }
    var nueva = sh.getLastRow() + 1;
    sh.getRange(nueva, 3).setValue(fechaVal);        // C = fecha
    sh.getRange(nueva, 4).setValue(rut);             // D = rut
    sh.getRange(nueva, JUSTIF_COL_N).setValue(opcion); // N = informado por el entrenador
  }
  return { ok: true };
}

/* Acción del cliente: marca "J" en la asistencia y registra la opción en la columna N */
function afMotivoEntrenador_(body) {
  if (!body.rut) return { error: 'Falta el RUT del jugador' };
  if (!body.opcion) return { error: 'Falta la opción de motivo' };
  if (body.sede && body.cat && body.row) {
    try { afGuardar_({ sede: body.sede, cat: body.cat, fecha: body.fecha, marcas: [{ row: body.row, marca: 'J' }] }); } catch (e) {}
  }
  return afGuardarMotivoEntrenador_(body.fecha, body.rut, body.opcion);
}

/* ─────────── DETALLES DE PARTIDOS (planilla de partidos, por RUT) ─────────── */
var PARTIDOS_ID = '14h1exYm9Ye-U5OaIOOtln8byJUSQ_PFBimL_bnWak9E';

function afFechaTxt_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'dd-MM-yyyy');
  var k = afFechaKey_(v);
  if (k) { var p = k.split('-'); return p[2] + '-' + p[1] + '-' + p[0]; }
  return String(v || '');
}

/* El marcador (ej. "2-0") a veces Sheets lo interpreta como fecha (mes-día). Lo recupera. */
function afMarcador_(v) {
  if (v instanceof Date) return (v.getMonth() + 1) + '-' + v.getDate();
  return String(v || '');
}

function afPartidos_(rut) {
  if (!rut) return { error: 'Falta el RUT del jugador' };
  var sh = SpreadsheetApp.openById(PARTIDOS_ID).getSheetByName('DATA');
  if (!sh) return { error: 'No encontré la hoja DATA de partidos' };
  var data = sh.getDataRange().getValues();
  var target = afNormRut_(rut);
  var out = [];
  for (var i = 0; i < data.length; i++) {
    var r = data[i];
    var rc = String(r[18] || '');
    if (!rc || rc.trim().toUpperCase() === 'RUT') continue;
    if (afNormRut_(rc) !== target) continue;
    out.push({
      fecha: afFechaTxt_(r[0]),
      equipo: String(r[1] || ''),
      rival: String(r[2] || ''),
      dt: String(r[3] || ''),
      torneo: String(r[4] || ''),
      resultado: String(r[5] || ''),
      marcador: afMarcador_(r[6]),
      estadoConv: String(r[8] || ''),
      estado: String(r[9] || ''),
      minutos: Number(r[10]) || 0,
      posicion: String(r[11] || ''),
      goles: Number(r[12]) || 0,
      gr: Number(r[13]) || 0,
      tarjAma: Number(r[14]) || 0,
      tarjRoja: Number(r[15]) || 0,
      nota: (r[16] === '' || r[16] == null) ? '' : Number(r[16]),
      linkVideo: String(r[17] || '')
    });
  }
  return { ok: true, partidos: out };
}

/* ─────────── REPORTE DEL ENTRENAMIENTO ─────────── */
function afRepoEntrenamiento_(body) {
  var ss = SpreadsheetApp.openById('1QAnU6YZzSW9CYN9xvo8IgX3790NTWLsc4YZw01isMSA');
  var all = ss.getSheets(), sh = null;
  for (var i = 0; i < all.length; i++) { if (all[i].getSheetId() === 1079338476) { sh = all[i]; break; } }
  if (!sh) {
    for (var j = 0; j < all.length; j++) {
      var n = all[j].getName().toUpperCase();
      if (n.indexOf('REPORTE') >= 0 && n.indexOf('ENTREN') >= 0) { sh = all[j]; break; }
    }
  }
  if (!sh) return { error: 'No encontré la pestaña REPORTE DE ENTRENAMIENTO' };
  sh.appendRow([
    new Date(),
    body.fecha || '', body.sede || '', body.cat || '',
    body.horario || '', body.balones || '',
    body.observacion || '', body.entrenador || '', body.enCancha || '',
    (body.asistieron != null ? body.asistieron : ''),
    (body.faltaron != null ? body.faltaron : ''),
    (body.justificaron != null ? body.justificaron : ''),
    (body.lesionados != null ? body.lesionados : ''),
    (body.total != null ? body.total : ''),
    (body.noEnLista != null ? body.noEnLista : ''),
    afNoListaTxt_(body.noEnListaJugadores)
  ]);
  return { ok: true };
}

// Convierte la lista JSON de jugadores no en lista a texto legible para la planilla.
function afNoListaTxt_(json) {
  if (!json) return '';
  try {
    var arr = (typeof json === 'string') ? JSON.parse(json) : json;
    if (!arr || !arr.length) return '';
    return arr.map(function (q) {
      return 'NOMBRE: ' + (q.nombre || '') + '\nAÑO: ' + (q.ano || '') + '\nTELEFONO: ' + (q.tel || '');
    }).join('\n\n');
  } catch (e) { return String(json); }
}

/* ─────────── ANÁLISIS DE MINUTAJE (torneo desde DB Apoderados AT + minutos desde DATA) ─────────── */
var DB_APO_ID = '1WhJ-XNDRC7HFy9psKuB4iM9xzY-5aWp8RduB3Jhw4jw';

function afAnalisis_(sede, cat) {
  // 1) Roster (rut, nombre, torneo AT) desde la Base de Datos Apoderados, filtrado por sede+cat.
  var ss = SpreadsheetApp.openById(DB_APO_ID);
  var sh = null, all = ss.getSheets();
  for (var i = 0; i < all.length; i++) { if (all[i].getName().toUpperCase().indexOf('APODERADO') >= 0) { sh = all[i]; break; } }
  if (!sh) return { error: 'No encontré la pestaña Base de Datos Apoderados' };
  var data = sh.getDataRange().getValues();
  var hdr = -1;
  for (var i = 0; i < Math.min(data.length, 15); i++) { if (String(data[i][0]).trim().toUpperCase() === 'RUT') { hdr = i; break; } }
  if (hdr < 0) return { error: 'No encontré el encabezado RUT en Apoderados' };

  var S = afNorm_(sede), C = afCatNum_(cat);
  var roster = [];
  for (var r = hdr + 1; r < data.length; r++) {
    var rut = String(data[r][0] || '').trim(), nombre = String(data[r][1] || '').trim();
    if (!rut || !nombre) continue;
    var estado = String(data[r][2] || '').toUpperCase().trim();   // C = estado
    var estadoOk = estado.indexOf('DESACTIV') < 0 &&
                   (estado.indexOf('ACTIV') >= 0 || estado === 'NEW' || estado === 'FULL');
    if (!estadoOk) continue;
    if (afNorm_(data[r][9]) !== S) continue;    // J = sede
    if (afCatNum_(data[r][11]) !== C) continue;   // L = categoría
    roster.push({ rut: rut, nombre: nombre, torneo: String(data[r][45] || '').trim() }); // AT = torneo
  }

  // 2) Agregar minutos y conteo de partidos por RUT desde la pestaña DATA de partidos.
  var psh = SpreadsheetApp.openById(PARTIDOS_ID).getSheetByName('DATA');
  var agg = {};
  if (psh) {
    var pd = psh.getDataRange().getValues();
    for (var r = 0; r < pd.length; r++) {
      var rc = String(pd[r][18] || '');
      if (!rc || rc.trim().toUpperCase() === 'RUT') continue;
      var k = afNormRut_(rc);
      var tor = String(pd[r][4] || '').toUpperCase();
      var min = Number(pd[r][10]) || 0;
      if (!agg[k]) agg[k] = { min: 0, tor: 0, ami: 0 };
      agg[k].min += min;
      if (tor.indexOf('AMISTOSO') >= 0) agg[k].ami++;
      else if (tor) agg[k].tor++;
    }
  }

  // 3) Combinar.
  var out = [];
  for (var i = 0; i < roster.length; i++) {
    var j = roster[i];
    var a = agg[afNormRut_(j.rut)] || { min: 0, tor: 0, ami: 0 };
    var tn = String(j.torneo || '').toUpperCase().trim();
    var enTorneo = !!tn && tn !== 'N/A' && tn !== 'NO' && tn !== '-' && tn !== 'SIN TORNEO';
    out.push({ rut: j.rut, nombre: j.nombre, torneo: j.torneo, min: a.min, pTorneo: a.tor, pAmistoso: a.ami, enTorneo: enTorneo });
  }
  return { ok: true, jugadores: out };
}

/* ─────────── OBSERVACIÓN DEL ENTRENADOR ─────────── */
function afGuardarObs_(body) {
  var ss = SpreadsheetApp.openById('1QAnU6YZzSW9CYN9xvo8IgX3790NTWLsc4YZw01isMSA');
  var sh = null, all = ss.getSheets();
  for (var i = 0; i < all.length; i++) {
    if (all[i].getName().toUpperCase().indexOf('OBSERVAC') >= 0) { sh = all[i]; break; }
  }
  if (!sh) return { error: 'No encontré la pestaña OBSERVACIÓN DEL ENTRENADOR' };
  if (!body.obs) return { error: 'Falta la observación' };
  if (!body.entrenador) return { error: 'Falta el entrenador' };
  var row = sh.getLastRow() + 1;
  sh.getRange(row, 1, 1, 6).setValues([[
    body.rut || '', body.nombre || '', body.sede || '', body.cat || '', body.obs || '', body.entrenador || ''
  ]]);
  return { ok: true };
}

/* ─────────── UNIFORMES (planilla CONSOLIDADO aparte) ─────────── */
var UNI_ID = '1flSxbuqmOg_EUcjTbUAO-HWHcRHD5zoE_YvwE9m2yhw';
var UNI_COL_NOMBRE = 1;   // A (1-based)
var UNI_COL_RUT    = 2;   // B (1-based)
var UNI_COL_ESTGEN = 3;   // C (1-based) — estado del jugador (ACTIVO/FULL/NEW/LESIONADO)
var UNI_COL_SEDE   = 6;   // F (1-based)
var UNI_COL_CAT    = 7;   // G (1-based)
var UNI_COL_ESTADO = 15;  // O (1-based) — OK / NO (+ fecha como nota)

function afNorm_(s){ return String(s||'').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9]/g,''); }
function afCatNum_(c){ c = String(c||'').toUpperCase(); if(c.indexOf('14')>=0) return '14'; if(c.indexOf('16')>=0) return '16'; if(c.indexOf('18')>=0) return '18'; return ''; }

function afUniHoja_() {
  var ss = SpreadsheetApp.openById(UNI_ID);
  var all = ss.getSheets();
  for (var i = 0; i < all.length; i++) {
    if (all[i].getName().toUpperCase().indexOf('CONSOLIDAD') >= 0) return all[i];
  }
  return all[0];
}

function afUniIndice_(sh) {
  var data = sh.getDataRange().getValues();
  var lastRow = Math.max(data.length, 1);
  var notes = sh.getRange(1, UNI_COL_ESTADO, lastRow, 1).getNotes();
  var idx = {};
  for (var r = 0; r < data.length; r++) {
    var rut = afNormRut_(data[r][UNI_COL_RUT - 1]);
    if (!rut) continue;
    if (!idx[rut]) idx[rut] = {
      row: r + 1,
      estado: String(data[r][UNI_COL_ESTADO - 1] || '').trim(),
      nota: String((notes[r] && notes[r][0]) || '').trim()
    };
  }
  return { data: data, idx: idx, sh: sh };
}

/* Lista de jugadores DESDE la planilla CONSOLIDADO, filtrada por sede (F) y categoría (G).
   La categoría se compara por número (S14/SUB14 -> 14). */
function afUniRoster_(sede, cat) {
  var sh = afUniHoja_();
  var data = sh.getDataRange().getValues();
  var lastRow = Math.max(data.length, 1);
  var notes = sh.getRange(1, UNI_COL_ESTADO, lastRow, 1).getNotes();
  var S = afNorm_(sede), Cnum = afCatNum_(cat);
  var PERMITIDOS = { 'ACTIVO':1, 'ACTIVOS':1, 'FULL':1, 'NEW':1, 'LESIONADO':1, 'LESIONADOS':1 };
  var out = [];
  for (var r = 0; r < data.length; r++) {
    var nombre = String(data[r][UNI_COL_NOMBRE - 1] || '').trim();
    var rut = String(data[r][UNI_COL_RUT - 1] || '').trim();
    if (!nombre || !rut) continue;
    var estGen = String(data[r][UNI_COL_ESTGEN - 1] || '').trim().toUpperCase();
    if (!PERMITIDOS[estGen]) continue;
    if (afNorm_(data[r][UNI_COL_SEDE - 1]) !== S) continue;
    if (Cnum && afCatNum_(data[r][UNI_COL_CAT - 1]) !== Cnum) continue;
    var raw = String(data[r][UNI_COL_ESTADO - 1] || '').trim().toUpperCase();
    var estado = (raw === 'OK' || raw === 'NO') ? raw : '';
    var fecha = String((notes[r] && notes[r][0]) || '').trim();
    out.push({ rut: rut, nombre: nombre, estado: estado, fecha: fecha, row: r + 1 });
  }
  return { ok: true, jugadores: out };
}

/* Guarda OK/NO en la columna O de CONSOLIDADO (empareja por RUT; agrega fila si no existe).
   La fecha de entrega queda como nota en la celda cuando es OK. */
function afUniGuardar_(body) {
  var sh = afUniHoja_();
  var info = afUniIndice_(sh);
  var marcas = body.marcas || [];
  var hoy = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd-MM-yyyy');
  var escritos = 0;
  for (var i = 0; i < marcas.length; i++) {
    var val = String(marcas[i].val || '').trim().toUpperCase();
    if (val !== 'OK' && val !== 'NO' && val !== '') continue;
    var rutN = afNormRut_(marcas[i].rut);
    if (!rutN) continue;
    var e = info.idx[rutN], row;
    if (e) { row = e.row; }
    else {
      row = sh.getLastRow() + 1;
      sh.getRange(row, UNI_COL_NOMBRE).setValue(marcas[i].nombre || '');
      sh.getRange(row, UNI_COL_RUT).setValue(marcas[i].rut || '');
      info.idx[rutN] = { row: row };
    }
    var cell = sh.getRange(row, UNI_COL_ESTADO);
    cell.setValue(val);
    cell.setNote(val === 'OK' ? ('Entregado el ' + hoy) : '');
    escritos++;
  }
  return { ok: true, escritos: escritos };
}

/* ─────────── PLANTEL (lista de jugadores de una categoría) ─────────── */
function afPlantel_(sede, cat) {
  var id = afBuscarPlanilla_(sede, cat);
  if (!id) return { error: 'No encontré la planilla para ' + sede + ' · ' + cat };
  var sh = SpreadsheetApp.openById(id).getSheetByName('ASISTENCIA');
  if (!sh) return { error: 'La planilla no tiene pestaña ASISTENCIA' };
  var data = sh.getDataRange().getValues();
  var hdr = afFilaEncabezado_(data);
  if (hdr < 0) return { error: 'No encontré la fila de encabezado (RUT)' };
  var jugadores = [];
  for (var r = hdr + 1; r < data.length; r++) {
    var nombre = String(data[r][1] || '').trim();
    if (!nombre) continue;
    jugadores.push({ rut: String(data[r][0] || '').trim(), nombre: nombre });
  }
  return { ok: true, jugadores: jugadores };
}

/* ─────────── TODOS los jugadores (de todas las categorías) ─────────── */
function afTodos_() {
  var lista = afLeerMaestra_(), out = [];
  lista.forEach(function (c) {
    var sh;
    try { sh = SpreadsheetApp.openById(c.id).getSheetByName('ASISTENCIA'); } catch (e) { return; }
    if (!sh) return;
    var data = sh.getDataRange().getValues();
    var hdr = afFilaEncabezado_(data);
    if (hdr < 0) return;
    for (var r = hdr + 1; r < data.length; r++) {
      var nombre = String(data[r][1] || '').trim();
      if (!nombre) continue;
      out.push({ rut: String(data[r][0] || '').trim(), nombre: nombre, sede: c.sede, categoria: c.categoria });
    }
  });
  return { ok: true, jugadores: out };
}

/* ─────────── REPORTE SEMANAL ─────────── */
function afReporte_(desde, hasta, sede, cat) {
  var d0 = afFechaKey_(desde), d1 = afFechaKey_(hasta);
  if (!d0 || !d1) return { error: 'Rango de fechas inválido' };
  var lista = afLeerMaestra_();
  if (sede && cat) {
    var S = String(sede).trim().toUpperCase(), C = String(cat).trim().toUpperCase();
    lista = lista.filter(function (x) { return x.sede.toUpperCase() === S && x.categoria.toUpperCase() === C; });
  }
  var cats = [];
  var glob = { OK:0, F:0, J:0, L:0 };
  var motivos = afMotivosSemana_(d0, d1);   // RUT|fecha -> motivo (justificación)
  var lesiones = afLesionesPorRut_(d1); // RUT -> {date, zona} lesión más reciente hasta 'hasta'
  for (var i = 0; i < lista.length; i++) {
    var c = lista[i], sh = null;
    try { sh = SpreadsheetApp.openById(c.id).getSheetByName('ASISTENCIA'); } catch (e) { sh = null; }
    if (!sh) { cats.push({ sede:c.sede, categoria:c.categoria, error:'sin acceso' }); continue; }
    var data = sh.getDataRange().getValues();
    var hdr = afFilaEncabezado_(data);
    if (hdr < 0) { cats.push({ sede:c.sede, categoria:c.categoria, error:'sin encabezado' }); continue; }
    var cols = [], colKeys = [];
    for (var col = 0; col < data[hdr].length; col++) {
      var k = afFechaKey_(data[hdr][col]);
      if (k && k >= d0 && k <= d1) { cols.push(col); colKeys.push(k); }
    }
    var tot = { OK:0, F:0, J:0, L:0 }, alertas = [], jug = [];
    for (var r = hdr + 1; r < data.length; r++) {
      var nombre = String(data[r][1] || '').trim();
      if (!nombre) continue;
      var rutFila = afNormRut_(data[r][0]);
      var pc = { OK:0, F:0, J:0, L:0 }, pmot = [], pmotL = [], pdias = [];
      for (var j = 0; j < cols.length; j++) {
        var m = String(data[r][cols[j]] || '').trim().toUpperCase();
        if (m === 'OK') { tot.OK++; pc.OK++; }
        else if (m === 'F') { tot.F++; pc.F++; }
        else if (m === 'J') {
          tot.J++; pc.J++;
          var mv = motivos[rutFila + '|' + colKeys[j]];
          if (mv) pmot.push(mv);
        }
        else if (m === 'L') { tot.L++; pc.L++; }
        if (m === 'OK' || m === 'F' || m === 'J' || m === 'L') {
          var kf = colKeys[j].split('-');
          pdias.push({ fecha: kf[2] + '-' + kf[1] + '-' + kf[0], marca: m });
        }
      }
      if (pc.L > 0) {
        var lz = lesiones[rutFila];
        if (lz && lz.zona) pmotL.push(lz.zona);
      }
      jug.push({ nombre: nombre, estado: String(data[r][2] || '').trim(), OK: pc.OK, F: pc.F, J: pc.J, L: pc.L, motivos: pmot, motivosL: pmotL, dias: pdias,
                 telJug: String(data[r][3] || '').trim(), telApo: String(data[r][4] || '').trim() });
      if (pc.F > 2) alertas.push({ nombre: nombre, faltas: pc.F });
    }
    glob.OK += tot.OK; glob.F += tot.F; glob.J += tot.J; glob.L += tot.L;
    cats.push({ sede:c.sede, categoria:c.categoria, entrenamientos:cols.length, OK:tot.OK, F:tot.F, J:tot.J, L:tot.L, alertas:alertas, jugadores:jug });
  }
  return { ok:true, desde:d0, hasta:d1, totales:glob, categorias:cats };
}

/* Semana pasada (lunes a domingo anteriores) en formato YYYY-MM-DD */
function afSemanaPasada_() {
  var tz = Session.getScriptTimeZone();
  var hoy = new Date();
  var dow = hoy.getDay();                    // 0=dom, 1=lun ...
  var lunesEsta = new Date(hoy); lunesEsta.setDate(hoy.getDate() - ((dow + 6) % 7));
  var lunesPasado = new Date(lunesEsta); lunesPasado.setDate(lunesEsta.getDate() - 7);
  var domingoPasado = new Date(lunesPasado); domingoPasado.setDate(lunesPasado.getDate() + 6);
  return {
    desde: Utilities.formatDate(lunesPasado, tz, 'yyyy-MM-dd'),
    hasta: Utilities.formatDate(domingoPasado, tz, 'yyyy-MM-dd')
  };
}

/* Se ejecuta cada lunes (trigger). Envía el reporte por correo. */
function reporteSemanalLunes() {
  var sem = afSemanaPasada_();
  var rep = afReporte_(sem.desde, sem.hasta);
  MailApp.sendEmail({
    to: 'informacion@accionfutbol.cl',
    subject: 'Reporte de asistencia semanal (' + sem.desde + ' a ' + sem.hasta + ')',
    htmlBody: afReporteHtml_(rep)
  });
}

/* Crear el disparador de los lunes (ejecutar UNA vez a mano). */
function crearTriggerLunes() {
  // borra triggers previos de esta función para no duplicar
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'reporteSemanalLunes') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('reporteSemanalLunes').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(8).create();
}

function afReporteHtml_(rep) {
  if (rep.error) return '<p>Error: ' + rep.error + '</p>';
  var t = rep.totales;
  var h = '<div style="font-family:Arial,sans-serif;color:#1c1c1e">';
  h += '<h2 style="color:#c70f6e;margin:0 0 4px">Reporte de asistencia semanal</h2>';
  h += '<p style="color:#666;margin:0 0 16px">Semana: ' + rep.desde + ' a ' + rep.hasta + '</p>';
  h += '<p><b>Totales:</b> Asistió (OK): ' + t.OK + ' · Faltó (F): ' + t.F + ' · Justificado (J): ' + t.J + ' · Lesionado (L): ' + t.L + '</p>';
  h += '<table style="border-collapse:collapse;width:100%;font-size:13px">';
  h += '<tr style="background:#f2f2f2"><th style="text-align:left;padding:6px;border:1px solid #ddd">Sede</th><th style="text-align:left;padding:6px;border:1px solid #ddd">Categoría</th><th style="padding:6px;border:1px solid #ddd">OK</th><th style="padding:6px;border:1px solid #ddd">F</th><th style="padding:6px;border:1px solid #ddd">J</th><th style="padding:6px;border:1px solid #ddd">L</th></tr>';
  (rep.categorias || []).forEach(function (c) {
    if (c.error) { h += '<tr><td style="padding:6px;border:1px solid #ddd">' + c.sede + '</td><td style="padding:6px;border:1px solid #ddd">' + c.categoria + '</td><td colspan="4" style="padding:6px;border:1px solid #ddd;color:#999">' + c.error + '</td></tr>'; return; }
    h += '<tr><td style="padding:6px;border:1px solid #ddd">' + c.sede + '</td><td style="padding:6px;border:1px solid #ddd">' + c.categoria + '</td><td style="text-align:center;padding:6px;border:1px solid #ddd">' + c.OK + '</td><td style="text-align:center;padding:6px;border:1px solid #ddd">' + c.F + '</td><td style="text-align:center;padding:6px;border:1px solid #ddd">' + c.J + '</td><td style="text-align:center;padding:6px;border:1px solid #ddd">' + c.L + '</td></tr>';
  });
  h += '</table>';
  // Alertas
  var hayAlertas = false;
  var a = '<h3 style="color:#c70f6e;margin:20px 0 6px">Alertas — faltaron más de 2 veces</h3><ul>';
  (rep.categorias || []).forEach(function (c) {
    (c.alertas || []).forEach(function (al) {
      hayAlertas = true;
      a += '<li>' + al.nombre + ' — ' + al.faltas + ' faltas (' + c.sede + ' · ' + c.categoria + ')</li>';
    });
  });
  a += '</ul>';
  h += hayAlertas ? a : '<p style="color:#27a06a;margin-top:16px">Sin alertas: nadie faltó más de 2 veces.</p>';
  h += '</div>';
  return h;
}

/* ─────────── MOTIVOS del formulario de justificación ─────────── */
function afMotivosSemana_(d0, d1) {
  var map = {};
  try {
    var ss = SpreadsheetApp.openById('1QAnU6YZzSW9CYN9xvo8IgX3790NTWLsc4YZw01isMSA');
    var sh = null, all = ss.getSheets();
    for (var i = 0; i < all.length; i++) {
      if (all[i].getName().toUpperCase().indexOf('JUSTIFICAC') >= 0) { sh = all[i]; break; }
    }
    if (!sh) return map;
    var data = sh.getDataRange().getValues();
    if (data.length < 2) return map;
    // columna del motivo (por encabezado; fallback col J = índice 9)
    var motCol = 9;
    var hdr = data[0];
    for (var c = 0; c < hdr.length; c++) {
      var h = String(hdr[c] || '').toUpperCase();
      if (h.indexOf('A QUE SE DEBE') >= 0 || h.indexOf('INASISTENCIA AL ENTREN') >= 0) { motCol = c; break; }
    }
    for (var r = 1; r < data.length; r++) {
      var key = afFechaKey_(data[r][2]);          // C = fecha
      if (!key || key < d0 || key > d1) continue;
      var rut = afNormRut_(data[r][3]);           // D = rut
      if (!rut) continue;
      var motivo = String(data[r][motCol] || '').trim();
      if (!motivo) continue;
      map[rut + '|' + key] = motivo;              // último gana si hay duplicado
    }
  } catch (e) {}
  return map;
}

/* Lesión más reciente por RUT (con fecha <= 'hasta'). La "L" se marca durante
   todo el período de lesión, así que cruzamos por jugador, no por fecha exacta. */
function afLesionesPorRut_(hasta) {
  var map = {}; // rut -> { date: 'YYYY-MM-DD', zona: '...' }
  try {
    var ss = SpreadsheetApp.openById('1QAnU6YZzSW9CYN9xvo8IgX3790NTWLsc4YZw01isMSA');
    var sh = null, all = ss.getSheets();
    for (var i = 0; i < all.length; i++) {
      if (all[i].getName().toUpperCase().indexOf('LESIONAD') >= 0) { sh = all[i]; break; }
    }
    if (!sh) return map;
    var data = sh.getDataRange().getValues();
    for (var r = 1; r < data.length; r++) {
      var key = afFechaKey_(data[r][8]);           // I = fecha de la lesión
      if (!key) continue;
      if (hasta && key > hasta) continue;          // ignorar lesiones posteriores al reporte
      var rut = afNormRut_(data[r][2]);            // C = rut
      if (!rut) continue;
      var zona = String(data[r][9] || '').trim();  // J = zona del cuerpo
      if (!zona) continue;
      if (!map[rut] || key >= map[rut].date) map[rut] = { date: key, zona: zona };
    }
  } catch (e) {}
  return map;
}

function afNormRut_(r) { return String(r || '').replace(/[.\-\s]/g, '').toUpperCase().trim(); }

/* ─────────── Helpers ─────────── */
function afFilaEncabezado_(data) {
  for (var i = 0; i < Math.min(data.length, 20); i++) {
    if (String(data[i][0]).trim().toUpperCase() === 'RUT') return i;
  }
  return -1;
}

// Detecta la fila de encabezado y el layout de la planilla ASISTENCIA.
//  - 'std': col A = 'RUT'  (RUT | JUGADOR | ESTADO | TEL JUG | TEL APO | ... | fechas)
//  - 'fem': col A = 'JUGADORES' sin RUT (JUGADORES | ESTADO | ... | fechas)
function afHdrLayout_(data) {
  for (var i = 0; i < Math.min(data.length, 25); i++) {
    var a = String(data[i][0] || '').trim().toUpperCase();
    if (a === 'RUT') return { hdr: i, layout: 'std', cRut: 0, cNom: 1, cEst: 2, cTelJ: 3, cTelA: 4 };
    if (a === 'JUGADORES' || a === 'JUGADOR') return { hdr: i, layout: 'fem', cRut: -1, cNom: 0, cEst: 1, cTelJ: -1, cTelA: -1 };
  }
  return { hdr: -1 };
}

function afColumnaFecha_(headerRow, fecha) {
  var objetivo = afFechaKey_(fecha);
  if (!objetivo) return -1;
  for (var c = 0; c < headerRow.length; c++) {
    if (afFechaKey_(headerRow[c]) === objetivo) return c;
  }
  return -1;
}

function afFechaKey_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var s = String(v || '').trim();
  var m = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})$/);
  if (m) { var d = ('0'+m[1]).slice(-2), mo = ('0'+m[2]).slice(-2), y = m[3]; if (y.length === 2) y = '20'+y; return y+'-'+mo+'-'+d; }
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return m[1]+'-'+('0'+m[2]).slice(-2)+'-'+('0'+m[3]).slice(-2);
  return '';
}

function afAuth_(idToken) {
  if (!idToken) return null;
  var PERMITIDOS = { 'asistenciacontactoaccionfutbol@gmail.com':1, 'informacion@accionfutbol.cl':1 };
  var cache = CacheService.getScriptCache();
  var ckey = 'tok_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, idToken)).substring(0, 24);
  var hit = cache.get(ckey);
  if (hit) return PERMITIDOS[hit] ? hit : null;
  var API_KEY = 'AIzaSyDZZsCyfgVTBOswlFPrbdf_pr7uzmQgnTs';
  try {
    var res = UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + API_KEY, {
      method:'post', contentType:'application/json',
      payload: JSON.stringify({ idToken: idToken }), muteHttpExceptions: true
    });
    if (res.getResponseCode() !== 200) return null;
    var d = JSON.parse(res.getContentText());
    if (!d.users || !d.users.length) return null;
    var email = (d.users[0].email || '').toLowerCase().trim();
    if (email) cache.put(ckey, email, 300);
    return PERMITIDOS[email] ? email : null;
  } catch (e) { return null; }
}

function afOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ═══════════ ASISTENCIA SENIOR (AM / PM) ═══════════ */
var SR_ID = '16qtrtUtB5frjR--iCt9OCpELmztcAwFPbDHee_wggGA';

function afSrHoja_(turno) {
  var t = String(turno || '').toUpperCase().indexOf('PM') >= 0 ? 'PM' : 'AM';
  var ss = SpreadsheetApp.openById(SR_ID), all = ss.getSheets(), sh = null;
  for (var i = 0; i < all.length; i++) {
    var n = all[i].getName().toUpperCase();
    if (n.indexOf('ASISTENCIA') >= 0 && n.indexOf(t) >= 0) { sh = all[i]; break; }
  }
  if (!sh) return null;
  var data = sh.getDataRange().getValues();
  var hdr = -1;
  for (var r = 0; r < Math.min(data.length, 8); r++) {
    if (String(data[r][0]).trim().toUpperCase().indexOf('JUGADOR') >= 0) { hdr = r; break; }
  }
  if (hdr < 0) return null;
  var estadoCol = -1, telCol = -1;
  for (var c = 0; c < data[hdr].length; c++) {
    var hc = String(data[hdr][c]).trim().toUpperCase();
    if (estadoCol < 0 && hc === 'ESTADO') estadoCol = c;
    if (telCol < 0 && (hc.indexOf('TELEF') >= 0 || hc.indexOf('FONO') >= 0 || hc.indexOf('CELUL') >= 0 || hc.indexOf('WHATS') >= 0)) telCol = c;
  }
  // Respaldos por si el encabezado no lo detecta: PM = columna AD (índice 29), AM = columna C (índice 2)
  if (telCol < 0) telCol = (t === 'PM') ? 29 : 2;
  return { sh: sh, data: data, hdr: hdr, estadoCol: estadoCol, telCol: telCol };
}

function afSrEsDate_(v) {
  return Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v.getTime());
}
// Devuelve {d,m,y} si la celda es una fecha (Date real o texto dd/mm/aa), o null.
function afSrYMD_(v) {
  if (afSrEsDate_(v)) return { d: v.getDate(), m: v.getMonth() + 1, y: v.getFullYear() };
  var s = String(v || '').trim();
  if (!/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(s)) return null;
  var p = s.split('/'); var yy = +p[2]; if (yy < 100) yy += 2000;
  return { d: +p[0], m: +p[1], y: yy };
}
function afSrEsFecha_(v) { return afSrYMD_(v) != null; }
var AF_MESES_ = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function afSrFechas_(turno) {
  var h = afSrHoja_(turno);
  if (!h) return { error: 'No encontré la pestaña de asistencia ' + (turno || '') };
  var hd = h.data[h.hdr], out = [];
  for (var c = 0; c < hd.length; c++) {
    var ymd = afSrYMD_(hd[c]);
    if (!ymd) continue;
    var label = ('0' + ymd.d).slice(-2) + '/' + ('0' + ymd.m).slice(-2) + '/' + String(ymd.y).slice(-2);
    out.push({ col: c, label: label, mes: AF_MESES_[ymd.m] || '' });
  }
  return { fechas: out };
}

function afSrColDeFecha_(h, fecha) {
  var m = String(fecha || '').match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) return -1;
  var y = +m[1], mo = +m[2], d = +m[3];
  var hd = h.data[h.hdr];
  for (var c = 0; c < hd.length; c++) {
    var ymd = afSrYMD_(hd[c]);
    if (ymd && ymd.d === d && ymd.m === mo && ymd.y === y) return c;
  }
  return -1;
}

function afSrRoster_(turno, col, fecha) {
  var h = afSrHoja_(turno);
  if (!h) return { error: 'No encontré la pestaña de asistencia ' + (turno || '') };
  col = parseInt(col, 10);
  if (isNaN(col) && fecha) col = afSrColDeFecha_(h, fecha);
  if (isNaN(col) || col < 0) return { error: 'Esa fecha no es un entrenamiento del turno ' + (turno || '') + '. Elige una fecha de entrenamiento.' };
  var data = h.data, jug = [];
  for (var r = h.hdr + 1; r < data.length; r++) {
    var nombre = String(data[r][0] || '').trim();
    if (!nombre) continue;
    var estado = h.estadoCol >= 0 ? String(data[r][h.estadoCol] || '').trim() : '';
    var celda = String(data[r][col] || '').trim().toUpperCase();
    var marca = (celda === 'OK') ? 'OK' : (celda === 'F') ? 'F' : '';
    var tel = h.telCol >= 0 ? String(data[r][h.telCol] || '').trim() : '';
    jug.push({ row: r + 1, nombre: nombre, estado: estado, marca: marca, tel: tel });
  }
  return { ok: true, jugadores: jug };
}

function afSrGuardar_(body) {
  var h = afSrHoja_(body.turno);
  if (!h) return { error: 'No encontré la pestaña de asistencia ' + (body.turno || '') };
  var col = parseInt(body.col, 10);
  if (isNaN(col) && body.fecha) col = afSrColDeFecha_(h, body.fecha);
  if (isNaN(col) || col < 0) return { error: 'Esa fecha no es un entrenamiento del turno ' + (body.turno || '') };
  var marcas = body.marcas || [];
  var first = h.hdr + 2, alto = h.sh.getLastRow() - first + 1;
  if (alto < 1) return { error: 'Sin jugadores' };
  var rng = h.sh.getRange(first, col + 1, alto, 1);
  var vals = rng.getValues(), esc = 0;
  for (var i = 0; i < marcas.length; i++) {
    var idx = (marcas[i].row - first);
    if (idx < 0 || idx >= alto) continue;
    var mk = marcas[i].marca;
    vals[idx][0] = (mk === 'OK') ? 'OK' : (mk === 'F') ? 'F' : '';
    esc++;
  }
  rng.setValues(vals);
  return { ok: true, escritos: esc };
}

/* Plantel Senior de un turno (para elegir citados) — sin DESACTIVADO. */
function afSrPlantel_(turno) {
  var h = afSrHoja_(turno);
  if (!h) return { error: 'No encontré la pestaña de asistencia ' + (turno || '') };
  var data = h.data, jug = [];
  for (var r = h.hdr + 1; r < data.length; r++) {
    var nombre = String(data[r][0] || '').trim();
    if (!nombre) continue;
    var estado = h.estadoCol >= 0 ? String(data[r][h.estadoCol] || '').trim() : '';
    if (estado.toUpperCase().indexOf('DESACTIV') >= 0) continue;
    jug.push({ nombre: nombre, estado: estado });
  }
  jug.sort(function (a, b) { return a.nombre.localeCompare(b.nombre); });
  return { ok: true, jugadores: jug };
}

/* Guarda una citación en la pestaña CITACIONES (la crea si no existe). */
function afSrCitGuardar_(body) {
  var ss = SpreadsheetApp.openById(SR_ID), all = ss.getSheets(), sh = null;
  for (var i = 0; i < all.length; i++) { if (all[i].getName().toUpperCase().indexOf('CITAC') >= 0) { sh = all[i]; break; } }
  if (!sh) { sh = ss.insertSheet('CITACIONES'); sh.appendRow(['FECHA', 'RIVAL', 'LUGAR', 'HORA', 'TURNO', 'CITADOS']); }
  else if (sh.getLastRow() === 0) { sh.appendRow(['FECHA', 'RIVAL', 'LUGAR', 'HORA', 'TURNO', 'CITADOS']); }
  sh.appendRow([body.fecha || '', body.rival || '', body.lugar || '', body.hora || '', body.turno || '', body.citados || '']);
  return { ok: true };
}

/* ═══════════ JUGADORES NO INSCRITOS ═══════════ */
function afNoInscrito_(body) {
  var ss = SpreadsheetApp.openById('1QAnU6YZzSW9CYN9xvo8IgX3790NTWLsc4YZw01isMSA');
  var all = ss.getSheets(), sh = null;
  for (var i = 0; i < all.length; i++) { if (all[i].getSheetId() === 1368402664) { sh = all[i]; break; } }
  if (!sh) {
    for (var j = 0; j < all.length; j++) {
      var n = all[j].getName().toUpperCase();
      if (n.indexOf('NO INSCRIT') >= 0) { sh = all[j]; break; }
    }
  }
  if (!sh) return { error: 'No encontré la pestaña JUGADORES NO INSCRITOS' };
  sh.appendRow([
    body.nombre || '', body.ano || '', body.categoria || '',
    body.sede || '', body.telApo || '', body.entrenador || ''
  ]);
  return { ok: true };
}

/* ═══════════ EVALUACIONES (Portal Entrenador) ═══════════ */
var EVAL_ID = '1s90v7MoQ3tHLBYnOaoq3SsArNKeNQqbxiI2bCcmPoKA';
// Índices de columna (0-based) en la pestaña de evaluaciones:
var EV = { RUT:0, NOMBRE:1, ESTADO:2, CAT:4, NIVEL:6, SEDE:7, SUBNIVEL:8,
           POSPRIN:9, POSSEC:10, PIE:11, TOR1:12, TOR2:13,
           NOTATEC:15, NOTAFIS:17, NOTAACT:21, PROM:23, COMENT:24 };

function afEvalHoja_() {
  var ss = SpreadsheetApp.openById(EVAL_ID);
  var all = ss.getSheets();
  for (var i = 0; i < all.length; i++) {
    var d = all[i].getDataRange().getValues();
    for (var r = 0; r < Math.min(d.length, 15); r++) {
      if (String(d[r][0]).trim().toUpperCase() === 'RUT') {
        return { sh: all[i], data: d, hdr: r };
      }
    }
  }
  return null;
}

function afEvalEstadoOk_(v) {
  var s = String(v || '').toUpperCase().trim();
  if (s.indexOf('DESACTIV') >= 0) return false;
  return s === 'ACTIVO' || s === 'FULL' || s === 'NEW';
}

function afEvalConfig_() {
  var h = afEvalHoja_();
  if (!h) return { error: 'No encontré la pestaña de evaluaciones' };
  var data = h.data, seen = {}, sedes = [];
  for (var r = h.hdr + 1; r < data.length; r++) {
    if (!afEvalEstadoOk_(data[r][EV.ESTADO])) continue;
    var sede = String(data[r][EV.SEDE] || '').trim();
    var cat = String(data[r][EV.CAT] || '').trim();
    if (!sede || !cat) continue;
    var k = sede + '||' + cat;
    if (!seen[k]) { seen[k] = 1; sedes.push({ sede: sede, categoria: cat }); }
  }
  sedes.sort(function (a, b) { return (a.sede + a.categoria).localeCompare(b.sede + b.categoria); });
  return { sedes: sedes };
}

function afEvalOpc_(sh, hdr, colIdx, data) {
  var out = [];
  try {
    var dv = sh.getRange(hdr + 2, colIdx + 1).getDataValidation();
    if (dv) {
      var t = dv.getCriteriaType(), v = dv.getCriteriaValues();
      if (t === SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST) {
        out = v[0].map(function (x) { return String(x).trim(); });
      } else if (t === SpreadsheetApp.DataValidationCriteria.VALUE_IN_RANGE) {
        out = v[0].getValues().map(function (r) { return String(r[0]).trim(); });
      }
    }
  } catch (e) {}
  out = out.filter(function (x) { return x !== ''; });
  if (!out.length) {
    var seen = {};
    for (var r = hdr + 1; r < data.length; r++) {
      var x = String(data[r][colIdx] || '').trim();
      if (x && !seen[x]) { seen[x] = 1; out.push(x); }
    }
  }
  return out;
}

function afEvalRoster_(sede, cat) {
  var h = afEvalHoja_();
  if (!h) return { error: 'No encontré la pestaña de evaluaciones' };
  var data = h.data, S = afNorm_(sede), C = afNorm_(cat);
  var jug = [];
  for (var r = h.hdr + 1; r < data.length; r++) {
    if (!afEvalEstadoOk_(data[r][EV.ESTADO])) continue;
    if (afNorm_(data[r][EV.SEDE]) !== S) continue;
    if (afNorm_(data[r][EV.CAT]) !== C) continue;
    var row = data[r];
    jug.push({
      rut: String(row[EV.RUT] || '').trim(),
      nombre: String(row[EV.NOMBRE] || '').trim(),
      estado: String(row[EV.ESTADO] || '').trim(),
      nivel: String(row[EV.NIVEL] || '').trim(),
      subnivel: String(row[EV.SUBNIVEL] || '').trim(),
      posPrin: String(row[EV.POSPRIN] || '').trim(),
      posSec: String(row[EV.POSSEC] || '').trim(),
      pie: String(row[EV.PIE] || '').trim(),
      tor1: String(row[EV.TOR1] || '').trim(),
      tor2: String(row[EV.TOR2] || '').trim(),
      notaTec: String(row[EV.NOTATEC] || '').trim(),
      notaFis: String(row[EV.NOTAFIS] || '').trim(),
      notaAct: String(row[EV.NOTAACT] || '').trim(),
      promedio: String(row[EV.PROM] || '').trim(),
      comentario: String(row[EV.COMENT] || '').trim()
    });
  }
  jug.sort(function (a, b) { return a.nombre.localeCompare(b.nombre); });
  var opciones = {
    nivel: afEvalOpc_(h.sh, h.hdr, EV.NIVEL, data),
    subnivel: afEvalOpc_(h.sh, h.hdr, EV.SUBNIVEL, data),
    posPrin: afEvalOpc_(h.sh, h.hdr, EV.POSPRIN, data),
    posSec: afEvalOpc_(h.sh, h.hdr, EV.POSSEC, data),
    pie: afEvalOpc_(h.sh, h.hdr, EV.PIE, data),
    tor1: afEvalOpc_(h.sh, h.hdr, EV.TOR1, data),
    tor2: afEvalOpc_(h.sh, h.hdr, EV.TOR2, data)
  };
  return { ok: true, opciones: opciones, jugadores: jug };
}

function afEvalProm_(a, b, c) {
  var arr = [a, b, c].map(function (x) { return parseFloat(String(x).replace(',', '.')); })
                     .filter(function (x) { return !isNaN(x); });
  if (!arr.length) return '';
  var m = arr.reduce(function (s, x) { return s + x; }, 0) / arr.length;
  m = Math.round(m * 10) / 10;
  if (m < 1) m = 1; if (m > 7) m = 7;
  return m;
}

function afEvalSet_(sh, row1, col1, val) {
  var cell = sh.getRange(row1, col1);
  try { cell.setValue(val); }
  catch (e) {
    var dv = cell.getDataValidation();
    cell.setDataValidation(null);
    SpreadsheetApp.flush();
    cell.setValue(val);
    if (dv) cell.setDataValidation(dv);
  }
}

function afEvalGuardar_(body) {
  var h = afEvalHoja_();
  if (!h) return { error: 'No encontré la pestaña de evaluaciones' };
  var data = h.data, sh = h.sh, objetivo = afNormRut_(body.rut), fila = -1;
  for (var r = h.hdr + 1; r < data.length; r++) {
    if (afNormRut_(data[r][EV.RUT]) === objetivo) { fila = r + 1; break; }  // 1-based
  }
  if (fila < 0) return { error: 'No encontré al jugador (RUT ' + body.rut + ')' };

  var prom = afEvalProm_(body.notaTec, body.notaFis, body.notaAct);
  var sets = [
    [EV.NIVEL, body.nivel], [EV.SUBNIVEL, body.subnivel],
    [EV.POSPRIN, body.posPrin], [EV.POSSEC, body.posSec], [EV.PIE, body.pie],
    [EV.TOR1, body.tor1], [EV.TOR2, body.tor2],
    [EV.NOTATEC, body.notaTec], [EV.NOTAFIS, body.notaFis], [EV.NOTAACT, body.notaAct],
    [EV.PROM, prom], [EV.COMENT, body.comentario]
  ];
  for (var i = 0; i < sets.length; i++) {
    var col = sets[i][0], val = sets[i][1];
    if (val === undefined) continue;                 // no enviado -> no tocar
    afEvalSet_(sh, fila, col + 1, (val == null ? '' : val));
  }
  return { ok: true, promedio: prom };
}
