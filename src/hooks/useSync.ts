/**
 * Sync management hook
 * @module hooks/useSync
 */

import { useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@src/store';
import { SyncService, SyncEvent } from '@services/sync.service';
import { DeviceService } from '@services/device.service';

interface UseSyncOptions {
  onAccountSync?: (event: SyncEvent) => void;
  onTagSync?: (event: SyncEvent) => void;
  onFolderSync?: (event: SyncEvent) => void;
  onSettingsSync?: (event: SyncEvent) => void;
  onDeviceSync?: (event: SyncEvent) => void;
}

/**
 * Hook for managing real-time sync
 */
export const useSync = (options: UseSyncOptions = {}) => {
  const { user } = useSelector((state: RootState) => state._auth);

  useEffect(() => {
    if (!user) return;

    // Initialize sync service
    SyncService.initialize(user.id);

    // Create session for current device
    const initializeSession = async () => {
      const deviceId = await DeviceService.getDeviceId();
      const sessionId = DeviceService.getSessionId();
      
      if (!sessionId) {
        await DeviceService.createSession(user.id, deviceId);
      }
    };

    initializeSession();

    // Subscribe to sync events
    const unsubscribers: (() => void)[] = [];

    // Account sync events
    if (options.onAccountSync) {
      unsubscribers.push(
        SyncService.onSyncEvent('account_added', options.onAccountSync),
        SyncService.onSyncEvent('account_updated', options.onAccountSync),
        SyncService.onSyncEvent('account_deleted', options.onAccountSync)
      );
    }

    // Tag sync events
    if (options.onTagSync) {
      unsubscribers.push(
        SyncService.onSyncEvent('tag_added', options.onTagSync),
        SyncService.onSyncEvent('tag_updated', options.onTagSync),
        SyncService.onSyncEvent('tag_deleted', options.onTagSync)
      );
    }

    // Folder sync events
    if (options.onFolderSync) {
      unsubscribers.push(
        SyncService.onSyncEvent('folder_added', options.onFolderSync),
        SyncService.onSyncEvent('folder_updated', options.onFolderSync),
        SyncService.onSyncEvent('folder_deleted', options.onFolderSync)
      );
    }

    // Settings sync events
    if (options.onSettingsSync) {
      unsubscribers.push(
        SyncService.onSyncEvent('settings_updated', options.onSettingsSync)
      );
    }

    // Device sync events
    if (options.onDeviceSync) {
      unsubscribers.push(
        SyncService.onSyncEvent('device_added', options.onDeviceSync),
        SyncService.onSyncEvent('device_removed', options.onDeviceSync)
      );
    }

    // Update session activity periodically
    const activityInterval = setInterval(async () => {
      const sessionId = DeviceService.getSessionId();
      if (sessionId) {
        await DeviceService.updateSessionActivity(user.id, sessionId);
      }
    }, 60000); // Every minute

    // Cleanup
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
      clearInterval(activityInterval);
      SyncService.cleanup();
    };
  }, [user, options]);

  // Publish sync events
  const publishAccountChange = useCallback(
    async (type: 'added' | 'updated' | 'deleted', data: any) => {
      if (!user) return;
      await SyncService.publishSyncEvent(user.id, `account_${type}` as unknown, data);
    },
    [user]
  );

  const publishTagChange = useCallback(
    async (type: 'added' | 'updated' | 'deleted', data: any) => {
      if (!user) return;
      await SyncService.publishSyncEvent(user.id, `tag_${type}` as unknown, data);
    },
    [user]
  );

  const publishFolderChange = useCallback(
    async (type: 'added' | 'updated' | 'deleted', data: any) => {
      if (!user) return;
      await SyncService.publishSyncEvent(user.id, `folder_${type}` as unknown, data);
    },
    [user]
  );

  const publishSettingsChange = useCallback(
    async (data: any) => {
      if (!user) return;
      await SyncService.publishSyncEvent(user.id, 'settings_updated', data);
    },
    [user]
  );

  const getSyncStatus = useCallback(() => {
    return SyncService.getSyncStatus();
  }, []);

  const getUnresolvedConflicts = useCallback(() => {
    return SyncService.getUnresolvedConflicts();
  }, []);

  const resolveConflict = useCallback(
    (conflictId: string, resolution: 'local' | 'remote' | 'merge') => {
      SyncService.resolveConflict(conflictId, resolution);
    },
    []
  );

  return {
    publishAccountChange,
    publishTagChange,
    publishFolderChange,
    publishSettingsChange,
    getSyncStatus,
    getUnresolvedConflicts,
    resolveConflict,
  };
};

export default useSync;