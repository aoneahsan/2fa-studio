/**
 * Account Item Component
 * Displays a single 2FA account with code generation
 */

import React, { useState, useEffect } from 'react';
import { TOTPService, TOTPAccount } from '@services/totp.service';
import { Card } from '@components/ui/Card';

interface AccountItemProps {
  account: TOTPAccount;
  onEdit?: (account: TOTPAccount) => void;
  onDelete?: (id: string) => void;
}

export const AccountItem: React.FC<AccountItemProps> = ({
  account,
  onEdit,
  onDelete
}) => {
  const [code, setCode] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const updateCode = () => {
      if (account.type === 'hotp') {
        setCode(TOTPService.generateHOTP(
          account.secret,
          account.counter || 0,
          account
        ));
      } else {
        setCode(TOTPService.generateTOTP(account.secret, account));
        setTimeRemaining(TOTPService.getTimeRemaining(account.period));
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
    const mid = Math.floor(code.length / 2);
    return `${code.slice(0, mid)} ${code.slice(mid)}`;
  };

  const progressPercentage = account.type === 'totp' 
    ? (timeRemaining / (account.period || 30)) * 100
    : 100;

  return (
    <Card className="p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1">
          {account.icon && (
            <img 
              src={account.icon} 
              alt={account.issuer}
              className="w-10 h-10 rounded-full"
            />
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {account.issuer}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {account.label}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right">
            <button
              onClick={handleCopy}
              className="font-mono text-2xl font-bold text-gray-900 dark:text-white hover:text-blue-600 transition-colors"
              title="Click to copy"
            >
              {formatCode(code)}
            </button>
            {account.type === 'totp' && (
              <div className="mt-1 h-1 w-24 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 transition-all duration-1000"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {copied && (
              <span className="text-xs text-green-600 dark:text-green-400">
                Copied!
              </span>
            )}
            <button
              onClick={() => onEdit?.(account)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title="Edit"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => onDelete?.(account.id)}
              className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
              title="Delete"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
};