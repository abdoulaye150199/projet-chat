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

async function register(userData) {
  // ...existing code...
  
  const formattedPhone = formatPhoneNumber(userData.phone, userData.countryCode);
  
  const newUser = {
    id: Date.now().toString(),
    phone: formattedPhone, // Utiliser le numéro formaté
    firstName: userData.firstName,
    lastName: userData.lastName,
    name: `${userData.firstName} ${userData.lastName}`,
    countryCode: 'SN',
    // ...reste des données utilisateur...
  };
  
  // ...existing code...
}