# ACCIÓN FÚTBOL — Resumen técnico del proyecto

_Última actualización: 27 jul 2026_

Sistema de gestión de la academia de fútbol Acción Fútbol (Chile). Dos portales web
estáticos (HTML/CSS/JS en Vercel) respaldados por Google Sheets + Google Apps Script
+ Firebase Auth.

---

## 1. Portales y repos

- **Portal Apoderado / Jugador** — `accionfutbol/ficha-jugador-af` (Vercel).
  Dominio: `jugadoraccionfutbol.cl`. Archivo principal: `index_SEGURO.html`.
- **Portal Entrenador** — `accionfutbol/Portal-Entrenador` (Vercel).
  Apps: `asistencia.html`, `reporte.html`, `ficha-partido.html`.

## 2. Firebase (dos proyectos separados)

- `accion---futbol-f0b72` → login de **apoderado/jugador**.
- `asistencia-accion-futbol` → login de **entrenadores** (apps de asistencia).
  Único correo autorizado para entrenadores: `asistenciacontactoaccionfutbol@gmail.com`
  (+ admin `informacion@accionfutbol.cl`).

## 3. Cuentas de Google (¡ojo, causa de muchos líos!)

- `informacion@accionfutbol.cl` — cuenta admin; **dueña de la mayoría de los proyectos
  Apps Script** (ASISTENCIA, PARTIDOS, APP APODERADO Y JUGADOR, INASISTENCIA Y LESIÓN...).
- `gestionaccionfutbol@gmail.com` — cuenta empresa (aparece como "Ejecutar como" en
  algunos despliegues).
- Cuenta personal de Camilo — evitar crear triggers/deployments con ella (genera duplicados).

**Regla:** los activadores (triggers) son POR CUENTA. Solo ves los que creó la cuenta con
la que estás logueado. Trabajar siempre con `informacion@` para asistencia/justif/lesión.

---

## 4. Proyectos Apps Script (script.google.com → Mis proyectos, cuenta informacion@)

| Proyecto | Contenido | Notas |
|---|---|---|
| **ASISTENCIA** | `Código.gs` = web app de asistencia (doGet/doPost, afReporte_, roster, save OK/F/J/L). | **Dueño de la URL buena** `AKfycbwa53...` (CORS estable). Aquí va `Asistencia_SEGURO.gs`. |
| **INASISTENCIA Y LESIÓN** | `Lesionados` (escribe "L") + `Justificaciones` (escribe "J", archivo nuevo prefijado `jf`). Trigger `reporteSemanalLunes`. | Aquí viven los onFormSubmit de J y L. |
| PARTIDOS | endpoint seguro de partidos (apoderado). | Desplegado, OK. |
| APP APODERADO Y JUGADOR | Fichas seguras (apoderado). | Desplegado, OK. |

## 5. Deployments / URLs importantes

- **Asistencia (la que USAN las 3 apps del entrenador):**
  `https://script.google.com/macros/s/AKfycbwa53UNt6Q1MmxCt9g8EGB63Hu_r-UqzUQ1Uh51YWfe5ZuZCFTSVenPFLUGOVnghbIt/exec`
  - CORS estable. **Ejecutar como:** informacion@accionfutbol.cl. **Acceso:** Cualquier usuario.
  - Nota: abrir esta URL directo en el navegador SIEMPRE da "No se pudo abrir el archivo" —
    es normal, no significa que esté rota. Se prueba con `?action=config` desde la app, no a mano.
  - Para actualizar código: editar `Código.gs` en proyecto ASISTENCIA → Implementar →
    Administrar implementaciones → deployment activo → lápiz ✏️ → Versión: "Versión nueva" → Implementar.
    (Mantiene la MISMA URL.)
- **Deployment nuevo `AKfycby1njZ...`** (proyecto INASISTENCIA Y LESIÓN): tiene **CORS caprichoso**.
  NO usarlo para las apps. Se descartó.

## 6. Planillas (Google Sheets)

- **Lista Maestra de asistencia:** `1H5TfnLFvYlW-NgpOcbJezNpPm5PeINF5i52HW50PRhY`
  (col A=sede, B=categoría, C=link/ID de la planilla de esa categoría).
