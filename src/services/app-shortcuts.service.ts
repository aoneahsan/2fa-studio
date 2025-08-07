/**
 * App shortcuts and widgets service for mobile platforms
 * @module services/app-shortcuts
 */

import { Capacitor } from '@capacitor/core';
import { App, AppInfo } from '@capacitor/app';
import { StorageService, StorageKeys } from './storage.service';
import { OTPService, OTPAccount } from './otp.service';
import { MobileAccountService } from './mobile-account.service';

export interface AppShortcut {
	id: string;
	accountId: string;
	label: string;
	issuer: string;
	icon?: string;
	position: number;
}

export interface WidgetAccount {
	id: string;
	issuer: string;
	label: string;
	code: string;
	remainingTime: number;
	lastUpdated: Date;
}

export class AppShortcutsService {
	private static readonly SHORTCUTS_KEY = 'app_shortcuts';
	private static readonly WIDGET_ACCOUNTS_KEY = 'widget_accounts';
	private static readonly MAX_SHORTCUTS = 4;
	private static readonly MAX_WIDGET_ACCOUNTS = 6;

	/**
	 * Initialize app shortcuts
	 */
	static async initialize(): Promise<void> {
		if (!Capacitor.isNativePlatform()) return;

		try {
			// Update shortcuts on app start
			await this.updateShortcuts();

			console.log('App shortcuts initialized');
		} catch (error) {
			console.error('Failed to initialize app shortcuts:', error);
		}
	}

	/**
	 * Get configured shortcuts
	 */
	static async getShortcuts(): Promise<AppShortcut[]> {
		try {
			const value = await StorageService.get<AppShortcut[]>(this.SHORTCUTS_KEY);
			if (value) {
				return value;
			}
		} catch (error) {
			console.error('Failed to get shortcuts:', error);
		}
		return [];
	}

	/**
	 * Add account to shortcuts
	 */
	static async addShortcut(account: OTPAccount): Promise<boolean> {
		try {
			const shortcuts = await this.getShortcuts();

			// Check if already exists
			if (shortcuts.some((s) => s.accountId === account.id)) {
				return false;
			}

			// Check limit
			if (shortcuts.length >= this.MAX_SHORTCUTS) {
				throw new Error(`Maximum ${this.MAX_SHORTCUTS} shortcuts allowed`);
			}

			const newShortcut: AppShortcut = {
				id: `shortcut_${account.id}`,
				accountId: account.id,
				label: account.label || account.issuer,
				issuer: account.issuer,
				icon: account.iconUrl,
				position: shortcuts.length,
			};

			shortcuts.push(newShortcut);
			await this.saveShortcuts(shortcuts);
			await this.updateShortcuts();

			return true;
		} catch (error) {
			console.error('Failed to add shortcut:', error);
			throw error;
		}
	}

	/**
	 * Remove shortcut
	 */
	static async removeShortcut(accountId: string): Promise<void> {
		try {
			const shortcuts = await this.getShortcuts();
			const filtered = shortcuts.filter((s: any) => s.accountId !== accountId);

			// Reorder positions
			filtered.forEach((shortcut, index) => {
				shortcut.position = index;
			});

			await this.saveShortcuts(filtered);
			await this.updateShortcuts();
		} catch (error) {
			console.error('Failed to remove shortcut:', error);
			throw error;
		}
	}

	/**
	 * Reorder shortcuts
	 */
	static async reorderShortcuts(shortcuts: AppShortcut[]): Promise<void> {
		try {
			// Update positions
			shortcuts.forEach((shortcut, index) => {
				shortcut.position = index;
			});

			await this.saveShortcuts(shortcuts);
			await this.updateShortcuts();
		} catch (error) {
			console.error('Failed to reorder shortcuts:', error);
			throw error;
		}
	}

	/**
	 * Generate OTP code for shortcut
	 */
	static async generateShortcutCode(accountId: string): Promise<{
		code: string;
		remainingTime: number;
		issuer: string;
		label: string;
	} | null> {
		try {
			const accounts = await MobileAccountService.loadAccounts();
			const account = accounts.find((a: any) => a.id === accountId);

			if (!account) {
				return null;
			}

			const result = OTPService.generateCode(account);

			return {
				code: result.code,
				remainingTime: result.remainingTime || 0,
				issuer: account.issuer,
				label: account.label,
			};
		} catch (error) {
			console.error('Failed to generate shortcut code:', error);
			return null;
		}
	}

	/**
	 * Get widget accounts
	 */
	static async getWidgetAccounts(): Promise<string[]> {
		try {
			const value = await StorageService.get<string[]>(this.WIDGET_ACCOUNTS_KEY);
			if (value) {
				return value;
			}
		} catch (error) {
			console.error('Failed to get widget accounts:', error);
		}
		return [];
	}

	/**
	 * Set widget accounts
	 */
	static async setWidgetAccounts(accountIds: string[]): Promise<void> {
		try {
			// Limit to maximum
			const limited = accountIds.slice(0, this.MAX_WIDGET_ACCOUNTS);

			await StorageService.set(this.WIDGET_ACCOUNTS_KEY, limited);

			// Update widget data
			await this.updateWidgetData();
		} catch (error) {
			console.error('Failed to set widget accounts:', error);
			throw error;
		}
	}

