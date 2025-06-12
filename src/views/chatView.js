// Fichier chatView.js refait pour ressembler exactement à WhatsApp
import { EmojiPicker } from '../components/EmojiPicker.js';
import { renderChatOptionsModal } from './chatOptionsModalView.js';
import { MenuIcon, SearchIcon } from '../utils/icons.js';
import { 
  initEmojiPicker, 
  startVoiceRecording, 
  stopVoiceRecording, 
  cancelVoiceRecording,
  handleFileUpload,
  formatFileSize,
  startRecordingTimer,
  stopRecordingTimer
} from './chatView2.js';

let emojiPicker = null;
let isRecording = false;
let mediaRecorder = null;

// Render the chat header with the active chat information
function renderChatHeader(chat) {
  const chatHeader = document.getElementById('chat-header');
  const activeChatName = document.getElementById('active-chat-name');
  const activeChatStatus = document.getElementById('active-chat-status');
  const activeChatAvatar = document.getElementById('active-chat-avatar');
  const headerRight = document.querySelector('.chat-header-right');
  
  chatHeader.classList.remove('hidden');
  activeChatName.textContent = chat.name;
  activeChatStatus.textContent = chat.online ? 'En ligne' : 'Vu pour la dernière fois récemment';
  activeChatAvatar.src = chat.avatar;

  if (headerRight) {
    headerRight.innerHTML = `
      <button class="search-btn p-2 hover:bg-[#374045] rounded-full">
        <div class="w-5 h-5 text-[#aebac1]">${SearchIcon}</div>
      </button>
      <button id="chat-options-btn" class="chat-options-btn p-2 hover:bg-[#374045] rounded-full">
        <div class="w-5 h-5 text-[#aebac1]">${MenuIcon}</div>
      </button>
    `;

    const optionsBtn = headerRight.querySelector('.chat-options-btn');
    optionsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const buttonRect = optionsBtn.getBoundingClientRect();
      const position = {
        x: window.innerWidth - buttonRect.right + buttonRect.width + 5,
        y: buttonRect.bottom + 5
      };

      renderChatOptionsModal(position);
    });
  }
}

// Render messages for a specific chat
function renderMessages(messages) {
  const messagesContainer = document.getElementById('messages-container');
  const messagesList = document.getElementById('messages-list');
  
  messagesContainer.classList.remove('hidden');
  messagesList.innerHTML = '';
  
  // Style du conteneur de messages pour ressembler à WhatsApp
  messagesContainer.className = 'flex-1 overflow-y-auto bg-[#0b141a] relative';
  messagesContainer.style.backgroundImage = `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='whatsapp-bg' x='0' y='0' width='100' height='100' patternUnits='userSpaceOnUse'%3E%3Cpath d='M0 0h100v100H0z' fill='%23111b21'/%3E%3Cpath d='M20 20h60v60H20z' fill='none' stroke='%23182229' stroke-width='0.5' opacity='0.1'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23whatsapp-bg)'/%3E%3C/svg%3E")`;
  
  messagesList.className = 'px-4 py-2 space-y-1';
  
  // Grouper les messages par date
  const messagesByDate = groupMessagesByDate(messages);
  
  Object.keys(messagesByDate).forEach(date => {
    // Ajouter le séparateur de date
    const dateSeparator = createDateSeparator(date);
    messagesList.appendChild(dateSeparator);
    
    // Ajouter les messages de cette date
    messagesByDate[date].forEach(message => {
      const messageElement = createMessageElement(message);
      messagesList.appendChild(messageElement);
    });
  });
  
  // Scroll to bottom
  setTimeout(() => {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }, 100);
  
  // Show message input
  document.getElementById('message-input-container').classList.remove('hidden');
  
  // Hide welcome screen
  document.getElementById('welcome-screen').classList.add('hidden');
}

// Grouper les messages par date
function groupMessagesByDate(messages) {
  const groups = {};
  
  messages.forEach(message => {
    const date = getDateKey(message.timestamp);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
  });
  
  return groups;
}

