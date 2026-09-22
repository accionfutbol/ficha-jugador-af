/**
 * Form Validator - Validación de formularios reutilizable
 * WCAG 2.1 AA compliant
 */

const FormValidator = {
  // Validar email RFC 5322
  isValidEmail: (email) => {
    const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return pattern.test(email);
  },

  // Validar RUT chileno (formato: 12.345.678-9 o 123456789)
  isValidRUT: (rut) => {
    const cleanRUT = rut.replace(/[.-]/g, '').toUpperCase();
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
    const expectedChar = expectedDV === 10 ? 'K' : expectedDV.toString();

    return dv === expectedChar;
  },

  // Validar contraseña
  isValidPassword: (password) => {
    return password && password.length >= 6;
  },

  // Validar nombre (letras, espacios, acentos)
  isValidName: (name) => {
    const pattern = /^[a-záéíóúñA-ZÁÉÍÓÚÑ\s]+$/;
    return pattern.test(name.trim()) && name.trim().length >= 2;
  },

  // Validar teléfono (9 dígitos)
  isValidPhone: (phone) => {
    const pattern = /^[0-9]{9}$/;
    return pattern.test(phone.replace(/\D/g, ''));
  },

  // Mostrar error
  showError: (inputId, message) => {
    const input = document.getElementById(inputId);
    if (!input) return;

    const errorId = `${inputId}-error`;
    let error = document.getElementById(errorId);

    // Crear span de error si no existe
    if (!error) {
      error = document.createElement('span');
      error.id = errorId;
      error.className = 'form-error';
      error.setAttribute('role', 'alert');
      input.parentElement.appendChild(error);
    }

    error.textContent = message;
    error.style.display = 'block';
    input.setAttribute('aria-invalid', 'true');
    input.classList.add('input-error');
  },

  // Limpiar error
  clearError: (inputId) => {
    const input = document.getElementById(inputId);
    if (!input) return;

    const error = document.getElementById(`${inputId}-error`);
    if (error) {
      error.textContent = '';
      error.style.display = 'none';
    }

    input.setAttribute('aria-invalid', 'false');
    input.classList.remove('input-error');
  },

  // Validar un campo específico
  validateField: (inputId) => {
    const input = document.getElementById(inputId);
    if (!input) return true;

    const value = input.value.trim();
    const type = input.type || input.getAttribute('data-type');

    // Campo requerido
    if (input.hasAttribute('required') && !value) {
      FormValidator.showError(inputId, 'Este campo es requerido');
      return false;
    }

    // Si está vacío y no es requerido, está ok
    if (!value && !input.hasAttribute('required')) {
      FormValidator.clearError(inputId);
      return true;
    }

    // Validaciones por tipo
    if (type === 'email' && value) {
      if (!FormValidator.isValidEmail(value)) {
        FormValidator.showError(inputId, 'Ingresa un correo válido');
        return false;
      }
    }

    if (type === 'password' && value) {
      if (!FormValidator.isValidPassword(value)) {
        FormValidator.showError(inputId, 'Mínimo 6 caracteres');
        return false;
      }
    }

    if (type === 'rut' && value) {
      if (!FormValidator.isValidRUT(value)) {
        FormValidator.showError(inputId, 'RUT inválido (ej: 12.345.678-9)');
        return false;
      }
    }

    if (type === 'name' && value) {
      if (!FormValidator.isValidName(value)) {
        FormValidator.showError(inputId, 'Solo se permiten letras y espacios');
        return false;
      }
    }

    if (type === 'phone' && value) {
      if (!FormValidator.isValidPhone(value)) {
        FormValidator.showError(inputId, 'Ingresa 9 dígitos');
        return false;
      }
    }

    // Validación minlength
    if (input.hasAttribute('minlength')) {
      const minLength = parseInt(input.getAttribute('minlength'));
      if (value.length < minLength) {
        FormValidator.showError(inputId, `Mínimo ${minLength} caracteres`);
        return false;
      }
    }

    // Si llegamos aquí, es válido
    FormValidator.clearError(inputId);
    return true;
  },

  // Validar formulario completo
  validateForm: (formId) => {
    const form = document.getElementById(formId);
    if (!form) return false;

    let isValid = true;
    const inputs = form.querySelectorAll('input[required], input[data-validate]');

    inputs.forEach(input => {
      if (!FormValidator.validateField(input.id)) {
        isValid = false;
      }
    });

    return isValid;
  },

  // Agregar listeners a formulario
  setupForm: (formId, onSubmit) => {
    const form = document.getElementById(formId);
    if (!form) return;

    // Validación en blur
    form.querySelectorAll('input').forEach(input => {
      input.addEventListener('blur', () => {
        FormValidator.validateField(input.id);
      });

      // Limpiar error al escribir
      input.addEventListener('input', () => {
        if (document.getElementById(`${input.id}-error`)?.textContent) {
          FormValidator.validateField(input.id);
        }
      });
    });

    // Validación en submit
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      if (FormValidator.validateForm(formId)) {
        if (typeof onSubmit === 'function') {
          onSubmit(form);
        }
      }
    });
  },

  // Deshabilitar botón si hay errores
  updateSubmitButton: (formId, buttonId) => {
    const form = document.getElementById(formId);
    const button = document.getElementById(buttonId);

    if (!form || !button) return;

    const updateState = () => {
      const inputs = form.querySelectorAll('input[required]');
      let allValid = true;

      inputs.forEach(input => {
        if (!input.value.trim()) {
          allValid = false;
        }
      });

      button.disabled = !allValid;
    };

    form.querySelectorAll('input').forEach(input => {
      input.addEventListener('input', updateState);
    });

    updateState();
  }
};

/**
 * Ejemplo de uso:
 *
 * // Configurar formulario
 * FormValidator.setupForm('login-form', (form) => {
 *   console.log('Formulario válido, datos:', new FormData(form));
 * });
 *
 * // Deshabilitar botón si hay errores
 * FormValidator.updateSubmitButton('login-form', 'login-btn');
 */
