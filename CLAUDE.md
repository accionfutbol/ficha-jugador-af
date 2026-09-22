# CLAUDE.md — APP ACCIÓN FÚTBOL

Contexto para Claude Code. Sistema de gestión de la academia **Acción Fútbol** (Chile):
dos portales web estáticos (HTML/CSS/JS en Vercel) respaldados por **Google Sheets +
Google Apps Script + Firebase Auth**.

## Reglas de trabajo
- Idioma: español. Respuestas concretas y breves.
- Máxima fidelidad al editar: no perder información ni romper lo existente.
- Antes de editar un archivo grande, léelo completo. Edita en el lugar (no re-tipear).
- Los `.gs` son backend de Apps Script (no corren local). Cada cambio en un `.gs`
  requiere **re-desplegar** su proyecto para verse en producción.

## Portales y repos
- **Portal Apoderado / Jugador** — repo `accionfutbol/ficha-jugador-af` (Vercel).
  Dominio `jugadoraccionfutbol.cl`. Archivo principal: `index_SEGURO.html`.
- **Portal Entrenador** — repo `accionfutbol/Portal-Entrenador` (Vercel).
  Apps: `asistencia.html`, `reporte.html`, `ficha-partido.html`, `evaluaciones.html`,
  `certificados.html`, `uniformes.html`, `detalles-partidos.html`, `index.html` (home).

## Cuentas Google (importante)
- `informacion@accionfutbol.cl` — admin; **dueña de los proyectos Apps Script** y
  **"Ejecutar como"** de los deployments. Las planillas deben compartirse con esta
  cuenta como Editor para que el backend lea/escriba.
- Los **triggers son por cuenta**: trabajar siempre logueado como `informacion@`.

## Backend Apps Script (proyecto ASISTENCIA)
- Archivo local: `Asistencia_SEGURO.gs` → pegar en `Código.gs` del proyecto **ASISTENCIA**.
- **URL estable (la que usan las 3 apps del entrenador):** deployment `AKfycbwa53...`.
  `https://script.google.com/macros/s/AKfycbwa53UNt6Q1MmxCt9g8EGB63Hu_r-UqzUQ1Uh51YWfe5ZuZCFTSVenPFLUGOVnghbIt/exec`
- **Procedimiento de despliegue (mantiene la MISMA URL):**
  Implementar → Administrar implementaciones → deployment `AKfycbwa53` → lápiz ✏️ →
  Versión: **"Versión nueva"** → Implementar.  NUNCA "Nueva implementación" (cambia la URL).
- Abrir la URL directo en el navegador siempre da "No se pudo abrir el archivo": es normal.

## Otros proyectos Apps Script (cuenta informacion@)
- **INASISTENCIA Y LESIÓN** — `Justificaciones_JF.gs` (escribe "J", prefijado `jf`) y
  `Lesionados.gs` (escribe "L"). Triggers `onFormSubmit`. No borrar esos triggers.
- **PARTIDOS**, **APP APODERADO Y JUGADOR**, **FOTOS** — endpoints seguros del apoderado
  (`Partidos_SEGURO_LISTO.gs`, `Fichas_SEGURO_standalone.gs`, `Fotos_SEGURO.gs`).

## Planillas (IDs)
- **LISTA MAESTRA de asistencia:** `1H5TfnLFvYlW-NgpOcbJezNpPm5PeINF5i52HW50PRhY`
  (1ra pestaña; A=sede, B=categoría, C=link/ID de la planilla de esa categoría).
  El desplegable de la app se arma desde aquí (vía `afLeerMaestra_` / acción `config`).
- **Respuestas formularios (Justif + Lesionados):** `1QAnU6YZzSW9CYN9xvo8IgX3790NTWLsc4YZw01isMSA`
  - Pestaña **JUSTIFICACIÓN INASISTENCIA**: C=fecha, D=RUT, col N = "INFORMADO POR EL ENTRENADOR".
  - Pestaña **LESIONADOS**: C=RUT, I=fecha, J=zona.
  - Pestaña **REPORTE DE ENTRENAMIENTO** (gid 1079338476): destino de la acción `repoent`.
    Col O = cantidad de jugadores NO en lista; Col P = detalle (NOMBRE/AÑO/TELEFONO).
  - Pestaña **OBSERVACIÓN DEL ENTRENADOR**: acción `observacion`.
- **Uniformes:** `1flSxbuqmOg_EUcjTbUAO-HWHcRHD5zoE_YvwE9m2yhw`, pestaña CONSOLIDADO.

## Formato de las planillas de asistencia (pestaña "ASISTENCIA")
- **Estándar (layout 'std'):** encabezado con **RUT** en col A, JUGADOR en B, ESTADO en C,
  TEL. JUG. en D, TEL. APO. en E, y las **fechas como columnas** (marcas OK/F/J/L/N-A).
- **Femenino (layout 'fem'):** col A = **Jugadores**, col B = **ESTADO**, sin RUT ni teléfonos,
  fechas como columnas. El backend lo detecta con `afHdrLayout_` (busca 'RUT' o 'JUGADORES').
- El guardado (`afGuardar_`) empareja por **número de fila**, no por RUT.

## Listas de asistencia especiales (en el backend, no en la LISTA MAESTRA)
- **SENIOR AM/PM** — hardcodeado en `asistencia.html` (SENIOR||AM / SENIOR||PM); backend
  `srroster`/`srsave` sobre la planilla "Asistencias AM y PM 2026".
- **PROYECCIÓN / PRO ELITE / FEMENINO** — agregadas dentro de `afLeerMaestra_()` como
  entradas fijas (aparecen solas en el menú tras re-desplegar). IDs:
  - Proyección: `1gnKwi19ehEb-bMmGOyx5QSiBMJYcV7Ltw0qdp_9iXPs`
  - Pro Elite:  `17JQJbAd_M_luRIIhAXRFzYpZF90JqFgqd6KwsEE16cA`
  - Femenino:   `1TO4DmeiX22BT_2fp2_AUOhwUUxaN87N9WamWIs5NtGc`
  Requisito: compartidas con `informacion@` como Editor.

## Firebase
- `asistencia-accion-futbol` → login de **entrenadores** (apps de asistencia).
- `accion---futbol-f0b72` → login de **apoderado/jugador**.
- Seguridad por **idToken** de Firebase validado en el backend (Identity Toolkit).

## Colores institucionales
- Rosa/magenta `#ff2e93` (y `#c70f6e` en reportes). Tema oscuro.

## Flujo de publicación (frontend)
- Los `.html` viven en repos de Vercel. Para publicar un cambio: reemplazar el archivo
  en el repo de GitHub correspondiente → commit → Vercel redepliega solo (~1 min).
- El backend (`.gs`) NO se publica por GitHub: se re-despliega en Apps Script (ver arriba).

## Carpeta
- `_ARCHIVO/` guarda respaldos y versiones viejas. No es producción.
