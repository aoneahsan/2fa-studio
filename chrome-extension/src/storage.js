/**
 * Storage Service for Chrome Extension
 * @module src/storage
 */

export class StorageService {
  static STORAGE_KEYS = {
    ACCOUNTS: 'tfa_accounts',
    SETTINGS: 'tfa_settings',
    LAST_SYNC: 'tfa_last_sync',
    PASSWORD_ENTRIES: 'tfa_password_entries'
  };

  /**
   * Get all accounts from storage
   */
  static async getAccounts() {
    try {
      const result = await chrome.storage.local.get(this.STORAGE_KEYS.ACCOUNTS);
      return result[this.STORAGE_KEYS.ACCOUNTS] || [];
    } catch (error) {
      console.error('Failed to get accounts:', error);
      return [];
    }
  }

  /**
   * Save an account
   */
  static async saveAccount(account) {
    try {
      const accounts = await this.getAccounts();
      
      // Add or update account
      const existingIndex = accounts.findIndex(a => a.id === account.id);
      if (existingIndex >= 0) {
        accounts[existingIndex] = { ...accounts[existingIndex], ...account };
      } else {
        // Generate ID if not provided
        account.id = account.id || this.generateId();
        account.createdAt = new Date().toISOString();
        accounts.push(account);
      }
      
      // Save back to storage
      await chrome.storage.local.set({
        [this.STORAGE_KEYS.ACCOUNTS]: accounts
      });
      
      return account;
    } catch (error) {
      console.error('Failed to save account:', error);
      throw error;
    }
  }

  /**
   * Delete an account
   */
  static async deleteAccount(accountId) {
    try {
      const accounts = await this.getAccounts();
      const filtered = accounts.filter(a => a.id !== accountId);
      
      await chrome.storage.local.set({
        [this.STORAGE_KEYS.ACCOUNTS]: filtered
      });
      
      return true;
    } catch (error) {
      console.error('Failed to delete account:', error);
      throw error;
    }
  }

  /**
   * Get settings
   */
  static async getSettings() {
    try {
      const result = await chrome.storage.local.get(this.STORAGE_KEYS.SETTINGS);
      return result[this.STORAGE_KEYS.SETTINGS] || {
        autoFill: true,
        notifications: true,
        syncEnabled: false,
        theme: 'system'
      };
    } catch (error) {
      console.error('Failed to get settings:', error);
      return {};
    }
  }

  /**
   * Save settings
   */
  static async setSettings(settings) {
    try {
      const current = await this.getSettings();
      const updated = { ...current, ...settings };
      
      await chrome.storage.local.set({
        [this.STORAGE_KEYS.SETTINGS]: updated
      });
      
      return updated;
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  }

  /**
   * Import accounts
   */
  static async importAccounts(accounts, replace = false) {
    try {
      if (replace) {
        // Replace all accounts
        await chrome.storage.local.set({
          [this.STORAGE_KEYS.ACCOUNTS]: accounts
        });
      } else {
        // Merge with existing
        const existing = await this.getAccounts();
        const merged = [...existing];
        
        accounts.forEach(account => {
          const exists = merged.find(a => 
            a.issuer === account.issuer && a.accountName === account.accountName
          );
          
          if (!exists) {
            account.id = this.generateId();
            account.createdAt = new Date().toISOString();
            merged.push(account);
          }
        });
        
        await chrome.storage.local.set({
          [this.STORAGE_KEYS.ACCOUNTS]: merged
        });
      }
      
      return true;
    } catch (error) {
      console.error('Failed to import accounts:', error);
      throw error;
    }
  }

  /**
   * Export accounts
   */
  static async exportAccounts() {
    try {
      const accounts = await this.getAccounts();
      
      // Remove sensitive metadata
      const exported = accounts.map(({ id, createdAt, updatedAt, ...account }) => account);
      
      return {
        version: '1.0',
        exported: new Date().toISOString(),
        accounts: exported
      };
    } catch (error) {
      console.error('Failed to export accounts:', error);
      throw error;
    }
  }

  /**
   * Clear all data
   */
  static async clearAll() {
    try {
      await chrome.storage.local.clear();
      return true;
    } catch (error) {
      console.error('Failed to clear storage:', error);
      throw error;
    }
  }

  /**
   * Get storage usage
   */
  static async getUsage() {
    try {
      const bytesInUse = await chrome.storage.local.getBytesInUse();
      const quota = chrome.storage.local.QUOTA_BYTES;
      
      return {
        used: bytesInUse,
        total: quota,
        percentage: (bytesInUse / quota) * 100
      };
    } catch (error) {
      console.error('Failed to get storage usage:', error);
      return null;
    }
  }

  /**
   * Get password entries
   */
  static async getPasswordEntries() {
    try {
      const result = await chrome.storage.local.get(this.STORAGE_KEYS.PASSWORD_ENTRIES);
      return result[this.STORAGE_KEYS.PASSWORD_ENTRIES] || [];
    } catch (error) {
      console.error('Failed to get password entries:', error);
      return [];
    }
  }

  /**
   * Save password entries
   */
  static async savePasswordEntries(entries) {
    try {
      await chrome.storage.local.set({
        [this.STORAGE_KEYS.PASSWORD_ENTRIES]: entries
      });
      return true;
    } catch (error) {
      console.error('Failed to save password entries:', error);
      throw error;
    }
  }

  /**
   * Delete password entry
   */
  static async deletePasswordEntry(entryId) {
    try {
      const entries = await this.getPasswordEntries();
      const filtered = entries.filter(e => e.id !== entryId);
      
      await chrome.storage.local.set({
        [this.STORAGE_KEYS.PASSWORD_ENTRIES]: filtered
      });
      
      return true;
    } catch (error) {
      console.error('Failed to delete password entry:', error);
      throw error;
    }
  }

  /**
   * Generate unique ID
   */
  static generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}