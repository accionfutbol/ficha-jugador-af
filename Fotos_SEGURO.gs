/**
 * ACCIÓN FÚTBOL — API Fotos y Videos (SEGURO)
 * Lee la planilla de álbumes y devuelve los que corresponden a la sede+categoría
 * del apoderado autenticado (token de Firebase del proyecto apoderado).
 * El admin (informacion@) puede consultar cualquier sede/categoría o todo.
 *
 * Columnas de la planilla (se detectan por encabezado): AÑO, CATEGORIA, MES,
 * N MES, SEDE, CONCEPTO, LINK.
 *
 * SETUP: pegar en un proyecto nuevo, implementar como App web
 *   (Ejecutar como: informacion@accionfutbol.cl · Acceso: Cualquier usuario)
 *   y dar acceso de lectura de la planilla a ese correo. Pegar la URL /exec en API_FOTOS del index.
 */

var FOTOS_ID = '1kGv53SKZlQno91VZYoYzdOUE2bwqNZ2jACRMCikomIs';
var FOTOS_ADMIN = 'informacion@accionfutbol.cl';

function doGet(e) {
  try {
    var p = (e && e.parameter) ? e.parameter : {};
    var email = afVerificarToken_(p.idToken);
    if (!email) return afOut_(JSON.stringify({ error: 'No autorizado' }));

    if (p.action === 'album') return afOut_(JSON.stringify(afAlbum_(p.folder)));
    if (p.action === 'srvideos') return afOut_(JSON.stringify(afSrVideos_()));
    if (p.action === 'srmiasist') return afOut_(JSON.stringify(afSrMiAsist_(p.nombre)));
    if (p.action === 'srcalendario') return afOut_(JSON.stringify(afSrCalendario_()));
    if (p.action === 'srcalseniors') return afOut_(JSON.stringify(afSrCalSeniors_(p.nombre, p.turno)));
    if (p.action === 'srcitaciones') return afOut_(JSON.stringify(afSrCitaciones_()));

    var found = afFindFotosSheet_(SpreadsheetApp.openById(FOTOS_ID));
    if (!found) return afOut_(JSON.stringify({ error: 'No encontré una pestaña con columnas SEDE y LINK' }));
    var data = found.data, hdrRow = found.hdrRow;
    if (data.length < hdrRow + 2) return afOut_(JSON.stringify({ fotos: [] }));

    var hdr = data[hdrRow].map(function (x) { return String(x || '').toUpperCase().trim(); });
    function col(cands) {
      for (var i = 0; i < hdr.length; i++)
        for (var j = 0; j < cands.length; j++)
          if (hdr[i].indexOf(cands[j]) >= 0) return i;
      return -1;
    }
    var cAno = col(['AÑO', 'ANO']), cCat = col(['CATEG']), cMes = col(['MES']),
        cN = col(['N MES', 'NMES', 'N°', 'NRO']), cSede = col(['SEDE']),
        cConc = col(['CONCEPTO']), cLink = col(['LINK', 'ENLACE', 'URL', 'DRIVE']);
    if (cSede < 0 || cLink < 0)
      return afOut_(JSON.stringify({ error: 'No encontré las columnas SEDE/LINK' }));

    var fSede = afNorm2_(p.sede), fNum = afCatNum2_(p.cat);

    var out = [];
    for (var r = hdrRow + 1; r < data.length; r++) {
      var row = data[r];
      var sede = String(row[cSede] || '').trim();
      var cat  = String(row[cCat] || '').trim();
      var link = String(row[cLink] || '').trim();
      if (!link || link.indexOf('http') !== 0) continue;
      if (fSede && afNorm2_(sede) !== fSede) continue;
      if (fNum  && afCatNum2_(cat) !== fNum)  continue;
      out.push({
        ano: (cAno >= 0 ? row[cAno] : ''),
        categoria: cat,
        mes: (cMes >= 0 ? String(row[cMes] || '') : ''),
        nmes: (cN >= 0 ? (Number(row[cN]) || 0) : 0),
        sede: sede,
        concepto: (cConc >= 0 ? String(row[cConc] || '') : ''),
        link: link
      });
    }
    // Más reciente primero (por número de mes, luego por orden en la planilla invertido)
    out.sort(function (a, b) { return (b.nmes - a.nmes); });
    return afOut_(JSON.stringify({ fotos: out }));
  } catch (err) {
    return afOut_(JSON.stringify({ error: err.toString() }));
  }
}

