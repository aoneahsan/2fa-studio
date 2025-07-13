/**
 * Sync service for managing real-time data synchronization
 * @module services/sync
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  writeBatch,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
  QuerySnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db } from '@src/config/firebase';
import { DeviceService } from './device.service';
import { NotificationService } from './notification.service';

export interface SyncEvent {
  id: string;
  type: 'account_added' | 'account_updated' | 'account_deleted' | 
        'tag_added' | 'tag_updated' | 'tag_deleted' |
        'folder_added' | 'folder_updated' | 'folder_deleted' |
        'settings_updated' | 'device_added' | 'device_removed';
  userId: string;
  deviceId: string;
  timestamp: Date;
  data: any;
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
  localData: any;
  remoteData: any;
  localTimestamp: Date;
  remoteTimestamp: Date;
  resolved: boolean;
  resolution?: 'local' | 'remote' | 'merge';
}

const PROJECT_PREFIX = 'fa2s_';

export class SyncService {
  private static readonly SYNC_EVENTS_COLLECTION = `${PROJECT_PREFIX}sync_events`;
  private static readonly SYNC_STATUS_KEY = `${PROJECT_PREFIX}sync_status`;
  private static subscriptions: Map<string, Unsubscribe> = new Map();
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
   * Initialize sync service
   */
  static async initialize(userId: string): Promise<void> {
    // Register device if not already registered
    const deviceId = await DeviceService.getDeviceId();
    await DeviceService.registerDevice(userId);

    // Setup online/offline listeners
    this.setupConnectivityListeners();

    // Subscribe to sync events
    await this.subscribeSyncEvents(userId);

    // Load sync status from local storage
    this.loadSyncStatus();

    // Clean up old sync events
    this.cleanupOldSyncEvents(userId);
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
   * Subscribe to sync events
   */
  private static async subscribeSyncEvents(userId: string): Promise<void> {
    const deviceId = await DeviceService.getDeviceId();
    const syncRef = collection(db, 'users', userId, this.SYNC_EVENTS_COLLECTION);
    
    // Subscribe to events from other devices
    const q = query(
      syncRef,
      where('deviceId', '!=', deviceId),
      where('synced', '==', false),
      orderBy('deviceId'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      this.handleSyncEvents(snapshot, deviceId);
    });

    this.subscriptions.set('sync_events', unsubscribe);
  }

  /**
   * Handle incoming sync events
   */
  private static async handleSyncEvents(
    snapshot: QuerySnapshot<DocumentData>,
    currentDeviceId: string
  ): Promise<void> {
    const events: SyncEvent[] = [];

    snapshot.docChanges().forEach(change => {
      if (change.type === 'added') {
        const data = change.doc.data();
        const event: SyncEvent = {
          id: change.doc.id,
          type: data.type,
          userId: data.userId,
          deviceId: data.deviceId,
          timestamp: (data.timestamp as Timestamp)?.toDate() || new Date(),
          data: data.data,
          synced: data.synced,
        };

        events.push(event);
      }
    });

    // Process events in order
    for (const event of events) {
      await this.processSyncEvent(event);
    }

    // Update connected devices count
    const uniqueDevices = new Set(events.map(e => e.deviceId));
    this.updateSyncStatus({ connectedDevices: uniqueDevices.size + 1 });
  }

  /**
   * Process a sync event
   */
  private static async processSyncEvent(event: SyncEvent): Promise<void> {
    // Notify event handlers
    const handlers = this.eventHandlers.get(event.type) || [];
    handlers.forEach(handler => handler(event));

    // Mark event as synced
    const syncRef = doc(
      db, 
      'users', 
      event.userId, 
      this.SYNC_EVENTS_COLLECTION, 
      event.id
    );
    
    try {
      await updateDoc(syncRef, { synced: true });
      this.updateSyncStatus({ lastSyncTime: new Date() });
    } catch (error) {
      console.error('Error marking sync event as processed:', error);
    }
  }

  /**
   * Publish a sync event
   */
  static async publishSyncEvent(
    userId: string,
    type: SyncEvent['type'],
    data: any
  ): Promise<void> {
    if (!this.syncStatus.isOnline) {
      // Queue for later if offline
      this.queuePendingChange({ type, data });
      return;
    }

    const deviceId = await DeviceService.getDeviceId();
    const syncRef = collection(db, 'users', userId, this.SYNC_EVENTS_COLLECTION);

    const event = {
      type,
      userId,
      deviceId,
      timestamp: serverTimestamp(),
      data,
      synced: false,
    };

    try {
      await addDoc(syncRef, event);
    } catch (error) {
      console.error('Error publishing sync event:', error);
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
  private static queuePendingChange(change: { type: SyncEvent['type']; data: any }): void {
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
  private static getPendingChanges(): any[] {
    const stored = localStorage.getItem(`${PROJECT_PREFIX}pending_changes`);
    return stored ? JSON.parse(stored) : [];
  }

  /**
   * Process pending changes
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
        // Re-publish the change
        await this.publishSyncEvent(
          change.userId,
          change.type,
          change.data
        );
        processedIds.push(change.id);
      } catch (error) {
        console.error('Error processing pending change:', error);
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
   * Handle sync conflict
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
   * Resolve sync conflict
   */
  static resolveConflict(conflictId: string, resolution: 'local' | 'remote' | 'merge'): void {
    const conflict = this.conflictQueue.find(c => c.id === conflictId);
    if (conflict) {
      conflict.resolved = true;
      conflict.resolution = resolution;
      
      // Remove from queue
      this.conflictQueue = this.conflictQueue.filter(c => c.id !== conflictId);
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
      } catch (error) {
        console.error('Error loading sync status:', error);
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
   * Clean up old sync events
   */
  private static async cleanupOldSyncEvents(userId: string): Promise<void> {
    // Clean up events older than 7 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);

    const syncRef = collection(db, 'users', userId, this.SYNC_EVENTS_COLLECTION);
    const q = query(
      syncRef,
      where('timestamp', '<', Timestamp.fromDate(cutoffDate)),
      where('synced', '==', true)
    );

    try {
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);

      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
    } catch (error) {
      console.error('Error cleaning up old sync events:', error);
    }
  }

  /**
   * Cleanup and unsubscribe
   */
  static cleanup(): void {
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.subscriptions.clear();
    this.eventHandlers.clear();
    this.conflictQueue = [];
  }
}