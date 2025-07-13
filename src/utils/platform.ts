/**
 * Platform detection utilities
 * @module utils/platform
 */

import { Capacitor } from '@capacitor/core';

/**
 * Check if running on a specific platform
 */
export function isPlatform(platform: 'ios' | 'android' | 'web'): boolean {
  return Capacitor.getPlatform() === platform;
}

/**
 * Get current platform
 */
export function getPlatform(): 'ios' | 'android' | 'web' {
  return Capacitor.getPlatform() as 'ios' | 'android' | 'web';
}

/**
 * Check if running on mobile (iOS or Android)
 */
export function isMobile(): boolean {
  return isPlatform('ios') || isPlatform('android');
}

/**
 * Check if running as native app
 */
export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Check if running in browser
 */
export function isWeb(): boolean {
  return isPlatform('web');
}

/**
 * Check if device has notch (iPhone X and later)
 */
export function hasNotch(): boolean {
  if (!isPlatform('ios')) return false;
  
  // Check for iPhone X and later models
  const { width, height } = window.screen;
  const aspectRatio = height / width;
  
  // iPhone X and later have aspect ratio around 2.16
  return aspectRatio > 2.1;
}

/**
 * Get safe area insets
 */
export function getSafeAreaInsets(): {
  top: number;
  bottom: number;
  left: number;
  right: number;
} {
  // Default insets
  const insets = { top: 0, bottom: 0, left: 0, right: 0 };
  
  if (isPlatform('ios') && hasNotch()) {
    insets.top = 44; // Status bar + notch
    insets.bottom = 34; // Home indicator
  } else if (isPlatform('ios')) {
    insets.top = 20; // Status bar only
  } else if (isPlatform('android')) {
    insets.top = 24; // Status bar
  }
  
  return insets;
}