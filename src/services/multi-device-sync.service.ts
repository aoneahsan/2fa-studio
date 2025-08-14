/**
 * Multi-Device Sync Service
 * Handles real-time synchronization across multiple devices
 */

import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { EncryptionService } from './encryption.service';
import { Device } from '@capacitor/device';
import { Capacitor } from '@capacitor/core';

export interface DeviceInfo {
  id: string;
  name: string;
  platform: string;
  model: string;
  manufacturer: string;
  osVersion: string;
  appVersion: string;
  lastSeen: Date;
  trusted: boolean;
  createdAt: Date;
}

export interface SyncEvent {
  id: string;
  deviceId: string;
  type: 'add' | 'update' | 'delete';
  entityType: 'account' | 'folder' | 'setting';
  entityId: string;
  data?: any;
  timestamp: Date;
  synced: boolean;
}

export interface SyncConflict {
  id: string;
  entityType: string;
  entityId: string;
  localData: any;
  remoteData: any;
  timestamp: Date;
  resolved: boolean;
  resolution?: 'local' | 'remote' | 'merge';
}

export class MultiDeviceSyncService {
  private static instance: MultiDeviceSyncService;
  private static deviceId: string | null = null;
  private static userId: string | null = null;
  private static syncListeners: Map<string, () => void> = new Map();
  private static syncQueue: SyncEvent[] = [];
  private static isSyncing = false;
  private static lastSyncTime: Date | null = null;
  private static conflictHandlers: Map<string, (conflict: SyncConflict) => Promise<any>> = new Map();

  private constructor() {}

  public static getInstance(): MultiDeviceSyncService {
    if (!MultiDeviceSyncService.instance) {
      MultiDeviceSyncService.instance = new MultiDeviceSyncService();
    }
    return MultiDeviceSyncService.instance;
  }

  /**
   * Initialize sync service
   */
  public async initialize(userId: string): Promise<void> {
    try {
      MultiDeviceSyncService.userId = userId;
      MultiDeviceSyncService.deviceId = await this.getDeviceId();
      
      // Register device
      await this.registerDevice();
      
      // Start listening for sync events
      this.startSyncListeners();
      
      // Process any pending sync events
      await this.processSyncQueue();
      
      console.log('Multi-device sync initialized');
    } catch (error) {
      console.error('Failed to initialize sync:', error);
      throw error;
    }
  }

  /**
   * Register current device
   */
  private async registerDevice(): Promise<void> {
    if (!MultiDeviceSyncService.userId || !MultiDeviceSyncService.deviceId) {
      throw new Error('User or device ID not set');
    }

    const deviceInfo = await this.getDeviceInfo();
    const deviceRef = doc(
      db, 
      'users',
      MultiDeviceSyncService.userId,
      'devices',
      MultiDeviceSyncService.deviceId
    );

    await setDoc(deviceRef, {
      ...deviceInfo,
      lastSeen: serverTimestamp(),
      trusted: true // Auto-trust for now, implement trust flow later
    }, { merge: true });
  }

  /**
   * Get list of registered devices
   */
  public async getDevices(): Promise<DeviceInfo[]> {
    if (!MultiDeviceSyncService.userId) {
      throw new Error('User ID not set');
    }

    const devicesRef = collection(
      db,
      'users',
      MultiDeviceSyncService.userId,
      'devices'
    );
    
    const q = query(devicesRef, orderBy('lastSeen', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as DeviceInfo));
  }

  /**
   * Remove a device
   */
  public async removeDevice(deviceId: string): Promise<void> {
    if (!MultiDeviceSyncService.userId) {
      throw new Error('User ID not set');
    }

    const deviceRef = doc(
      db,
      'users',
      MultiDeviceSyncService.userId,
      'devices',
      deviceId
    );
    
    await deleteDoc(deviceRef);
  }

  /**
   * Sync account changes
   */
  public async syncAccount(
    action: 'add' | 'update' | 'delete',
    accountId: string,
    data?: any
  ): Promise<void> {
    await this.addSyncEvent({
      id: crypto.randomUUID(),
      deviceId: MultiDeviceSyncService.deviceId!,
      type: action,
      entityType: 'account',
      entityId: accountId,
      data: data ? await this.encryptSyncData(data) : undefined,
      timestamp: new Date(),
      synced: false
    });
  }

