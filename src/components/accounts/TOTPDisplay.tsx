/**
 * TOTP Display Component
 * Shows the current TOTP code with countdown timer
 */

import React, { useState, useEffect } from 'react';
import { OTPService, OTPAccount } from '@services/otp.service';

interface TOTPDisplayProps {
  account: OTPAccount;
  showCopyButton?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const TOTPDisplay: React.FC<TOTPDisplayProps> = ({ 
  account, 
  showCopyButton = true,
  size = 'md' 
}) => {
  const [code, setCode] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const updateCode = () => {
      const result = OTPService.generateCode(account);
      setCode(result.code);
      
      if (account.type === 'totp' && result.remainingTime) {
        setTimeRemaining(result.remainingTime);
      }
    };

    updateCode();
    const interval = setInterval(updateCode, 1000);
    
    return () => clearInterval(interval);
  }, [account]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const formatCode = (code: string) => {
    return OTPService.formatCode(code);
  };

  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl'
  };

  const progressPercentage = account.type === 'totp' 
    ? (timeRemaining / (account.period || 30)) * 100
    : 100;

  return (
    <div className="flex items-center space-x-4">
      <div className="flex-1">
        <div className="relative">
          <button
            onClick={showCopyButton ? handleCopy : undefined}
            className={`font-mono font-bold ${sizeClasses[size]} ${
              showCopyButton 
                ? 'hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer' 
                : ''
            } transition-colors`}
            title={showCopyButton ? 'Click to copy' : undefined}
          >
            {formatCode(code)}
          </button>
          
          {copied && (
            <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs text-green-600 dark:text-green-400 bg-white dark:bg-gray-800 px-2 py-1 rounded shadow-lg">
              Copied!
            </span>
          )}
        </div>
        
        {account.type === 'totp' && (
          <div className="mt-2">
            <div className="h-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-1000 ease-linear"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {timeRemaining}s remaining
            </p>
          </div>
        )}
      </div>
    </div>
  );
};