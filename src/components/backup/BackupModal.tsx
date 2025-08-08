/**
 * Backup Modal Component
 * @module components/backup/BackupModal
 */

import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { XMarkIcon, LockClosedIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { closeModal, addToast } from '@store/slices/uiSlice';
import { BackupService } from '@services/backup.service';
import { GoogleAuthService } from '@services/google-auth.service';
import { OTPAccount } from '@services/otp.service';

interface BackupModalProps {
  accounts: OTPAccount[];
}

export const BackupModal: React.FC<BackupModalProps> = ({ accounts }) => {
  const dispatch = useDispatch();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBackup = async () => {
    if (!validateForm()) return;

    setIsProcessing(true);

    try {
      // Initialize Google Auth if needed
      if (!GoogleAuthService.hasValidToken()) {
        await GoogleAuthService.initialize({
          clientId: process.env.REACT_APP_GOOGLE_CLIENT_ID || '',
          scopes: ['https://www.googleapis.com/auth/drive.appdata']
        });
        
        await GoogleAuthService.signIn();
      }

      // Perform backup
      await BackupService.backupToGoogleDrive(accounts, password);

      dispatch(addToast({
        type: 'success',
        message: 'Backup completed successfully'
      }) as any);

      dispatch(closeModal() as any);
    } catch (error: any) {
      console.error('Backup error:', error);
      dispatch(addToast({
        type: 'error',
        message: error.message || 'Failed to backup accounts'
      }) as any);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Backup Accounts</h2>
          <button
            onClick={() => dispatch(closeModal() as any)}
            className="p-1 rounded hover:bg-muted transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-700 dark:text-amber-300">
              <p className="font-medium mb-1">Important Security Information</p>
              <p>Your backup will be encrypted with this password. Store it safely - you'll need it to restore your accounts.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Backup Password
              </label>
              <div className="relative">
                <LockClosedIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter a strong password"
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-500">{errors.password}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <LockClosedIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Confirm your password"
                />
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>
              )}
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            <p>Backing up {accounts.length} account{accounts.length !== 1 ? 's' : ''} to Google Drive</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-border">
          <button
            onClick={() => dispatch(closeModal() as any)}
            className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            onClick={handleBackup}
            disabled={isProcessing}
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isProcessing ? 'Backing up...' : 'Backup'}
          </button>
        </div>
      </div>
    </div>
  );
};