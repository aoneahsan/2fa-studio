/**
 * Mobile-specific account service with native features
 * @module services/mobile-account
 */

import { Preferences } from '@capacitor/preferences';
import { Device } from '@capacitor/device';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { OTPAccount } from './otp.service';
import { EncryptionService } from './encryption.service';
import { BiometricAccountService } from './biometric-account.service';

export class MobileAccountService {
  private static readonly ACCOUNTS_KEY = 'encrypted_accounts';
  private static readonly SETTINGS_KEY = 'account_settings';
  private static readonly BACKUP_DIR = 'backups';

  /**
   * Initialize mobile-specific features
   */
  static async initialize(): Promise<void> {
    // Create backup directory if it doesn't exist
    try {
      await Filesystem.mkdir({
        path: this.BACKUP_DIR,
        directory: Directory.Documents,
        recursive: true
      });
    } catch (_error) {
      // Directory might already exist
    }
  }

  /**
   * Save accounts to secure storage
   */
  static async saveAccounts(accounts: OTPAccount[]): Promise<void> {
    try {
      // Encrypt accounts before storing
      const encrypted = await EncryptionService.encryptData(
        JSON.stringify(accounts)
      );
      
      await Preferences.set({
        key: this.ACCOUNTS_KEY,
        value: encrypted
      });
    } catch (_error) {
      console.error('Failed to save accounts:', _error);
      throw new Error('Failed to save accounts securely');
    }
  }

  /**
   * Load accounts from secure storage
   */
  static async loadAccounts(): Promise<OTPAccount[]> {
    try {
      const { value } = await Preferences.get({ key: this.ACCOUNTS_KEY });
      
      if (!value) {
        return [];
      }

      const decrypted = await EncryptionService.decryptData(value);
      return JSON.parse(decrypted);
    } catch (_error) {
      console.error('Failed to load accounts:', _error);
      throw new Error('Failed to load accounts');
    }
  }

  /**
   * Add account with biometric protection if enabled
   */
  static async addAccount(account: OTPAccount): Promise<void> {
    const accounts = await this.loadAccounts();
    
    // Check if biometric is required
    if (account.requiresBiometric) {
      await BiometricAccountService.protectAccount(account.id);
    }
    
    accounts.push(account);
    await this.saveAccounts(accounts);
  }

  /**
   * Update account
   */
  static async updateAccount(account: OTPAccount): Promise<void> {
    const accounts = await this.loadAccounts();
    const index = accounts.findIndex(a => a.id === account.id);
    
    if (index === -1) {
      throw new Error('Account not found');
    }
    
    // Update biometric protection if changed
    if (account.requiresBiometric !== accounts[index].requiresBiometric) {
      if (account.requiresBiometric) {
        await BiometricAccountService.protectAccount(account.id);
      } else {
        await BiometricAccountService.unprotectAccount(account.id);
      }
    }
    
    accounts[index] = account;
    await this.saveAccounts(accounts);
  }

  /**
   * Delete account
   */
  static async deleteAccount(accountId: string): Promise<void> {
    const accounts = await this.loadAccounts();
    const filteredAccounts = accounts.filter(a => a.id !== accountId);
    
    // Remove biometric protection if exists
    await BiometricAccountService.unprotectAccount(accountId);
    
    await this.saveAccounts(filteredAccounts);
  }

