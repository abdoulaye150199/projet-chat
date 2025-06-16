import { getAllContacts, searchContacts, createNewGroup, getAllChats } from '../models/chatModel.js';
import { renderAddContactModal } from './addContactModalView.js';
import { renderCreateGroupModal } from './createGroupModalView.js';
import { renderCreateCommunityModal } from './createCommunityModalView.js';
import { generateInitialsAvatar } from '../utils/avatarGenerator.js';
import { getCurrentUser } from '../utils/auth.js';

let currentContacts = [];
let currentGroups = [];

async function renderContacts(contacts, onContactSelect) {
  const contactsList = document.getElementById('contacts-list');
  if (!contactsList) return;

  const contactsArray = Array.isArray(contacts) ? contacts : [];
  
  // Filtrer pour exclure l'utilisateur actuel
  const currentUser = getCurrentUser();
  const filteredContacts = contactsArray.filter(contact => 
    contact.id !== currentUser.id && contact.phone !== currentUser.phone
  );
  
  currentContacts = filteredContacts;

  if (filteredContacts.length === 0) {
    contactsList.innerHTML = `
      <div class="flex flex-col items-center justify-center p-8 text-center">
        <div class="w-16 h-16 bg-[#2a3942] rounded-full flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        </div>
        <h3 class="text-white text-lg mb-2">Aucun contact disponible</h3>
        <p class="text-gray-400 text-sm">Les utilisateurs inscrits apparaîtront ici</p>
        <button onclick="document.getElementById('add-contact-btn').click()" class="mt-4 px-4 py-2 bg-[#00a884] text-white rounded-lg hover:bg-[#06cf9c]">
          Ajouter un contact
        </button>
      </div>
    `;
    return;
  }

  contactsList.innerHTML = filteredContacts.map(contact => {
    const avatarData = contact.avatar ? 
      { dataUrl: contact.avatar, initials: '', backgroundColor: '' } : 
      generateInitialsAvatar(contact.name);
    
    return `
      <div class="contact-item flex items-center p-3 hover:bg-[#202c33] cursor-pointer transition-colors" data-contact-id="${contact.id}">
        <div class="w-12 h-12 rounded-full mr-4 overflow-hidden relative">
          <img src="${avatarData.dataUrl}" alt="${contact.name}" class="w-full h-full object-cover">
          ${contact.online ? '<div class="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#111b21]"></div>' : ''}
        </div>
        <div class="flex-1">
          <h3 class="text-white contact-name">${contact.name}</h3>
          <p class="text-gray-400 text-sm">${contact.status || "Hey! J'utilise WhatsApp"}</p>
          <p class="text-gray-500 text-xs">${contact.phone}</p>
        </div>
        <div class="text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </div>
      </div>
    `;
  }).join('');

  // Add click events
  const contactItems = contactsList.querySelectorAll('.contact-item');
  contactItems.forEach(item => {
    item.addEventListener('click', () => {
      const contactId = item.dataset.contactId;
      const selectedContact = currentContacts.find(c => String(c.id) === String(contactId));
      
      console.log('Contact sélectionné:', selectedContact);
      console.log('ID recherché:', contactId);
      console.log('Contacts disponibles:', currentContacts);
      
      if (selectedContact && onContactSelect) {
        onContactSelect(selectedContact);
      } else {
        console.error('Contact non trouvé ou callback manquant');
        console.error('selectedContact:', selectedContact);
        console.error('onContactSelect:', onContactSelect);
      }
    });
  });
}

