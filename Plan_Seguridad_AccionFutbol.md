# Plan de seguridad — Autorización por token de Firebase
### Acción Fútbol · Portal Apoderado

## Objetivo
Que los endpoints de Apps Script **verifiquen quién pregunta** y devuelvan **solo** los datos que a esa persona le corresponden. Hoy cualquiera con la URL descarga toda la base sin login.

## Cómo funciona (resumen)
1. El navegador, tras el login, obtiene el **ID token** de Firebase del usuario.
2. Lo envía en cada llamada al Apps Script.
3. El Apps Script **valida ese token con Google** (Identity Toolkit) y obtiene el correo real.
4. Devuelve solo los jugadores vinculados a ese correo. Si el correo es el de admin, devuelve todo.

No hay que verificar la firma JWT a mano: se delega en Google con una llamada REST simple.

---

## FASE 0 — Trabajar en COPIA (obligatorio)
No tocar producción hasta que todo esté probado.
1. Duplica la planilla **Base de Datos Apoderados** (Archivo → Hacer una copia).
2. En esa copia, Extensiones → Apps Script → crea un **deployment de prueba** (URL nueva).
3. Haz una copia del `index.html` apuntando a esa URL de prueba.
4. Todo lo de abajo se prueba ahí primero.

---

## FASE 1 — Helper de verificación (Apps Script)
Agregar esta función a cada endpoint (Fichas y Partidos):

```javascript
// Verifica el ID token de Firebase y devuelve el email, o null si es inválido.
function afVerificarToken_(idToken) {
  if (!idToken) return null;
  var API_KEY = 'AIzaSyCUAjo8Y2UboI7yf1Hx0t-RGB5MnFlhqRw'; // apiKey pública de Firebase
  var url = 'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + API_KEY;
  try {
    var res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ idToken: idToken }),
      muteHttpExceptions: true
    });
    if (res.getResponseCode() !== 200) return null;
    var data = JSON.parse(res.getContentText());
    if (!data.users || !data.users.length) return null;
    return (data.users[0].email || '').toLowerCase().trim();
  } catch (e) {
    return null;
  }
}
```

---

## FASE 2 — Endpoint Fichas (devolver solo lo permitido)
En `doGet(e)`:

```javascript
function doGet(e) {
  var ADMIN = 'informacion@accionfutbol.cl';
  var email = afVerificarToken_(e && e.parameter ? e.parameter.idToken : null);
  if (!email) {
    return ContentService.createTextOutput(JSON.stringify({ error: 'No autorizado' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var ws = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Base de Datos Apoderados');
  var data = ws.getRange(1, 1, ws.getLastRow(), 73).getValues();

  // Fila de encabezado (busca "RUT" en columna A)
  var header = 0;
  for (var i = 0; i < Math.min(data.length, 12); i++) {
    if (String(data[i][0]).trim().toUpperCase() === 'RUT') { header = i; break; }
  }
  var head = data.slice(0, header + 1);
  var body = data.slice(header + 1);

  // Admin: ve todo. Apoderado: solo sus jugadores (correo en columna 27 / índice 26).
  var filtradas = (email === ADMIN)
    ? body
    : body.filter(function (r) { return String(r[26]).toLowerCase().trim() === email; });

  return ContentService.createTextOutput(JSON.stringify(head.concat(filtradas)))
    .setMimeType(ContentService.MimeType.JSON);
}
```

Resultado: un apoderado solo recibe sus hijos; el admin recibe todo (su buscador sigue funcionando).

---

## FASE 3 — Endpoint Partidos (filtrar por correo verificado)
Ignorar el `correo` que manda el cliente y usar el del **token**:

```javascript
function doGet(e) {
  var ADMIN = 'informacion@accionfutbol.cl';
  var email = afVerificarToken_(e && e.parameter ? e.parameter.idToken : null);
  if (!email) return jsonError_('No autorizado');

  // Admin puede consultar por rut; apoderado solo lo suyo:
  // filtrar la hoja DATA por CorreoAp (col 19) === email, salvo admin.
  // ...tu lógica de lectura de partidos, pero SIEMPRE acotada por 'email'...
}
```

---

## FASE 4 — Cambios en el cliente (index.html)
Antes de cada `fetch` a los endpoints, adjuntar el ID token:

```javascript
async function authFetch(url, params) {
  const user = fbAuth.currentUser;
  if (!user) throw new Error('Sesión no iniciada');
  const idToken = await user.getIdToken();      // token fresco (se renueva solo)
  const u = new URL(url);
  if (params) Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
  u.searchParams.set('idToken', idToken);
  return fetch(u.toString(), { cache: 'no-store' });
}
```

Y reemplazar:
- `fetch(API, {cache:'no-store'})` → `authFetch(API)`
- `fetch(API_PARTIDOS + '?' + params)` → `authFetch(API_PARTIDOS, {rut, correo})`

(La carga de PLAYERS solo traerá los jugadores del apoderado; para el admin sigue trayendo todos, así el buscador RUT/nombre funciona igual.)

---

## FASE 5 — Mover reglas al servidor
- **Morosidad:** decidir el bloqueo en Apps Script (si `pagoMens=MOROSO` y `nMor>=3`, no devolver ficha completa). Hoy es solo en el navegador.
- **Admin:** el privilegio lo determina el **email del token**, no un `if` en el JS.

---

## FASE 6 — Probar y recién ahí pasar a producción
Checklist en la COPIA:
- [ ] Apoderado normal: ve solo sus hijos.
- [ ] Apoderado A no puede ver datos de apoderado B (probar mandando otro correo: debe ignorarlo).
- [ ] Sin login / token inválido: responde "No autorizado".
- [ ] Admin: ve todo y el buscador funciona.
- [ ] Partidos: cada quien ve solo los suyos; admin busca cualquiera.

Cuando todo pase:
1. Aplicar los mismos cambios en los proyectos/planilla **reales**.
2. Desplegar **nueva versión** (misma URL).
3. Subir el `index.html` con `authFetch`.

## Plan de reversa
Si algo falla en producción: volver el `doGet` a la versión anterior (Apps Script guarda historial de versiones en "Administrar implementaciones") y restaurar el `index.html` anterior desde GitHub. Nada destructivo: no se escribe en la planilla.

## Nota de rendimiento
La verificación agrega ~200–400 ms por request (llamada a Google). Aceptable, y se puede mitigar cacheando `token→email` unos minutos con CacheService.
