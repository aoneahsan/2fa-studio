/**
 * Hook for managing advertisements
 * @module hooks/useAds
 */

import { useState, useEffect, useCallback } from 'react';
import { adMobService } from '@services/admob.service';
import { Capacitor } from '@capacitor/core';
import { useAppSelector } from '@hooks/useAppSelector';

interface UseAdsReturn {
	showBanner: (position?: 'top' | 'bottom') => Promise<void>;
	hideBanner: () => Promise<void>;
	showInterstitial: () => Promise<boolean>;
	showRewardedAd: () => Promise<{ completed: boolean; reward?: any }>;
	shouldShowAds: boolean;
	isInitialized: boolean;
}

export function useAds(): UseAdsReturn {
	const user = useAppSelector((state) => state.auth.user);
	const [isInitialized, setIsInitialized] = useState(false);
	const [shouldShowAds, setShouldShowAds] = useState(false);

	useEffect(() => {
		const initializeAds = async () => {
			if (!Capacitor.isNativePlatform()) {
				return;
			}

			// Check if user should see ads
			const showAds = await adMobService.shouldShowAds(
				user?.subscription?.tier
			);
			setShouldShowAds(showAds);

			if (showAds) {
				await adMobService.initialize();
				setIsInitialized(true);

				// Prepare ads
				await adMobService.prepareInterstitial();
				await adMobService.prepareRewardedVideo();
			}
		};

		initializeAds();
	}, [user?.subscription?.tier]);

	// App lifecycle handlers
	useEffect(() => {
		if (!isInitialized) return;

		const handleAppStateChange = async (state: { isActive: boolean }) => {
			if (state.isActive) {
				await adMobService.resume();
			} else {
				await adMobService.pause();
			}
		};

		// Listen for app state changes
		const { App } = Capacitor.Plugins;
		App.addListener('appStateChange', handleAppStateChange);

		return () => {
			App.removeAllListeners();
		};
	}, [isInitialized]);

	const showBanner = useCallback(
		async (position: 'top' | 'bottom' = 'bottom') => {
			if (shouldShowAds && isInitialized) {
				await adMobService.showBanner(position);
			}
		},
		[shouldShowAds, isInitialized]
	);

	const hideBanner = useCallback(async () => {
		if (isInitialized) {
			await adMobService.hideBanner();
		}
	}, [isInitialized]);

	const showInterstitial = useCallback(async (): Promise<boolean> => {
		if (shouldShowAds && isInitialized) {
			return await adMobService.showInterstitial();
		}
		return false;
	}, [shouldShowAds, isInitialized]);

	const showRewardedAd = useCallback(async (): Promise<{
		completed: boolean;
		reward?: any;
	}> => {
		if (shouldShowAds && isInitialized) {
			return await adMobService.showRewardedVideo();
		}
		return { completed: false };
	}, [shouldShowAds, isInitialized]);

	return {
		showBanner,
		hideBanner,
		showInterstitial,
		showRewardedAd,
		shouldShowAds,
		isInitialized,
	};
}
