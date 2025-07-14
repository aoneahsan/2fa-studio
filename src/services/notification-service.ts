import OneSignal from 'react-onesignal';
import { Capacitor } from '@capacitor/core';

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
	 * Initialize OneSignal
	 */
	static async initialize(): Promise<void> {
		if (!this.isWebEnvironment()) {
			console.log('OneSignal not available in non-web environment');
			return;
		}

		try {
			await OneSignal.init({
				appId: this.APP_ID,
				allowLocalhostAsSecureOrigin: true,
				text: {
					'dialog.main.title': 'Manage Notifications',
					'dialog.main.button.subscribe': 'Subscribe',
					'dialog.main.button.unsubscribe': 'Unsubscribe',
					'dialog.blocked.title': 'Notifications Blocked',
					'dialog.blocked.message':
						'Please allow notifications to receive updates',
					'message.action.subscribed': 'Thanks for subscribing!',
					'message.action.resubscribed': "You're subscribed to notifications",
					'message.action.unsubscribed':
						"You won't receive notifications anymore",
					'message.prenotify': 'Click to subscribe to notifications',
					'tip.state.unsubscribed': "You're subscribed to notifications",
					'tip.state.subscribed': "You're subscribed to notifications",
					'tip.state.blocked': "You've blocked notifications",
				},
				notifyButton: {
					enable: false,
					prenotify: false,
					showCredit: false,
					text: {
						'tip.state.unsubscribed': 'Subscribe to notifications',
						'tip.state.subscribed': 'Thanks for subscribing!',
						'tip.state.blocked': "You've blocked notifications",
						'message.prenotify': 'Click to subscribe to notifications',
						'message.action.subscribed': 'Thanks for subscribing!',
						'message.action.resubscribed': "You're subscribed to notifications",
						'message.action.unsubscribed':
							"You won't receive notifications anymore",
						'dialog.main.title': 'Manage Notifications',
						'dialog.main.button.subscribe': 'Subscribe',
						'dialog.main.button.unsubscribe': 'Unsubscribe',
						'dialog.blocked.title': 'Notifications Blocked',
						'dialog.blocked.message':
							'Please allow notifications to receive updates',
					},
				},
			});

			// Request permission
			await OneSignal.Notifications.requestPermission();

			// Set up event listeners
			this.setupEventListeners();

			console.log('OneSignal initialized successfully');
		} catch (error) {
			console.error('Failed to initialize OneSignal:', error);
		}
	}

	/**
	 * Setup event listeners
	 */
	private static setupEventListeners(): void {
		// Notification received
		OneSignal.Notifications.addEventListener('click', (event: any) => {
			console.log('Notification clicked:', event);
			// event.notification.display();
		});

		// Notification permission changed
		OneSignal.Notifications.addEventListener(
			'permissionChange',
			(granted: boolean) => {
				console.log('Notification permission changed:', granted);
			}
		);

		// Subscription changed
		OneSignal.User.PushSubscription.addEventListener('change', (event: any) => {
			console.log('Push subscription changed:', event);
			const data = event.current || {};
			this.handleSubscriptionChange(data);
		});
	}

	/**
	 * Handle subscription change
	 */
	private static handleSubscriptionChange(data: any): void {
		console.log('Subscription changed:', data);
		// Handle subscription change logic
	}

	/**
	 * Check if notifications are supported
	 */
	static async isSupported(): Promise<boolean> {
		if (!this.isWebEnvironment()) {
			return false;
		}

		try {
			return OneSignal.Notifications.permission !== 'default';
		} catch (error) {
			console.error('Error checking notification support:', error);
			return false;
		}
	}

	/**
	 * Get notification permission
	 */
	static async getPermission(): Promise<boolean> {
		if (!this.isWebEnvironment()) {
			return false;
		}

		try {
			return OneSignal.Notifications.permission === 'granted';
		} catch (error) {
			console.error('Error getting notification permission:', error);
			return false;
		}
	}

	/**
	 * Request notification permission
	 */
	static async requestPermission(): Promise<boolean> {
		if (!this.isWebEnvironment()) {
			return false;
		}

		try {
			await OneSignal.Notifications.requestPermission();
			return OneSignal.Notifications.permission === 'granted';
		} catch (error) {
			console.error('Error requesting notification permission:', error);
			return false;
		}
	}

	/**
	 * Check if web environment
	 */
	private static isWebEnvironment(): boolean {
		return typeof window !== 'undefined' && typeof document !== 'undefined';
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
		console.log('Security alert would be sent from backend:', {
			userId,
			message,
		});
	}

	async scheduleBackupReminder(userId: string, days: number): Promise<void> {
		// This would typically be called from your backend
		console.log('Backup reminder would be scheduled from backend:', {
			userId,
			days,
		});
	}

	async sendBackupReminder(userId: string, message: string): Promise<void> {
		// This would typically be called from your backend
		console.log('Backup reminder would be sent from backend:', {
			userId,
			message,
		});
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
			const permission = await (OneSignal as any).Notifications.permission;
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
