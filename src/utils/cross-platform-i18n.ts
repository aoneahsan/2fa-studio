/**
 * Cross-platform localization utilities
 * Handles localization across Web, iOS, Android, and Browser Extension
 */

import { Capacitor } from '@capacitor/core';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '@/i18n';

/**
 * Platform detection utilities
 */
export const Platform = {
  isWeb: !Capacitor.isNativePlatform(),
  isMobile: Capacitor.isNativePlatform(),
  isIOS: Capacitor.getPlatform() === 'ios',
  isAndroid: Capacitor.getPlatform() === 'android',
  isExtension: typeof chrome !== 'undefined' && chrome.extension,
  
  get current() {
    if (this.isExtension) return 'extension';
    if (this.isIOS) return 'ios';
    if (this.isAndroid) return 'android';
    return 'web';
  }
};

/**
 * Cross-platform storage interface for language preferences
 */
export class CrossPlatformStorage {
  private static readonly LANGUAGE_KEY = 'user-language-preference';
  private static readonly LOCALE_KEY = 'user-locale-preference';
  
  /**
   * Get stored language preference
   */
  static async getLanguage(): Promise<SupportedLanguage | null> {
    try {
      switch (Platform.current) {
        case 'ios':
        case 'android':
          const { Preferences } = await import('@capacitor/preferences');
          const { value } = await Preferences.get({ key: this.LANGUAGE_KEY });
          return value as SupportedLanguage || null;
          
        case 'extension':
          if (typeof chrome !== 'undefined' && chrome.storage) {
            const result = await chrome.storage.local.get([this.LANGUAGE_KEY]);
            return result[this.LANGUAGE_KEY] || null;
          }
          return null;
          
        case 'web':
        default:
          return localStorage.getItem(this.LANGUAGE_KEY) as SupportedLanguage || null;
      }
    } catch (error) {
      console.warn('Failed to get language preference:', error);
      return null;
    }
  }
  
  /**
   * Store language preference
   */
  static async setLanguage(language: SupportedLanguage): Promise<void> {
    try {
      switch (Platform.current) {
        case 'ios':
        case 'android':
          const { Preferences } = await import('@capacitor/preferences');
          await Preferences.set({ key: this.LANGUAGE_KEY, value: language });
          break;
          
        case 'extension':
          if (typeof chrome !== 'undefined' && chrome.storage) {
            await chrome.storage.local.set({ [this.LANGUAGE_KEY]: language });
          }
          break;
          
        case 'web':
        default:
          localStorage.setItem(this.LANGUAGE_KEY, language);
          break;
      }
    } catch (error) {
      console.warn('Failed to set language preference:', error);
    }
  }
  
  /**
   * Get stored locale preference
   */
  static async getLocale(): Promise<string | null> {
    try {
      switch (Platform.current) {
        case 'ios':
        case 'android':
          const { Preferences } = await import('@capacitor/preferences');
          const { value } = await Preferences.get({ key: this.LOCALE_KEY });
          return value || null;
          
        case 'extension':
          if (typeof chrome !== 'undefined' && chrome.storage) {
            const result = await chrome.storage.local.get([this.LOCALE_KEY]);
            return result[this.LOCALE_KEY] || null;
          }
          return null;
          
        case 'web':
        default:
          return localStorage.getItem(this.LOCALE_KEY);
      }
    } catch (error) {
      console.warn('Failed to get locale preference:', error);
      return null;
    }
  }
  
  /**
   * Store locale preference
   */
  static async setLocale(locale: string): Promise<void> {
    try {
      switch (Platform.current) {
        case 'ios':
        case 'android':
          const { Preferences } = await import('@capacitor/preferences');
          await Preferences.set({ key: this.LOCALE_KEY, value: locale });
          break;
          
        case 'extension':
          if (typeof chrome !== 'undefined' && chrome.storage) {
            await chrome.storage.local.set({ [this.LOCALE_KEY]: locale });
          }
          break;
          
        case 'web':
        default:
          localStorage.setItem(this.LOCALE_KEY, locale);
          break;
      }
    } catch (error) {
      console.warn('Failed to set locale preference:', error);
    }
  }
}

