# Skeleton Loaders - Ejemplos de Implementación

## 📋 Tabla de Contenidos
1. [Portal Apoderado](#portal-apoderado)
2. [Portal Entrenador](#portal-entrenador)
3. [Integración General](#integración-general)

---

## Portal Apoderado

### 1. Ficha del Jugador

**Antes (actual):**
```html
<div id="ficha-result">
  <div class="loader show"><div class="spin"></div><span>Cargando…</span></div>
</div>
```

**Después (con skeleton loaders):**
```html
<div id="ficha-result"></div>

<script>
// Mostrar skeleton cuando comienza búsqueda
SkeletonLoader.show('ficha-result');

// Cuando datos llegan del API
fetch('/api/jugador/123')
  .then(r => r.json())
  .then(data => {
    // Renderizar contenido real
    document.getElementById('ficha-result').innerHTML = `
      <div style="padding: 20px;">
        <img src="${data.foto}" alt="${data.nombre}">
        <h2>${data.nombre}</h2>
        <p>RUT: ${data.rut}</p>
        <p>Posición: ${data.posicion}</p>
      </div>
    `;
  })
  .catch(err => {
    document.getElementById('ficha-result').innerHTML = 
      '<p class="error">Error cargando ficha</p>';
  });
</script>
```

### 2. Listado de Partidos

**Antes:**
```html
<div class="loader show"><div class="spin"></div><span>Cargando partidos…</span></div>
```

**Después:**
```html
<div id="partidos-skeleton"></div>

<script>
// Mostrar grid de skeleton
SkeletonLoader.showGrid('partidos-skeleton', 4);

// Cargar datos
fetch('/api/partidos')
  .then(r => r.json())
  .then(partidos => {
    let html = '';
    partidos.forEach(p => {
      html += `<div class="partido-card">
        <h3>${p.rival}</h3>
        <p>${p.fecha}</p>
        <p>Resultado: ${p.resultado}</p>
      </div>`;
    });
    document.getElementById('partidos-skeleton').innerHTML = html;
  });
</script>
```

### 3. Búsqueda de Jugador

**Ubicación:** Línea 879-882 en `PORTAL APODERADO/index.html`

**Antes:**
```html
<input type="text" id="search-input" placeholder="Buscar...">
<p class="search-hint" id="hint">Cargando base de jugadores…</p>
```

**Después:**
```html
<input type="text" id="search-input" placeholder="Buscar..." aria-label="Buscar jugador por RUT o nombre">
<p class="search-hint" id="hint">Base de jugadores lista</p>

<div id="search-results"></div>

<script>
// Cuando usuario busca
document.getElementById('search-input').addEventListener('input', function(e) {
  const query = e.target.value;
  
  if (!query) {
    document.getElementById('search-results').innerHTML = '';
    return;
  }
  
  // Mostrar skeleton mientras busca
  SkeletonLoader.showText('search-results', 3);
  
  // Simular búsqueda (adaptar a tu API real)
  setTimeout(() => {
    const results = searchJugadores(query);
    document.getElementById('search-results').innerHTML = 
      results.map(j => `<div>${j.nombre} (${j.rut})</div>`).join('');
  }, 500);
});
</script>
```

---

## Portal Entrenador

### 1. Búsqueda de Jugador

**Ubicación:** Alrededor de línea 636 en `index.html`

**Antes:**
```html
<p class="search-hint" id="hint">Cargando base de jugadores…</p>
```

**Después:**
```html
<p class="search-hint" id="hint" id="loader-hint"></p>

<script>
function initSearchLoader() {
  const hint = document.getElementById('loader-hint');
  
  // Mostrar skeleton de texto
  SkeletonLoader.showText('search-results', 3);
  
  // Cuando datos cargan
  loadSearchData().then(() => {
    hint.textContent = 'Base de jugadores lista';
    hint.style.display = 'none';
  });
}

initSearchLoader();
</script>
```

### 2. Reporte de Asistencia

**Ubicación:** Línea 807 en `index.html`

**Antes:**
```html
<div class="loader show"><div class="spin"></div><span>Cargando informe…</span></div>
```

**Después:**
```html
<div id="report-skeleton"></div>

<script>
function loadAsistenciaReport() {
  // Mostrar skeleton
  SkeletonLoader.showGrid('report-skeleton', 8);
  
  // Fetch del reporte
  fetch('/api/asistencia/reporte')
    .then(r => r.json())
    .then(data => {
      // Generar tabla real
      const table = generateAsistenciaTable(data);
      document.getElementById('report-skeleton').innerHTML = table;
    });
}

loadAsistenciaReport();
</script>
```

### 3. Sí/No Dinámicos

**Ubicación:** Línea 1102 en `index.html`

**Antes:**
```javascript
el.innerHTML = '<div class="loader show"><div class="spin"></div><span>Cargando informe…</span></div>';
```

**Después:**
```javascript
el.innerHTML = '';
SkeletonLoader.show('dynamic-content');

// Cuando datos cargan
setTimeout(() => {
  el.innerHTML = `<button>${data.nombre} - Sí</button>
                   <button>${data.nombre} - No</button>`;
}, 1000);
```

---

## Integración General

### 1. Agregar archivo JavaScript a HTML

En `<head>`:
```html
<script src="skeleton-loader-utils.js"></script>
```

### 2. Patrón General de Uso

```javascript
// 1. Mostrar skeleton
SkeletonLoader.show('element-id');

// 2. Cargar datos
fetch('/api/data')
  .then(r => r.json())
  .then(data => {
    // 3. Mostrar contenido real
    document.getElementById('element-id').innerHTML = renderContent(data);
  })
  .catch(err => {
    // 4. Mostrar error si falla
    document.getElementById('element-id').innerHTML = 
      '<p class="error">Error cargando datos</p>';
  });
```

### 3. Función Helper para simplificar

```javascript
async function loadWithSkeleton(elementId, apiUrl, renderFn) {
  try {
    SkeletonLoader.show(elementId);
    const response = await fetch(apiUrl);
    const data = await response.json();
    document.getElementById(elementId).innerHTML = renderFn(data);
  } catch (err) {
    document.getElementById(elementId).innerHTML = 
      '<p class="error">Error: ' + err.message + '</p>';
  }
}

// Uso
loadWithSkeleton('result', '/api/jugador/123', (data) => `
  <h2>${data.nombre}</h2>
  <p>RUT: ${data.rut}</p>
`);
```

---

## 🎯 Checklist de Implementación

### Portal Apoderado
- [ ] Agregar script a `<head>` en línea ~30
- [ ] Reemplazar "Cargando ficha..." con `SkeletonLoader.show('ficha-result')`
- [ ] Reemplazar "Cargando partidos..." con `SkeletonLoader.showGrid()`
- [ ] Reemplazar "Cargando álbumes..." con `SkeletonLoader.showText()`
- [ ] Reemplazar "Cargando fotos..." con `SkeletonLoader.show()`

### Portal Entrenador
- [ ] Agregar script a `<head>` en línea ~30
- [ ] Reemplazar "Cargando informe..." con `SkeletonLoader.showGrid()`
- [ ] Reemplazar "Cargando jugadores..." con `SkeletonLoader.showText()`
- [ ] Reemplazar "Cargando datos..." con `SkeletonLoader.show()`

### Testing
- [ ] Verificar en navegador en modo offline
- [ ] Verificar en conexión lenta (throttle 3G)
- [ ] Probar en mobile
- [ ] Validar accesibilidad (pantalla larga, teclado)

---

## 📦 Archivos necesarios

```
ACCION_FUTBOL_PROYECTO/
├── skeleton-loader-utils.js          ← Utilidades reutilizables
├── index.html                         ← Portal Entrenador (incluir script)
├── PORTAL APODERADO/
│   └── index.html                     ← Portal Apoderado (incluir script)
└── SKELETON_LOADERS_GUIDE.md          ← Documentación CSS
```
