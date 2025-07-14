import OneSignal from 'react-onesignal';
import { Capacitor } from '@capacitor/core';

interface NotificationConfig {
  appId: string;
  safariWebId?: string;
}

export class NotificationService {
  private static instance: NotificationService;
  private initialized = false;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async initialize(_config: NotificationConfig): Promise<void> {
    if (this.initialized) {
      console.warn('NotificationService already initialized');
      return;
    }

    try {
      if (Capacitor.isNativePlatform()) {
        // Native platform initialization
        await OneSignal.init(config.appId);
        
        // Request permission
        const permission = await OneSignal.Notifications.requestPermission(true);
        console.log('Push notification permission:', permission);
        
        // Set up handlers
        this.setupHandlers();
      } else {
        // Web initialization
        await OneSignal.init({
          appId: config.appId,
          safari_web_id: config.safariWebId,
          allowLocalhostAsSecureOrigin: true,
          notifyButton: {
            enable: false,
          },
        });
      }

      this.initialized = true;
      console.log('NotificationService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize NotificationService:', error);
      throw error;
    }
  }

  private setupHandlers(): void {
    // Handle notification opened
    OneSignal.Notifications.addEventListener('click', (event) => {
      console.log('Notification clicked:', event);
      this.handleNotificationClick(event.notification);
    });

    // Handle foreground notification
    OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event) => {
      console.log('Notification will display:', event);
      // You can modify the notification here
      event.preventDefault();
      event.notification.display();
    });
  }

  private handleNotificationClick(notification: unknown): void {
    const data = notification.additionalData;
    
    if (data?.type === 'security_alert') {
      // Navigate to security settings
      window.location.href = '/settings/security';
    } else if (data?.type === 'backup_reminder') {
      // Navigate to backup settings
      window.location.href = '/settings/backup';
    } else if (data?.type === 'new_feature') {
      // Navigate to what's new
      window.location.href = '/whats-new';
    }
  }

  async setExternalUserId(userId: string): Promise<void> {
    try {
      await OneSignal.login(userId);
      console.log('External user ID set:', userId);
    } catch (error) {
      console.error('Failed to set external user ID:', error);
    }
  }

  async logout(): Promise<void> {
    try {
      await OneSignal.logout();
      console.log('User logged out from OneSignal');
    } catch (error) {
      console.error('Failed to logout from OneSignal:', error);
    }
  }

  async addTag(key: string, value: string): Promise<void> {
    try {
      await OneSignal.User.addTag(key, value);
      console.log(`Tag added: ${key} = ${value}`);
    } catch (error) {
      console.error('Failed to add tag:', error);
    }
  }

  async addTags(tags: Record<string, string>): Promise<void> {
    try {
      await OneSignal.User.addTags(tags);
      console.log('Tags added:', tags);
    } catch (error) {
      console.error('Failed to add tags:', error);
    }
  }

  async removeTag(key: string): Promise<void> {
    try {
      await OneSignal.User.removeTag(key);
      console.log(`Tag removed: ${key}`);
    } catch (error) {
      console.error('Failed to remove tag:', error);
    }
  }

  async setEmail(email: string): Promise<void> {
    try {
      await OneSignal.User.addEmail(email);
      console.log('Email set:', email);
    } catch (error) {
      console.error('Failed to set email:', error);
    }
  }

  async setSMSNumber(phoneNumber: string): Promise<void> {
    try {
      await OneSignal.User.addSms(phoneNumber);
      console.log('SMS number set:', phoneNumber);
    } catch (error) {
      console.error('Failed to set SMS number:', error);
    }
  }

  // Notification types
  async sendSecurityAlert(userId: string, message: string): Promise<void> {
    // This would typically be called from your backend
    console.log('Security alert would be sent from backend:', { userId, message });
  }

  async scheduleBackupReminder(userId: string, days: number): Promise<void> {
    // This would typically be called from your backend
    console.log('Backup reminder would be scheduled from backend:', { userId, days });
  }

  async sendBackupReminder(userId: string, message: string): Promise<void> {
    // This would typically be called from your backend
    console.log('Backup reminder would be sent from backend:', { userId, message });
  }

  // Preferences
  async updateNotificationPreferences(preferences: {
    securityAlerts: boolean;
    backupReminders: boolean;
    promotions: boolean;
    updates: boolean;
  }): Promise<void> {
    try {
      const tags: Record<string, string> = {
        security_alerts: preferences.securityAlerts ? '1' : '0',
        backup_reminders: preferences.backupReminders ? '1' : '0',
        promotions: preferences.promotions ? '1' : '0',
        updates: preferences.updates ? '1' : '0',
      };
      
      await this.addTags(tags);
      console.log('Notification preferences updated:', preferences);
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
    }
  }

  async isPushNotificationEnabled(): Promise<boolean> {
    try {
      const permission = await OneSignal.Notifications.permission;
      return permission === true;
    } catch (error) {
      console.error('Failed to check push notification status:', error);
      return false;
    }
  }

  async requestPermission(): Promise<boolean> {
    try {
      const permission = await OneSignal.Notifications.requestPermission(true);
      return permission === true;
    } catch (error) {
      console.error('Failed to request permission:', error);
      return false;
    }
  }
}

export const notificationService = NotificationService.getInstance();
export { NotificationService };