  /**
   * Sync folder changes
   */
  public async syncFolder(
    action: 'add' | 'update' | 'delete',
    folderId: string,
    data?: any
  ): Promise<void> {
    await this.addSyncEvent({
      id: crypto.randomUUID(),
      deviceId: MultiDeviceSyncService.deviceId!,
      type: action,
      entityType: 'folder',
      entityId: folderId,
      data,
      timestamp: new Date(),
      synced: false
    });
  }

  /**
   * Sync settings changes
   */
  public async syncSettings(settingsData: any): Promise<void> {
    await this.addSyncEvent({
      id: crypto.randomUUID(),
      deviceId: MultiDeviceSyncService.deviceId!,
      type: 'update',
      entityType: 'setting',
      entityId: 'user-settings',
      data: settingsData,
      timestamp: new Date(),
      synced: false
    });
  }

  /**
   * Add sync event to queue
   */
  private async addSyncEvent(event: SyncEvent): Promise<void> {
    MultiDeviceSyncService.syncQueue.push(event);
    
    // Process queue if not already syncing
    if (!MultiDeviceSyncService.isSyncing) {
      await this.processSyncQueue();
    }
  }

  /**
   * Process sync queue
   */
  private async processSyncQueue(): Promise<void> {
    if (MultiDeviceSyncService.isSyncing || MultiDeviceSyncService.syncQueue.length === 0) {
      return;
    }

    MultiDeviceSyncService.isSyncing = true;

    try {
      const batch = writeBatch(db);
      const events = [...MultiDeviceSyncService.syncQueue];
      MultiDeviceSyncService.syncQueue = [];

      for (const event of events) {
        const syncRef = doc(
          db,
          'users',
          MultiDeviceSyncService.userId!,
          'sync_queue',
          event.id
        );
        
        batch.set(syncRef, {
          ...event,
          timestamp: serverTimestamp()
        });
      }

      await batch.commit();
      MultiDeviceSyncService.lastSyncTime = new Date();
      
    } catch (error) {
      console.error('Sync queue processing failed:', error);
      // Re-add events to queue for retry
      MultiDeviceSyncService.syncQueue.unshift(...MultiDeviceSyncService.syncQueue);
    } finally {
      MultiDeviceSyncService.isSyncing = false;
    }
  }

  /**
   * Start sync listeners
   */
  private startSyncListeners(): void {
    if (!MultiDeviceSyncService.userId) return;

    // Listen for sync events from other devices
    const syncRef = collection(
      db,
      'users',
      MultiDeviceSyncService.userId,
      'sync_queue'
    );
    
    const q = query(
      syncRef,
      where('deviceId', '!=', MultiDeviceSyncService.deviceId),
      where('synced', '==', false),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      for (const change of snapshot.docChanges()) {
        if (change.type === 'added') {
          await this.handleRemoteSyncEvent(change.doc.data() as SyncEvent);
        }
      }
    });

