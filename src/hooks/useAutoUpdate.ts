/**
 * Auto Update Hook
 * Handles automatic update checks using NativeUpdateService
 * @module hooks/useAutoUpdate
 */

import { useEffect, useState } from 'react';
import { NativeUpdateService } from '@services/native-update.service';
import { Capacitor } from '@capacitor/core';
import { useAppDispatch } from '@store/hooks';
import { addToast } from '@store/slices/uiSlice';

interface UseAutoUpdateOptions {
  checkInterval?: number; // in milliseconds
  showNotifications?: boolean;
  autoDownload?: boolean;
}

export function useAutoUpdate(options: UseAutoUpdateOptions = {}) {
  const {
    checkInterval = 6 * 60 * 60 * 1000, // 6 hours default
    showNotifications = true,
    autoDownload = false
  } = options;

  const dispatch = useAppDispatch();
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<any>(null);

  useEffect(() => {
    // Only run on native platforms
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    // Initial check on mount
    checkForUpdates();

    // Set up interval for periodic checks
    const intervalId = setInterval(checkForUpdates, checkInterval);

    // Cleanup
    return () => clearInterval(intervalId);
  }, [checkInterval]);

  const checkForUpdates = async () => {
    if (isChecking) return;

    setIsChecking(true);
    try {
      const info = await NativeUpdateService.checkForUpdate();
      setLastCheck(new Date());
      
      if (info && info.updateAvailable) {
        setUpdateAvailable(true);
        setUpdateInfo(info);
        
        if (showNotifications) {
          dispatch(addToast({
            id: `update-available-${Date.now()}`,
            type: 'info',
            message: `Update ${info.version} is available!`,
            duration: 10000,
            action: {
              label: 'Update',
              onClick: () => downloadUpdate()
            }
          }));
        }
        
        if (autoDownload) {
          await downloadUpdate();
        }
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const downloadUpdate = async () => {
    if (!updateInfo) return;

    try {
      await NativeUpdateService.downloadUpdate();
      
      if (showNotifications) {
        dispatch(addToast({
          id: `update-downloading-${Date.now()}`,
          type: 'info',
          message: 'Downloading update...',
          duration: 5000
        }));
      }
    } catch (error) {
      console.error('Failed to download update:', error);
      
      if (showNotifications) {
        dispatch(addToast({
          id: `update-error-${Date.now()}`,
          type: 'error',
          message: 'Failed to download update'
        }));
      }
    }
  };

  const installUpdate = async () => {
    try {
      await NativeUpdateService.installUpdate();
      // App will restart automatically
    } catch (error) {
      console.error('Failed to install update:', error);
      
      if (showNotifications) {
        dispatch(addToast({
          id: `install-error-${Date.now()}`,
          type: 'error',
          message: 'Failed to install update'
        }));
      }
    }
  };

  return {
    isChecking,
    lastCheck,
    updateAvailable,
    updateInfo,
    checkForUpdates,
    downloadUpdate,
    installUpdate
  };
}