	/**
	 * Update widget data
	 */
	static async updateWidgetData(): Promise<void> {
		if (!Capacitor.isNativePlatform()) return;

		try {
			const accountIds = await this.getWidgetAccounts();
			const accounts = await MobileAccountService.loadAccounts();

			const widgetData: WidgetAccount[] = [];

			for (const accountId of accountIds) {
				const account = accounts.find((a: any) => a.id === accountId);
				if (!account) continue;

				try {
					const result = OTPService.generateCode(account);

					widgetData.push({
						id: account.id,
						issuer: account.issuer,
						label: account.label,
						code: result.code,
						remainingTime: result.remainingTime || 0,
						lastUpdated: new Date(),
					});
				} catch (error) {
					console.error(
						`Failed to generate code for widget account ${account.id}:`,
						error
					);
				}
			}

			// Send data to native layer for widget update
			await this.sendWidgetData(widgetData);
		} catch (error) {
			console.error('Failed to update widget data:', error);
		}
	}

	/**
	 * Save shortcuts to storage
	 */
	private static async saveShortcuts(shortcuts: AppShortcut[]): Promise<void> {
		await StorageService.set(this.SHORTCUTS_KEY, shortcuts);
	}

	/**
	 * Update platform shortcuts
	 */
	private static async updateShortcuts(): Promise<void> {
		if (!Capacitor.isNativePlatform()) return;

		try {
			const shortcuts = await this.getShortcuts();

			// Create shortcuts data for native layer
			const shortcutsData = shortcuts.map((shortcut: any) => ({
				id: shortcut.id,
				title: shortcut.label,
				subtitle: shortcut.issuer,
				icon: shortcut.icon || 'default_icon',
				data: {
					accountId: shortcut.accountId,
					action: 'generate_code',
				},
			}));

			// Send to native layer
			await this.sendShortcutsData(shortcutsData);
		} catch (error) {
			console.error('Failed to update platform shortcuts:', error);
		}
	}

	/**
	 * Send shortcuts data to native layer
	 */
	private static async sendShortcutsData(shortcuts: unknown[]): Promise<void> {
		try {
			// For Android: Use app shortcuts API
			// For iOS: Use Siri shortcuts

			if (Capacitor.getPlatform() === 'android') {
				// Send to Android shortcuts handler
				// This would be implemented in the native Android code
				await (Capacitor as any).Plugins.TwoFAShortcuts?.updateShortcuts({
					shortcuts,
				});
			} else if (Capacitor.getPlatform() === 'ios') {
				// Send to iOS shortcuts handler
				// This would be implemented in the native iOS code
				await (Capacitor as any).Plugins.TwoFAShortcuts?.updateSiriShortcuts({
					shortcuts,
				});
			}
		} catch (error) {
			console.error('Failed to send shortcuts data to native layer:', error);
		}
	}

	/**
	 * Send widget data to native layer
	 */
	private static async sendWidgetData(data: WidgetAccount[]): Promise<void> {
		try {
			if (Capacitor.getPlatform() === 'android') {
				// Send to Android widget handler
				await (Capacitor as any).Plugins.TwoFAWidget?.updateWidget({
					accounts: data,
				});
			} else if (Capacitor.getPlatform() === 'ios') {
				// Send to iOS widget handler
				await (Capacitor as any).Plugins.TwoFAWidget?.updateWidget({
					accounts: data,
				});
			}
		} catch (error) {
			console.error('Failed to send widget data to native layer:', error);
		}
	}

	/**
	 * Handle shortcut intent from native layer
	 */
	static async handleShortcutIntent(data: any): Promise<void> {
		try {
			if (data.action === 'generate_code' && data.accountId) {
				const result = await this.generateShortcutCode(data.accountId);

				if (result) {
					// Show code in native interface or copy to clipboard
					await this.showShortcutResult(result);
				}
			}
		} catch (error) {
			console.error('Failed to handle shortcut intent:', error);
		}
	}

	/**
	 * Show shortcut result
	 */
	private static async showShortcutResult(result: {
		code: string;
		remainingTime: number;
		issuer: string;
		label: string;
	}): Promise<void> {
		try {
			// Copy code to clipboard
			await (Capacitor as any).Plugins.Clipboard?.write({
				string: result.code,
			});

			// Show native toast/notification
			await (Capacitor as any).Plugins.Toast?.show({
				text: `${result.issuer} - ${result.label}: ${result.code}`,
				duration: 'long',
			});
		} catch (error) {
			console.error('Failed to show shortcut result:', error);
		}
	}

	/**
	 * Get shortcut usage statistics
	 */
	static async getShortcutStats(): Promise<{
		totalShortcuts: number;
		totalUsage: number;
		mostUsed?: AppShortcut;
	}> {
		const shortcuts = await this.getShortcuts();

		return {
			totalShortcuts: shortcuts.length,
			totalUsage: 0, // Would track actual usage
			mostUsed: shortcuts[0], // Would be based on usage stats
		};
	}

	/**
	 * Export shortcuts configuration
	 */
	static async exportShortcuts(): Promise<{
		shortcuts: AppShortcut[];
		widgetAccounts: string[];
	}> {
		const shortcuts = await this.getShortcuts();
		const widgetAccounts = await this.getWidgetAccounts();

		return {
			shortcuts,
			widgetAccounts,
		};
	}

	/**
	 * Import shortcuts configuration
	 */
	static async importShortcuts(_config: {
		shortcuts: AppShortcut[];
		widgetAccounts: string[];
	}): Promise<void> {
		await this.saveShortcuts(_config.shortcuts);
		await this.setWidgetAccounts(_config.widgetAccounts);
		await this.updateShortcuts();
	}
}