/**
 * Platform-specific language detection
 */
export class LanguageDetector {
  /**
   * Get system language
   */
  static async getSystemLanguage(): Promise<SupportedLanguage> {
    try {
      let systemLanguage: string | null = null;
      
      switch (Platform.current) {
        case 'ios':
        case 'android':
          // Try to get device language
          try {
            const { Device } = await import('@capacitor/device');
            const info = await Device.getLanguageCode();
            systemLanguage = info.value;
          } catch (error) {
            console.warn('Failed to get device language:', error);
          }
          break;
          
        case 'extension':
          // Get browser language for extension
          if (typeof chrome !== 'undefined' && chrome.i18n) {
            systemLanguage = chrome.i18n.getUILanguage();
          }
          break;
          
        case 'web':
        default:
          // Get browser language
          systemLanguage = navigator.language || navigator.languages?.[0];
          break;
      }
      
      // Normalize and validate language code
      if (systemLanguage) {
        const normalizedLang = systemLanguage.split('-')[0].toLowerCase();
        if (Object.keys(SUPPORTED_LANGUAGES).includes(normalizedLang)) {
          return normalizedLang as SupportedLanguage;
        }
      }
      
      return 'en'; // Default fallback
    } catch (error) {
      console.warn('System language detection failed:', error);
      return 'en';
    }
  }
  
  /**
   * Get preferred languages in priority order
   */
  static async getPreferredLanguages(): Promise<SupportedLanguage[]> {
    const preferred: SupportedLanguage[] = [];
    
    try {
      // First, check stored preference
      const storedLanguage = await CrossPlatformStorage.getLanguage();
      if (storedLanguage) {
        preferred.push(storedLanguage);
      }
      
      // Then, check system language
      const systemLanguage = await this.getSystemLanguage();
      if (!preferred.includes(systemLanguage)) {
        preferred.push(systemLanguage);
      }
      
      // Add English as fallback if not already included
      if (!preferred.includes('en')) {
        preferred.push('en');
      }
      
      return preferred;
    } catch (error) {
      console.warn('Failed to get preferred languages:', error);
      return ['en'];
    }
  }
}

/**
 * Platform-specific timezone detection
 */
export class TimezoneDetector {
  /**
   * Get system timezone
   */
  static async getSystemTimezone(): Promise<string> {
    try {
      switch (Platform.current) {
        case 'ios':
        case 'android':
          // Try to get device timezone
          try {
            const { Device } = await import('@capacitor/device');
            const info = await Device.getTimezone();
            return info.value || Intl.DateTimeFormat().resolvedOptions().timeZone;
          } catch (error) {
            console.warn('Failed to get device timezone:', error);
          }
          break;
          
        case 'extension':
        case 'web':
        default:
          return Intl.DateTimeFormat().resolvedOptions().timeZone;
      }
      
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (error) {
      console.warn('Timezone detection failed:', error);
      return 'UTC';
    }
  }
}

/**
 * Platform-specific number formatting
 */
export class PlatformNumberFormat {
  /**
   * Format number according to platform conventions
   */
  static format(
    number: number,
    locale: string,
    options?: Intl.NumberFormatOptions
  ): string {
    try {
      return new Intl.NumberFormat(locale, options).format(number);
    } catch (error) {
      console.warn('Number formatting failed:', error);
      return number.toString();
    }
  }
  
