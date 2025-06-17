import './index.css';
import { renderIcons } from './utils/helpers.js';
import { initApp } from './controllers/appController.js';
import { isAuthenticated, requireAuth } from './utils/auth.js';
import { generateInitialsAvatarUrl } from './utils/avatarGenerator.js';
import { renderAttachmentModal } from './views/attachmentModalView.js';
import realtimeService from './services/realtimeService.js';

// Fonction pour initialiser les gestionnaires d'événements
function initializeEventListeners() {
  const attachButton = document.getElementById('attach-btn');
  
  if (attachButton) {
    attachButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const rect = e.currentTarget.getBoundingClientRect();
      const position = {
        x: rect.left,
        y: rect.bottom + 5
      };
      
      renderAttachmentModal(position);
    });
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initializeEventListeners();
  
  // Render all icons
  renderIcons();
  
  // Vérifier si on est sur la page de login
  const isLoginPage = window.location.pathname.includes('login.html');
  
  if (isLoginPage) {
    // Si déjà connecté, rediriger vers l'app
    if (isAuthenticated()) {
      window.location.href = 'index.html';
      return;
    }
    
    // Modifier le texte du bouton de connexion
    const btnText = document.getElementById('btnText');
    if (btnText) {
      btnText.textContent = 'Se connecter';
    }
    
    return;
  }

  // Pour toutes les autres pages, vérifier l'authentification
  if (!requireAuth()) {
    // requireAuth redirige déjà vers login.html si non authentifié
    return;
  }

  // Initialize the application only if authenticated
  initApp();
  
  // Initialiser le service temps réel
  if (isAuthenticated()) {
    realtimeService.connect();
    
    // Gérer les événements de connexion
    realtimeService.on('connected', () => {
      console.log('✅ Connecté au service temps réel');
      showConnectionStatus('connected');
    });
    
    realtimeService.on('disconnected', () => {
      console.log('❌ Déconnecté du service temps réel');
      showConnectionStatus('disconnected');
    });
    
    realtimeService.on('reconnectFailed', () => {
      console.log('❌ Échec de reconnexion');
      showConnectionStatus('failed');
    });
  }
});

// Fonction pour afficher le statut de connexion
function showConnectionStatus(status) {
  // Supprimer l'ancien indicateur
  const existingIndicator = document.getElementById('connection-status');
  if (existingIndicator) {
    existingIndicator.remove();
  }
  
  // Créer le nouvel indicateur
  const indicator = document.createElement('div');
  indicator.id = 'connection-status';
  indicator.className = `fixed top-4 right-4 px-3 py-2 rounded-lg text-white text-sm z-50 transition-all duration-300`;
  
  switch (status) {
    case 'connected':
      indicator.className += ' bg-green-500';
      indicator.textContent = '🟢 Connecté';
      // Masquer après 3 secondes
      setTimeout(() => {
        if (indicator.parentNode) {
          indicator.style.opacity = '0';
          setTimeout(() => indicator.remove(), 300);
        }
      }, 3000);
      break;
    case 'disconnected':
      indicator.className += ' bg-yellow-500';
      indicator.textContent = '🟡 Reconnexion...';
      break;
    case 'failed':
      indicator.className += ' bg-red-500';
      indicator.textContent = '🔴 Hors ligne';
      break;
  }
  
  document.body.appendChild(indicator);
}

// Gérer la fermeture de l'application
window.addEventListener('beforeunload', () => {
  if (realtimeService) {
    realtimeService.disconnect();
  }
});

// Expose the function to the window object
window.generateInitialsAvatarUrl = generateInitialsAvatarUrl;