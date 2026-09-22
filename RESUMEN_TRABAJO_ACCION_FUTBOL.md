# Resumen del trabajo — Acción Fútbol

Registro de todo lo desarrollado en esta conversación, agrupado por portal/sistema.

---

## 1. Portal del Entrenador

**Análisis de Minutaje** (detalles-partidos.html)
- Reporte por sede + categoría: jugadores en torneos, quiénes tienen <200 min, quiénes no están en torneo, conteo de amistosos vs. partidos de torneo.
- "Está en torneo" se toma de la columna AT (TORNEOS) de la Base de Datos Apoderados, no solo de la planilla de partidos.
- Correcciones: función `afNorm2_`→`afNorm_`, filtro de estado (ACTIVO/FULL/NEW; excluye DESACTIVADO) corrigiendo el bug de "DESACTIVADO" que contenía "ACTIV".

**Reporte del Entrenamiento** (asistencia.html)
- Se autocompleta sede, categoría y fecha.
- Muestra Total de jugadores, Asistieron, Faltaron, Justificaron, Lesionados.
- Horario en un solo desplegable (4 opciones), Cantidad de balones, Observación.
- Encargado de reporte + dos "Entrenadores en cancha".
- Guarda en la planilla (pestaña REPORTE DE ENTRENAMIENTO) + botones Copiar y WhatsApp.

**Evaluaciones** (evaluaciones.html)
- Editar por sede + categoría (solo ACTIVO/FULL/NEW).
- Campos con desplegable (Nivel, Sub-nivel, posiciones, pie, torneos) y notas manuales 1–7.
- Promedio automático de las 3 notas.
- Escalas de evaluación (rúbricas) según Nivel: COMP → "Competitivo a Alto Rendimiento", A.R. → "Alto Rendimiento a Proyecto Profesional", con guía en vivo y escala completa.
- Muestra posición · nivel · sub-nivel bajo el nombre.

**Asistencia**
- Badge de estado junto a cada jugador (ACTIVO, NEW, FULL, DESACTIVADO, LESIONADO, RECESO, CIERRE, SIN ESTADO).
- Observación del entrenador: opción LESIONADO con campo para el motivo; botón renombrado a "OBS".
- Jugadores No Inscritos: formulario que guarda en la pestaña correspondiente.

**Asistencia Senior AM/PM** (integrada en el mismo "Registrar Asistencia")
- Se elige en el desplegable de sede/categoría (SENIOR - AM / SENIOR - PM).
- Marca OK/F, guarda en la planilla "Asistencias AM y PM 2026".
- Muestra a todos con su badge de estado.
- Reconoce fechas guardadas como fecha real (Date) o texto.

**Reporte de Asistencia** (reporte.html)
- Encabezado con total de jugadores; numeración secuencial (1,2,3…).
- Badge de estado en la tabla y en las secciones No asistieron / Justificados / Lesionados.

---

## 2. Portal del Jugador / Apoderado

**Segmentación del menú** (PRO / SENIORS / KIDS)
- Menú distinto por segmento; corrección del parpadeo (botones ocultos por defecto).
- Los botones Senior solo aparecen en el segmento SENIORS.

**Fotos y Videos**
- Conectado el backend de fotos (API_FOTOS).
- Videos de entrenamiento Senior (pestañas SENIOR AM/PM de Pixellot): distingue Foto/Video por la columna D y lee el enlace real del hipervínculo.
- Para Seniors muestra solo su turno y solo contenido Senior (no PRO/SUB).
- Los álbumes de fotos se abren dentro de la app (galería + lightbox).

**Calendario Seniors** (fusión de "Mi Asistencia" + "Calendario")
- Tabla horizontal: Fecha · Ejercicio · Foto · Video · Asistencia (✓ Asistió / ✗ No asistió / Pendiente).
- Agrupado por mes (acordeón).
- Totales del año: Asistió, Faltó (solo F), Entrenamientos realizados; y por mes en cada encabezado.
- Ejercicio toma por ahora el concepto de la planilla Pixellot (pendiente definir la fuente final).

**Otros**
- Botón directo al Instagram Senior.
- Leyenda de la evaluación física (En Desarrollo / Aceptable / Destacado).
- Diagnóstico "no carga la base": la ficha requiere TIPO (K) = SENIOR/ADULTO, Estado (C) = ACTIVO/NEW/FULL y correo en columna W o AA.

---

## 3. Sincronización de datos (Importar_KidsAdultos.gs)

- `copiarTorneos`: copia TORNEOS a la columna AT de la Base de Datos App.
- `sincronizarTodo` automático cada 6 horas (activador): lee la pestaña **BASE** de "DATA FUTBOL A.F. 2026" y actualiza los meses (AGOSTO, etc.) y agrega los jugadores nuevos (ACTIVO/FULL/NEW) al final.
- Correcciones: solo columnas de meses para evitar el error de validación de datos; los nuevos se agregan sin chocar con reglas.
- Importa también PRO.

---

## 4. Análisis realizados

- EVALUACIONES 2026: 224 jugadores, notas por componente, por sede/categoría/nivel, top y débiles, calidad de datos.
- Asistencias AM y PM 2026: estructura, estados y conteos por turno.
- Pixellot (SENIOR AM/PM): registro de videos/fotos de entrenamiento.

---

## 5. Recomendaciones (para más adelante)

- **UX:** unificar estilos entre portales, skeletons de carga, notificaciones push (ya tienes Firebase Messaging iniciado), service worker también en el portal del jugador.
- **App en tiendas:** camino recomendado PWA instalable + empaquetado con PWABuilder (Google Play) y Capacitor (iOS/Android). Requiere cuenta Google Play (US$25) y Apple Developer (US$99/año) y una política de privacidad.

---

## Notas técnicas importantes

- El backend del entrenador vive en el despliegue **`AKfycbwa53`** (proyecto ASISTENCIA). **Siempre** actualizar editando ESA implementación → "Versión nueva" (nunca "Nueva implementación", porque cambia la URL).
- El backend de Fotos es el proyecto **FOTOS** (su propia URL /exec).
- Las planillas deben estar compartidas con `informacion@accionfutbol.cl` como Editor/Lector según corresponda; las carpetas de Drive de fotos, como "cualquiera con el enlace".
