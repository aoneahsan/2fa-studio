/**
 * Extension Lock Service
 * Provides PIN lock and auto-lock functionality for the extension
 * @module extension-lock
 */

export class ExtensionLockService {
  constructor() {
    this.locked = false;
    this.lockTimeout = null;
    this.failedAttempts = 0;
    this.maxFailedAttempts = 5;
    this.lockoutDuration = 5 * 60 * 1000; // 5 minutes
    this.lockoutEndTime = null;
    
    this.init();
  }

  async init() {
    // Check if extension is locked on startup
    const lockState = await this.getLockState();
    this.locked = lockState.locked;
    
    // Set up auto-lock
    await this.setupAutoLock();
    
    // Listen for activity to reset auto-lock timer
    this.setupActivityListeners();
  }

  async getLockState() {
    try {
      const result = await chrome.storage.local.get(['extensionLocked', 'lockoutEndTime']);
      return {
        locked: result.extensionLocked || false,
        lockoutEndTime: result.lockoutEndTime || null
      };
    } catch (error) {
      console.error('Failed to get lock state:', error);
      return { locked: false, lockoutEndTime: null };
    }
  }

  async isPinEnabled() {
    try {
      const result = await chrome.storage.local.get(['extensionPinEnabled', 'extensionPinHash']);
      return result.extensionPinEnabled && result.extensionPinHash;
    } catch (error) {
      console.error('Failed to check PIN status:', error);
      return false;
    }
  }

