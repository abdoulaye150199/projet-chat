// Nouveau fichier pour séparer les fonctionnalités de chat
import { EmojiPicker } from '../components/EmojiPicker.js';
import { addMessage } from '../models/messageModel.js';

let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let recordingStartTime = null;
let recordingTimer = null;
let wasCanceled = false;
let emojiPicker = null;
let currentMimeType = '';

// Initialiser le picker d'emojis
export function initEmojiPicker() {
  if (!emojiPicker) {
    emojiPicker = new EmojiPicker();
    const emojiPickerElement = emojiPicker.create();
    document.body.appendChild(emojiPickerElement);
  }
  return emojiPicker;
}

// Gestion de l'enregistrement audio - VERSION CORRIGÉE
export async function startVoiceRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      } 
    });

    // Détecter le type MIME supporté
    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/wav'
    ];

    let selectedMimeType = null;
    
    // Trouver le premier type MIME supporté
    for (const type of mimeTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        selectedMimeType = type;
        break;
      }
    }

    // Préparer les options
    const options = selectedMimeType ? { mimeType: selectedMimeType } : {};

    // Créer le MediaRecorder avec les options
    mediaRecorder = new MediaRecorder(stream, options);
    
    // Stocker le type MIME effectivement utilisé (lecture seule)
    currentMimeType = mediaRecorder.mimeType || selectedMimeType || 'audio/webm';

    // Réinitialiser les variables
    audioChunks = [];
    isRecording = true;
    recordingStartTime = Date.now();
    wasCanceled = false;

    // Gestionnaire pour les données audio
    mediaRecorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
        console.log('Chunk audio reçu:', event.data.size, 'bytes');
      }
    });

    // Gestionnaire pour l'arrêt de l'enregistrement
    mediaRecorder.addEventListener("stop", () => {
      // Arrêter toutes les pistes audio
      stream.getTracks().forEach(track => {
        track.stop();
        console.log('Piste audio arrêtée:', track.kind);
      });
      console.log('Enregistrement arrêté, chunks:', audioChunks.length);
    });

    // Gestionnaire d'erreur
    mediaRecorder.addEventListener("error", (event) => {
      console.error('Erreur MediaRecorder:', event.error);
    });

    // Démarrer l'enregistrement
    mediaRecorder.start(100); // Collecte des données toutes les 100ms
    console.log('Enregistrement démarré avec le type MIME:', currentMimeType);

    return mediaRecorder;

  } catch (error) {
    console.error("Erreur d'accès au microphone:", error);
    
    // Nettoyage en cas d'erreur
    if (mediaRecorder) {
      mediaRecorder = null;
    }
    isRecording = false;
    audioChunks = [];
    
    throw error;
  }
}

export function stopVoiceRecording() {
  if (mediaRecorder && isRecording) {
    console.log('Arrêt de l\'enregistrement...');
    
    try {
      mediaRecorder.stop();
    } catch (error) {
      console.error('Erreur lors de l\'arrêt de l\'enregistrement:', error);
    }
    
    isRecording = false;
    clearInterval(recordingTimer);
    recordingTimer = null;
  }
}

export function cancelVoiceRecording() {
  console.log('Annulation de l\'enregistrement...');
  wasCanceled = true;
  stopVoiceRecording();
  
  // Nettoyer les chunks audio
  audioChunks = [];
  currentMimeType = '';
  recordingStartTime = null;
}

function getDuration(startTime) {
  if (!startTime) return '0:00';
  
  const duration = Math.floor((Date.now() - startTime) / 1000);
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Gestion des fichiers
export function handleFileUpload(files, onFileSelect) {
  if (!files || files.length === 0) {
    console.warn('Aucun fichier sélectionné');
    return;
  }

  Array.from(files).forEach(file => {
    // Vérifier la taille du fichier (limite à 10MB par exemple)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      console.error('Fichier trop volumineux:', file.name);
      return;
    }

    const reader = new FileReader();
    
    reader.onload = (e) => {
      const fileData = {
        name: file.name,
        size: file.size,
        type: file.type,
        data: e.target.result,
        file: file,
        lastModified: file.lastModified
      };
      
      if (onFileSelect && typeof onFileSelect === 'function') {
        onFileSelect(fileData);
      }
    };
    
    reader.onerror = (error) => {
      console.error('Erreur de lecture du fichier:', file.name, error);
    };
    
    reader.readAsDataURL(file);
  });
}

// Formatage de la taille des fichiers
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  if (i === 0) return bytes + ' ' + sizes[i];
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Timer d'enregistrement
export function startRecordingTimer(timerElement) {
  if (recordingTimer) {
    clearInterval(recordingTimer);
  }
  
  let seconds = 0;
  recordingTimer = setInterval(() => {
    seconds++;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    const timeString = `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    
    if (timerElement) {
      timerElement.textContent = timeString;
    }
    
    console.log('Temps d\'enregistrement:', timeString);
  }, 1000);
}

export function stopRecordingTimer() {
  if (recordingTimer) {
    clearInterval(recordingTimer);
    recordingTimer = null;
    console.log('Timer d\'enregistrement arrêté');
  }
}

// Fonction pour créer le blob audio avec le bon type MIME
export function createAudioBlob() {
  if (!audioChunks || audioChunks.length === 0) {
    console.warn('Aucun chunk audio disponible pour créer le blob');
    return null;
  }
  
  try {
    const blob = new Blob(audioChunks, { 
      type: currentMimeType || 'audio/webm' 
    });
    
    console.log('Blob audio créé avec succès:', {
      size: blob.size,
      type: blob.type,
      chunks: audioChunks.length,
      sizeFormatted: formatFileSize(blob.size)
    });
    
    return blob;
  } catch (error) {
    console.error('Erreur lors de la création du blob audio:', error);
    return null;
  }
}

// Fonction pour obtenir la durée d'enregistrement
export function getRecordingDuration() {
  if (recordingStartTime) {
    return getDuration(recordingStartTime);
  }
  return '0:00';
}

// Fonction pour vérifier si l'enregistrement est en cours
export function isCurrentlyRecording() {
  return isRecording && mediaRecorder && mediaRecorder.state === 'recording';
}

// Fonction pour obtenir l'état du MediaRecorder
export function getMediaRecorderState() {
  return mediaRecorder ? mediaRecorder.state : 'inactive';
}

// Fonction pour nettoyer les ressources
export function cleanup() {
  if (mediaRecorder) {
    if (mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    mediaRecorder = null;
  }
  
  if (recordingTimer) {
    clearInterval(recordingTimer);
    recordingTimer = null;
  }
  
  audioChunks = [];
  isRecording = false;
  recordingStartTime = null;
  wasCanceled = false;
  currentMimeType = '';
  
  console.log('Ressources nettoyées');
}