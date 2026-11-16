/* ═══════════════════════════════════════════════════════════════════════
   SYNC A SUPABASE — Fase Puente
   ═══════════════════════════════════════════════════════════════════════
   Replica cada escritura a Supabase (PostgreSQL) para que la app nueva
   (Next.js) tenga datos actualizados. Si falla, no afecta Sheets.

   INSTRUCCIONES:
   1. Pegar este código al FINAL de Código.gs en el proyecto ASISTENCIA
   2. Configurar SB_URL y SB_KEY con los valores de tu proyecto Supabase
   3. Agregar las llamadas de sync en cada función de guardado (ver al final)
   4. Re-desplegar: Implementar → Administrar implementaciones → lápiz →
      Versión nueva → Implementar
   ═════════════════════════════════════════════════════════════════════ */

// ── CONFIGURACIÓN (reemplazar con tus valores) ──
var SB_URL = 'https://TU-PROYECTO.supabase.co';      // ← tu URL de Supabase
var SB_KEY = 'eyJ...tu_service_role_key_aqui...';     // ← tu service_role key

// ── Helpers genéricos ──

function sbFetch_(method, path, payload) {
  var opts = {
    method: method,
    headers: {
      'apikey': SB_KEY,
      'Authorization': 'Bearer ' + SB_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    muteHttpExceptions: true
  };
  if (payload) opts.payload = JSON.stringify(payload);
  return UrlFetchApp.fetch(SB_URL + path, opts);
}

function sbGet_(path) {
  var r = sbFetch_('get', path, null);
  if (r.getResponseCode() >= 300) return null;
  return JSON.parse(r.getContentText());
}

function sbPost_(path, payload) {
  return sbFetch_('post', path, payload);
}

function sbUpsert_(table, payload) {
  var opts = {
    method: 'post',
    headers: {
      'apikey': SB_KEY,
      'Authorization': 'Bearer ' + SB_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=representation'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  return UrlFetchApp.fetch(SB_URL + '/rest/v1/' + table, opts);
}

// ── Cache en memoria para lookups (dura solo durante la ejecución) ──
var SB_CACHE_ = {};

function sbJugadorIdPorRut_(rut) {
  var norm = afNormRut_(rut);
  if (!norm) return null;
  if (SB_CACHE_['j_' + norm]) return SB_CACHE_['j_' + norm];
  var arr = sbGet_('/rest/v1/jugadores?rut=eq.' + encodeURIComponent(rut.trim()) + '&select=id');
  if (!arr || !arr.length) {
    arr = sbGet_('/rest/v1/jugadores?rut=eq.' + encodeURIComponent(norm) + '&select=id');
  }
  if (arr && arr.length) { SB_CACHE_['j_' + norm] = arr[0].id; return arr[0].id; }
  return null;
}

function sbSedeId_(nombre) {
  var k = 's_' + afNorm_(nombre);
  if (SB_CACHE_[k]) return SB_CACHE_[k];
  var arr = sbGet_('/rest/v1/sedes?nombre=ilike.' + encodeURIComponent('%' + nombre.trim() + '%') + '&select=id&limit=1');
  if (arr && arr.length) { SB_CACHE_[k] = arr[0].id; return arr[0].id; }
  return null;
}

function sbCategoriaId_(nombre, sedeId) {
  var k = 'c_' + afNorm_(nombre) + '_' + (sedeId || '');
  if (SB_CACHE_[k]) return SB_CACHE_[k];
  var q = '/rest/v1/categorias?nombre=ilike.' + encodeURIComponent('%' + nombre.trim() + '%') + '&select=id';
  if (sedeId) q += '&sede_id=eq.' + sedeId;
  q += '&limit=1';
  var arr = sbGet_(q);
  if (arr && arr.length) { SB_CACHE_[k] = arr[0].id; return arr[0].id; }
  return null;
}

function sbEntrenadorIdPorNombre_(nombre) {
  if (!nombre) return null;
  var k = 'e_' + afNorm_(nombre);
  if (SB_CACHE_[k]) return SB_CACHE_[k];
  var arr = sbGet_('/rest/v1/entrenadores?nombre=ilike.' + encodeURIComponent('%' + nombre.trim() + '%') + '&select=id&limit=1');
  if (arr && arr.length) { SB_CACHE_[k] = arr[0].id; return arr[0].id; }
  return null;
}

function sbSesionId_(fecha, categoriaId, sedeId) {
  if (!fecha || !categoriaId) return null;
  var arr = sbGet_('/rest/v1/sesiones_entrenamiento?fecha=eq.' + fecha + '&categoria_id=eq.' + categoriaId + '&select=id&limit=1');
  if (arr && arr.length) return arr[0].id;
  // Crear la sesión si no existe
  var payload = { fecha: fecha, categoria_id: categoriaId };
  if (sedeId) payload.sede_id = sedeId;
  var r = sbUpsert_('sesiones_entrenamiento', payload);
  if (r.getResponseCode() < 300) {
    var created = JSON.parse(r.getContentText());
    if (created && created.length) return created[0].id;
  }
  return null;
}

// ── Helper de fecha ──
function sbFechaISO_(fechaTxt) {
  var k = afFechaKey_(fechaTxt);
  if (k) return k;
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(fechaTxt))) return fechaTxt;
  return null;
}

// ═══════════════════════════════════════════════════════
// SYNC 1: ASISTENCIA (para afGuardar_ y afSrGuardar_)
// ═══════════════════════════════════════════════════════

function sbSyncAsistencia_(sede, cat, fecha, marcas) {
  try {
    var sedeId = sbSedeId_(sede);
    var catId = sbCategoriaId_(cat, sedeId);
    if (!catId) return;

    var fechaISO = sbFechaISO_(fecha);
    if (!fechaISO) return;

    var sesionId = sbSesionId_(fechaISO, catId, sedeId);
    if (!sesionId) return;

    // Leer planilla para mapear fila → RUT → jugador_id
    var planillaId = afBuscarPlanilla_(sede, cat);
    if (!planillaId) return;

    var sh = SpreadsheetApp.openById(planillaId).getSheetByName('ASISTENCIA');
    if (!sh) return;
    var data = sh.getDataRange().getValues();
    var L = afHdrLayout_(data);
    if (L.hdr < 0 || L.cRut < 0) return;

    // Mapa fila → rut
    var filaRut = {};
    for (var r = L.hdr + 1; r < data.length; r++) {
      var rut = String(data[r][L.cRut] || '').trim();
      if (rut) filaRut[r + 1] = rut;
    }

    // Preparar upserts
    var upserts = [];
    for (var i = 0; i < marcas.length; i++) {
      var mk = String(marcas[i].marca || '').trim().toUpperCase();
      if (['OK','F','J','L'].indexOf(mk) < 0) continue;

      var rut = filaRut[parseInt(marcas[i].row, 10)];
      if (!rut) continue;

      var jugadorId = sbJugadorIdPorRut_(rut);
      if (!jugadorId) continue;

      upserts.push({
        sesion_id: sesionId,
        jugador_id: jugadorId,
        marca: mk
      });
    }

    // Enviar en lotes de 50
    for (var b = 0; b < upserts.length; b += 50) {
      sbUpsert_('asistencia', upserts.slice(b, b + 50));
    }
  } catch (e) {
    Logger.log('sbSyncAsistencia_ error: ' + e.toString());
  }
}

// ═══════════════════════════════════════════════════════
// SYNC 2: REPORTE DE ENTRENAMIENTO
// ═══════════════════════════════════════════════════════

function sbSyncReporte_(body) {
  try {
    var sedeId = sbSedeId_(body.sede);
    var catId = sbCategoriaId_(body.cat, sedeId);
    if (!catId) return;

    var fechaISO = sbFechaISO_(body.fecha);
    if (!fechaISO) return;

    var sesionId = sbSesionId_(fechaISO, catId, sedeId);
    if (!sesionId) return;

    var updates = {
      horario: body.horario || null,
      balones: body.balones ? parseInt(body.balones, 10) : null,
      en_cancha: body.enCancha ? parseInt(body.enCancha, 10) : null,
      observacion: body.observacion || null,
      entrenador_nombre: body.entrenador || null
    };
    if (sedeId) updates.sede_id = sedeId;

    if (body.noEnListaJugadores) {
      try {
        var arr = (typeof body.noEnListaJugadores === 'string') ? JSON.parse(body.noEnListaJugadores) : body.noEnListaJugadores;
        updates.jugadores_no_inscritos = arr || [];
      } catch (e2) { updates.jugadores_no_inscritos = []; }
    }

    sbFetch_('patch', '/rest/v1/sesiones_entrenamiento?id=eq.' + sesionId, updates);
  } catch (e) {
    Logger.log('sbSyncReporte_ error: ' + e.toString());
  }
}

// ═══════════════════════════════════════════════════════
// SYNC 3: OBSERVACIÓN DEL ENTRENADOR
// ═══════════════════════════════════════════════════════

function sbSyncObservacion_(body) {
  try {
    if (!body.rut || !body.obs) return;
    var jugadorId = sbJugadorIdPorRut_(body.rut);
    if (!jugadorId) return;

    var entrenadorId = sbEntrenadorIdPorNombre_(body.entrenador);
    if (!entrenadorId) return;

    var tipo = 'OTRO';
    var obsUpper = body.obs.toUpperCase();
    if (obsUpper.indexOf('DESACTIV') >= 0) tipo = 'DESACTIVAR';
    else if (obsUpper.indexOf('LESION') >= 0 || obsUpper.indexOf('LESIÓN') >= 0) tipo = 'LESION';
    else if (obsUpper.indexOf('CAMBIO') >= 0 && obsUpper.indexOf('CATEG') >= 0) tipo = 'CAMBIO_CATEGORIA';

    sbPost_('/rest/v1/observaciones', {
      jugador_id: jugadorId,
      entrenador_id: entrenadorId,
      tipo: tipo,
      texto: body.obs
    });
  } catch (e) {
    Logger.log('sbSyncObservacion_ error: ' + e.toString());
  }
}

// ═══════════════════════════════════════════════════════
// SYNC 4: JUSTIFICACIÓN (motivo del entrenador)
// ═══════════════════════════════════════════════════════

function sbSyncJustificacion_(fecha, rut, motivo) {
  try {
    if (!rut || !motivo) return;
    var jugadorId = sbJugadorIdPorRut_(rut);
    if (!jugadorId) return;

    var fechaISO = sbFechaISO_(fecha);
    if (!fechaISO) return;

    sbPost_('/rest/v1/justificaciones', {
      jugador_id: jugadorId,
      fecha: fechaISO,
      motivo: motivo,
      informado_entrenador: true,
      reportado_por: 'ENTRENADOR'
    });
  } catch (e) {
    Logger.log('sbSyncJustificacion_ error: ' + e.toString());
  }
}

// ═══════════════════════════════════════════════════════
// SYNC 5: EVALUACIONES TÉCNICAS
// ═══════════════════════════════════════════════════════

function sbSyncEvaluacion_(body) {
  try {
    if (!body.rut) return;
    var jugadorId = sbJugadorIdPorRut_(body.rut);
    if (!jugadorId) return;

    var now = new Date();
    var anio = now.getFullYear();
    var semestre = (now.getMonth() < 6) ? 1 : 2;

    var row = {
      jugador_id: jugadorId,
      semestre: semestre,
      anio: anio
    };
    if (body.notaTec !== undefined && body.notaTec !== '') row.nota_tecnica = parseFloat(body.notaTec);
    if (body.notaFis !== undefined && body.notaFis !== '') row.nota_fisica = parseFloat(body.notaFis);
    if (body.notaAct !== undefined && body.notaAct !== '') row.nota_actitudinal = parseFloat(body.notaAct);
    if (body.comentario !== undefined) row.comentario = body.comentario;

    var notas = [row.nota_tecnica, row.nota_fisica, row.nota_actitudinal].filter(function(n){ return n != null && !isNaN(n); });
    if (notas.length) row.promedio = Math.round(notas.reduce(function(a,b){ return a+b; }, 0) / notas.length * 10) / 10;

    sbUpsert_('evaluaciones', row);
  } catch (e) {
    Logger.log('sbSyncEvaluacion_ error: ' + e.toString());
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   INSTRUCCIONES DE INTEGRACIÓN
   ═══════════════════════════════════════════════════════════════════════

   Agregar UNA línea al final de cada función de guardado, ANTES del return.
   Todo dentro de try/catch para que si Supabase falla, Sheets siga funcionando.

   ── 1. afGuardar_() — Asistencia ──
   Agregar ANTES de: return { ok: true, escritos: escritos };

     try { sbSyncAsistencia_(body.sede, body.cat, body.fecha, body.marcas); } catch(e){}

   ── 2. afRepoEntrenamiento_() — Reporte DT ──
   Agregar ANTES de: return { ok: true };

     try { sbSyncReporte_(body); } catch(e){}

   ── 3. afGuardarObs_() — Observación ──
   Agregar ANTES de: return { ok: true };

     try { sbSyncObservacion_(body); } catch(e){}

   ── 4. afGuardarMotivoEntrenador_() — Justificación ──
   Agregar AL FINAL de la función, después de escribir en la hoja:

     try { sbSyncJustificacion_(fecha, rut, opcion); } catch(e){}

   ── 5. afEvalGuardar_() — Evaluaciones ──
   Agregar ANTES de: return { ok: true, promedio: prom };

     try { sbSyncEvaluacion_(body); } catch(e){}

   ── 6. afSrGuardar_() — Asistencia Senior ──
   Agregar ANTES de: return { ok: true, escritos: esc };
   (Nota: Senior usa nombres en vez de RUT, el sync puede no mapear todos)

     try { sbSyncAsistencia_('SENIOR', body.turno, body.fecha, body.marcas); } catch(e){}

   ═══════════════════════════════════════════════════════════════════════ */
