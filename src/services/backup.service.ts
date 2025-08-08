/**
 * Backup Service
 * Handles Google Drive and iCloud backups for 2FA accounts
 * @module services/backup
 */

import { UnifiedErrorHandling } from 'unified-error-handling';
import { StrataStorage } from 'strata-storage';
import { FirebaseService } from './firebase.service';
import { OTPAccount } from './otp.service';
import { EncryptionService } from './encryption.service';

export interface BackupMetadata {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  deviceName: string;
  accountCount: number;
  encryptionVersion: string;
  backupVersion: string;
  provider: 'google_drive' | 'icloud';
}

export interface BackupData {
  metadata: BackupMetadata;
  accounts: OTPAccount[];
  tags?: any[];
  folders?: any[];
  settings?: any;
}

export interface EncryptedBackup {
  metadata: BackupMetadata;
  encryptedData: string;
  salt: string;
  iv: string;
}

export class BackupService {
  private static readonly BACKUP_VERSION = '1.0.0';
  private static readonly ENCRYPTION_VERSION = '1.0.0';
  private static readonly GOOGLE_DRIVE_APP_FOLDER = 'appDataFolder';
  private static readonly BACKUP_FILE_NAME = '2fa-studio-backup.json';

  /**
   * Initialize backup service
   */
  static async initialize(): Promise<void> {
    try {
      await UnifiedErrorHandling.withTryCatch(
        async () => {
          // Initialize encryption service
          await EncryptionService.initialize();
        },
        {
          operation: 'BackupService.initialize',
          metadata: { service: 'backup' }
        }
      );
    } catch (error) {
      console.error('Failed to initialize backup service:', error);
      throw error;
    }
  }

