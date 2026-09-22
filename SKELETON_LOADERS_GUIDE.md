# Skeleton Loaders - Guía de Implementación

## ¿Qué son?
Placeholder animados que mejoran la percepción de velocidad mientras se carga contenido. Reemplazan "Cargando..." con animaciones profesionales.

## Clases CSS Disponibles

### Básico
```html
<!-- Línea de esqueleto simple -->
<div class="skeleton" style="width: 100%; height: 20px;"></div>

<!-- Texto de esqueleto -->
<div class="skeleton skeleton-text"></div>

<!-- Título de esqueleto -->
<div class="skeleton skeleton-title"></div>
```

### Componentes
```html
<!-- Caja de esqueleto -->
<div class="skeleton-box">
  <div class="skeleton skeleton-title"></div>
  <div class="skeleton skeleton-text"></div>
  <div class="skeleton skeleton-text"></div>
</div>

<!-- Avatar (círculo) -->
<div class="skeleton-avatar"></div>

<!-- Campo (dos columnas) -->
<div class="skeleton-field">
  <div class="skeleton"></div>
  <div class="skeleton"></div>
</div>

<!-- Grid de elementos -->
<div class="skeleton-grid">
  <div class="skeleton"></div>
  <div class="skeleton"></div>
  <div class="skeleton"></div>
</div>
```

## Ejemplo Completo - Ficha Jugador

```html
<!-- ANTES: Mostrar cuando comienza la carga -->
<div id="skeleton-ficha" class="skeleton-box">
  <div class="skeleton skeleton-avatar"></div>
  <div class="skeleton skeleton-title"></div>
  
  <div class="skeleton-field">
    <div class="skeleton"></div>
    <div class="skeleton"></div>
  </div>
  
  <div class="skeleton-field">
    <div class="skeleton"></div>
    <div class="skeleton"></div>
  </div>
  
  <div class="skeleton-grid">
    <div class="skeleton"></div>
    <div class="skeleton"></div>
    <div class="skeleton"></div>
  </div>
</div>

<!-- DESPUÉS: Mostrar cuando se carga -->
<div id="ficha-real" style="display:none">
  <!-- Contenido real de la ficha -->
</div>
```

## JavaScript - Cómo Implementar

```javascript
// 1. Mostrar skeleton cuando comienza la carga
document.getElementById('skeleton-ficha').style.display = 'block';
document.getElementById('ficha-real').style.display = 'none';

// 2. Cuando datos llegan, ocultar skeleton y mostrar contenido
fetch('/api/jugador/123')
  .then(r => r.json())
  .then(data => {
    // Actualizar contenido real
    document.getElementById('ficha-real').innerHTML = renderFicha(data);
    
    // Cambiar visibilidad
    document.getElementById('skeleton-ficha').style.display = 'none';
    document.getElementById('ficha-real').style.display = 'block';
  })
  .catch(err => {
    // Mostrar error
    document.getElementById('skeleton-ficha').style.display = 'none';
    document.getElementById('error-box').style.display = 'block';
  });
```

## Casos de Uso

### Portal Apoderado
- [ ] Carga de ficha jugador
- [ ] Carga de partidos
- [ ] Carga de fotos/videos
- [ ] Carga de planificaciones
- [ ] Carga de calendario

### Portal Entrenador
- [ ] Carga de resultados búsqueda
- [ ] Carga de reporte asistencia
- [ ] Carga de planificaciones
- [ ] Carga de evaluaciones

## Ventajas

✅ **Mejor UX** - Interfaz más responsiva
✅ **Profesional** - Aspecto moderno y pulido
✅ **Accesible** - Compatible con focus-visible
✅ **Rápido** - Solo CSS, sin JavaScript pesado
✅ **Compatible** - Funciona en todos los navegadores modernos

## Personalización

### Cambiar velocidad de animación
```css
.skeleton {
  animation: skeleton-loading 2s infinite; /* Cambiar 1.5s a 2s */
}
```

### Cambiar gradiente
```css
.skeleton {
  background: linear-gradient(90deg,#1a1a1e 0%,#2a2a30 50%,#1a1a1e 100%);
}
```

### Cambiar altura
```html
<div class="skeleton" style="height: 40px;"></div>
```

---

## Status: Implementado ✅

- ✅ Estilos CSS agregados a ambos portales
- ⏳ Implementación en JavaScript (próximo paso)
- ⏳ Testing en navegador (próximo paso)