/* ═══════════ SENIOR: Mi Asistencia · Calendario · Citaciones ═══════════ */
var SR_ID = '16qtrtUtB5frjR--iCt9OCpELmztcAwFPbDHee_wggGA';
function afN_(s){ return String(s||'').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim(); }
function afSrYMD2_(v){
  if(Object.prototype.toString.call(v)==='[object Date]'&&!isNaN(v.getTime())) return {d:v.getDate(),m:v.getMonth()+1,y:v.getFullYear()};
  var s=String(v||'').trim(); if(!/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(s)) return null;
  var p=s.split('/'); var yy=+p[2]; if(yy<100)yy+=2000; return {d:+p[0],m:+p[1],y:yy};
}
function afSrFmt_(ymd){ return ('0'+ymd.d).slice(-2)+'-'+('0'+ymd.m).slice(-2)+'-'+ymd.y; }
function afSrSheet_(turno){
  var t=String(turno||'').toUpperCase().indexOf('PM')>=0?'PM':'AM';
  var ss=SpreadsheetApp.openById(SR_ID), all=ss.getSheets(), sh=null;
  for(var i=0;i<all.length;i++){ var n=all[i].getName().toUpperCase(); if(n.indexOf('ASISTENCIA')>=0 && n.indexOf(t)>=0){ sh=all[i]; break; } }
  if(!sh) return null;
  var data=sh.getDataRange().getValues(), hdr=-1;
  for(var r=0;r<Math.min(data.length,8);r++){ if(String(data[r][0]).trim().toUpperCase().indexOf('JUGADOR')>=0){ hdr=r; break; } }
  if(hdr<0) return null;
  return {sh:sh,data:data,hdr:hdr,turno:t};
}
function afSrMiAsist_(nombre){
  var target=afN_(nombre); if(!target) return {error:'Sin nombre', turnos:[]};
  var res=[];
  ['AM','PM'].forEach(function(t){
    var h=afSrSheet_(t); if(!h) return;
    var data=h.data, hd=data[h.hdr], cols=[];
    for(var c=0;c<hd.length;c++){ var ymd=afSrYMD2_(hd[c]); if(ymd) cols.push({c:c,ymd:ymd}); }
    var row=-1;
    for(var r=h.hdr+1;r<data.length;r++){ if(afN_(data[r][0])===target){ row=r; break; } }
    if(row<0) return;
    var ok=0,f=0,dias=[];
    cols.forEach(function(col){
      var m=String(data[row][col.c]||'').trim().toUpperCase();
      if(m==='OK') ok++; else if(m==='F') f++;
      if(m==='OK'||m==='F') dias.push({fecha:afSrFmt_(col.ymd), marca:m, ts:new Date(col.ymd.y,col.ymd.m-1,col.ymd.d).getTime()});
    });
    dias.sort(function(a,b){return b.ts-a.ts;});
    res.push({turno:t, ok:ok, f:f, total:ok+f, dias:dias});
  });
  return {turnos:res};
}
function afSrCalendario_(){
  var out=[], hoy=new Date(); hoy.setHours(0,0,0,0);
  ['AM','PM'].forEach(function(t){
    var h=afSrSheet_(t); if(!h) return;
    var hd=h.data[h.hdr];
    for(var c=0;c<hd.length;c++){ var ymd=afSrYMD2_(hd[c]); if(!ymd) continue;
      var dt=new Date(ymd.y,ymd.m-1,ymd.d);
      out.push({turno:t, fecha:afSrFmt_(ymd), ts:dt.getTime(), futuro:dt.getTime()>=hoy.getTime()});
    }
  });
  out.sort(function(a,b){return a.ts-b.ts;});
  return {fechas:out};
}
function afKeyFecha_(v){
  if(Object.prototype.toString.call(v)==='[object Date]'&&!isNaN(v.getTime())) return ('0'+v.getDate()).slice(-2)+'-'+('0'+(v.getMonth()+1)).slice(-2)+'-'+v.getFullYear();
  var s=String(v||'').trim(); var m=s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})$/);
  if(!m) return s;
  var d=+m[1],mo=+m[2],y=+m[3]; if(y<100)y+=2000;
  return ('0'+d).slice(-2)+'-'+('0'+mo).slice(-2)+'-'+y;
}
/* Calendario Seniors combinado: por cada fecha de entrenamiento del turno del jugador
   devuelve fecha, concepto (ejercicio), foto, video y si asistió. */
