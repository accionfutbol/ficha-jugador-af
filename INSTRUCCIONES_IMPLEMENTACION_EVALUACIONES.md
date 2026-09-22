# 📋 INSTRUCCIONES: Implementación de Evaluaciones del Entrenador

**Estado:** Fase final - Implementación en Vercel + Google Apps Script

---

## 📌 Resumen Rápido

Se han preparado **3 archivos** que deben ser integrados:

1. ✅ **Portal Apoderado** (`PORTAL APODERADO/index.html`) — **HTML + CSS ya agregados**
2. ✅ **Portal Entrenador** (`Portal Entrenador/index.html`) — **HTML + CSS ya agregados**  
3. ⏳ **JavaScript** (`JAVASCRIPT_EVALUACIONES.js`) — Requiere integración manual
4. ⏳ **Google Apps Script** (`GOOGLE_APPS_SCRIPT_CODIGO.gs`) — Requiere copia manual

---

## 🔧 PASO 1: Agregar JavaScript a ambos Portales

El archivo `JAVASCRIPT_EVALUACIONES.js` contiene 3 funciones:
- `cargarEvaluacionesEntrenador(rut)` — Fetch desde Google Apps Script
- `renderEvaluacionSemestre(semestre, datos)` — Renderizar notas + progreso
- `mostrarProgresion(sem1, sem2)` — Mostrar mejora entre semestres

**Instrucción:** Copiar todo el contenido de `JAVASCRIPT_EVALUACIONES.js` y pegarlo en:

### Portal Apoderado:
- Archivo: `Portal Apoderado/index.html` (repo `ficha-jugador-af`)
- Ubicación: Antes de `</body>` (al final del archivo)
- Búsqueda: Encontrar la última línea `</body>` y agregar justo antes

### Portal Entrenador:
- Archivo: `Portal Entrenador/index.html` (repo `Portal-Entrenador`)
- Ubicación: Antes de `</body>` (al final del archivo)
- Búsqueda: Encontrar la última línea `</body>` y agregar justo antes

---

## 🔗 PASO 2: Encontrar dónde se carga la ficha del jugador

Una vez pegado el JavaScript, necesitas **invocar** la función en el lugar correcto.

Busca en el HTML de ambos portales una sección donde se muestren los datos del jugador después de que esté seleccionado (usualmente hay una función como `showFicha(p)`, `loadFicha(p)`, o similar).

**En esa función,** agrega estas líneas DESPUÉS de que se renderiza el HTML de la ficha:

```javascript
// Cargar evaluaciones del entrenador cuando se muestre la ficha
if (p && p.rut) {
  cargarEvaluacionesEntrenador(p.rut);
}
```

**Ejemplos de lugares comunes:**
- Dentro del evento `onchange` o `click` que dispara la carga de ficha
- Al final de una función `displayPlayerCard()` o similar
- En el callback de un fetch que trae datos del jugador

---

## 🗂️ PASO 3: Google Apps Script (Backend)

El archivo `GOOGLE_APPS_SCRIPT_CODIGO.gs` contiene la función **`obtenerEvaluacionesEntrenador(rut)`**.

### Ubicación en Google Apps Script:

**Proyecto:** ASISTENCIA (en Google Drive)  
**Archivo:** `Fichas_SEGURO.gs`  
**Acción:** Copiar la función completa y pegarla en ese archivo

### Integración en doPost():

En la función `doPost()` del mismo archivo, agregar este bloque en el switch/if de acciones:

```javascript
if (params.accion === 'obtenerEvaluacionesEntrenador') {
  const resultado = obtenerEvaluacionesEntrenador(params.rut);
  return ContentService.createTextOutput(JSON.stringify(resultado))
    .setMimeType(ContentService.MimeType.JSON);
}
```

### URL a actualizar en JavaScript:

En `JAVASCRIPT_EVALUACIONES.js`, línea 13:

