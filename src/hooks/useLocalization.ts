import { useTranslation } from 'react-i18next';
import { useCallback, useMemo } from 'react';
import { SUPPORTED_LANGUAGES, SupportedLanguage, LanguageConfig, TranslationNamespace } from '@/i18n';

/**
 * Enhanced localization hook with additional utilities
 */
export function useLocalization(namespace?: TranslationNamespace) {
  const { t, i18n } = useTranslation(namespace);
  
  // Get current language configuration
  const currentLanguage = useMemo((): LanguageConfig => {
    const lng = i18n.language as SupportedLanguage;
    return SUPPORTED_LANGUAGES[lng] || SUPPORTED_LANGUAGES.en;
  }, [i18n.language]);
  
  // Check if current language is RTL
  const isRTL = useMemo(() => currentLanguage.rtl, [currentLanguage.rtl]);
  
  // Change language function
  const changeLanguage = useCallback(async (language: SupportedLanguage) => {
    try {
      await i18n.changeLanguage(language);
      
      // Trigger custom event for components that need to know about language changes
      window.dispatchEvent(new CustomEvent('languageChanged', { 
        detail: { 
          language, 
          config: SUPPORTED_LANGUAGES[language] 
        } 
      }));
      
      return true;
    } catch (error) {
      console.error('Failed to change language:', error);
      return false;
    }
  }, [i18n]);
  
  // Format number according to current locale
  const formatNumber = useCallback((value: number, options?: Intl.NumberFormatOptions) => {
    return new Intl.NumberFormat(currentLanguage.numberFormat, options).format(value);
  }, [currentLanguage.numberFormat]);
  
  // Format currency according to current locale
  const formatCurrency = useCallback((value: number, currency?: string, options?: Intl.NumberFormatOptions) => {
    return new Intl.NumberFormat(currentLanguage.numberFormat, {
      style: 'currency',
      currency: currency || currentLanguage.currencyFormat,
      ...options
    }).format(value);
  }, [currentLanguage.numberFormat, currentLanguage.currencyFormat]);
  
  // Format date according to current locale
  const formatDate = useCallback((date: Date | string | number, options?: Intl.DateTimeFormatOptions) => {
    return new Intl.DateTimeFormat(currentLanguage.numberFormat, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...options
    }).format(new Date(date));
  }, [currentLanguage.numberFormat]);
  
  // Format relative time (e.g., "2 hours ago")
  const formatRelativeTime = useCallback((date: Date | string | number) => {
    const now = new Date();
    const target = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - target.getTime()) / 1000);
    
    const rtf = new Intl.RelativeTimeFormat(currentLanguage.numberFormat, { 
      numeric: 'auto',
      style: 'long'
    });
    
    if (Math.abs(diffInSeconds) < 60) {
      return rtf.format(-diffInSeconds, 'second');
    }
    if (Math.abs(diffInSeconds) < 3600) {
      return rtf.format(-Math.floor(diffInSeconds / 60), 'minute');
    }
    if (Math.abs(diffInSeconds) < 86400) {
      return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour');
    }
    if (Math.abs(diffInSeconds) < 2592000) {
      return rtf.format(-Math.floor(diffInSeconds / 86400), 'day');
    }
    if (Math.abs(diffInSeconds) < 31536000) {
      return rtf.format(-Math.floor(diffInSeconds / 2592000), 'month');
    }
    return rtf.format(-Math.floor(diffInSeconds / 31536000), 'year');
  }, [currentLanguage.numberFormat]);
  
  // Get text direction for CSS
  const textDirection = useMemo(() => isRTL ? 'rtl' : 'ltr', [isRTL]);
  
  // Get all available languages
  const availableLanguages = useMemo(() => Object.values(SUPPORTED_LANGUAGES), []);
  
  // Get current language code
  const currentLanguageCode = useMemo(() => i18n.language as SupportedLanguage, [i18n.language]);
  
  // Translation function with type safety for interpolation
  const translate = useCallback((key: string, options?: any) => {
    return t(key, options);
  }, [t]);
  
  // Pluralization helper
  const pluralize = useCallback((count: number, key: string, options?: any) => {
    return t(key, { count, ...options });
  }, [t]);
  
  // Context-aware translation
  const translateContext = useCallback((key: string, context: string, options?: any) => {
    return t(`${key}_${context}`, options);
  }, [t]);
  
  // Check if translation exists
  const hasTranslation = useCallback((key: string, namespace?: string) => {
    return i18n.exists(key, { ns: namespace });
  }, [i18n]);
  
  // Get translation with fallback
  const translateWithFallback = useCallback((key: string, fallback: string, options?: any) => {
    const translation = t(key, options);
    return translation === key ? fallback : translation;
  }, [t]);
  
  return {
    // Core i18n functions
    t: translate,
    i18n,
    
    // Language management
    currentLanguage,
    currentLanguageCode,
    availableLanguages,
    changeLanguage,
    
    // Text direction
    isRTL,
    textDirection,
    
    // Formatting utilities
    formatNumber,
    formatCurrency,
    formatDate,
    formatRelativeTime,
    
    // Translation utilities
    pluralize,
    translateContext,
    hasTranslation,
    translateWithFallback,
    
    // Status
    isLoading: !i18n.isInitialized,
    isReady: i18n.isInitialized
  };
}

/**
 * Hook for language switching with loading state
 */
export function useLanguageSwitcher() {
  const { i18n, availableLanguages, currentLanguageCode } = useLocalization();
  
  const switchLanguage = useCallback(async (language: SupportedLanguage) => {
    try {
      await i18n.changeLanguage(language);
      return { success: true, error: null };
    } catch (error) {
      console.error('Language switch failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }, [i18n]);
  
  return {
    currentLanguage: currentLanguageCode,
    availableLanguages,
    switchLanguage,
    isChanging: i18n.isInitialized && !i18n.hasResourceBundle(i18n.language, 'common')
  };
}

/**
 * Hook for getting locale-specific configurations
 */
export function useLocaleConfig() {
  const { currentLanguage, isRTL } = useLocalization();
  
  return {
    locale: currentLanguage.numberFormat,
    currency: currentLanguage.currencyFormat,
    dateFormat: currentLanguage.dateFormat,
    isRTL,
    flag: currentLanguage.flag,
    name: currentLanguage.name,
    englishName: currentLanguage.englishName
  };
}

/**
 * Hook for handling pluralization rules
 */
export function usePluralization() {
  const { t, i18n } = useLocalization();
  
  const plural = useCallback((count: number, key: string, options?: any) => {
    return t(key, { count, ...options });
  }, [t]);
  
  const ordinal = useCallback((number: number, key: string, options?: any) => {
    // Get ordinal rule for current language
    const ordinalRule = new Intl.PluralRules(i18n.language, { type: 'ordinal' });
    const rule = ordinalRule.select(number);
    return t(`${key}_${rule}`, { number, ...options });
  }, [t, i18n.language]);
  
  return { plural, ordinal };
}

export default useLocalization;