  /**
   * Create a backup of all accounts
   */
  static async createBackup(
    accounts: OTPAccount[],
    options?: {
      tags?: any[];
      folders?: any[];
      settings?: any;
    }
  ): Promise<BackupData> {
    return UnifiedErrorHandling.withTryCatch(
      async () => {
        const deviceInfo = await this.getDeviceInfo();
        
        const metadata: BackupMetadata = {
          id: this.generateBackupId(),
          name: `Backup ${new Date().toISOString()}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          deviceName: deviceInfo.name,
          accountCount: accounts.length,
          encryptionVersion: this.ENCRYPTION_VERSION,
          backupVersion: this.BACKUP_VERSION,
          provider: 'google_drive' // Will be set by specific backup method
        };

        const backupData: BackupData = {
          metadata,
          accounts,
          tags: options?.tags,
          folders: options?.folders,
          settings: options?.settings
        };

        return backupData;
      },
      {
        operation: 'BackupService.createBackup',
        metadata: { accountCount: accounts.length }
      }
    );
  }

  /**
   * Encrypt backup data
   */
  static async encryptBackup(
    backupData: BackupData,
    password: string
  ): Promise<EncryptedBackup> {
    return UnifiedErrorHandling.withTryCatch(
      async () => {
        const dataString = JSON.stringify(backupData);
        const encrypted = await EncryptionService.encryptWithPassword(
          dataString,
          password
        );

        return {
          metadata: backupData.metadata,
          encryptedData: encrypted.data,
          salt: encrypted.salt,
          iv: encrypted.iv
        };
      },
      {
        operation: 'BackupService.encryptBackup',
        metadata: { 
          accountCount: backupData.accounts.length,
          hasPassword: !!password 
        }
      }
    );
  }

  /**
   * Decrypt backup data
   */
  static async decryptBackup(
    encryptedBackup: EncryptedBackup,
    password: string
  ): Promise<BackupData> {
    return UnifiedErrorHandling.withTryCatch(
      async () => {
        const decrypted = await EncryptionService.decryptWithPassword(
          encryptedBackup.encryptedData,
          password,
          {
            salt: encryptedBackup.salt,
            iv: encryptedBackup.iv
          }
        );

        return JSON.parse(decrypted);
      },
      {
        operation: 'BackupService.decryptBackup',
        metadata: { 
          backupId: encryptedBackup.metadata.id,
          provider: encryptedBackup.metadata.provider 
        }
      }
    );
  }

  /**
   * Get device information for backup metadata
   */
  private static async getDeviceInfo(): Promise<{ name: string; id: string }> {
    try {
      const info = await (window as any).Device?.getInfo?.();
      return {
        name: info?.name || 'Unknown Device',
        id: info?.uuid || 'unknown'
      };
    } catch {
      return {
        name: 'Web Browser',
        id: 'web'
      };
    }
  }

  /**
   * Generate unique backup ID
   */
  private static generateBackupId(): string {
    return `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Backup to Google Drive
   */
  static async backupToGoogleDrive(
    accounts: OTPAccount[],
    password: string,
    options?: {
      tags?: any[];
      folders?: any[];
      settings?: any;
    }
  ): Promise<void> {
    return UnifiedErrorHandling.withTryCatch(
      async () => {
        // Create backup data
        const backupData = await this.createBackup(accounts, options);
        backupData.metadata.provider = 'google_drive';

        // Encrypt backup
        const encryptedBackup = await this.encryptBackup(backupData, password);

        // Get Google Drive access token
        const accessToken = await this.getGoogleDriveAccessToken();

        // Upload to Google Drive
        await this.uploadToGoogleDrive(encryptedBackup, accessToken);

        // Store backup metadata locally
        await this.storeBackupMetadata(backupData.metadata);
      },
      {
        operation: 'BackupService.backupToGoogleDrive',
        metadata: { accountCount: accounts.length }
      }
    );
  }

  /**
   * Restore from Google Drive
   */
  static async restoreFromGoogleDrive(
    password: string,
    backupId?: string
  ): Promise<BackupData> {
    return UnifiedErrorHandling.withTryCatch(
      async () => {
        // Get Google Drive access token
        const accessToken = await this.getGoogleDriveAccessToken();

        // List available backups
        const backups = await this.listGoogleDriveBackups(accessToken);

        if (backups.length === 0) {
          throw new Error('No backups found in Google Drive');
        }

        // Select backup to restore
        const selectedBackup = backupId 
          ? backups.find(b => b.id === backupId)
          : backups[0]; // Most recent

        if (!selectedBackup) {
          throw new Error('Backup not found');
        }

        // Download backup
        const encryptedBackup = await this.downloadFromGoogleDrive(
          selectedBackup.id,
          accessToken
        );

        // Decrypt backup
        const backupData = await this.decryptBackup(encryptedBackup, password);

        return backupData;
      },
      {
        operation: 'BackupService.restoreFromGoogleDrive',
        metadata: { backupId }
      }
    );
  }

  /**
   * Get Google Drive access token
   */
  private static async getGoogleDriveAccessToken(): Promise<string> {
    // This will be implemented using Google Sign-In
    // For now, return a placeholder
    throw new Error('Google Drive authentication not yet implemented');
  }

  /**
   * Upload backup to Google Drive
   */
  private static async uploadToGoogleDrive(
    encryptedBackup: EncryptedBackup,
    accessToken: string
  ): Promise<void> {
    const metadata = {
      name: this.BACKUP_FILE_NAME,
      mimeType: 'application/json',
      parents: [this.GOOGLE_DRIVE_APP_FOLDER],
      properties: {
        backupId: encryptedBackup.metadata.id,
        createdAt: encryptedBackup.metadata.createdAt.toISOString(),
        deviceName: encryptedBackup.metadata.deviceName
      }
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([JSON.stringify(encryptedBackup)], { type: 'application/json' }));

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      body: form
    });

    if (!response.ok) {
      throw new Error(`Failed to upload backup: ${response.statusText}`);
    }
  }

  /**
   * List Google Drive backups
   */
  private static async listGoogleDriveBackups(accessToken: string): Promise<any[]> {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?` +
      `q=name='${this.BACKUP_FILE_NAME}' and '${this.GOOGLE_DRIVE_APP_FOLDER}' in parents&` +
      `orderBy=createdTime desc&` +
      `fields=files(id,name,properties,createdTime)`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to list backups: ${response.statusText}`);
    }

    const data = await response.json();
    return data.files || [];
  }

  /**
   * Download backup from Google Drive
   */
  private static async downloadFromGoogleDrive(
    fileId: string,
    accessToken: string
  ): Promise<EncryptedBackup> {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to download backup: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Store backup metadata locally
   */
  private static async storeBackupMetadata(metadata: BackupMetadata): Promise<void> {
    const storage = StrataStorage.getInstance();
    const existingMetadata = await storage.get<BackupMetadata[]>('backup_metadata') || [];
    
    existingMetadata.push(metadata);
    
    // Keep only last 10 backup metadata entries
    if (existingMetadata.length > 10) {
      existingMetadata.splice(0, existingMetadata.length - 10);
    }
    
    await storage.set('backup_metadata', existingMetadata);
  }
}