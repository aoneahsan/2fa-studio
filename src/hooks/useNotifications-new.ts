import { useState, useEffect, useCallback } from 'react';
import NotificationService from '@services/notification-service-new';
import { NotificationKitService } from '@services/notification-kit.service';
import { useAppSelector } from '@store/hooks';

interface NotificationPreferences {
  securityAlerts: boolean;
  backupReminders: boolean;
  promotions: boolean;
  updates: boolean;
}

interface UseNotificationsReturn {
  isEnabled: boolean;
  isLoading: boolean;
  preferences: NotificationPreferences;
  requestPermission: () => Promise<boolean>;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;
  checkPermission: () => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const user = useAppSelector((state) => (state as any)._auth.user);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    securityAlerts: true,
    backupReminders: true,
    promotions: false,
    updates: true,
  });

  useEffect(() => {
    checkPermission();
    loadPreferences();
  }, []);

  useEffect(() => {
    if (user?.uid) {
      // Set user ID for targeted notifications
      NotificationService.setUserId(user.uid);
    }
  }, [user?.uid]);

  const checkPermission = useCallback(async () => {
    try {
      setIsLoading(true);
      const enabled = await NotificationService.areNotificationsEnabled();
      setIsEnabled(enabled);
    } catch (error) {
      console.error('Failed to check notification permission:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadPreferences = useCallback(async () => {
    try {
      const settings = await NotificationKitService.getSettings();
      setPreferences({
        securityAlerts: settings.securityAlerts,
        backupReminders: settings.backupReminders,
        promotions: false, // NotificationKit doesn't have promotions
        updates: true, // Default to true
      });
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const granted = await NotificationService.promptForPermission();
      setIsEnabled(granted);
      return granted;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }, []);

  const updatePreferences = useCallback(
    async (prefs: Partial<NotificationPreferences>): Promise<void> => {
      try {
        const newPrefs = { ...preferences, ...prefs };
        setPreferences(newPrefs);

        // Update NotificationKit settings
        await NotificationKitService.updateSettings({
          enabled: isEnabled,
          securityAlerts: newPrefs.securityAlerts,
          backupReminders: newPrefs.backupReminders,
          codeExpiration: newPrefs.updates,
          weakSecrets: newPrefs.securityAlerts,
          deviceLogin: newPrefs.securityAlerts,
        });
      } catch (error) {
        console.error('Failed to update notification preferences:', error);
        throw error;
      }
    },
    [preferences, isEnabled]
  );

  return {
    isEnabled,
    isLoading,
    preferences,
    requestPermission,
    updatePreferences,
    checkPermission,
  };
}