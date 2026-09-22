function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ws = ss.getSheetByName('Base de Datos Apoderados');
    if (!ws) {
      return ContentService.createTextOutput(JSON.stringify({error: 'Hoja no encontrada'}))
        .setMimeType(ContentService.MimeType.JSON);
    }
    const data = ws.getDataRange().getValues();
    return ContentService.createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({error: err.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
