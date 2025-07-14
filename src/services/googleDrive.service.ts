/**
 * Google Drive Service
 * @module services/googleDrive
 */

import { EncryptionService } from '@services/encryption.service';

interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  modifiedTime: string;
  size: string;
}

interface BackupMetadata {
  version: string;
  createdAt: string;
  accountCount: number;
  encrypted: boolean;
  appVersion: string;
}

export class GoogleDriveService {
  private static CLIENT_ID = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID;
  private static API_KEY = (import.meta as any).env.VITE_GOOGLE_API_KEY;
  private static DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
  private static SCOPES = 'https://www.googleapis.com/auth/drive.appdata';
  
  private static tokenClient: unknown = null;
  private static gapiInited = false;
  private static gisInited = false;
  private static accessToken: string | null = null;

  /**
   * Initialize Google API
   */
  static async initialize(): Promise<void> {
    // Load GAPI
    await this.loadGAPI();
    
    // Load GIS (Google Identity Services)
    await this.loadGIS();
  }

  /**
   * Load Google API client library
   */
  private static async loadGAPI(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = async () => {
        // @ts-ignore
        gapi.load('client', async () => {
          try {
            // @ts-ignore
            await gapi.client.init({
              apiKey: this.API_KEY,
              discoveryDocs: [this.DISCOVERY_DOC],
            });
            this.gapiInited = true;
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      };
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }

  /**
   * Load Google Identity Services
   */
  private static async loadGIS(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = () => {
        // @ts-ignore
        this.tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: this.CLIENT_ID,
          scope: this.SCOPES,
          callback: (response: unknown) => {
            this.accessToken = response.access_token;
          },
        });
        this.gisInited = true;
        resolve();
      };
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }

  /**
   * Authenticate user
   */
  static async authenticate(): Promise<boolean> {
    if (!this.gapiInited || !this.gisInited) {
      await this.initialize();
    }

    return new Promise((resolve) => {
      this.tokenClient.callback = async (response: unknown) => {
        if (response.error !== undefined) {
          resolve(false);
          return;
        }
        this.accessToken = response.access_token;
        resolve(true);
      };

      if (!this.accessToken) {
        this.tokenClient.requestAccessToken({ prompt: 'consent' });
      } else {
        // @ts-ignore
        gapi.client.setToken({ access_token: this.accessToken });
        resolve(true);
      }
    });
  }

  /**
   * Check if authenticated
   */
  static isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  /**
   * Disconnect from Google Drive
   */
  static disconnect(): void {
    if (this.accessToken) {
      // @ts-ignore
      google.accounts.oauth2.revoke(this.accessToken, () => {
        this.accessToken = null;
      });
    }
  }

  /**
   * Create backup in Google Drive
   */
  static async createBackup(data: any, encryptionPassword?: string): Promise<string> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with Google Drive');
    }

    try {
      // Prepare backup data
      const backupData = {
        version: '1.0',
        createdAt: new Date().toISOString(),
        data: data,
      };

      // Encrypt if password provided
      let content: string;
      let encrypted = false;
      
      if (encryptionPassword) {
        const encryptedData = await EncryptionService.encrypt({
          data: JSON.stringify(backupData),
          password: encryptionPassword,
        });
        content = JSON.stringify(encryptedData);
        encrypted = true;
      } else {
        content = JSON.stringify(backupData);
      }

      // Create metadata
      const metadata: BackupMetadata = {
        version: '1.0',
        createdAt: new Date().toISOString(),
        accountCount: data.accounts?.length || 0,
        encrypted,
        appVersion: '1.0.0',
      };

      // Create file in app data folder
      const boundary = '-------314159265358979323846';
      const delimiter = '\r\n--' + boundary + '\r\n';
      const close_delim = '\r\n--' + boundary + '--';

      const fileMetadata = {
        name: `2fa-studio-backup-${Date.now()}.json`,
        mimeType: 'application/json',
        parents: ['appDataFolder'],
        properties: metadata as unknown,
      };

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(fileMetadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        content +
        close_delim;

      // @ts-ignore
      const response = await gapi.client.request({
        path: '/upload/drive/v3/files',
        method: 'POST',
        params: { uploadType: 'multipart' },
        headers: {
          'Content-Type': 'multipart/related; boundary="' + boundary + '"',
        },
        body: multipartRequestBody,
      });

      return (response as any).result.id;
    } catch (error) {
      console.error('Failed to create backup:', error);
      throw error;
    }
  }

