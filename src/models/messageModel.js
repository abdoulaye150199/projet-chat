import { updateLastMessage, createNewChat, getAllChats, getChatById } from './chatModel.js';
import { getCurrentUser } from '../utils/auth.js';

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

async function addMessage(chatId, text, isMe = true, recipientId = null) {
  try {
    const currentUser = getCurrentUser();
    const senderId = currentUser ? currentUser.id : 1;
    
    const message = {
      id: Date.now().toString(),
      chatId: chatId,
      senderId: senderId,
      recipientId: recipientId,
      text: text,
      timestamp: new Date().toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      isMe: isMe,
      sent: true,
      delivered: isMe ? true : false,
      read: isMe ? false : true,
      createdAt: new Date().toISOString()
    };

    // Envoyer le message au serveur
    try {
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
    } catch (apiError) {
      console.warn('API error, saving locally only:', apiError);
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

    // Si c'est un message envoyé, créer une notification pour le destinataire
    if (isMe && recipientId) {
      await createMessageNotification(message, recipientId);
    }

    return message;
  } catch (error) {
    console.error('Erreur addMessage:', error);
    throw error;
  }
}

// Nouvelle fonction pour créer une notification de message
async function createMessageNotification(message, recipientId) {
  try {
    const notification = {
      id: Date.now().toString(),
      type: 'message',
      senderId: message.senderId,
      recipientId: recipientId,
      messageId: message.id,
      chatId: message.chatId,
      content: message.text,
      timestamp: new Date().toISOString(),
      read: false
    };

    await fetch(`${API_URL}/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(notification)
    });
  } catch (error) {
    console.warn('Erreur lors de la création de la notification:', error);
  }
}

// Fonction pour récupérer les messages d'un utilisateur spécifique
async function getMessagesForUser(userId) {
  try {
    const response = await fetch(`${API_URL}/messages`);
    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des messages');
    }
    const allMessages = await response.json();
    
    // Filtrer les messages pour cet utilisateur (reçus ou envoyés)
    return allMessages.filter(msg => 
      msg.senderId === userId || msg.recipientId === userId
    );
  } catch (error) {
    console.error('Erreur getMessagesForUser:', error);
    return [];
  }
}

// Fonction pour récupérer les notifications d'un utilisateur
async function getNotificationsForUser(userId) {
  try {
    const response = await fetch(`${API_URL}/notifications`);
    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des notifications');
    }
    const notifications = await response.json();
    
    return notifications.filter(notif => 
      notif.recipientId === userId && !notif.read
    );
  } catch (error) {
    console.error('Erreur getNotificationsForUser:', error);
    return [];
  }
}

// Fonction pour marquer une notification comme lue
async function markNotificationAsRead(notificationId) {
  try {
    await fetch(`${API_URL}/notifications/${notificationId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ read: true })
    });
  } catch (error) {
    console.error('Erreur markNotificationAsRead:', error);
  }
}

// Fonction pour synchroniser les messages reçus
async function syncReceivedMessages() {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser || !currentUser.id) return;

    const notifications = await getNotificationsForUser(currentUser.id);
    
    for (const notification of notifications) {
      if (notification.type === 'message') {
        // Récupérer le message complet
        const messageResponse = await fetch(`${API_URL}/messages/${notification.messageId}`);
        if (messageResponse.ok) {
          const message = await messageResponse.json();
          
          // Ajouter le message aux messages locaux comme message reçu
          const receivedMessage = {
            ...message,
            isMe: false,
            delivered: true,
            read: false
          };
          
          loadMessages();
          if (!messages[message.chatId]) {
            messages[message.chatId] = [];
          }
          
          // Vérifier si le message n'existe pas déjà
          const exists = messages[message.chatId].some(m => m.id === message.id);
          if (!exists) {
            messages[message.chatId].push(receivedMessage);
            saveMessages();
            
            // Mettre à jour le chat avec le nouveau message
            await updateLastMessage(message.chatId, message.text);
          }
        }
        
        // Marquer la notification comme lue
        await markNotificationAsRead(notification.id);
      }
    }
  } catch (error) {
    console.error('Erreur syncReceivedMessages:', error);
  }
}

// Ajouter cette nouvelle fonction
async function getMessages(chatId) {
  try {
    // D'abord synchroniser les messages reçus
    await syncReceivedMessages();
    
    // Puis récupérer les messages locaux
    loadMessages();
    const localMessages = messages[chatId] || [];
    
    // Essayer de récupérer depuis l'API aussi
    try {
      const response = await fetch(`${API_URL}/messages`);
      if (response.ok) {
        const allMessages = await response.json();
        const apiMessages = allMessages.filter(msg => msg.chatId === chatId);
        
        // Fusionner les messages locaux et de l'API
        const allChatMessages = [...localMessages];
        
        apiMessages.forEach(apiMsg => {
          const exists = allChatMessages.some(localMsg => localMsg.id === apiMsg.id);
          if (!exists) {
            const currentUser = getCurrentUser();
            allChatMessages.push({
              ...apiMsg,
              isMe: apiMsg.senderId === currentUser.id
            });
          }
        });
        
        // Trier par timestamp
        allChatMessages.sort((a, b) => {
          const timeA = new Date(`1970-01-01 ${a.timestamp}`).getTime();
          const timeB = new Date(`1970-01-01 ${b.timestamp}`).getTime();
          return timeA - timeB;
        });
        
        // Sauvegarder la version fusionnée
        messages[chatId] = allChatMessages;
        saveMessages();
        
        return allChatMessages;
      }
    } catch (apiError) {
      console.warn('API error, using local messages:', apiError);
    }
    
    return localMessages;
  } catch (error) {
    console.error('Erreur getMessages:', error);
    return getMessagesByChatId(chatId);
  }
}

// Ajouter cette nouvelle fonction
async function markMessagesAsDelivered(chatId) {
  try {
    // Récupérer tous les messages du chat
    const chatMessages = await getMessages(chatId);
    
    // Marquer comme livrés uniquement les messages non livrés
    const updatedMessages = chatMessages.map(message => {
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
        try {
          await fetch(`${API_URL}/messages/${message.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              delivered: true
            })
          });
        } catch (apiError) {
          console.warn('API error updating message:', apiError);
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
    throw error;
  }
}

// Fonction pour démarrer la synchronisation périodique
export function startMessageSync() {
  // Synchroniser immédiatement
  syncReceivedMessages();
  
  // Puis synchroniser toutes les 5 secondes
  setInterval(syncReceivedMessages, 5000);
}

export {
  addMessage,
  getMessagesByChatId,
  loadMessages,
  saveMessages,
  getMessages,
  markMessagesAsDelivered,
  syncReceivedMessages,
  getMessagesForUser,
  getNotificationsForUser
};