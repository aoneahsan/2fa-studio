/**
 * Lock screen component
 * @module components/auth/LockScreen
 */

import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useBiometric } from '../../hooks/useBiometric';
import { LockClosedIcon, FingerPrintIcon } from '@heroicons/react/24/outline';

/**
 * Lock screen overlay for app security
 */
const LockScreen: React.FC = () => {
  const { isLocked } = useSelector((state: RootState) => state.ui);
  const { biometricEnabled, unlockApp, biometricStatus } = useBiometric();
  const [isUnlocking, setIsUnlocking] = useState(false);

  const handleUnlock = async () => {
    setIsUnlocking(true);
    try {
      await unlockApp();
    } catch (error) {
      console.error('Unlock failed:', error);
    } finally {
      setIsUnlocking(false);
    }
  };

  if (!isLocked) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center">
      <div className="text-center px-6">
        <div className="mb-8">
          <LockClosedIcon className="w-16 h-16 mx-auto text-primary mb-4" />
          <h1 className="text-3xl font-bold text-foreground mb-2">2FA Studio</h1>
          <p className="text-muted-foreground">App is locked for your security</p>
        </div>

        {biometricEnabled && biometricStatus.isAvailable ? (
          <button
            onClick={handleUnlock}
            disabled={isUnlocking}
            className="btn btn-primary btn-lg flex items-center gap-2 mx-auto"
          >
            <FingerPrintIcon className="w-5 h-5" />
            {isUnlocking ? 'Unlocking...' : 'Unlock with Biometric'}
          </button>
        ) : (
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Biometric authentication is not available
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-outline btn-md"
            >
              Refresh App
            </button>
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-8">
          Your data is encrypted and secure
        </p>
      </div>
    </div>
  );
};

export default LockScreen;