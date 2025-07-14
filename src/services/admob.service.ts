/**
 * AdMob Service for managing advertisements
 * @module services/admob
 */

import { AdMob, AdOptions, AdLoadInfo, AdMobError } from '@capacitor-community/admob';
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
        : import.meta.env.VITE_ADMOB_APP_ID_IOS;

      if (!appId) {
        console.warn('AdMob app ID not configured');
        return;
      }

      this.config = {
        bannerId: isAndroid
          ? import.meta.env.VITE_ADMOB_BANNER_ID_ANDROID
          : import.meta.env.VITE_ADMOB_BANNER_ID_IOS,
        interstitialId: isAndroid
          ? import.meta.env.VITE_ADMOB_INTERSTITIAL_ID_ANDROID
          : import.meta.env.VITE_ADMOB_INTERSTITIAL_ID_IOS,
        rewardedId: isAndroid
          ? import.meta.env.VITE_ADMOB_REWARDED_ID_ANDROID
          : import.meta.env.VITE_ADMOB_REWARDED_ID_IOS,
      };

      // Initialize AdMob
      await AdMob.initialize({
        initializeForTesting: import.meta.env.DEV,
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
    // Banner events
    AdMob.addListener('bannerAdLoaded', () => {
      console.log('Banner ad loaded');
    });

    AdMob.addListener('bannerAdFailedToLoad', (_error: AdMobError) => {
      console.error('Banner ad failed to load:', error);
      this.bannerShowing = false;
    });

    // Interstitial events
    AdMob.addListener('interstitialAdLoaded', (info: AdLoadInfo) => {
      console.log('Interstitial ad loaded:', info);
    });

    AdMob.addListener('interstitialAdFailedToLoad', (_error: AdMobError) => {
      console.error('Interstitial ad failed to load:', error);
    });

    AdMob.addListener('interstitialAdDismissed', () => {
      console.log('Interstitial ad dismissed');
      // Preload next interstitial
      this.prepareInterstitial();
    });

    // Rewarded events
    AdMob.addListener('rewardedAdLoaded', (info: AdLoadInfo) => {
      console.log('Rewarded ad loaded:', info);
    });

    AdMob.addListener('rewardedAdFailedToLoad', (_error: AdMobError) => {
      console.error('Rewarded ad failed to load:', error);
    });

    AdMob.addListener('rewardedAdDismissed', () => {
      console.log('Rewarded ad dismissed');
      // Preload next rewarded ad
      this.prepareRewardedVideo();
    });
  }

  /**
   * Show banner ad
   */
  async showBanner(position: 'top' | 'bottom' = 'bottom'): Promise<void> {
    if (!this.initialized || !this.config?.bannerId || this.bannerShowing) {
      return;
    }

    try {
      const options: AdOptions = {
        adId: this.config.bannerId,
        adSize: 'BANNER',
        position: position === 'top' ? 'TOP_CENTER' : 'BOTTOM_CENTER',
        margin: 0,
        isTesting: import.meta.env.DEV,
      };

      await AdMob.showBanner(options);
      this.bannerShowing = true;
    } catch (error) {
      console.error('Failed to show banner:', error);
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
      console.error('Failed to hide banner:', error);
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
      console.error('Failed to remove banner:', error);
    }
  }

  /**
   * Prepare interstitial ad
   */
  async prepareInterstitial(): Promise<void> {
    if (!this.initialized || !this.config?.interstitialId) {
      return;
    }

    try {
      const options: AdOptions = {
        adId: this.config.interstitialId,
        isTesting: import.meta.env.DEV,
      };

      await AdMob.prepareInterstitial(options);
    } catch (error) {
      console.error('Failed to prepare interstitial:', error);
    }
  }

  /**
   * Show interstitial ad
   */
  async showInterstitial(): Promise<boolean> {
    if (!this.initialized || !this.config?.interstitialId) {
      return false;
    }

    try {
      await AdMob.showInterstitial();
      return true;
    } catch (error) {
      console.error('Failed to show interstitial:', error);
      // Try to prepare for next time
      this.prepareInterstitial();
      return false;
    }
  }

  /**
   * Prepare rewarded video ad
   */
  async prepareRewardedVideo(): Promise<void> {
    if (!this.initialized || !this.config?.rewardedId) {
      return;
    }

    try {
      const options: AdOptions = {
        adId: this.config.rewardedId,
        isTesting: import.meta.env.DEV,
      };

      await AdMob.prepareRewardVideo(options);
    } catch (error) {
      console.error('Failed to prepare rewarded video:', error);
    }
  }

  /**
   * Show rewarded video ad
   */
  async showRewardedVideo(): Promise<{ completed: boolean; reward?: unknown }> {
    if (!this.initialized || !this.config?.rewardedId) {
      return { completed: false };
    }

    return new Promise((resolve) => {
      let rewarded = false;

      // Set up one-time reward listener
      const rewardListener = AdMob.addListener('rewardedVideoAdReward', (reward) => {
        console.log('User earned reward:', reward);
        rewarded = true;
      });

      // Set up one-time dismiss listener
      const dismissListener = AdMob.addListener('rewardedAdDismissed', () => {
        // Clean up listeners
        rewardListener.remove();
        dismissListener.remove();
        
        resolve({ completed: rewarded, reward: rewarded ? { amount: 1 } : undefined });
        
        // Prepare next ad
        this.prepareRewardedVideo();
      });

      // Show the ad
      AdMob.showRewardVideo().catch((_error) => {
        console.error('Failed to show rewarded video:', error);
        rewardListener.remove();
        dismissListener.remove();
        resolve({ completed: false });
        
        // Try to prepare for next time
        this.prepareRewardedVideo();
      });
    });
  }

  /**
   * Check if user has premium (no ads)
   */
  async shouldShowAds(userSubscriptionTier?: string): Promise<boolean> {
    // Don't show ads in web version
    if (!Capacitor.isNativePlatform()) {
      return false;
    }

    // Don't show ads to premium users
    if (userSubscriptionTier && userSubscriptionTier !== 'free') {
      return false;
    }

    // Don't show ads in development
    if (import.meta.env.DEV && !import.meta.env.VITE_FORCE_ADS) {
      return false;
    }

    return true;
  }

  /**
   * Resume ads (after app comes to foreground)
   */
  async resume(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      await AdMob.resume();
    } catch (error) {
      console.error('Failed to resume ads:', error);
    }
  }

  /**
   * Pause ads (when app goes to background)
   */
  async pause(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      await AdMob.pause();
    } catch (error) {
      console.error('Failed to pause ads:', error);
    }
  }
}

export const adMobService = AdMobService.getInstance();