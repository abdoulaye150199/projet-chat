import { getCurrentUser } from '../models/userModel.js';
import { initChat } from './chatController.js';
import { renderSettingsView, hideSettingsView } from '../views/settingsView.js';
import { renderStatusView, hideStatusView } from '../views/statusView.js';
import { initMenuController } from './menuController.js';
import { initChatFilters } from '../views/chatView.js';
import { initStatusController } from './statusController.js';

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
    switchTab('status');
    hideAllViews();
    renderStatusView();
  });
  
  channelsBtn.addEventListener('click', () => {
    switchTab('channels');
    hideAllViews();
    showChatList();
  });
  
  chatsBtn.addEventListener('click', () => {
    switchTab('chats');
    hideAllViews();
    showChatList();
  });
  
  communitiesBtn.addEventListener('click', () => {
    switchTab('communities');
    hideAllViews();
    showChatList();
  });
  
  settingsBtn.addEventListener('click', () => {
    switchTab('settings');
    hideAllViews();
    renderSettingsView();
  });
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
  
  // Masquer l'interface de chat
  const welcomeScreen = document.getElementById('welcome-screen');
  const messagesContainer = document.getElementById('messages-container');
  const chatHeader = document.getElementById('chat-header');
  const messageInput = document.getElementById('message-input-container');

  if (welcomeScreen) welcomeScreen.style.display = 'flex';
  if (messagesContainer) messagesContainer.style.display = 'none';
  if (chatHeader) chatHeader.style.display = 'none';
  if (messageInput) messageInput.style.display = 'none';
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