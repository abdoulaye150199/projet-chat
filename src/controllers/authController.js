import { getCurrentUser } from '../utils/auth.js';

function formatPhoneNumber(phone, countryCode) {
  // Supprimer tous les caractères non numériques
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Si le numéro commence déjà par 221, ne pas l'ajouter à nouveau
  if (cleanPhone.startsWith('221')) {
    return `+${cleanPhone}`;
  }
  
  // Sinon, ajouter 221 au début
  return `+221 ${cleanPhone}`;
}

async function registerUser(userData) {
  try {
    const formattedPhone = formatPhoneNumber(userData.phone, userData.countryCode);
    
    const newUser = {
      id: Date.now().toString(),
      phone: formattedPhone, // Utiliser le numéro formaté
      firstName: userData.firstName,
      lastName: userData.lastName,
      name: `${userData.firstName} ${userData.lastName}`,
      countryCode: '221',
      status: "Hey! J'utilise WhatsApp",
      online: true,
      avatar: `https://api.dicebear.com/6.x/initials/svg?seed=${userData.firstName} ${userData.lastName}`,
      registeredAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      isOnline: true,
      createdAt: new Date().toISOString()
    };

    // Sauvegarder l'utilisateur (logique à implémenter)
    return newUser;
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement:', error);
    throw error;
  }
}

export { formatPhoneNumber, registerUser };