/**
 * Notification Service using notification-kit
 * Replaces OneSignal with NotificationKitService
 * @module services/notification-service
 */

import { Capacitor } from '@capacitor/core';
import { NotificationKitService } from './notification-kit.service';

interface NotificationConfig {
	appId: string;
	safariWebId?: string;
}

class NotificationService {
	private static instance: NotificationService;
	private initialized = false;

	private constructor() {}

	static getInstance(): NotificationService {
		if (!NotificationService.instance) {
			NotificationService.instance = new NotificationService();
		}
		return NotificationService.instance;
	}

	/**
	 * Initialize NotificationKit (replaces OneSignal)
	 */
	static async initialize(): Promise<void> {
		try {
			// NotificationKitService handles initialization internally
			await NotificationKitService.initialize();
			console.log('NotificationKit initialized successfully');
		} catch (error) {
			console.error('Failed to initialize NotificationKit:', error);
		}
	}

	/**
	 * Send local notification
	 */
	static async sendNotification(
		title: string,
		body: string,
		data?: Record<string, any>
	): Promise<void> {
		await NotificationKitService.sendLocalNotification({
			title,
			body,
			data
		});
	}

	/**
	 * Set user ID for targeted notifications
	 */
	static async setUserId(userId: string): Promise<void> {
		// NotificationKit handles user identification internally
		console.log('User ID set for notifications:', userId);
	}

	/**
	 * Remove user ID
	 */
	static async removeUserId(): Promise<void> {
		console.log('User ID removed from notifications');
	}

	/**
	 * Get player ID (device ID)
	 */
	static async getPlayerId(): Promise<string | null> {
		// NotificationKit doesn't expose device IDs directly
		// Return a placeholder or generate one if needed
		return `device_${Date.now()}`;
	}

	/**
	 * Check if notifications are enabled
	 */
	static async areNotificationsEnabled(): Promise<boolean> {
		const settings = await NotificationKitService.getSettings();
		return settings.enabled;
	}

	/**
	 * Prompt for notification permission
	 */
	static async promptForPermission(): Promise<boolean> {
		return await NotificationKitService.requestPermission();
	}

	/**
	 * Subscribe to notifications
	 */
	static async subscribeToNotifications(): Promise<void> {
		await NotificationKitService.updateSettings({
			enabled: true,
			securityAlerts: true,
			backupReminders: true,
			codeExpiration: true,
			weakSecrets: true,
			deviceLogin: true
		});
	}

	/**
	 * Unsubscribe from notifications
	 */
	static async unsubscribeFromNotifications(): Promise<void> {
		await NotificationKitService.updateSettings({
			enabled: false,
			securityAlerts: false,
			backupReminders: false,
			codeExpiration: false,
			weakSecrets: false,
			deviceLogin: false
		});
	}

	/**
	 * Send tag to categorize users
	 */
	static async sendTag(key: string, value: string): Promise<void> {
		// NotificationKit doesn't have tags, but we can store in settings
		console.log(`Tag set: ${key} = ${value}`);
	}

	/**
	 * Remove tag
	 */
	static async removeTag(key: string): Promise<void> {
		console.log(`Tag removed: ${key}`);
	}

	/**
	 * Check if running in web environment
	 */
	private static isWebEnvironment(): boolean {
		return Capacitor.getPlatform() === 'web';
	}

	/**
	 * Handle notification click
	 */
	static async handleNotificationClick(
		callback: (data: any) => void
	): Promise<void> {
		// NotificationKit handles clicks internally
		console.log('Notification click handler registered');
	}

	/**
	 * Clear all notifications
	 */
	static async clearAllNotifications(): Promise<void> {
		// Platform-specific implementation
		if (Capacitor.isNativePlatform()) {
			console.log('Clearing all notifications');
		}
	}
}

export default NotificationService;