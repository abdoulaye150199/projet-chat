// Composant pour visualiser les médias
class MediaViewer {
  constructor() {
    this.currentMedia = null;
    this.currentIndex = 0;
    this.mediaList = [];
  }

  show(media, mediaList = [], startIndex = 0) {
    this.currentMedia = media;
    this.mediaList = mediaList;
    this.currentIndex = startIndex;
    
    this.createViewer();
  }

  createViewer() {
    // Supprimer le viewer existant
    const existingViewer = document.getElementById('media-viewer');
    if (existingViewer) {
      existingViewer.remove();
    }

    const viewer = document.createElement('div');
    viewer.id = 'media-viewer';
    viewer.className = 'fixed inset-0 bg-black z-50 flex items-center justify-center';
    
    viewer.innerHTML = `
      <div class="relative w-full h-full flex flex-col">
        <!-- Header -->
        <div class="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/70 to-transparent">
          <div class="flex items-center justify-between">
            <button id="close-media-viewer" class="text-white hover:text-gray-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
            <div class="text-white text-center">
              <div class="font-medium">${this.currentMedia.name}</div>
              <div class="text-sm text-gray-300">${this.formatFileSize(this.currentMedia.size)}</div>
            </div>
            <div class="flex items-center gap-2">
              <button id="download-media" class="text-white hover:text-gray-300" title="Télécharger">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Media Content -->
        <div class="flex-1 flex items-center justify-center p-4" id="media-content">
          ${this.renderMediaContent()}
        </div>

        <!-- Navigation -->
        ${this.mediaList.length > 1 ? `
          <div class="absolute left-4 top-1/2 transform -translate-y-1/2">
            <button id="prev-media" class="text-white bg-black/50 hover:bg-black/70 rounded-full p-2 ${this.currentIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''}">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
          </div>
          <div class="absolute right-4 top-1/2 transform -translate-y-1/2">
            <button id="next-media" class="text-white bg-black/50 hover:bg-black/70 rounded-full p-2 ${this.currentIndex === this.mediaList.length - 1 ? 'opacity-50 cursor-not-allowed' : ''}">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>
        ` : ''}

        <!-- Media Counter -->
        ${this.mediaList.length > 1 ? `
          <div class="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white bg-black/50 px-3 py-1 rounded-full text-sm">
            ${this.currentIndex + 1} / ${this.mediaList.length}
          </div>
        ` : ''}
      </div>
    `;

    document.body.appendChild(viewer);
    this.attachEvents();
  }

  renderMediaContent() {
    const media = this.currentMedia;
    
    if (media.isImage) {
      return `
        <img src="${media.data}" alt="${media.name}" 
             class="max-w-full max-h-full object-contain cursor-zoom-in" 
             id="media-image">
      `;
    }
    
    if (media.isVideo) {
      return `
        <video controls class="max-w-full max-h-full" id="media-video">
          <source src="${media.data}" type="${media.type}">
          Votre navigateur ne supporte pas la lecture vidéo.
        </video>
      `;
    }
    
    if (media.isAudio) {
      return `
        <div class="bg-[#2a3942] rounded-lg p-8 max-w-md w-full">
          <div class="text-center mb-4">
            <div class="w-16 h-16 bg-[#00a884] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white">
                <path d="M9 18V5l12-2v13"/>
                <circle cx="6" cy="18" r="3"/>
                <circle cx="18" cy="16" r="3"/>
              </svg>
            </div>
            <h3 class="text-white text-lg font-medium">${media.name}</h3>
            <p class="text-gray-400 text-sm">${this.formatFileSize(media.size)}</p>
          </div>
          <audio controls class="w-full">
            <source src="${media.data}" type="${media.type}">
            Votre navigateur ne supporte pas la lecture audio.
          </audio>
        </div>
      `;
    }
    
    // Fichier générique
    return `
      <div class="bg-[#2a3942] rounded-lg p-8 max-w-md w-full text-center">
        <div class="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
        </div>
        <h3 class="text-white text-lg font-medium mb-2">${media.name}</h3>
        <p class="text-gray-400 text-sm mb-4">${this.formatFileSize(media.size)}</p>
        <button id="download-file" class="bg-[#00a884] text-white px-4 py-2 rounded-lg hover:bg-[#06cf9c]">
          Télécharger
        </button>
      </div>
    `;
  }

