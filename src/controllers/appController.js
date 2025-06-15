import { getCurrentUser } from '../models/userModel.js';
import { initChat } from './chatController.js';
import { renderSettingsView, hideSettingsView } from '../views/settingsView.js';
import { renderStatusView, hideStatusView } from '../views/statusView.js';
import { initMenuController } from './menuController.js';
import { initChatFilters } from '../views/chatView.js';
import { initStatusController } from './statusController.js';

let currentActiveChat = null;

function initApp() {
  setCurrentUserAvatar();
  
  initChat();
  initChatFilters();
  initStatusController();
  initMenuController();
  initNavigation();
}

function setCurrentUserAvatar() {
  const currentUser = getCurrentUser();
  const avatarElement = document.getElementById('current-user-avatar');
  
  if (avatarElement) {
    avatarElement.src = currentUser.avatar;
  }
}

function initNavigation() {
  const statusBtn = document.getElementById('status-btn');
  const channelsBtn = document.getElementById('channels-btn');
  const chatsBtn = document.getElementById('chats-btn');
  const communitiesBtn = document.getElementById('communities-btn');
  const settingsBtn = document.getElementById('settings-btn');

  statusBtn.addEventListener('click', () => {
    // Sauvegarder le chat actuel avant de changer de vue
    saveCurrentChatState();
    switchTab('status');
    hideAllViews();
    renderStatusView();
  });
  
  channelsBtn.addEventListener('click', () => {
    switchTab('channels');
    hideAllViews();
    showChatList();
    // Restaurer le chat actif si il y en avait un
    restoreCurrentChatState();
  });
  
  chatsBtn.addEventListener('click', () => {
    switchTab('chats');
    hideAllViews();
    showChatList();
    // Restaurer le chat actif si il y en avait un
    restoreCurrentChatState();
  });
  
  communitiesBtn.addEventListener('click', () => {
    switchTab('communities');
    hideAllViews();
    showChatList();
    // Restaurer le chat actif si il y en avait un
    restoreCurrentChatState();
  });
  
  settingsBtn.addEventListener('click', () => {
    // Sauvegarder le chat actuel avant de changer de vue
    saveCurrentChatState();
    switchTab('settings');
    hideAllViews();
    renderSettingsView();
  });
}

function saveCurrentChatState() {
  // Sauvegarder l'état du chat actuel
  if (window.activeChat) {
    currentActiveChat = window.activeChat;
    console.log('Chat sauvegardé:', currentActiveChat);
  }
}

function restoreCurrentChatState() {
  // Restaurer le chat actif après être revenu aux discussions
  if (currentActiveChat) {
    console.log('Restauration du chat:', currentActiveChat);
    
    // Attendre que l'interface soit prête
    setTimeout(() => {
      // Réactiver le chat
      window.activeChat = currentActiveChat;
      
      // Importer et utiliser les fonctions de chat
      import('./chatController.js').then(module => {
        // Simuler un clic sur le chat pour le réactiver
        const event = new CustomEvent('chat-restore', { detail: currentActiveChat });
        document.dispatchEvent(event);
      });
    }, 100);
  }
}

function hideAllViews() {
  // Masquer toutes les vues spéciales
  hideStatusView();
  hideSettingsView();
  
  // Masquer les autres conteneurs
  const views = ['new-discussion-container'];
  views.forEach(viewId => {
    const view = document.getElementById(viewId);
    if (view) {
      view.remove();
    }
  });
}

function showChatList() {
  const chatList = document.getElementById('chat-list-container');
  if (chatList) {
    chatList.style.display = 'flex';
  }
}

function switchTab(tabName) {
  const allButtons = document.querySelectorAll('#side-nav button');
  allButtons.forEach(button => {
    button.classList.remove('bg-[#00a884]', 'text-white');
    button.classList.add('bg-[#2a3942]', 'text-gray-400');
  });
  
  const activeButton = document.getElementById(`${tabName}-btn`);
  if (activeButton) {
    activeButton.classList.remove('bg-[#2a3942]', 'text-gray-400');
    activeButton.classList.add('bg-[#00a884]', 'text-white');
  }
  
  console.log(`Switched to ${tabName} tab`);
}

export { initApp };