  async setPin(pin) {
    if (!pin || pin.length < 4) {
      throw new Error('PIN must be at least 4 characters');
    }
    
    try {
      // Hash the PIN for storage
      const pinHash = await this.hashPin(pin);
      
      await chrome.storage.local.set({
        extensionPinEnabled: true,
        extensionPinHash: pinHash,
        extensionPinSet: Date.now()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Failed to set PIN:', error);
      return { success: false, error: error.message };
    }
  }

  async verifyPin(pin) {
    try {
      // Check if locked out
      if (this.lockoutEndTime && Date.now() < this.lockoutEndTime) {
        const remainingTime = Math.ceil((this.lockoutEndTime - Date.now()) / 1000);
        return {
          success: false,
          error: `Too many failed attempts. Try again in ${remainingTime} seconds.`,
          lockedOut: true,
          remainingTime
        };
      }
      
      const result = await chrome.storage.local.get(['extensionPinHash']);
      if (!result.extensionPinHash) {
        return { success: false, error: 'PIN not set' };
      }
      
      const isValid = await this.verifyPinHash(pin, result.extensionPinHash);
      
      if (isValid) {
        // Reset failed attempts
        this.failedAttempts = 0;
        this.lockoutEndTime = null;
        await chrome.storage.local.remove(['lockoutEndTime']);
        
        // Unlock extension
        await this.unlock();
        
        return { success: true };
      } else {
        // Increment failed attempts
        this.failedAttempts++;
        
        if (this.failedAttempts >= this.maxFailedAttempts) {
          // Lock out user
          this.lockoutEndTime = Date.now() + this.lockoutDuration;
          await chrome.storage.local.set({ lockoutEndTime: this.lockoutEndTime });
          
          return {
            success: false,
            error: `Too many failed attempts. Locked out for ${this.lockoutDuration / 60000} minutes.`,
            lockedOut: true
          };
        }
        
        return {
          success: false,
          error: `Invalid PIN. ${this.maxFailedAttempts - this.failedAttempts} attempts remaining.`,
          attemptsRemaining: this.maxFailedAttempts - this.failedAttempts
        };
      }
    } catch (error) {
      console.error('Failed to verify PIN:', error);
      return { success: false, error: error.message };
    }
  }

  async removePin() {
    try {
      await chrome.storage.local.remove([
        'extensionPinEnabled',
        'extensionPinHash',
        'extensionPinSet'
      ]);
      
      // Also unlock if currently locked
      if (this.locked) {
        await this.unlock();
      }
      
      return { success: true };
    } catch (error) {
      console.error('Failed to remove PIN:', error);
      return { success: false, error: error.message };
    }
  }

  async lock() {
    this.locked = true;
    await chrome.storage.local.set({ extensionLocked: true });
    
    // Notify all extension components
    chrome.runtime.sendMessage({ action: 'extensionLocked' });
    
    // Update badge
    chrome.action.setBadgeText({ text: '🔒' });
    chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
  }

  async unlock() {
    this.locked = false;
    await chrome.storage.local.set({ extensionLocked: false });
    
    // Reset auto-lock timer
    await this.resetAutoLockTimer();
    
    // Notify all extension components
    chrome.runtime.sendMessage({ action: 'extensionUnlocked' });
    
    // Clear badge
    chrome.action.setBadgeText({ text: '' });
  }

  async setupAutoLock() {
    try {
      const settings = await chrome.storage.local.get(['autoLockEnabled', 'autoLockTimeout']);
      
      if (settings.autoLockEnabled) {
        const timeout = settings.autoLockTimeout || 5; // Default 5 minutes
        await this.setAutoLockTimeout(timeout);
      }
    } catch (error) {
      console.error('Failed to setup auto-lock:', error);
    }
  }

  async setAutoLockTimeout(minutes) {
    if (minutes <= 0) {
      // Disable auto-lock
      if (this.lockTimeout) {
        clearTimeout(this.lockTimeout);
        this.lockTimeout = null;
      }
      return;
    }
    
    // Set new timeout
    const milliseconds = minutes * 60 * 1000;
    
    if (this.lockTimeout) {
      clearTimeout(this.lockTimeout);
    }
    
    this.lockTimeout = setTimeout(async () => {
      const pinEnabled = await this.isPinEnabled();
      if (pinEnabled && !this.locked) {
        await this.lock();
      }
    }, milliseconds);
    
    // Save settings
    await chrome.storage.local.set({
      autoLockEnabled: true,
      autoLockTimeout: minutes,
      lastActivity: Date.now()
    });
  }

  async resetAutoLockTimer() {
    const settings = await chrome.storage.local.get(['autoLockEnabled', 'autoLockTimeout']);
    
    if (settings.autoLockEnabled && settings.autoLockTimeout) {
      await this.setAutoLockTimeout(settings.autoLockTimeout);
    }
  }

  setupActivityListeners() {
    // Listen for user activity to reset auto-lock timer
    const resetTimer = () => {
      if (!this.locked) {
        this.resetAutoLockTimer();
      }
    };
    
    // Listen for various activity events
    chrome.runtime.onMessage.addListener((_request, _sender, _sendResponse) => {
      // Any message indicates activity
      resetTimer();
    });
    
    // Listen for popup opening
    chrome.action.onClicked.addListener(resetTimer);
    
    // Listen for storage changes (settings updates, etc.)
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local') {
        resetTimer();
      }
    });
  }

  async hashPin(pin) {
    // Use Web Crypto API to hash the PIN
    const encoder = new TextEncoder();
    const data = encoder.encode(pin + 'tfa-studio-salt'); // Add salt
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async verifyPinHash(pin, storedHash) {
    const pinHash = await this.hashPin(pin);
    return pinHash === storedHash;
  }

  async isLocked() {
    return this.locked;
  }

  async getAutoLockSettings() {
    try {
      const settings = await chrome.storage.local.get([
        'autoLockEnabled',
        'autoLockTimeout',
        'lastActivity'
      ]);
      
      return {
        enabled: settings.autoLockEnabled || false,
        timeout: settings.autoLockTimeout || 5,
        lastActivity: settings.lastActivity || null
      };
    } catch (error) {
      console.error('Failed to get auto-lock settings:', error);
      return { enabled: false, timeout: 5, lastActivity: null };
    }
  }
}