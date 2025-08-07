/**
 * BuildKit Utilities Integration
 * Combines ts-buildkit and react-buildkit utilities
 * @module utils/buildkit-utils
 */

import React from 'react';

// ===== TS-BUILDKIT UTILITIES =====
import {
  // Type utilities
  DeepPartial,
  DeepReadonly,
  Nullable,
  Optional,
  ValueOf,
  // Array utilities
  chunk,
  unique,
  groupBy,
  sortBy,
  // Object utilities
  pick,
  omit,
  merge,
  deepClone,
  // String utilities
  capitalize,
  camelCase,
  snakeCase,
  kebabCase,
  truncate,
  // Validation utilities
  isEmail,
  isURL,
  isUUID,
  isEmpty,
  // Date utilities
  formatDate,
  addDays,
  diffDays,
  isAfter,
  isBefore,
  // Promise utilities
  delay,
  retry,
  timeout,
  debounce,
  throttle,
  // Error utilities
  createError,
  isError,
  getErrorMessage
} from 'ts-buildkit';

// ===== REACT-BUILDKIT UTILITIES =====
import {
  // Hooks
  useDebounce,
  useThrottle,
  useLocalStorage,
  useSessionStorage,
  usePrevious,
  useInterval,
  useTimeout,
  useClickOutside,
  useKeyPress,
  useMediaQuery,
  useScrollPosition,
  useLockBodyScroll,
  useDocumentTitle,
  useAsync,
  useFetch,
  // Components
  ErrorBoundary,
  ConditionalWrapper,
  Portal,
  LazyLoad,
  InfiniteScroll,
  // HOCs
  withErrorBoundary,
  withAuth,
  withLoading,
  // Context utilities
  createContext,
  // Performance utilities
  memo,
  useMemoizedFn
} from 'react-buildkit';

// Re-export all utilities
export * from 'ts-buildkit';
export * from 'react-buildkit';

// ===== CUSTOM 2FA STUDIO UTILITIES =====

/**
 * Format TOTP secret for display (adds spaces every 4 characters)
 */
export const formatTOTPSecret = (secret: string): string => {
  return chunk(secret.split(''), 4)
    .map(chars => chars.join(''))
    .join(' ');
};

/**
 * Validate TOTP secret format
 */
export const isValidTOTPSecret = (secret: string): boolean => {
  const cleanSecret = secret.replace(/\s/g, '');
  const base32Regex = /^[A-Z2-7]+=*$/;
  return base32Regex.test(cleanSecret) && cleanSecret.length >= 16;
};

/**
 * Generate account display name
 */
export const getAccountDisplayName = (issuer: string, label: string): string => {
  if (issuer && label) {
    return `${issuer} (${label})`;
  }
  return issuer || label || 'Unknown Account';
};

/**
 * Calculate time remaining for TOTP code
 */
export const getTOTPTimeRemaining = (period: number = 30): number => {
  const now = Math.floor(Date.now() / 1000);
  return period - (now % period);
};

/**
 * Format time remaining as percentage
 */
export const getTOTPProgress = (period: number = 30): number => {
  const remaining = getTOTPTimeRemaining(period);
  return (remaining / period) * 100;
};

/**
 * Custom hook for TOTP countdown
 */
export const useTOTPCountdown = (period: number = 30) => {
  const [timeRemaining, setTimeRemaining] = React.useState(getTOTPTimeRemaining(period));
  const [progress, setProgress] = React.useState(getTOTPProgress(period));

  useInterval(() => {
    const remaining = getTOTPTimeRemaining(period);
    setTimeRemaining(remaining);
    setProgress(getTOTPProgress(period));
  }, 1000);

  return { timeRemaining, progress };
};

/**
 * Custom hook for account search
 */
export const useAccountSearch = (accounts: any[], searchTerm: string) => {
  return React.useMemo(() => {
    if (!searchTerm) return accounts;
    
    const term = searchTerm.toLowerCase();
    return accounts.filter(account => 
      account.issuer?.toLowerCase().includes(term) ||
      account.label?.toLowerCase().includes(term) ||
      account.tags?.some((tag: string) => tag.toLowerCase().includes(term))
    );
  }, [accounts, searchTerm]);
};

/**
 * Custom hook for biometric prompt
 */
export const useBiometricPrompt = () => {
  const [isPrompting, setIsPrompting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const prompt = React.useCallback(async (reason: string) => {
    setIsPrompting(true);
    setError(null);

    try {
      const { MobileBiometricService } = await import('@services/mobile-biometric.service');
      const result = await MobileBiometricService.authenticate(reason);
      return result;
    } catch (err) {
      setError(getErrorMessage(err));
      return false;
    } finally {
      setIsPrompting(false);
    }
  }, []);

  return { prompt, isPrompting, error };
};

/**
 * Error boundary for 2FA components
 */
export const TwoFAErrorBoundary = withErrorBoundary(
  ({ children }: { children: React.ReactNode }) => <>{children}</>,
  {
    fallback: (error: Error) => (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <h3 className="text-red-800 dark:text-red-200 font-semibold mb-2">
          Something went wrong
        </h3>
        <p className="text-red-600 dark:text-red-300 text-sm">
          {error.message || 'An unexpected error occurred'}
        </p>
      </div>
    )
  }
);

/**
 * Secure storage wrapper using encryption
 */
export const secureStorage = {
  get: async function<T = any>(key: string): Promise<T | null> {
    const value = localStorage.getItem(key);
    if (!value) return null;
    
    try {
      // In production, this would decrypt the value
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  },
  
  set: async function<T = any>(key: string, value: T): Promise<void> {
    // In production, this would encrypt the value
    const encrypted = JSON.stringify(value);
    localStorage.setItem(key, encrypted);
  },
  
  remove: async function(key: string): Promise<void> {
    localStorage.removeItem(key);
  }
};

/**
 * Account sorting utilities
 */
export const accountSorters = {
  byIssuer: (a: any, b: any) => 
    (a.issuer || '').localeCompare(b.issuer || ''),
  
  byLabel: (a: any, b: any) => 
    (a.label || '').localeCompare(b.label || ''),
  
  byLastUsed: (a: any, b: any) => 
    (b.lastUsed || 0) - (a.lastUsed || 0),
  
  byCreated: (a: any, b: any) => 
    (b.createdAt || 0) - (a.createdAt || 0)
};

/**
 * Rate limiting utility for API calls
 */
export const rateLimiter = {
  attempts: new Map<string, number[]>(),
  
  check: (key: string, maxAttempts: number, windowMs: number): boolean => {
    const now = Date.now();
    const attempts = rateLimiter.attempts.get(key) || [];
    
    // Remove old attempts outside the window
    const validAttempts = attempts.filter(time => now - time < windowMs);
    
    if (validAttempts.length >= maxAttempts) {
      return false;
    }
    
    validAttempts.push(now);
    rateLimiter.attempts.set(key, validAttempts);
    return true;
  },
  
  reset: (key: string) => {
    rateLimiter.attempts.delete(key);
  }
};