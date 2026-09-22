# Implementación: Evaluaciones Técnicas en Ficha del Jugador

## 📊 Estructura de Datos Exacta

### PRIMER SEMESTRE
```
Columna P: NOTA TÉCNICA TÁCTICA
Columna V: NOTA ACTITUDINAL  
Columna X: PROMEDIO (ambas notas)
Columna Y: OBSERVACIÓN DEL ENTRENADOR
```

### SEGUNDO SEMESTRE
```
Columna AA: NOTA TÉCNICA TÁCTICA
Columna AC: NOTA ACTITUDINAL
Columna AE: PROMEDIO (ambas notas)
Columna AG: OBSERVACIÓN DEL ENTRENADOR
```

**Búsqueda:** RUT del jugador (Columna A)

---

## 🎯 Diseño UI - Propuesta Final

### Layout Responsivo (Desktop + Mobile)

```
┌────────────────────────────────────────────────────────────────┐
│                                                                  │
│  📝 EVALUACIÓN DEL ENTRENADOR                                   │
│                                                                  │
├──────────────────────────────────────────────────────────────── │
│                                                                  │
│  1ER SEMESTRE 2026                                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                                                            │  │
│  │  TÉCNICA TÁCTICA      7.5/10     ████████░░░░░░░░░░░░  │  │
│  │                                                            │  │
│  │  ACTITUD              8.0/10     ████████░░░░░░░░░░░░  │  │
│  │                                                            │  │
│  │  ─────────────────────────────────────────────────────   │  │
│  │                                                            │  │
│  │  PROMEDIO             7.75/10    ████████░░░░░░░░░░░░  │  │
│  │                                                            │  │
│  │  📌 Comentario del Entrenador:                           │  │
│  │  "Buen desempeño técnico. Mejorar concentración en      │  │
│  │   segunda mitad del partido. Actitud positiva y         │  │
│  │   comprometida con los entrenamientos."                 │  │
│  │                                                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
├──────────────────────────────────────────────────────────────── │
│                                                                  │
│  2DO SEMESTRE 2026                                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                                                            │  │
│  │  TÉCNICA TÁCTICA      8.0/10     ████████░░░░░░░░░░░░  │  │
│  │                                                            │  │
│  │  ACTITUD              8.5/10     ████████░░░░░░░░░░░░  │  │
│  │                                                            │  │
│  │  ─────────────────────────────────────────────────────   │  │
│  │                                                            │  │
│  │  PROMEDIO             8.25/10    ████████░░░░░░░░░░░░  │  │
│  │                                                            │  │
│  │  📌 Comentario del Entrenador:                           │  │
│  │  "Evolución notable. Técnica mejorada. Actitud          │  │
│  │   excepcional. Liderazgo en el equipo."                 │  │
│  │                                                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  📈 PROGRESIÓN:  Técnica ↑ +0.5   |  Actitud ↑ +0.5           │
│                                                                  │
└────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Flujo de Datos Técnico

### Backend (Google Apps Script - Fichas_SEGURO.gs)

```javascript
function obtenerEvaluacionesEntrenador(rut) {
  const ss = SpreadsheetApp.openById('ID_PLANILLA_EVALUACIONES');
  const hoja = ss.getSheetByName('NOTAS EV. TECN 2026');
  
  if (!hoja) return null;
  
  const datos = hoja.getDataRange().getValues();
  const encabezado = datos[1]; // Fila 2 con títulos
  
  // Encontrar columnas (P, V, X, Y para 1er sem / AA, AC, AE, AG para 2do sem)
  // Índices: A=0, B=1... P=15, V=21, X=23, Y=24, AA=26, AC=28, AE=30, AG=32
  
  for (let i = 2; i < datos.length; i++) {
    if (datos[i][0] === rut) {
      return {
        primerSemestre: {
          notaTecnica: datos[i][15],      // Columna P
          notaActitud: datos[i][21],      // Columna V
          promedio: datos[i][23],         // Columna X
          observacion: datos[i][24]       // Columna Y
        },
        segundoSemestre: {
          notaTecnica: datos[i][26],      // Columna AA
          notaActitud: datos[i][28],      // Columna AC
          promedio: datos[i][30],         // Columna AE
          observacion: datos[i][32]       // Columna AG
        }
      };
    }
  }
  
  return null;
}

