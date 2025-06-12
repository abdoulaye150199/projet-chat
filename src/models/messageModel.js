import { updateLastMessage, createNewChat, getAllChats, getChatById } from './chatModel.js';

// Define API_URL constant
const API_URL = 'http://localhost:3000';

// Initialiser un objet vide pour les messages
let messages = {};

// Charger les messages depuis le localStorage
function loadMessages() {
  const savedMessages = localStorage.getItem('whatsapp_messages');
  messages = savedMessages ? JSON.parse(savedMessages) : {};
}

// Sauvegarder les messages dans le localStorage
function saveMessages() {
  localStorage.setItem('whatsapp_messages', JSON.stringify(messages));
}

function getMessagesByChatId(chatId) {
  loadMessages();
  return messages[chatId] || [];
}

async function addMessage(chatId, text, isMe = true) {
  try {
    const message = {
      id: Date.now().toString(),
      chatId: chatId,
      text: text,
      timestamp: new Date().toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      isMe: isMe,
      sent: true,
      delivered: isMe ? true : false,
      read: isMe ? false : true
    };

    // Ajouter le message localement d'abord
    loadMessages();
    if (!messages[chatId]) {
      messages[chatId] = [];
    }
    messages[chatId].push(message);
    saveMessages();

    // Essayer d'ajouter à l'API
    try {
      const response = await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(message)
      });

      if (!response.ok) {
        console.warn('Erreur API, message sauvegardé localement seulement');
      }
    } catch (apiError) {
      console.warn('API non disponible, message sauvegardé localement:', apiError);
    }

    // Mettre à jour le dernier message du chat
    await updateLastMessage(chatId, text);
    
    return message;

  } catch (error) {
    console.error('Erreur addMessage:', error);
    return null;
  }
}

// Marquer les messages comme lus
function markMessagesAsRead(chatId) {
  loadMessages();
  if (messages[chatId]) {
    messages[chatId].forEach(message => {
      if (!message.isMe) {
        message.read = true;
      }
    });
    saveMessages();
  }
}

// Marquer les messages comme livrés
function markMessagesAsDelivered(chatId) {
  loadMessages();
  if (messages[chatId]) {
    messages[chatId].forEach(message => {
      if (message.isMe && !message.delivered) {
        message.delivered = true;
      }
    });
    saveMessages();
  }
}

export {
  getMessagesByChatId,
  addMessage,
  markMessagesAsRead,
  markMessagesAsDelivered
};