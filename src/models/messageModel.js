import { updateLastMessage, createNewChat, getAllChats, getChatById } from './chatModel.js';

const API_URL = 'https://serveur2.onrender.com';

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

    // Envoyer le message au serveur
    const response = await fetch(`${API_URL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    });

    if (!response.ok) {
      throw new Error('Erreur lors de l\'envoi du message');
    }

    // Mettre à jour le localStorage
    loadMessages();
    if (!messages[chatId]) {
      messages[chatId] = [];
    }
    messages[chatId].push(message);
    saveMessages();

    // Mettre à jour le dernier message dans le chat
    await updateLastMessage(chatId, text);

    return message;
  } catch (error) {
    console.error('Erreur addMessage:', error);
    throw error;
  }
}

// Ajouter cette nouvelle fonction
async function getMessages(chatId) {
  try {
    const response = await fetch(`${API_URL}/messages`);
    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des messages');
    }
    const messages = await response.json();
    return messages.filter(msg => msg.chatId === chatId);
  } catch (error) {
    console.error('Erreur getMessages:', error);
    throw error;
  }
}

// Ajouter cette nouvelle fonction
async function markMessagesAsDelivered(chatId) {
  try {
    // Récupérer tous les messages du chat
    const messages = await getMessages(chatId);
    
    // Marquer comme livrés uniquement les messages non livrés
    const updatedMessages = messages.map(message => {
      if (message.isMe && !message.delivered) {
        return {
          ...message,
          delivered: true
        };
      }
      return message;
    });

    // Mettre à jour les messages sur le serveur
    for (const message of updatedMessages) {
      if (message.isMe && !message.delivered) {
        await fetch(`${API_URL}/messages/${message.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            delivered: true
          })
        });
      }
    }

    // Mettre à jour le localStorage
    loadMessages();
    messages[chatId] = updatedMessages;
    saveMessages();

    return updatedMessages;
  } catch (error) {
    console.error('Erreur markMessagesAsDelivered:', error);
    throw error;
  }
}

export {
  addMessage,
  getMessagesByChatId,
  loadMessages,
  saveMessages,
  getMessages,
  markMessagesAsDelivered  // Ajouter cette exportation
};