- **Respuestas formularios (Justif + Lesionados, MISMA planilla):**
  `1QAnU6YZzSW9CYN9xvo8IgX3790NTWLsc4YZw01isMSA`
  ("IMPORTANTE INFORMACIÓN DIARIA - ACCIÓN FÚTBOL PRO (respuestas)").
  - Pestaña **"JUSTIFICACIÓN INASISTENCIA"**: C=fecha inasistencia, D=RUT, motivo por header.
  - Pestaña **"LESIONADOS"**: C=RUT, I=fecha de lesión, J=zona del cuerpo.
- **Planillas de asistencia por categoría:** una por categoría, pestaña **"ASISTENCIA"**.
  Header con "RUT" en col A; jugadores desde esa fila+1; fechas como columnas; marcas OK/F/J/L/N-A.

---

## 7. Lógica clave

### Reporte (afReporte_ en Asistencia_SEGURO.gs)
- Tabla por sede/categoría con OK/F/J/L, alertas (F>2), listas colapsables, gráfico %, PDF.
- **Motivos J:** `afMotivosSemana_(d0,d1)` cruza por `RUT|fecha` exacta (la justificación es de un día puntual).
- **Zona L:** `afLesionesPorRut_(hasta)` cruza **por RUT** (lesión más reciente ≤ fin del reporte).
  Razón: la "L" se marca durante TODO el período de lesión (muchos días), pero el formulario
  tiene UNA sola fecha de lesión → cruzar por fecha exacta fallaba (solo cruzaba 1 de ~197).

### Motivo de la "J" en la app de asistencia (agregado 23 jul 2026)
- Al poner **J** a un jugador en Registrar Asistencia, se abre automáticamente un recuadro
  "MOTIVO DE LA JUSTIFICACIÓN" que muestra:
  - **Justificación del Jugador**: lo que respondió en el formulario (o "— Sin justificación del jugador —").
  - **Motivo informado al entrenador (privado)**: lista desplegable con las 8 opciones del formulario
    (Enfermo / Lesionado / Estudiar / Otra actividad / Familiares / Transporte / Lluvia / Vacaciones).
- Lo que elige el entrenador se guarda en la **columna N ("INFORMADO POR EL ENTRENADOR")** del sheet
  de JUSTIFICACIÓN (1QAnU6...), en la fila de ese RUT+fecha; si no existe, agrega una fila nueva
  con fecha (col C) + RUT (col D) + opción (col N). Al guardar también deja la "J" en la asistencia.
- Backend: acciones `motivo` (GET, lee motivo jugador + col N) y `motivoent` (POST, escribe J + col N).
  Funciones: `afMotivoJ_`, `afJustifRow_`, `afGuardarMotivoEntrenador_`, `afMotivoEntrenador_`.
- `afLimpiarNotasEntrenador` (ejecutar a mano una vez): borra notas viejas "Informado al entrenador:"
  que dejó una versión anterior basada en notas de celda (ya descartada).

### Reporte: encabezados OK/F/J/L ordenables (agregado 23 jul 2026)
- En `reporte.html`, los encabezados OK/F/J/L de la tabla de jugadores son clicables: ordenan de
  mayor a menor (▼) y al reclic invierten a menor-mayor (▲). Funciones `sortRep`, `filasRep`.

### Fichas de lesionados visibles en la app apoderado (agregado 23 jul 2026)
- El filtro de estado de `index_SEGURO.html` (columna C de la Base de Datos) ahora incluye **LESIONADO**
  además de ACTIVO/ACTIVOS/NEW/FULL. Variable `PERMITIDOS`. Sin esto, las fichas de lesionados no aparecían.
- Ficha: se quitaron las barras de la evaluación física (quedan etiqueta + badge + valor) y se agregó
  la leyenda "Total de minutos jugados entre partidos de torneo y amistoso" en Información de partidos.

### Escritura automática J / L (triggers onFormSubmit, proyecto INASISTENCIA Y LESIÓN)
- **Justificaciones** (archivo `Justificaciones`, funciones prefijadas `jf`):
  `jfProcesarPendientes` (handler del trigger), `crearTriggerJustif`,
  `jfMarcarHistoricoSalvoUltimos7`, `jfConstruirIndice_`, `jfDiagnostico/2`.
  Escribe "J" si la celda está vacía o "F"; respeta OK y L. Columnas: C=fecha, D=RUT.
