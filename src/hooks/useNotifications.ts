import { useState, useEffect, useCallback } from 'react';
import { notificationService } from '@services/notification-service';
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
  const user = useAppSelector((state) => state._auth.user);
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
      // Set external user ID for OneSignal
      notificationService.setExternalUserId(user.uid);
    }
  }, [user?.uid]);

  const checkPermission = useCallback(async () => {
    try {
      setIsLoading(true);
      const enabled = await notificationService.isPushNotificationEnabled();
      setIsEnabled(enabled);
    } catch (error) {
      console.error('Failed to check notification permission:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      const granted = await notificationService.requestPermission();
      setIsEnabled(granted);
      
      if (granted) {
        // Set default tags when permission is granted
        await notificationService.updateNotificationPreferences(preferences);
      }
      
      return granted;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [preferences]);

  const loadPreferences = useCallback(async () => {
    try {
      // Load preferences from local storage or user settings
      const savedPrefs = localStorage.getItem('notificationPreferences');
      if (savedPrefs) {
        const parsed = JSON.parse(savedPrefs);
        setPreferences(parsed);
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
    }
  }, []);

  const updatePreferences = useCallback(async (
    newPrefs: Partial<NotificationPreferences>
  ): Promise<void> => {
    try {
      const updatedPrefs = { ...preferences, ...newPrefs };
      
      // Save to local storage
      localStorage.setItem('notificationPreferences', JSON.stringify(updatedPrefs));
      
      // Update state
      setPreferences(updatedPrefs);
      
      // Update OneSignal tags
      if (isEnabled) {
        await notificationService.updateNotificationPreferences(updatedPrefs);
      }
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
      throw error;
    }
  }, [preferences, isEnabled]);

  return {
    isEnabled,
    isLoading,
    preferences,
    requestPermission,
    updatePreferences,
    checkPermission,
  };
}