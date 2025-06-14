import { updateLastMessage, getUserChats } from './chatModel.js';
import { getCurrentUser } from '../utils/auth.js';

const API_URL = 'http://localhost:3000';

let messages = {};

function loadMessages() {
  const savedMessages = localStorage.getItem('whatsapp_messages');
  messages = savedMessages ? JSON.parse(savedMessages) : {};
}

function saveMessages() {
  localStorage.setItem('whatsapp_messages', JSON.stringify(messages));
}

function getMessagesByChatId(chatId) {
  loadMessages();
  return messages[chatId] || [];
}

// Ajouter un message et le synchroniser avec l'API
async function addMessage(chatId, text, isMe = true) {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error('Aucun utilisateur connecté');
    }

    const message = {
      id: Date.now().toString(),
      chatId: chatId,
      text: text,
      timestamp: new Date().toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      senderId: currentUser.id,
      senderName: currentUser.name,
      isMe: isMe,
      sent: true,
      delivered: false,
      read: false,
      createdAt: new Date().toISOString()
    };

    // Sauvegarder dans l'API
    try {
      const response = await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(message)
      });

      if (response.ok) {
        const savedMessage = await response.json();
        
        // Mettre à jour le localStorage
        loadMessages();
        if (!messages[chatId]) {
          messages[chatId] = [];
        }
        messages[chatId].push(savedMessage);
        saveMessages();

        // Mettre à jour le dernier message dans le chat
        await updateLastMessage(chatId, text);

        return savedMessage;
      }
    } catch (apiError) {
      console.warn('Failed to save message to API, saving locally:', apiError);
    }

    // Fallback vers localStorage
    loadMessages();
    if (!messages[chatId]) {
      messages[chatId] = [];
    }
    messages[chatId].push(message);
    saveMessages();

    await updateLastMessage(chatId, text);
    return message;
  } catch (error) {
    console.error('Erreur addMessage:', error);
    throw error;
  }
}

// Récupérer les messages d'un chat depuis l'API
async function getMessages(chatId) {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      return [];
    }

    const response = await fetch(`${API_URL}/messages`);
    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des messages');
    }
    
    const allMessages = await response.json();
    const chatMessages = allMessages
      .filter(msg => msg.chatId == chatId)
      .map(msg => ({
        ...msg,
        isMe: msg.senderId === currentUser.id
      }))
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    // Mettre à jour le localStorage
    loadMessages();
    messages[chatId] = chatMessages;
    saveMessages();

    return chatMessages;
  } catch (error) {
    console.error('Erreur getMessages:', error);
    // Fallback vers localStorage
    return getMessagesByChatId(chatId);
  }
}

// Marquer les messages comme livrés
async function markMessagesAsDelivered(chatId) {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      return [];
    }

    const chatMessages = await getMessages(chatId);
    
    const updatedMessages = chatMessages.map(message => {
      if (message.senderId === currentUser.id && !message.delivered) {
        return { ...message, delivered: true };
      }
      return message;
    });

    // Mettre à jour dans l'API (optionnel pour la démo)
    for (const message of updatedMessages) {
      if (message.senderId === currentUser.id && message.delivered && !chatMessages.find(m => m.id === message.id)?.delivered) {
        try {
          await fetch(`${API_URL}/messages/${message.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ delivered: true })
          });
        } catch (updateError) {
          console.warn('Failed to update message delivery status:', updateError);
        }
      }
    }

    // Mettre à jour le localStorage
    loadMessages();
    messages[chatId] = updatedMessages;
    saveMessages();

    return updatedMessages;
  } catch (error) {
    console.error('Erreur markMessagesAsDelivered:', error);
    return getMessagesByChatId(chatId);
  }
}

// Marquer les messages comme lus
async function markMessagesAsRead(chatId) {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      return [];
    }

    const chatMessages = await getMessages(chatId);
    
    const updatedMessages = chatMessages.map(message => {
      // Marquer comme lus les messages reçus (pas envoyés par l'utilisateur actuel)
      if (message.senderId !== currentUser.id && !message.read) {
        return { ...message, read: true };
      }
      return message;
    });

    // Mettre à jour dans l'API
    for (const message of updatedMessages) {
      if (message.senderId !== currentUser.id && message.read && !chatMessages.find(m => m.id === message.id)?.read) {
        try {
          await fetch(`${API_URL}/messages/${message.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ read: true })
          });
        } catch (updateError) {
          console.warn('Failed to update message read status:', updateError);
        }
      }
    }

    // Mettre à jour le localStorage
    loadMessages();
    messages[chatId] = updatedMessages;
    saveMessages();

    return updatedMessages;
  } catch (error) {
    console.error('Erreur markMessagesAsRead:', error);
    return getMessagesByChatId(chatId);
  }
}

// Fonction pour synchroniser les nouveaux messages depuis l'API
async function syncMessages() {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      return;
    }

    // Récupérer tous les chats de l'utilisateur
    const userChats = await getUserChats();
    
    for (const chat of userChats) {
      const latestMessages = await getMessages(chat.id);
      
      // Vérifier s'il y a de nouveaux messages
      const localMessages = getMessagesByChatId(chat.id);
      const newMessages = latestMessages.filter(msg => 
        !localMessages.find(local => local.id === msg.id)
      );

      if (newMessages.length > 0) {
        // Mettre à jour l'interface si nécessaire
        const event = new CustomEvent('new-messages', { 
          detail: { chatId: chat.id, messages: newMessages } 
        });
        document.dispatchEvent(event);
      }
    }
  } catch (error) {
    console.error('Erreur lors de la synchronisation des messages:', error);
  }
}

// Démarrer la synchronisation périodique des messages
function startMessageSync() {
  // Synchroniser toutes les 5 secondes
  setInterval(syncMessages, 5000);
}

export {
  addMessage,
  getMessagesByChatId,
  loadMessages,
  saveMessages,
  getMessages,
  markMessagesAsDelivered,
  markMessagesAsRead,
  syncMessages,
  startMessageSync
};