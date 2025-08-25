/**
 * Advanced Sync Hook
 * Provides a React hook interface for the comprehensive sync system
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  AdvancedSyncService,
  SyncStatus,
  SyncConfig,
  SyncConflict,
  SyncEventType 
} from '@src/services/advanced-sync.service';
import { 
  CrossPlatformSyncService,
  PlatformCapabilities 
} from '@src/services/cross-platform-sync.service';
import { 
  OfflineQueueService,
  QueueStatus 
} from '@src/services/offline-queue.service';
import { 
  BandwidthOptimizationService,
  OptimizationStats 
} from '@src/services/bandwidth-optimization.service';
import { 
  SyncAnalyticsService,
  PerformanceMetrics,
  SyncHealthReport 
} from '@src/services/sync-analytics.service';
import { DeviceService, DeviceInfo } from '@src/services/device.service';
import { useAuth } from './useAuth';

interface AdvancedSyncState {
  // Status
  syncStatus: SyncStatus;
  queueStatus: QueueStatus;
  optimizationStats: OptimizationStats;
  platformCapabilities: PlatformCapabilities | null;
  
  // Analytics
  performanceMetrics: PerformanceMetrics | null;
  healthReport: SyncHealthReport | null;
  
  // Devices and Conflicts
  devices: DeviceInfo[];
  conflicts: SyncConflict[];
  
  // Loading states
  isInitializing: boolean;
  isSyncing: boolean;
  isRefreshing: boolean;
  
  // Errors
  error: string | null;
}

interface AdvancedSyncActions {
  // Core sync operations
  manualSync: () => Promise<void>;
  publishSyncEvent: (type: SyncEventType, data: any, priority?: number) => Promise<void>;
  
  // Configuration
  updateSyncConfig: (config: Partial<SyncConfig>) => void;
  
  // Conflict resolution
  resolveConflict: (conflictId: string, resolution: 'local' | 'remote' | 'merge', customData?: any) => Promise<void>;
  
  // Device management
  trustDevice: (deviceId: string) => Promise<void>;
  removeDevice: (deviceId: string) => Promise<void>;
  
  // Data management
  clearOfflineQueue: () => Promise<void>;
  exportSyncData: (format?: 'json' | 'csv') => Promise<string>;
  
  // Refresh operations
  refreshStatus: () => void;
  refreshDevices: () => Promise<void>;
  refreshAnalytics: () => Promise<void>;
}

export interface UseAdvancedSyncResult {
  state: AdvancedSyncState;
  actions: AdvancedSyncActions;
}

/**
 * Advanced Sync Hook
 */