  /**
   * Format currency with platform-specific handling
   */
  static formatCurrency(
    amount: number,
    currency: string,
    locale: string,
    options?: Intl.NumberFormatOptions
  ): string {
    try {
      // Platform-specific currency formatting adjustments
      const platformOptions = { ...options };
      
      if (Platform.isIOS) {
        // iOS prefers shorter currency symbols
        platformOptions.currencyDisplay = 'symbol';
      } else if (Platform.isAndroid) {
        // Android handles currency display well with default settings
        platformOptions.currencyDisplay = 'symbol';
      }
      
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        ...platformOptions
      }).format(amount);
    } catch (error) {
      console.warn('Currency formatting failed:', error);
      return `${currency} ${amount}`;
    }
  }
}

/**
 * Platform-specific date formatting
 */
export class PlatformDateFormat {
  /**
   * Format date according to platform conventions
   */
  static format(
    date: Date | string | number,
    locale: string,
    options?: Intl.DateTimeFormatOptions
  ): string {
    try {
      const dateObj = new Date(date);
      
      // Platform-specific date formatting adjustments
      const platformOptions = { ...options };
      
      if (Platform.isMobile) {
        // Mobile prefers shorter date formats
        if (!platformOptions.dateStyle && !platformOptions.timeStyle) {
          platformOptions.dateStyle = 'medium';
        }
      }
      
      return new Intl.DateTimeFormat(locale, platformOptions).format(dateObj);
    } catch (error) {
      console.warn('Date formatting failed:', error);
      return new Date(date).toLocaleDateString();
    }
  }
  
  /**
   * Format relative time with platform-specific handling
   */
  static formatRelative(
    date: Date | string | number,
    locale: string,
    options?: Intl.RelativeTimeFormatOptions
  ): string {
    try {
      const now = new Date();
      const target = new Date(date);
      const diffInSeconds = Math.floor((target.getTime() - now.getTime()) / 1000);
      
      const rtf = new Intl.RelativeTimeFormat(locale, {
        numeric: 'auto',
        style: Platform.isMobile ? 'short' : 'long', // Shorter on mobile
        ...options
      });
      
      // Determine appropriate unit
      const absDiff = Math.abs(diffInSeconds);
      
      if (absDiff < 60) {
        return rtf.format(diffInSeconds, 'second');
      } else if (absDiff < 3600) {
        return rtf.format(Math.round(diffInSeconds / 60), 'minute');
      } else if (absDiff < 86400) {
        return rtf.format(Math.round(diffInSeconds / 3600), 'hour');
      } else if (absDiff < 2592000) {
        return rtf.format(Math.round(diffInSeconds / 86400), 'day');
      } else if (absDiff < 31536000) {
        return rtf.format(Math.round(diffInSeconds / 2592000), 'month');
      } else {
        return rtf.format(Math.round(diffInSeconds / 31536000), 'year');
      }
    } catch (error) {
      console.warn('Relative time formatting failed:', error);
      return this.format(date, locale);
    }
  }
}

/**
 * Platform-specific text direction handling
 */
export class PlatformTextDirection {
  /**
   * Set document text direction
   */
  static setDocumentDirection(language: SupportedLanguage): void {
    try {
      const langConfig = SUPPORTED_LANGUAGES[language];
      const direction = langConfig?.rtl ? 'rtl' : 'ltr';
      
      // Set HTML attributes
      document.documentElement.setAttribute('dir', direction);
      document.documentElement.setAttribute('lang', language);
      
      // Platform-specific handling
      if (Platform.isExtension) {
        // Extension-specific CSS class for styling
        document.body.classList.toggle('rtl', langConfig?.rtl || false);
      }
      
      if (Platform.isMobile) {
        // Mobile-specific viewport adjustments
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport && langConfig?.rtl) {
          // Some RTL optimizations for mobile
          viewport.setAttribute('content', 
            viewport.getAttribute('content') + ', direction=rtl'
          );
        }
      }
    } catch (error) {
      console.warn('Failed to set document direction:', error);
    }
  }
  
  /**
   * Get CSS class names for RTL support
   */
  static getRTLClasses(language: SupportedLanguage): string[] {
    const langConfig = SUPPORTED_LANGUAGES[language];
    const classes: string[] = [];
    
    if (langConfig?.rtl) {
      classes.push('rtl');
      
      // Platform-specific RTL classes
      if (Platform.isIOS) {
        classes.push('rtl-ios');
      } else if (Platform.isAndroid) {
        classes.push('rtl-android');
      } else if (Platform.isExtension) {
        classes.push('rtl-extension');
      } else {
        classes.push('rtl-web');
      }
    }
    
    return classes;
  }
}