```javascript
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwa53UNt6Q1MmxCt9g8EGB63Hu_r-UqzUQ1Uh51YWfe5ZuZCFTSVenPFLUGOVnghbIt/exec";
```

(Es la URL estable que ya usan las apps del entrenador)

### Actualizar ID de planilla en Google Apps Script:

En `GOOGLE_APPS_SCRIPT_CODIGO.gs`, línea 18, reemplazar:

```javascript
const PLANILLA_ID = "1s90v7MoQ3tHLBYnOaoq3SsArNKeNQqbxiI2bCcmPoKA"; // ← ID de EVALUACIONES 2026
```

---

## 📱 Pasos finales:

### 1. Copiar cambios a GitHub:

**Portal Apoderado:**
```bash
cd ficha-jugador-af
git add index.html
git commit -m "agregar: evaluaciones del entrenador en ficha jugador"
git push
```

**Portal Entrenador:**
```bash
cd Portal-Entrenador
git add index.html
git commit -m "agregar: evaluaciones del entrenador en portal"
git push
```

### 2. Re-desplegar en Google Apps Script:

En el proyecto ASISTENCIA:
- Implementar → Administrar implementaciones → deployment `AKfycbwa53` → ✏️
- Versión: **"Versión nueva"**
- Implementar

### 3. Verificar en Vercel:

Ambos portales se re-desplegarán automáticamente en ~1 minuto.

Probar cargando una ficha de jugador y confirmando que aparezcan las evaluaciones.

---

## 🎨 CSS que ya está incluido:

El CSS para la sección de evaluaciones ya fue agregado a ambos HTML. Incluye:

- `.section-evaluaciones-entrenador` — Contenedor principal
- `.semestre-card` — Card por semestre
- `.eval-metric` — Métrica individual (técnica/actitud)
- `.eval-bar` — Barra de progreso
- `.eval-promedio` — Sección de promedio final
- `.eval-observacion` — Comentario del entrenador
- `.eval-progresion` — Comparativa entre semestres

Todos con tema oscuro y gradiente rosa (#ff2e93).

---

## ✅ Checklist de Implementación:

- [ ] Copiar `JAVASCRIPT_EVALUACIONES.js` a Portal Apoderado antes de `</body>`
- [ ] Copiar `JAVASCRIPT_EVALUACIONES.js` a Portal Entrenador antes de `</body>`
- [ ] Encontrar función que carga ficha del jugador en ambos portales
- [ ] Agregar llamada a `cargarEvaluacionesEntrenador(p.rut)` en ambos portales
- [ ] Copiar función `obtenerEvaluacionesEntrenador()` a `Fichas_SEGURO.gs`
- [ ] Integrar `obtenerEvaluacionesEntrenador` en `doPost()` de Google Apps Script
- [ ] Verificar URL de Google Apps Script en JavaScript
- [ ] Verificar ID de planilla en Google Apps Script
- [ ] Re-desplegar Google Apps Script (Versión nueva)
- [ ] Pushear cambios a GitHub (ambos repos)
- [ ] Verificar deployment en Vercel (~1 min)
- [ ] Probar cargando ficha con evaluaciones

---

## 🆘 Troubleshooting:

**"No se cargan las evaluaciones"**
- Verificar console del navegador (F12) para ver errores
- Confirmar que URL de Google Apps Script es correcta
- Verificar que la función está en `doPost()` con acción correcta

**"Error CORS"**
- Google Apps Script debe tener `ContentService.setMimeType(JSON)`
- Verificar que el return está en `doPost()`, no en una función separada

**"Datos vacíos o —"**
- Verificar que el jugador existe en la planilla NOTAS EV. TECN 2026
- Confirmar que RUT está en columna A y coincide exactamente
- Verificar que columnas (P, V, X, Y, AA, AC, AE, AG) tienen datos

---

**Última actualización:** 2026-09-22  
**Responsable:** Claude Code  
**Estado:** Listo para implementación manual
