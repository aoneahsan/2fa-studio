/**
 * Enhanced backup service integrating with GoogleDriveBackupService
 * @module services/backup
 */

import { OTPAccount } from '@services/otp.service';
import { GoogleDriveBackupService } from '@services/google-drive-backup.service';
import { FirestoreService } from '@services/firestore.service';
import { MobileEncryptionService } from '@services/mobile-encryption.service';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

export interface BackupData {
  version: string;
  createdAt: Date;
  accountsCount: number;
  encrypted: boolean;
  includesSettings: boolean;
  accounts: unknown[];
  settings?: unknown;
}

export interface BackupResult {
  success: boolean;
  accountsCount: number;
  fileSize?: number;
  error?: string;
  fileId?: string;
}

export class BackupService {
  private static BACKUP_VERSION = '1.0';

  /**
   * Create a backup of all accounts using enhanced services
   */
  static async createBackup(
    userId: string,
    includeSettings: boolean = true
  ): Promise<BackupData> {
    try {
      // Get all accounts using FirestoreService
      const result = await FirestoreService.getCollection<any>(
        `users/${userId}/accounts`
      );
      
      const accounts: unknown[] = [];
      
      for (const accountData of result.data) {
        // Decrypt the secret for backup using MobileEncryptionService
        const decryptedSecret = await MobileEncryptionService.decryptData(
          accountData.encryptedSecret,
          userId
        );
        
        accounts.push({
          id: accountData.id,
          issuer: accountData.issuer,
          label: accountData.label,
          secret: decryptedSecret,
          algorithm: accountData.algorithm,
          digits: accountData.digits,
          period: accountData.period,
          type: accountData.type,
          counter: accountData.counter,
          iconUrl: accountData.iconUrl,
          tags: accountData.tags,
          notes: accountData.notes,
          backupCodes: accountData.backupCodes,
          isFavorite: accountData.isFavorite,
          folderId: accountData.folderId,
        });
      }

      // Get settings if requested
      let settings = null;
      if (includeSettings) {
        const userResult = await FirestoreService.getDocument('users', userId);
        if (userResult.success && userResult.data) {
          const userData = userResult.data;
          settings = {
            theme: userData.theme,
            autoLock: userData.autoLock,
            biometricEnabled: userData.biometricEnabled,
            // Add other settings as needed
          };
        }
      }

      const backupData: BackupData = {
        version: this.BACKUP_VERSION,
        createdAt: new Date(),
        accountsCount: accounts.length,
        encrypted: false,
        includesSettings: includeSettings,
        accounts,
        settings,
      };

      return backupData;
    } catch (_error) {
      console.error('Error creating backup:', _error);
      throw error;
    }
  }