  /**
   * List backups from Google Drive
   */
  static async listBackups(): Promise<GoogleDriveFile[]> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with Google Drive');
    }

    try {
      // @ts-ignore
      const response = await gapi.client.drive.files.list({
        spaces: 'appDataFolder',
        fields: 'files(id, name, mimeType, createdTime, modifiedTime, size, properties)',
        pageSize: 100,
        orderBy: 'createdTime desc',
      });

      const files = response.result.files || [];
      // Map and filter to ensure all required properties exist
      return files
        .filter((file: unknown) => file.id && file.name)
        .map((file: unknown) => ({
          id: file.id,
          name: file.name,
          mimeType: file.mimeType || 'application/json',
          createdTime: file.createdTime || new Date().toISOString(),
          modifiedTime: file.modifiedTime || new Date().toISOString(),
          size: file.size || '0'
        }));
    } catch (error) {
      console.error('Failed to list backups:', error);
      throw error;
    }
  }

  /**
   * Get backup from Google Drive
   */
  static async getBackup(fileId: string, encryptionPassword?: string): Promise<any> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with Google Drive');
    }

    try {
      // @ts-ignore
      const response = await gapi.client.drive.files.get({
        fileId: fileId,
        alt: 'media',
      });

      let data: any = response.result;
      
      // Check if data is encrypted
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch (_e) {
          // Data might be already parsed
        }
      }

      // Decrypt if needed
      if (data && typeof data === 'object' && data.salt && data.iterations && encryptionPassword) {
        const decryptedJson = await EncryptionService.decrypt({
          encryptedData: data,
          password: encryptionPassword,
        });
        data = JSON.parse(decryptedJson);
      }

      return data;
    } catch (error) {
      console.error('Failed to get backup:', error);
      throw error;
    }
  }

  /**
   * Delete backup from Google Drive
   */
  static async deleteBackup(fileId: string): Promise<void> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with Google Drive');
    }

    try {
      // @ts-ignore
      await gapi.client.drive.files.delete({
        fileId: fileId,
      });
    } catch (error) {
      console.error('Failed to delete backup:', error);
      throw error;
    }
  }

  /**
   * Get storage quota
   */
  static async getStorageQuota(): Promise<{ used: number; limit: number }> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with Google Drive');
    }

    try {
      // @ts-ignore
      const response = await gapi.client.drive.about.get({
        fields: 'storageQuota',
      });

      const quota = (response as any).result.storageQuota;
      return {
        used: parseInt(quota?.usage || '0'),
        limit: parseInt(quota?.limit || '0'),
      };
    } catch (error) {
      console.error('Failed to get storage quota:', error);
      throw error;
    }
  }

  /**
   * Sync backup with Google Drive
   */
  static async syncBackup(data: any, encryptionPassword?: string): Promise<void> {
    try {
      // Get latest backup
      const backups = await this.listBackups();
      
      if (backups.length > 0) {
        // Compare with latest backup
        const latestBackup = await this.getBackup(backups[0].id, encryptionPassword);
        
        // Check if data has changed
        if (JSON.stringify(latestBackup.data) === JSON.stringify(data)) {
          console.log('No changes to sync');
          return;
        }
      }

      // Create new backup
      await this.createBackup(data, encryptionPassword);

      // Clean up old backups (keep last 10)
      if (backups.length >= 10) {
        const oldBackups = backups.slice(10);
        for (const backup of oldBackups) {
          await this.deleteBackup(backup.id);
        }
      }
    } catch (error) {
      console.error('Failed to sync backup:', error);
      throw error;
    }
  }
}