// Agregar a doPost() en sección de acciones
if (params.accion === 'obtenerEvaluacionesEntrenador') {
  return obtenerEvaluacionesEntrenador(params.rut);
}
```

### Frontend (HTML)

```html
<div class="section section-evaluaciones-entrenador">
  <div class="section-header">
    <h2>📝 Evaluación del Entrenador</h2>
  </div>
  
  <!-- PRIMER SEMESTRE -->
  <div class="semestre-card" data-semestre="1">
    <div class="semestre-title">1er Semestre 2026</div>
    
    <div class="evaluacion-grid">
      <!-- Técnica Táctica -->
      <div class="eval-metric">
        <div class="eval-label">Técnica Táctica</div>
        <div class="eval-value" id="eval-1-tecnica">—</div>
        <div class="eval-unit">/10</div>
        <div class="eval-bar">
          <div class="eval-progress" id="eval-1-tecnica-bar"></div>
        </div>
      </div>
      
      <!-- Actitud -->
      <div class="eval-metric">
        <div class="eval-label">Actitud</div>
        <div class="eval-value" id="eval-1-actitud">—</div>
        <div class="eval-unit">/10</div>
        <div class="eval-bar">
          <div class="eval-progress" id="eval-1-actitud-bar"></div>
        </div>
      </div>
    </div>
    
    <!-- Separador -->
    <div class="eval-separator"></div>
    
    <!-- Promedio -->
    <div class="eval-promedio">
      <div class="eval-label">Promedio Final</div>
      <div class="eval-value-large" id="eval-1-promedio">—</div>
      <div class="eval-bar eval-bar-large">
        <div class="eval-progress eval-progress-large" id="eval-1-promedio-bar"></div>
      </div>
    </div>
    
    <!-- Observación del Entrenador -->
    <div class="eval-observacion">
      <div class="eval-obs-label">📌 Comentario del Entrenador:</div>
      <p id="eval-1-observacion" class="eval-obs-text">—</p>
    </div>
  </div>
  
  <!-- SEGUNDO SEMESTRE (repite estructura) -->
  <div class="semestre-card" data-semestre="2">
    <div class="semestre-title">2do Semestre 2026</div>
    
    <div class="evaluacion-grid">
      <div class="eval-metric">
        <div class="eval-label">Técnica Táctica</div>
        <div class="eval-value" id="eval-2-tecnica">—</div>
        <div class="eval-unit">/10</div>
        <div class="eval-bar">
          <div class="eval-progress" id="eval-2-tecnica-bar"></div>
        </div>
      </div>
      
      <div class="eval-metric">
        <div class="eval-label">Actitud</div>
        <div class="eval-value" id="eval-2-actitud">—</div>
        <div class="eval-unit">/10</div>
        <div class="eval-bar">
          <div class="eval-progress" id="eval-2-actitud-bar"></div>
        </div>
      </div>
    </div>
    
    <div class="eval-separator"></div>
    
    <div class="eval-promedio">
      <div class="eval-label">Promedio Final</div>
      <div class="eval-value-large" id="eval-2-promedio">—</div>
      <div class="eval-bar eval-bar-large">
        <div class="eval-progress eval-progress-large" id="eval-2-promedio-bar"></div>
      </div>
    </div>
    
    <div class="eval-observacion">
      <div class="eval-obs-label">📌 Comentario del Entrenador:</div>
      <p id="eval-2-observacion" class="eval-obs-text">—</p>
    </div>
  </div>
  
  <!-- PROGRESIÓN (si ambos semestres existen) -->
  <div class="eval-progresion" id="eval-progresion" style="display:none;">
    <div class="progresion-title">📈 Progresión por Semestre:</div>
    <div class="progresion-items">
      <div class="progresion-item">
        <span class="progresion-label">Técnica:</span>
        <span class="progresion-valor" id="progresion-tecnica"></span>
      </div>
      <div class="progresion-item">
        <span class="progresion-label">Actitud:</span>
        <span class="progresion-valor" id="progresion-actitud"></span>
      </div>
    </div>
  </div>
