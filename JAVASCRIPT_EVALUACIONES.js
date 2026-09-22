// ═══════════════════════════════════════════════════════════════════
// JAVASCRIPT: Cargar y Renderizar Evaluaciones del Entrenador
// UBICACIÓN: Agregar antes de </body> en ambos portales
// ═══════════════════════════════════════════════════════════════════

/**
 * Cargar evaluaciones del entrenador desde Google Apps Script
 * Requiere que el RUT esté disponible en una variable global: p.rut
 */
async function cargarEvaluacionesEntrenador(rut) {
  try {
    // URL del Google Apps Script - ACTUALIZAR CON TU URL REAL
    const APPS_SCRIPT_URL = "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec";

    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({
        accion: 'obtenerEvaluacionesEntrenador',
        rut: rut
      })
    });

    const data = await response.json();

    if (!data || !data.primerSemestre) {
      console.log('Sin evaluaciones del entrenador aún');
      return;
    }

    // Renderizar 1er Semestre
    if (data.primerSemestre.notaTecnica) {
      renderEvaluacionSemestre(1, data.primerSemestre);
    }

    // Renderizar 2do Semestre
    if (data.segundoSemestre.notaTecnica) {
      renderEvaluacionSemestre(2, data.segundoSemestre);

      // Mostrar progresión si ambos semestres existen
      mostrarProgresion(data.primerSemestre, data.segundoSemestre);
    }

  } catch (error) {
    console.error('Error cargando evaluaciones:', error);
  }
}

/**
 * Renderizar datos de un semestre específico
 */
function renderEvaluacionSemestre(semestre, datos) {
  const sem = semestre;

  // Técnica Táctica
  const tecnica = parseFloat(datos.notaTecnica) || 0;
  const tecnicaEl = document.getElementById(`eval-${sem}-tecnica`);
  const tecnicaBarEl = document.getElementById(`eval-${sem}-tecnica-bar`);

  if (tecnicaEl) {
    tecnicaEl.textContent = tecnica.toFixed(1);
    if (tecnicaBarEl) tecnicaBarEl.style.width = `${(tecnica / 10) * 100}%`;
  }

  // Actitud
  const actitud = parseFloat(datos.notaActitud) || 0;
  const actitudEl = document.getElementById(`eval-${sem}-actitud`);
  const actitudBarEl = document.getElementById(`eval-${sem}-actitud-bar`);

  if (actitudEl) {
    actitudEl.textContent = actitud.toFixed(1);
    if (actitudBarEl) actitudBarEl.style.width = `${(actitud / 10) * 100}%`;
  }

  // Promedio
  const promedio = parseFloat(datos.promedio) || 0;
  const promedioEl = document.getElementById(`eval-${sem}-promedio`);
  const promedioBarEl = document.getElementById(`eval-${sem}-promedio-bar`);

  if (promedioEl) {
    promedioEl.textContent = promedio.toFixed(2);
    if (promedioBarEl) promedioBarEl.style.width = `${(promedio / 10) * 100}%`;
  }

  // Observación
  const obsEl = document.getElementById(`eval-${sem}-observacion`);
  if (obsEl) {
    obsEl.textContent = datos.observacion || "Sin comentarios";
  }
}

/**
 * Mostrar progresión entre semestres
 */
function mostrarProgresion(sem1, sem2) {
  const progDiv = document.getElementById('eval-progresion');
  if (!progDiv) return;

  progDiv.style.display = 'block';

  const tecnica1 = parseFloat(sem1.notaTecnica) || 0;
  const tecnica2 = parseFloat(sem2.notaTecnica) || 0;
  const diferenciaTecnica = tecnica2 - tecnica1;

  const actitud1 = parseFloat(sem1.notaActitud) || 0;
  const actitud2 = parseFloat(sem2.notaActitud) || 0;
  const diferenciaActitud = actitud2 - actitud1;

  // Técnica
  const tecnicaEl = document.getElementById('progresion-tecnica');
  if (tecnicaEl) {
    tecnicaEl.textContent = `${diferenciaTecnica >= 0 ? '+' : ''}${diferenciaTecnica.toFixed(1)}`;
    tecnicaEl.className = diferenciaTecnica > 0 ? 'progresion-valor mejora' :
                          diferenciaTecnica < 0 ? 'progresion-valor decline' :
                          'progresion-valor';
  }

  // Actitud
  const actitudEl = document.getElementById('progresion-actitud');
  if (actitudEl) {
    actitudEl.textContent = `${diferenciaActitud >= 0 ? '+' : ''}${diferenciaActitud.toFixed(1)}`;
    actitudEl.className = diferenciaActitud > 0 ? 'progresion-valor mejora' :
                          diferenciaActitud < 0 ? 'progresion-valor decline' :
                          'progresion-valor';
  }
}

// ═══════════════════════════════════════════════════════════════════
// LLAMADA INICIAL - Agregar esto DENTRO de la función que carga la ficha
// ═══════════════════════════════════════════════════════════════════

/*
  Buscar dónde se está mostrando la ficha del jugador (después de que
  el jugador es seleccionado) y agregar esta línea:

  if (p && p.rut) {
    cargarEvaluacionesEntrenador(p.rut);
  }

  Por ejemplo, si existe una función showFicha(p) donde p es el jugador,
  agregaría esto DENTRO de esa función después de que se renderiza el HTML.
*/