  /**
   * Export backup to file
   */
  static async exportBackup(
    userId: string,
    format: 'json' | 'encrypted' = 'json',
    includeSettings: boolean = true
  ): Promise<void> {
    try {
      const backupData = await this.createBackup(userId, includeSettings);
      
      let fileContent: string;
      let fileName: string;
      
      if (format === 'encrypted') {
        // Encrypt the entire backup using MobileEncryptionService
        const encryptedData = await MobileEncryptionService.encryptData(
          JSON.stringify(backupData),
          userId
        );
        fileContent = encryptedData;
        fileName = `2fa-studio-backup-encrypted-${Date.now()}.2fas`;
      } else {
        fileContent = JSON.stringify(backupData, null, 2);
        fileName = `2fa-studio-backup-${Date.now()}.json`;
      }

      if (Capacitor.isNativePlatform()) {
        // Save to device
        const result = await Filesystem.writeFile({
          path: fileName,
          data: fileContent,
          directory: Directory.Documents,
          encoding: Encoding.UTF8,
        });

        // Share the file
        await Share.share({
          title: 'Share Backup',
          text: `2FA Studio backup (${backupData.accountsCount} accounts)`,
          url: result.uri,
          dialogTitle: 'Share your backup',
        });
      } else {
        // Web download
        const blob = new Blob([fileContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (_error) {
      console.error('Error exporting backup:', _error);
      throw error;
    }
  }

  /**
   * Import backup from file content using enhanced services
   */
  static async importBackup(
    userId: string,
    fileContent: string
  ): Promise<BackupResult> {
    try {
      let backupData: BackupData;
      
      // Try to parse as encrypted backup first
      try {
        // Try to decrypt using MobileEncryptionService
        const decrypted = await MobileEncryptionService.decryptData(
          fileContent,
          userId
        );
        backupData = JSON.parse(decrypted);
      } catch {
        // If decryption fails, try as plain JSON
        try {
          backupData = JSON.parse(fileContent);
        } catch {
          throw new Error('Invalid backup format');
        }
      }

      // Validate backup version
      if (!backupData.version || !backupData.accounts) {
        throw new Error('Invalid backup format');
      }

      // Import accounts using FirestoreService
      let importedCount = 0;
      
      for (const account of backupData.accounts) {
        try {
          // Encrypt the secret before storing
          const encryptedSecret = await MobileEncryptionService.encryptData(
            account.secret,
            userId
          );
          
          await FirestoreService.addDocument(
            `users/${userId}/accounts`,
            {
              issuer: account.issuer,
              label: account.label,
              encryptedSecret,
              algorithm: account.algorithm || 'SHA1',
              digits: account.digits || 6,
              period: account.period || 30,
              type: account.type || 'totp',
              counter: account.counter,
              iconUrl: account.iconUrl,
              tags: account.tags || [],
              notes: account.notes,
              backupCodes: account.backupCodes || [],
              isFavorite: account.isFavorite || false,
              folderId: account.folderId || null,
              userId,
              createdAt: new Date(),
              updatedAt: new Date(),
            }
          );
          
          importedCount++;
        } catch (_error) {
          console.error('Error importing account:', account.label, _error);
        }
      }

      // Import settings if available
      if (backupData.includesSettings && backupData.settings) {
        // Update user settings
        // This would be implemented based on your settings structure
      }

      return {
        success: true,
        accountsCount: importedCount,
      };
    } catch (_error) {
      console.error('Error importing backup:', _error);
      return {
        success: false,
        accountsCount: 0,
        _error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Backup to Google Drive using GoogleDriveBackupService
   */
  static async backupToGoogleDrive(
    userId: string,
    encrypted: boolean = true,
    includeSettings: boolean = true
  ): Promise<BackupResult> {
    try {
      const backupData = await this.createBackup(userId, includeSettings);
      
      // Convert to OTPAccount format for GoogleDriveBackupService
      const accounts: OTPAccount[] = backupData.accounts.map(account => ({
        id: account.id,
        issuer: account.issuer,
        label: account.label,
        secret: account.secret,
        algorithm: account.algorithm,
        digits: account.digits,
        period: account.period,
        type: account.type,
        counter: account.counter,
        iconUrl: account.iconUrl,
        tags: account.tags,
        notes: account.notes,
        backupCodes: account.backupCodes,
        isFavorite: account.isFavorite,
        folderId: account.folderId,
        requiresBiometric: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      // Use GoogleDriveBackupService for the actual backup
      const result = await GoogleDriveBackupService.createBackup(accounts, {
        encrypted,
        includeSettings,
        settings: backupData.settings,
      });

      return {
        success: result.success,
        accountsCount: backupData.accountsCount,
        fileSize: result.fileId ? undefined : 0,
        fileId: result.fileId,
        _error: result._error,
      };
    } catch (_error) {
      console.error('Error backing up to Google Drive:', _error);
      return {
        success: false,
        accountsCount: 0,
        _error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Restore from Google Drive using GoogleDriveBackupService
   */
  static async restoreFromGoogleDrive(
    userId: string,
    backupId: string
  ): Promise<BackupResult> {
    try {
      // Use GoogleDriveBackupService to restore backup
      const result = await GoogleDriveBackupService.restoreBackup(backupId);
      
      if (!result.success || !result.accounts) {
        return {
          success: false,
          accountsCount: 0,
          _error: result.error || 'Failed to restore backup',
        };
      }

      // Import the restored accounts
      let importedCount = 0;
      
      for (const account of result.accounts) {
        try {
          // Encrypt the secret before storing
          const encryptedSecret = await MobileEncryptionService.encryptData(
            account.secret,
            userId
          );
          
          await FirestoreService.addDocument(
            `users/${userId}/accounts`,
            {
              issuer: account.issuer,
              label: account.label,
              encryptedSecret,
              algorithm: account.algorithm || 'SHA1',
              digits: account.digits || 6,
              period: account.period || 30,
              type: account.type || 'totp',
              counter: account.counter,
              iconUrl: account.iconUrl,
              tags: account.tags || [],
              notes: account.notes,
              backupCodes: account.backupCodes || [],
              isFavorite: account.isFavorite || false,
              folderId: account.folderId || null,
              userId,
              createdAt: new Date(),
              updatedAt: new Date(),
            }
          );
          
          importedCount++;
        } catch (_error) {
          console.error('Error importing account:', account.label, _error);
        }
      }

      return {
        success: true,
        accountsCount: importedCount,
      };
    } catch (_error) {
      console.error('Error restoring from Google Drive:', _error);
      return {
        success: false,
        accountsCount: 0,
        _error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}