    MultiDeviceSyncService.syncListeners.set('sync_queue', unsubscribe);
  }

  /**
   * Handle remote sync event
   */
  private async handleRemoteSyncEvent(event: SyncEvent): Promise<void> {
    try {
      console.log('Handling remote sync event:', event);

      // Decrypt data if needed
      if (event.data && event.entityType === 'account') {
        event.data = await this.decryptSyncData(event.data);
      }

      // Check for conflicts
      const conflict = await this.checkForConflict(event);
      if (conflict) {
        await this.handleConflict(conflict);
        return;
      }

      // Apply sync event
      await this.applySyncEvent(event);

      // Mark as synced
      await this.markEventAsSynced(event.id);
      
    } catch (error) {
      console.error('Failed to handle remote sync event:', error);
    }
  }

  /**
   * Check for sync conflicts
   */
  private async checkForConflict(event: SyncEvent): Promise<SyncConflict | null> {
    // Implement conflict detection logic
    // For now, return null (no conflict)
    return null;
  }

  /**
   * Handle sync conflict
   */
  private async handleConflict(conflict: SyncConflict): Promise<void> {
    const handler = MultiDeviceSyncService.conflictHandlers.get(conflict.entityType);
    
    if (handler) {
      const resolution = await handler(conflict);
      await this.resolveConflict(conflict.id, resolution);
    } else {
      // Default: prefer remote (latest wins)
      await this.resolveConflict(conflict.id, 'remote');
    }
  }

  /**
   * Resolve conflict
   */
  private async resolveConflict(
    conflictId: string,
    resolution: 'local' | 'remote' | 'merge'
  ): Promise<void> {
    const conflictRef = doc(
      db,
      'users',
      MultiDeviceSyncService.userId!,
      'syncConflicts',
      conflictId
    );
    
    await setDoc(conflictRef, {
      resolved: true,
      resolution,
      resolvedAt: serverTimestamp()
    }, { merge: true });
  }

  /**
   * Apply sync event
   */
  private async applySyncEvent(event: SyncEvent): Promise<void> {
    // Emit event for UI to handle
    window.dispatchEvent(new CustomEvent('sync-event', {
      detail: event
    }));
  }

  /**
   * Mark event as synced
   */
  private async markEventAsSynced(eventId: string): Promise<void> {
    const eventRef = doc(
      db,
      'users',
      MultiDeviceSyncService.userId!,
      'sync_queue',
      eventId
    );
    
    await setDoc(eventRef, {
      synced: true,
      syncedAt: serverTimestamp()
    }, { merge: true });
  }

  /**
   * Register conflict handler
   */
  public registerConflictHandler(
    entityType: string,
    handler: (conflict: SyncConflict) => Promise<any>
  ): void {
    MultiDeviceSyncService.conflictHandlers.set(entityType, handler);
  }

  /**
   * Get sync status
   */
  public getSyncStatus(): {
    isActive: boolean;
    lastSync: Date | null;
    pendingEvents: number;
    deviceId: string | null;
  } {
    return {
      isActive: MultiDeviceSyncService.isSyncing,
      lastSync: MultiDeviceSyncService.lastSyncTime,
      pendingEvents: MultiDeviceSyncService.syncQueue.length,
      deviceId: MultiDeviceSyncService.deviceId
    };
  }

  /**
   * Force sync
   */
  public async forceSync(): Promise<void> {
    await this.processSyncQueue();
  }

  /**
   * Pause sync
   */
  public pauseSync(): void {
    // Stop all listeners
    MultiDeviceSyncService.syncListeners.forEach(unsubscribe => unsubscribe());
    MultiDeviceSyncService.syncListeners.clear();
  }

  /**
   * Resume sync
   */
  public resumeSync(): void {
    this.startSyncListeners();
    this.processSyncQueue();
  }

  /**
   * Cleanup on logout
   */
  public cleanup(): void {
    this.pauseSync();
    MultiDeviceSyncService.syncQueue = [];
    MultiDeviceSyncService.userId = null;
    MultiDeviceSyncService.deviceId = null;
    MultiDeviceSyncService.lastSyncTime = null;
    MultiDeviceSyncService.isSyncing = false;
  }

  // Helper methods

  private async getDeviceId(): Promise<string> {
    let deviceId = localStorage.getItem('device_id');
    
    if (!deviceId) {
      if (Capacitor.isNativePlatform()) {
        const info = await Device.getId();
        deviceId = info.identifier;
      } else {
        deviceId = crypto.randomUUID();
      }
      localStorage.setItem('device_id', deviceId);
    }
    
    return deviceId;
  }

  private async getDeviceInfo(): Promise<Partial<DeviceInfo>> {
    if (Capacitor.isNativePlatform()) {
      const info = await Device.getInfo();
      return {
        id: MultiDeviceSyncService.deviceId!,
        name: `${info.manufacturer} ${info.model}`,
        platform: info.platform,
        model: info.model,
        manufacturer: info.manufacturer,
        osVersion: info.osVersion,
        appVersion: '1.0.0',
        createdAt: new Date()
      };
    }
    
    return {
      id: MultiDeviceSyncService.deviceId!,
      name: navigator.userAgent.substring(0, 50),
      platform: 'web',
      model: 'Browser',
      manufacturer: 'Unknown',
      osVersion: navigator.platform,
      appVersion: '1.0.0',
      createdAt: new Date()
    };
  }

  private async encryptSyncData(data: any): Promise<string> {
    const jsonData = JSON.stringify(data);
    return await EncryptionService.encrypt(jsonData, 'sync_encryption_key');
  }

  private async decryptSyncData(encryptedData: string): Promise<any> {
    const decrypted = await EncryptionService.decrypt(encryptedData, 'sync_encryption_key');
    return JSON.parse(decrypted);
  }
}