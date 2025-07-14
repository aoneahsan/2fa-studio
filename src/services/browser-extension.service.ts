/**
 * Browser Extension Communication Service
 * Handles secure communication between mobile app and browser extension
 * @module services/browser-extension
 */

import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';
import { Network } from '@capacitor/network';
import { initializeApp } from 'firebase/app';
import { 
  getDatabase, 
  ref, 
  onValue, 
  push, 
  set, 
  remove,
  serverTimestamp,
  Database
} from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { EncryptionService } from './encryption.service';
import { OTPAccount } from './otp.service';
import { addToast } from '@store/slices/uiSlice';
import { store } from '@src/store';

interface ExtensionMessage {
  id: string;
  type: 'sync_request' | 'add_account' | 'update_account' | 'delete_account' | 'autofill_request';
  deviceId: string;
  timestamp: number;
  encrypted: boolean;
  data: unknown;
}

interface PairingData {
  extensionId: string;
  deviceId: string;
  deviceName: string;
  publicKey: string;
  createdAt: number;
  lastSeen: number;
}

export class BrowserExtensionService {
  private static instance: BrowserExtensionService;
  private db: Database | null = null;
  private deviceId: string | null = null;
  private sessionKey: string | null = null;
  private listeners: Map<string, () => void> = new Map();
  private isConnected: boolean = false;

  private constructor() {
    this.initializeService();
  }

  static getInstance(): BrowserExtensionService {
    if (!BrowserExtensionService.instance) {
      BrowserExtensionService.instance = new BrowserExtensionService();
    }
    return BrowserExtensionService.instance;
  }

  private async initializeService() {
    try {
      // Initialize Firebase for real-time communication
      const app = initializeApp({
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID
      }, 'extension-bridge');

      this.db = getDatabase(app);
      
      // Get device ID
      const device = await Device.getId();
      this.deviceId = device.identifier;

      // Monitor network status
      Network.addListener('networkStatusChange', (status) => {
        if (status.connected && !this.isConnected) {
          this.reconnect();
        }
      });
    } catch (_error) {
      console.error('Failed to initialize browser extension service:', error);
    }
  }

