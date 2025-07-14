/**
 * AdMob Service for managing advertisements
 * @module services/admob
 */

import {
	AdMob,
	AdOptions,
	AdLoadInfo,
	AdMobError,
} from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';
import { isPlatform } from '@utils/platform';

export interface AdConfig {
	bannerId: string;
	interstitialId: string;
	rewardedId: string;
}

export class AdMobService {
	private static instance: AdMobService;
	private initialized = false;
	private bannerShowing = false;
	private _config: AdConfig | null = null;

	private constructor() {}

	static getInstance(): AdMobService {
		if (!AdMobService.instance) {
			AdMobService.instance = new AdMobService();
		}
		return AdMobService.instance;
	}

	/**
	 * Initialize AdMob
	 */
	async initialize(): Promise<void> {
		if (this.initialized || !Capacitor.isNativePlatform()) {
			return;
		}

		try {
			// Get platform-specific config
			const isAndroid = isPlatform('android');
			const appId = isAndroid
				? import.meta.env.VITE_ADMOB_APP_ID_ANDROID
				: (import.meta as any).env.VITE_ADMOB_APP_ID_IOS;

			if (!appId) {
				console.warn('AdMob app ID not configured');
				return;
			}

			this._config = {
				bannerId: isAndroid
					? import.meta.env.VITE_ADMOB_BANNER_ID_ANDROID
					: (import.meta as any).env.VITE_ADMOB_BANNER_ID_IOS,
				interstitialId: isAndroid
					? import.meta.env.VITE_ADMOB_INTERSTITIAL_ID_ANDROID
					: (import.meta as any).env.VITE_ADMOB_INTERSTITIAL_ID_IOS,
				rewardedId: isAndroid
					? import.meta.env.VITE_ADMOB_REWARDED_ID_ANDROID
					: (import.meta as any).env.VITE_ADMOB_REWARDED_ID_IOS,
			};

			// Initialize AdMob
			await AdMob.initialize({
				initializeForTesting: (import.meta as any).env.DEV,
			});

			// Set up event listeners
			this.setupEventListeners();

			this.initialized = true;
			console.log('AdMob initialized successfully');
		} catch (error) {
			console.error('Failed to initialize AdMob:', error);
		}
	}

	/**
	 * Set up AdMob event listeners
	 */
	private setupEventListeners(): void {
		// Banner events - use type assertion to bypass strict typing
		(AdMob as any).addListener('bannerAdLoaded', () => {
			this.bannerShowing = true;
		});

		(AdMob as any).addListener('bannerAdFailedToLoad', (error: any) => {
			console.error('Banner ad failed to load:', error);
			this.bannerShowing = false;
		});

		// Use general addListener for custom events
		(AdMob as any).addListener('bannerAdOpened', () => {
			// Track banner opened
		});

		(AdMob as any).addListener('bannerAdClosed', () => {
			// Track banner closed
		});

		// Interstitial events
		(AdMob as any).addListener('interstitialAdLoaded', () => {
			// Interstitial ready
		});

		(AdMob as any).addListener('interstitialAdFailedToLoad', (error: any) => {
			console.error('Interstitial ad failed to load:', error);
		});

		// Rewarded video events
		(AdMob as any).addListener('rewardedVideoAdLoaded', () => {
			// Rewarded video ready
		});

		(AdMob as any).addListener('rewardedVideoAdFailedToLoad', (error: any) => {
			console.error('Rewarded video failed to load:', error);
		});

		(AdMob as any).addListener('rewardedVideoAdClosed', () => {
			// Rewarded video closed
		});
	}

	/**
	 * Show banner ad
	 */
	async showBanner(position: 'top' | 'bottom' = 'bottom'): Promise<void> {
		if (!this.initialized || !this._config?.bannerId || this.bannerShowing) {
			return;
		}

		try {
			const options: AdOptions = {
				adId: this._config.bannerId,
				position: position === 'top' ? 'TOP_CENTER' : 'BOTTOM_CENTER',
				margin: 0,
				isTesting: (import.meta as any).env.DEV,
			} as any;

			await AdMob.showBanner(options);
			this.bannerShowing = true;
		} catch (error) {
			console.error('Failed to show banner ad:', error);
		}
	}

