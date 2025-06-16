import { updateLastMessage, createNewChat, getAllChats, getChatById } from './chatModel.js';
import { getCurrentUser } from '../utils/auth.js';

// Configuration des URLs d'API
const API_CONFIG = {
    LOCAL: 'http://localhost:3000',
    PRODUCTION: 'https://serveur2.onrender.com'
};

// Fonction pour détecter l'environnement et choisir l'URL appropriée
function getApiUrl() {
    // Si on est en développement local (localhost ou 127.0.0.1)
    if (window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1' || 
        window.location.hostname === '') {
        return API_CONFIG.LOCAL;
    }
    // Sinon utiliser l'URL de production
    return API_CONFIG.PRODUCTION;
}

const API_URL = getApiUrl();

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
      
      // Vérifier si le destinataire est un utilisateur inscrit
      await checkAndNotifyRegisteredUser(message, recipientId);
    }

    return message;
  } catch (error) {
    console.error('Erreur addMessage:', error);
    throw error;
  }
}

// Nouvelle fonction pour vérifier et notifier les utilisateurs inscrits
async function checkAndNotifyRegisteredUser(message, recipientId) {
  try {
    // Récupérer tous les utilisateurs inscrits
    const usersResponse = await fetch(`${API_URL}/users`);
    if (!usersResponse.ok) return;
    
    const users = await usersResponse.json();
    const recipient = users.find(user => user.id == recipientId);
    
    if (recipient) {
      console.log('Message envoyé à un utilisateur inscrit:', recipient.name);
      
      // Créer une notification spéciale pour les utilisateurs inscrits
      const notification = {
        id: Date.now().toString(),
        type: 'message_from_user',
        senderId: message.senderId,
        recipientId: recipientId,
        messageId: message.id,
        chatId: message.chatId,
        content: message.text,
        timestamp: new Date().toISOString(),
        read: false,
        priority: 'high' // Priorité élevée pour les messages entre utilisateurs inscrits
      };

      await fetch(`${API_URL}/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(notification)
      });
      
      console.log('Notification créée pour l\'utilisateur inscrit');
    }
  } catch (error) {
    console.warn('Erreur lors de la vérification de l\'utilisateur inscrit:', error);
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
    if (response.status === 404) {
      console.warn('Table notifications non trouvée, création...');
      // Créer la table si elle n'existe pas
      await fetch(`${API_URL}/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([])
      });
      return [];
    }

    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des notifications');
    }

    const notifications = await response.json();
    return notifications.filter(notif => 
      notif.recipientId == userId && !notif.read
    );
  } catch (error) {
    console.warn('Erreur getNotificationsForUser:', error);
    return []; // Retourner un tableau vide en cas d'erreur
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
      if (notification.type === 'message' || notification.type === 'message_from_user') {
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
            
            // Créer le chat s'il n'existe pas
            await ensureChatExists(message.chatId, message.senderId);
            
            // Si le chat est actuellement actif, ajouter le message à l'interface
            if (window.activeChat && window.activeChat.id == message.chatId) {
              // Importer dynamiquement la fonction pour éviter les dépendances circulaires
              const { addMessageToChat } = await import('../views/chatView.js');
              addMessageToChat(receivedMessage);
            }

            // Émettre un événement pour rafraîchir la liste des chats
            const event = new CustomEvent('refresh-chat-list');
            document.dispatchEvent(event);
            
            // Afficher une notification si c'est un message d'un utilisateur inscrit
            if (notification.type === 'message_from_user') {
              await showInAppNotification(message, notification);
            }
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

// Fonction pour afficher une notification dans l'app
async function showInAppNotification(message, notification) {
  try {
    // Récupérer les informations de l'expéditeur
    const senderResponse = await fetch(`${API_URL}/users/${message.senderId}`);
    if (senderResponse.ok) {
      const sender = await senderResponse.json();
      
      // Créer une notification visuelle
      const notificationElement = document.createElement('div');
      notificationElement.className = 'fixed top-4 right-4 bg-[#00a884] text-white p-4 rounded-lg shadow-lg z-50 max-w-sm';
      notificationElement.innerHTML = `
        <div class="flex items-center">
          <img src="${sender.avatar || `https://api.dicebear.com/6.x/initials/svg?seed=${sender.name}`}" 
               alt="${sender.name}" 
               class="w-10 h-10 rounded-full mr-3">
          <div class="flex-1">
            <div class="font-medium">${sender.name}</div>
            <div class="text-sm opacity-90">${message.text}</div>
          </div>
        </div>
      `;
      
      document.body.appendChild(notificationElement);
      
      // Supprimer la notification après 5 secondes
      setTimeout(() => {
        if (notificationElement.parentNode) {
          notificationElement.remove();
        }
      }, 5000);
      
      // Ajouter un clic pour ouvrir le chat
      notificationElement.addEventListener('click', () => {
        // Ouvrir le chat correspondant
        const chatClickEvent = new CustomEvent('open-chat', { 
          detail: { chatId: message.chatId, senderId: message.senderId } 
        });
        document.dispatchEvent(chatClickEvent);
        notificationElement.remove();
      });
    }
  } catch (error) {
    console.error('Erreur lors de l\'affichage de la notification:', error);
  }
}

// Fonction pour s'assurer qu'un chat existe
async function ensureChatExists(chatId, senderId) {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    // Vérifier si le chat existe déjà
    const existingChat = await getChatById(chatId);
    if (existingChat) return existingChat;

    // Récupérer les informations de l'expéditeur
    const senderResponse = await fetch(`${API_URL}/users/${senderId}`);
    if (senderResponse.ok) {
      const sender = await senderResponse.json();
      
      // Créer le chat avec l'expéditeur
      const contact = {
        id: sender.id,
        name: sender.name || `${sender.firstName} ${sender.lastName}`,
        phone: sender.phone,
        status: sender.status || "Hey! J'utilise WhatsApp",
        online: sender.isOnline || false,
        avatar: sender.avatar || `https://api.dicebear.com/6.x/initials/svg?seed=${sender.name}`
      };

      return await createNewChat(contact);
    }
  } catch (error) {
    console.error('Erreur ensureChatExists:', error);
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
        const apiMessages = allMessages.filter(msg => msg.chatId == chatId);
        
        // Fusionner les messages locaux et de l'API
        const allChatMessages = [...localMessages];
        
        apiMessages.forEach(apiMsg => {
          const exists = allChatMessages.some(localMsg => localMsg.id === apiMsg.id);
          if (!exists) {
            const currentUser = getCurrentUser();
            allChatMessages.push({
              ...apiMsg,
              isMe: apiMsg.senderId == currentUser.id
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

// Fonction pour marquer les messages comme lus
async function markMessagesAsRead(chatId) {
  try {
    loadMessages();
    const chatMessages = messages[chatId] || [];
    
    // Marquer tous les messages reçus comme lus
    chatMessages.forEach(message => {
      if (!message.isMe) {
        message.read = true;
      }
    });
    
    saveMessages();
    
    // Mettre à jour sur le serveur
    for (const message of chatMessages) {
      if (!message.isMe && !message.read) {
        try {
          await fetch(`${API_URL}/messages/${message.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ read: true })
          });
        } catch (apiError) {
          console.warn('API error updating message read status:', apiError);
        }
      }
    }
    
    return chatMessages;
  } catch (error) {
    console.error('Erreur markMessagesAsRead:', error);
    return [];
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
  markMessagesAsRead,
  syncReceivedMessages,
  getMessagesForUser,
  getNotificationsForUser
};