- **Lesionados** (archivo `Lesionados`): escribe "L". Columnas C=RUT, I=fecha, J=zona.
  Reactivar con `crearTriggerLesionados`.
- **IMPORTANTE:** ambos usan nombres genéricos que chocarían → Justificaciones se prefijó con
  `jf` para convivir en el mismo proyecto sin pisar a Lesionados.

---

## 8. Estado actual (lo que quedó funcionando el 19 jul 2026)

- ✅ Apps del entrenador (asistencia, reporte, ficha-partido) en la URL estable `AKfycbwa53`.
- ✅ Reporte muestra motivos (J) y zonas (L), cruce por RUT.
- ✅ "J" automática reactivada (trigger `jfProcesarPendientes`).
- ✅ "L" automática reactivada (`crearTriggerLesionados`).
- ✅ Seguridad por token (idToken Firebase) en endpoints de apoderado y entrenador.
- ✅ Ficha del jugador rediseñada (estilo FENAX, colores institucionales, foto cuadrada) —
  código listo en `index_SEGURO.html`; **pendiente confirmar que se subió y probó en producción.**

## 9. Pendientes / mejoras futuras

1. **Confirmar despliegue de la ficha rediseñada** (`index_SEGURO.html`) en el repo del apoderado.
2. **Datos del formulario de Lesionados:** varios apoderados escriben el NOMBRE en vez del RUT
   en la columna C → esas lesiones no cruzan la zona en el reporte. Reforzar instrucción en el form.
3. Opcional: borrar el deployment sobrante `AKfycby1njZ` (el de CORS malo) para evitar confusiones.
4. Al limpiar triggers duplicados en el futuro, **no borrar** los onFormSubmit de
   `jfProcesarPendientes` (J) ni el de lesiones (L).
5. Opcional: que el motivo elegido por el entrenador (columna N) también aparezca en el
   **reporte semanal** (hoy el reporte solo lee el motivo del formulario del apoderado, col J).
6. Re-desplegar `Asistencia_SEGURO.gs` (URL AKfycbwa53) cada vez que se toca su código.

## 12. Aviso de lesión por WhatsApp (investigado 23 jul 2026, NO implementado)

- La **API oficial de WhatsApp (Cloud API)** agregó grupos en 2026, pero **solo puede escribir en
  grupos creados por la propia API** (con Cuenta Oficial de Empresa). **NO** puede publicar en los
  grupos personales existentes de la academia. La **app WhatsApp Business (gratis) no sirve** para
  automatizar.
- Camino recomendado si se retoma: enviar el aviso **directo al número del apoderado** (mensaje de
  plantilla "utility", centavos c/u) vía un BSP (Twilio / 360dialog / Wati) + número dedicado +
  verificación de Meta Business. La conexión sería: trigger `onFormSubmit` de Lesionados → `UrlFetchApp`
  al BSP, con tabla RUT → número del apoderado.

## 10. Colores institucionales

- Rosa/magenta: `#ff2e93` (y `#c70f6e` en reportes). Tema oscuro.

---

## 11. Archivos de código (en la carpeta de trabajo)

- `Asistencia_SEGURO.gs` — web app de asistencia + reporte (proyecto ASISTENCIA, URL AKfycbwa53).
- `Justificaciones_JF.gs` — J automática, prefijado `jf` (proyecto INASISTENCIA Y LESIÓN).
- `Lesionados.gs` — L automática (proyecto INASISTENCIA Y LESIÓN).
- `Fichas_SEGURO_standalone.gs`, `Partidos_SEGURO_LISTO.gs` — endpoints seguros apoderado.
- `reporte.html`, `asistencia.html`, `ficha-partido.html` — apps del entrenador.
- `index_SEGURO.html` — portal apoderado (con ficha rediseñada).
- `certificados.html` — generador de certificados (Portal Entrenador).
- `uniformes.html` — entrega de uniformes (Portal Entrenador).
- `index.html` — home del Portal Entrenador (con botones a todas las apps).

---

## 13. Novedades 27 jul 2026 (Portal Entrenador)

Todo lo de abajo vive en el proyecto **ASISTENCIA** (`Asistencia_SEGURO.gs`, URL `AKfycbwa53`).
**Cada cambio en ese .gs requiere re-desplegar** (Administrar implementaciones → Versión nueva).