// Obtenir la clé de date pour le groupement
function getDateKey(timestamp) {
  const now = new Date();
  const messageDate = new Date();
  
  // Si timestamp est une heure (HH:MM), on utilise aujourd'hui
  if (typeof timestamp === 'string' && timestamp.match(/^\d{1,2}:\d{2}$/)) {
    return 'AUJOURD\'HUI';
  }
  
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  
  if (messageDate >= today) {
    return 'AUJOURD\'HUI';
  } else if (messageDate >= yesterday) {
    return 'HIER';
  } else {
    return messageDate.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  }
}

// Créer le séparateur de date
function createDateSeparator(dateText) {
  const separator = document.createElement('div');
  separator.className = 'flex justify-center my-4';
  
  const dateLabel = document.createElement('div');
  dateLabel.className = 'bg-[#182229] text-[#8696a0] text-xs px-3 py-1 rounded-md font-medium';
  dateLabel.textContent = dateText;
  
  separator.appendChild(dateLabel);
  return separator;
}

// Create a single message element (style WhatsApp)
function createMessageElement(message) {
  const messageContainer = document.createElement('div');
  messageContainer.className = `flex ${message.isMe ? 'justify-end' : 'justify-start'} mb-1`;
  
  const messageBubble = document.createElement('div');
  messageBubble.className = `relative max-w-[65%] rounded-lg px-3 py-2 ${
    message.isMe 
      ? 'bg-[#005c4b] text-white rounded-br-sm' 
      : 'bg-[#202c33] text-white rounded-bl-sm'
  } shadow-sm`;

  // Vérifier si c'est un message audio
  if (message.isVoice) {
    const voiceMessage = createVoiceMessageElement(message);
    messageBubble.appendChild(voiceMessage);
  } else {
    // Message texte normal
    const messageContent = document.createElement('div');
    messageContent.innerHTML = parseEmojis(message.text || '');
    messageBubble.appendChild(messageContent);
  }
  
  // Footer avec timestamp et statut
  const messageFooter = document.createElement('div');
  messageFooter.className = 'flex items-center justify-end gap-1 mt-1';
  
  const timestamp = document.createElement('span');
  timestamp.className = 'text-[11px] text-[#8696a0] font-normal';
  timestamp.textContent = message.timestamp;
  
  messageFooter.appendChild(timestamp);
  
  // Ajouter les indicateurs de statut pour les messages envoyés
  if (message.isMe) {
    const statusIcon = document.createElement('span');
    statusIcon.className = 'text-[12px] ml-1 status-icon';
    
    if (message.read) {
      statusIcon.innerHTML = '✓✓';
      statusIcon.className += ' text-[#53bdeb]';
    } else if (message.delivered) {
      statusIcon.innerHTML = '✓✓';
      statusIcon.className += ' text-[#8696a0]';
    } else if (message.sent) {
      statusIcon.innerHTML = '✓';
      statusIcon.className += ' text-[#8696a0]';
    }
    
    messageFooter.appendChild(statusIcon);
  }
  
  messageBubble.appendChild(messageFooter);
  messageContainer.appendChild(messageBubble);
  
  return messageContainer;
}

