/**
 * Mobile-optimized OTP code display component
 * @module components/mobile/CodeDisplay
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Clipboard } from '@capacitor/clipboard';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Toast } from '@capacitor/toast';
import { Capacitor } from '@capacitor/core';
import { OTPAccount, OTPService } from '@services/otp.service';
import { MobileBiometricService } from '@services/mobile-biometric.service';
import { 
  ClipboardDocumentIcon, 
  LockClosedIcon,
  CheckCircleIcon,
  ExclamationCircleIcon 
} from '@heroicons/react/24/outline';

interface CodeDisplayProps {
  account: OTPAccount;
  onCodeCopied?: () => void;
  showCopyButton?: boolean;
  autoRefresh?: boolean;
}

interface CodeState {
  code: string;
  remainingTime: number;
  progress: number;
  isAuthenticated: boolean;
  isAuthenticating: boolean;
}

/**
 * Mobile-optimized component for displaying and copying OTP codes
 */
const CodeDisplay: React.FC<CodeDisplayProps> = ({
  account,
  onCodeCopied,
  showCopyButton = true,
  autoRefresh = true
}) => {
  const [state, setState] = useState<CodeState>({
    code: '',
    remainingTime: 0,
    progress: 0,
    isAuthenticated: false,
    isAuthenticating: false
  });
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check biometric requirement
  const checkBiometric = useCallback(async () => {
    if (account.requiresBiometric) {
      const status = await MobileBiometricService.getAccountStatus(account.id);
      return status.authenticated;
    }
    return true;
  }, [account]);

  // Generate code
  const generateCode = useCallback(async () => {
    try {
      const isAuthenticated = await checkBiometric();
      
      if (!isAuthenticated) {
        setState(prev => ({ ...prev, isAuthenticated: false }));
        return;
      }

      const result = OTPService.generateCode(account);
      setState(prev => ({
        ...prev,
        code: result.code,
        remainingTime: result.remainingTime || 0,
        progress: result.progress || 0,
        isAuthenticated: true
      }));
      setError(null);
    } catch (err) {
      console.error('Failed to generate code:', err);
      setError('Failed to generate code');
    }
  }, [account, checkBiometric]);

  // Handle biometric authentication
  const handleBiometricAuth = async () => {
    setState(prev => ({ ...prev, isAuthenticating: true }));
    
    try {
      const authenticated = await MobileBiometricService.authenticateForAccount(
        account.id,
        account.label
      );
      
      if (authenticated) {
        setState(prev => ({ ...prev, isAuthenticated: true, isAuthenticating: false }));
        await generateCode();
        
        // Haptic feedback on success
        if (Capacitor.isNativePlatform()) {
          await Haptics.impact({ style: ImpactStyle.Light });
        }
      } else {
        setState(prev => ({ ...prev, isAuthenticating: false }));
        setError('Authentication failed');
      }
    } catch (err) {
      setState(prev => ({ ...prev, isAuthenticating: false }));
      setError('Authentication error');
    }
  };

  // Copy code to clipboard
  const copyCode = async () => {
    if (!state.code || copied) return;

    try {
      if (Capacitor.isNativePlatform()) {
        await Clipboard.write({ string: state.code });
        await Toast.show({
          text: 'Code copied!',
          duration: 'short',
          position: 'bottom'
        });
        await Haptics.impact({ style: ImpactStyle.Medium });
      } else {
        await navigator.clipboard.writeText(state.code);
      }

      setCopied(true);
      onCodeCopied?.();

      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
      setError('Failed to copy code');
    }
  };

  // Setup auto-refresh for TOTP
  useEffect(() => {
    if (!autoRefresh || account.type !== 'totp' || !state.isAuthenticated) {
      return;
    }

    generateCode();
    const interval = setInterval(generateCode, 1000);
    return () => clearInterval(interval);
  }, [account, autoRefresh, generateCode, state.isAuthenticated]);

  // Format code for display
  const formatCode = (code: string): string => {
    if (code.length === 6) {
      return `${code.slice(0, 3)} ${code.slice(3)}`;
    } else if (code.length === 8) {
      return `${code.slice(0, 4)} ${code.slice(4)}`;
    }
    return code;
  };

  // Render biometric lock screen
  if (account.requiresBiometric && !state.isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center p-4">
        <button
          onClick={handleBiometricAuth}
          disabled={state.isAuthenticating}
          className="flex flex-col items-center gap-2 p-4 rounded-lg 
                     bg-gray-100 dark:bg-gray-800 
                     hover:bg-gray-200 dark:hover:bg-gray-700 
                     transition-colors disabled:opacity-50"
        >
          <LockClosedIcon className="w-8 h-8 text-gray-600 dark:text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {state.isAuthenticating ? 'Authenticating...' : 'Tap to unlock'}
          </span>
        </button>
        {error && (
          <p className="mt-2 text-xs text-red-500">{error}</p>
        )}
      </div>
    );
  }

  // Render error state
  if (error && state.isAuthenticated) {
    return (
      <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <ExclamationCircleIcon className="w-5 h-5 text-red-500" />
        <span className="text-sm text-red-700 dark:text-red-400">{error}</span>
      </div>
    );
  }

  // Render code display
  return (
    <div className="relative">
      {/* Progress bar for TOTP */}
      {account.type === 'totp' && state.remainingTime > 0 && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 rounded-t-lg overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-1000 ease-linear"
            style={{ width: `${state.progress}%` }}
          />
        </div>
      )}

      <div className="flex items-center justify-between p-4 pt-5">
        {/* Code display */}
        <div className="flex-1">
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-mono font-bold text-gray-900 dark:text-white select-all">
              {formatCode(state.code)}
            </span>
            {account.type === 'totp' && state.remainingTime > 0 && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {state.remainingTime}s
              </span>
            )}
          </div>
        </div>

        {/* Copy button */}
        {showCopyButton && state.code && (
          <button
            onClick={copyCode}
            disabled={copied}
            className="ml-3 p-2 rounded-lg transition-all
                     hover:bg-gray-100 dark:hover:bg-gray-800
                     active:scale-95 disabled:opacity-50"
            aria-label="Copy code"
          >
            {copied ? (
              <CheckCircleIcon className="w-6 h-6 text-green-500" />
            ) : (
              <ClipboardDocumentIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            )}
          </button>
        )}
      </div>

      {/* HOTP counter and refresh */}
      {account.type === 'hotp' && (
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">
              Counter: {account.counter || 0}
            </span>
            <button
              onClick={generateCode}
              className="text-primary hover:text-primary-dark transition-colors"
            >
              Generate new code
            </button>
          </div>
        </div>
      )}

      {/* Steam Guard indicator */}
      {account.type === 'totp' && account.digits === 5 && (
        <div className="px-4 pb-3">
          <span className="inline-flex items-center px-2 py-1 rounded-full 
                         text-xs font-medium bg-indigo-100 text-indigo-800
                         dark:bg-indigo-900/20 dark:text-indigo-400">
            Steam Guard
          </span>
        </div>
      )}
    </div>
  );
};

export default CodeDisplay;