  attachEvents() {
    const viewer = document.getElementById('media-viewer');
    
    // Fermer le viewer
    document.getElementById('close-media-viewer').addEventListener('click', () => {
      this.close();
    });

    // Télécharger le média
    document.getElementById('download-media').addEventListener('click', () => {
      this.downloadMedia();
    });

    // Navigation
    const prevBtn = document.getElementById('prev-media');
    const nextBtn = document.getElementById('next-media');
    
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (this.currentIndex > 0) {
          this.currentIndex--;
          this.currentMedia = this.mediaList[this.currentIndex];
          this.updateViewer();
        }
      });
    }
    
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (this.currentIndex < this.mediaList.length - 1) {
          this.currentIndex++;
          this.currentMedia = this.mediaList[this.currentIndex];
          this.updateViewer();
        }
      });
    }

    // Zoom pour les images
    const mediaImage = document.getElementById('media-image');
    if (mediaImage) {
      let isZoomed = false;
      mediaImage.addEventListener('click', () => {
        if (isZoomed) {
          mediaImage.style.transform = 'scale(1)';
          mediaImage.style.cursor = 'zoom-in';
        } else {
          mediaImage.style.transform = 'scale(2)';
          mediaImage.style.cursor = 'zoom-out';
        }
        isZoomed = !isZoomed;
      });
    }

    // Fermer avec Escape
    document.addEventListener('keydown', this.handleKeydown.bind(this));

    // Fermer en cliquant à l'extérieur
    viewer.addEventListener('click', (e) => {
      if (e.target === viewer) {
        this.close();
      }
    });
  }

  handleKeydown(e) {
    switch (e.key) {
      case 'Escape':
        this.close();
        break;
      case 'ArrowLeft':
        if (this.currentIndex > 0) {
          this.currentIndex--;
          this.currentMedia = this.mediaList[this.currentIndex];
          this.updateViewer();
        }
        break;
      case 'ArrowRight':
        if (this.currentIndex < this.mediaList.length - 1) {
          this.currentIndex++;
          this.currentMedia = this.mediaList[this.currentIndex];
          this.updateViewer();
        }
        break;
    }
  }

  updateViewer() {
    const mediaContent = document.getElementById('media-content');
    if (mediaContent) {
      mediaContent.innerHTML = this.renderMediaContent();
    }
    
    // Mettre à jour le header
    const header = document.querySelector('#media-viewer .font-medium');
    if (header) {
      header.textContent = this.currentMedia.name;
    }
    
    const size = document.querySelector('#media-viewer .text-sm.text-gray-300');
    if (size) {
      size.textContent = this.formatFileSize(this.currentMedia.size);
    }
    
    // Mettre à jour le compteur
    const counter = document.querySelector('#media-viewer .absolute.bottom-4');
    if (counter) {
      counter.textContent = `${this.currentIndex + 1} / ${this.mediaList.length}`;
    }
    
    // Réattacher les événements spécifiques au média
    this.attachMediaSpecificEvents();
  }

  attachMediaSpecificEvents() {
    // Zoom pour les images
    const mediaImage = document.getElementById('media-image');
    if (mediaImage) {
      let isZoomed = false;
      mediaImage.addEventListener('click', () => {
        if (isZoomed) {
          mediaImage.style.transform = 'scale(1)';
          mediaImage.style.cursor = 'zoom-in';
        } else {
          mediaImage.style.transform = 'scale(2)';
          mediaImage.style.cursor = 'zoom-out';
        }
        isZoomed = !isZoomed;
      });
    }
  }

  downloadMedia() {
    const link = document.createElement('a');
    link.href = this.currentMedia.data;
    link.download = this.currentMedia.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  close() {
    const viewer = document.getElementById('media-viewer');
    if (viewer) {
      viewer.remove();
    }
    
    // Supprimer l'écouteur d'événements
    document.removeEventListener('keydown', this.handleKeydown.bind(this));
  }
}

export default MediaViewer;