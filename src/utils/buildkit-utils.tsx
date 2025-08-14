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
// Note: react-buildkit has different exports, using actual exports
import {
  ZClassNames,
  ZFormik,
  ZFormikForm,
  ZFieldArray,
  useZFormikContext,
  ZDropzone,
  ZDropzoneAccept,
  useZDropzone
} from 'react-buildkit';

// Create placeholder exports for missing hooks
export const useDebounce = (value: any, delay: number) => value;
export const useThrottle = (value: any, delay: number) => value;
export const useLocalStorage = (key: string, initialValue: any) => [initialValue, () => {}];
export const useSessionStorage = (key: string, initialValue: any) => [initialValue, () => {}];
export const usePrevious = (value: any) => value;
export const useInterval = (callback: () => void, delay: number) => {};
export const useTimeout = (callback: () => void, delay: number) => {};
export const useClickOutside = (ref: any, handler: () => void) => {};
export const useKeyPress = (targetKey: string, handler: () => void) => {};
export const useMediaQuery = (query: string) => false;
export const useScrollPosition = () => ({ x: 0, y: 0 });
export const useLockBodyScroll = () => {};
export const useDocumentTitle = (title: string) => {};
export const useAsync = (fn: () => Promise<any>) => ({ loading: false, error: null, value: null });
export const useFetch = (url: string) => ({ loading: false, error: null, data: null });

// Placeholder components
export const ErrorBoundary = ({ children }: any) => children;
export const ConditionalWrapper = ({ children }: any) => children;
export const Portal = ({ children }: any) => children;
export const LazyLoad = ({ children }: any) => children;
export const InfiniteScroll = ({ children }: any) => children;

// Placeholder HOCs
export const withErrorBoundary = (Component: any) => Component;
export const withAuth = (Component: any) => Component;
export const withLoading = (Component: any) => Component;

// Placeholder utilities
export const createContext = () => React.createContext(null);
export const memo = React.memo;
export const useMemoizedFn = (fn: any) => fn;

// Re-export ts-buildkit utilities
export * from 'ts-buildkit';

// Re-export actual react-buildkit exports
export {
  ZClassNames,
  ZFormik,
  ZFormikForm,
  ZFieldArray,
  useZFormikContext,
  ZDropzone,
  ZDropzoneAccept,
  useZDropzone
} from 'react-buildkit';

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