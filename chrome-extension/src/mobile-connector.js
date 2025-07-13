/**
 * Mobile Connector Service
 * Handles secure messaging between browser extension and mobile app
 * @module mobile-connector
 */

export class MobileConnector {
  constructor() {
    this.connected = false;
    this.deviceId = null;
    this.sessionKey = null;
    this.websocket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000;
    this.pingInterval = null;
    this.messageQueue = [];
    
    // Firebase configuration for real-time sync
    this.firebaseConfig = {
      projectId: 'tfa-studio-prod',
      messagingSenderId: '123456789012',
      appId: '1:123456789012:web:abcdef123456'
    };
    
    this.init();
  }

  async init() {
    // Check if mobile sync is enabled
    const settings = await chrome.storage.local.get(['mobileSyncEnabled']);
    if (settings.mobileSyncEnabled) {
      await this.connect();
    }
  }

  async connect() {
    try {
      // Get or generate device ID
      await this.ensureDeviceId();
      
      // Generate session key for E2E encryption
      await this.generateSessionKey();
      
      // Connect to WebSocket server
      await this.connectWebSocket();
      
      // Start heartbeat
      this.startHeartbeat();
      
      this.connected = true;
      console.log('Connected to mobile sync service');
    } catch (error) {
      console.error('Failed to connect to mobile sync:', error);
      this.scheduleReconnect();
    }
  }

  async disconnect() {
    this.connected = false;
    
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    console.log('Disconnected from mobile sync service');
  }

  async ensureDeviceId() {
    const stored = await chrome.storage.local.get(['deviceId']);
    
    if (!stored.deviceId) {
      // Generate new device ID
      this.deviceId = this.generateDeviceId();
      await chrome.storage.local.set({ deviceId: this.deviceId });
    } else {
      this.deviceId = stored.deviceId;
    }
  }

