/**
 * Utilidades para Skeleton Loaders
 * Reemplaza "Cargando..." con animaciones profesionales
 */

const SkeletonLoader = {
  // Crear skeleton simple (línea)
  createSkeleton: (width = '100%', height = '20px') => {
    const div = document.createElement('div');
    div.className = 'skeleton';
    div.style.width = width;
    div.style.height = height;
    return div;
  },

  // Crear skeleton de texto (múltiples líneas)
  createTextSkeleton: (lines = 3) => {
    const container = document.createElement('div');
    for (let i = 0; i < lines; i++) {
      const line = document.createElement('div');
      line.className = 'skeleton skeleton-text';
      if (i === lines - 1) line.style.width = '80%'; // última línea más corta
      container.appendChild(line);
    }
    return container;
  },

  // Crear skeleton de ficha completa (avatar + datos)
  createCardSkeleton: () => {
    const box = document.createElement('div');
    box.className = 'skeleton-box';

    // Avatar
    const avatar = document.createElement('div');
    avatar.className = 'skeleton-avatar';
    box.appendChild(avatar);

    // Título
    const title = document.createElement('div');
    title.className = 'skeleton skeleton-title';
    box.appendChild(title);

    // Dos campos
    const fields = document.createElement('div');
    fields.className = 'skeleton-field';
    fields.appendChild(SkeletonLoader.createSkeleton('100%', '24px'));
    fields.appendChild(SkeletonLoader.createSkeleton('100%', '24px'));
    box.appendChild(fields);

    // Tres campos más
    const fields2 = document.createElement('div');
    fields2.className = 'skeleton-field';
    fields2.appendChild(SkeletonLoader.createSkeleton('100%', '24px'));
    fields2.appendChild(SkeletonLoader.createSkeleton('100%', '24px'));
    box.appendChild(fields2);

    return box;
  },

  // Mostrar skeleton en elemento específico
  show: (elementId) => {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.innerHTML = '';
    el.appendChild(SkeletonLoader.createCardSkeleton());
    el.style.display = 'block';
  },

  // Mostrar skeleton de texto en elemento
  showText: (elementId, lines = 3) => {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.innerHTML = '';
    el.appendChild(SkeletonLoader.createTextSkeleton(lines));
    el.style.display = 'block';
  },

  // Mostrar skeleton de grid (para listados)
  showGrid: (elementId, itemCount = 6) => {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.innerHTML = '';

    const grid = document.createElement('div');
    grid.className = 'skeleton-grid';

    for (let i = 0; i < itemCount; i++) {
      const item = document.createElement('div');
      item.className = 'skeleton';
      item.style.height = '100px';
      grid.appendChild(item);
    }

    el.appendChild(grid);
    el.style.display = 'block';
  },

  // Ocultar skeleton y mostrar contenido real
  hide: (elementId) => {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.innerHTML = '';
    el.style.display = 'none';
  },

  // Reemplazar "Cargando..." con skeleton en elemento
  replace: (elementId) => {
    const el = document.getElementById(elementId);
    if (!el) return;

    // Guardar elemento original si existe
    el.dataset.originalContent = el.innerHTML;

    // Mostrar skeleton
    el.innerHTML = '';
    el.appendChild(SkeletonLoader.createCardSkeleton());
    el.style.display = 'block';
  },

  // Restaurar contenido original
  restore: (elementId) => {
    const el = document.getElementById(elementId);
    if (!el) return;

    if (el.dataset.originalContent) {
      el.innerHTML = el.dataset.originalContent;
    }
  }
};

/**
 * Ejemplos de uso:
 *
 * // Antes de fetch
 * SkeletonLoader.show('result-container');
 *
 * // Cuando datos llegan
 * fetch('/api/jugador/123')
 *   .then(r => r.json())
 *   .then(data => {
 *     document.getElementById('result-container').innerHTML = renderData(data);
 *   })
 *   .catch(err => {
 *     document.getElementById('result-container').innerHTML = '<p>Error cargando datos</p>';
 *   });
 */
