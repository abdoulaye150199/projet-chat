// Vue pour les statuts WhatsApp
import { 
  getAllStatuses, 
  getMyStatuses, 
  createStatus, 
  viewStatus, 
  deleteStatus, 
  getOthersStatuses,
  syncOtherUsersStatuses 
} from '../controllers/statusController.js';
import { generateInitialsAvatar } from '../utils/avatarGenerator.js';
import { getCurrentUser } from '../utils/auth.js';

export function renderStatusView() {
  // Vérifier si la vue des statuts existe déjà
  const existingStatus = document.getElementById('status-container');
  if (existingStatus) {
    return;
  }

  // Masquer la liste des chats
  const chatList = document.getElementById('chat-list-container');
  if (chatList) {
    chatList.style.display = 'none';
  }
  
  // Créer le conteneur des statuts
  const container = document.createElement('div');
  container.id = 'status-container';
  container.className = 'w-[380px] border-r border-gray-700 flex flex-col bg-[#111b21]';
  
  // Header
  const header = document.createElement('div');
  header.className = 'p-4 bg-[#202c33] flex items-center justify-between border-b border-gray-700';
  header.innerHTML = `
    <div class="flex items-center">
      <button id="status-back-btn" class="text-gray-400 hover:text-white mr-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </button>
      <h2 class="text-white text-xl font-medium">Statuts</h2>
    </div>
    <div class="flex items-center gap-2">
      <button id="refresh-statuses-btn" class="text-gray-400 hover:text-white" title="Actualiser">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="23 4 23 10 17 10"></polyline>
          <polyline points="1 20 1 14 7 14"></polyline>
          <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
        </svg>
      </button>
      <button id="camera-btn" class="text-gray-400 hover:text-white">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
          <circle cx="12" cy="13" r="4"></circle>
        </svg>
      </button>
    </div>
  `;
  
  // Mon statut
  const myStatusSection = document.createElement('div');
  myStatusSection.className = 'p-4 border-b border-gray-700';
  myStatusSection.innerHTML = `
    <div class="flex items-center cursor-pointer hover:bg-[#202c33] p-2 rounded-lg transition-colors" id="my-status">
      <div class="relative mr-4">
        <div class="w-14 h-14 rounded-full overflow-hidden border-2 border-gray-600" id="my-status-avatar-container">
          <img src="./src/assets/images/profile.jpeg" alt="Mon statut" class="w-full h-full object-cover" id="my-status-avatar">
        </div>
        <div class="absolute bottom-0 right-0 w-6 h-6 bg-[#00a884] rounded-full flex items-center justify-center border-2 border-[#111b21]">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </div>
      </div>
      <div class="flex-1">
        <h3 class="text-white font-medium">Mon statut</h3>
        <p class="text-gray-400 text-sm" id="my-status-text">Appuyez pour ajouter un statut</p>
      </div>
    </div>
  `;
  
  // Section des statuts récents
  const recentSection = document.createElement('div');
  recentSection.className = 'flex-1 overflow-y-auto';
  recentSection.innerHTML = `
    <div class="p-4">
      <h4 class="text-gray-400 text-sm font-medium mb-3">RÉCENTS</h4>
      <div id="recent-statuses">
        <div class="flex flex-col items-center justify-center p-8 text-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00a884] mb-4"></div>
          <p class="text-gray-400">Chargement des statuts...</p>
        </div>
      </div>
    </div>
  `;
  
  // Assembler la vue
  container.appendChild(header);
  container.appendChild(myStatusSection);
  container.appendChild(recentSection);
  
  // Ajouter au DOM
  const chatListParent = chatList ? chatList.parentNode : document.querySelector('#chat-content');
  if (chatListParent) {
    chatListParent.insertBefore(container, chatList);
  }
  
  // Initialiser les événements
  initStatusEvents();
  
  // Charger et afficher les statuts
  loadAndRenderStatuses();
}

function initStatusEvents() {
  // Bouton retour
  const backBtn = document.getElementById('status-back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', hideStatusView);
  }
  
  // Bouton actualiser
  const refreshBtn = document.getElementById('refresh-statuses-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      await syncOtherUsersStatuses();
      loadAndRenderStatuses();
    });
  }
  
  // Bouton caméra
  const cameraBtn = document.getElementById('camera-btn');
  if (cameraBtn) {
    cameraBtn.addEventListener('click', openCamera);
  }
  
  // Mon statut
  const myStatusBtn = document.getElementById('my-status');
  if (myStatusBtn) {
    myStatusBtn.addEventListener('click', handleMyStatusClick);
  }
}

