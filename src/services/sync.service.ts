/**
 * Enhanced sync service integrating with RealtimeSyncService
 * @module services/sync
 */

import { RealtimeSyncService } from './realtime-sync.service';
import { DeviceService } from './device.service';
import { NotificationService } from './notification-service';

export interface SyncEvent {
  id: string;
  type: 'account_added' | 'account_updated' | 'account_deleted' | 
        'tag_added' | 'tag_updated' | 'tag_deleted' |
        'folder_added' | 'folder_updated' | 'folder_deleted' |
        'settings_updated' | 'device_added' | 'device_removed';
  userId: string;
  deviceId: string;
  timestamp: Date;
  data: unknown;
  synced: boolean;
}

export interface SyncStatus {
  isOnline: boolean;
  lastSyncTime: Date | null;
  pendingChanges: number;
  syncInProgress: boolean;
  connectedDevices: number;
}

export interface SyncConflict {
  id: string;
  type: string;
  localData: unknown;
  remoteData: unknown;
  localTimestamp: Date;
  remoteTimestamp: Date;
  resolved: boolean;
  resolution?: 'local' | 'remote' | 'merge';
}

const PROJECT_PREFIX = 'fa2s_';

export class SyncService {
  private static readonly SYNC_STATUS_KEY = `${PROJECT_PREFIX}sync_status`;
  private static subscriptions: Map<string, () => void> = new Map();
  private static syncStatus: SyncStatus = {
    isOnline: navigator.onLine,
    lastSyncTime: null,
    pendingChanges: 0,
    syncInProgress: false,
    connectedDevices: 1,
  };
  private static conflictQueue: SyncConflict[] = [];
  private static eventHandlers: Map<string, ((event: SyncEvent) => void)[]> = new Map();

  /**
   * Initialize sync service using RealtimeSyncService
   */
  static async initialize(userId: string): Promise<void> {
    // Register device if not already registered
    const deviceId = await DeviceService.getDeviceId();
    await DeviceService.registerDevice(userId);

    // Setup online/offline listeners
    this.setupConnectivityListeners();

    // Initialize RealtimeSyncService
    await RealtimeSyncService.initialize(userId);

    // Subscribe to sync events through RealtimeSyncService
    await this.subscribeSyncEvents(userId);

    // Load sync status from local storage
    this.loadSyncStatus();
  }

  /**
   * Setup connectivity listeners
   */
  private static setupConnectivityListeners(): void {
    window.addEventListener('online', () => {
      this.updateSyncStatus({ isOnline: true });
      this.processPendingChanges();
    });

    window.addEventListener('offline', () => {
      this.updateSyncStatus({ isOnline: false });
    });

    // Check connection periodically
    setInterval(() => {
      const isOnline = navigator.onLine;
      if (isOnline !== this.syncStatus.isOnline) {
        this.updateSyncStatus({ isOnline });
        if (isOnline) {
          this.processPendingChanges();
        }
      }
    }, 5000);
  }

  /**
   * Subscribe to sync events using RealtimeSyncService
   */
  private static async subscribeSyncEvents(userId: string): Promise<void> {
    // Subscribe to sync events from RealtimeSyncService
    RealtimeSyncService.addEventListener((event) => {
      if (event.type === 'data_changed' && event.data) {
        // Convert RealtimeSyncService event to SyncEvent format
        const syncEvent: SyncEvent = {
          id: `sync_${Date.now()}`,
          type: 'account_updated', // Default type, could be enhanced
          userId: userId,
          deviceId: 'current',
          timestamp: new Date(),
          data: event.data,
          synced: true,
        };

        this.handleSyncEvent(syncEvent);
      }
    });
  }

  /**
   * Handle a single sync event
   */
  private static handleSyncEvent(event: SyncEvent): void {
    // Notify event handlers
    const handlers = this.eventHandlers.get(event.type) || [];
    handlers.forEach(handler => handler(event));

    // Update sync status
    this.updateSyncStatus({ lastSyncTime: new Date() });
  }

  /**
   * Publish a sync event using RealtimeSyncService
   */
  static async publishSyncEvent(
    userId: string,
    type: SyncEvent['type'],
    data: unknown
  ): Promise<void> {
    if (!this.syncStatus.isOnline) {
      // Queue for later if offline
      this.queuePendingChange({ type, data });
      return;
    }

    try {
      // Use RealtimeSyncService to queue the operation
      RealtimeSyncService.queueOperation(
        type,
        data,
        'pending'
      );
    } catch (_error) {
      console.error('Error publishing sync event:', _error);
      this.queuePendingChange({ type, data });
    }
  }