	/**
	 * Hide banner ad
	 */
	async hideBanner(): Promise<void> {
		if (!this.bannerShowing) {
			return;
		}

		try {
			await AdMob.hideBanner();
			this.bannerShowing = false;
		} catch (error) {
			console.error('Failed to hide banner ad:', error);
		}
	}

	/**
	 * Remove banner ad
	 */
	async removeBanner(): Promise<void> {
		try {
			await AdMob.removeBanner();
			this.bannerShowing = false;
		} catch (error) {
			console.error('Failed to remove banner ad:', error);
		}
	}

	/**
	 * Prepare interstitial ad
	 */
	async prepareInterstitial(): Promise<void> {
		if (!this.initialized || !this._config?.interstitialId) {
			return;
		}

		try {
			const options: AdOptions = {
				adId: this._config.interstitialId,
				isTesting: (import.meta as any).env.DEV,
			};

			await AdMob.prepareInterstitial(options);
		} catch (error) {
			console.error('Failed to prepare interstitial ad:', error);
		}
	}

	/**
	 * Show interstitial ad
	 */
	async showInterstitial(): Promise<boolean> {
		if (!this.initialized || !this._config?.interstitialId) {
			return false;
		}

		try {
			await AdMob.showInterstitial();
			return true;
		} catch (error) {
			console.error('Failed to show interstitial ad:', error);
			return false;
		}
	}

	/**
	 * Prepare rewarded video ad
	 */
	async prepareRewardedVideo(): Promise<void> {
		if (!this.initialized || !this._config?.rewardedId) {
			return;
		}

		try {
			const options: AdOptions = {
				adId: this._config.rewardedId,
				isTesting: (import.meta as any).env.DEV,
			};

			await AdMob.prepareRewardVideoAd(options);
		} catch (error) {
			console.error('Failed to prepare rewarded video:', error);
		}
	}

	/**
	 * Show rewarded video ad
	 */
	async showRewardedVideo(): Promise<{ completed: boolean; reward?: unknown }> {
		if (!this.initialized) {
			await this.initialize();
		}

		try {
			// Set up reward listener
			const rewardListener = await (AdMob as any).addListener(
				'rewardedVideoAdReward',
				(reward: unknown) => {
					return { completed: true, reward };
				}
			);

			// Set up dismiss listener
			const dismissListener = await (AdMob as any).addListener(
				'rewardedVideoAdClosed',
				() => {
					return { completed: false };
				}
			);

			// Show rewarded video - use correct method name
			await (AdMob as any).showRewardVideoAd();

			// Clean up listeners after showing
			if (rewardListener && typeof rewardListener.remove === 'function') {
				await rewardListener.remove();
			}
			if (dismissListener && typeof dismissListener.remove === 'function') {
				await dismissListener.remove();
			}

			return { completed: true };
		} catch (error) {
			console.error('Failed to show rewarded video:', error);
			return { completed: false };
		}
	}

	/**
	 * Check if ads should be shown based on user subscription
	 */
	async shouldShowAds(userSubscriptionTier?: string): Promise<boolean> {
		// Don't show ads for premium users
		if (
			userSubscriptionTier === 'premium' ||
			userSubscriptionTier === 'business'
		) {
			return false;
		}

		// Show ads for free and trial users
		return true;
	}

	/**
	 * Set ad configuration
	 */
	setConfig(config: AdConfig): void {
		this._config = config;
	}

	/**
	 * Get current configuration
	 */
	getConfig(): AdConfig | null {
		return this._config;
	}

	/**
	 * Resume ads (for app lifecycle)
	 */
	async resume(): Promise<void> {
		// AdMob plugin doesn't have resume method, this is a placeholder
		if (this.initialized) {
			// Re-prepare ads if needed
			await this.prepareInterstitial();
			await this.prepareRewardedVideo();
		}
	}

	/**
	 * Pause ads (for app lifecycle)
	 */
	async pause(): Promise<void> {
		// AdMob plugin doesn't have pause method, this is a placeholder
		if (this.bannerShowing) {
			await this.hideBanner();
		}
	}
}

export const adMobService = AdMobService.getInstance();