function handleMyStatusClick() {
  const myStatuses = getMyStatuses();
  
  if (myStatuses.length > 0) {
    // Afficher mes statuts existants
    showStatusViewer(myStatuses, 0, true);
  } else {
    // Créer un nouveau statut
    showCreateStatusModal();
  }
}

function showCreateStatusModal() {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  modal.id = 'create-status-modal';
  
  modal.innerHTML = `
    <div class="bg-[#111b21] rounded-lg w-[400px] shadow-xl max-h-[90vh] overflow-y-auto">
      <div class="p-4 border-b border-gray-700 flex justify-between items-center">
        <h2 class="text-white text-xl">Nouveau statut</h2>
        <button id="close-status-modal" class="text-gray-400 hover:text-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      
      <div class="p-4">
        <div class="mb-4">
          <div class="flex gap-2 mb-4">
            <button class="status-type-btn flex-1 p-3 bg-[#00a884] text-white rounded-lg hover:bg-[#06cf9c] transition-colors" data-type="text">
              📝 Texte
            </button>
            <button class="status-type-btn flex-1 p-3 bg-[#2a3942] text-white rounded-lg hover:bg-[#374045] transition-colors" data-type="image">
              📷 Photo
            </button>
          </div>
        </div>
        
        <div id="text-status-form" class="status-form">
          <div class="mb-4">
            <textarea id="status-text" 
              placeholder="Que voulez-vous partager ?" 
              rows="4"
              class="w-full p-3 bg-[#2a3942] text-white rounded-lg outline-none border border-gray-700 focus:border-[#00a884] resize-none"></textarea>
          </div>
          
          <div class="mb-4">
            <label class="block text-gray-400 text-sm mb-2">Couleur de fond</label>
            <div class="flex gap-2 flex-wrap">
              <button class="color-btn w-8 h-8 rounded-full bg-[#00a884] border-2 border-white" data-color="#00a884"></button>
              <button class="color-btn w-8 h-8 rounded-full bg-[#ff6b6b] border-2 border-transparent" data-color="#ff6b6b"></button>
              <button class="color-btn w-8 h-8 rounded-full bg-[#4ecdc4] border-2 border-transparent" data-color="#4ecdc4"></button>
              <button class="color-btn w-8 h-8 rounded-full bg-[#45b7d1] border-2 border-transparent" data-color="#45b7d1"></button>
              <button class="color-btn w-8 h-8 rounded-full bg-[#f9ca24] border-2 border-transparent" data-color="#f9ca24"></button>
              <button class="color-btn w-8 h-8 rounded-full bg-[#6c5ce7] border-2 border-transparent" data-color="#6c5ce7"></button>
              <button class="color-btn w-8 h-8 rounded-full bg-[#fd79a8] border-2 border-transparent" data-color="#fd79a8"></button>
              <button class="color-btn w-8 h-8 rounded-full bg-[#fdcb6e] border-2 border-transparent" data-color="#fdcb6e"></button>
            </div>
          </div>
        </div>
        
        <div id="image-status-form" class="status-form hidden">
          <div class="mb-4">
            <input type="file" id="status-image" accept="image/*" class="hidden">
            <button id="select-image-btn" class="w-full p-4 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:border-[#00a884] hover:text-[#00a884] transition-colors">
              Sélectionner une image
            </button>
            <div id="image-preview" class="mt-4 hidden">
              <img id="preview-img" src="" alt="Aperçu" class="w-full h-48 object-cover rounded-lg">
              <div class="mt-2">
                <textarea id="image-caption" 
                  placeholder="Ajouter une légende (optionnel)" 
                  rows="2"
                  class="w-full p-3 bg-[#2a3942] text-white rounded-lg outline-none border border-gray-700 focus:border-[#00a884] resize-none"></textarea>
              </div>
            </div>
          </div>
        </div>
        
        <div class="flex justify-end gap-2">
          <button id="cancel-status" class="px-4 py-2 text-gray-400 hover:text-white">
            Annuler
          </button>
          <button id="create-status-btn" class="px-6 py-2 bg-[#00a884] text-white rounded-lg hover:bg-[#06cf9c]">
            Publier
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Initialiser les événements du modal
  initCreateStatusModalEvents();
}

function initCreateStatusModalEvents() {
  const modal = document.getElementById('create-status-modal');
  let selectedColor = '#00a884';
  let selectedImage = null;
  let currentType = 'text';
  
  // Fermer le modal
  document.getElementById('close-status-modal').addEventListener('click', () => {
    modal.remove();
  });
  
  document.getElementById('cancel-status').addEventListener('click', () => {
    modal.remove();
  });
  
  // Type de statut
  document.querySelectorAll('.status-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentType = btn.dataset.type;
      
      // Mettre à jour l'interface
      document.querySelectorAll('.status-type-btn').forEach(b => {
        b.classList.remove('bg-[#00a884]');
        b.classList.add('bg-[#2a3942]');
      });
      btn.classList.remove('bg-[#2a3942]');
      btn.classList.add('bg-[#00a884]');
      
      // Afficher/masquer les formulaires
      document.querySelectorAll('.status-form').forEach(form => {
        form.classList.add('hidden');
      });
      document.getElementById(`${currentType}-status-form`).classList.remove('hidden');
    });
  });
  
  // Sélection de couleur
  document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedColor = btn.dataset.color;
      
      // Mettre à jour l'interface
      document.querySelectorAll('.color-btn').forEach(b => {
        b.classList.remove('border-white');
        b.classList.add('border-transparent');
      });
      btn.classList.remove('border-transparent');
      btn.classList.add('border-white');
    });
  });
  
  // Sélection d'image
  document.getElementById('select-image-btn').addEventListener('click', () => {
    document.getElementById('status-image').click();
  });
  
  document.getElementById('status-image').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        selectedImage = event.target.result;
        document.getElementById('preview-img').src = selectedImage;
        document.getElementById('image-preview').classList.remove('hidden');
      };
      reader.readAsDataURL(file);
    }
  });
  
  // Créer le statut
  document.getElementById('create-status-btn').addEventListener('click', async () => {
    try {
      if (currentType === 'text') {
        const text = document.getElementById('status-text').value.trim();
        if (text) {
          await createStatus(text, 'text', selectedColor);
          modal.remove();
          loadAndRenderStatuses();
          showNotification('Statut publié avec succès!');
        } else {
          showNotification('Veuillez saisir un texte', 'error');
        }
      } else if (currentType === 'image' && selectedImage) {
        const caption = document.getElementById('image-caption').value.trim();
        await createStatus(selectedImage, 'image', '#000000', caption);
        modal.remove();
        loadAndRenderStatuses();
        showNotification('Statut publié avec succès!');
      } else {
        showNotification('Veuillez sélectionner une image', 'error');
      }
    } catch (error) {
      console.error('Erreur lors de la création du statut:', error);
      showNotification('Erreur lors de la publication du statut', 'error');
    }
  });
  
  // Fermer en cliquant à l'extérieur
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

async function loadAndRenderStatuses() {
  try {
    // Synchroniser les statuts des autres utilisateurs
    await syncOtherUsersStatuses();
    
    const allStatuses = getAllStatuses();
    const myStatuses = getMyStatuses();
    const otherStatuses = getOthersStatuses();
    
    // Mettre à jour mon statut
    updateMyStatusDisplay(myStatuses);
    
    // Afficher les statuts récents
    renderRecentStatuses(otherStatuses);
    
  } catch (error) {
    console.error('Erreur lors du chargement des statuts:', error);
    const recentContainer = document.getElementById('recent-statuses');
    if (recentContainer) {
      recentContainer.innerHTML = `
        <div class="flex flex-col items-center justify-center p-8 text-center">
          <div class="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
          </div>
          <h3 class="text-white text-lg mb-2">Erreur de chargement</h3>
          <p class="text-gray-400 text-sm">Impossible de charger les statuts</p>
        </div>
      `;
    }
  }
}

function updateMyStatusDisplay(myStatuses) {
  const myStatusText = document.getElementById('my-status-text');
  const myStatusAvatar = document.getElementById('my-status-avatar');
  const myStatusAvatarContainer = document.getElementById('my-status-avatar-container');
  
  if (myStatusText && myStatusAvatarContainer) {
    if (myStatuses.length > 0) {
      const latestStatus = myStatuses[0];
      const timeAgo = getTimeAgo(latestStatus.createdAt);
      myStatusText.textContent = `${timeAgo}`;
      
      // Changer la bordure pour indiquer qu'il y a des statuts
      myStatusAvatarContainer.className = 'w-14 h-14 rounded-full overflow-hidden border-2 border-[#00a884]';
      
      // Mettre à jour l'avatar de l'utilisateur
      const currentUser = getCurrentUser();
      if (myStatusAvatar && currentUser.avatar) {
        myStatusAvatar.src = currentUser.avatar;
      }
    } else {
      myStatusText.textContent = 'Appuyez pour ajouter un statut';
      myStatusAvatarContainer.className = 'w-14 h-14 rounded-full overflow-hidden border-2 border-gray-600';
    }
  }
}

function renderRecentStatuses(otherStatuses) {
  const recentContainer = document.getElementById('recent-statuses');
  if (!recentContainer) return;
  
  if (otherStatuses.length === 0) {
    recentContainer.innerHTML = `
      <div class="flex flex-col items-center justify-center p-8 text-center">
        <div class="w-16 h-16 bg-[#2a3942] rounded-full flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
            <line x1="9" y1="9" x2="9.01" y2="9"></line>
            <line x1="15" y1="9" x2="15.01" y2="9"></line>
          </svg>
        </div>
        <h3 class="text-white text-lg mb-2">Aucun statut récent</h3>
        <p class="text-gray-400 text-sm">Les statuts de vos contacts apparaîtront ici</p>
      </div>
    `;
    return;
  }

  // Grouper les statuts par utilisateur
  const statusesByUser = {};
  otherStatuses.forEach(status => {
    if (!statusesByUser[status.userId]) {
      statusesByUser[status.userId] = [];
    }
    statusesByUser[status.userId].push(status);
  });

  // Trier les statuts de chaque utilisateur par date
  Object.keys(statusesByUser).forEach(userId => {
    statusesByUser[userId].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  });

  recentContainer.innerHTML = Object.keys(statusesByUser).map(userId => {
    const userStatuses = statusesByUser[userId];
    const latestStatus = userStatuses[0];
    const hasUnviewed = userStatuses.some(status => !status.viewedBy.includes('current-user'));
    
    return `
      <div class="flex items-center p-2 hover:bg-[#202c33] rounded-lg cursor-pointer transition-colors status-item" 
           data-user-id="${userId}" data-status-count="${userStatuses.length}">
        <div class="relative mr-4">
          <div class="w-12 h-12 rounded-full overflow-hidden border-2 ${hasUnviewed ? 'border-[#00a884]' : 'border-gray-600'}">
            <img src="${latestStatus.userAvatar}" alt="${latestStatus.userName}" class="w-full h-full object-cover">
          </div>
          ${userStatuses.length > 1 ? `
            <div class="absolute -bottom-1 -right-1 bg-[#00a884] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
              ${userStatuses.length}
            </div>
          ` : ''}
        </div>
        <div class="flex-1">
          <h3 class="text-white font-medium">${latestStatus.userName}</h3>
          <p class="text-gray-400 text-sm">${getTimeAgo(latestStatus.createdAt)}</p>
        </div>
      </div>
    `;
  }).join('');
  
  // Ajouter les événements de clic
  recentContainer.querySelectorAll('.status-item').forEach(item => {
    item.addEventListener('click', () => {
      const userId = item.dataset.userId;
      const userStatuses = statusesByUser[userId];
      if (userStatuses) {
        showStatusViewer(userStatuses, 0, false);
      }
    });
  });
}

function showStatusViewer(statuses, currentIndex, isOwnStatus = false) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black z-50 flex items-center justify-center';
  modal.id = 'status-viewer';
  
  const status = statuses[currentIndex];
  
  modal.innerHTML = `
    <div class="relative w-full h-full flex flex-col">
      <!-- Header -->
      <div class="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/70 to-transparent">
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <button id="close-viewer" class="text-white mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
            <div class="w-8 h-8 rounded-full overflow-hidden mr-3">
              <img src="${status.userAvatar}" alt="Profile" class="w-full h-full object-cover">
            </div>
            <div>
              <h3 class="text-white font-medium">${isOwnStatus ? 'Mon statut' : status.userName}</h3>
              <p class="text-gray-300 text-sm">${getTimeAgo(status.createdAt)}</p>
            </div>
          </div>
          ${isOwnStatus ? `
            <button id="delete-status" class="text-white hover:text-red-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          ` : ''}
        </div>
        
        <!-- Progress bars -->
        <div class="flex gap-1 mt-4">
          ${statuses.map((_, index) => `
            <div class="flex-1 h-1 bg-white/30 rounded">
              <div class="h-full bg-white rounded transition-all duration-300 ${index < currentIndex ? 'w-full' : index === currentIndex ? 'w-full animate-progress' : 'w-0'}"></div>
            </div>
          `).join('')}
        </div>
      </div>
      
      <!-- Content -->
      <div class="flex-1 flex items-center justify-center relative" style="background-color: ${status.backgroundColor || '#000'}">
        ${status.type === 'text' 
          ? `<div class="text-white text-2xl font-medium text-center p-8 max-w-md">${status.content}</div>`
          : `
            <div class="relative max-w-full max-h-full">
              <img src="${status.content}" alt="Status" class="max-w-full max-h-full object-contain">
              ${status.caption ? `
                <div class="absolute bottom-4 left-4 right-4 bg-black/50 text-white p-3 rounded-lg">
                  ${status.caption}
                </div>
              ` : ''}
            </div>
          `
        }
      </div>
      
      <!-- Navigation -->
      <div class="absolute inset-0 flex">
        <div class="flex-1 cursor-pointer" id="prev-status"></div>
        <div class="flex-1 cursor-pointer" id="next-status"></div>
      </div>
    </div>
    
    <style>
      @keyframes progress {
        from { width: 0%; }
        to { width: 100%; }
      }
      .animate-progress {
        animation: progress 5s linear forwards;
      }
    </style>
  `;
  
  document.body.appendChild(modal);
  
  // Marquer le statut comme vu si ce n'est pas le nôtre
  if (!isOwnStatus) {
    viewStatus(status.id, 'current-user');
  }
  
  // Événements
  document.getElementById('close-viewer').addEventListener('click', () => {
    modal.remove();
  });
  
  if (isOwnStatus) {
    const deleteBtn = document.getElementById('delete-status');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async () => {
        if (confirm('Supprimer ce statut ?')) {
          const success = await deleteStatus(status.id);
          if (success) {
            modal.remove();
            loadAndRenderStatuses();
            showNotification('Statut supprimé');
          } else {
            showNotification('Erreur lors de la suppression', 'error');
          }
        }
      });
    }
  }
  
  document.getElementById('prev-status').addEventListener('click', () => {
    if (currentIndex > 0) {
      modal.remove();
      showStatusViewer(statuses, currentIndex - 1, isOwnStatus);
    }
  });
  
  document.getElementById('next-status').addEventListener('click', () => {
    if (currentIndex < statuses.length - 1) {
      modal.remove();
      showStatusViewer(statuses, currentIndex + 1, isOwnStatus);
    } else {
      modal.remove();
    }
  });
  
  // Auto-advance après 5 secondes
  const autoAdvanceTimer = setTimeout(() => {
    if (document.getElementById('status-viewer')) {
      if (currentIndex < statuses.length - 1) {
        modal.remove();
        showStatusViewer(statuses, currentIndex + 1, isOwnStatus);
      } else {
        modal.remove();
      }
    }
  }, 5000);
  
  // Nettoyer le timer si l'utilisateur ferme manuellement
  modal.addEventListener('remove', () => {
    clearTimeout(autoAdvanceTimer);
  });
}

function openCamera() {
  // Implémenter l'ouverture de la caméra pour les statuts
  console.log('Ouverture de la caméra pour statut');
  showCreateStatusModal();
}

function getTimeAgo(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const diffInMinutes = Math.floor((now - date) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'À l\'instant';
  if (diffInMinutes < 60) return `il y a ${diffInMinutes}min`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `il y a ${diffInHours}h`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `il y a ${diffInDays}j`;
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

export function hideStatusView() {
  const container = document.getElementById('status-container');
  if (container) {
    container.remove();
  }
}