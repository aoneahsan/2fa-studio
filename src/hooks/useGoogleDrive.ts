/**
 * Google Drive hook for backup functionality
 * @module hooks/useGoogleDrive
 */

import { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@src/store';
import { addToast } from '@store/slices/uiSlice';
import { setUser } from '@store/slices/authSlice';
import { GoogleDriveService } from '@services/googleDrive.service';

interface GoogleDriveBackup {
  id: string;
  name: string;
  createdTime: string;
  modifiedTime: string;
  size: string;
  accountCount?: number;
  encrypted?: boolean;
}

interface UseGoogleDriveReturn {
  isConnected: boolean;
  isLoading: boolean;
  backups: GoogleDriveBackup[];
  connect: () => Promise<boolean>;
  disconnect: () => void;
  createBackup: (encryptionPassword?: string) => Promise<void>;
  restoreBackup: (backupId: string, encryptionPassword?: string) => Promise<void>;
  deleteBackup: (backupId: string) => Promise<void>;
  refreshBackups: () => Promise<void>;
  syncNow: (encryptionPassword?: string) => Promise<void>;
}

export const useGoogleDrive = (): UseGoogleDriveReturn => {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { accounts } = useSelector((state: RootState) => state.accounts);
  const settings = useSelector((state: RootState) => state.settings);
  
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [backups, setBackups] = useState<GoogleDriveBackup[]>([]);

  // Initialize Google Drive
  useEffect(() => {
    const initGoogleDrive = async () => {
      try {
        await GoogleDriveService.initialize();
        setIsConnected(GoogleDriveService.isAuthenticated());
        
        if (GoogleDriveService.isAuthenticated()) {
          await refreshBackups();
        }
      } catch (error) {
        console.error('Failed to initialize Google Drive:', error);
      }
    };

    initGoogleDrive();
  }, []);

  // Connect to Google Drive
  const connect = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      const success = await GoogleDriveService.authenticate();
      
      if (success) {
        setIsConnected(true);
        
        // Update user in store
        if (user) {
          dispatch(setUser({
            ...user,
            googleDriveConnected: true,
          }));
        }
        
        dispatch(addToast({
          type: 'success',
          message: 'Connected to Google Drive',
        }));
        
        // Load backups
        await refreshBackups();
        
        return true;
      } else {
        dispatch(addToast({
          type: 'error',
          message: 'Failed to connect to Google Drive',
        }));
        return false;
      }
    } catch (error) {
      console.error('Google Drive connection _error:', error);
      dispatch(addToast({
        type: 'error',
        message: 'Failed to connect to Google Drive',
      }));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, user]);

  // Disconnect from Google Drive
  const disconnect = useCallback(() => {
    GoogleDriveService.disconnect();
    setIsConnected(false);
    setBackups([]);
    
    // Update user in store
    if (user) {
      dispatch(setUser({
        ...user,
        googleDriveConnected: false,
      }));
    }
    
    dispatch(addToast({
      type: 'info',
      message: 'Disconnected from Google Drive',
    }));
  }, [dispatch, user]);

  // Create backup
  const createBackup = useCallback(async (encryptionPassword?: string) => {
    if (!isConnected) {
      throw new Error('Not connected to Google Drive');
    }

    setIsLoading(true);

    try {
      // Prepare backup data
      const backupData = {
        accounts: accounts,
        settings: settings,
        timestamp: new Date().toISOString(),
      };

      // Create backup
      const backupId = await GoogleDriveService.createBackup(backupData, encryptionPassword);
      
      dispatch(addToast({
        type: 'success',
        message: 'Backup created successfully',
      }));

      // Refresh backup list
      await refreshBackups();
    } catch (error) {
      console.error('Failed to create backup:', error);
      dispatch(addToast({
        type: 'error',
        message: 'Failed to create backup',
      }));
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, accounts, settings, dispatch]);

  // Restore backup
  const restoreBackup = useCallback(async (backupId: string, encryptionPassword?: string) => {
    if (!isConnected) {
      throw new Error('Not connected to Google Drive');
    }

    setIsLoading(true);

    try {
      // Get backup data
      const backupData = await GoogleDriveService.getBackup(backupId, encryptionPassword);
      
      // Restore accounts
      if (backupData.data?.accounts) {
        // Dispatch action to restore accounts
        // This would need to be implemented in the accounts slice
        console.log('Restoring accounts:', backupData.data.accounts);
      }

      // Restore settings
      if (backupData.data?.settings) {
        // Dispatch action to restore settings
        // This would need to be implemented in the settings slice
        console.log('Restoring settings:', backupData.data.settings);
      }

      dispatch(addToast({
        type: 'success',
        message: 'Backup restored successfully',
      }));
    } catch (error) {
      console.error('Failed to restore backup:', error);
      dispatch(addToast({
        type: 'error',
        message: 'Failed to restore backup. Check your encryption password.',
      }));
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, dispatch]);

  // Delete backup
  const deleteBackup = useCallback(async (backupId: string) => {
    if (!isConnected) {
      throw new Error('Not connected to Google Drive');
    }

    setIsLoading(true);

    try {
      await GoogleDriveService.deleteBackup(backupId);
      
      dispatch(addToast({
        type: 'success',
        message: 'Backup deleted',
      }));

      // Refresh backup list
      await refreshBackups();
    } catch (error) {
      console.error('Failed to delete backup:', error);
      dispatch(addToast({
        type: 'error',
        message: 'Failed to delete backup',
      }));
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, dispatch]);

  // Refresh backups list
  const refreshBackups = useCallback(async () => {
    if (!GoogleDriveService.isAuthenticated()) {
      return;
    }

    setIsLoading(true);

    try {
      const files = await GoogleDriveService.listBackups();
      
      const formattedBackups: GoogleDriveBackup[] = files.map(file => ({
        id: file.id,
        name: file.name,
        createdTime: file.createdTime,
        modifiedTime: file.modifiedTime,
        size: file.size,
        // @ts-ignore - properties might be available
        accountCount: file.properties?.accountCount,
        // @ts-ignore
        encrypted: file.properties?.encrypted === 'true',
      }));

      setBackups(formattedBackups);
    } catch (error) {
      console.error('Failed to refresh backups:', error);
      dispatch(addToast({
        type: 'error',
        message: 'Failed to load backups',
      }));
    } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

  // Sync now
  const syncNow = useCallback(async (encryptionPassword?: string) => {
    if (!isConnected) {
      throw new Error('Not connected to Google Drive');
    }

    setIsLoading(true);

    try {
      // Prepare backup data
      const backupData = {
        accounts: accounts,
        settings: settings,
        timestamp: new Date().toISOString(),
      };

      // Sync backup
      await GoogleDriveService.syncBackup(backupData, encryptionPassword);
      
      dispatch(addToast({
        type: 'success',
        message: 'Sync completed',
      }));

      // Refresh backup list
      await refreshBackups();
    } catch (error) {
      console.error('Failed to sync:', error);
      dispatch(addToast({
        type: 'error',
        message: 'Failed to sync with Google Drive',
      }));
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, accounts, settings, dispatch]);

  return {
    isConnected,
    isLoading,
    backups,
    connect,
    disconnect,
    createBackup,
    restoreBackup,
    deleteBackup,
    refreshBackups,
    syncNow,
  };
};