  /**
   * Export accounts to file
   */
  static async exportToFile(accounts: OTPAccount[]): Promise<string> {
    try {
      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        device: await Device.getInfo(),
        accounts: accounts.map(acc => ({
          ...acc,
          secret: undefined // Don't export secrets in plain text
        }))
      };

      const fileName = `2fa-backup-${Date.now()}.json`;
      const result = await Filesystem.writeFile({
        path: `${this.BACKUP_DIR}/${fileName}`,
        data: JSON.stringify(exportData, null, 2),
        directory: Directory.Documents,
        encoding: Encoding.UTF8
      });

      return result.uri;
    } catch (_error) {
      console.error('Failed to export accounts:', _error);
      throw new Error('Failed to export accounts');
    }
  }

  /**
   * Share accounts via native share
   */
  static async shareAccounts(accounts: OTPAccount[]): Promise<void> {
    try {
      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        accounts: accounts.map(acc => ({
          issuer: acc.issuer,
          label: acc.label,
          // Don't include secrets in shared data
        }))
      };

      await Share.share({
        title: '2FA Studio Accounts',
        text: 'My 2FA accounts list',
        dialogTitle: 'Share your accounts',
        files: [`data:application/json;base64,${btoa(JSON.stringify(exportData))}`]
      });
    } catch (_error) {
      console.error('Failed to share accounts:', _error);
    }
  }

  /**
   * Import accounts from file
   */
  static async importFromFile(fileUri: string): Promise<OTPAccount[]> {
    try {
      const contents = await Filesystem.readFile({
        path: fileUri,
        encoding: Encoding.UTF8
      });

      const importData = JSON.parse(contents.data as string);
      
      // Validate import data
      if (!importData.version || !importData.accounts) {
        throw new Error('Invalid import file format');
      }

      return importData.accounts;
    } catch (_error) {
      console.error('Failed to import accounts:', _error);
      throw new Error('Failed to import accounts from file');
    }
  }

  /**
   * Backup accounts with encryption
   */
  static async createBackup(password: string): Promise<string> {
    try {
      const accounts = await this.loadAccounts();
      const backupData = {
        version: '1.0',
        createdAt: new Date().toISOString(),
        device: await Device.getInfo(),
        accounts
      };

      // Encrypt backup with password
      const encrypted = await EncryptionService.encryptWithPassword(
        JSON.stringify(backupData),
        password
      );

      const fileName = `2fa-encrypted-backup-${Date.now()}.2fab`;
      const result = await Filesystem.writeFile({
        path: `${this.BACKUP_DIR}/${fileName}`,
        data: encrypted,
        directory: Directory.Documents,
        encoding: Encoding.UTF8
      });

      return result.uri;
    } catch (_error) {
      console.error('Failed to create backup:', _error);
      throw new Error('Failed to create encrypted backup');
    }
  }

  /**
   * Restore from encrypted backup
   */
  static async restoreBackup(fileUri: string, password: string): Promise<number> {
    try {
      const contents = await Filesystem.readFile({
        path: fileUri,
        encoding: Encoding.UTF8
      });

      const decrypted = await EncryptionService.decryptWithPassword(
        contents.data as string,
        password
      );

      const backupData = JSON.parse(decrypted);
      
      if (!backupData.version || !backupData.accounts) {
        throw new Error('Invalid backup format');
      }

      // Merge with existing accounts (avoid duplicates)
      const existingAccounts = await this.loadAccounts();
      const existingIds = new Set(existingAccounts.map(a => a.id));
      
      const newAccounts = backupData.accounts.filter(
        (acc: OTPAccount) => !existingIds.has(acc.id)
      );

      if (newAccounts.length > 0) {
        await this.saveAccounts([...existingAccounts, ...newAccounts]);
      }

      return newAccounts.length;
    } catch (_error) {
      console.error('Failed to restore backup:', _error);
      throw new Error('Failed to restore from backup');
    }
  }

  /**
   * Get account statistics
   */
  static async getStatistics(): Promise<{
    total: number;
    byIssuer: Record<string, number>;
    byType: Record<string, number>;
    favorites: number;
    withBiometric: number;
  }> {
    const accounts = await this.loadAccounts();
    
    const stats = {
      total: accounts.length,
      byIssuer: {} as Record<string, number>,
      byType: { totp: 0, hotp: 0 },
      favorites: 0,
      withBiometric: 0
    };

    accounts.forEach(account => {
      // Count by issuer
      stats.byIssuer[account.issuer] = (stats.byIssuer[account.issuer] || 0) + 1;
      
      // Count by type
      stats.byType[account.type]++;
      
      // Count favorites
      if (account.isFavorite) stats.favorites++;
      
      // Count biometric protected
      if (account.requiresBiometric) stats.withBiometric++;
    });

    return stats;
  }

  /**
   * Search accounts
   */
  static async searchAccounts(query: string): Promise<OTPAccount[]> {
    const accounts = await this.loadAccounts();
    const lowercaseQuery = query.toLowerCase();
    
    return accounts.filter(account => 
      account.issuer.toLowerCase().includes(lowercaseQuery) ||
      account.label.toLowerCase().includes(lowercaseQuery) ||
      account.tags?.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );
  }

  /**
   * Get accounts by folder
   */
  static async getAccountsByFolder(folderId: string | null): Promise<OTPAccount[]> {
    const accounts = await this.loadAccounts();
    return accounts.filter(account => account.folderId === folderId);
  }

  /**
   * Get favorite accounts
   */
  static async getFavoriteAccounts(): Promise<OTPAccount[]> {
    const accounts = await this.loadAccounts();
    return accounts.filter(account => account.isFavorite);
  }

  /**
   * Bulk operations
   */
  static async bulkDelete(accountIds: string[]): Promise<void> {
    const accounts = await this.loadAccounts();
    const remainingAccounts = accounts.filter(a => !accountIds.includes(a.id));
    
    // Remove biometric protection for deleted accounts
    await Promise.all(
      accountIds.map(id => BiometricAccountService.unprotectAccount(id))
    );
    
    await this.saveAccounts(remainingAccounts);
  }

  /**
   * Bulk update folder
   */
  static async bulkUpdateFolder(accountIds: string[], folderId: string | null): Promise<void> {
    const accounts = await this.loadAccounts();
    
    accounts.forEach(account => {
      if (accountIds.includes(account.id)) {
        account.folderId = folderId;
        account.updatedAt = new Date();
      }
    });
    
    await this.saveAccounts(accounts);
  }

  /**
   * Bulk toggle favorites
   */
  static async bulkToggleFavorites(accountIds: string[]): Promise<void> {
    const accounts = await this.loadAccounts();
    
    accounts.forEach(account => {
      if (accountIds.includes(account.id)) {
        account.isFavorite = !account.isFavorite;
        account.updatedAt = new Date();
      }
    });
    
    await this.saveAccounts(accounts);
  }
}