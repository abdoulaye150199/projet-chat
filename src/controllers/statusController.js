// Nouveau contrôleur pour gérer les statuts WhatsApp
import { renderStatusView } from '../views/statusView.js';

// Configuration des URLs d'API
const API_CONFIG = {
    LOCAL: 'http://localhost:3000',
    PRODUCTION: 'https://serveur2.onrender.com'
};

function getApiUrl() {
    if (window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1' || 
        window.location.hostname === '') {
        return API_CONFIG.LOCAL;
    }
    return API_CONFIG.PRODUCTION;
}

const API_URL = getApiUrl();

let currentStatuses = [];

export function initStatusController() {
  // Charger les statuts depuis le localStorage et l'API
  loadStatuses();
  
  // Écouter les événements de statut
  document.addEventListener('status-created', handleStatusCreated);
  document.addEventListener('status-viewed', handleStatusViewed);
}

async function loadStatuses() {
  try {
    // Charger depuis l'API
    const response = await fetch(`${API_URL}/statuses`);
    if (response.ok) {
      const apiStatuses = await response.json();
      
      // Nettoyer les statuts expirés (plus de 24h)
      const now = Date.now();
      const validStatuses = apiStatuses.filter(status => 
        now - new Date(status.createdAt).getTime() < 24 * 60 * 60 * 1000
      );
      
      currentStatuses = validStatuses;
      
      // Sauvegarder en local
      localStorage.setItem('whatsapp_statuses', JSON.stringify(currentStatuses));
    } else {
      throw new Error('API non disponible');
    }
  } catch (error) {
    console.warn('Erreur API, utilisation des données locales:', error);
    
    // Fallback vers localStorage
    const savedStatuses = localStorage.getItem('whatsapp_statuses');
    currentStatuses = savedStatuses ? JSON.parse(savedStatuses) : [];
    
    // Nettoyer les statuts expirés
    const now = Date.now();
    currentStatuses = currentStatuses.filter(status => 
      now - new Date(status.createdAt).getTime() < 24 * 60 * 60 * 1000
    );
    
    saveStatuses();
  }
}

function saveStatuses() {
  localStorage.setItem('whatsapp_statuses', JSON.stringify(currentStatuses));
}

export async function createStatus(content, type = 'text', backgroundColor = '#00a884', caption = '') {
  try {
    const currentUser = JSON.parse(localStorage.getItem('whatsapp_user')) || { id: 1, name: 'Utilisateur' };
    
    const newStatus = {
      id: Date.now(),
      userId: currentUser.id,
      userName: currentUser.name || `${currentUser.firstName} ${currentUser.lastName}`,
      userAvatar: currentUser.avatar || `https://api.dicebear.com/6.x/initials/svg?seed=${currentUser.name}`,
      content: content,
      caption: caption,
      type: type, // 'text', 'image', 'video'
      backgroundColor: backgroundColor,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      viewedBy: [],
      isOwn: true
    };
    
    // Ajouter au stockage local
    currentStatuses.unshift(newStatus);
    saveStatuses();

    // Ajouter à l'API
    try {
      const response = await fetch(`${API_URL}/statuses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newStatus)
      });

      if (!response.ok) {
        console.warn('Erreur lors de l\'ajout du statut à l\'API');
      }
    } catch (apiError) {
      console.warn('API non disponible, statut sauvegardé localement:', apiError);
    }

    // Émettre un événement
    const event = new CustomEvent('status-created', { detail: newStatus });
    document.dispatchEvent(event);
    
    return newStatus;
  } catch (error) {
    console.error('Erreur lors de la création du statut:', error);
    throw error;
  }
}

export function viewStatus(statusId, viewerId = 'current-user') {
  const status = currentStatuses.find(s => s.id === statusId);
  if (status && !status.viewedBy.includes(viewerId)) {
    status.viewedBy.push(viewerId);
    saveStatuses();
    
    // Mettre à jour sur l'API
    updateStatusOnAPI(status);
    
    const event = new CustomEvent('status-viewed', { detail: { statusId, viewerId } });
    document.dispatchEvent(event);
  }
}

async function updateStatusOnAPI(status) {
  try {
    await fetch(`${API_URL}/statuses/${status.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(status)
    });
  } catch (error) {
    console.warn('Erreur lors de la mise à jour du statut sur l\'API:', error);
  }
}

export function getAllStatuses() {
  return currentStatuses;
}

export function getMyStatuses() {
  const currentUser = JSON.parse(localStorage.getItem('whatsapp_user')) || { id: 1 };
  return currentStatuses.filter(status => status.userId === currentUser.id);
}

export function getOthersStatuses() {
  const currentUser = JSON.parse(localStorage.getItem('whatsapp_user')) || { id: 1 };
  return currentStatuses.filter(status => status.userId !== currentUser.id);
}

export async function getStatusesByUserId(userId) {
  try {
    const response = await fetch(`${API_URL}/statuses`);
    if (response.ok) {
      const allStatuses = await response.json();
      return allStatuses.filter(status => status.userId === userId);
    }
  } catch (error) {
    console.warn('Erreur API, utilisation des données locales:', error);
  }
  
  return currentStatuses.filter(status => status.userId === userId);
}

function handleStatusCreated(event) {
  console.log('Nouveau statut créé:', event.detail);
}

function handleStatusViewed(event) {
  console.log('Statut vu:', event.detail);
}

export async function deleteStatus(statusId) {
  try {
    // Supprimer localement
    currentStatuses = currentStatuses.filter(status => status.id !== statusId);
    saveStatuses();
    
    // Supprimer de l'API
    try {
      await fetch(`${API_URL}/statuses/${statusId}`, {
        method: 'DELETE'
      });
    } catch (apiError) {
      console.warn('Erreur lors de la suppression du statut sur l\'API:', apiError);
    }
    
    return true;
  } catch (error) {
    console.error('Erreur lors de la suppression du statut:', error);
    return false;
  }
}

// Fonction pour synchroniser les statuts des autres utilisateurs
export async function syncOtherUsersStatuses() {
  try {
    const response = await fetch(`${API_URL}/statuses`);
    if (response.ok) {
      const allStatuses = await response.json();
      const currentUser = JSON.parse(localStorage.getItem('whatsapp_user')) || { id: 1 };
      
      // Filtrer les statuts des autres utilisateurs
      const otherStatuses = allStatuses.filter(status => 
        status.userId !== currentUser.id &&
        new Date(status.expiresAt).getTime() > Date.now()
      );
      
      // Fusionner avec les statuts locaux
      const myStatuses = currentStatuses.filter(status => status.userId === currentUser.id);
      currentStatuses = [...myStatuses, ...otherStatuses];
      
      saveStatuses();
      return otherStatuses;
    }
  } catch (error) {
    console.warn('Erreur lors de la synchronisation des statuts:', error);
  }
  
  return [];
}

// Démarrer la synchronisation périodique des statuts
export function startStatusSync() {
  // Synchroniser immédiatement
  syncOtherUsersStatuses();
  
  // Puis synchroniser toutes les 30 secondes
  setInterval(syncOtherUsersStatuses, 30000);
}