// Configuration des URLs d'API
const API_CONFIG = {
    LOCAL: 'http://localhost:3000',
    PRODUCTION: 'https://serveur2.onrender.com'
};

// Utiliser l'URL locale en développement
const API_URL = 'http://localhost:3000';

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
export async function register(phoneNumber, firstName, lastName, countryCode = 'SN') {
    try {
        // Formater le numéro de téléphone
        const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${countryCode}${phoneNumber}`;

        // Créer le nouvel utilisateur avec la structure exacte
        const newUser = {
            id: Date.now().toString(),
            phone: formattedPhone,
            firstName,
            lastName,
            name: `${firstName} ${lastName}`,
            countryCode,
            status: "Hey! J'utilise WhatsApp",
            online: true,
            avatar: `https://api.dicebear.com/6.x/initials/svg?seed=${firstName} ${lastName}`,
            registeredAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            lastSeen: new Date().toISOString(),
            isOnline: true,
            createdAt: new Date().toISOString()
        };

        // Vérifier si l'utilisateur existe déjà
        const response = await fetch(`${API_URL}/users`);
        if (!response.ok) {
            throw new Error('Erreur de connexion au serveur');
        }
        
        const users = await response.json();
        if (users.some(user => user.phone === formattedPhone)) {
            throw new Error('Ce numéro est déjà inscrit');
        }

        // Ajouter l'utilisateur à la base de données
        const saveResponse = await fetch(`${API_URL}/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newUser)
        });

        if (!saveResponse.ok) {
            throw new Error('Erreur lors de l\'enregistrement');
        }

        const savedUser = await saveResponse.json();
        localStorage.setItem('whatsapp_user', JSON.stringify(savedUser));

        return savedUser;
    } catch (error) {
        console.error('Erreur d\'inscription:', error);
        throw error;
    }
}

export async function login(phoneNumber, countryCode = 'SN') {
    try {
        // Récupérer la liste des utilisateurs au lieu des contacts
        const response = await fetch(`${API_URL}/users`);
        if (!response.ok) {
            throw new Error('Erreur de connexion au serveur');
        }
        
        const users = await response.json();
        
        // Nettoyer et formater le numéro de téléphone pour la comparaison
        const cleanInputPhone = phoneNumber.replace(/\s+/g, '');
        
        const user = users.find(u => {
            if (!u || !u.phone) return false;
            const cleanUserPhone = u.phone.replace(/\s+/g, '');
            return cleanUserPhone === cleanInputPhone;
        });

        if (!user) {
            throw new Error(`Numéro ${phoneNumber} non enregistré. Veuillez vous inscrire.`);
        }

        // Mise à jour du lastLogin sur le serveur
        const updateResponse = await fetch(`${API_URL}/users/${user.id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                lastLogin: new Date().toISOString(),
                isOnline: true
            })
        });

        if (!updateResponse.ok) {
            console.warn('Erreur lors de la mise à jour du lastLogin');
        }

        // Mettre à jour les données en local
        const updatedUser = {
            ...user,
            lastLogin: new Date().toISOString(),
            isOnline: true
        };

        // Stocker les infos utilisateur
        localStorage.setItem('whatsapp_user', JSON.stringify(updatedUser));

        return updatedUser;
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