/**
 * Native Update Service using capacitor-native-update v2.0.0
 * @module services/native-update
 */

import { NativeUpdate, UpdateConfig, UpdateInfo } from 'capacitor-native-update';
import { Capacitor } from '@capacitor/core';
import { StorageService } from './storage.service';
import { NotificationKitService } from './notification-kit.service';
import { UnifiedErrorService } from './unified-error.service';

export class NativeUpdateService {
  private static nativeUpdate: NativeUpdate;
  private static isInitialized = false;
  private static readonly UPDATE_CHECK_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours
  private static readonly LAST_CHECK_KEY = 'last_update_check';

  /**
   * Initialize native update service
   */
  static async initialize(): Promise<void> {
    if (!Capacitor.isNativePlatform() || this.isInitialized) return;

    try {
      const config: UpdateConfig = {
        appId: process.env.REACT_APP_BUNDLE_ID || 'com.2fastudio.app',
        updateUrl: process.env.REACT_APP_UPDATE_URL || 'https://api.2fastudio.com/updates',
        currentVersion: process.env.REACT_APP_VERSION || '1.0.0',
        
        // Update behavior
        autoDownload: true,
        mandatoryInstallMode: 'immediate',
        optionalInstallMode: 'on_next_restart',
        
        // UI Configuration
        updateDialog: {
          title: 'Update Available',
          mandatoryMessage: 'A critical update is available and must be installed.',
          optionalMessage: 'A new version is available. Would you like to update?',
          mandatoryContinueButtonLabel: 'Update Now',
          optionalContinueButtonLabel: 'Update',
          optionalIgnoreButtonLabel: 'Later',
          appendReleaseDescription: true
        },
        
        // Progress UI
        downloadProgress: {
          title: 'Downloading Update',
          message: 'Please wait while we download the update...'
        }
      };

      this.nativeUpdate = new NativeUpdate(config);
      await this.nativeUpdate.init();
      
      // Set up automatic checks
      this.setupAutomaticChecks();
      
      this.isInitialized = true;
    } catch (error) {
      await UnifiedErrorService.reportError(error as Error, {
        category: 'update',
        severity: 'low',
        metadata: { operation: 'initialize' }
      });
    }
  }

  /**
   * Check for updates
   */
  static async checkForUpdate(): Promise<UpdateInfo | null> {
    if (!Capacitor.isNativePlatform() || !this.isInitialized) {
      await this.initialize();
    }

    try {
      const updateInfo = await this.nativeUpdate.checkForUpdate();
      
      if (updateInfo.updateAvailable) {
        await StorageService.set(this.LAST_CHECK_KEY, new Date().toISOString());
        
        // Notify user if update is available
        if (!updateInfo.isMandatory) {
          await NotificationKitService.showLocalNotification(
            '🎉 Update Available',
            `Version ${updateInfo.version} is now available with new features and improvements!`,
            {
              tag: 'update-available',
              data: { version: updateInfo.version }
            }
          );
        }
      }
      
      return updateInfo;
    } catch (error) {
      await UnifiedErrorService.reportError(error as Error, {
        category: 'update',
        severity: 'low',
        metadata: { operation: 'check_for_update' }
      });
      return null;
    }
  }

  /**
   * Download update
   */
  static async downloadUpdate(): Promise<void> {
    if (!Capacitor.isNativePlatform() || !this.isInitialized) return;

    try {
      await this.nativeUpdate.downloadUpdate({
        onProgress: (progress) => {
          console.log(`Download progress: ${progress.percent}%`);
          // You can emit this progress to UI
        }
      });
    } catch (error) {
      await UnifiedErrorService.reportError(error as Error, {
        category: 'update',
        severity: 'medium',
        metadata: { operation: 'download_update' }
      });
      throw error;
    }
  }

  /**
   * Install update
   */
  static async installUpdate(): Promise<void> {
    if (!Capacitor.isNativePlatform() || !this.isInitialized) return;

    try {
      await this.nativeUpdate.installUpdate();
    } catch (error) {
      await UnifiedErrorService.reportError(error as Error, {
        category: 'update',
        severity: 'high',
        metadata: { operation: 'install_update' }
      });
      throw error;
    }
  }

  /**
   * Get current version
   */
  static async getCurrentVersion(): Promise<string> {
    if (!Capacitor.isNativePlatform()) {
      return process.env.REACT_APP_VERSION || '1.0.0';
    }

    if (!this.isInitialized) {
      await this.initialize();
    }

    return await this.nativeUpdate.getCurrentVersion();
  }

  /**
   * Get pending update info
   */
  static async getPendingUpdate(): Promise<UpdateInfo | null> {
    if (!Capacitor.isNativePlatform() || !this.isInitialized) return null;

    try {
      return await this.nativeUpdate.getPendingUpdate();
    } catch (error) {
      return null;
    }
  }

  /**
   * Setup automatic update checks
   */
  private static setupAutomaticChecks(): void {
    // Check on app resume
    if (Capacitor.isNativePlatform()) {
      import('@capacitor/app').then(({ App }) => {
        App.addListener('appStateChange', async ({ isActive }) => {
          if (isActive) {
            await this.checkForUpdateIfNeeded();
          }
        });
      });
    }

    // Periodic checks
    setInterval(async () => {
      await this.checkForUpdateIfNeeded();
    }, this.UPDATE_CHECK_INTERVAL);

    // Initial check
    this.checkForUpdateIfNeeded();
  }

  /**
   * Check for update if enough time has passed
   */
  private static async checkForUpdateIfNeeded(): Promise<void> {
    const lastCheck = await StorageService.get<string>(this.LAST_CHECK_KEY);
    
    if (!lastCheck) {
      await this.checkForUpdate();
      return;
    }

    const lastCheckTime = new Date(lastCheck).getTime();
    const now = new Date().getTime();
    
    if (now - lastCheckTime >= this.UPDATE_CHECK_INTERVAL) {
      await this.checkForUpdate();
    }
  }

  /**
   * Reset update state (for testing)
   */
  static async resetUpdateState(): Promise<void> {
    if (!Capacitor.isNativePlatform() || !this.isInitialized) return;
    
    await this.nativeUpdate.resetUpdateState();
    await StorageService.remove(this.LAST_CHECK_KEY);
  }
}