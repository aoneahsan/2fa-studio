/**
 * Push Notification Service
 * Handles push notifications across web, Android, and iOS platforms
 */

import OneSignal from 'onesignal-cordova-plugin';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

export enum NotificationType {
  SECURITY_ALERT = 'security_alert',
  BACKUP_REMINDER = 'backup_reminder',
  SUBSCRIPTION_UPDATE = 'subscription_update',
  NEW_DEVICE = 'new_device',
  SYNC_COMPLETE = 'sync_complete',
  ACCOUNT_EXPIRY = 'account_expiry',
  SYSTEM_UPDATE = 'system_update',
  PROMOTIONAL = 'promotional'
}

export interface NotificationPayload {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  image?: string;
  actionButtons?: Array<{
    id: string;
    text: string;
    icon?: string;
  }>;
  sound?: string;
  badge?: number;
  priority?: 'low' | 'default' | 'high' | 'max';
  ttl?: number; // Time to live in seconds
}

export interface NotificationPreferences {
  enabled: boolean;
  securityAlerts: boolean;
  backupReminders: boolean;
  subscriptionUpdates: boolean;
  newDeviceAlerts: boolean;
  syncNotifications: boolean;
  promotionalOffers: boolean;
  quietHours: {
    enabled: boolean;
    startTime: string; // HH:mm format
    endTime: string;
  };
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

export class PushNotificationService {
  private static instance: PushNotificationService;
  private static isInitialized = false;
  private static userId: string | null = null;
  private static pushToken: string | null = null;
  private static playerId: string | null = null;
  private static preferences: NotificationPreferences | null = null;

  private constructor() {}

  public static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  /**
   * Initialize push notifications
   */
  public async initialize(userId: string): Promise<void> {
    if (PushNotificationService.isInitialized) return;

    try {
      PushNotificationService.userId = userId;
      
      // Load user preferences
      await this.loadPreferences();

      if (Capacitor.isNativePlatform()) {
        await this.initializeNative();
      } else {
        await this.initializeWeb();
      }

      PushNotificationService.isInitialized = true;
      console.log('Push notifications initialized');
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
      throw error;
    }
  }