  generateDeviceId() {
    // Generate a unique device ID
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 15);
    return `browser-${timestamp}-${randomStr}`;
  }

  async generateSessionKey() {
    // Generate ephemeral key pair for this session
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-256'
      },
      true,
      ['deriveKey']
    );
    
    this.sessionKeyPair = keyPair;
    
    // Export public key to share with mobile app
    const publicKey = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
    this.publicKeyJwk = publicKey;
  }

  async connectWebSocket() {
    return new Promise((resolve, reject) => {
      // In production, this would connect to your WebSocket server
      // For now, using Firebase Realtime Database as the transport
      const wsUrl = `wss://tfa-studio-prod.firebaseio.com/.ws`;
      
      this.websocket = new WebSocket(wsUrl);
      
      this.websocket.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        
        // Send initial handshake
        this.sendHandshake();
        resolve();
      };
      
      this.websocket.onmessage = (event) => {
        this.handleMessage(event.data);
      };
      
      this.websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };
      
      this.websocket.onclose = () => {
        console.log('WebSocket closed');
        this.connected = false;
        this.scheduleReconnect();
      };
    });
  }

  async sendHandshake() {
    const handshake = {
      type: 'handshake',
      deviceId: this.deviceId,
      deviceType: 'browser',
      publicKey: this.publicKeyJwk,
      timestamp: Date.now(),
      extensionVersion: chrome.runtime.getManifest().version
    };
    
    await this.sendMessage(handshake);
  }

  async handleMessage(data) {
    try {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case 'handshake_response':
          await this.handleHandshakeResponse(message);
          break;
          
        case 'sync_request':
          await this.handleSyncRequest(message);
          break;
          
        case 'add_account':
          await this.handleAddAccount(message);
          break;
          
        case 'request_code':
          await this.handleCodeRequest(message);
          break;
          
        case 'settings_update':
          await this.handleSettingsUpdate(message);
          break;
          
        case 'ping':
          await this.sendMessage({ type: 'pong' });
          break;
      }
    } catch (error) {
      console.error('Failed to handle message:', error);
    }
  }

  async handleHandshakeResponse(message) {
    if (message.mobilePublicKey) {
      // Derive shared secret from mobile's public key
      await this.deriveSharedSecret(message.mobilePublicKey);
      
      // Process any queued messages
      await this.processMessageQueue();
    }
  }

  async deriveSharedSecret(mobilePublicKeyJwk) {
    try {
      // Import mobile's public key
      const mobilePublicKey = await crypto.subtle.importKey(
        'jwk',
        mobilePublicKeyJwk,
        {
          name: 'ECDH',
          namedCurve: 'P-256'
        },
        false,
        []
      );
      
      // Derive shared secret
      this.sharedSecret = await crypto.subtle.deriveKey(
        {
          name: 'ECDH',
          public: mobilePublicKey
        },
        this.sessionKeyPair.privateKey,
        {
          name: 'AES-GCM',
          length: 256
        },
        true,
        ['encrypt', 'decrypt']
      );
      
      console.log('Shared secret established');
    } catch (error) {
      console.error('Failed to derive shared secret:', error);
    }
  }

  async handleSyncRequest(message) {
    // Mobile app is requesting current accounts
    const accounts = await chrome.storage.local.get(['accounts']);
    
    const response = {
      type: 'sync_response',
      accounts: accounts.accounts || [],
      timestamp: Date.now()
    };
    
    await this.sendEncryptedMessage(response);
  }

  async handleAddAccount(message) {
    if (!message.account) return;
    
    try {
      // Decrypt account data
      const account = await this.decryptData(message.account);
      
      // Add account to local storage
      const stored = await chrome.storage.local.get(['accounts']);
      const accounts = stored.accounts || [];
      
      // Check for duplicates
      const exists = accounts.some(a => 
        a.issuer === account.issuer && 
        a.accountName === account.accountName
      );
      
      if (!exists) {
        accounts.push({
          ...account,
          id: crypto.randomUUID(),
          addedFrom: 'mobile',
          addedAt: Date.now()
        });
        
        await chrome.storage.local.set({ accounts });
        
        // Notify user
        chrome.notifications.create({
          type: 'basic',
          iconUrl: chrome.runtime.getURL('assets/icon-48.png'),
          title: 'Account Added from Mobile',
          message: `${account.issuer} has been added to your browser`
        });
      }
    } catch (error) {
      console.error('Failed to add account from mobile:', error);
    }
  }

  async handleCodeRequest(message) {
    if (!message.accountId) return;
    
    try {
      // Find account
      const stored = await chrome.storage.local.get(['accounts']);
      const accounts = stored.accounts || [];
      const account = accounts.find(a => a.id === message.accountId);
      
      if (account) {
        // Generate code
        const { OTPService } = await import('./otp.js');
        const code = OTPService.generateCode(account);
        
        // Send code back to mobile
        const response = {
          type: 'code_response',
          accountId: message.accountId,
          code: code.code,
          remainingTime: code.remainingTime,
          timestamp: Date.now()
        };
        
        await this.sendEncryptedMessage(response);
        
        // Add to badge notifications
        const { BadgeManager } = await import('./badge-manager.js');
        const badgeManager = new BadgeManager();
        await badgeManager.addPendingRequest(account.issuer, account.id);
      }
    } catch (error) {
      console.error('Failed to handle code request:', error);
    }
  }

  async handleSettingsUpdate(message) {
    if (!message.settings) return;
    
    try {
      // Decrypt settings
      const settings = await this.decryptData(message.settings);
      
      // Apply settings that are safe to sync
      const allowedSettings = [
        'autoFillEnabled',
        'showNotifications',
        'theme',
        'defaultTimeout'
      ];
      
      const filteredSettings = {};
      for (const key of allowedSettings) {
        if (settings[key] !== undefined) {
          filteredSettings[key] = settings[key];
        }
      }
      
      await chrome.storage.local.set(filteredSettings);
    } catch (error) {
      console.error('Failed to handle settings update:', error);
    }
  }

  async sendMessage(message) {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(message));
    } else {
      // Queue message for later
      this.messageQueue.push(message);
    }
  }

  async sendEncryptedMessage(message) {
    if (!this.sharedSecret) {
      // Queue for after handshake
      this.messageQueue.push(message);
      return;
    }
    
    try {
      // Encrypt message
      const encrypted = await this.encryptData(message);
      
      const envelope = {
        type: 'encrypted',
        deviceId: this.deviceId,
        data: encrypted,
        timestamp: Date.now()
      };
      
      await this.sendMessage(envelope);
    } catch (error) {
      console.error('Failed to send encrypted message:', error);
    }
  }

  async encryptData(data) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(JSON.stringify(data));
    
    // Generate IV
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      this.sharedSecret,
      dataBuffer
    );
    
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    // Convert to base64
    return btoa(String.fromCharCode(...combined));
  }

  async decryptData(encryptedData) {
    // Convert from base64
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    
    // Extract IV and data
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    
    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      this.sharedSecret,
      data
    );
    
    // Decode
    const decoder = new TextDecoder();
    const jsonStr = decoder.decode(decrypted);
    return JSON.parse(jsonStr);
  }

  async processMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      await this.sendEncryptedMessage(message);
    }
  }

  startHeartbeat() {
    this.pingInterval = setInterval(() => {
      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        this.sendMessage({ type: 'ping' });
      }
    }, 30000); // Ping every 30 seconds
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Reconnecting in ${delay / 1000} seconds...`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  async pairWithMobile(pairingCode) {
    try {
      // Pairing code contains encrypted connection info
      const pairingData = this.decodePairingCode(pairingCode);
      
      // Store pairing info
      await chrome.storage.local.set({
        mobilePaired: true,
        mobilePairingData: pairingData,
        mobilePairedAt: Date.now()
      });
      
      // Enable mobile sync
      await chrome.storage.local.set({ mobileSyncEnabled: true });
      
      // Connect
      await this.connect();
      
      return { success: true };
    } catch (error) {
      console.error('Failed to pair with mobile:', error);
      return { success: false, error: error.message };
    }
  }

  decodePairingCode(code) {
    // In production, this would decode a QR code or pairing string
    // For now, returning mock data
    return {
      serverId: 'server-123',
      channelId: 'channel-456',
      publicKey: 'mock-public-key'
    };
  }

  async unpair() {
    try {
      // Disconnect
      await this.disconnect();
      
      // Clear pairing data
      await chrome.storage.local.remove([
        'mobilePaired',
        'mobilePairingData',
        'mobilePairedAt',
        'mobileSyncEnabled'
      ]);
      
      return { success: true };
    } catch (error) {
      console.error('Failed to unpair:', error);
      return { success: false, error: error.message };
    }
  }

  async getMobileStatus() {
    const stored = await chrome.storage.local.get([
      'mobilePaired',
      'mobilePairedAt',
      'mobileSyncEnabled'
    ]);
    
    return {
      paired: stored.mobilePaired || false,
      pairedAt: stored.mobilePairedAt || null,
      syncEnabled: stored.mobileSyncEnabled || false,
      connected: this.connected,
      deviceId: this.deviceId
    };
  }
}