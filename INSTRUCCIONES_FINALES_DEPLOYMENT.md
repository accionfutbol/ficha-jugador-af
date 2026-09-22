# 📝 INSTRUCCIONES FINALES: Deployment de Evaluaciones

## ✅ Lo que ya está hecho:

1. ✅ Portal Apoderado — HTML + CSS + JavaScript agregado y pusheado
2. ✅ Portal Entrenador — HTML + CSS + JavaScript agregado (local)
3. ✅ Archivo `FICHAS_SEGURO_COMPLETO.gs` — Código listo para copiar

---

## 🚀 QUÉ DEBES HACER TÚ (3 pasos simples):

### **PASO 1: Copiar el código de Apps Script**

1. Abre `FICHAS_SEGURO_COMPLETO.gs` (en la carpeta del proyecto)
2. **Selecciona TODO** (`Ctrl+A`)
3. **Copia** (`Ctrl+C`)

---

### **PASO 2: Pegar en Google Apps Script**

1. Abre tu proyecto Apps Script: https://script.google.com
2. Abre el archivo **`Fichas_SEGURO.gs`**
3. **Borra TODO el contenido actual** (`Ctrl+A` → Delete)
4. **Pega el código nuevo** (`Ctrl+V`)
5. **Guarda** (`Ctrl+S`)

---

### **PASO 3: Actualizar el ID de la planilla**

En el código que pegaste, busca esta línea (aprox. línea 122):

```javascript
const PLANILLA_ID = "1s90v7MoQ3tHLBYnOaoq3SsArNKeNQqbxiI2bCcmPoKA";
```

**Reemplaza ese ID** con el ID real de tu planilla **EVALUACIONES 2026 ACCIÓN FÚTBOL**:

- Abre la planilla en Google Sheets
- Copia el ID de la URL: `https://docs.google.com/spreadsheets/d/`**ESTE_ID**`/edit`
- Pega en la línea 122 (reemplaza el que dice `1s90v7MoQ3...`)

**Ejemplo:**
```javascript
const PLANILLA_ID = "1h5TfnLFvYlW-NgpOcbJezNpPm5PeINF5i52HW50PRhY";
```

---

### **PASO 4: Re-desplegar en Google Apps Script**

1. En Google Apps Script, haz clic en **Implementar**
2. Selecciona **Administrar implementaciones**
3. Busca el deployment que comienza con **`AKfycbwa53...`** (el existente)
4. Haz clic en el ✏️ (lápiz para editar)
5. Selecciona **"Versión nueva"** (IMPORTANTE: NO "Nueva implementación")
6. Haz clic en **Implementar**

✅ **¡Listo!**

---

## 📊 Verificación:

Después de re-desplegar:

1. Abre **Portal Apoderado** (jugadoraccionfutbol.cl)
2. Inicia sesión
3. Selecciona un jugador
4. Desplázate hacia abajo
5. Verifica que aparezca la sección **"📝 Evaluación del Entrenador"** con:
   - Técnica Táctica
   - Actitud
   - Promedio Final
   - Comentario del Entrenador
   - Progresión (si hay 2do semestre)

---

## 🔗 Todos los portales:

- **Portal Apoderado**: Vercel se redesplegó automáticamente ✅
- **Portal Entrenador**: Tienes los cambios locales, necesita push separado a su repo
- **Google Apps Script**: Requiere el re-deploy que harás en este paso

---

## ❓ Problemas comunes:

**"No se cargan las evaluaciones"**
- Verifica el ID de la planilla (línea 122)
- Verifica que la pestaña "NOTAS EV. TECN 2026" existe
- Verifica que el jugador tiene datos en esa planilla

**"Error CORS o de seguridad"**
- Presiona `Ctrl+Shift+I` → Console
- Busca mensajes de error rojo
- Reporta si algo no funciona

---

**¿Preguntas?** Estoy aquí si algo no sale.

**Fecha**: 2026-09-22  
**Estado**: Listo para deployment final
