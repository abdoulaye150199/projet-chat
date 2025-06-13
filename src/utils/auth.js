// Utilitaires pour la gestion de l'authentification

/**
 * Vérifie si l'utilisateur est connecté
 * @returns {boolean} true si l'utilisateur est connecté
 */
export function isAuthenticated() {
    return localStorage.getItem('whatsapp_user') !== null;
}

/**
 * Récupère les données de session de l'utilisateur
 * @returns {object|null} Les données de session ou null
 */
export function getSessionData() {
    try {
        const session = sessionStorage.getItem('whatsapp_session');
        return session ? JSON.parse(session) : null;
    } catch (error) {
        console.error('Erreur lors de la récupération des données de session:', error);
        return null;
    }
}

/**
 * Déconnecte l'utilisateur
 */
export function logout() {
  try {
    localStorage.removeItem('whatsapp_user');
    sessionStorage.clear();
    window.location.replace('./login.html');
  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error);
    throw error;
  }
}

/**
 * Vérifie l'authentification et redirige si nécessaire
 */
export function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

/**
 * Redirige vers l'app si déjà connecté
 */
export function redirectIfAuthenticated() {
    if (isAuthenticated()) {
        window.location.href = 'index.html';
        return true;
    }
    return false;
}

/**
 * Valide un numéro de téléphone selon le pays
 * @param {string} phone - Le numéro de téléphone à valider
 * @param {string} countryCode - Le code du pays
 * @returns {boolean} true si le numéro est valide
 */
export function validatePhoneNumber(phone, countryCode) {
    // Import country validation from countryData
    const { validatePhoneNumber: validateCountryPhone } = require('./countryData.js');
    return validateCountryPhone(phone, countryCode);
}

/**
 * Formate un numéro de téléphone selon le pays
 * @param {string} phone - Le numéro brut
 * @param {string} countryCode - Le code du pays
 * @returns {string} Le numéro formaté
 */
export function formatPhoneNumber(phone, countryCode) {
    const { formatPhoneNumber: formatCountryPhone } = require('./countryData.js');
    return formatCountryPhone(phone, countryCode);
}

/**
 * Fonction d'inscription
 * @param {string} phoneNumber - Numéro de téléphone de l'utilisateur
 * @param {string} firstName - Prénom de
 * @param {string} lastName 
 * @param {string} countryCode 
 */
const API_URL = 'https://serveur2.onrender.com';

export async function register(phoneNumber, firstName, lastName, countryCode = 'SN') {
    try {
        const user = {
            id: Date.now().toString(),
            phone: phoneNumber,
            firstName: firstName,
            lastName: lastName,
            name: `${firstName} ${lastName}`,
            countryCode: countryCode,
            status: "Hey! J'utilise WhatsApp",
            online: false,
            avatar: `https://api.dicebear.com/6.x/initials/svg?seed=${firstName} ${lastName}`,
            registeredAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
        };

        // Sauvegarder sur le serveur distant
        const response = await fetch(`${API_URL}/contacts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(user)
        });

        if (!response.ok) {
            throw new Error('Erreur lors de l\'inscription');
        }

        const savedUser = await response.json();

        // Sauvegarder en local pour la session
        localStorage.setItem('whatsapp_user', JSON.stringify(savedUser));

        return savedUser;
    } catch (error) {
        console.error('Erreur d\'inscription:', error);
        throw error;
    }
}

export async function login(phoneNumber, countryCode = 'SN') {
    try {
        const response = await fetch(`${API_URL}/contacts`);
        if (!response.ok) {
            throw new Error('Erreur de connexion au serveur');
        }
        
        const contacts = await response.json();
        
        // Nettoyer les numéros pour la comparaison
        const cleanInputPhone = phoneNumber.replace(/\s+/g, '');
        
        const user = contacts.find(c => {
            const cleanContactPhone = c.phone.replace(/\s+/g, '');
            return cleanContactPhone === cleanInputPhone;
        });

        if (!user) {
            throw new Error('Numéro non enregistré');
        }

        // Mise à jour du lastLogin sur le serveur
        await fetch(`${API_URL}/contacts/${user.id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                lastLogin: new Date().toISOString()
            })
        });

        // Stocker les infos utilisateur
        localStorage.setItem('whatsapp_user', JSON.stringify({
            ...user,
            lastLogin: new Date().toISOString()
        }));

        return user;
    } catch (error) {
        console.error('Erreur de connexion:', error);
        throw error;
    }
}

/**
 * Récupère les informations de l'utilisateur connecté
 * @returns {object|null} Les données de l'utilisateur ou null
 */
export function getCurrentUser() {
    try {
        const userData = localStorage.getItem('whatsapp_user');
        return userData ? JSON.parse(userData) : {
            id: 1,
            name: 'AbdAllah',
            phone: '+221 77 123 45 67'
        };
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'utilisateur:', error);
        return {
            id: 1,
            name: 'AbdAllah',
            phone: '+221 77 123 45 67'
        };
    }
}

// Fonctions de validation spécifiques (gardées pour compatibilité)
export function validateSenegalPhone(phone) {
    const phoneNumber = phone.replace(/\D/g, '');
    const phoneRegex = /^(70|75|76|77|78)[0-9]{7}$/;
    return phoneRegex.test(phoneNumber);
}

export function formatSenegalPhone(phone) {
    const phoneNumber = phone.replace(/\D/g, '');
    
    if (phoneNumber.length !== 9) return phone;
    
    return `${phoneNumber.slice(0, 2)} ${phoneNumber.slice(2, 5)} ${phoneNumber.slice(5, 7)} ${phoneNumber.slice(7, 9)}`;
}

// Autres fonctions utilitaires (gardées pour compatibilité)
export function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

export function sendSMS(phone, code) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            console.log(`SMS envoyé à ${phone} avec le code: ${code}`);
            if (Math.random() > 0.05) {
                resolve({ success: true, message: 'SMS envoyé avec succès' });
            } else {
                reject(new Error('Échec de l\'envoi du SMS'));
            }
        }, 1000 + Math.random() * 2000);
    });
}

export function validateVerificationCode(inputCode, expectedCode) {
    return inputCode === expectedCode;
}

export function isCodeExpired(timestamp, expirationMinutes = 5) {
    const now = new Date().getTime();
    const codeTime = new Date(timestamp).getTime();
    const expirationTime = expirationMinutes * 60 * 1000;
    
    return (now - codeTime) > expirationTime;
}

export function storeVerificationCode(phone, code) {
    const codeData = {
        phone: phone,
        code: code,
        timestamp: new Date().toISOString()
    };
    
    try {
        sessionStorage.setItem('verification_code', JSON.stringify(codeData));
    } catch (error) {
        console.error('Erreur lors du stockage du code:', error);
    }
}

export function getStoredVerificationCode(phone) {
    try {
        const stored = sessionStorage.getItem('verification_code');
        if (!stored) return null;
        
        const codeData = JSON.parse(stored);
        if (codeData.phone !== phone) return null;
        
        if (isCodeExpired(codeData.timestamp)) {
            sessionStorage.removeItem('verification_code');
            return null;
        }
        
        return codeData;
    } catch (error) {
        console.error('Erreur lors de la récupération du code:', error);
        return null;
    }
}

export function clearVerificationData() {
    try {
        sessionStorage.removeItem('verification_code');
    } catch (error) {
        console.error('Erreur lors du nettoyage:', error);
    }
}