// Nouvelle fonction pour afficher les groupes et communautés
async function renderGroupsAndCommunities(onContactSelect) {
  const contactsList = document.getElementById('contacts-list');
  if (!contactsList) return;

  try {
    // Récupérer tous les chats de manière asynchrone
    const allChats = await getAllChats(); // Ajouter await ici
    
    // Vérifier que allChats est un tableau
    if (!Array.isArray(allChats)) {
      console.error('getAllChats n\'a pas retourné un tableau:', allChats);
      throw new Error('Format de données invalide');
    }

    const groupsAndCommunities = allChats.filter(chat => 
      chat.isGroup || chat.isCommunity
    );

    currentGroups = groupsAndCommunities;

    if (groupsAndCommunities.length === 0) {
      contactsList.innerHTML = `
        <div class="flex flex-col items-center justify-center p-8 text-center">
          <div class="w-16 h-16 bg-[#2a3942] rounded-full flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <h3 class="text-white text-lg mb-2">Aucun groupe ou communauté</h3>
          <p class="text-gray-400 text-sm">Créez votre premier groupe ou communauté</p>
          <div class="flex gap-2 mt-4">
            <button onclick="document.getElementById('new-group-btn').click()" class="px-4 py-2 bg-[#00a884] text-white rounded-lg hover:bg-[#06cf9c]">
              Nouveau groupe
            </button>
            <button onclick="document.getElementById('new-community-btn').click()" class="px-4 py-2 bg-[#00a884] text-white rounded-lg hover:bg-[#06cf9c]">
              Nouvelle communauté
            </button>
          </div>
        </div>
      `;
      return;
    }

    contactsList.innerHTML = groupsAndCommunities.map(item => {
      const avatarData = item.avatar ? 
        { dataUrl: item.avatar, initials: '', backgroundColor: '' } : 
        generateInitialsAvatar(item.name);
      
      const typeIcon = item.isCommunity ? 
        `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-[#00a884]">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          <circle cx="20" cy="8" r="2"></circle>
        </svg>` :
        `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-[#00a884]">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>`;
      
      return `
        <div class="group-item flex items-center p-3 hover:bg-[#202c33] cursor-pointer transition-colors" data-group-id="${item.id}">
          <div class="w-12 h-12 rounded-full mr-4 overflow-hidden relative">
            <img src="${avatarData.dataUrl}" alt="${item.name}" class="w-full h-full object-cover">
            <div class="absolute bottom-0 right-0 w-4 h-4 bg-[#111b21] rounded-full flex items-center justify-center">
              ${typeIcon}
            </div>
          </div>
          <div class="flex-1">
            <h3 class="text-white group-name">${item.name}</h3>
            <p class="text-gray-400 text-sm">${item.status || (item.participants ? `${item.participants.length + 1} membres` : 'Groupe')}</p>
            ${item.description ? `<p class="text-gray-500 text-xs truncate">${item.description}</p>` : ''}
          </div>
          <div class="text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </div>
        </div>
      `;
    }).join('');

    // Add click events
    const groupItems = contactsList.querySelectorAll('.group-item');
    groupItems.forEach(item => {
      item.addEventListener('click', () => {
        const groupId = item.dataset.groupId;
        const selectedGroup = currentGroups.find(g => String(g.id) === String(groupId));
        
        console.log('Groupe/Communauté sélectionné:', selectedGroup);
        
        if (selectedGroup && onContactSelect) {
          onContactSelect(selectedGroup);
        }
      });
    });

  } catch (error) {
    console.error('Erreur lors du chargement des groupes:', error);
    contactsList.innerHTML = `
      <div class="flex flex-col items-center justify-center p-8 text-center">
        <div class="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
        </div>
        <h3 class="text-white text-lg mb-2">Erreur de chargement</h3>
        <p class="text-gray-400 text-sm">Impossible de charger les groupes et communautés</p>
      </div>
    `;
  }
}

