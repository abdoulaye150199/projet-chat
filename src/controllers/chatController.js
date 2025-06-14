import { getAllChats, getChatById, searchChats, markAsRead, createNewChat, createNewGroup, getUserChats } from '../models/chatModel.js';
import { addMessage, getMessagesByChatId, getMessages, markMessagesAsDelivered, markMessagesAsRead, startMessageSync } from '../models/messageModel.js';
import { renderChatList, updateChatInList } from '../views/chatListView.js';
import { 
  renderChatHeader, 
  renderMessages, 
  addMessageToChat, 
  initMessageInput 
} from '../views/chatView.js';
import { renderNewDiscussionView, hideNewDiscussionView } from '../views/newDiscussionView.js';

let activeChat = null;

function initChat() {
  // Démarrer la synchronisation des messages
  startMessageSync();
  
  // Charger les chats de l'utilisateur
  loadUserChats();

  initSearch();
  initMessageInput(handleSendMessage);
  initNewChatButton();
  
  // Écouter les nouveaux messages
  document.addEventListener('new-messages', handleNewMessages);
}

async function loadUserChats() {
  try {
    const chats = await getUserChats();
    renderChatList(chats, handleChatClick);
  } catch (error) {
    console.error('Erreur lors du chargement des chats:', error);
    // Fallback vers getAllChats si getUserChats échoue
    const chats = getAllChats();
    renderChatList(chats, handleChatClick);
  }
}

function initNewChatButton() {
  const newChatBtn = document.getElementById('new-chat-btn');
  if (!newChatBtn) return;

  newChatBtn.addEventListener('click', async () => {
    try {
      await renderNewDiscussionView(handleNewChat);
    } catch (error) {
      console.error('Error opening new discussion view:', error);
    }
  });
}

async function handleNewChat(contact) {
  try {
    console.log('handleNewChat appelé avec:', contact);
    
    if (!contact || !contact.id) {
      console.error('Contact invalide:', contact);
      return;
    }

    const chat = await createNewChat(contact);
    if (!chat) {
      console.error('Erreur lors de la création du chat');
      return;
    }

    console.log('Chat créé/récupéré:', chat);

    hideNewDiscussionView();

    activeChat = chat;
    window.activeChat = chat;

    showChatInterface();

    renderChatHeader(chat);
    
    const messages = await getMessages(chat.id);
    renderMessages(messages || []);

    markAsRead(chat.id);
    await markMessagesAsRead(chat.id);

    // Recharger la liste des chats
    await loadUserChats();

  } catch (error) {
    console.error('Erreur handleNewChat:', error);
  }
}

async function handleCreateGroup(groupData) {
  try {
    const newGroup = await createNewGroup({
      ...groupData,
      lastMessage: "Groupe créé",
      timestamp: new Date().toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      unreadCount: 0,
      messages: []
    });

    hideCreateGroupModal();

    activeChat = newGroup;
    window.activeChat = newGroup;

    showChatInterface();
    renderChatHeader(newGroup);

    await loadUserChats();

  } catch (error) {
    console.error('Erreur lors de la création du groupe:', error);
    showNotification('Erreur lors de la création du groupe', 'error');
  }
}

function showChatInterface() {
  const messagesContainer = document.getElementById('messages-container');
  const welcomeScreen = document.getElementById('welcome-screen');
  const chatHeader = document.getElementById('chat-header');
  const messageInput = document.getElementById('message-input-container');

  if (welcomeScreen) {
    welcomeScreen.style.display = 'none';
  }
  
  if (messagesContainer) {
    messagesContainer.classList.remove('hidden');
  }
  
  if (chatHeader) {
    chatHeader.classList.remove('hidden');
  }
  
  if (messageInput) {
    messageInput.classList.remove('hidden');
  }
}

