// ═══════════════════════════════════════════════════════════════════
// FUNCIÓN: Obtener Evaluaciones del Entrenador
// UBICACIÓN: Fichas_SEGURO.gs
// INSTRUCCIONES: Copiar esta función completa y pegarla en Google Apps Script
// ═══════════════════════════════════════════════════════════════════

/**
 * Obtiene las evaluaciones técnicas del entrenador para un jugador
 * Fuente: Planilla "EVALUACIONES 2026 ACCIÓN FÚTBOL", pestaña "NOTAS EV. TECN 2026"
 *
 * Estructura de columnas:
 * PRIMER SEMESTRE:  P=Técnica | V=Actitud | X=Promedio | Y=Observación
 * SEGUNDO SEMESTRE: AA=Técnica | AC=Actitud | AE=Promedio | AG=Observación
 */
function obtenerEvaluacionesEntrenador(rut) {
  try {
    // ID de la planilla de EVALUACIONES
    const PLANILLA_ID = "1s90v7MoQ3tHLBYnOaoq3SsArNKeNQqbxiI2bCcmPoKA"; // ← ACTUALIZAR CON ID REAL
    const NOMBRE_HOJA = "NOTAS EV. TECN 2026";

    const ss = SpreadsheetApp.openById(PLANILLA_ID);
    const hoja = ss.getSheetByName(NOMBRE_HOJA);

    if (!hoja) {
      Logger.log("ERROR: No se encontró la hoja " + NOMBRE_HOJA);
      return null;
    }

    const datos = hoja.getDataRange().getValues();

    // Índices de columnas (comenzando desde 0):
    // A=0, B=1, C=2, D=3, E=4, F=5, G=6, H=7, I=8, J=9, K=10, L=11, M=12, N=13, O=14,
    // P=15, Q=16, R=17, S=18, T=19, U=20, V=21, W=22, X=23, Y=24, Z=25,
    // AA=26, AB=27, AC=28, AD=29, AE=30, AF=31, AG=32

    const INDICE_RUT = 0;           // Columna A
    const INDICE_P1_TECNICA = 15;   // Columna P (Nota Técnica 1er Sem)
    const INDICE_P1_ACTITUD = 21;   // Columna V (Nota Actitud 1er Sem)
    const INDICE_P1_PROMEDIO = 23;  // Columna X (Promedio 1er Sem)
    const INDICE_P1_OBSERVACION = 24; // Columna Y (Observación 1er Sem)

    const INDICE_P2_TECNICA = 26;   // Columna AA (Nota Técnica 2do Sem)
    const INDICE_P2_ACTITUD = 28;   // Columna AC (Nota Actitud 2do Sem)
    const INDICE_P2_PROMEDIO = 30;  // Columna AE (Promedio 2do Sem)
    const INDICE_P2_OBSERVACION = 32; // Columna AG (Observación 2do Sem)

    // Buscar el jugador por RUT
    for (let i = 2; i < datos.length; i++) { // Comenzar desde fila 3 (índice 2)
      if (datos[i][INDICE_RUT] === rut || String(datos[i][INDICE_RUT]).trim() === String(rut).trim()) {

        // Extraer datos del primer semestre
        const primerSemestre = {
          notaTecnica: datos[i][INDICE_P1_TECNICA],
          notaActitud: datos[i][INDICE_P1_ACTITUD],
          promedio: datos[i][INDICE_P1_PROMEDIO],
          observacion: datos[i][INDICE_P1_OBSERVACION] || ""
        };

        // Extraer datos del segundo semestre
        const segundoSemestre = {
          notaTecnica: datos[i][INDICE_P2_TECNICA],
          notaActitud: datos[i][INDICE_P2_ACTITUD],
          promedio: datos[i][INDICE_P2_PROMEDIO],
          observacion: datos[i][INDICE_P2_OBSERVACION] || ""
        };

        return {
          rut: rut,
          primerSemestre: primerSemestre,
          segundoSemestre: segundoSemestre
        };
      }
    }

    // Si no encuentra el jugador
    Logger.log("No se encontró jugador con RUT: " + rut);
    return null;

  } catch (error) {
    Logger.log("ERROR en obtenerEvaluacionesEntrenador: " + error.message);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════
// AGREGAR A LA FUNCIÓN doPost() - Ejemplo de integración:
// ═══════════════════════════════════════════════════════════════════

/*
  En tu función doPost(), agregar este bloque dentro del switch/if de acciones:

  if (params.accion === 'obtenerEvaluacionesEntrenador') {
    const resultado = obtenerEvaluacionesEntrenador(params.rut);
    return ContentService.createTextOutput(JSON.stringify(resultado))
      .setMimeType(ContentService.MimeType.JSON);
  }
*/

// ═══════════════════════════════════════════════════════════════════
// PRUEBA DE FUNCIÓN (ejecutar en Apps Script)
// ═══════════════════════════════════════════════════════════════════

/*
function pruebaEvaluaciones() {
  // Reemplazar con un RUT real de la planilla
  const resultado = obtenerEvaluacionesEntrenador("24073947-k");
  Logger.log("Resultado: " + JSON.stringify(resultado, null, 2));
}
*/
