// Service pour la gestion des médias
class MediaService {
  constructor() {
    this.supportedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    this.supportedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg'];
    this.supportedAudioTypes = ['audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm'];
    this.maxFileSize = 100 * 1024 * 1024; // 100MB
  }

  async processFile(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error('Aucun fichier fourni'));
        return;
      }

      if (file.size > this.maxFileSize) {
        reject(new Error('Fichier trop volumineux (max 100MB)'));
        return;
      }

      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const result = {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified,
            data: e.target.result,
            isImage: this.isImage(file.type),
            isVideo: this.isVideo(file.type),
            isAudio: this.isAudio(file.type)
          };

          // Générer une miniature pour les vidéos
          if (result.isVideo) {
            result.thumbnail = await this.generateVideoThumbnail(file);
          }

          // Générer une miniature pour les images (si nécessaire)
          if (result.isImage) {
            result.thumbnail = await this.generateImageThumbnail(file);
          }

          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error('Erreur lors de la lecture du fichier'));
      };

      reader.readAsDataURL(file);
    });
  }

  isImage(mimeType) {
    return this.supportedImageTypes.includes(mimeType);
  }

  isVideo(mimeType) {
    return this.supportedVideoTypes.includes(mimeType);
  }

  isAudio(mimeType) {
    return this.supportedAudioTypes.includes(mimeType);
  }

  async generateVideoThumbnail(file) {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        video.currentTime = 1; // Prendre une frame à 1 seconde
      };

      video.onseeked = () => {
        ctx.drawImage(video, 0, 0);
        const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
        resolve(thumbnail);
      };

      video.onerror = () => {
        resolve(null);
      };

      video.src = URL.createObjectURL(file);
    });
  }

  async generateImageThumbnail(file, maxWidth = 300, maxHeight = 300) {
    return new Promise((resolve) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        // Calculer les nouvelles dimensions
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(img, 0, 0, width, height);
        const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
        resolve(thumbnail);
      };

      img.onerror = () => {
        resolve(null);
      };

      img.src = URL.createObjectURL(file);
    });
  }

  formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getFileIcon(mimeType) {
    if (this.isImage(mimeType)) {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
        <circle cx="9" cy="9" r="2"/>
        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
      </svg>`;
    }
    
    if (this.isVideo(mimeType)) {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="23 7 16 12 23 17 23 7"/>
        <rect width="15" height="14" x="1" y="5" rx="2" ry="2"/>
      </svg>`;
    }
    
    if (this.isAudio(mimeType)) {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 18V5l12-2v13"/>
        <circle cx="6" cy="18" r="3"/>
        <circle cx="18" cy="16" r="3"/>
      </svg>`;
    }
    
    return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>`;
  }
}

const mediaService = new MediaService();
export default mediaService;