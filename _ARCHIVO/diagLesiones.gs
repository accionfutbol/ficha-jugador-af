function diagLesiones() {
  var ss = SpreadsheetApp.openById('1QAnU6YZzSW9CYN9xvo8IgX3790NTWLsc4YZw01isMSA');
  var sh = null, all = ss.getSheets(), nombres = [];
  for (var i = 0; i < all.length; i++) {
    nombres.push(all[i].getName());
    if (all[i].getName().toUpperCase().indexOf('LESIONAD') >= 0) sh = all[i];
  }
  Logger.log('Pestanas: ' + nombres.join(' | '));
  if (!sh) { Logger.log('NO encontre pestana con LESIONAD'); return; }
  Logger.log('Pestana usada: ' + sh.getName());
  var data = sh.getDataRange().getValues();
  Logger.log('Filas: ' + data.length);
  Logger.log('Encabezados: C=[' + data[0][2] + '] I=[' + data[0][8] + '] J=[' + data[0][9] + ']');
  var n = Math.min(data.length, 6);
  for (var r = data.length - n; r < data.length; r++) {
    if (r < 1) continue;
    var rawI = data[r][8];
    Logger.log('Fila ' + (r+1) +
      ' | C(rut)=[' + data[r][2] + '] -> ' + afNormRut_(data[r][2]) +
      ' | I(fecha raw)=[' + rawI + '] tipo=' + (rawI instanceof Date ? 'Date' : typeof rawI) +
      ' -> key=[' + afFechaKey_(rawI) + ']' +
      ' | J(zona)=[' + data[r][9] + ']');
  }
}
