import { 
  MessageIcon, 
  CallIcon, 
  StatusIcon, 
  ChannelsIcon, 
  CommunitiesIcon, 
  SettingsIcon, 
  SearchIcon, 
  MenuIcon, 
  NewChatIcon, 
  LockIcon, 
  EmojiIcon, 
  AttachIcon, 
  MicIcon,
  SendIcon 
} from './icons.js';
import { generateInitialsAvatar } from './avatarGenerator.js';

// Generate a random avatar URL for a user
function generateRandomAvatar(name = 'User') {
  return generateInitialsAvatar(name);
}

// Format a date for chat
function formatDate(date) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400000;
  
  const messageDate = new Date(date).getTime();
  
  if (messageDate >= today) {
    return 'Aujourd\'hui';
  } else if (messageDate >= yesterday) {
    return 'Hier';
  } else {
    return new Date(date).toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: '2-digit' 
    });
  }
}

// Get short time (HH:MM) from date
function formatTime(date) {
  return new Date(date).toLocaleTimeString('fr-FR', { 
    hour: '2-digit', 
    minute: '2-digit'
  });
}

// Function to render icons in the application
export function renderIcons() {
  // Navigation icons
  const navigationIcons = {
    'status-btn': StatusIcon,
    'channels-btn': ChannelsIcon,
    'chats-btn': MessageIcon,
    'communities-btn': CommunitiesIcon,
    'settings-btn': SettingsIcon
  };

  // Safely set navigation icons
  Object.entries(navigationIcons).forEach(([id, icon]) => {
    const element = document.getElementById(id)?.querySelector('div');
    if (element) {
      element.innerHTML = icon;
    }
  });

  // Header icons
  const headerElements = {
    'new-chat-btn': NewChatIcon,
    'menu-btn': MenuIcon,
  };

  Object.entries(headerElements).forEach(([id, icon]) => {
    const element = document.getElementById(id)?.querySelector('div');
    if (element) {
      element.innerHTML = icon;
    }
  });

  // Search icon
  const searchContainer = document.getElementById('search-container')?.querySelector('span div');
  if (searchContainer) {
    searchContainer.innerHTML = SearchIcon;
  }

  // Welcome screen icons
  const welcomeMessageIcon = document.querySelector('#welcome-screen .w-56');
  if (welcomeMessageIcon) {
    welcomeMessageIcon.innerHTML = MessageIcon;
  }

  const welcomeLockIcon = document.querySelector('#welcome-screen .mt-8 span div');
  if (welcomeLockIcon) {
    welcomeLockIcon.innerHTML = LockIcon;
  }

  // Chat input icons
  const chatInputIcons = {
    'emoji-btn': EmojiIcon,
    'attach-btn': AttachIcon,
    'voice-btn': MicIcon
  };

  Object.entries(chatInputIcons).forEach(([id, icon]) => {
    const element = document.getElementById(id)?.querySelector('div');
    if (element) {
      element.innerHTML = icon;
    }
  });
}

export { generateRandomAvatar, formatDate, formatTime };