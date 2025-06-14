import { getAllChats, getChatById, searchChats, markAsRead, createNewChat, createNewGroup } from '../models/chatModel.js';
import { addMessage, getMessagesByChatId, getMessages, markMessagesAsDelivered, startMessageSync } from '../models/messageModel.js';
import { renderChatList, updateChatInList } from '../views/chatListView.js';
import { 
  renderChatHeader, 
  renderMessages, 
  addMessageToChat, 
  initMessageInput 
} from '../views/chatView.js';
import { renderNewDiscussionView, hideNewDiscussionView } from '../views/newDiscussionView.js';
import { getCurrentUser } from '../utils/auth.js';

let activeChat = null;

function initChat() {
  const chats = getAllChats();
  renderChatList(chats, handleChatClick);

  initSearch();
  initMessageInput(handleSendMessage);
  
  initNewChatButton();
  
  // Démarrer la synchronisation des messages
  startMessageSync();
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

    // Créer ou récupérer le chat
    const chat = await createNewChat(contact);
    if (!chat) {
      console.error('Erreur lors de la création du chat');
      return;
    }

    console.log('Chat créé/récupéré:', chat);

    // Masquer la vue des nouvelles discussions
    hideNewDiscussionView();

    // Définir le chat actif
    activeChat = chat;
    window.activeChat = chat;

    // Afficher les éléments de chat
    showChatInterface();

    // Mettre à jour l'interface avec les données du chat
    renderChatHeader(chat);
    
    // Récupérer et afficher les messages
    const messages = await getMessages(chat.id);
    renderMessages(messages || []);

    // Marquer les messages comme lus
    markAsRead(chat.id);

    // Mettre à jour la liste des chats
    const allChats = getAllChats();
    renderChatList(allChats, handleChatClick);

  } catch (error) {
    console.error('Erreur handleNewChat:', error);
  }
}

// Ajouter après handleNewChat
async function handleCreateGroup(groupData) {
  try {
    // Créer le nouveau groupe
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

    // Masquer la vue de création de groupe
    hideCreateGroupModal();

    // Définir le groupe comme chat actif
    activeChat = newGroup;
    window.activeChat = newGroup;

    // Afficher l'interface de chat
    showChatInterface();

    // Mettre à jour l'en-tête du chat
    renderChatHeader(newGroup);

    // Mettre à jour la liste des chats pour inclure le nouveau groupe
    const allChats = getAllChats();
    renderChatList(allChats, handleChatClick);

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
    // Utiliser display: none au lieu de hidden
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

function handleChatClick(chat) {
  if (!chat || !chat.id) {
    console.error('Invalid chat object');
    return;
  }

  console.log('Chat cliqué:', chat);

  // Afficher les éléments de chat
  showChatInterface();

  // Gérer les messages non lus
  if (chat.unreadCount > 0) {
    markAsRead(chat.id);
    markMessagesAsRead(chat.id);
    updateChatInList(getChatById(chat.id));
  }

  // Mettre à jour le chat actif
  activeChat = chat;
  window.activeChat = chat;

  // Mettre à jour l'interface
  renderChatHeader(chat);
  
  // Charger les messages de manière asynchrone
  loadChatMessages(chat.id);

  // Simuler la livraison des messages après un délai
  setTimeout(() => {
    markMessagesAsDelivered(chat.id);
  }, 1000);
}

async function loadChatMessages(chatId) {
  try {
    const messages = await getMessages(chatId);
    renderMessages(messages || []);
  } catch (error) {
    console.error('Erreur lors du chargement des messages:', error);
    // Fallback vers les messages locaux
    const localMessages = getMessagesByChatId(chatId);
    renderMessages(localMessages || []);
  }
}

function initSearch() {
  const searchInput = document.getElementById('search-input');
  
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const query = searchInput.value.trim();
      const filteredChats = searchChats(query);
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
    const currentUser = getCurrentUser();
    let message;
    
    if (isVoice && audioBlob) {
      console.log('Création d\'un message vocal avec blob:', audioBlob);
      
      // Créer un message vocal
      message = {
        id: Date.now().toString(),
        chatId: activeChat.id,
        senderId: currentUser.id,
        recipientId: activeChat.contactId || activeChat.id,
        isVoice: true,
        duration: duration,
        audioBlob: audioBlob,
        text: "Message vocal",
        timestamp: new Date().toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        isMe: true,
        sent: true,
        delivered: false,
        read: false,
        createdAt: new Date().toISOString()
      };

      console.log('Message vocal créé:', message);

      // Sauvegarder le message localement
      const messagesList = getMessagesByChatId(activeChat.id) || [];
      messagesList.push(message);
      
      // Mettre à jour l'interface immédiatement
      addMessageToChat(message);

      // Simuler la livraison et la lecture
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

      // Mettre à jour la liste des chats
      const chats = getAllChats();
      renderChatList(chats, handleChatClick);
      
    } else {
      // Message texte normal avec destinataire
      const recipientId = activeChat.contactId || activeChat.id;
      message = await addMessage(activeChat.id, text, true, recipientId);
      
      if (message) {
        addMessageToChat(message);
        
        // Simuler la livraison et la lecture
        setTimeout(() => {
          message.delivered = true;
          // Re-render le message pour mettre à jour le statut
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
            // Re-render le message pour mettre à jour le statut (lu)
            messageElements.forEach(el => {
              const statusIcon = el.querySelector('.status-icon');
              if (statusIcon) {
                statusIcon.innerHTML = '✓✓';
                statusIcon.className = 'text-[#53bdeb] text-[12px] ml-1 status-icon';
              }
            });
          }, 2000);
        }, 1000);
        
        const chats = getAllChats();
        renderChatList(chats, handleChatClick);
        
        // Simuler une réponse automatique (optionnel)
        // simulateReply(activeChat.id);
      }
    }
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

function simulateReply(chatId) {
  setTimeout(() => {
    if (activeChat && activeChat.id === chatId) {
      const replies = [
        "D'accord, je comprends.",
        "Merci pour l'information.",
        "Intéressant, dis-m'en plus.",
        "Je suis d'accord avec toi.",
        "On peut en discuter plus tard?",
        "👍",
        "😊",
        "Je vais y réfléchir.",
        "C'est une bonne idée !",
        "Parfait, merci !",
        "Je te tiens au courant.",
        "À bientôt !"
      ];
      
      const randomReply = replies[Math.floor(Math.random() * replies.length)];
      const replyMessage = addMessage(chatId, randomReply, false);
      addMessageToChat(replyMessage);
      
      const updatedChat = getChatById(chatId);
      updateChatInList({
        ...updatedChat,
        lastMessage: randomReply,
        timestamp: replyMessage.timestamp
      });
    }
  }, Math.random() * 3000 + 2000); // Réponse entre 2 et 5 secondes
}

export { 
  initChat,
  handleCreateGroup 
};