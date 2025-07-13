/**
 * Biometric authentication hook
 * @module hooks/useBiometric
 */

import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { BiometricAuth } from 'capacitor-biometric-auth';
import { Device } from '@capacitor/device';
import { RootState } from '@src/store';
import { setBiometricEnabled } from '@store/slices/settingsSlice';
import { addToast } from '@store/slices/uiSlice';
import { setLocked } from '@store/slices/uiSlice';
import { BiometricAccountService } from '@services/biometric-account.service';

interface BiometricStatus {
  isAvailable: boolean;
  biometryType?: 'face' | 'fingerprint' | 'iris' | 'none';
  reason?: string;
}

/**
 * Hook for managing biometric authentication
 */
export const useBiometric = () => {
  const dispatch = useDispatch();
  const { biometricEnabled } = useSelector((state: RootState) => state.settings);
  const [biometricStatus, setBiometricStatus] = useState<BiometricStatus>({
    isAvailable: false,
  });

  // Check biometric availability
  useEffect(() => {
    const checkBiometric = async () => {
      try {
        const info = await Device.getInfo();
        
        // Only check on mobile platforms
        if (info.platform === 'web') {
          setBiometricStatus({
            isAvailable: false,
            reason: 'Biometric authentication is only available on mobile devices',
          });
          return;
        }

        const result = await BiometricAuth.checkBiometry();
        
        setBiometricStatus({
          isAvailable: result.isAvailable,
          biometryType: result.biometryType as 'face' | 'fingerprint' | 'iris' | 'none',
          reason: result.reason,
        });
      } catch (error) {
        console.error('Error checking biometric:', error);
        setBiometricStatus({
          isAvailable: false,
          reason: 'Failed to check biometric availability',
        });
      }
    };

    checkBiometric();
  }, []);

  // Authenticate with biometric
  const authenticate = useCallback(async ({
    reason = 'Authenticate to access your 2FA codes',
    title = '2FA Studio',
    subtitle = 'Use biometric authentication',
    description = 'Place your finger on the sensor or look at the camera',
    fallbackTitle = 'Use Passcode',
    cancelTitle = 'Cancel',
  }: {
    reason?: string;
    title?: string;
    subtitle?: string;
    description?: string;
    fallbackTitle?: string;
    cancelTitle?: string;
  } = {}) => {
    if (!biometricStatus.isAvailable) {
      throw new Error(biometricStatus.reason || 'Biometric authentication not available');
    }

    try {
      const result = await BiometricAuth.authenticate({
        reason,
        title,
        subtitle,
        description,
        fallbackTitle,
        cancelTitle,
      });

      if (result.authenticated) {
        dispatch(setLocked(false));
        return true;
      } else {
        throw new Error('Authentication failed');
      }
    } catch (error: any) {
      console.error('Biometric authentication error:', error);
      
      if (error.code === 'UserCancel') {
        dispatch(addToast({
          type: 'info',
          message: 'Authentication cancelled',
        }));
      } else if (error.code === 'UserFallback') {
        // Handle fallback to passcode
        dispatch(addToast({
          type: 'info',
          message: 'Please use your device passcode',
        }));
      } else {
        dispatch(addToast({
          type: 'error',
          message: 'Biometric authentication failed',
        }));
      }
      
      throw error;
    }
  }, [biometricStatus, dispatch]);

  // Enable biometric
  const enableBiometric = useCallback(async () => {
    if (!biometricStatus.isAvailable) {
      dispatch(addToast({
        type: 'error',
        message: biometricStatus.reason || 'Biometric authentication not available',
      }));
      return false;
    }

    try {
      // First authenticate to enable
      await authenticate({
        reason: 'Authenticate to enable biometric login',
        subtitle: 'Enable biometric authentication',
      });

      dispatch(setBiometricEnabled(true));
      dispatch(addToast({
        type: 'success',
        message: 'Biometric authentication enabled',
      }));
      
      return true;
    } catch (error) {
      console.error('Failed to enable biometric:', error);
      return false;
    }
  }, [biometricStatus, authenticate, dispatch]);

  // Disable biometric
  const disableBiometric = useCallback(async () => {
    try {
      // Authenticate before disabling
      await authenticate({
        reason: 'Authenticate to disable biometric login',
        subtitle: 'Disable biometric authentication',
      });

      dispatch(setBiometricEnabled(false));
      dispatch(addToast({
        type: 'success',
        message: 'Biometric authentication disabled',
      }));
      
      return true;
    } catch (error) {
      console.error('Failed to disable biometric:', error);
      return false;
    }
  }, [authenticate, dispatch]);

  // Lock app
  const lockApp = useCallback(() => {
    // Clear all authenticated biometric sessions
    BiometricAccountService.clearAuthenticatedAccounts();
    dispatch(setLocked(true));
  }, [dispatch]);

  // Unlock app with biometric
  const unlockApp = useCallback(async () => {
    if (!biometricEnabled) {
      dispatch(setLocked(false));
      return true;
    }

    try {
      await authenticate({
        reason: 'Authenticate to unlock 2FA Studio',
        subtitle: 'Unlock app',
      });
      return true;
    } catch (error) {
      return false;
    }
  }, [biometricEnabled, authenticate, dispatch]);

  return {
    biometricStatus,
    biometricEnabled,
    authenticate,
    enableBiometric,
    disableBiometric,
    lockApp,
    unlockApp,
  };
};

export default useBiometric;