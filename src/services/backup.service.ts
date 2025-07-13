/**
 * Backup service for managing account backups
 * @module services/backup
 */

import { 
  collection, 
  getDocs, 
  doc, 
  getDoc,
  serverTimestamp,
  addDoc,
} from 'firebase/firestore';
import { db } from '@src/config/firebase';
import { OTPAccount } from '@services/otp.service';
import { EncryptionService } from '@services/encryption.service';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

export interface BackupData {
  version: string;
  createdAt: Date;
  accountsCount: number;
  encrypted: boolean;
  includesSettings: boolean;
  accounts: any[];
  settings?: any;
}

export interface BackupResult {
  success: boolean;
  accountsCount: number;
  fileSize?: number;
  error?: string;
}

export class BackupService {
  private static BACKUP_VERSION = '1.0';

  /**
   * Create a backup of all accounts
   */
  static async createBackup(
    userId: string,
    encryptionKey: string,
    includeSettings: boolean = true
  ): Promise<BackupData> {
    try {
      // Get all accounts
      const accountsRef = collection(db, `users/${userId}/accounts`);
      const accountsSnapshot = await getDocs(accountsRef);
      
      const accounts: any[] = [];
      
      for (const doc of accountsSnapshot.docs) {
        const accountData = doc.data();
        // Decrypt the secret for backup
        const decryptedSecret = await EncryptionService.decrypt({
          encryptedData: accountData.encryptedSecret,
          password: encryptionKey,
        });
        
        accounts.push({
          id: doc.id,
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
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
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
    } catch (error) {
      console.error('Error creating backup:', error);
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
      const encryptionKey = localStorage.getItem('encryptionKey') || '';
      const backupData = await this.createBackup(userId, encryptionKey, includeSettings);
      
      let fileContent: string;
      let fileName: string;
      
      if (format === 'encrypted') {
        // Encrypt the entire backup
        const encrypted = await EncryptionService.encrypt({
          data: JSON.stringify(backupData),
          password: encryptionKey,
        });
        fileContent = JSON.stringify(encrypted);
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
    } catch (error) {
      console.error('Error exporting backup:', error);
      throw error;
    }
  }

  /**
   * Import backup from file content
   */
  static async importBackup(
    userId: string,
    fileContent: string,
    encryptionKey: string
  ): Promise<BackupResult> {
    try {
      let backupData: BackupData;
      
      // Try to parse as encrypted backup first
      try {
        const encrypted = JSON.parse(fileContent);
        if (encrypted.salt && encrypted.iv && encrypted.encryptedData) {
          const decrypted = await EncryptionService.decrypt({
            encryptedData: fileContent,
            password: encryptionKey,
          });
          backupData = JSON.parse(decrypted);
        } else {
          backupData = encrypted;
        }
      } catch {
        // If not JSON, try as plain backup
        backupData = JSON.parse(fileContent);
      }

      // Validate backup version
      if (!backupData.version || !backupData.accounts) {
        throw new Error('Invalid backup format');
      }

      // Import accounts
      const accountsRef = collection(db, `users/${userId}/accounts`);
      let importedCount = 0;
      
      for (const account of backupData.accounts) {
        try {
          // Encrypt the secret before storing
          const encryptedSecret = await EncryptionService.encrypt({
            data: account.secret,
            password: encryptionKey,
          });
          
          await addDoc(accountsRef, {
            issuer: account.issuer,
            label: account.label,
            encryptedSecret: JSON.stringify(encryptedSecret),
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
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          
          importedCount++;
        } catch (error) {
          console.error('Error importing account:', account.label, error);
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
    } catch (error) {
      console.error('Error importing backup:', error);
      return {
        success: false,
        accountsCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Backup to Google Drive
   */
  static async backupToGoogleDrive(
    userId: string,
    encrypted: boolean = true,
    includeSettings: boolean = true
  ): Promise<BackupResult> {
    try {
      const encryptionKey = localStorage.getItem('encryptionKey') || '';
      const backupData = await this.createBackup(userId, encryptionKey, includeSettings);
      
      let fileContent: string;
      let fileName: string;
      
      if (encrypted) {
        const encryptedData = await EncryptionService.encrypt({
          data: JSON.stringify(backupData),
          password: encryptionKey,
        });
        fileContent = JSON.stringify(encryptedData);
        fileName = `2fa-studio-backup-${Date.now()}.2fas`;
      } else {
        fileContent = JSON.stringify(backupData, null, 2);
        fileName = `2fa-studio-backup-${Date.now()}.json`;
      }

      // TODO: Implement actual Google Drive upload
      // For now, we'll simulate the upload
      console.log('Would upload to Google Drive:', {
        fileName,
        size: new Blob([fileContent]).size,
        accountsCount: backupData.accountsCount,
      });

      // Simulate successful upload
      return {
        success: true,
        accountsCount: backupData.accountsCount,
        fileSize: new Blob([fileContent]).size,
      };
    } catch (error) {
      console.error('Error backing up to Google Drive:', error);
      return {
        success: false,
        accountsCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Restore from Google Drive
   */
  static async restoreFromGoogleDrive(
    userId: string,
    backupId: string,
    encryptionKey: string
  ): Promise<BackupResult> {
    try {
      // TODO: Implement actual Google Drive download
      // For now, we'll return a simulated result
      console.log('Would restore from Google Drive:', { backupId });

      return {
        success: true,
        accountsCount: 0,
        error: 'Google Drive restore not yet implemented',
      };
    } catch (error) {
      console.error('Error restoring from Google Drive:', error);
      return {
        success: false,
        accountsCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}