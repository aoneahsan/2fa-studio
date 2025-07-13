/**
 * Native-style header component with platform adaptations
 * @module components/mobile/NativeHeader
 */

import React, { useEffect } from 'react';
import { usePlatform } from '@hooks/usePlatform';
import { ChevronLeftIcon, EllipsisVerticalIcon } from '@heroicons/react/24/outline';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

interface NativeHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightActions?: Array<{
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
  }>;
  transparent?: boolean;
  blurred?: boolean;
}

/**
 * Platform-adaptive header component
 */
const NativeHeader: React.FC<NativeHeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightActions = [],
  transparent = false,
  blurred = false
}) => {
  const platform = usePlatform();

  useEffect(() => {
    // Set status bar style based on header
    if (platform.features.hasStatusBar) {
      platform.setStatusBarStyle(transparent ? 'light' : 'auto');
    }
  }, [transparent, platform]);

  const handleBack = async () => {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Light });
    }
    onBack?.();
  };

  const handleAction = async (action: () => void) => {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Light });
    }
    action();
  };

  // iOS style header
  if (platform.isIOS) {
    return (
      <header 
        className={`
          ios-header fixed top-0 left-0 right-0 z-40
          ${transparent ? 'bg-transparent' : 'bg-white dark:bg-gray-900'}
          ${blurred ? 'backdrop-blur-xl' : ''}
          border-b border-gray-200 dark:border-gray-800
          ${platform.hasNotch ? 'pt-safe' : 'pt-0'}
        `}
      >
        <div className="relative h-11 flex items-center px-4">
          {/* Back button */}
          {showBack && (
            <button
              onClick={handleBack}
              className="absolute left-4 flex items-center gap-1 
                       text-primary active:opacity-50 transition-opacity"
              aria-label="Go back"
            >
              <ChevronLeftIcon className="w-6 h-6" />
              <span className="text-[17px]">Back</span>
            </button>
          )}

          {/* Title */}
          <div className="flex-1 text-center">
            <h1 className="text-[17px] font-semibold text-gray-900 dark:text-white">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[11px] text-gray-500 dark:text-gray-400 -mt-0.5">
                {subtitle}
              </p>
            )}
          </div>

          {/* Right actions */}
          {rightActions.length > 0 && (
            <div className="absolute right-4 flex items-center gap-2">
              {rightActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => handleAction(action.onClick)}
                  className="p-2 text-primary active:opacity-50 transition-opacity"
                  aria-label={action.label}
                >
                  {action.icon}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>
    );
  }

  // Android style header
  if (platform.isAndroid) {
    return (
      <header 
        className={`
          android-header fixed top-0 left-0 right-0 z-40
          ${transparent ? 'bg-transparent' : 'bg-white dark:bg-gray-900'}
          ${blurred ? 'backdrop-blur-xl' : ''}
          shadow-sm
          ${platform.features.hasSafeArea ? 'pt-safe' : 'pt-0'}
        `}
      >
        <div className="h-14 flex items-center px-4">
          {/* Back button */}
          {showBack && (
            <button
              onClick={handleBack}
              className="p-2 -ml-2 rounded-full 
                       hover:bg-gray-100 dark:hover:bg-gray-800
                       active:bg-gray-200 dark:active:bg-gray-700
                       transition-colors"
              aria-label="Go back"
            >
              <ChevronLeftIcon className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            </button>
          )}

          {/* Title */}
          <div className="flex-1 ml-4">
            <h1 className="text-xl font-medium text-gray-900 dark:text-white">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {subtitle}
              </p>
            )}
          </div>

          {/* Right actions */}
          {rightActions.length > 0 && (
            <div className="flex items-center -mr-2">
              {rightActions.length === 1 ? (
                rightActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleAction(action.onClick)}
                    className="p-2 rounded-full
                             hover:bg-gray-100 dark:hover:bg-gray-800
                             active:bg-gray-200 dark:active:bg-gray-700
                             transition-colors"
                    aria-label={action.label}
                  >
                    {action.icon}
                  </button>
                ))
              ) : (
                <button
                  onClick={() => {
                    // Show menu
                    handleAction(() => {
                      console.log('Show action menu');
                    });
                  }}
                  className="p-2 rounded-full
                           hover:bg-gray-100 dark:hover:bg-gray-800
                           active:bg-gray-200 dark:active:bg-gray-700
                           transition-colors"
                  aria-label="More options"
                >
                  <EllipsisVerticalIcon className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                </button>
              )}
            </div>
          )}
        </div>
      </header>
    );
  }

  // Web/PWA header
  return (
    <header 
      className={`
        web-header fixed top-0 left-0 right-0 z-40
        ${transparent ? 'bg-transparent' : 'bg-white dark:bg-gray-900'}
        ${blurred ? 'backdrop-blur-xl' : ''}
        border-b border-gray-200 dark:border-gray-800
      `}
    >
      <div className="h-16 flex items-center px-6">
        {/* Back button */}
        {showBack && (
          <button
            onClick={handleBack}
            className="p-2 -ml-2 rounded-lg
                     hover:bg-gray-100 dark:hover:bg-gray-800
                     transition-colors"
            aria-label="Go back"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
        )}

        {/* Title */}
        <div className={`flex-1 ${showBack ? 'ml-3' : ''}`}>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {subtitle}
            </p>
          )}
        </div>

        {/* Right actions */}
        {rightActions.length > 0 && (
          <div className="flex items-center gap-2">
            {rightActions.map((action, index) => (
              <button
                key={index}
                onClick={() => handleAction(action.onClick)}
                className="p-2 rounded-lg
                         hover:bg-gray-100 dark:hover:bg-gray-800
                         transition-colors"
                aria-label={action.label}
              >
                {action.icon}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
};

export default NativeHeader;