  /**
   * Subscribe to sync event type
   */
  static onSyncEvent(
    eventType: SyncEvent['type'],
    handler: (event: SyncEvent) => void
  ): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }

    this.eventHandlers.get(eventType)!.push(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.eventHandlers.get(eventType) || [];
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    };
  }

  /**
   * Queue pending change for later sync
   */
  private static queuePendingChange(change: { type: SyncEvent['type']; data: unknown }): void {
    const pendingChanges = this.getPendingChanges();
    pendingChanges.push({
      ...change,
      timestamp: new Date().toISOString(),
      id: `pending_${Date.now()}_${Math.random()}`,
    });

    localStorage.setItem(`${PROJECT_PREFIX}pending_changes`, JSON.stringify(pendingChanges));
    this.updateSyncStatus({ pendingChanges: pendingChanges.length });
  }

  /**
   * Get pending changes
   */
  private static getPendingChanges(): unknown[] {
    const stored = localStorage.getItem(`${PROJECT_PREFIX}pending_changes`);
    return stored ? JSON.parse(stored) : [];
  }

  /**
   * Process pending changes using RealtimeSyncService
   */
  private static async processPendingChanges(): Promise<void> {
    if (!this.syncStatus.isOnline || this.syncStatus.syncInProgress) {
      return;
    }

    this.updateSyncStatus({ syncInProgress: true });

    const pendingChanges = this.getPendingChanges();
    const processedIds: string[] = [];

    for (const change of pendingChanges) {
      try {
        // Use RealtimeSyncService to sync pending changes
        await RealtimeSyncService.syncPendingChanges();
        processedIds.push(change.id);
      } catch (_error) {
        console.error('Error processing pending change:', _error);
      }
    }

    // Remove processed changes
    const remainingChanges = pendingChanges.filter(
      change => !processedIds.includes(change.id)
    );
    
    localStorage.setItem(
      `${PROJECT_PREFIX}pending_changes`, 
      JSON.stringify(remainingChanges)
    );

    this.updateSyncStatus({
      syncInProgress: false,
      pendingChanges: remainingChanges.length,
    });
  }

  /**
   * Handle sync conflict using RealtimeSyncService
   */
  static addConflict(conflict: Omit<SyncConflict, 'id' | 'resolved'>): void {
    const newConflict: SyncConflict = {
      ...conflict,
      id: `conflict_${Date.now()}_${Math.random()}`,
      resolved: false,
    };

    this.conflictQueue.push(newConflict);

    // Notify user about conflict
    NotificationService.showNotification({
      title: 'Sync Conflict Detected',
      body: `A sync conflict was detected for ${conflict.type}. Please resolve it.`,
      icon: 'warning',
    });
  }

  /**
   * Resolve sync conflict using RealtimeSyncService
   */
  static async resolveConflict(conflictId: string, resolution: 'local' | 'remote' | 'merge'): Promise<void> {
    const conflict = this.conflictQueue.find(c => c.id === conflictId);
    if (conflict) {
      try {
        // Use RealtimeSyncService to resolve the conflict
        await RealtimeSyncService.resolveConflict(conflictId, resolution);
        
        conflict.resolved = true;
        conflict.resolution = resolution;
        
        // Remove from queue
        this.conflictQueue = this.conflictQueue.filter(c => c.id !== conflictId);
      } catch (_error) {
        console.error('Error resolving conflict:', _error);
      }
    }
  }

  /**
   * Get unresolved conflicts
   */
  static getUnresolvedConflicts(): SyncConflict[] {
    return this.conflictQueue.filter(c => !c.resolved);
  }

  /**
   * Update sync status
   */
  private static updateSyncStatus(updates: Partial<SyncStatus>): void {
    this.syncStatus = { ...this.syncStatus, ...updates };
    localStorage.setItem(this.SYNC_STATUS_KEY, JSON.stringify(this.syncStatus));
  }

  /**
   * Load sync status from storage
   */
  private static loadSyncStatus(): void {
    const stored = localStorage.getItem(this.SYNC_STATUS_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        this.syncStatus = {
          ...this.syncStatus,
          ...parsed,
          lastSyncTime: parsed.lastSyncTime ? new Date(parsed.lastSyncTime) : null,
        };
      } catch (_error) {
        console.error('Error loading sync status:', _error);
      }
    }
  }

  /**
   * Get current sync status
   */
  static getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * Cleanup and unsubscribe
   */
  static cleanup(): void {
    // Cleanup RealtimeSyncService
    RealtimeSyncService.cleanup();
    
    // Cleanup local subscriptions
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.subscriptions.clear();
    this.eventHandlers.clear();
    this.conflictQueue = [];
  }
}