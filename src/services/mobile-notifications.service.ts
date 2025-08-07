/**
 * Mobile Notifications Service
 * Handles push and local notifications for mobile platforms
 * @module services/mobile-notifications
 */

// import { PushNotifications, PushNotificationSchema, Token } from '@capacitor/push-notifications';
// import { LocalNotifications, ScheduleOptions } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';
import { StorageService, StorageKeys } from './storage.service';
import { MobileEncryptionService } from './mobile-encryption.service';
import { NotificationService } from './notification-service';

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
	static async initialize(): Promise<void> {
		if (!Capacitor.isNativePlatform()) {
			console.log('Push notifications not available on web platform');
			return;
		}

		// try {
		// 	// Request permissions
		// 	const permissionResult = await PushNotifications.requestPermissions();
		// 	if (permissionResult.receive === 'granted') {
		// 		// Register for push notifications
		// 		await PushNotifications.register();

		// 		// Set up listeners
		// 		PushNotifications.addListener('registration', (token: Token) => {
		// 			console.log('Push registration success:', token.value);
		// 			this.saveDeviceToken(token.value);
		// 		});

		// 		PushNotifications.addListener('registrationError', (error: any) => {
		// 			console.error('Push registration error:', error);
		// 		});

		// 		PushNotifications.addListener('pushNotificationReceived', (notification: any) => {
		// 			console.log('Push notification received:', notification);
		// 			this.handleForegroundNotification(notification);
		// 		});

		// 		PushNotifications.addListener('pushNotificationActionPerformed', (notification: any) => {
		// 			console.log('Push notification action performed:', notification);
		// 			this.handleNotificationTap(notification);
		// 		});
		// 	}

		// 	// Set up local notification listeners
		// 	LocalNotifications.addListener('localNotificationReceived', (notification) => {
		// 		console.log('Local notification received:', notification);
		// 	});

		// 	LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
		// 		console.log('Local notification action performed:', notification);
		// 	});
		// } catch (error) {
		// 	console.error('Failed to initialize notifications:', error);
		// }
		console.log('Push notifications not available on web platform');
	}

	/**
	 * Setup push notification listeners
	 */
	private static setupPushListeners(): void {
		// Token registration
		// PushNotifications.addListener('registration', async (token: Token) => {
		// 	console.log('Push registration success, token:', token.value);
		// 	const deviceInfo = await Device.getInfo();
		// 	const platform = deviceInfo.platform;
		// 	// Store token based on platform
		// 	if (platform === 'ios') {
		// 		await StorageService.set(this.APNS_TOKEN_KEY, token.value, { secure: true });
		// 	} else if (platform === 'android') {
		// 		await StorageService.set(this.FCM_TOKEN_KEY, token.value, { secure: true });
		// 	}
		// 	// Send token to server
		// 	await this.sendTokenToServer(token.value, platform);
		// });
		// Registration error
		// PushNotifications.addListener('registrationError', (error: unknown) => {
		// 	console.error('Error on _registration:', error);
		// });
		// Notification received (app in foreground)
		// PushNotifications.addListener(
		// 	'pushNotificationReceived',
		// 	(notification: PushNotificationSchema) => {
		// 		console.log('Push received:', notification);
		// 		this.handleForegroundNotification(notification);
		// 	}
		// );
		// Notification tapped (app in background/closed)
		// PushNotifications.addListener(
		// 	'pushNotificationActionPerformed',
		// 	(notification: unknown) => {
		// 		console.log('Push action performed:', notification);
		// 		this.handleNotificationTap(notification.notification);
		// 	}
		// );
	}

	/**
	 * Initialize local notifications
	 */
	private static async initializeLocalNotifications(): Promise<void> {
		try {
			// const result = await LocalNotifications.requestPermissions();

			// if (result.display !== 'granted') {
			// 	console.log('Local notification permission denied');
			// 	return;
			// }

			// Set up local notification listeners
			// LocalNotifications.addListener(
			// 	'localNotificationReceived',
			// 	(notification) => {
			// 		console.log('Local notification received:', notification);
			// 	}
			// );

			// LocalNotifications.addListener(
			// 	'localNotificationActionPerformed',
			// 	(notification) => {
			// 		console.log('Local notification action performed:', notification);
			// 		this.handleLocalNotificationTap(notification.notification);
			// 	}
			// );

			console.log('Local notifications initialized');
		} catch (error) {
			console.error('Failed to initialize local notifications:', error);
		}
	}

	/**
	 * Handle foreground push notification
	 */
	private static async handleForegroundNotification(
		notification: any
	): Promise<void> {
		const settings = await this.getNotificationSettings();

		if (!settings.enabled) return;

		// Show local notification for foreground push
		// LocalNotifications.schedule({
		// 	notifications: [{
		// 		title: notification.title || 'New Notification',
		// 		body: notification.body || '',
		// 		id: Date.now(),
		// 		actionButtons: [
		// 			{
		// 				id: 'tap',
		// 				title: 'Open',
		// 			},
		// 		],
		// 	}],
		// });
		console.log('Foreground notification:', notification);
	}

	/**
	 * Handle notification tap
	 */
	private static handleNotificationTap(notification: any): void {
		const data = notification.data || {};

		// Handle different notification types
		switch (data.type) {
			case 'backup_reminder':
				// Navigate to backup screen
				break;
			case 'security_alert':
				// Navigate to security screen
				break;
			case 'code_expiration':
				// Navigate to specific account
				break;
			default:
				// Default action
				break;
		}
	}

	/**
	 * Handle local notification
	 */
	private static handleLocalNotification(notification: any): void {
		const data = notification.extra || {};

		// Similar handling as push notifications
		this.handlePushNotification({ data });
	}

	/**
	 * Handle push notification
	 */
	private static handlePushNotification(notification: any): void {
		const data = notification.data || {};

		// Handle different notification types
		switch (data.type) {
			case 'backup_reminder':
				this.handleBackupReminder(notification);
				break;
			case 'security_alert':
				this.handleSecurityAlert(notification);
				break;
			case 'code_expiration':
				this.handleCodeExpiration(notification);
				break;
			default:
				console.log('Unknown notification type:', data.type);
		}
	}

	/**
	 * Handle backup reminder notification
	 */
	private static handleBackupReminder(notification: any): void {
		// Navigate to backup screen or show reminder
		console.log('Backup reminder notification:', notification);
	}

	/**
	 * Handle security alert notification
	 */
	private static handleSecurityAlert(notification: any): void {
		// Navigate to security screen or show alert
		console.log('Security alert notification:', notification);
	}

	/**
	 * Handle code expiration notification
	 */
	private static handleCodeExpiration(notification: any): void {
		// Navigate to account or show expiration warning
		console.log('Code expiration notification:', notification);
	}

	/**
	 * Get notification settings
	 */
	static async getNotificationSettings(): Promise<NotificationSettings> {
		try {
			const value = await StorageService.get<NotificationSettings>(this.SETTINGS_KEY);
			if (value) {
				return value;
			}
		} catch (error) {
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
				end: '08:00',
			},
			categories: {
				security: true,
				backup: true,
				accounts: true,
				general: true,
			},
		};
	}

	/**
	 * Save notification settings
	 */
	static async saveNotificationSettings(
		settings: NotificationSettings
	): Promise<void> {
		try {
			await StorageService.set(this.SETTINGS_KEY, settings);
		} catch (error) {
			console.error('Failed to save notification settings:', error);
		}
	}

	/**
	 * Get scheduled notifications
	 */
	static async getScheduledNotifications(): Promise<any[]> {
		if (!Capacitor.isNativePlatform()) {
			return [];
		}

		// const pending = await LocalNotifications.getPending();
		// return pending.notifications.map((notification: any) => ({
		// 	id: notification.id,
		// 	title: notification.title,
		// 	body: notification.body,
		// 	data: notification.extra,
		// 	scheduledAt: new Date(notification.schedule?.at || Date.now()),
		// }));
		return [];
	}

	/**
	 * Save device token
	 */
	private static async saveDeviceToken(token: string): Promise<void> {
		try {
			await StorageService.set('device_token', token, { secure: true });
		} catch (error) {
			console.error('Failed to save device token:', error);
		}
	}

	/**
	 * Update notification settings
	 */
	static async updateSettings(settings: NotificationSettings): Promise<void> {
		await StorageService.set(this.SETTINGS_KEY, settings);
	}

	/**
	 * Schedule local notification
	 */
	static async scheduleLocalNotification(options: {
		title: string;
		body: string;
		scheduledAt: Date;
		data?: any;
	}): Promise<void> {
		if (!Capacitor.isNativePlatform()) {
			console.log('Local notifications not available on web platform');
			return;
		}

		const settings = await this.getNotificationSettings();
		if (!settings.enabled) return;

		if (this.isQuietHours(settings)) return;

		// const notification: ScheduleOptions = {
		// 	notifications: [
		// 		{
		// 			title: options.title,
		// 			body: options.body,
		// 			id: Date.now(),
		// 			trigger: { at: options.scheduledAt },
		// 			extra: options.data,
		// 			actionButtons: [
		// 				{
		// 					id: 'tap',
		// 					title: 'Open',
		// 				},
		// 			],
		// 		},
		// 	],
		// };

		// await LocalNotifications.schedule(notification);
		console.log('Local notifications not available on web platform');
	}

	/**
	 * Schedule backup reminder
	 */
	static async scheduleBackupReminder(scheduleDate: Date): Promise<void> {
		await this.scheduleLocalNotification({
			title: 'Backup Reminder',
			body: "It's time to back up your 2FA accounts for security.",
			data: { type: 'backup_reminder' },
			scheduledAt: scheduleDate,
		});
	}

	/**
	 * Schedule security check
	 */
	static async scheduleSecurityCheck(scheduleDate: Date): Promise<void> {
		await this.scheduleLocalNotification({
			title: 'Security Check',
			body: 'Review your security settings and check for weak secrets.',
			data: { type: 'security_check' },
			scheduledAt: scheduleDate,
		});
	}

	/**
	 * Cancel notification
	 */
	static async cancelNotification(id: number): Promise<void> {
		// await LocalNotifications.cancel({ notifications: [{ id }] });
	}

	/**
	 * Cancel all notifications
	 */
	static async cancelAllNotifications(): Promise<void> {
		if (!Capacitor.isNativePlatform()) {
			return;
		}

		// const pending = await LocalNotifications.getPending();
		// if (pending.notifications.length > 0) {
		// 	await LocalNotifications.cancel({
		// 		notifications: pending.notifications.map((n: any) => ({ id: n.id })),
		// 	});
		// }
		console.log('Cancel notifications not available on web platform');
	}

	/**
	 * Get pending notifications
	 */
	static async getPendingNotifications(): Promise<ScheduledNotification[]> {
		if (!Capacitor.isNativePlatform()) {
			return [];
		}

		// const pending = await LocalNotifications.getPending();

		// return pending.notifications.map((notification: any) => ({
		// 	id: notification.id,
		// 	type: notification.extra?.type || 'unknown',
		// 	title: notification.title,
		// 	body: notification.body,
		// 	data: notification.extra,
		// 	scheduledAt: new Date(notification.schedule?.at || Date.now()),
		// }));
		return [];
	}

	/**
	 * Send push notification token to server
	 */
	private static async sendTokenToServer(
		token: string,
		platform: string
	): Promise<void> {
		try {
			// Here you would send the token to your backend server
			console.log('Sending token to server:', token, platform);
		} catch (error) {
			console.error('Failed to send token to server:', error);
		}
	}

	/**
	 * Check if current time is in quiet hours
	 */
	private static isQuietHours(settings: any): boolean {
		if (!settings.quietHours.enabled) return false;

		const now = new Date();
		const currentTime = now.getHours() * 60 + now.getMinutes();

		const [startHour, startMin] = settings.quietHours.start
			.split(':')
			.map(Number);
		const [endHour, endMin] = settings.quietHours.end.split(':').map(Number);

		const startTime = startHour * 60 + startMin;
		const endTime = endHour * 60 + endMin;

		if (startTime < endTime) {
			return currentTime >= startTime && currentTime <= endTime;
		} else {
			return currentTime >= startTime || currentTime <= endTime;
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
