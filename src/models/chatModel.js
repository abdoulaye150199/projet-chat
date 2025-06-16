import { generateRandomAvatar } from '../utils/helpers.js';
import { generateInitialsAvatar } from '../utils/avatarGenerator.js';
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

// Initialiser les tableaux vides
let chats = [];
let contacts = [];

// Charger les chats depuis le localStorage
function loadChats() {
  const savedChats = localStorage.getItem('whatsapp_chats');
  chats = savedChats ? JSON.parse(savedChats) : [];
}

// Sauvegarder les chats dans le localStorage
function saveChats() {
  localStorage.setItem('whatsapp_chats', JSON.stringify(chats));
}

async function getAllChats() {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      loadChats();
      return [...chats];
    }

    // Récupérer tous les chats depuis l'API
    const response = await fetch(`${API_URL}/chats`);
    if (response.ok) {
      const allChats = await response.json();
      
      // Filtrer les chats où l'utilisateur actuel est participant
      const userChats = allChats.filter(chat => {
        // Pour les chats individuels
        if (!chat.isGroup && !chat.isCommunity) {
          return chat.participants && chat.participants.includes(currentUser.id);
        }
        // Pour les groupes et communautés
        return chat.participants && chat.participants.includes(currentUser.id);
      });
      
      // Mettre à jour le localStorage
      chats = userChats;
      saveChats();
      
      return userChats;
    }
  } catch (error) {
    console.warn('Failed to fetch chats from API, using local data:', error);
  }

  // Fallback vers localStorage
  loadChats();
  return [...chats];
}