export async function renderNewDiscussionView(onContactSelect) {
  const existingContainer = document.getElementById('new-discussion-container');
  if (existingContainer) {
    return;
  }

  const chatList = document.getElementById('chat-list-container');
  chatList.style.display = 'none';
  
  const container = document.createElement('div');
  container.id = 'new-discussion-container';
  container.className = 'w-[380px] border-r border-gray-700 flex flex-col bg-[#111b21]';
  
  // Header
  const header = document.createElement('div');
  header.className = 'p-4 bg-[#202c33] flex items-center justify-between border-b border-gray-700';
  header.innerHTML = `
    <div class="flex items-center">
      <button id="new-discussion-back-btn" class="text-gray-400 hover:text-white mr-4 transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </button>
      <h2 class="text-white text-xl font-medium">Nouvelle discussion</h2>
    </div>
    <button id="refresh-contacts-btn" class="flex items-center text-[#00a884] hover:text-[#06cf9c] transition-colors" title="Actualiser les contacts">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="23 4 23 10 17 10"></polyline>
        <polyline points="1 20 1 14 7 14"></polyline>
        <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
      </svg>
    </button>
  `;
  
  // Search bar
  const searchContainer = document.createElement('div');
  searchContainer.className = 'p-4 bg-[#111b21]';
  searchContainer.innerHTML = `
    <div class="flex items-center bg-[#2a3942] rounded-lg px-4 py-2">
      <svg class="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        id="contact-search"
        placeholder="Rechercher un nom ou un numéro"
        class="bg-transparent border-none outline-none text-white w-full"
      />
    </div>
  `;
  
  // Options (New Contact, Group, Community)
  const optionsContainer = document.createElement('div');
  optionsContainer.className = 'border-b border-gray-700';
  optionsContainer.innerHTML = `
    <div id="new-contact-btn" class="cursor-pointer hover:bg-[#202c33] p-3 flex items-center transition-colors">
      <div class="w-12 h-12 rounded-full bg-[#00a884] flex items-center justify-center mr-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
          <line x1="19" y1="8" x2="19" y2="14"></line>
          <line x1="22" y1="11" x2="16" y2="11"></line>
        </svg>
      </div>
      <span class="text-white">Nouveau contact</span>
    </div>
    
    <div id="new-group-btn" class="cursor-pointer hover:bg-[#202c33] p-3 flex items-center transition-colors">
      <div class="w-12 h-12 rounded-full bg-[#00a884] flex items-center justify-center mr-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      </div>
      <span class="text-white">Nouveau groupe</span>
    </div>
    
    <div id="new-community-btn" class="cursor-pointer hover:bg-[#202c33] p-3 flex items-center transition-colors">
      <div class="w-12 h-12 rounded-full bg-[#00a884] flex items-center justify-center mr-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          <circle cx="20" cy="8" r="2"></circle>
        </svg>
      </div>
      <span class="text-white">Nouvelle communauté</span>
    </div>
  `;

  // Tabs pour basculer entre contacts et groupes
  const tabsContainer = document.createElement('div');
  tabsContainer.className = 'flex bg-[#111b21] border-b border-gray-700';
  tabsContainer.innerHTML = `
    <button id="contacts-tab" class="flex-1 py-3 px-4 text-center text-[#00a884] border-b-2 border-[#00a884] font-medium">
      CONTACTS
    </button>
    <button id="groups-tab" class="flex-1 py-3 px-4 text-center text-gray-400 hover:text-white transition-colors">
      GROUPES
    </button>
  `;

  // Section title for contacts (sera mise à jour dynamiquement)
  const contactsHeader = document.createElement('div');
  contactsHeader.className = 'px-4 py-2 bg-[#111b21]';
  contactsHeader.innerHTML = `
    <div class="flex items-center justify-between">
      <h3 id="section-title" class="text-[#00a884] text-sm font-medium">CONTACTS SUR WHATSAPP</h3>
      <button id="add-contact-btn" class="text-[#00a884] hover:text-[#06cf9c] transition-colors" title="Ajouter un contact">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
          <line x1="19" y1="8" x2="19" y2="14"></line>
          <line x1="22" y1="11" x2="16" y2="11"></line>
        </svg>
      </button>
    </div>
  `;

  // Contacts list with loading indicator
  const contactsList = document.createElement('div');
  contactsList.id = 'contacts-list';
  contactsList.className = 'flex-1 overflow-y-auto';
  contactsList.innerHTML = `
    <div class="flex flex-col items-center justify-center p-8 text-center">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00a884] mb-4"></div>
      <p class="text-gray-400">Chargement des utilisateurs inscrits...</p>
    </div>
  `;
  
  // Assemble the view
  container.appendChild(header);
  container.appendChild(searchContainer);
  container.appendChild(optionsContainer);
  container.appendChild(tabsContainer);
  container.appendChild(contactsHeader);
  container.appendChild(contactsList);
  
  // Add to DOM
  chatList.parentNode.insertBefore(container, chatList);
  
  // Event listeners
  const backButton = container.querySelector('#new-discussion-back-btn');
  backButton.addEventListener('click', hideNewDiscussionView);
  
  const refreshButton = container.querySelector('#refresh-contacts-btn');
  refreshButton.addEventListener('click', () => {
    const activeTab = getActiveTab();
    if (activeTab === 'contacts') {
      loadContacts(onContactSelect);
    } else {
      loadGroupsAndCommunities(onContactSelect);
    }
  });

  const newContactBtn = container.querySelector('#new-contact-btn');
  newContactBtn.addEventListener('click', () => handleAddContact(onContactSelect));

  const newGroupBtn = container.querySelector('#new-group-btn');
  newGroupBtn.addEventListener('click', () => handleNewGroup(onContactSelect));

  const newCommunityBtn = container.querySelector('#new-community-btn');
  newCommunityBtn.addEventListener('click', () => handleNewCommunity(onContactSelect));

  const addContactBtn = container.querySelector('#add-contact-btn');
  addContactBtn.addEventListener('click', () => handleAddContact(onContactSelect));

  // Tabs event listeners
  const contactsTab = container.querySelector('#contacts-tab');
  const groupsTab = container.querySelector('#groups-tab');
  
  contactsTab.addEventListener('click', () => {
    switchTab('contacts', onContactSelect);
  });
  
  groupsTab.addEventListener('click', () => {
    switchTab('groups', onContactSelect);
  });

  // Initialize events
  initNewDiscussionEvents(onContactSelect);
  
  // Load and render contacts by default
  await loadContacts(onContactSelect);
}