/**
 * Cross-platform notification localization
 */
export class PlatformNotifications {
  /**
   * Show localized notification
   */
  static async showNotification(
    titleKey: string,
    messageKey: string,
    t: (key: string, options?: any) => string,
    options?: any
  ): Promise<void> {
    try {
      const title = t(titleKey, options);
      const message = t(messageKey, options);
      
      switch (Platform.current) {
        case 'ios':
        case 'android':
          // Use Capacitor Local Notifications
          try {
            const { LocalNotifications } = await import('@capacitor/local-notifications');
            await LocalNotifications.schedule({
              notifications: [{
                title,
                body: message,
                id: Date.now(),
                schedule: { at: new Date(Date.now() + 1000) }
              }]
            });
          } catch (error) {
            console.warn('Failed to show mobile notification:', error);
          }
          break;
          
        case 'extension':
          // Use Chrome notifications API
          if (typeof chrome !== 'undefined' && chrome.notifications) {
            await chrome.notifications.create({
              type: 'basic',
              iconUrl: '/icons/icon-48.png',
              title,
              message
            });
          }
          break;
          
        case 'web':
        default:
          // Use Web Notifications API
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body: message });
          }
          break;
      }
    } catch (error) {
      console.warn('Failed to show platform notification:', error);
    }
  }
}

/**
 * Main cross-platform localization manager
 */
export class CrossPlatformLocalization {
  /**
   * Initialize cross-platform localization
   */
  static async initialize(): Promise<{
    language: SupportedLanguage;
    timezone: string;
    locale: string;
  }> {
    try {
      // Detect preferred language
      const preferredLanguages = await LanguageDetector.getPreferredLanguages();
      const language = preferredLanguages[0];
      
      // Detect timezone
      const timezone = await TimezoneDetector.getSystemTimezone();
      
      // Get or create locale
      let locale = await CrossPlatformStorage.getLocale();
      if (!locale) {
        const langConfig = SUPPORTED_LANGUAGES[language];
        locale = langConfig?.numberFormat || 'en-US';
        await CrossPlatformStorage.setLocale(locale);
      }
      
      // Set document direction
      PlatformTextDirection.setDocumentDirection(language);
      
      return { language, timezone, locale };
    } catch (error) {
      console.error('Cross-platform localization initialization failed:', error);
      
      // Fallback to defaults
      return {
        language: 'en',
        timezone: 'UTC',
        locale: 'en-US'
      };
    }
  }
  
  /**
   * Change language across all platforms
   */
  static async changeLanguage(
    language: SupportedLanguage,
    i18n: any
  ): Promise<boolean> {
    try {
      // Store preference
      await CrossPlatformStorage.setLanguage(language);
      
      // Update i18n
      await i18n.changeLanguage(language);
      
      // Update document direction
      PlatformTextDirection.setDocumentDirection(language);
      
      // Update locale if needed
      const langConfig = SUPPORTED_LANGUAGES[language];
      const newLocale = langConfig?.numberFormat || 'en-US';
      await CrossPlatformStorage.setLocale(newLocale);
      
      // Trigger platform-specific updates
      window.dispatchEvent(new CustomEvent('cross-platform-language-change', {
        detail: { language, locale: newLocale }
      }));
      
      return true;
    } catch (error) {
      console.error('Failed to change language:', error);
      return false;
    }
  }
}

export default CrossPlatformLocalization;