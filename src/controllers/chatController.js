import { getAllChats, getChatById, searchChats, markAsRead, createNewChat, createNewGroup } from '../models/chatModel.js';
import { addMessage, getMessages, getMessagesByChatId, markMessagesAsDelivered, startRealTimePolling, stopRealTimePolling } from '../models/messageModel.js';
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
  loadAndRenderChats();

  initSearch();
  initMessageInput(handleSendMessage);
  
  initNewChatButton();
  
  // Démarrer le polling en temps réel pour les nouveaux messages
  startRealTimePolling();
  console.log('🚀 Système de messages en temps réel activé');
  
  // Écouter les événements de rafraîchissement de la liste des chats
  document.addEventListener('refresh-chat-list', async () => {
    await loadAndRenderChats();
  });

  // Écouter l'événement de restauration de chat
  document.addEventListener('chat-restore', async (event) => {
    const chatToRestore = event.detail;
    console.log('Restauration du chat:', chatToRestore);
    await handleChatClick(chatToRestore);
  });

  // Écouter l'événement d'ouverture de chat depuis une notification
  document.addEventListener('open-chat', async (event) => {
    const { chatId, senderId } = event.detail;
    console.log('📱 Ouverture du chat depuis notification:', { chatId, senderId });
    
    try {
      // Récupérer le chat
      const chat = await getChatById(chatId);
      if (chat) {
        await handleChatClick(chat);
      } else {
        console.warn('Chat non trouvé:', chatId);
      }
    } catch (error) {
      console.error('Erreur lors de l\'ouverture du chat:', error);
    }
  });

  // Nettoyer quand l'utilisateur quitte la page
  window.addEventListener('beforeunload', () => {
    stopRealTimePolling();
    console.log('🛑 Polling en temps réel arrêté (fermeture de page)');
  });

  // Gérer la visibilité de la page pour optimiser le polling
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      console.log('📱 Page cachée - polling continue en arrière-plan');
    } else {
      console.log('📱 Page visible - polling actif');
      // Forcer un rafraîchissement immédiat quand la page redevient visible
      setTimeout(async () => {
        await loadAndRenderChats();
      }, 500);
    }
  });
}

async function loadAndRenderChats() {
  try {
    const chats = await getAllChats();
    console.log('Chats chargés:', chats);
    renderChatList(chats, handleChatClick);
  } catch (error) {
    console.error('Erreur lors du chargement des chats:', error);
    // Fallback vers une liste vide
    renderChatList([], handleChatClick);
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

    // Vérifier si c'est un groupe ou une communauté
    if (contact.isGroup || contact.isCommunity) {
      // C'est un groupe ou une communauté nouvellement créé
      activeChat = contact;
      window.activeChat = contact;

      // Masquer la vue des nouvelles discussions
      hideNewDiscussionView();

      // Afficher les éléments de chat
      showChatInterface();

      // Mettre à jour l'interface avec les données du chat
      renderChatHeader(contact);
      
      // Récupérer et afficher les messages (vide pour un nouveau groupe/communauté)
      renderMessages([]);

      // Mettre à jour la liste des chats
      await loadAndRenderChats();

      return;
    }

    // Créer ou récupérer le chat pour un contact normal
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
    await loadAndRenderChats();

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
    await loadAndRenderChats();

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
    messagesContainer.style.display = 'flex';
  }
  
  if (chatHeader) {
    chatHeader.classList.remove('hidden');
    chatHeader.style.display = 'flex';
  }
  
  if (messageInput) {
    messageInput.classList.remove('hidden');
    messageInput.style.display = 'flex';
  }
}

async function handleChatClick(chat) {
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
    markMessagesAsDelivered(chat.id);
    
    // Recharger la liste des chats pour mettre à jour l'affichage
    setTimeout(async () => {
      await loadAndRenderChats();
    }, 500);
  }

  // Mettre à jour le chat actif
  activeChat = chat;
  window.activeChat = chat;

  // Mettre à jour l'interface
  renderChatHeader(chat);
  
  // Charger les messages de manière asynchrone
  await loadChatMessages(chat.id);

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
    searchInput.addEventListener('input', async () => {
      const query = searchInput.value.trim();
      try {
        const filteredChats = await searchChats(query);
        renderChatList(filteredChats, handleChatClick);
      } catch (error) {
        console.error('Erreur lors de la recherche:', error);
      }
    });
  }
}

// FONCTION CORRIGÉE pour l'envoi de messages
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
        recipientId: getRecipientId(activeChat),
        isVoice: true,
        duration: duration,
        audioBlob: audioBlob,
        text: "Message vocal",
        timestamp: new Date().toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        isMe: true, // TOUJOURS true pour les messages que j'envoie
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
      await loadAndRenderChats();
      
    } else {
      // Message texte normal avec destinataire
      const recipientId = getRecipientId(activeChat);
      
      // CORRECTION: Toujours passer isMe=true pour les messages que j'envoie
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
        
        await loadAndRenderChats();
        
        // Simuler une réponse automatique (optionnel)
        // simulateReply(activeChat.id);
      }
    }
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

// Fonction pour déterminer le destinataire du message
function getRecipientId(chat) {
  const currentUser = getCurrentUser();
  
  if (chat.isGroup || chat.isCommunity) {
    // Pour les groupes et communautés, pas de destinataire spécifique
    return null;
  }
  
  // Pour les chats individuels
  if (chat.contactId) {
    return chat.contactId;
  }
  
  // Si on a une liste de participants, trouver l'autre participant
  if (chat.participants && chat.participants.length === 2) {
    return chat.participants.find(id => id !== currentUser.id);
  }
  
  return chat.id;
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
  handleCreateGroup,
  handleChatClick
};