  /**
   * Generate QR code for pairing with browser extension
   */
  async generatePairingCode(): Promise<string> {
    if (!this.db || !this.deviceId) {
      throw new Error('Service not initialized');
    }

    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Generate pairing session
      const pairingRef = ref(this.db, `pairing/${user.uid}`);
      const pairingData = {
        deviceId: this.deviceId,
        deviceName: (await Device.getInfo()).name || 'Mobile Device',
        publicKey: await this.generatePublicKey(),
        createdAt: serverTimestamp(),
        expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
      };

      await set(pairingRef, pairingData);

      // Return pairing code as JSON
      return JSON.stringify({
        userId: user.uid,
        deviceId: this.deviceId,
        timestamp: Date.now(),
      });
    } catch (_error) {
      console.error('Failed to generate pairing code:', error);
      throw error;
    }
  }

  /**
   * Connect to browser extension
   */
  async connectToExtension(extensionId: string): Promise<void> {
    if (!this.db || !this.deviceId) {
      throw new Error('Service not initialized');
    }

    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Generate session key for E2E encryption
      this.sessionKey = await EncryptionService.generateKey();

      // Register connection
      const connectionRef = ref(this.db, `connections/${user.uid}/${this.deviceId}`);
      await set(connectionRef, {
        extensionId,
        deviceId: this.deviceId,
        deviceName: (await Device.getInfo()).name || 'Mobile Device',
        platform: Capacitor.getPlatform(),
        sessionKey: await this.encryptSessionKey(this.sessionKey),
        connectedAt: serverTimestamp(),
        lastSeen: serverTimestamp(),
      });

      // Listen for messages from extension
      this.listenForMessages(user.uid);

      this.isConnected = true;
      store.dispatch(addToast({
        type: 'success',
        message: 'Connected to browser extension',
      }));
    } catch (_error) {
      console.error('Failed to connect to extension:', error);
      throw error;
    }
  }

  /**
   * Listen for messages from browser extension
   */
  private listenForMessages(userId: string) {
    if (!this.db) return;

    const messagesRef = ref(this.db, `messages/${userId}/${this.deviceId}`);
    
    const listener = onValue(messagesRef, async (snapshot) => {
      const messages = snapshot.val();
      if (!messages) return;

      // Process each message
      for (const [messageId, message] of Object.entries(messages)) {
        await this.handleMessage(messageId, message as ExtensionMessage);
      }
    });

    this.listeners.set('messages', listener);
  }

  /**
   * Handle incoming message from extension
   */
  private async handleMessage(messageId: string, message: ExtensionMessage) {
    if (!this.db) return;

    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      // Decrypt message if encrypted
      let data = message.data;
      if (message.encrypted && this.sessionKey) {
        data = await EncryptionService.decryptWithKey(message.data, this.sessionKey);
      }

      // Process message based on type
      switch (message.type) {
        case 'sync_request':
          await this.handleSyncRequest();
          break;
        
        case 'autofill_request':
          await this.handleAutofillRequest(data);
          break;
        
        default:
          console.warn('Unknown message type:', message.type);
      }

      // Delete processed message
      const messageRef = ref(this.db, `messages/${user.uid}/${this.deviceId}/${messageId}`);
      await remove(messageRef);
    } catch (_error) {
      console.error('Failed to handle message:', error);
    }
  }

  /**
   * Handle sync request from extension
   */
  private async handleSyncRequest() {
    try {
      // Get all accounts
      const accounts = await this.getAccountsForSync();
      
      // Send accounts to extension
      await this.sendMessage('sync_response', { accounts });
    } catch (_error) {
      console.error('Failed to handle sync request:', error);
    }
  }

  /**
   * Handle autofill request from extension
   */
  private async handleAutofillRequest(data: { domain: string; accountId?: string }) {
    try {
      store.dispatch(addToast({
        type: 'info',
        message: `Browser extension requesting code for ${data.domain}`,
      }));

      // If specific account requested, send that
      if (data.accountId) {
        await this.sendAccountCode(data.accountId);
      } else {
        // Find matching accounts for domain
        const accounts = await this.findAccountsForDomain(data.domain);
        if (accounts.length === 1) {
          await this.sendAccountCode(accounts[0].id);
        } else if (accounts.length > 1) {
          // Show account selector
          store.dispatch(addToast({
            type: 'info',
            message: 'Multiple accounts found. Please select one in the app.',
          }));
        }
      }
    } catch (_error) {
      console.error('Failed to handle autofill request:', error);
    }
  }

  /**
   * Send message to browser extension
   */
  async sendMessage(type: string, data: unknown): Promise<void> {
    if (!this.db || !this.deviceId) {
      throw new Error('Service not initialized');
    }

    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Encrypt data if session key available
      let encryptedData = data;
      if (this.sessionKey) {
        encryptedData = await EncryptionService.encryptWithKey(
          JSON.stringify(data), 
          this.sessionKey
        );
      }

      // Send message
      const messagesRef = ref(this.db, `extension_messages/${user.uid}`);
      await push(messagesRef, {
        type,
        deviceId: this.deviceId,
        timestamp: serverTimestamp(),
        encrypted: !!this.sessionKey,
        data: encryptedData,
      });
    } catch (_error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  /**
   * Send account code to extension for autofill
   */
  async sendAccountCode(accountId: string): Promise<void> {
    try {
      // Get account and generate code
      const account = await this.getAccountById(accountId);
      if (!account) {
        throw new Error('Account not found');
      }

      // Check if biometric required
      const biometricRequired = await this.checkBiometricRequired(account);
      if (biometricRequired) {
        store.dispatch(addToast({
          type: 'warning',
          message: 'Please authenticate in the app to send code',
        }));
        return;
      }

      // Generate OTP code
      const { OTPService } = await import('./otp.service');
      const code = OTPService.generateCode(account);

      // Send to extension
      await this.sendMessage('autofill_response', {
        accountId: account.id,
        code: code.code,
        issuer: account.issuer,
        accountName: account.accountName,
      });

      store.dispatch(addToast({
        type: 'success',
        message: `Sent code for ${account.issuer} to browser`,
      }));
    } catch (_error) {
      console.error('Failed to send account code:', error);
      store.dispatch(addToast({
        type: 'error',
        message: 'Failed to send code to browser',
      }));
    }
  }

  /**
   * Disconnect from browser extension
   */
  async disconnect(): Promise<void> {
    if (!this.db || !this.deviceId) return;

    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      // Remove connection
      const connectionRef = ref(this.db, `connections/${user.uid}/${this.deviceId}`);
      await remove(connectionRef);

      // Clear listeners
      this.listeners.forEach(listener => listener());
      this.listeners.clear();

      this.isConnected = false;
      this.sessionKey = null;

      store.dispatch(addToast({
        type: 'info',
        message: 'Disconnected from browser extension',
      }));
    } catch (_error) {
      console.error('Failed to disconnect:', error);
    }
  }

  /**
   * Check if extension is connected
   */
  isExtensionConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Reconnect to extension
   */
  private async reconnect() {
    // Implementation for reconnection logic
  }

  /**
   * Generate public key for pairing
   */
  private async generatePublicKey(): Promise<string> {
    // Generate a public key for secure pairing
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['encrypt', 'decrypt']
    );

    const publicKey = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
    return JSON.stringify(publicKey);
  }

  /**
   * Encrypt session key for transmission
   */
  private async encryptSessionKey(sessionKey: string): Promise<string> {
    // This would use the extension's public key to encrypt
    return sessionKey; // Placeholder
  }

  /**
   * Get accounts for sync
   */
  private async getAccountsForSync(): Promise<OTPAccount[]> {
    // This would get accounts from the store
    return [];
  }

  /**
   * Find accounts matching domain
   */
  private async findAccountsForDomain(domain: string): Promise<OTPAccount[]> {
    // This would search accounts by domain
    return [];
  }

  /**
   * Get account by ID
   */
  private async getAccountById(accountId: string): Promise<OTPAccount | null> {
    // This would get account from store
    return null;
  }

  /**
   * Check if biometric authentication required
   */
  private async checkBiometricRequired(account: OTPAccount): Promise<boolean> {
    // Check if account requires biometric
    return false;
  }
}

// Export singleton instance
export const browserExtensionService = BrowserExtensionService.getInstance();