function afSrCalSeniors_(nombre, turno){
  var t=String(turno||'').toUpperCase().indexOf('PM')>=0?'PM':'AM';
  var target=afN_(nombre);
  var h=afSrSheet_(t);
  if(!h) return {error:'No encontré la asistencia '+t};
  var data=h.data, hd=data[h.hdr], cols=[];
  for(var c=0;c<hd.length;c++){ var ymd=afSrYMD2_(hd[c]); if(ymd) cols.push({c:c,ymd:ymd}); }
  var row=-1;
  for(var r=h.hdr+1;r<data.length;r++){ if(afN_(data[r][0])===target){ row=r; break; } }
  // Mapa de fotos/videos del turno por fecha
  var media={}, vids=afSrVideos_().videos||[];
  vids.forEach(function(v){
    if(String(v.turno).toUpperCase()!==t) return;
    var key=afKeyFecha_(v.fecha);
    var md=media[key]=media[key]||{concepto:'',foto:'',video:''};
    if(v.concepto && !md.concepto) md.concepto=v.concepto;
    if(v.tipo==='FOTO'){ if(!md.foto) md.foto=v.url; } else { if(!md.video) md.video=v.url; }
  });
  var out=[];
  cols.forEach(function(col){
    var key=('0'+col.ymd.d).slice(-2)+'-'+('0'+col.ymd.m).slice(-2)+'-'+col.ymd.y;
    var marca=row>=0?String(data[row][col.c]||'').trim().toUpperCase():'';
    var md=media[key]||{};
    out.push({ fecha:key, ts:new Date(col.ymd.y,col.ymd.m-1,col.ymd.d).getTime(),
      marca:(marca==='OK')?'OK':(marca==='F'?'F':''), concepto:md.concepto||'', foto:md.foto||'', video:md.video||'' });
  });
  out.sort(function(a,b){return b.ts-a.ts;});
  return {ok:true, turno:t, jugadorEncontrado:row>=0, dias:out};
}
function afSrCitaciones_(){
  var ss=SpreadsheetApp.openById(SR_ID), sh=null, all=ss.getSheets();
  for(var i=0;i<all.length;i++){ if(all[i].getName().toUpperCase().indexOf('CITAC')>=0){ sh=all[i]; break; } }
  if(!sh) return {citaciones:[]};
  var data=sh.getDataRange().getValues(); if(data.length<2) return {citaciones:[]};
  var hdr=data[0].map(function(x){return String(x||'').toUpperCase().trim();});
  function ci(cands){ for(var i=0;i<hdr.length;i++) for(var j=0;j<cands.length;j++) if(hdr[i].indexOf(cands[j])>=0) return i; return -1; }
  var cFecha=ci(['FECHA']),cRival=ci(['RIVAL']),cLugar=ci(['LUGAR','CANCHA','SEDE']),cHora=ci(['HORA']),cTurno=ci(['TURNO']),cCit=ci(['CITAD','CONVOCA','JUGADOR']);
  var out=[];
  for(var r=1;r<data.length;r++){
    var fecha=cFecha>=0?data[r][cFecha]:'';
    var citStr=cCit>=0?String(data[r][cCit]||''):'';
    if(!citStr && !fecha) continue;
    var citados=citStr.split(/[,;\n]/).map(function(x){return x.trim();}).filter(Boolean);
    var f2=(Object.prototype.toString.call(fecha)==='[object Date]')?afSrFmt_({d:fecha.getDate(),m:fecha.getMonth()+1,y:fecha.getFullYear()}):String(fecha||'').trim();
    out.push({
      fecha:f2,
      rival: cRival>=0?String(data[r][cRival]||'').trim():'',
      lugar: cLugar>=0?String(data[r][cLugar]||'').trim():'',
      hora: cHora>=0?String(data[r][cHora]||'').trim():'',
      turno: cTurno>=0?String(data[r][cTurno]||'').trim():'',
      citados: citados,
      citadosNorm: citados.map(afN_)
    });
  }
  return {citaciones:out};
}