function getActiveTab() {
  const contactsTab = document.getElementById('contacts-tab');
  return contactsTab && contactsTab.classList.contains('text-[#00a884]') ? 'contacts' : 'groups';
}

function switchTab(tabName, onContactSelect) {
  const contactsTab = document.getElementById('contacts-tab');
  const groupsTab = document.getElementById('groups-tab');
  const sectionTitle = document.getElementById('section-title');
  const addContactBtn = document.getElementById('add-contact-btn');
  
  if (tabName === 'contacts') {
    // Activer l'onglet contacts
    contactsTab.className = 'flex-1 py-3 px-4 text-center text-[#00a884] border-b-2 border-[#00a884] font-medium';
    groupsTab.className = 'flex-1 py-3 px-4 text-center text-gray-400 hover:text-white transition-colors';
    
    // Mettre à jour le titre et le bouton
    sectionTitle.textContent = 'CONTACTS SUR WHATSAPP';
    addContactBtn.style.display = 'block';
    
    // Charger les contacts
    loadContacts(onContactSelect);
  } else {
    // Activer l'onglet groupes
    groupsTab.className = 'flex-1 py-3 px-4 text-center text-[#00a884] border-b-2 border-[#00a884] font-medium';
    contactsTab.className = 'flex-1 py-3 px-4 text-center text-gray-400 hover:text-white transition-colors';
    
    // Mettre à jour le titre et masquer le bouton d'ajout
    sectionTitle.textContent = 'GROUPES ET COMMUNAUTÉS';
    addContactBtn.style.display = 'none';
    
    // Charger les groupes et communautés
    loadGroupsAndCommunities(onContactSelect);
  }
}

async function loadContacts(onContactSelect) {
  try {
    const contactsList = document.getElementById('contacts-list');
    if (contactsList) {
      contactsList.innerHTML = `
        <div class="flex flex-col items-center justify-center p-8 text-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00a884] mb-4"></div>
          <p class="text-gray-400">Chargement des utilisateurs inscrits...</p>
        </div>
      `;
    }

    const contacts = await getAllContacts();
    console.log('Utilisateurs inscrits chargés:', contacts);
    await renderContacts(contacts, onContactSelect);
  } catch (error) {
    console.error('Erreur lors du chargement des contacts:', error);
    const contactsList = document.getElementById('contacts-list');
    if (contactsList) {
      contactsList.innerHTML = `
        <div class="flex flex-col items-center justify-center p-8 text-center">
          <div class="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
          </div>
          <h3 class="text-white text-lg mb-2">Erreur de chargement</h3>
          <p class="text-gray-400 text-sm">Impossible de charger les utilisateurs inscrits</p>
          <button onclick="loadContacts()" class="mt-4 px-4 py-2 bg-[#00a884] text-white rounded-lg hover:bg-[#06cf9c]">
            Réessayer
          </button>
        </div>
      `;
    }
  }
}

async function loadGroupsAndCommunities(onContactSelect) {
  try {
    const contactsList = document.getElementById('contacts-list');
    if (contactsList) {
      contactsList.innerHTML = `
        <div class="flex flex-col items-center justify-center p-8 text-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00a884] mb-4"></div>
          <p class="text-gray-400">Chargement des groupes et communautés...</p>
        </div>
      `;
    }

    await renderGroupsAndCommunities(onContactSelect);
  } catch (error) {
    console.error('Erreur lors du chargement des groupes:', error);
  }
}

