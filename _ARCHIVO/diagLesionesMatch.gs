function diagLesionesMatch() {
  var desde = '2026-06-01', hasta = '2026-07-31';   // rango amplio para la prueba
  var lesiones = afLesionesSemana_(desde, hasta);
  Logger.log('Claves en mapa de lesiones (RUT|fecha): ' + Object.keys(lesiones).length);
  Object.keys(lesiones).forEach(function (k) { Logger.log('  MAPA -> ' + k + '  =  ' + lesiones[k]); });

  var lista = afLeerMaestra_();
  var totalL = 0, cruzadas = 0;
  for (var i = 0; i < lista.length; i++) {
    var c = lista[i], sh = null;
    try { sh = SpreadsheetApp.openById(c.id).getSheetByName('ASISTENCIA'); } catch (e) { sh = null; }
    if (!sh) continue;
    var data = sh.getDataRange().getValues();
    var hdr = afFilaEncabezado_(data);
    if (hdr < 0) continue;
    var cols = [], keys = [];
    for (var col = 0; col < data[hdr].length; col++) {
      var k = afFechaKey_(data[hdr][col]);
      if (k && k >= desde && k <= hasta) { cols.push(col); keys.push(k); }
    }
    for (var r = hdr + 1; r < data.length; r++) {
      var rutFila = afNormRut_(data[r][0]);
      var nombre = String(data[r][1] || '').trim();
      for (var j = 0; j < cols.length; j++) {
        var m = String(data[r][cols[j]] || '').trim().toUpperCase();
        if (m === 'L') {
          totalL++;
          var clave = rutFila + '|' + keys[j];
          var hit = lesiones[clave] ? 'SÍ (' + lesiones[clave] + ')' : 'NO';
          if (lesiones[clave]) cruzadas++;
          Logger.log('L en ' + c.sede + '/' + c.categoria + ' | ' + nombre +
            ' | claveAsistencia=[' + clave + '] | cruza=' + hit);
        }
      }
    }
  }
  Logger.log('TOTAL L encontradas: ' + totalL + ' | cruzadas con zona: ' + cruzadas);
}