async function getChatById(id) {
  try {
    const idStr = String(id);
    const idNum = Number(id);
    
    // First check localStorage
    loadChats();
    let localChat = chats.find(chat => 
      String(chat.id) === idStr || Number(chat.id) === idNum
    );
    
    // Essayer de récupérer depuis l'API
    try {
      const response = await fetch(`${API_URL}/chats`);
      if (response.ok) {
        const allChats = await response.json();
        const apiChat = allChats.find(chat => 
          String(chat.id) === idStr || Number(chat.id) === idNum
        );
        
        if (apiChat) {
          const index = chats.findIndex(chat => 
            String(chat.id) === idStr || Number(chat.id) === idNum
          );
          if (index !== -1) {
            chats[index] = apiChat;
          } else {
            chats.push(apiChat);
          }
          saveChats();
          return apiChat;
        }
      }
    } catch (apiError) {
      console.warn('API get failed, using local data:', apiError);
    }

    if (localChat) {
      try {
        const createResponse = await fetch(`${API_URL}/chats`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(localChat)
        });
        
        if (createResponse.ok) {
          const createdChat = await createResponse.json();
          const index = chats.findIndex(chat => 
            String(chat.id) === idStr || Number(chat.id) === idNum
          );
          if (index !== -1) {
            chats[index] = createdChat;
            saveChats();
          }
          return createdChat;
        }
      } catch (createError) {
        console.warn('Failed to sync chat to API:', createError);
      }
      return localChat;
    }

    const newChat = {
      id: idNum,
      name: 'Nouvelle discussion',
      lastMessage: '',
      timestamp: new Date().toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      unreadCount: 0,
      avatar: `https://api.dicebear.com/6.x/initials/svg?seed=${id}`,
      online: false,
      status: "Hey! J'utilise WhatsApp",
      messages: []
    };

    try {
      const createResponse = await fetch(`${API_URL}/chats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newChat)
      });

      if (createResponse.ok) {
        const createdChat = await createResponse.json();
        chats.push(createdChat);
        saveChats();
        return createdChat;
      }
    } catch (createError) {
      console.warn('Failed to create chat in API, saving locally:', createError);
    }

    chats.push(newChat);
    saveChats();
    return newChat;
  } catch (error) {
    console.error('Error in getChatById:', error);
    return null;
  }
}

function searchChats(query) {
  if (!query) return getAllChats();
  
  return chats.filter(chat => 
    chat.name.toLowerCase().includes(query.toLowerCase()) || 
    chat.lastMessage.toLowerCase().includes(query.toLowerCase())
  );
}

function markAsRead(id) {
  const idStr = String(id);
  const idNum = Number(id);
  const chatIndex = chats.findIndex(chat => 
    String(chat.id) === idStr || Number(chat.id) === idNum
  );
  if (chatIndex !== -1) {
    chats[chatIndex].unreadCount = 0;
    saveChats();
    return true;
  }
  return false;
}

// Récupérer tous les utilisateurs inscrits comme contacts potentiels
async function getAllContacts() {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      console.error('Aucun utilisateur connecté');
      return [];
    }

    // Récupérer les contacts sauvegardés localement
    const savedContacts = localStorage.getItem('whatsapp_contacts');
    const localContacts = savedContacts ? JSON.parse(savedContacts) : [];

    // Récupérer tous les utilisateurs inscrits
    const response = await fetch(`${API_URL}/users`);
    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des utilisateurs');
    }
    
    const users = await response.json();
    
    // Convertir les utilisateurs inscrits en contacts
    const registeredContacts = users
      .filter(user => user.id !== currentUser.id && user.phone !== currentUser.phone)
      .map(user => ({
        id: user.id,
        name: user.name || `${user.firstName} ${user.lastName}`,
        phone: user.phone,
        status: user.status || "Hey! J'utilise WhatsApp",
        online: user.isOnline || false,
        avatar: user.avatar || generateInitialsAvatar(user.name || `${user.firstName} ${user.lastName}`).dataUrl,
        lastSeen: user.lastSeen,
        isRegistered: true
      }));

    // Combiner les contacts inscrits et non inscrits
    const allContacts = [...registeredContacts];

    // Ajouter les contacts non inscrits
    localContacts.forEach(contact => {
      if (!registeredContacts.some(rc => rc.phone === contact.phone)) {
        allContacts.push({
          ...contact,
          status: "N'utilise pas encore WhatsApp",
          online: false,
          avatar: generateInitialsAvatar(contact.name || contact.phone).dataUrl,
          isRegistered: false
        });
      }
    });

    // Sauvegarder la liste combinée
    localStorage.setItem('whatsapp_contacts', JSON.stringify(allContacts));

    return allContacts;

  } catch (error) {
    console.error('Erreur lors de la récupération des contacts:', error);
    // En cas d'erreur, retourner les contacts locaux
    const savedContacts = localStorage.getItem('whatsapp_contacts');
    return savedContacts ? JSON.parse(savedContacts) : [];
  }
}

// Ajouter cette fonction pour sauvegarder un nouveau contact non inscrit
async function addUnregisteredContact(contactData) {
  try {
    const savedContacts = localStorage.getItem('whatsapp_contacts');
    const contacts = savedContacts ? JSON.parse(savedContacts) : [];

    const newContact = {
      id: Date.now().toString(),
      name: contactData.name || contactData.phone,
      phone: contactData.phone,
      status: "N'utilise pas encore WhatsApp",
      online: false,
      avatar: generateInitialsAvatar(contactData.name || contactData.phone).dataUrl,
      isRegistered: false,
      createdAt: new Date().toISOString()
    };

    contacts.push(newContact);
    localStorage.setItem('whatsapp_contacts', JSON.stringify(contacts));

    return newContact;
  } catch (error) {
    console.error('Erreur lors de l\'ajout du contact non inscrit:', error);
    throw error;
  }
}

// Créer un nouveau chat avec un contact existant
async function createNewChat(contact) {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error('Aucun utilisateur connecté');
    }

    // Vérifier si le chat existe déjà
    const allChats = await getAllChats();
    const existingChat = allChats.find(c => {
      // Pour les chats individuels, vérifier les participants
      if (!c.isGroup && !c.isCommunity && c.participants) {
        return c.participants.includes(currentUser.id) && c.participants.includes(contact.id);
      }
      // Ancienne méthode pour compatibilité
      return String(c.contactId) === String(contact.id);
    });
    
    if (existingChat) {
      return existingChat;
    }

    // Créer un nouveau chat
    const newChat = {
      id: Date.now(),
      contactId: contact.id,
      name: contact.name,
      lastMessage: '',
      timestamp: new Date().toLocaleTimeString('fr-FR'),
      unreadCount: 0,
      avatar: contact.avatar,
      online: contact.online || false,
      status: contact.status || "Hey! J'utilise WhatsApp",
      messages: [],
      isGroup: false,
      isCommunity: false,
      participants: [currentUser.id, contact.id]
    };

    // Sauvegarder en local d'abord
    chats.push(newChat);
    saveChats();

    try {
      // Sauvegarder dans l'API
      const response = await fetch(`${API_URL}/chats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newChat)
      });

      if (response.ok) {
        const savedChat = await response.json();
        const index = chats.findIndex(c => c.id === newChat.id);
        if (index !== -1) {
          chats[index] = savedChat;
          saveChats();
        }
        return savedChat;
      }
    } catch (apiError) {
      console.warn('API error, using local data:', apiError);
    }

    return newChat;
  } catch (error) {
    console.error('Error in createNewChat:', error);
    return null;
  }
}