export function hideNewDiscussionView() {
  const container = document.getElementById('new-discussion-container');
  if (container) {
    container.remove();
  }
  const chatList = document.getElementById('chat-list-container');
  if (chatList) {
    chatList.style.display = 'flex';
  }
}

async function handleAddContact(onContactSelect) {
  console.log('Ajout d\'un nouveau contact');
  try {
    renderAddContactModal();
    
    // Écouter l'événement d'ajout de contact
    document.addEventListener('contact-added', async (event) => {
      const newContact = event.detail;
      console.log('Nouveau contact ajouté:', newContact);
      
      // Rafraîchir la liste des contacts
      await loadContacts(onContactSelect);
      
      showNotification('Contact ajouté avec succès!');
    }, { once: true });
    
  } catch (error) {
    console.error('Erreur lors de l\'ajout du contact:', error);
    showNotification('Erreur lors de l\'ajout du contact', 'error');
  }
}

async function handleNewGroup(onContactSelect) {
  console.log('Création d\'un nouveau groupe');
  try {
    await renderCreateGroupModal();
    
    // Écouter l'événement de création de groupe
    document.addEventListener('group-created', async (event) => {
      const newGroup = event.detail;
      console.log('Nouveau groupe créé:', newGroup);
      
      // Fermer la vue nouvelle discussion
      hideNewDiscussionView();
      
      // Sélectionner automatiquement le nouveau groupe
      if (onContactSelect) {
        onContactSelect(newGroup);
      }
      
      // Rafraîchir la liste des chats
      const chatListRefreshEvent = new CustomEvent('refresh-chat-list');
      document.dispatchEvent(chatListRefreshEvent);
    }, { once: true });
    
  } catch (error) {
    console.error('Erreur lors de la création du groupe:', error);
    showNotification('Erreur lors de la création du groupe', 'error');
  }
}

async function handleNewCommunity(onContactSelect) {
  console.log('Création d\'une nouvelle communauté');
  try {
    await renderCreateCommunityModal();
    
    // Écouter l'événement de création de communauté
    document.addEventListener('community-created', async (event) => {
      const newCommunity = event.detail;
      console.log('Nouvelle communauté créée:', newCommunity);
      
      // Fermer la vue nouvelle discussion
      hideNewDiscussionView();
      
      // Sélectionner automatiquement la nouvelle communauté
      if (onContactSelect) {
        onContactSelect(newCommunity);
      }
      
      // Rafraîchir la liste des chats
      const chatListRefreshEvent = new CustomEvent('refresh-chat-list');
      document.dispatchEvent(chatListRefreshEvent);
    }, { once: true });
    
  } catch (error) {
    console.error('Erreur lors de la création de la communauté:', error);
    showNotification('Erreur lors de la création de la communauté', 'error');
  }
}

async function initNewDiscussionEvents(onContactSelect) {
  const searchInput = document.getElementById('contact-search');
  if (searchInput) {
    searchInput.addEventListener('input', async (e) => {
      const query = e.target.value.trim();
      const activeTab = getActiveTab();
      
      try {
        if (activeTab === 'contacts') {
          const filteredContacts = await searchContacts(query);
          await renderContacts(filteredContacts, onContactSelect);
        } else {
          // Recherche dans les groupes et communautés
          const allChats = await getAllChats(); // Ajouter await ici
          if (Array.isArray(allChats)) {
            const filteredGroups = allChats.filter(chat => 
              (chat.isGroup || chat.isCommunity) && 
              chat.name.toLowerCase().includes(query.toLowerCase())
            );
            currentGroups = filteredGroups;
            await renderGroupsAndCommunities(onContactSelect);
          }
        }
      } catch (error) {
        console.error('Erreur lors de la recherche:', error);
      }
    });
  }
}

function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.className = `fixed bottom-4 right-4 p-4 rounded-lg ${
    type === 'success' ? 'bg-green-500' : 
    type === 'error' ? 'bg-red-500' : 
    'bg-blue-500'
  } text-white shadow-lg z-50 notification`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

export { renderContacts };