### Motivo de la "J" en Asistencia (columna N)
- Al poner **J** se abre un recuadro: muestra la justificación del jugador (formulario) y un
  desplegable con las 8 opciones del formulario para que el entrenador elija el motivo.
- Se guarda en la **columna N ("INFORMADO POR EL ENTRENADOR")** de la pestaña JUSTIFICACIÓN
  del sheet `1QAnU6...`. Acciones backend: `motivo` (GET), `motivoent` (POST).

### Teléfonos WhatsApp al marcar F
- Al marcar **F**, debajo del jugador aparecen dos botones verdes **📱 Jugador / 📱 Apoderado**
  con enlace `wa.me` y mensaje pre-escrito ("…por qué [nombre] no asistió al entrenamiento hoy").
- Teléfonos leídos de la planilla de asistencia: **columna D (jugador) y E (apoderado)**.
  Normalización: quita espacios/guiones, toma el primer número si hay "/", antepone 56.

### Observación del entrenador (botón "O")
- Botón **O** (morado) por jugador → recuadro con 5 observaciones (Desactivar / Cambio de sede /
  Cambio de categoría / Cambio de nivel / Nunca asistió) + 11 entrenadores.
- Guarda una fila en la pestaña **OBSERVACIÓN DEL ENTRENADOR** de `1QAnU6...`
  (A=RUT, B=Jugador, C=Sede, D=Categoría, E=Observación, F=Entrenador). Acción: `observacion` (POST).

### Lesiones: L hacia adelante + limpieza con OK
- Formulario Lesionados marca **L desde la fecha de lesión hacia adelante** (se detiene en un OK).
  Backfill manual: `rellenarLesionesHaciaAdelante` en `Lesionados.gs`.
- Al marcar **OK** en asistencia, se borran las L **posteriores** (volvió a entrenar); las anteriores quedan.
- `afRoster_` sugiere **L** automáticamente si el jugador sigue lesionado en una fecha nueva.

### Reporte: encabezados OK/F/J/L ordenables (clic ordena mayor→menor / menor→mayor).

### Entrega de Uniformes (`uniformes.html`)
- Pantalla nueva: elige sede+categoría, marca **OK/NO** por jugador. Resumen entregado/no/pendiente.
- Lee y escribe en la planilla **"ENTREGA DE ROPA - CASO POLERONES"**
  (`1flSxbuqmOg_EUcjTbUAO-HWHcRHD5zoE_YvwE9m2yhw`), pestaña **CONSOLIDADO**:
  A=Nombre, B=RUT, **C=Estado** (filtra ACTIVO/FULL/NEW/LESIONADO), F=Sede, G=Categoría (S14/S16/S18),
  **O=OK/NO** (fecha de entrega como nota en la celda). Empareja por RUT y por número de categoría.
- Acciones: `uniroster` (GET), `unisave` (POST). **Requiere que informacion@ tenga acceso de editor
  a esa planilla.**

### Certificados de Jugadores y Partidos (`certificados.html`)
- 3 tipos: Entrenamiento, Partido, Prueba de Captación. Autocompletar por nombre (acción `todos`).
- Genera PDF con jsPDF + membrete oficial (logo, firma de Gonzalo Opazo, sello) extraído de los .docx.
- Redacción corregida: "…ROL 77.418.513-5 **certifica a** [nombre]…".
- Horarios de entrenamiento por sede+categoría y direcciones (cargados en el JS):
  - Peñalolén SUB14/SUB16: Complejo Honorino Landa, Península 1963. SUB18: Estadio Cordillera, Los Talladores 5724.
  - Las Condes: Club Oriente, Nueva Bilbao 9495. La Florida: Complejo Infinity, Av. San José de la Estrella 816.

### Home del Portal Entrenador (`index.html`)
- Botones: Buscar Jugador, Asistencia, Reporte, Ficha Partidos, **Certificados**, **Entrega de Uniformes**,
  Planificaciones. Navegan por `location.href` a cada `.html`.

### Fichas apoderado: se agregó **LESIONADO** a los estados permitidos (aparecen en la app).

## 14. Pendiente en curso

- **Dominio del Portal Entrenador:** el usuario tiene el dominio; falta conectarlo en Vercel
  (agregar dominio al proyecto Portal-Entrenador + apuntar DNS en el registrador). Mismo procedimiento
  que jugadoraccionfutbol.cl.