function createImageMessage(message) {
  const imageContainer = document.createElement('div');
  imageContainer.className = 'rounded-lg overflow-hidden max-w-[300px] mb-2';
  
  if (message.imageData) {
    const img = document.createElement('img');
    img.src = message.imageData;
    img.className = 'w-full h-auto max-h-[400px] object-cover';
    img.loading = 'lazy';
    imageContainer.appendChild(img);
  } else {
    const placeholder = document.createElement('div');
    placeholder.className = 'w-full h-48 bg-[#2a3942] flex items-center justify-center';
    placeholder.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400">
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
        <circle cx="9" cy="9" r="2"/>
        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
      </svg>
    `;
    imageContainer.appendChild(placeholder);
  }
  
  return imageContainer;
}

function createVoiceMessageElement(message) {
  const voiceContainer = document.createElement('div');
  voiceContainer.className = 'flex items-center gap-2 min-w-[200px] py-1';
  
  const playButton = document.createElement('button');
  playButton.className = 'text-white hover:text-gray-300 flex-shrink-0 w-8 h-8 rounded-full bg-white bg-opacity-20 flex items-center justify-center';
  playButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3"></polygon>
    </svg>
  `;
  
  const waveform = document.createElement('div');
  waveform.className = 'flex-1 flex items-center gap-1 h-8';
  
  // Créer une forme d'onde simple
  for (let i = 0; i < 30; i++) {
    const bar = document.createElement('div');
    bar.className = 'flex-1 bg-white bg-opacity-20 rounded-full';
    bar.style.height = `${Math.random() * 100}%`;
    waveform.appendChild(bar);
  }
  
  const duration = document.createElement('span');
  duration.className = 'text-sm text-white text-opacity-80 flex-shrink-0 font-mono';
  duration.textContent = message.duration || '0:00';

  // Fonctionnalité audio
  if (message.audioBlob) {
    const audioUrl = URL.createObjectURL(message.audioBlob);
    const audio = new Audio(audioUrl);
    
    playButton.addEventListener('click', () => {
      if (audio.paused) {
        audio.play();
        playButton.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16"></rect>
            <rect x="14" y="4" width="4" height="16"></rect>
          </svg>
        `;
      } else {
        audio.pause();
        playButton.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
        `;
      }
    });
  }

  voiceContainer.appendChild(playButton);
  voiceContainer.appendChild(waveform);
  voiceContainer.appendChild(duration);
  
  return voiceContainer;
}

function createFileMessageElement(message) {
  const fileContainer = document.createElement('div');
  fileContainer.className = 'flex items-center gap-3 p-3 bg-black bg-opacity-20 rounded-lg min-w-[250px] mb-2';
  
  const fileIcon = document.createElement('div');
  fileIcon.className = 'w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center flex-shrink-0';
  fileIcon.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
    </svg>
  `;
  
  const fileInfo = document.createElement('div');
  fileInfo.className = 'flex-1 min-w-0';
  
  const fileName = document.createElement('div');
  fileName.className = 'text-white text-sm font-medium truncate';
  fileName.textContent = message.fileName || 'Document';
  
  const fileSize = document.createElement('div');
  fileSize.className = 'text-white text-opacity-70 text-xs';
  fileSize.textContent = formatFileSize(message.fileSize || 0);
  
  fileInfo.appendChild(fileName);
  fileInfo.appendChild(fileSize);
  
  fileContainer.appendChild(fileIcon);
  fileContainer.appendChild(fileInfo);
  
  return fileContainer;
}

function parseEmojis(text) {
  // Add null check
  if (!text) return '';
  
  // Replace emoji shortcodes with actual emojis
  return text.replace(/:([\w-]+):/g, (match, code) => {
    const emoji = emojiMap[code];
    return emoji || match;
  });
}

// Add a new message to the chat
function addMessageToChat(message) {
  const messagesList = document.getElementById('messages-list');
  
  // Vérifier si on doit ajouter un nouveau séparateur de date
  const lastSeparator = messagesList.querySelector('.flex.justify-center:last-of-type');
  const messageDate = getDateKey(message.timestamp);
  
  if (!lastSeparator || !lastSeparator.textContent.includes(messageDate)) {
    const dateSeparator = createDateSeparator(messageDate);
    messagesList.appendChild(dateSeparator);
  }
  
  const messageElement = createMessageElement(message);
  messagesList.appendChild(messageElement);
  
  // Animation d'apparition
  messageElement.style.opacity = '0';
  messageElement.style.transform = 'translateY(10px)';
  
  requestAnimationFrame(() => {
    messageElement.style.transition = 'all 0.2s ease-out';
    messageElement.style.opacity = '1';
    messageElement.style.transform = 'translateY(0)';
  });
  
  // Scroll to bottom avec animation fluide
  const messagesContainer = document.getElementById('messages-container');
  messagesContainer.scrollTo({
    top: messagesContainer.scrollHeight,
    behavior: 'smooth'
  });
}

// Initialize the message input and voice recording
function initMessageInput(onSendMessage) {
  const messageInput = document.getElementById('message-input');
  const voiceBtn = document.getElementById('voice-btn');
  const emojiBtn = document.getElementById('emoji-btn');
  const messageInputContainer = document.getElementById('message-input-container');

  // Style de l'input pour ressembler à WhatsApp
  messageInput.className = 'w-full bg-[#2a3942] text-white rounded-lg px-4 py-3 outline-none placeholder-gray-400 text-[15px]';
  messageInput.placeholder = 'Tapez un message';

  // Initialize emoji picker
  emojiPicker = initEmojiPicker();

  // Save original HTML
  const originalInputHTML = messageInputContainer.innerHTML;

  // Emoji button click handler
  emojiBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    emojiPicker.toggle((emoji) => {
      const currentValue = messageInput.value;
      const cursorPosition = messageInput.selectionStart;
      const newValue = currentValue.slice(0, cursorPosition) + emoji + currentValue.slice(cursorPosition);
      messageInput.value = newValue;
      messageInput.focus();
      messageInput.setSelectionRange(cursorPosition + emoji.length, cursorPosition + emoji.length);
      updateButton(newValue);
    });
  });

  async function handleVoiceRecord() {
    try {
      if (!isRecording) {
        mediaRecorder = await startVoiceRecording();
        isRecording = true;

        // Update UI for recording
        messageInputContainer.innerHTML = `
          <div class="flex items-center w-full bg-[#2a3942] rounded-lg px-4 py-2">
            <div class="flex-1 flex items-center">
              <div class="w-3 h-3 bg-red-500 rounded-full animate-pulse mr-3"></div>
              <span class="text-gray-400" id="recording-timer">0:00</span>
            </div>
            <div class="flex items-center gap-4">
              <button id="cancel-record" class="text-gray-400 hover:text-red-500">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <button id="send-record" class="text-gray-400 hover:text-green-500">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </button>
            </div>
          </div>
        `;

        const timerElement = document.getElementById('recording-timer');
        startRecordingTimer(timerElement);

        // Add event listeners for recording controls
        document.getElementById('cancel-record').addEventListener('click', () => {
          cancelVoiceRecording();
          resetRecording();
        });

        document.getElementById('send-record').addEventListener('click', () => {
          stopVoiceRecording();
          setTimeout(() => {
            if (mediaRecorder && mediaRecorder.audioChunks && mediaRecorder.audioChunks.length > 0) {
              const audioBlob = new Blob(mediaRecorder.audioChunks, { type: mediaRecorder.mimeType });
              const duration = getDuration(mediaRecorder.recordingStartTime);
              onSendMessage("Message vocal", true, duration, audioBlob);
            }
            resetRecording();
          }, 100);
        });

      }
    } catch (error) {
      console.error("Erreur d'accès au microphone:", error);
      alert("Impossible d'accéder au microphone. Vérifiez les permissions dans les paramètres de votre navigateur.");
      resetRecording();
    }
  }

  function resetRecording() {
    isRecording = false;
    stopRecordingTimer();
    mediaRecorder = null;
    
    // Reset UI
    messageInputContainer.innerHTML = originalInputHTML;
    
    // Reinitialize event listeners
    attachInputListeners();
  }

  function attachInputListeners() {
    const messageInput = document.getElementById('message-input');
    const voiceBtn = document.getElementById('voice-btn');
    const emojiBtn = document.getElementById('emoji-btn');

    if (!messageInput || !voiceBtn || !emojiBtn) return;

    // Style de l'input
    messageInput.className = 'w-full bg-[#2a3942] text-white rounded-lg px-4 py-3 outline-none placeholder-gray-400 text-[15px]';

    function handleInput() {
      updateButton(messageInput.value);
    }

    function handleKeyPress(event) {
      if (event.key === 'Enter' && !event.shiftKey && messageInput.value.trim() !== '') {
        event.preventDefault();
        const messageText = messageInput.value.trim();
        onSendMessage(messageText);
        messageInput.value = '';
        updateButton('');
      }
    }

    messageInput.addEventListener('input', handleInput);
    messageInput.addEventListener('keypress', handleKeyPress);

    emojiBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      emojiPicker.toggle((emoji) => {
        const currentValue = messageInput.value;
        const cursorPosition = messageInput.selectionStart;
        const newValue = currentValue.slice(0, cursorPosition) + emoji + currentValue.slice(cursorPosition);
        messageInput.value = newValue;
        messageInput.focus();
        messageInput.setSelectionRange(cursorPosition + emoji.length, cursorPosition + emoji.length);
        updateButton(newValue);
      });
    });

    updateButton(messageInput.value);
  }

  function updateButton(text) {
    const voiceBtn = document.getElementById('voice-btn');
    if (!voiceBtn) return;

    if (text.trim().length > 0) {
      // Change to send icon
      voiceBtn.innerHTML = `
        <div class="w-6 h-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </div>
      `;
      
      const newVoiceBtn = voiceBtn.cloneNode(true);
      voiceBtn.parentNode.replaceChild(newVoiceBtn, voiceBtn);
      
      newVoiceBtn.addEventListener('click', () => {
        const messageInput = document.getElementById('message-input');
        if (messageInput && messageInput.value.trim()) {
          onSendMessage(messageInput.value.trim());
          messageInput.value = '';
          updateButton('');
          messageInput.focus();
        }
      });
    } else {
      // Change to microphone icon
      voiceBtn.innerHTML = `
        <div class="w-6 h-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" y1="19" x2="12" y2="23"></line>
            <line x1="8" y1="23" x2="16" y2="23"></line>
          </svg>
        </div>
      `;
      
      const newVoiceBtn = voiceBtn.cloneNode(true);
      voiceBtn.parentNode.replaceChild(newVoiceBtn, voiceBtn);
      
      newVoiceBtn.addEventListener('click', handleVoiceRecord);
    }
  }

  attachInputListeners();
  updateButton('');
}

function getDuration(startTime) {
  const duration = Math.floor((Date.now() - startTime) / 1000);
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function initChatFilters() {
  const chatListHeader = document.querySelector('#chat-list-container');
  if (!chatListHeader) return;

  const filtersContainer = document.createElement('div');
  filtersContainer.className = 'flex space-x-2 p-3 bg-[#111b21] border-b border-gray-700';
  filtersContainer.innerHTML = `
    <button class="filter-btn px-4 py-1 rounded-full text-sm font-medium bg-[#00a884] text-white hover:bg-[#06cf9c] transition-colors" data-filter="all">
      Toutes
    </button>
    <button class="filter-btn px-4 py-1 rounded-full text-sm font-medium text-gray-400 hover:bg-[#202c33] transition-colors" data-filter="unread">
      Non lues
    </button>
    <button class="filter-btn px-4 py-1 rounded-full text-sm font-medium text-gray-400 hover:bg-[#202c33] transition-colors" data-filter="favorites">
      Favoris
    </button>
    <button class="filter-btn px-4 py-1 rounded-full text-sm font-medium text-gray-400 hover:bg-[#202c33] transition-colors" data-filter="groups">
      Groupes
    </button>
  `;

  const searchContainer = document.getElementById('search-container');
  if (searchContainer) {
    searchContainer.after(filtersContainer);
  }

  const filterButtons = filtersContainer.querySelectorAll('.filter-btn');
  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      filterButtons.forEach(btn => {
        btn.className = 'filter-btn px-4 py-1 rounded-full text-sm font-medium text-gray-400 hover:bg-[#202c33] transition-colors';
      });
      
      button.className = 'filter-btn px-4 py-1 rounded-full text-sm font-medium bg-[#00a884] text-white hover:bg-[#06cf9c] transition-colors';
      
      filterChats(button.dataset.filter);
    });
  });
}

function filterChats(filterType) {
  const chatElements = document.querySelectorAll('#chat-list .chat-item');
  chatElements.forEach(chat => {
    switch(filterType) {
      case 'unread':
        chat.style.display = chat.querySelector('.unread-count') ? 'flex' : 'none';
        break;
      case 'favorites':
        chat.style.display = chat.dataset.favorite === 'true' ? 'flex' : 'none';
        break;
      case 'groups':
        chat.style.display = chat.dataset.isGroup === 'true' ? 'flex' : 'none';
        break;
      default:
        chat.style.display = 'flex';
    }
  });
}

export {
  renderChatHeader,
  renderMessages,
  createMessageElement,
  addMessageToChat,
  initMessageInput,
  initChatFilters
};