  /**
   * Initialize native push notifications
   */
  private async initializeNative(): Promise<void> {
    try {
      // Request permission
      let permStatus = await PushNotifications.checkPermissions();
      
      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        throw new Error('Push notification permission denied');
      }

      // Register with the push notification service
      await PushNotifications.register();

      // Initialize OneSignal
      const oneSignalAppId = import.meta.env.VITE_ONESIGNAL_APP_ID;
      
      if (oneSignalAppId && oneSignalAppId !== 'your_onesignal_app_id_here') {
        OneSignal.setAppId(oneSignalAppId);
        
        // Set external user ID
        OneSignal.setExternalUserId(PushNotificationService.userId!);
        
        // Get player ID
        OneSignal.getDeviceState((state) => {
          if (state) {
            PushNotificationService.playerId = state.userId;
            PushNotificationService.pushToken = state.pushToken;
            this.saveTokenToDatabase();
          }
        });

        // Handle notification received
        OneSignal.setNotificationWillShowInForegroundHandler((event) => {
          this.handleNotificationReceived(event.getNotification());
        });

        // Handle notification opened
        OneSignal.setNotificationOpenedHandler((event) => {
          this.handleNotificationOpened(event.notification);
        });
      }

      // Native push notification listeners
      PushNotifications.addListener('registration', (token) => {
        PushNotificationService.pushToken = token.value;
        this.saveTokenToDatabase();
      });

      PushNotifications.addListener('registrationError', (error) => {
        console.error('Push registration error:', error);
      });

      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        this.handleNotificationReceived(notification);
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        this.handleNotificationOpened(action.notification);
      });
    } catch (error) {
      console.error('Native push initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize web push notifications
   */
  private async initializeWeb(): Promise<void> {
    try {
      // Check if browser supports notifications
      if (!('Notification' in window)) {
        throw new Error('This browser does not support notifications');
      }

      // Request permission
      let permission = Notification.permission;
      
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }

      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }

      // Check for service worker
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        
        // Subscribe to push notifications
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(
            import.meta.env.VITE_VAPID_PUBLIC_KEY || ''
          )
        });

        // Save subscription to database
        await this.saveWebPushSubscription(subscription);
      }

      // Initialize OneSignal for web
      const oneSignalAppId = import.meta.env.VITE_ONESIGNAL_APP_ID;
      
      if (oneSignalAppId && typeof window !== 'undefined' && (window as any).OneSignal) {
        const OneSignalWeb = (window as any).OneSignal;
        
        await OneSignalWeb.init({
          appId: oneSignalAppId,
          safari_web_id: import.meta.env.VITE_ONESIGNAL_SAFARI_WEB_ID,
          notifyButton: {
            enable: false
          },
          allowLocalhostAsSecureOrigin: true
        });

        // Set external user ID
        OneSignalWeb.setExternalUserId(PushNotificationService.userId);
        
        // Get player ID
        const playerId = await OneSignalWeb.getUserId();
        if (playerId) {
          PushNotificationService.playerId = playerId;
          this.saveTokenToDatabase();
        }
      }
    } catch (error) {
      console.error('Web push initialization failed:', error);
      throw error;
    }
  }

  /**
   * Send local notification
   */
  public async sendLocalNotification(payload: NotificationPayload): Promise<void> {
    try {
      // Check if notifications are enabled
      if (!this.areNotificationsEnabled()) {
        return;
      }

      // Check quiet hours
      if (this.isInQuietHours()) {
        return;
      }

      if (Capacitor.isNativePlatform()) {
        // Use local notifications plugin
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        
        await LocalNotifications.schedule({
          notifications: [{
            id: parseInt(payload.id) || Date.now(),
            title: payload.title,
            body: payload.body,
            extra: payload.data,
            attachments: payload.image ? [{ id: '1', url: payload.image }] : undefined,
            actionTypeId: payload.actionButtons ? 'CUSTOM_ACTIONS' : undefined,
            sound: payload.sound,
            smallIcon: 'ic_notification',
            largeIcon: 'ic_launcher'
          }]
        });
      } else {
        // Web notification
        const notification = new Notification(payload.title, {
          body: payload.body,
          icon: '/icon-192x192.png',
          badge: '/icon-72x72.png',
          image: payload.image,
          data: payload.data,
          tag: payload.id,
          requireInteraction: payload.priority === 'high' || payload.priority === 'max',
          silent: !PushNotificationService.preferences?.soundEnabled,
          vibrate: PushNotificationService.preferences?.vibrationEnabled ? [200, 100, 200] : undefined
        });

        notification.onclick = () => {
          this.handleNotificationOpened(payload);
        };
      }
    } catch (error) {
      console.error('Failed to send local notification:', error);
    }
  }

  /**
   * Send push notification to user
   */
  public async sendPushNotification(
    targetUserId: string,
    payload: NotificationPayload
  ): Promise<void> {
    try {
      // Get target user's push tokens
      const userDoc = await getDoc(doc(db, 'users', targetUserId));
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      const pushTokens = userData.pushTokens || [];

      if (pushTokens.length === 0) {
        console.warn('No push tokens for user:', targetUserId);
        return;
      }

      // Send via OneSignal
      if (userData.oneSignalPlayerId) {
        await this.sendViaOneSignal([userData.oneSignalPlayerId], payload);
      }

      // Store notification in database for history
      await this.saveNotificationToDatabase(targetUserId, payload);
    } catch (error) {
      console.error('Failed to send push notification:', error);
      throw error;
    }
  }

  /**
   * Send via OneSignal
   */
  private async sendViaOneSignal(
    playerIds: string[],
    payload: NotificationPayload
  ): Promise<void> {
    try {
      const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
      const apiKey = import.meta.env.VITE_ONESIGNAL_REST_API_KEY;
      
      if (!appId || !apiKey) {
        console.warn('OneSignal not configured');
        return;
      }

      const response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${apiKey}`
        },
        body: JSON.stringify({
          app_id: appId,
          include_player_ids: playerIds,
          headings: { en: payload.title },
          contents: { en: payload.body },
          data: payload.data,
          big_picture: payload.image,
          priority: this.mapPriorityToOneSignal(payload.priority),
          ttl: payload.ttl,
          buttons: payload.actionButtons?.map(btn => ({
            id: btn.id,
            text: btn.text,
            icon: btn.icon
          }))
        })
      });

      if (!response.ok) {
        throw new Error('OneSignal API error');
      }
    } catch (error) {
      console.error('OneSignal send failed:', error);
      throw error;
    }
  }

  /**
   * Update notification preferences
   */
  public async updatePreferences(
    preferences: Partial<NotificationPreferences>
  ): Promise<void> {
    try {
      if (!PushNotificationService.userId) {
        throw new Error('User not initialized');
      }

      const userRef = doc(db, 'users', PushNotificationService.userId);
      
      await updateDoc(userRef, {
        'notificationPreferences': preferences,
        updatedAt: serverTimestamp()
      });

      // Update local cache
      PushNotificationService.preferences = {
        ...PushNotificationService.preferences,
        ...preferences
      } as NotificationPreferences;

      // Update OneSignal tags
      if (PushNotificationService.playerId) {
        OneSignal.sendTags({
          security_alerts: preferences.securityAlerts?.toString(),
          backup_reminders: preferences.backupReminders?.toString(),
          promotional: preferences.promotionalOffers?.toString()
        });
      }
    } catch (error) {
      console.error('Failed to update preferences:', error);
      throw error;
    }
  }

  /**
   * Get notification history
   */
  public async getNotificationHistory(limit = 50): Promise<any[]> {
    try {
      if (!PushNotificationService.userId) {
        throw new Error('User not initialized');
      }

      // This would typically fetch from Firestore
      // For now, return empty array
      return [];
    } catch (error) {
      console.error('Failed to get notification history:', error);
      return [];
    }
  }

  // Helper methods

  private async loadPreferences(): Promise<void> {
    try {
      if (!PushNotificationService.userId) return;

      const userDoc = await getDoc(doc(db, 'users', PushNotificationService.userId));
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        PushNotificationService.preferences = data.notificationPreferences || this.getDefaultPreferences();
      } else {
        PushNotificationService.preferences = this.getDefaultPreferences();
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
      PushNotificationService.preferences = this.getDefaultPreferences();
    }
  }

  private getDefaultPreferences(): NotificationPreferences {
    return {
      enabled: true,
      securityAlerts: true,
      backupReminders: true,
      subscriptionUpdates: true,
      newDeviceAlerts: true,
      syncNotifications: false,
      promotionalOffers: false,
      quietHours: {
        enabled: false,
        startTime: '22:00',
        endTime: '08:00'
      },
      soundEnabled: true,
      vibrationEnabled: true
    };
  }

  private async saveTokenToDatabase(): Promise<void> {
    try {
      if (!PushNotificationService.userId || !PushNotificationService.pushToken) return;

      await updateDoc(doc(db, 'users', PushNotificationService.userId), {
        pushToken: PushNotificationService.pushToken,
        oneSignalPlayerId: PushNotificationService.playerId,
        lastTokenUpdate: serverTimestamp()
      });
    } catch (error) {
      console.error('Failed to save push token:', error);
    }
  }

  private async saveWebPushSubscription(subscription: PushSubscription): Promise<void> {
    try {
      if (!PushNotificationService.userId) return;

      const subscriptionData = subscription.toJSON();
      
      await updateDoc(doc(db, 'users', PushNotificationService.userId), {
        webPushSubscription: subscriptionData,
        lastTokenUpdate: serverTimestamp()
      });
    } catch (error) {
      console.error('Failed to save web push subscription:', error);
    }
  }

  private async saveNotificationToDatabase(
    userId: string,
    payload: NotificationPayload
  ): Promise<void> {
    try {
      await setDoc(doc(collection(db, 'notifications')), {
        userId,
        ...payload,
        sentAt: serverTimestamp(),
        read: false
      });
    } catch (error) {
      console.error('Failed to save notification:', error);
    }
  }

  private handleNotificationReceived(notification: any): void {
    console.log('Notification received:', notification);
    
    // Emit event for UI updates
    window.dispatchEvent(new CustomEvent('notification-received', {
      detail: notification
    }));
  }

  private handleNotificationOpened(notification: any): void {
    console.log('Notification opened:', notification);
    
    // Navigate based on notification type
    const data = notification.data || notification.additionalData;
    
    if (data?.route) {
      window.location.href = data.route;
    }
  }

  private areNotificationsEnabled(): boolean {
    return PushNotificationService.preferences?.enabled ?? true;
  }

  private isInQuietHours(): boolean {
    const prefs = PushNotificationService.preferences;
    
    if (!prefs?.quietHours.enabled) return false;
    
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const { startTime, endTime } = prefs.quietHours;
    
    if (startTime < endTime) {
      return currentTime >= startTime && currentTime < endTime;
    } else {
      return currentTime >= startTime || currentTime < endTime;
    }
  }

  private mapPriorityToOneSignal(priority?: string): number {
    switch (priority) {
      case 'max': return 10;
      case 'high': return 8;
      case 'low': return 3;
      default: return 5;
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
  }

  /**
   * Cleanup on logout
   */
  public cleanup(): void {
    PushNotificationService.userId = null;
    PushNotificationService.pushToken = null;
    PushNotificationService.playerId = null;
    PushNotificationService.preferences = null;
    PushNotificationService.isInitialized = false;
  }
}