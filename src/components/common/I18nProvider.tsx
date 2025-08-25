import React, { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { getI18n } from '@/i18n';
import CrossPlatformLocalization from '@/utils/cross-platform-i18n';
import { AutoLanguageDetector } from '@/components/common/LanguageSwitcher';
import LoadingScreen from '@/components/common/LoadingScreen';

interface I18nProviderProps {
  children: React.ReactNode;
}

/**
 * I18n Provider component that initializes internationalization system
 * Handles cross-platform localization and automatic language detection
 */
export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  const [i18n, setI18n] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeI18n = async () => {
      try {
        setLoading(true);
        setError(null);

        // Initialize cross-platform localization
        const { language, timezone, locale } = await CrossPlatformLocalization.initialize();
        
        console.log('🌍 Initializing i18n with:', { language, timezone, locale });

        // Initialize i18next
        const i18nInstance = await getI18n();
        
        // Set the detected language
        if (i18nInstance.language !== language) {
          await i18nInstance.changeLanguage(language);
        }

        setI18n(i18nInstance);
        
        // Listen for language changes from other components
        const handleLanguageChange = async (event: CustomEvent) => {
          const { language: newLanguage } = event.detail;
          console.log('🌍 Language change detected:', newLanguage);
          
          try {
            await CrossPlatformLocalization.changeLanguage(newLanguage, i18nInstance);
          } catch (error) {
            console.error('Failed to change language:', error);
            setError('Failed to change language');
          }
        };

        window.addEventListener('cross-platform-language-change', handleLanguageChange as EventListener);
        
        // Cleanup
        return () => {
          window.removeEventListener('cross-platform-language-change', handleLanguageChange as EventListener);
        };
      } catch (error) {
        console.error('Failed to initialize i18n:', error);
        setError(error instanceof Error ? error.message : 'Failed to initialize i18n');
        
        // Fallback: try to create a basic i18n instance
        try {
          const fallbackI18n = await getI18n();
          setI18n(fallbackI18n);
        } catch (fallbackError) {
          console.error('Failed to create fallback i18n:', fallbackError);
        }
      } finally {
        setLoading(false);
      }
    };

    initializeI18n();
  }, []);

  // Show loading screen while initializing
  if (loading || !i18n) {
    return <LoadingScreen />;
  }

  // Show error state if initialization failed
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">
            Initialization Error
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <I18nextProvider i18n={i18n}>
      <AutoLanguageDetector />
      {children}
    </I18nextProvider>
  );
};

export default I18nProvider;