/**
 * Admin push notification composer service
 * @module services/admin-notifications
 */

import { FirestoreService } from './firestore.service';

export interface PushNotification {
  id: string;
  title: string;
  body: string;
  targetType: 'all' | 'tier' | 'users' | 'segment';
  targetValue?: string | string[];
  scheduledFor?: Date;
  sent: boolean;
  sentAt?: Date;
  sentCount?: number;
  createdBy: string;
  createdAt: Date;
}

export class AdminNotificationsService {
  
  static async createNotification(notification: Omit<PushNotification, 'id' | 'sent' | 'createdAt'>): Promise<string> {
    const newNotification = {
      ...notification,
      sent: false,
      createdAt: new Date(),
    };
    
    const result = await FirestoreService.createDocument('push_notifications', newNotification);
    return result;
  }

  static async sendNotification(notificationId: string): Promise<void> {
    const notification = await FirestoreService.getDocument('push_notifications', notificationId);
    
    if (notification.success && notification.data) {
      // Here you would integrate with FCM or other push notification service
      console.log('Sending notification:', notification.data);
      
      await FirestoreService.updateDocument('push_notifications', notificationId, {
        sent: true,
        sentAt: new Date(),
        sentCount: 1000, // Mock count
      });
    }
  }

  static async getNotifications(): Promise<PushNotification[]> {
    const result = await FirestoreService.getCollection('push_notifications');
    return result.success ? result.data as PushNotification[] : [];
  }
}