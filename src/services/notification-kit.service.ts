/**
 * Notification Service using notification-kit v2.0.3
 * @module services/notification-kit
 */

import { NotificationKit, NotificationConfig, NotificationPermission } from 'notification-kit';
import { Capacitor } from '@capacitor/core';
import { StorageService } from './storage.service';
import { UnifiedErrorService } from './unified-error.service';

export interface NotificationSettings {
  enabled: boolean;
  securityAlerts: boolean;
  backupReminders: boolean;
  codeExpiration: boolean;
  weakSecrets: boolean;
  deviceLogin: boolean;
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM
    end: string; // HH:MM
  };
}

export class NotificationKitService {
  private static notificationKit: NotificationKit;
  private static isInitialized = false;
  private static readonly SETTINGS_KEY = 'notification_settings';

  /**
   * Initialize notification service
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const config: NotificationConfig = {
        appName: '2FA Studio',
        appIcon: '/icons/icon-192x192.png',
        
        // Platform configurations
        platforms: {
          web: {
            serviceWorker: '/sw.js',
            vapidKey: process.env.REACT_APP_VAPID_KEY
          },
          ios: {
            requestPermissionOnInit: false,
            presentationOptions: ['alert', 'badge', 'sound']
          },
          android: {
            icon: 'ic_notification',
            color: '#3B82F6',
            channelId: 'tfa-studio-default',
            channelName: '2FA Studio Notifications'
          }
        },
        
        // Firebase configuration
        firebase: {
          projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
          apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
          messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID
        },
        
        // Event handlers
        onNotificationReceived: async (notification) => {
          console.log('Notification received:', notification);
          // Handle notification
        },
        
        onNotificationClicked: async (notification) => {
          console.log('Notification clicked:', notification);
          // Handle click
        },
        
        onTokenRefresh: async (token) => {
          console.log('Token refreshed:', token);
          await StorageService.set('fcm_token', token, { secure: true });
        }
      };

      this.notificationKit = new NotificationKit(config);
      await this.notificationKit.init();
      this.isInitialized = true;
    } catch (error) {
      await UnifiedErrorService.reportError(error as Error, {
        category: 'notification',
        severity: 'medium',
        metadata: { operation: 'initialize' }
      });
    }
  }

  /**
   * Request notification permission
   */
  static async requestPermission(): Promise<NotificationPermission> {
    if (!this.isInitialized) await this.initialize();
    return await this.notificationKit.requestPermission();
  }

  /**
   * Get current permission status
   */
  static async getPermissionStatus(): Promise<NotificationPermission> {
    if (!this.isInitialized) await this.initialize();
    return await this.notificationKit.getPermissionStatus();
  }

  /**
   * Show local notification
   */
  static async showLocalNotification(
    title: string,
    body: string,
    options?: {
      tag?: string;
      data?: any;
      actions?: Array<{ action: string; title: string; icon?: string }>;
      silent?: boolean;
    }
  ): Promise<void> {
    if (!this.isInitialized) await this.initialize();
    
    const settings = await this.getSettings();
    if (!settings.enabled) return;
    
    // Check quiet hours
    if (settings.quietHours.enabled && this.isInQuietHours(settings.quietHours)) {
      return;
    }

    await this.notificationKit.showLocal({
      title,
      body,
      ...options
    });
  }

  /**
   * Schedule notification
   */
  static async scheduleNotification(
    title: string,
    body: string,
    scheduledAt: Date,
    options?: any
  ): Promise<string> {
    if (!this.isInitialized) await this.initialize();
    
    return await this.notificationKit.schedule({
      title,
      body,
      trigger: { at: scheduledAt },
      ...options
    });
  }

  /**
   * Cancel scheduled notification
   */
  static async cancelScheduledNotification(id: string): Promise<void> {
    if (!this.isInitialized) await this.initialize();
    await this.notificationKit.cancel(id);
  }

  /**
   * Send security alert
   */
  static async sendSecurityAlert(
    type: 'new_device' | 'failed_login' | 'password_changed' | 'biometric_changed',
    details: any
  ): Promise<void> {
    const settings = await this.getSettings();
    if (!settings.enabled || !settings.securityAlerts) return;

    const notifications = {
      new_device: {
        title: '🔐 New Device Login',
        body: `A new device has accessed your account: ${details.deviceName}`
      },
      failed_login: {
        title: '⚠️ Failed Login Attempt',
        body: `Multiple failed login attempts detected from ${details.location || 'unknown location'}`
      },
      password_changed: {
        title: '🔑 Password Changed',
        body: 'Your password has been successfully changed'
      },
      biometric_changed: {
        title: '👆 Biometric Settings Updated',
        body: 'Biometric authentication settings have been modified'
      }
    };

    const notification = notifications[type];
    if (notification) {
      await this.showLocalNotification(
        notification.title,
        notification.body,
        {
          tag: `security-${type}`,
          data: { type, ...details }
        }
      );
    }
  }

  /**
   * Send backup reminder
   */
  static async sendBackupReminder(daysSinceLastBackup: number): Promise<void> {
    const settings = await this.getSettings();
    if (!settings.enabled || !settings.backupReminders) return;

    await this.showLocalNotification(
      '💾 Backup Reminder',
      `It's been ${daysSinceLastBackup} days since your last backup. Keep your accounts safe!`,
      {
        tag: 'backup-reminder',
        actions: [
          { action: 'backup', title: 'Backup Now' },
          { action: 'later', title: 'Remind Later' }
        ]
      }
    );
  }

  /**
   * Get notification settings
   */
  static async getSettings(): Promise<NotificationSettings> {
    const settings = await StorageService.get<NotificationSettings>(this.SETTINGS_KEY);
    
    return settings || {
      enabled: true,
      securityAlerts: true,
      backupReminders: true,
      codeExpiration: false,
      weakSecrets: true,
      deviceLogin: true,
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00'
      }
    };
  }

  /**
   * Update notification settings
   */
  static async updateSettings(settings: NotificationSettings): Promise<void> {
    await StorageService.set(this.SETTINGS_KEY, settings);
  }

  /**
   * Check if current time is in quiet hours
   */
  private static isInQuietHours(quietHours: { start: string; end: string }): boolean {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = quietHours.start.split(':').map(Number);
    const [endHour, endMin] = quietHours.end.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;
    
    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime < endTime;
    } else {
      // Quiet hours span midnight
      return currentTime >= startTime || currentTime < endTime;
    }
  }

  /**
   * Get FCM token
   */
  static async getFCMToken(): Promise<string | null> {
    if (!this.isInitialized) await this.initialize();
    return await this.notificationKit.getToken();
  }

  /**
   * Clear all notifications
   */
  static async clearAllNotifications(): Promise<void> {
    if (!this.isInitialized) await this.initialize();
    await this.notificationKit.clearAll();
  }
}