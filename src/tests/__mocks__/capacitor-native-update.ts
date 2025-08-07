/**
 * Mock for capacitor-native-update package
 */

export interface UpdateConfig {
  checkOnAppStart?: boolean;
  checkInterval?: number;
  updateUrl?: string;
  headers?: Record<string, string>;
}

export interface UpdateInfo {
  available: boolean;
  version?: string;
  url?: string;
  notes?: string;
  critical?: boolean;
}

export interface UpdateProgress {
  percent: number;
  bytesTransferred: number;
  totalBytes: number;
}

export class NativeUpdate {
  static async init(config: UpdateConfig): Promise<void> {
    // Mock implementation
  }

  static async checkForUpdate(): Promise<UpdateInfo | null> {
    return null; // No update available in tests
  }

  static async downloadUpdate(progressCallback?: (progress: UpdateProgress) => void): Promise<void> {
    // Mock implementation
  }

  static async installUpdate(): Promise<void> {
    // Mock implementation
  }

  static async getVersionInfo(): Promise<{ current: string; build: string }> {
    return { current: '1.0.0', build: '100' };
  }

  static async setUpdateChannel(channel: string): Promise<void> {
    // Mock implementation
  }

  static async getUpdateChannel(): Promise<string> {
    return 'stable';
  }

  static onUpdateAvailable(callback: (info: UpdateInfo) => void): void {
    // Mock implementation
  }

  static onUpdateDownloaded(callback: () => void): void {
    // Mock implementation
  }

  static onUpdateInstalled(callback: () => void): void {
    // Mock implementation
  }
}