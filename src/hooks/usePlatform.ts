/**
 * Platform detection and adaptation hook
 * @module hooks/usePlatform
 */

import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';
// import { StatusBar } from '@capacitor/status-bar'; // Package not available
// import { Keyboard } from '@capacitor/keyboard'; // Package not available
import { App } from '@capacitor/app';

export interface PlatformInfo {
	isNative: boolean;
	isIOS: boolean;
	isAndroid: boolean;
	isWeb: boolean;
	isPWA: boolean;
	isTablet: boolean;
	isDarkMode: boolean;
	hasNotch: boolean;
	platform: string;
}

export interface PlatformFeatures {
	hasBiometric: boolean;
	hasCamera: boolean;
	hasHaptics: boolean;
	hasStatusBar: boolean;
	hasKeyboard: boolean;
	hasSafeArea: boolean;
}

/**
 * Hook for platform detection and native UI adaptations
 */
export const usePlatform = () => {
	const [platformInfo, setPlatformInfo] = useState<PlatformInfo>({
		isNative: Capacitor.isNativePlatform(),
		isIOS: false,
		isAndroid: false,
		isWeb: !Capacitor.isNativePlatform(),
		isPWA: false,
		isTablet: false,
		isDarkMode: false,
		hasNotch: false,
		platform: 'web',
	});

	const [platformFeatures, setPlatformFeatures] = useState<PlatformFeatures>({
		hasBiometric: false,
		hasCamera: false,
		hasHaptics: false,
		hasStatusBar: false,
		hasKeyboard: false,
		hasSafeArea: false,
	});

	useEffect(() => {
		const detectPlatform = async () => {
			try {
				const info = await Device.getInfo();
				const isIOS = info.platform === 'ios';
				const isAndroid = info.platform === 'android';
				const isWeb = info.platform === 'web';

				// Check if PWA
				const isPWA =
					window.matchMedia('(display-mode: standalone)').matches ||
					(window.navigator as unknown).standalone === true;

				// Check if tablet
				const isTablet =
					(isIOS && info.model?.includes('iPad')) ||
					(isAndroid && info.model?.toLowerCase().includes('tablet')) ||
					(isWeb && window.innerWidth >= 768);

				// Check dark mode
				const isDarkMode = window.matchMedia(
					'(prefers-color-scheme: dark)'
				).matches;

				// Check for notch (iPhone X and later)
				const hasNotch =
					isIOS &&
					(info.model?.includes('iPhone X') ||
						info.model?.includes('iPhone 11') ||
						info.model?.includes('iPhone 12') ||
						info.model?.includes('iPhone 13') ||
						info.model?.includes('iPhone 14') ||
						info.model?.includes('iPhone 15'));

				setPlatformInfo({
					isNative: Capacitor.isNativePlatform(),
					isIOS,
					isAndroid,
					isWeb,
					isPWA,
					isTablet,
					isDarkMode,
					hasNotch,
					platform: info.platform,
				});

				// Detect features
				setPlatformFeatures({
					hasBiometric: Capacitor.isPluginAvailable('BiometricAuth'),
					hasCamera:
						Capacitor.isPluginAvailable('Camera') ||
						Capacitor.isPluginAvailable('BarcodeScanner'),
					hasHaptics: Capacitor.isPluginAvailable('Haptics'),
					hasStatusBar: Capacitor.isPluginAvailable('StatusBar'),
					hasKeyboard: Capacitor.isPluginAvailable('Keyboard'),
					hasSafeArea:
						isIOS || (isAndroid && parseInt(info.osVersion || '0') >= 9),
				});
			} catch (error) {
				console.error('Failed to detect platform:', error);
			}
		};

		detectPlatform();

		// Listen for color scheme changes
		const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
		const handleDarkModeChange = (e: MediaQueryListEvent) => {
			setPlatformInfo((prev) => ({ ...prev, isDarkMode: e.matches }));
		};
		darkModeQuery.addEventListener('change', handleDarkModeChange);

		return () => {
			darkModeQuery.removeEventListener('change', handleDarkModeChange);
		};
	}, []);

	/**
	 * Set status bar style
	 */
	const setStatusBarStyle = async (style: 'dark' | 'light' | 'auto') => {
		if (!platformFeatures.hasStatusBar) return;

		try {
			// if (style === 'auto') {
			//   await StatusBar.setStyle({
			//     style: platformInfo.isDarkMode ? Style.Dark : Style.Light,
			//   });
			// } else {
			//   await StatusBar.setStyle({
			//     style: style === 'dark' ? Style.Dark : Style.Light,
			//   });
			// }
		} catch (error) {
			console.error('Failed to set status bar style:', error);
		}
	};

	/**
	 * Set status bar background color (Android only)
	 */
	const setStatusBarColor = async (color: string) => {
		if (!platformFeatures.hasStatusBar || !platformInfo.isAndroid) return;

		try {
			// await StatusBar.setBackgroundColor({ color });
		} catch (error) {
			console.error('Failed to set status bar color:', error);
		}
	};

	/**
	 * Hide/show status bar
	 */
	const setStatusBarVisibility = async (visible: boolean) => {
		if (!platformFeatures.hasStatusBar) return;

		try {
			// if (visible) {
			//   await StatusBar.show();
			// } else {
			//   await StatusBar.hide();
			// }
		} catch (error) {
			console.error('Failed to set status bar visibility:', error);
		}
	};

	/**
	 * Setup keyboard listeners
	 */
	const setupKeyboardListeners = (
		onShow?: (height: number) => void,
		onHide?: () => void
	) => {
		if (!platformFeatures.hasKeyboard) return () => {};

		// const showListener = Keyboard.addListener('keyboardWillShow', (info: any) => {
		//   onShow?.(info.keyboardHeight);
		// });

		// const hideListener = Keyboard.addListener('keyboardWillHide', () => {
		//   onHide?.();
		// });

		return () => {
			// showListener.remove();
			// hideListener.remove();
		};
	};

	/**
	 * Handle back button (Android)
	 */
	const setupBackButtonHandler = (
		handler: () => boolean | Promise<boolean>
	) => {
		if (!platformInfo.isAndroid) return () => {};

		const listener = App.addListener('backButton', async ({ canGoBack }) => {
			const handled = await handler();
			if (!handled && !canGoBack) {
				App.exitApp();
			}
		});

		return () => listener.remove();
	};

	/**
	 * Get safe area insets
	 */
	const getSafeAreaInsets = () => {
		const root = document.documentElement;
		const style = getComputedStyle(root);

		return {
			top: parseInt(style.getPropertyValue('--safe-area-inset-top') || '0'),
			right: parseInt(style.getPropertyValue('--safe-area-inset-right') || '0'),
			bottom: parseInt(
				style.getPropertyValue('--safe-area-inset-bottom') || '0'
			),
			left: parseInt(style.getPropertyValue('--safe-area-inset-left') || '0'),
		};
	};

	/**
	 * Apply platform-specific CSS classes
	 */
	useEffect(() => {
		const root = document.documentElement;

		// Remove all platform classes
		root.classList.remove(
			'ios',
			'android',
			'web',
			'native',
			'pwa',
			'tablet',
			'notch'
		);

		// Add current platform classes
		if (platformInfo.isIOS) root.classList.add('ios');
		if (platformInfo.isAndroid) root.classList.add('android');
		if (platformInfo.isWeb) root.classList.add('web');
		if (platformInfo.isNative) root.classList.add('native');
		if (platformInfo.isPWA) root.classList.add('pwa');
		if (platformInfo.isTablet) root.classList.add('tablet');
		if (platformInfo.hasNotch) root.classList.add('notch');
	}, [platformInfo]);

	return {
		...platformInfo,
		features: platformFeatures,
		setStatusBarStyle,
		setStatusBarColor,
		setStatusBarVisibility,
		setupKeyboardListeners,
		setupBackButtonHandler,
		getSafeAreaInsets,
	};
};
