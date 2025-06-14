import { generateRandomAvatar } from '../utils/helpers.js';
import { getCurrentUser as getAuthUser } from '../utils/auth.js';

// Current user information - sera mis à jour dynamiquement
let currentUser = null;

export function getCurrentUser() {
  // Récupérer l'utilisateur connecté depuis l'auth
  const authUser = getAuthUser();
  
  if (authUser && authUser.id !== 1) {
    // Utilisateur réel connecté
    currentUser = {
      id: authUser.id,
      name: authUser.name || `${authUser.firstName} ${authUser.lastName}`,
      firstName: authUser.firstName,
      lastName: authUser.lastName,
      status: authUser.status || 'Salut ! J\'utilise WhatsApp.',
      avatar: authUser.avatar || `https://api.dicebear.com/6.x/initials/svg?seed=${authUser.name}`,
      phone: authUser.phone,
      online: authUser.online || authUser.isOnline || false,
      lastSeen: authUser.lastSeen || new Date().toISOString()
    };
  } else {
    // Fallback pour les tests
    currentUser = {
      id: 1,
      name: 'Utilisateur',
      status: 'Salut ! J\'utilise WhatsApp.',
      avatar: 'https://api.dicebear.com/6.x/initials/svg?seed=Utilisateur',
      phone: '+221 77 123 45 67'
    };
  }
  
  return currentUser;
}

export function updateUserProfile(data) {
  const authUser = getAuthUser();
  
  if (authUser && authUser.id !== 1) {
    // Mettre à jour l'utilisateur réel
    const updatedUser = { ...authUser, ...data };
    localStorage.setItem('whatsapp_user', JSON.stringify(updatedUser));
    currentUser = { ...currentUser, ...data };
  } else {
    // Fallback pour les tests
    currentUser = { ...currentUser, ...data };
  }
  
  updateProfileUI();
}

export function updateProfileUI() {
  const user = getCurrentUser();
  
  // Mettre à jour l'avatar dans la barre latérale
  const sidebarAvatar = document.getElementById('current-user-avatar');
  if (sidebarAvatar) {
    sidebarAvatar.src = user.avatar;
    sidebarAvatar.alt = user.name;
  }

  // Mettre à jour l'avatar dans les paramètres si visible
  const settingsAvatar = document.querySelector('#settings-container img');
  if (settingsAvatar) {
    settingsAvatar.src = user.avatar;
  }
  
  // Mettre à jour le nom dans les paramètres
  const profileName = document.getElementById('profile-name');
  if (profileName) {
    profileName.textContent = user.name;
  }
  
  // Mettre à jour le statut dans les paramètres
  const profileStatus = document.querySelector('#settings-container p');
  if (profileStatus && profileStatus.textContent.includes('WhatsApp')) {
    profileStatus.textContent = user.status;
  }
}

// Initialiser le profil au chargement
export function initUserProfile() {
  const user = getCurrentUser();
  updateProfileUI();
  return user;
}