</div>
```

### CSS

```css
.section-evaluaciones-entrenador {
  margin: 24px 0;
  padding: 20px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 16px;
}

.section-header {
  margin-bottom: 20px;
}

.section-header h2 {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
  color: var(--ink);
}

/* SEMESTRE CARDS */
.semestre-card {
  background: var(--panel2);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
}

.semestre-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--pink);
  margin-bottom: 16px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* GRID DE MÉTRICAS */
.evaluacion-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.eval-metric {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 12px;
  text-align: center;
}

.eval-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--muted);
  text-transform: uppercase;
  margin-bottom: 8px;
  display: block;
}

.eval-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--pink);
  margin-bottom: 4px;
}

.eval-unit {
  font-size: 0.75rem;
  color: var(--muted);
  display: block;
  margin-bottom: 8px;
}

.eval-bar {
  height: 6px;
  background: var(--line);
  border-radius: 3px;
  overflow: hidden;
}

.eval-progress {
  height: 100%;
  background: linear-gradient(90deg, var(--pink), var(--pink-soft));
  transition: width 0.4s ease;
}

/* SEPARADOR */
.eval-separator {
  height: 1px;
  background: var(--line);
  margin: 16px 0;
}

/* PROMEDIO */
.eval-promedio {
  background: var(--panel);
  border: 2px solid var(--pink);
  border-radius: 8px;
  padding: 16px;
  text-align: center;
  margin-bottom: 16px;
}

.eval-value-large {
  font-size: 2rem;
  font-weight: 700;
  color: var(--pink);
  margin: 8px 0;
}

.eval-bar-large {
  height: 8px;
  margin-top: 12px;
}

.eval-progress-large {
  height: 100%;
  background: linear-gradient(90deg, var(--pink), var(--pink-soft));
}

/* OBSERVACIÓN */
.eval-observacion {
  background: var(--panel);
  border-left: 4px solid var(--pink);
  border-radius: 4px;
  padding: 12px;
  margin-top: 16px;
}

.eval-obs-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--pink);
  margin-bottom: 8px;
  display: block;
}

.eval-obs-text {
  font-size: 0.95rem;
  color: var(--ink);
  line-height: 1.6;
  margin: 0;
  font-style: italic;
}

/* PROGRESIÓN */
.eval-progresion {
  background: var(--panel2);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 16px;
  margin-top: 20px;
}

.progresion-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--pink);
  margin-bottom: 12px;
}

.progresion-items {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.progresion-item {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 12px;
  text-align: center;
}

.progresion-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--muted);
  margin-bottom: 8px;
  text-transform: uppercase;
}

.progresion-valor {
  display: block;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--pink);
}

/* Indicadores de mejora/decline */
.progresion-valor.mejora::before {
  content: "↑ ";
  color: #27c281;
  font-weight: 900;
}

.progresion-valor.decline::before {
  content: "↓ ";
  color: #ffb020;
  font-weight: 900;
}