export const useAdvancedSync = (): UseAdvancedSyncResult => {
  const { user } = useAuth();
  const [state, setState] = useState<AdvancedSyncState>({
    syncStatus: AdvancedSyncService.getSyncStatus(),
    queueStatus: OfflineQueueService.getQueueStatus(),
    optimizationStats: BandwidthOptimizationService.getOptimizationStats(),
    platformCapabilities: CrossPlatformSyncService.getPlatformCapabilities(),
    performanceMetrics: null,
    healthReport: null,
    devices: [],
    conflicts: AdvancedSyncService.getUnresolvedConflicts(),
    isInitializing: false,
    isSyncing: false,
    isRefreshing: false,
    error: null,
  });

  const unsubscribersRef = useRef<(() => void)[]>([]);
  const isInitializedRef = useRef(false);

  // Initialize sync services
  useEffect(() => {
    if (!user?.uid || isInitializedRef.current) return;

    const initializeSync = async () => {
      setState(prev => ({ ...prev, isInitializing: true, error: null }));

      try {
        // Initialize all sync services
        await Promise.all([
          CrossPlatformSyncService.initialize(user.uid, 'current-device'),
          AdvancedSyncService.initialize(user.uid),
          OfflineQueueService.initialize(),
          BandwidthOptimizationService.initialize(),
          SyncAnalyticsService.initialize(user.uid, 'current-device'),
        ]);

        isInitializedRef.current = true;

        // Setup event listeners
        setupEventListeners();

        // Load initial data
        await refreshAllData();

        setState(prev => ({ ...prev, isInitializing: false }));
      } catch (error) {
        console.error('Error initializing sync services:', error);
        setState(prev => ({ 
          ...prev, 
          isInitializing: false, 
          error: error instanceof Error ? error.message : String(error) 
        }));
      }
    };

    initializeSync();

    return () => {
      // Cleanup event listeners
      unsubscribersRef.current.forEach(unsub => unsub());
      unsubscribersRef.current = [];
      
      // Cleanup services
      AdvancedSyncService.cleanup();
      OfflineQueueService.cleanup();
      BandwidthOptimizationService.cleanup();
      SyncAnalyticsService.cleanup();
      CrossPlatformSyncService.cleanup();
      
      isInitializedRef.current = false;
    };
  }, [user?.uid]);

  // Setup event listeners
  const setupEventListeners = useCallback(() => {
    const listeners = [
      // Sync events
      AdvancedSyncService.onSyncEvent('sync_started', () => {
        setState(prev => ({ 
          ...prev, 
          isSyncing: true, 
          syncStatus: AdvancedSyncService.getSyncStatus() 
        }));
      }),

      AdvancedSyncService.onSyncEvent('sync_completed', () => {
        setState(prev => ({ 
          ...prev, 
          isSyncing: false, 
          syncStatus: AdvancedSyncService.getSyncStatus() 
        }));
        refreshStatusData();
      }),

      AdvancedSyncService.onSyncEvent('sync_error', (event) => {
        setState(prev => ({ 
          ...prev, 
          isSyncing: false, 
          syncStatus: AdvancedSyncService.getSyncStatus(),
          error: event.data?.error || 'Sync error occurred' 
        }));
      }),

      AdvancedSyncService.onSyncEvent('conflict_detected', () => {
        setState(prev => ({ 
          ...prev, 
          conflicts: AdvancedSyncService.getUnresolvedConflicts() 
        }));
      }),

      AdvancedSyncService.onSyncEvent('conflict_resolved', () => {
        setState(prev => ({ 
          ...prev, 
          conflicts: AdvancedSyncService.getUnresolvedConflicts() 
        }));
      }),

      // Offline queue events
      OfflineQueueService.addEventListener('operation_added', () => {
        setState(prev => ({ 
          ...prev, 
          queueStatus: OfflineQueueService.getQueueStatus() 
        }));
      }),

      OfflineQueueService.addEventListener('operation_completed', () => {
        setState(prev => ({ 
          ...prev, 
          queueStatus: OfflineQueueService.getQueueStatus() 
        }));
      }),
    ];

    unsubscribersRef.current = listeners;
  }, []);

  // Refresh all data
  const refreshAllData = useCallback(async () => {
    if (!user?.uid) return;

    try {
      const [performance, health, deviceList] = await Promise.all([
        SyncAnalyticsService.getPerformanceMetrics(),
        SyncAnalyticsService.getSyncHealthReport(),
        DeviceService.getUserDevices(user.uid),
      ]);

      setState(prev => ({
        ...prev,
        performanceMetrics: performance,
        healthReport: health,
        devices: deviceList,
      }));
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  }, [user?.uid]);

  // Refresh status data only
  const refreshStatusData = useCallback(() => {
    setState(prev => ({
      ...prev,
      syncStatus: AdvancedSyncService.getSyncStatus(),
      queueStatus: OfflineQueueService.getQueueStatus(),
      optimizationStats: BandwidthOptimizationService.getOptimizationStats(),
      conflicts: AdvancedSyncService.getUnresolvedConflicts(),
    }));
  }, []);

  // Actions
  const actions: AdvancedSyncActions = {
    // Core sync operations
    manualSync: useCallback(async () => {
      setState(prev => ({ ...prev, isSyncing: true, error: null }));
      try {
        await AdvancedSyncService.manualSync();
      } catch (error) {
        setState(prev => ({ 
          ...prev, 
          error: error instanceof Error ? error.message : String(error) 
        }));
        throw error;
      } finally {
        setState(prev => ({ ...prev, isSyncing: false }));
      }
    }, []),

    publishSyncEvent: useCallback(async (type: SyncEventType, data: any, priority = 1) => {
      try {
        await AdvancedSyncService.publishSyncEvent(type, data, priority);
      } catch (error) {
        setState(prev => ({ 
          ...prev, 
          error: error instanceof Error ? error.message : String(error) 
        }));
        throw error;
      }
    }, []),

    // Configuration
    updateSyncConfig: useCallback((config: Partial<SyncConfig>) => {
      try {
        AdvancedSyncService.updateSyncConfig(config);
        setState(prev => ({ ...prev, error: null }));
      } catch (error) {
        setState(prev => ({ 
          ...prev, 
          error: error instanceof Error ? error.message : String(error) 
        }));
      }
    }, []),

    // Conflict resolution
    resolveConflict: useCallback(async (conflictId: string, resolution: 'local' | 'remote' | 'merge', customData?: any) => {
      try {
        await AdvancedSyncService.resolveConflict(conflictId, resolution, customData);
        setState(prev => ({ 
          ...prev, 
          conflicts: AdvancedSyncService.getUnresolvedConflicts(),
          error: null 
        }));
      } catch (error) {
        setState(prev => ({ 
          ...prev, 
          error: error instanceof Error ? error.message : String(error) 
        }));
        throw error;
      }
    }, []),

    // Device management
    trustDevice: useCallback(async (deviceId: string) => {
      if (!user?.uid) return;

      try {
        await DeviceService.trustDevice(user.uid, deviceId);
        await refreshAllData();
        setState(prev => ({ ...prev, error: null }));
      } catch (error) {
        setState(prev => ({ 
          ...prev, 
          error: error instanceof Error ? error.message : String(error) 
        }));
        throw error;
      }
    }, [user?.uid, refreshAllData]),

    removeDevice: useCallback(async (deviceId: string) => {
      if (!user?.uid) return;

      try {
        await DeviceService.removeDevice(user.uid, deviceId);
        await refreshAllData();
        setState(prev => ({ ...prev, error: null }));
      } catch (error) {
        setState(prev => ({ 
          ...prev, 
          error: error instanceof Error ? error.message : String(error) 
        }));
        throw error;
      }
    }, [user?.uid, refreshAllData]),

    // Data management
    clearOfflineQueue: useCallback(async () => {
      try {
        await OfflineQueueService.clearQueue();
        setState(prev => ({ 
          ...prev, 
          queueStatus: OfflineQueueService.getQueueStatus(),
          error: null 
        }));
      } catch (error) {
        setState(prev => ({ 
          ...prev, 
          error: error instanceof Error ? error.message : String(error) 
        }));
        throw error;
      }
    }, []),

    exportSyncData: useCallback(async (format = 'json' as 'json' | 'csv') => {
      try {
        const data = await SyncAnalyticsService.exportAnalyticsData(format);
        setState(prev => ({ ...prev, error: null }));
        return data;
      } catch (error) {
        setState(prev => ({ 
          ...prev, 
          error: error instanceof Error ? error.message : String(error) 
        }));
        throw error;
      }
    }, []),

    // Refresh operations
    refreshStatus: useCallback(() => {
      refreshStatusData();
    }, [refreshStatusData]),

    refreshDevices: useCallback(async () => {
      if (!user?.uid) return;

      setState(prev => ({ ...prev, isRefreshing: true }));
      try {
        const deviceList = await DeviceService.getUserDevices(user.uid);
        setState(prev => ({ 
          ...prev, 
          devices: deviceList, 
          isRefreshing: false, 
          error: null 
        }));
      } catch (error) {
        setState(prev => ({ 
          ...prev, 
          isRefreshing: false,
          error: error instanceof Error ? error.message : String(error) 
        }));
      }
    }, [user?.uid]),

    refreshAnalytics: useCallback(async () => {
      setState(prev => ({ ...prev, isRefreshing: true }));
      try {
        const [performance, health] = await Promise.all([
          SyncAnalyticsService.getPerformanceMetrics(),
          SyncAnalyticsService.getSyncHealthReport(),
        ]);

        setState(prev => ({ 
          ...prev, 
          performanceMetrics: performance,
          healthReport: health,
          isRefreshing: false,
          error: null 
        }));
      } catch (error) {
        setState(prev => ({ 
          ...prev, 
          isRefreshing: false,
          error: error instanceof Error ? error.message : String(error) 
        }));
      }
    }, []),
  };

  // Periodic refresh
  useEffect(() => {
    if (!isInitializedRef.current) return;

    const refreshInterval = setInterval(() => {
      refreshStatusData();
    }, 30000); // Every 30 seconds

    return () => clearInterval(refreshInterval);
  }, [refreshStatusData]);

  return { state, actions };
};

export default useAdvancedSync;