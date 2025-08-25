/**
 * Example of a localized Account Card component
 * Shows how to integrate i18n into existing components
 */

import React, { useState } from 'react';
import { ClipboardIcon, EyeIcon, EyeSlashIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useLocalization } from '@/hooks/useLocalization';
import { rtlClasses } from '@/utils/rtl';
import { pluralUtils } from '@/utils/pluralization';
import { clsx } from 'clsx';

interface Account {
  id: string;
  issuer: string;
  accountName: string;
  code: string;
  timeRemaining: number;
  usageCount: number;
  lastUsed?: Date;
  isFavorite: boolean;
}

interface AccountCardProps {
  account: Account;
  onCopy: (code: string) => void;
  onEdit: (account: Account) => void;
  onDelete: (account: Account) => void;
  onToggleFavorite: (account: Account) => void;
}

/**
 * Localized Account Card component with full i18n integration
 */
export const LocalizedAccountCard: React.FC<AccountCardProps> = ({
  account,
  onCopy,
  onEdit,
  onDelete,
  onToggleFavorite
}) => {
  const { 
    t, 
    formatRelativeTime, 
    formatNumber, 
    isRTL,
    currentLanguageCode
  } = useLocalization('accounts');
  
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);

  // Handle copy action with feedback
  const handleCopy = async () => {
    try {
      onCopy(account.code);
      setCopied(true);
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };

  // Format time remaining with localization
  const formatTimeRemaining = (seconds: number): string => {
    if (seconds <= 0) {
      return t('card.expired');
    }
    
    return t('card.timeRemaining', { seconds });
  };

  // Get localized usage count
  const getUsageText = (): string => {
    return pluralUtils.duration(account.usageCount, 'second', currentLanguageCode);
  };

  return (
    <div 
      className={clsx(
        'group relative p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm',
        'border border-gray-200 dark:border-gray-700',
        'hover:shadow-md transition-shadow duration-200',
        'focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2',
        rtlClasses.cardPadding
      )}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <div className={clsx('flex items-start justify-between mb-3', rtlClasses.flexRowReverse)}>
        <div className={clsx('flex-1 min-w-0', rtlClasses.textLeft)}>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
            {account.issuer}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
            {account.accountName}
          </p>
        </div>
        
        {/* Favorite button */}
        <button
          onClick={() => onToggleFavorite(account)}
          className={clsx(
            'p-2 rounded-full transition-colors',
            'hover:bg-gray-100 dark:hover:bg-gray-700',
            'focus:outline-none focus:ring-2 focus:ring-blue-500',
            rtlClasses.marginLeft,
            account.isFavorite 
              ? 'text-yellow-500 hover:text-yellow-600' 
              : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
          )}
          aria-label={
            account.isFavorite 
              ? t('card.unfavorite') 
              : t('card.favorite')
          }
        >
          <svg className="w-5 h-5" fill={account.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </button>
      </div>

      {/* TOTP Code Section */}
      <div className="mb-4">
        <div className={clsx('flex items-center justify-between', rtlClasses.flexRowReverse)}>
          <div className={clsx('flex items-center gap-2', rtlClasses.flexRowReverse)}>
            {showCode ? (
              <span className="text-2xl font-mono font-bold text-blue-600 dark:text-blue-400">
                {account.code}
              </span>
            ) : (
              <span className="text-2xl font-mono font-bold text-gray-400">
                ••••••
              </span>
            )}
            
            {/* Toggle visibility */}
            <button
              onClick={() => setShowCode(!showCode)}
              className={clsx(
                'p-1 rounded transition-colors',
                'hover:bg-gray-100 dark:hover:bg-gray-700',
                'focus:outline-none focus:ring-2 focus:ring-blue-500',
                rtlClasses.marginLeft
              )}
              aria-label={showCode ? t('card.hideCode') : t('card.showCode')}
            >
              {showCode ? (
                <EyeSlashIcon className="w-5 h-5 text-gray-500" />
              ) : (
                <EyeIcon className="w-5 h-5 text-gray-500" />
              )}
            </button>
          </div>

          {/* Copy button */}
          <button
            onClick={handleCopy}
            disabled={!showCode}
            className={clsx(
              'flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium',
              'transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-blue-500',
              rtlClasses.flexRowReverse,
              copied 
                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                : showCode
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800'
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 cursor-not-allowed'
            )}
            aria-label={t('card.copyCode')}
          >
            <ClipboardIcon className={clsx('w-4 h-4', copied && 'text-green-600')} />
            <span>
              {copied ? t('card.copied') : t('card.copyCode')}
            </span>
          </button>
        </div>

        {/* Time remaining */}
        <div className="mt-2">
          <div className={clsx('flex items-center justify-between text-sm', rtlClasses.flexRowReverse)}>
            <span className="text-gray-600 dark:text-gray-400">
              {formatTimeRemaining(account.timeRemaining)}
            </span>
            
            {/* Progress bar */}
            <div className={clsx('flex-1 max-w-[100px] mx-3', rtlClasses.marginLeft, rtlClasses.marginRight)}>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div 
                  className={clsx(
                    'h-1.5 rounded-full transition-all duration-1000',
                    account.timeRemaining > 10 
                      ? 'bg-green-500' 
                      : account.timeRemaining > 5 
                        ? 'bg-yellow-500' 
                        : 'bg-red-500'
                  )}
                  style={{ 
                    width: `${Math.max(0, (account.timeRemaining / 30) * 100)}%`,
                    transformOrigin: isRTL ? 'right' : 'left'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className={clsx('flex items-center justify-between text-xs text-gray-500 dark:text-gray-400', rtlClasses.flexRowReverse)}>
        <span>
          {t('card.usageCount', { count: account.usageCount })}
        </span>
        
        {account.lastUsed && (
          <span>
            {t('card.lastUsed', { 
              time: formatRelativeTime(account.lastUsed) 
            })}
          </span>
        )}
      </div>

      {/* Action buttons (shown on hover/focus) */}
      <div className={clsx(
        'absolute top-2 right-2 opacity-0 group-hover:opacity-100',
        'transition-opacity duration-200',
        'flex items-center gap-1',
        rtlClasses.flexRowReverse,
        isRTL && 'left-2 right-auto'
      )}>
        <button
          onClick={() => onEdit(account)}
          className={clsx(
            'p-2 rounded-full transition-colors',
            'hover:bg-gray-100 dark:hover:bg-gray-700',
            'focus:outline-none focus:ring-2 focus:ring-blue-500',
            'text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'
          )}
          aria-label={t('card.edit')}
        >
          <PencilIcon className="w-4 h-4" />
        </button>
        
        <button
          onClick={() => onDelete(account)}
          className={clsx(
            'p-2 rounded-full transition-colors',
            'hover:bg-red-100 dark:hover:bg-red-900',
            'focus:outline-none focus:ring-2 focus:ring-red-500',
            'text-gray-400 hover:text-red-600 dark:hover:text-red-400'
          )}
          aria-label={t('card.delete')}
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Accessibility announcements */}
      <div 
        role="status" 
        aria-live="polite" 
        aria-atomic="true"
        className="sr-only"
      >
        {copied && t('card.copied')}
        {account.timeRemaining <= 5 && t('card.expiringSoon')}
      </div>
    </div>
  );
};

export default LocalizedAccountCard;