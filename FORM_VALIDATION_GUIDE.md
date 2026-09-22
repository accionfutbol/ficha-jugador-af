# Validación de Formularios - Guía Completa

## 🎯 Objetivos

✅ Validación HTML5 nativa (sin dependencias)
✅ Mensajes de error personalizados
✅ Accesibilidad WCAG 2.1 AA
✅ UX mejora - feedback inmediato

---

## 📋 Formularios Identificados

### Portal Apoderado

#### 1. **Formulario de Login**
```html
<input type="email" id="login-email" aria-label="Ingresa tu correo electrónico">
<input type="password" id="login-pass" aria-label="Ingresa tu contraseña">
```

**Validaciones necesarias:**
- Email válido (RFC 5322)
- Contraseña: mínimo 6 caracteres
- Campo requerido

#### 2. **Formulario de Registro**
```html
<input type="email" id="reg-email" aria-label="Ingresa tu correo electrónico para registrarse">
<input type="password" id="reg-pass" aria-label="Crea una contraseña de al menos 6 caracteres">
```

**Validaciones necesarias:**
- Email válido
- Contraseña: mínimo 6 caracteres
- Confirmar contraseña (agregar campo)
- Campo requerido

#### 3. **Búsqueda de Jugador**
```html
<input id="q" type="text" placeholder="Ej: Juan Pérez o 24.073.947-K">
```

**Validaciones necesarias:**
- Mínimo 3 caracteres
- RUT válido (opcional)
- Nombre válido (letras, espacios)

---

## 🔧 Implementación - Validación HTML5

### 1. Agregar atributos `required` y `minlength`

```html
<!-- Login -->
<input 
  type="email" 
  id="login-email" 
  aria-label="Ingresa tu correo electrónico"
  required
  pattern="[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
  placeholder="tu@correo.com"
>

<input 
  type="password" 
  id="login-pass" 
  aria-label="Ingresa tu contraseña"
  required
  minlength="6"
  placeholder="••••••••"
>
```

### 2. Agregar mensajes de error personalizados

```html
<div class="form-group">
  <label for="login-email">Correo electrónico</label>
  <input 
    type="email" 
    id="login-email"
    required
    pattern="[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
  >
  <span class="form-error" id="login-email-error" role="alert"></span>
</div>

<div class="form-group">
  <label for="login-pass">Contraseña</label>
  <input 
    type="password" 
    id="login-pass"
    required
    minlength="6"
  >
  <span class="form-error" id="login-pass-error" role="alert"></span>
</div>
```

---

## 🎨 CSS para Validación Visual

```css
/* Estados de validación */
input:invalid:not(:placeholder-shown) {
  border-color: #ff2e93;
  background-color: rgba(255, 46, 147, 0.05);
}

input:valid:not(:placeholder-shown) {
  border-color: #27c281;
  background-color: rgba(39, 194, 129, 0.05);
}

/* Mensajes de error */
.form-error {
  display: block;
  color: #ff2e93;
  font-size: 0.875rem;
  margin-top: 4px;
  min-height: 20px;
}

/* Grupo de formulario */
.form-group {
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
}

.form-group label {
  margin-bottom: 8px;
  font-weight: 500;
}

/* Desabilitar botón de submit si hay errores */
button[type="submit"]:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

---

## 📝 JavaScript - Validación Personalizada

```javascript
const FormValidator = {
  // Validar email RFC 5322
  isValidEmail: (email) => {
    const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return pattern.test(email);
  },

  // Validar RUT chileno (opcional)
  isValidRUT: (rut) => {
    const cleanRUT = rut.replace(/[.-]/g, '');
    if (cleanRUT.length !== 9) return false;
    
    const body = cleanRUT.slice(0, -1);
    const dv = cleanRUT.slice(-1);
    
    let sum = 0;
    let multiplier = 2;
    
    for (let i = body.length - 1; i >= 0; i--) {
      sum += parseInt(body[i]) * multiplier;
      multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }
    
    const expectedDV = (11 - (sum % 11)) % 11;
    return dv === (expectedDV === 10 ? 'K' : expectedDV.toString());
  },

  // Validar contraseña
  isValidPassword: (password) => {
    return password.length >= 6;
  },

  // Mostrar error
  showError: (inputId, message) => {
    const input = document.getElementById(inputId);
    const error = document.getElementById(`${inputId}-error`);
    
    if (error) {
      error.textContent = message;
      error.style.display = 'block';
    }
    
    input.setAttribute('aria-invalid', 'true');
  },

  // Limpiar error
  clearError: (inputId) => {
    const error = document.getElementById(`${inputId}-error`);
    if (error) {
      error.textContent = '';
      error.style.display = 'none';
    }
    
    const input = document.getElementById(inputId);
    input.setAttribute('aria-invalid', 'false');
  },

  // Validar formulario completo
  validateForm: (formId) => {
    const form = document.getElementById(formId);
    if (!form) return false;

    let isValid = true;
    const inputs = form.querySelectorAll('input[required]');

    inputs.forEach(input => {
      if (!input.value.trim()) {
        FormValidator.showError(input.id, 'Este campo es requerido');
        isValid = false;
      } else if (input.type === 'email') {
        if (!FormValidator.isValidEmail(input.value)) {
          FormValidator.showError(input.id, 'Ingresa un correo válido');
          isValid = false;
        } else {
          FormValidator.clearError(input.id);
        }
      } else if (input.type === 'password') {
        if (!FormValidator.isValidPassword(input.value)) {
          FormValidator.showError(input.id, 'Mínimo 6 caracteres');
          isValid = false;
        } else {
          FormValidator.clearError(input.id);
        }
      }
    });

    return isValid;
  }
};