async function handleChatClick(chat) {
  if (!chat || !chat.id) {
    console.error('Invalid chat object');
    return;
  }

  console.log('Chat cliqué:', chat);

  showChatInterface();

  if (chat.unreadCount > 0) {
    markAsRead(chat.id);
    await markMessagesAsRead(chat.id);
    updateChatInList(getChatById(chat.id));
  }

  activeChat = chat;
  window.activeChat = chat;

  renderChatHeader(chat);
  const messages = await getMessages(chat.id);
  renderMessages(messages || []);

  setTimeout(() => {
    markMessagesAsDelivered(chat.id);
  }, 1000);
}

function initSearch() {
  const searchInput = document.getElementById('search-input');
  
  if (searchInput) {
    searchInput.addEventListener('input', async () => {
      const query = searchInput.value.trim();
      const chats = await getUserChats();
      const filteredChats = query ? 
        chats.filter(chat => 
          chat.name.toLowerCase().includes(query.toLowerCase()) || 
          chat.lastMessage.toLowerCase().includes(query.toLowerCase())
        ) : chats;
      renderChatList(filteredChats, handleChatClick);
    });
  }
}

async function handleSendMessage(text, isVoice = false, duration = null, audioBlob = null) {
  if (!activeChat || !activeChat.id) {
    console.error('No active chat or invalid chat ID');
    return;
  }
  
  try {
    let message;
    
    if (isVoice && audioBlob) {
      message = {
        id: Date.now().toString(),
        chatId: activeChat.id,
        isVoice: true,
        duration: duration,
        audioBlob: audioBlob,
        timestamp: new Date().toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        isMe: true,
        sent: true,
        delivered: false,
        read: false
      };

      const messagesList = getMessagesByChatId(activeChat.id) || [];
      messagesList.push(message);
      
      addMessageToChat(message);

      setTimeout(() => {
        message.delivered = true;
        const messageElements = document.querySelectorAll(`[data-message-id="${message.id}"]`);
        messageElements.forEach(el => {
          const statusIcon = el.querySelector('.status-icon');
          if (statusIcon) {
            statusIcon.innerHTML = '✓✓';
            statusIcon.className = 'text-[#8696a0] text-[12px] ml-1 status-icon';
          }
        });
        
        setTimeout(() => {
          message.read = true;
          messageElements.forEach(el => {
            const statusIcon = el.querySelector('.status-icon');
            if (statusIcon) {
              statusIcon.innerHTML = '✓✓';
              statusIcon.className = 'text-[#53bdeb] text-[12px] ml-1 status-icon';
            }
          });
        }, 2000);
      }, 1000);

      await loadUserChats();
      
    } else {
      // Message texte normal
      message = await addMessage(activeChat.id, text, true);
      if (message) {
        addMessageToChat(message);
        
        setTimeout(() => {
          message.delivered = true;
          const messageElements = document.querySelectorAll(`[data-message-id="${message.id}"]`);
          messageElements.forEach(el => {
            const statusIcon = el.querySelector('.status-icon');
            if (statusIcon) {
              statusIcon.innerHTML = '✓✓';
              statusIcon.className = 'text-[#8696a0] text-[12px] ml-1 status-icon';
            }
          });
          
          setTimeout(() => {
            message.read = true;
            messageElements.forEach(el => {
              const statusIcon = el.querySelector('.status-icon');
              if (statusIcon) {
                statusIcon.innerHTML = '✓✓';
                statusIcon.className = 'text-[#53bdeb] text-[12px] ml-1 status-icon';
              }
            });
          }, 2000);
        }, 1000);
        
        await loadUserChats();
      }
    }
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

// Gérer les nouveaux messages reçus
function handleNewMessages(event) {
  const { chatId, messages } = event.detail;
  
  // Si c'est le chat actif, afficher les nouveaux messages
  if (activeChat && activeChat.id == chatId) {
    messages.forEach(message => {
      addMessageToChat(message);
    });
  }
  
  // Mettre à jour la liste des chats
  loadUserChats();
}

function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.className = `fixed bottom-4 right-4 p-4 rounded-lg ${
    type === 'success' ? 'bg-green-500' : 'bg-red-500'
  } text-white shadow-lg z-50 notification`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

export { 
  initChat,
  handleCreateGroup 
};