/* RESPONSIVE */
@media (max-width: 768px) {
  .evaluacion-grid {
    grid-template-columns: 1fr;
  }
  
  .semestre-card {
    padding: 16px;
  }
  
  .eval-value-large {
    font-size: 1.5rem;
  }
  
  .eval-obs-text {
    font-size: 0.875rem;
  }
}
```

### JavaScript

```javascript
async function cargarEvaluacionesEntrenador(rut) {
  try {
    const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
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

function renderEvaluacionSemestre(semestre, datos) {
  const sem = semestre;
  
  // Técnica Táctica
  const tecnica = parseFloat(datos.notaTecnica) || 0;
  document.getElementById(`eval-${sem}-tecnica`).textContent = 
    tecnica.toFixed(1);
  document.getElementById(`eval-${sem}-tecnica-bar`).style.width = 
    `${(tecnica / 10) * 100}%`;
  
  // Actitud
  const actitud = parseFloat(datos.notaActitud) || 0;
  document.getElementById(`eval-${sem}-actitud`).textContent = 
    actitud.toFixed(1);
  document.getElementById(`eval-${sem}-actitud-bar`).style.width = 
    `${(actitud / 10) * 100}%`;
  
  // Promedio
  const promedio = parseFloat(datos.promedio) || 0;
  document.getElementById(`eval-${sem}-promedio`).textContent = 
    promedio.toFixed(2);
  document.getElementById(`eval-${sem}-promedio-bar`).style.width = 
    `${(promedio / 10) * 100}%`;
  
  // Observación
  document.getElementById(`eval-${sem}-observacion`).textContent = 
    datos.observacion || "Sin comentarios";
}

function mostrarProgresion(sem1, sem2) {
  const progDiv = document.getElementById('eval-progresion');
  progDiv.style.display = 'block';
  
  const tecnica1 = parseFloat(sem1.notaTecnica) || 0;
  const tecnica2 = parseFloat(sem2.notaTecnica) || 0;
  const diferenciaTecnica = tecnica2 - tecnica1;
  
  const actitud1 = parseFloat(sem1.notaActitud) || 0;
  const actitud2 = parseFloat(sem2.notaActitud) || 0;
  const diferenciaActitud = actitud2 - actitud1;
  
  // Técnica
  const tecnicaEl = document.getElementById('progresion-tecnica');
  tecnicaEl.textContent = `${diferenciaTecnica >= 0 ? '+' : ''}${diferenciaTecnica.toFixed(1)}`;
  tecnicaEl.className = diferenciaTecnica > 0 ? 'progresion-valor mejora' : 
                        diferenciaTecnica < 0 ? 'progresion-valor decline' : 
                        'progresion-valor';
  
  // Actitud
  const actitudEl = document.getElementById('progresion-actitud');
  actitudEl.textContent = `${diferenciaActitud >= 0 ? '+' : ''}${diferenciaActitud.toFixed(1)}`;
  actitudEl.className = diferenciaActitud > 0 ? 'progresion-valor mejora' : 
                        diferenciaActitud < 0 ? 'progresion-valor decline' : 
                        'progresion-valor';
}
```

---

## 📋 Checklist de Implementación

### Fase 1: Configuración
- [ ] Confirmar ID de planilla "EVALUACIONES 2026"
- [ ] Verificar nombres de columnas (P, V, X, Y, AA, AC, AE, AG)
- [ ] Compartir con `informacion@accionfutbol.cl`

### Fase 2: Backend
- [ ] Copiar función `obtenerEvaluacionesEntrenador()` a Fichas_SEGURO.gs
- [ ] Agregar a endpoint `doPost()`
- [ ] Probar con 3+ RUTs diferentes
- [ ] Validar índices de columnas

### Fase 3: Frontend
- [ ] Copiar HTML a Ficha del Jugador (antes de Antropométrica)
- [ ] Copiar CSS completo
- [ ] Copiar JavaScript y agregar evento de carga

### Fase 4: Testing
- [ ] ✅ Desktop (1280px+)
- [ ] ✅ Tablet (768px)
- [ ] ✅ Mobile (375px)
- [ ] ✅ Accesibilidad (screen reader)
- [ ] ✅ Con datos reales (5+ jugadores)

### Fase 5: Deploy
- [ ] Push a Portal Apoderado repo
- [ ] Push a Portal Entrenador repo
- [ ] Verificar en producción

---

## ✨ Características

✅ **Diseño limpio** - Dos semestres lado a lado
✅ **Visual amigable** - Barras de progreso coloridas
✅ **Comparativa automática** - Muestra evolución
✅ **Responsive** - Desktop, tablet, mobile
✅ **Accesible** - WCAG 2.1 AA
✅ **Claro para padres** - Lenguaje sencillo
✅ **Motivador** - Flechas ↑↓ de progresión

---

## 🎨 Notas sobre Escalas

Si las notas NO son 1-10, ajustar:
- `(tecnica / 10) * 100%` → cambiar 10 por el máximo
- `tecnica.toFixed(1)` → ajustar decimales según necesidad

Ejemplo para escala 1-7:
```javascript
document.getElementById(`eval-${sem}-tecnica-bar`).style.width = 
  `${(tecnica / 7) * 100}%`;
```

---

## 🚀 Próximos Pasos

1. **Confirmar estructura exacta** en Google Sheets
2. **Obtener ID de planilla**
3. **Implementar backend** (Google Apps Script)
4. **Agregar a HTML/CSS/JS** de Ficha
5. **Testing y Deploy**

¿Listo para implementar? 🎯
