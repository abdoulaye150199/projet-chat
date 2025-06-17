// Service pour la communication en temps réel
class RealtimeService {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.messageQueue = [];
    this.isConnected = false;
    this.eventListeners = new Map();
  }

  connect() {
    try {
      // Utiliser WebSocket pour la communication en temps réel
      const wsUrl = window.location.hostname === 'localhost' 
        ? 'ws://localhost:3001' 
        : 'wss://your-websocket-server.com';
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('✅ Connexion WebSocket établie');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Envoyer les messages en attente
        this.flushMessageQueue();
        
        // Authentifier l'utilisateur
        this.authenticate();
        
        this.emit('connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Erreur parsing message WebSocket:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('❌ Connexion WebSocket fermée');
        this.isConnected = false;
        this.emit('disconnected');
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('Erreur WebSocket:', error);
        this.emit('error', error);
      };

    } catch (error) {
      console.error('Erreur lors de la connexion WebSocket:', error);
      this.attemptReconnect();
    }
  }

  authenticate() {
    const currentUser = JSON.parse(localStorage.getItem('whatsapp_user'));
    if (currentUser) {
      this.send({
        type: 'auth',
        userId: currentUser.id,
        token: currentUser.token || 'temp-token'
      });
    }
  }

  send(data) {
    if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      // Mettre en file d'attente si pas connecté
      this.messageQueue.push(data);
    }
  }

  flushMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.send(message);
    }
  }

  handleMessage(data) {
    switch (data.type) {
      case 'message':
        this.emit('message', data.payload);
        break;
      case 'message_status':
        this.emit('messageStatus', data.payload);
        break;
      case 'user_online':
        this.emit('userOnline', data.payload);
        break;
      case 'user_offline':
        this.emit('userOffline', data.payload);
        break;
      case 'typing':
        this.emit('typing', data.payload);
        break;
      case 'stop_typing':
        this.emit('stopTyping', data.payload);
        break;
      default:
        console.log('Message WebSocket non géré:', data);
    }
  }

  sendMessage(message) {
    this.send({
      type: 'send_message',
      payload: message
    });
  }

  updateMessageStatus(messageId, status) {
    this.send({
      type: 'update_message_status',
      payload: { messageId, status }
    });
  }

  sendTyping(chatId) {
    this.send({
      type: 'typing',
      payload: { chatId }
    });
  }

  stopTyping(chatId) {
    this.send({
      type: 'stop_typing',
      payload: { chatId }
    });
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Tentative de reconnexion ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('Impossible de se reconnecter après', this.maxReconnectAttempts, 'tentatives');
      this.emit('reconnectFailed');
    }
  }

  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Erreur dans le callback:', error);
        }
      });
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }
}

// Instance singleton
const realtimeService = new RealtimeService();

export default realtimeService;