// Créer un nouveau groupe
async function createNewGroup(groupData) {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error('Aucun utilisateur connecté');
    }

    const newGroup = {
      ...groupData,
      id: Date.now(),
      isGroup: groupData.isGroup || true,
      isCommunity: groupData.isCommunity || false,
      messages: [],
      lastMessage: groupData.isCommunity ? 
        `Communauté créée par ${currentUser.name}` : 
        `Groupe créé par ${currentUser.name}`,
      timestamp: new Date().toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      unreadCount: 0,
      online: false,
      admin: currentUser.id,
      participants: [currentUser.id, ...groupData.participants.map(p => p.id || p)]
    };

    chats.push(newGroup);
    saveChats();

    try {
      const response = await fetch(`${API_URL}/chats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newGroup)
      });

      if (response.ok) {
        const savedGroup = await response.json();
        const index = chats.findIndex(c => c.id === newGroup.id);
        if (index !== -1) {
          chats[index] = savedGroup;
          saveChats();
        }
        return savedGroup;
      }
    } catch (apiError) {
      console.warn('API error, using local data:', apiError);
    }

    return newGroup;
  } catch (error) {
    console.error('Error in createNewGroup:', error);
    return null;
  }
}

// Mettre à jour le dernier message d'un chat
async function updateLastMessage(chatId, text) {
  try {
    loadChats();
    const chatIndex = chats.findIndex(c => c.id === chatId);
    if (chatIndex !== -1) {
      chats[chatIndex].lastMessage = text;
      chats[chatIndex].timestamp = new Date().toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      });
      saveChats();
    }

    // Mettre à jour dans l'API seulement si le chat existe
    try {
      // D'abord vérifier si le chat existe dans l'API
      const checkResponse = await fetch(`${API_URL}/chats/${chatId}`);
      if (checkResponse.ok) {
        // Le chat existe, on peut le mettre à jour
        const updateResponse = await fetch(`${API_URL}/chats/${chatId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            lastMessage: text,
            timestamp: new Date().toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit'
            })
          })
        });

        if (!updateResponse.ok) {
          console.warn('Failed to update last message in API');
        }
      } else {
        console.warn('Chat not found in API, skipping update');
      }
    } catch (apiError) {
      console.warn('API error when updating last message:', apiError);
    }
  } catch (error) {
    console.error('Error updateLastMessage:', error);
  }
}

// Récupérer les chats de l'utilisateur actuel
async function getUserChats() {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      return [];
    }

    // Récupérer tous les chats depuis l'API
    const response = await fetch(`${API_URL}/chats`);
    if (response.ok) {
      const allChats = await response.json();
      // Filtrer les chats où l'utilisateur actuel est participant
      const userChats = allChats.filter(chat => 
        chat.participants && chat.participants.includes(currentUser.id)
      );
      
      // Mettre à jour le localStorage
      chats = userChats;
      saveChats();
      
      return userChats;
    }
  } catch (error) {
    console.warn('Failed to fetch chats from API, using local data:', error);
  }

  // Fallback vers localStorage
  loadChats();
  return chats;
}

// Add new contact function
async function addNewContact(contactData) {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error('Aucun utilisateur connecté');
    }

    // Check if contact already exists
    const contacts = await getAllContacts();
    const existingContact = contacts.find(c => c.phone === contactData.phone);
    if (existingContact) {
      throw new Error('Ce numéro existe déjà');
    }

    // Create new contact
    const newContact = {
      ...contactData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      userId: currentUser.id
    };

    try {
      // Save to API
      const response = await fetch(`${API_URL}/contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newContact)
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'ajout du contact');
      }

      return await response.json();
    } catch (apiError) {
      console.warn('API error, saving locally:', apiError);
      return newContact;
    }
  } catch (error) {
    console.error('Error in addNewContact:', error);
    throw error;
  }
}

// Charger les contacts avec un indicateur de chargement
async function loadContacts(onContactSelect) {
  try {
    const contactsList = document.getElementById('contacts-list');
    if (contactsList) {
      // Afficher le loading
      contactsList.innerHTML = `
        <div class="flex flex-col items-center justify-center p-8 text-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00a884] mb-4"></div>
          <p class="text-gray-400">Chargement des utilisateurs inscrits...</p>
        </div>
      `;
    }

    const contacts = await getAllContacts();
    console.log('Contacts chargés:', contacts); // Debug

    if (!Array.isArray(contacts)) {
      throw new Error('getAllContacts n\'a pas retourné un tableau');
    }

    await renderContacts(contacts, onContactSelect);
  } catch (error) {
    console.error('Erreur lors du chargement des contacts:', error);
    // ... gestion de l'erreur ...
  }
}

// Ajouter cette fonction avant les exports
async function searchContacts(query) {
  try {
    if (!query.trim()) {
      return getAllContacts();
    }

    const contacts = await getAllContacts();
    return contacts.filter(contact => 
      contact.name.toLowerCase().includes(query.toLowerCase()) ||
      contact.phone.toLowerCase().includes(query.toLowerCase()) ||
      contact.status.toLowerCase().includes(query.toLowerCase())
    );
  } catch (error) {
    console.error('Erreur dans searchContacts:', error);
    return [];
  }
}

export {
  getAllChats,
  getChatById,
  searchChats,
  markAsRead,
  getAllContacts, 
  searchContacts, // Maintenant la fonction existe
  createNewChat,
  updateLastMessage,
  createNewGroup,
  getUserChats,
  addNewContact,
  addUnregisteredContact
};