/* Videos de entrenamiento Senior (pestañas SENIOR AM / SENIOR PM).
   Lee la URL REAL del hipervínculo de la columna LINK. */
function afSrVideos_() {
  var ss = SpreadsheetApp.openById(FOTOS_ID), out = [];
  ['SENIOR AM', 'SENIOR PM'].forEach(function (name) {
    var sh = ss.getSheetByName(name);
    if (!sh) return;
    var data = sh.getDataRange().getValues();
    if (!data.length) return;
    var hdr = data[0].map(function (x) { return String(x || '').toUpperCase().trim(); });
    var cF = hdr.indexOf('FECHA'), cC = hdr.indexOf('CATEGORIA'), cS = hdr.indexOf('SEDE'),
        cL = hdr.indexOf('LINK'), cCon = hdr.indexOf('CONCEPTO');
    var cTipo = -1;
    for (var k = 0; k < hdr.length; k++) { if (hdr[k].indexOf('VIDEO') >= 0) { cTipo = k; break; } }
    if (cL < 0) return;
    var turno = name.indexOf('PM') >= 0 ? 'PM' : 'AM';
    for (var r = 1; r < data.length; r++) {
      var url = afLinkUrl_(sh, r + 1, cL + 1);
      if (!url) continue;
      var tipo = cTipo >= 0 ? String(data[r][cTipo] || '').toUpperCase().trim() : '';
      tipo = (tipo.indexOf('FOTO') >= 0) ? 'FOTO' : 'VIDEO';
      out.push({
        turno: turno,
        tipo: tipo,
        fecha: afFechaFmt_(cF >= 0 ? data[r][cF] : ''),
        concepto: cCon >= 0 ? String(data[r][cCon] || '').trim() : '',
        categoria: cC >= 0 ? String(data[r][cC] || '').trim() : name,
        sede: cS >= 0 ? String(data[r][cS] || '').trim() : '',
        url: url
      });
    }
  });
  return { videos: out };
}
function afLinkUrl_(sh, row, col) {
  try {
    var rtv = sh.getRange(row, col).getRichTextValue();
    if (rtv) {
      var u = rtv.getLinkUrl();
      if (u) return u;
      var runs = rtv.getRuns();
      for (var i = 0; i < runs.length; i++) { var ru = runs[i].getLinkUrl(); if (ru) return ru; }
    }
  } catch (e) {}
  try {
    var f = sh.getRange(row, col).getFormula();
    var m = f.match(/HYPERLINK\("([^"]+)"/i);
    if (m) return m[1];
  } catch (e) {}
  var v = String(sh.getRange(row, col).getValue() || '');
  return v.indexOf('http') === 0 ? v : '';
}
function afFechaFmt_(v) {
  if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v.getTime())) {
    return ('0' + v.getDate()).slice(-2) + '-' + ('0' + (v.getMonth() + 1)).slice(-2) + '-' + v.getFullYear();
  }
  return String(v || '').trim();
}