// Usar en formulario
document.getElementById('login-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  
  if (FormValidator.validateForm('login-form')) {
    // Enviar datos
    console.log('Formulario válido, enviando...');
  }
});

// Validación en tiempo real
document.getElementById('login-email')?.addEventListener('blur', (e) => {
  if (!FormValidator.isValidEmail(e.target.value)) {
    FormValidator.showError('login-email', 'Correo inválido');
  } else {
    FormValidator.clearError('login-email');
  }
});
```

---

## 🔐 Validación en Servidor (Backend)

⚠️ **IMPORTANTE**: La validación frontend es solo UX. SIEMPRE validar en backend:

```javascript
// En Google Apps Script (Fichas_SEGURO_standalone.gs)

function validarEmail(email) {
  const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return pattern.test(email);
}

function validarPassword(password) {
  return password && password.length >= 6;
}

function procesarLogin(email, password) {
  // VALIDAR EN BACKEND (no confiar en frontend)
  if (!validarEmail(email)) {
    return { error: 'Email inválido' };
  }
  
  if (!validarPassword(password)) {
    return { error: 'Contraseña inválida' };
  }
  
  // Continuar con autenticación Firebase
  // ...
}
```

---

## 📊 Checklist de Implementación

### Paso 1: HTML (15 min)
- [ ] Agregar `required` a inputs
- [ ] Agregar `minlength` a passwords
- [ ] Agregar `pattern` a emails
- [ ] Agregar `<span class="form-error">` para mensajes
- [ ] Agregar `role="alert"` en errores

### Paso 2: CSS (10 min)
- [ ] Estilos para `:invalid`
- [ ] Estilos para `:valid`
- [ ] Estilos para `.form-error`
- [ ] Estados de foco mejorados

### Paso 3: JavaScript (20 min)
- [ ] Copiar `FormValidator` object
- [ ] Agregar validación en `blur`
- [ ] Agregar validación en `submit`
- [ ] Prevenir submit si hay errores

### Paso 4: Testing (15 min)
- [ ] Probar con datos válidos
- [ ] Probar con datos inválidos
- [ ] Probar sin llenar campos
- [ ] Verificar accesibilidad (screen reader)

---

## ✨ Mejoras Futuras

- [ ] Confirmar contraseña (registro)
- [ ] Validación de RUT chileno
- [ ] Mostrar requerimientos de password (fuerte/débil)
- [ ] Recuperación de contraseña
- [ ] Verificación de email (código)
- [ ] Rate limiting de intentos

---

## 📚 Referencias

- [HTML5 Form Validation](https://developer.mozilla.org/en-US/docs/Learn/Forms/Form_validation)
- [WCAG 2.1 Form Labels](https://www.w3.org/WAI/WCAG21/Understanding/labels-or-instructions.html)
- [Input Validation Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
