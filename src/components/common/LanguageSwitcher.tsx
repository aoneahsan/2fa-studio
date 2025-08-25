import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, GlobeAltIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useLocalization, useLanguageSwitcher } from '@/hooks/useLocalization';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '@/i18n';
import { clsx } from 'clsx';

interface LanguageSwitcherProps {
  variant?: 'dropdown' | 'inline' | 'compact';
  placement?: 'bottom' | 'top' | 'left' | 'right';
  showFlag?: boolean;
  showName?: boolean;
  showNativeName?: boolean;
  className?: string;
}

/**
 * Language switcher component with multiple variants and automatic language detection
 */
export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  variant = 'dropdown',
  placement = 'bottom',
  showFlag = true,
  showName = true,
  showNativeName = false,
  className = ''
}) => {
  const { t, currentLanguage, isRTL } = useLocalization();
  const { switchLanguage, isChanging, availableLanguages } = useLanguageSwitcher();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Handle language change
  const handleLanguageChange = async (languageCode: SupportedLanguage) => {
    setIsOpen(false);
    
    try {
      const result = await switchLanguage(languageCode);
      if (!result.success) {
        console.error('Failed to switch language:', result.error);
        // Could show toast notification here
      }
    } catch (error) {
      console.error('Language switch error:', error);
    }
  };

  // Get display text for current language
  const getCurrentLanguageDisplay = () => {
    const parts = [];
    
    if (showFlag && currentLanguage.flag) {
      parts.push(currentLanguage.flag);
    }
    
    if (showNativeName) {
      parts.push(currentLanguage.name);
    } else if (showName) {
      parts.push(currentLanguage.englishName);
    }
    
    return parts.join(' ');
  };

  // Get display text for a language option
  const getLanguageDisplay = (lang: typeof currentLanguage) => {
    const parts = [];
    
    if (showFlag && lang.flag) {
      parts.push(lang.flag);
    }
    
    if (showNativeName) {
      parts.push(`${lang.name} (${lang.englishName})`);
    } else {
      parts.push(lang.englishName);
    }
    
    return parts.join(' ');
  };

  // Dropdown variant
  if (variant === 'dropdown') {
    return (
      <div className={clsx('relative', className)}>
        <button
          ref={buttonRef}
          type="button"
          className={clsx(
            'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg',
            'border border-gray-300 dark:border-gray-600',
            'bg-white dark:bg-gray-800',
            'text-gray-700 dark:text-gray-300',
            'hover:bg-gray-50 dark:hover:bg-gray-700',
            'focus:outline-none focus:ring-2 focus:ring-blue-500',
            'transition-colors duration-200',
            isChanging && 'opacity-50 cursor-not-allowed',
            isRTL && 'flex-row-reverse'
          )}
          onClick={() => setIsOpen(!isOpen)}
          disabled={isChanging}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-label={t('settings.appearance.language.change')}
        >
          {variant !== 'compact' && <GlobeAltIcon className="w-4 h-4" />}
          <span>{getCurrentLanguageDisplay()}</span>
          <ChevronDownIcon
            className={clsx(
              'w-4 h-4 transition-transform duration-200',
              isOpen && 'rotate-180'
            )}
          />
        </button>

        {isOpen && (
          <div
            ref={dropdownRef}
            className={clsx(
              'absolute z-50 mt-1 min-w-[200px] max-w-xs',
              'bg-white dark:bg-gray-800',
              'border border-gray-200 dark:border-gray-700',
              'rounded-lg shadow-lg',
              'py-1',
              'max-h-60 overflow-y-auto',
              placement === 'top' && 'bottom-full mb-1',
              placement === 'left' && 'right-0',
              placement === 'right' && 'left-0',
              isRTL && placement === 'left' && 'left-0 right-auto',
              isRTL && placement === 'right' && 'right-0 left-auto'
            )}
            role="listbox"
            aria-label={t('settings.appearance.language.available')}
          >
            {availableLanguages.map((lang) => (
              <button
                key={lang.code}
                type="button"
                className={clsx(
                  'w-full flex items-center gap-3 px-4 py-2 text-sm',
                  'hover:bg-gray-100 dark:hover:bg-gray-700',
                  'transition-colors duration-150',
                  lang.code === currentLanguage.code &&
                    'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
                  isRTL && 'flex-row-reverse text-right'
                )}
                onClick={() => handleLanguageChange(lang.code as SupportedLanguage)}
                role="option"
                aria-selected={lang.code === currentLanguage.code}
              >
                <div className="flex items-center gap-2 flex-1">
                  {showFlag && lang.flag && (
                    <span className="text-lg">{lang.flag}</span>
                  )}
                  <div className={clsx('flex flex-col', isRTL && 'items-end')}>
                    <span className="font-medium">{lang.name}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {lang.englishName}
                    </span>
                  </div>
                </div>
                {lang.code === currentLanguage.code && (
                  <CheckIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Inline variant (radio buttons)
  if (variant === 'inline') {
    return (
      <div className={clsx('space-y-2', className)}>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('settings.appearance.language.title')}
        </label>
        <div className="space-y-2">
          {availableLanguages.map((lang) => (
            <label
              key={lang.code}
              className={clsx(
                'flex items-center gap-3 p-3 rounded-lg cursor-pointer',
                'border border-gray-200 dark:border-gray-700',
                'hover:bg-gray-50 dark:hover:bg-gray-800',
                'transition-colors duration-150',
                lang.code === currentLanguage.code &&
                  'border-blue-500 bg-blue-50 dark:bg-blue-900/20',
                isChanging && 'opacity-50 cursor-not-allowed',
                isRTL && 'flex-row-reverse'
              )}
            >
              <input
                type="radio"
                name="language"
                value={lang.code}
                checked={lang.code === currentLanguage.code}
                onChange={() => handleLanguageChange(lang.code as SupportedLanguage)}
                disabled={isChanging}
                className={clsx(
                  'w-4 h-4 text-blue-600 border-gray-300',
                  'focus:ring-blue-500 focus:ring-2',
                  isChanging && 'opacity-50'
                )}
              />
              <div className={clsx('flex items-center gap-2 flex-1', isRTL && 'flex-row-reverse')}>
                {showFlag && lang.flag && (
                  <span className="text-lg">{lang.flag}</span>
                )}
                <div className={clsx('flex flex-col', isRTL && 'items-end')}>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {lang.name}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {lang.englishName}
                  </span>
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>
    );
  }

  // Compact variant (just current language, clickable)
  return (
    <button
      type="button"
      className={clsx(
        'flex items-center gap-1 px-2 py-1 text-xs font-medium rounded',
        'text-gray-600 dark:text-gray-400',
        'hover:text-gray-800 dark:hover:text-gray-200',
        'hover:bg-gray-100 dark:hover:bg-gray-800',
        'transition-colors duration-150',
        isChanging && 'opacity-50 cursor-not-allowed',
        className
      )}
      onClick={() => setIsOpen(!isOpen)}
      disabled={isChanging}
      aria-label={t('settings.appearance.language.change')}
    >
      {showFlag && currentLanguage.flag && (
        <span className="text-sm">{currentLanguage.flag}</span>
      )}
      <span>{showNativeName ? currentLanguage.name : currentLanguage.code.toUpperCase()}</span>
    </button>
  );
};

/**
 * Auto language detector component
 * Automatically detects and sets the user's preferred language on first visit
 */
export const AutoLanguageDetector: React.FC = () => {
  const { i18n } = useLocalization();
  
  useEffect(() => {
    const detectAndSetLanguage = async () => {
      // Skip if language is already set
      if (i18n.language && i18n.language !== 'cimode') {
        return;
      }

      try {
        // Get browser languages
        const browserLanguages = navigator.languages || [navigator.language];
        
        // Find the first supported language
        for (const browserLang of browserLanguages) {
          const langCode = browserLang.split('-')[0];
          if (Object.keys(SUPPORTED_LANGUAGES).includes(langCode)) {
            await i18n.changeLanguage(langCode);
            return;
          }
        }
        
        // Fallback to English if no supported language is found
        await i18n.changeLanguage('en');
      } catch (error) {
        console.error('Auto language detection failed:', error);
        // Fallback to English
        i18n.changeLanguage('en');
      }
    };

    detectAndSetLanguage();
  }, [i18n]);

  return null; // This component doesn't render anything
};

/**
 * Language indicator component (shows current language without switching capability)
 */
export const LanguageIndicator: React.FC<{
  showFlag?: boolean;
  showCode?: boolean;
  className?: string;
}> = ({ showFlag = true, showCode = true, className = '' }) => {
  const { currentLanguage } = useLocalization();
  
  return (
    <div className={clsx('flex items-center gap-1 text-sm', className)}>
      {showFlag && currentLanguage.flag && (
        <span>{currentLanguage.flag}</span>
      )}
      {showCode && (
        <span className="font-medium">
          {currentLanguage.code.toUpperCase()}
        </span>
      )}
    </div>
  );
};

export default LanguageSwitcher;