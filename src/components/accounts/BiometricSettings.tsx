/**
 * Biometric settings component for individual accounts
 * @module components/accounts/BiometricSettings
 */

import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@src/store';
import { BiometricAccountService } from '@services/biometric-account.service';
import { OTPAccount } from '@services/otp.service';
import { addToast } from '@store/slices/uiSlice';
import { 
  LockClosedIcon,
  ClockIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import FingerPrintIcon from '@components/icons/FingerPrintIcon';
import { Button } from '@components/ui/button';

interface BiometricSettingsProps {
  account: OTPAccount;
  onUpdate?: () => void;
}

/**
 * Component for managing biometric protection settings for an account
 */
const BiometricSettings: React.FC<BiometricSettingsProps> = ({ 
  account, 
  onUpdate 
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state._auth);
  const [isLoading, setIsLoading] = useState(false);
  const [timeout, setTimeout] = useState(account.biometricTimeout || 5);
  
  const biometricStatus = BiometricAccountService.getBiometricStatus(account);

  const handleToggleBiometric = async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      if (biometricStatus.isEnabled) {
        await BiometricAccountService.disableBiometric(user.id, account.id);
        dispatch(addToast({
          type: 'success',
          message: 'Biometric protection disabled',
        }));
      } else {
        await BiometricAccountService.enableBiometric(user.id, account.id, timeout);
        dispatch(addToast({
          type: 'success',
          message: 'Biometric protection enabled',
        }));
      }
      
      onUpdate?.();
    } catch (_error) {
      dispatch(addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to update biometric settings',
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateTimeout = async () => {
    if (!user || !biometricStatus.isEnabled) return;
    
    setIsLoading(true);
    
    try {
      await BiometricAccountService.updateBiometricTimeout(
        user.id, 
        account.id, 
        timeout
      );
      
      dispatch(addToast({
        type: 'success',
        message: 'Timeout updated successfully',
      }));
      
      onUpdate?.();
    } catch (_error) {
      dispatch(addToast({
        type: 'error',
        message: 'Failed to update timeout',
      }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 bg-muted/20 rounded-lg">
        <div className="flex items-center gap-3">
          <FingerPrintIcon className="w-8 h-8 text-primary" />
          <div>
            <h4 className="font-medium">Biometric Protection</h4>
            <p className="text-sm text-muted-foreground">
              Require biometric authentication to view this account
            </p>
          </div>
        </div>
        
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={biometricStatus.isEnabled}
            onChange={handleToggleBiometric}
            disabled={isLoading}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
        </label>
      </div>

      {biometricStatus.isEnabled && (
        <>
          {/* Status */}
          <div className="p-4 border border-border rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium">
                Protection Status: {biometricStatus.isAuthenticated ? 'Authenticated' : 'Locked'}
              </span>
            </div>
            
            {biometricStatus.isAuthenticated && biometricStatus.remainingMinutes && (
              <div className="flex items-center gap-2">
                <ClockIcon className="w-5 h-5 text-blue-500" />
                <span className="text-sm text-muted-foreground">
                  Authenticated for {biometricStatus.remainingMinutes} more minute{biometricStatus.remainingMinutes !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>

          {/* Timeout Settings */}
          <div className="space-y-3">
            <label className="block text-sm font-medium">
              Authentication Timeout
            </label>
            <div className="flex items-center gap-3">
              <select
                value={timeout}
                onChange={(_e) => setTimeout(Number(e.target.value))}
                className="flex-1 px-3 py-2 border border-border rounded-md bg-background"
                disabled={isLoading}
              >
                <option value={1}>1 minute</option>
                <option value={2}>2 minutes</option>
                <option value={5}>5 minutes</option>
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
              </select>
              
              <Button
                onClick={handleUpdateTimeout}
                disabled={isLoading || timeout === account.biometricTimeout}
                className="px-4 py-2"
              >
                Update
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              How long the account remains unlocked after biometric authentication
            </p>
          </div>

          {/* Info */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              How it works
            </h5>
            <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
              <li>• You'll need to authenticate with your fingerprint or face to view this account's code</li>
              <li>• The account remains unlocked for the timeout period after authentication</li>
              <li>• Biometric data is never stored and is handled securely by your device</li>
              <li>• You can still use your device PIN/password as a fallback</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

export default BiometricSettings;