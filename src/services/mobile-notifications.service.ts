/**
 * Enhanced mobile push notification service
 * @module services/mobile-notifications
 */

import { PushNotifications, PushNotificationSchema, Token } from '@capacitor/push-notifications';
import { LocalNotifications, ScheduleOptions } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';
import { Preferences } from '@capacitor/preferences';

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
  categories: {
    [key: string]: boolean;
  };
}

export interface ScheduledNotification {
  id: number;
  type: string;
  title: string;
  body: string;
  data: any;
  scheduledAt: Date;
}

export class MobileNotificationsService {
  private static readonly SETTINGS_KEY = 'notification_settings';
  private static readonly FCM_TOKEN_KEY = 'fcm_token';
  private static readonly APNS_TOKEN_KEY = 'apns_token';
  
  /**
   * Initialize push notifications
   */
  static async initialize(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      console.log('Push notifications not available on web platform');
      return false;
    }

    try {
      // Request permissions
      const result = await PushNotifications.requestPermissions();
      
      if (result.receive !== 'granted') {
        console.log('Push notification permission denied');
        return false;
      }

      // Register for push notifications
      await PushNotifications.register();

      // Set up listeners
      this.setupPushListeners();
      
      // Initialize local notifications
      await this.initializeLocalNotifications();

      console.log('Push notifications initialized successfully');
      return true;
    } catch (_error) {
      console.error('Failed to initialize push notifications:', error);
      return false;
    }
  }

  /**
   * Setup push notification listeners
   */
  private static setupPushListeners(): void {
    // Token registration
    PushNotifications.addListener('registration', async (token: Token) => {
      console.log('Push registration success, token:', token.value);
      
      const deviceInfo = await Device.getInfo();
      const platform = deviceInfo.platform;
      
      // Store token based on platform
      if (platform === 'ios') {
        await Preferences.set({ key: this.APNS_TOKEN_KEY, value: token.value });
      } else if (platform === 'android') {
        await Preferences.set({ key: this.FCM_TOKEN_KEY, value: token.value });
      }
      
      // Send token to server
      await this.sendTokenToServer(token.value, platform);
    });

    // Registration error
    PushNotifications.addListener('registrationError', (_error: unknown) => {
      console.error('Error on _registration:', error);
    });

    // Notification received (app in foreground)
    PushNotifications.addListener('pushNotificationReceived', 
      (notification: PushNotificationSchema) => {
        console.log('Push received:', notification);
        this.handleForegroundNotification(notification);
      }
    );

    // Notification tapped (app in background/closed)
    PushNotifications.addListener('pushNotificationActionPerformed', 
      (notification: unknown) => {
        console.log('Push action performed:', notification);
        this.handleNotificationTap(notification.notification);
      }
    );
  }

  /**
   * Initialize local notifications
   */
  private static async initializeLocalNotifications(): Promise<void> {
    try {
      const result = await LocalNotifications.requestPermissions();
      
      if (result.display !== 'granted') {
        console.log('Local notification permission denied');
        return;
      }

      // Set up local notification listeners
      LocalNotifications.addListener('localNotificationReceived', 
        (notification) => {
          console.log('Local notification received:', notification);
        }
      );

      LocalNotifications.addListener('localNotificationActionPerformed', 
        (notification) => {
          console.log('Local notification action performed:', notification);
          this.handleLocalNotificationTap(notification.notification);
        }
      );

      console.log('Local notifications initialized');
    } catch (_error) {
      console.error('Failed to initialize local notifications:', error);
    }
  }

  /**
   * Handle foreground push notification
   */
  private static handleForegroundNotification(notification: PushNotificationSchema): void {
    const settings = this.getSettings();
    
    // Check if notifications are enabled
    if (!settings.enabled) return;
    
    // Check quiet hours
    if (this.isQuietHours(settings)) return;

    // Show local notification for foreground push
    LocalNotifications.schedule({
      notifications: [{
        title: notification.title || 'New Notification',
        body: notification.body || '',
        id: Date.now(),
        data: notification.data,
        actionTypeId: 'tap',
        actions: [
          {
            id: 'tap',
            title: 'Open'
          }
        ]
      }]
    });
  }

  /**
   * Handle notification tap
   */
  private static handleNotificationTap(notification: unknown): void {
    const data = notification.data || {};
    
    switch (data.type) {
      case 'security_alert':
        this.navigateTo('/settings/security');
        break;
      case 'backup_reminder':
        this.navigateTo('/settings/backup');
        break;
      case 'code_expiring':
        this.navigateTo('/accounts/' + data.accountId);
        break;
      case 'weak_secret':
        this.navigateTo('/accounts/' + data.accountId + '/edit');
        break;
      case 'device_login':
        this.navigateTo('/devices');
        break;
      default:
        this.navigateTo('/accounts');
    }
  }

  /**
   * Handle local notification tap
   */
  private static handleLocalNotificationTap(notification: unknown): void {
    const data = notification.extra || {};
    
    switch (data.type) {
      case 'backup_reminder':
        this.navigateTo('/settings/backup');
        break;
      case 'security_check':
        this.navigateTo('/settings/security');
        break;
      case 'code_refresh':
        this.navigateTo('/accounts');
        break;
      default:
        this.navigateTo('/accounts');
    }
  }

  /**
   * Get notification settings
   */
  static async getSettings(): Promise<NotificationSettings> {
    try {
      const { value } = await Preferences.get({ key: this.SETTINGS_KEY });
      if (value) {
        return JSON.parse(value);
      }
    } catch (_error) {
      console.error('Failed to get notification settings:', error);
    }

    // Default settings
    return {
      enabled: true,
      securityAlerts: true,
      backupReminders: true,
      codeExpiration: true,
      weakSecrets: true,
      deviceLogin: true,
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00'
      },
      categories: {
        security: true,
        backup: true,
        accounts: true,
        general: true
      }
    };
  }

  /**
   * Update notification settings
   */
  static async updateSettings(settings: NotificationSettings): Promise<void> {
    await Preferences.set({
      key: this.SETTINGS_KEY,
      value: JSON.stringify(settings)
    });
  }

  /**
   * Schedule local notification
   */
  static async scheduleNotification(options: {
    id: number;
    title: string;
    body: string;
    data?: unknown;
    scheduledAt: Date;
    repeats?: boolean;
  }): Promise<void> {
    const settings = await this.getSettings();
    if (!settings.enabled) return;

    const notification: ScheduleOptions = {
      notifications: [{
        title: options.title,
        body: options.body,
        id: options.id,
        schedule: { at: options.scheduledAt },
        data: options.data,
        actionTypeId: 'tap',
        actions: [
          {
            id: 'tap',
            title: 'Open'
          }
        ]
      }]
    };

    await LocalNotifications.schedule(notification);
  }

  /**
   * Schedule backup reminder
   */
  static async scheduleBackupReminder(days: number = 7): Promise<void> {
    const settings = await this.getSettings();
    if (!settings.enabled || !settings.backupReminders) return;

    const scheduleDate = new Date();
    scheduleDate.setDate(scheduleDate.getDate() + days);

    await this.scheduleNotification({
      id: 1001,
      title: 'Backup Reminder',
      body: 'It\'s time to back up your 2FA accounts for security.',
      data: { type: 'backup_reminder' },
      scheduledAt: scheduleDate
    });
  }

  /**
   * Schedule security check reminder
   */
  static async scheduleSecurityCheck(days: number = 30): Promise<void> {
    const settings = await this.getSettings();
    if (!settings.enabled || !settings.securityAlerts) return;

    const scheduleDate = new Date();
    scheduleDate.setDate(scheduleDate.getDate() + days);

    await this.scheduleNotification({
      id: 1002,
      title: 'Security Check',
      body: 'Review your security settings and check for weak secrets.',
      data: { type: 'security_check' },
      scheduledAt: scheduleDate
    });
  }

  /**
   * Cancel notification
   */
  static async cancelNotification(id: number): Promise<void> {
    await LocalNotifications.cancel({ notifications: [{ id }] });
  }

  /**
   * Cancel all notifications
   */
  static async cancelAllNotifications(): Promise<void> {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ 
        notifications: pending.notifications.map(n => ({ id: n.id }))
      });
    }
  }

  /**
   * Get pending notifications
   */
  static async getPendingNotifications(): Promise<ScheduledNotification[]> {
    const pending = await LocalNotifications.getPending();
    
    return pending.notifications.map(notification => ({
      id: notification.id,
      type: notification.extra?.type || 'unknown',
      title: notification.title,
      body: notification.body,
      data: notification.extra,
      scheduledAt: new Date(notification.schedule?.at || Date.now())
    }));
  }

  /**
   * Send push notification token to server
   */
  private static async sendTokenToServer(token: string, platform: string): Promise<void> {
    try {
      // Here you would send the token to your backend server
      // For now, we'll just log it
      console.log('Sending token to server:', { token, platform });
      
      // Example API call:
      // const response = await fetch('/api/push-tokens', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ token, platform, userId: getCurrentUserId() })
      // });
    } catch (_error) {
      console.error('Failed to send token to server:', error);
    }
  }

  /**
   * Check if current time is in quiet hours
   */
  private static isQuietHours(settings: NotificationSettings): boolean {
    if (!settings.quietHours.enabled) return false;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = settings.quietHours.start.split(':').map(Number);
    const [endHour, endMin] = settings.quietHours.end.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    } else {
      return currentTime >= startTime && currentTime <= endTime;
    }
  }

  /**
   * Navigate to specific route
   */
  private static navigateTo(path: string): void {
    // Use your app's navigation system
    window.location.hash = path;
  }
}