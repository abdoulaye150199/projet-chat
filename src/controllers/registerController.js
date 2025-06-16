import { register } from '../utils/auth.js';
import { countries, validatePhoneNumber, formatPhoneNumber } from '../utils/countryData.js';

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const firstNameInput = document.getElementById('firstName');
    const lastNameInput = document.getElementById('lastName');
    const phoneInput = document.getElementById('phone');
    const countrySelect = document.getElementById('country');
    const submitBtn = document.getElementById('submit-btn');
    const loadingOverlay = document.getElementById('loadingOverlay');

    if (!registerForm || !firstNameInput || !lastNameInput || !phoneInput || !submitBtn || !loadingOverlay || !countrySelect) {
        console.error('Éléments manquants dans le DOM');
        return;
    }

    // Populate country select
    populateCountrySelect();

    function populateCountrySelect() {
        countrySelect.innerHTML = countries.map(country => 
            `<option value="${country.code}" ${country.code === 'SN' ? 'selected' : ''}>
                ${country.flag} ${country.name} (${country.dialCode})
            </option>`
        ).join('');
        
        // Set initial phone value
        const selectedCountry = countries.find(c => c.code === countrySelect.value);
        phoneInput.value = selectedCountry.dialCode;
    }

    function validateName(value, fieldName) {
        if (!value.trim()) {
            showError(`${fieldName}-error`, `Le ${fieldName.toLowerCase()} est requis`);
            return false;
        }
        if (value.trim().length < 2) {
            showError(`${fieldName}-error`, `Le ${fieldName.toLowerCase()} doit contenir au moins 2 caractères`);
            return false;
        }
        if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(value.trim())) {
            showError(`${fieldName}-error`, `Le ${fieldName.toLowerCase()} ne doit contenir que des lettres`);
            return false;
        }
        hideError(`${fieldName}-error`);
        return true;
    }

    function validatePhone(value, countryCode) {
        const isValid = validatePhoneNumber(value, countryCode);
        
        if (!isValid) {
            const country = countries.find(c => c.code === countryCode);
            showError('phone-error', `Format invalide pour ${country.name}. Format attendu: ${country.dialCode} ${country.format}`);
            return false;
        }
        
        hideError('phone-error');
        return true;
    }

    function showError(errorId, message) {
        const errorDiv = document.getElementById(errorId);
        const inputId = errorId.replace('-error', '');
        const inputElement = document.getElementById(inputId);
        
        if (errorDiv) errorDiv.textContent = message;
        if (inputElement) inputElement.classList.add('border-red-500');
    }

    function hideError(errorId) {
        const errorDiv = document.getElementById(errorId);
        const inputId = errorId.replace('-error', '');
        const inputElement = document.getElementById(inputId);
        
        if (errorDiv) errorDiv.textContent = '';
        if (inputElement) inputElement.classList.remove('border-red-500');
    }

    // Event listeners
    firstNameInput.addEventListener('input', (e) => {
        validateName(e.target.value, 'firstName');
    });

    lastNameInput.addEventListener('input', (e) => {
        validateName(e.target.value, 'lastName');
    });

    countrySelect.addEventListener('change', (e) => {
        const selectedCountry = countries.find(c => c.code === e.target.value);
        phoneInput.value = selectedCountry.dialCode;
        hideError('phone-error');
    });

    phoneInput.addEventListener('input', (e) => {
        const selectedCountry = countries.find(c => c.code === countrySelect.value);
        let value = e.target.value;
        
        // Ensure it starts with the correct dial code
        if (!value.startsWith(selectedCountry.dialCode)) {
            value = selectedCountry.dialCode;
        }
        
        // Format the number
        const formatted = formatPhoneNumber(value, selectedCountry.code);
        e.target.value = formatted;
        
        // Validate
        validatePhone(formatted, selectedCountry.code);
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const firstName = firstNameInput.value.trim();
        const lastName = lastNameInput.value.trim();
        const selectedCountry = countries.find(c => c.code === countrySelect.value);
        const phoneNumber = phoneInput.value;
        
        // Validate all fields
        const isFirstNameValid = validateName(firstName, 'firstName');
        const isLastNameValid = validateName(lastName, 'lastName');
        const isPhoneValid = validatePhone(phoneNumber, selectedCountry.code);
        
        if (!isFirstNameValid || !isLastNameValid || !isPhoneValid) {
            return;
        }
        
        try {
            loadingOverlay.classList.remove('hidden');
            submitBtn.disabled = true;
            
            const localNumber = phoneNumber.replace(selectedCountry.dialCode, '').replace(/\s/g, '');
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            register(localNumber, firstName, lastName, selectedCountry.code);
            window.location.replace('./index.html');
            
        } catch (error) {
            console.error('Erreur lors de l\'inscription:', error);
            showError('phone-error', 'Une erreur est survenue lors de l\'inscription');
        } finally {
            loadingOverlay.classList.add('hidden');
            submitBtn.disabled = false;
        }
    });
});

function formatPhoneNumber(phone, countryCode) {
  // Supprimer tous les caractères non numériques
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Mapping des codes pays
  const countryMapping = {
    'SN': '221',
    // Ajouter d'autres pays au besoin
  };
  
  // Obtenir le code du pays à partir du mapping
  const dialCode = countryMapping[countryCode] || countryCode;
  
  // Si le numéro commence déjà par le code pays, ne pas l'ajouter
  if (cleanPhone.startsWith(dialCode)) {
    return `+${cleanPhone}`;
  }
  
  // Sinon, ajouter le code pays
  return `+${dialCode} ${cleanPhone}`;
}

async function registerUser(userData) {
  try {
    const formattedPhone = formatPhoneNumber(userData.phone, userData.countryCode);
    
    const newUser = {
      id: Date.now().toString(),
      phone: formattedPhone,
      firstName: userData.firstName,
      lastName: userData.lastName,
      name: `${userData.firstName} ${userData.lastName}`,
      countryCode: userData.countryCode,
      status: "Hey! J'utilise WhatsApp",
      online: true,
      avatar: `https://api.dicebear.com/6.x/initials/svg?seed=${userData.firstName} ${userData.lastName}`,
      registeredAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      isOnline: true,
      createdAt: new Date().toISOString()
    };

    // ...reste du code d'enregistrement
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement:', error);
    throw error;
  }
}