/* Lista las imágenes/videos de una carpeta de Drive (miniatura + descarga). */
function afAlbum_(folderUrl) {
  var id = afFolderId_(folderUrl);
  if (!id) return { error: 'Link de carpeta inválido' };
  var folder;
  try { folder = DriveApp.getFolderById(id); } catch (e) { return { error: 'No pude abrir la carpeta: ' + e + ' (id=' + id + ')' }; }
  var it = folder.getFiles(), out = [], count = 0;
  while (it.hasNext() && count < 500) {
    var f = it.next();
    var mime = f.getMimeType() || '';
    var isImg = mime.indexOf('image/') === 0;
    var isVid = mime.indexOf('video/') === 0;
    if (!isImg && !isVid) continue;
    var fid = f.getId();
    out.push({
      id: fid,
      name: f.getName(),
      video: isVid,
      thumb: 'https://drive.google.com/thumbnail?id=' + fid + '&sz=w500',
      full: 'https://drive.google.com/thumbnail?id=' + fid + '&sz=w1600',
      download: 'https://drive.google.com/uc?export=download&id=' + fid,
      view: 'https://drive.google.com/file/d/' + fid + '/view'
    });
    count++;
  }
  return { ok: true, fotos: out };
}
function testAutorizarDrive() {
  // Ejecuta esto A MANO una vez para autorizar el acceso a Drive.
  var it = DriveApp.getRootFolder().getFiles();
  Logger.log('Drive autorizado. Primer archivo: ' + (it.hasNext() ? it.next().getName() : '(vacío)'));
}
function afFolderId_(url) {
  var s = String(url || '');
  var m = s.match(/folders\/([-\w]{20,})/);
  if (m) return m[1];
  m = s.match(/[-\w]{25,}/);
  return m ? m[0] : '';
}

/* Busca en todas las pestañas la que tenga columnas SEDE y LINK; detecta la fila de encabezado. */
function afFindFotosSheet_(ss) {
  var sheets = ss.getSheets().slice().sort(function (a, b) {
    var an = a.getName().toUpperCase().indexOf('FOTO') >= 0 ? 0 : 1;
    var bn = b.getName().toUpperCase().indexOf('FOTO') >= 0 ? 0 : 1;
    return an - bn;
  });
  for (var s = 0; s < sheets.length; s++) {
    var data = sheets[s].getDataRange().getValues();
    for (var r = 0; r < Math.min(data.length, 12); r++) {
      var hasSede = false, hasLink = false;
      for (var i = 0; i < data[r].length; i++) {
        var v = String(data[r][i] || '').toUpperCase();
        if (v.indexOf('SEDE') >= 0) hasSede = true;
        if (v.indexOf('LINK') >= 0 || v.indexOf('ENLACE') >= 0 || v.indexOf('URL') >= 0 || v.indexOf('DRIVE') >= 0) hasLink = true;
      }
      if (hasSede && hasLink) return { sheet: sheets[s], data: data, hdrRow: r };
    }
  }
  return null;
}

function afNorm2_(s) {
  return String(s || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]/g, '');
}
function afCatNum2_(c) {
  c = String(c || '').toUpperCase();
  if (c.indexOf('14') >= 0) return '14';
  if (c.indexOf('16') >= 0) return '16';
  if (c.indexOf('18') >= 0) return '18';
  return '';
}

function afVerificarToken_(idToken) {
  if (!idToken) return null;
  var cache = CacheService.getScriptCache();
  var ckey = 'ftok_' + Utilities.base64EncodeWebSafe(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, idToken)).substring(0, 24);
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
