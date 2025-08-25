/**
 * Advanced Multi-Device Sync Service
 * Provides comprehensive synchronization across all platforms with conflict resolution,
 * selective sync, compression, and real-time updates.
 * @module services/advanced-sync
 */

import {
  onSnapshot,
  doc,
  collection,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
  getDocs,
  updateDoc,
  deleteDoc,
  Unsubscribe,
  Timestamp,
  FirestoreError,
} from 'firebase/firestore';
import { db } from '@src/config/firebase';
import { FirestoreService } from './firestore.service';
import { MobileEncryptionService } from './mobile-encryption.service';
import { DeviceService, DeviceInfo } from './device.service';
import { OTPAccount } from './otp.service';
import { User } from '@src/types';
import { UnifiedTrackingService } from './unified-tracking.service';

// Sync Event Types
export type SyncEventType = 
  | 'account_added' | 'account_updated' | 'account_deleted'
  | 'folder_added' | 'folder_updated' | 'folder_deleted'
  | 'tag_added' | 'tag_updated' | 'tag_deleted'
  | 'settings_updated' | 'device_added' | 'device_removed'
  | 'sync_started' | 'sync_completed' | 'sync_error'
  | 'conflict_detected' | 'conflict_resolved';

// Sync Configuration
export interface SyncConfig {
  enableRealTime: boolean;
  enableCompression: boolean;
  enableDeltaSync: boolean;
  enableSelectiveSync: boolean;
  syncIntervalMs: number;
  maxRetries: number;
  compressionThreshold: number;
  conflictResolutionStrategy: 'manual' | 'newest' | 'merge';
  priorityLevels: {
    accounts: number;
    folders: number;
    tags: number;
    settings: number;
  };
}

// Sync Event
export interface SyncEvent {
  id: string;
  type: SyncEventType;
  userId: string;
  deviceId: string;
  timestamp: Date;
  data: any;
  checksum: string;
  compressed: boolean;
  priority: number;
  retryCount: number;
  synced: boolean;
}

// Sync Status
export interface SyncStatus {
  isOnline: boolean;
  isConnected: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  pendingChanges: number;
  conflictCount: number;
  connectedDevices: number;
  syncSpeed: number; // bytes per second
  bandwidth: 'high' | 'medium' | 'low';
  errors: string[];
}

// Conflict Resolution
export interface SyncConflict {
  id: string;
  type: string;
  entityId: string;
  localData: any;
  remoteData: any;
  localTimestamp: Date;
  remoteTimestamp: Date;
  localChecksum: string;
  remoteChecksum: string;
  resolved: boolean;
  resolution?: 'local' | 'remote' | 'merge' | 'manual';
  resolutionData?: any;
}

// Selective Sync Options
export interface SelectiveSyncOptions {
  accounts: boolean;
  folders: boolean;
  tags: boolean;
  settings: boolean;
  deviceSpecific: {
    [deviceId: string]: {
      accounts: string[]; // specific account IDs
      folders: string[]; // specific folder IDs
      tags: string[]; // specific tag IDs
    };
  };
}

// Sync Analytics
export interface SyncAnalytics {
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  averageSync Duration: number;
  dataTransferred: number;
  conflictsResolved: number;
  bandwidthUsage: {
    upload: number;
    download: number;
  };
  deviceStats: {
    [deviceId: string]: {
      lastSync: Date;
      syncCount: number;
      errorCount: number;
    };
  };
}

const PROJECT_PREFIX = 'fa2s_';

export class AdvancedSyncService {
  private static readonly SYNC_EVENTS_COLLECTION = `${PROJECT_PREFIX}sync_events`;
  private static readonly SYNC_STATUS_KEY = `${PROJECT_PREFIX}sync_status`;
  private static readonly SYNC_CONFIG_KEY = `${PROJECT_PREFIX}sync_config`;
  private static readonly SELECTIVE_SYNC_KEY = `${PROJECT_PREFIX}selective_sync`;
  private static readonly SYNC_ANALYTICS_KEY = `${PROJECT_PREFIX}sync_analytics`;
  private static readonly OFFLINE_QUEUE_KEY = `${PROJECT_PREFIX}offline_queue`;

  // Static state
  private static userId: string | null = null;
  private static deviceId: string | null = null;
  private static listeners: Map<string, Unsubscribe> = new Map();
  private static eventHandlers: Map<SyncEventType, ((event: SyncEvent) => void)[]> = new Map();
  private static syncStatus: SyncStatus = {
    isOnline: navigator.onLine,
    isConnected: false,
    isSyncing: false,
    lastSyncTime: null,
    pendingChanges: 0,
    conflictCount: 0,
    connectedDevices: 1,
    syncSpeed: 0,
    bandwidth: 'high',
    errors: [],
  };
  private static conflicts: Map<string, SyncConflict> = new Map();
  private static offlineQueue: SyncEvent[] = [];
  private static syncConfig: SyncConfig = {
    enableRealTime: true,
    enableCompression: true,
    enableDeltaSync: true,
    enableSelectiveSync: false,
    syncIntervalMs: 30000, // 30 seconds
    maxRetries: 3,
    compressionThreshold: 1024, // 1KB
    conflictResolutionStrategy: 'manual',
    priorityLevels: {
      accounts: 1,
      folders: 2,
      tags: 3,
      settings: 4,
    },
  };
  private static selectiveSyncOptions: SelectiveSyncOptions = {
    accounts: true,
    folders: true,
    tags: true,
    settings: true,
    deviceSpecific: {},
  };
  private static analytics: SyncAnalytics = {
    totalSyncs: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    averageSync Duration: 0,
    dataTransferred: 0,
    conflictsResolved: 0,
    bandwidthUsage: { upload: 0, download: 0 },
    deviceStats: {},
  };
  private static syncInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize the advanced sync service
   */
  static async initialize(userId: string): Promise<void> {
    this.userId = userId;
    this.deviceId = await DeviceService.getDeviceId();

    // Load configuration
    await this.loadConfiguration();

    // Setup connectivity monitoring
    this.setupConnectivityMonitoring();

    // Setup real-time listeners if enabled
    if (this.syncConfig.enableRealTime) {
      await this.setupRealtimeListeners();
    }

    // Start periodic sync if not real-time
    if (!this.syncConfig.enableRealTime) {
      this.startPeriodicSync();
    }

    // Process offline queue
    await this.processOfflineQueue();

    // Track initialization
    await UnifiedTrackingService.track('sync_initialized', {
      userId,
      deviceId: this.deviceId,
      config: this.syncConfig,
    });

    console.log('AdvancedSyncService initialized', {
      userId,
      deviceId: this.deviceId,
      config: this.syncConfig,
    });
  }

  /**
   * Load sync configuration from storage
   */
  private static async loadConfiguration(): Promise<void> {
    try {
      // Load sync config
      const configStr = localStorage.getItem(this.SYNC_CONFIG_KEY);
      if (configStr) {
        this.syncConfig = { ...this.syncConfig, ...JSON.parse(configStr) };
      }

      // Load selective sync options
      const selectiveStr = localStorage.getItem(this.SELECTIVE_SYNC_KEY);
      if (selectiveStr) {
        this.selectiveSyncOptions = { ...this.selectiveSyncOptions, ...JSON.parse(selectiveStr) };
      }

      // Load analytics
      const analyticsStr = localStorage.getItem(this.SYNC_ANALYTICS_KEY);
      if (analyticsStr) {
        this.analytics = { ...this.analytics, ...JSON.parse(analyticsStr) };
      }

      // Load offline queue
      const queueStr = localStorage.getItem(this.OFFLINE_QUEUE_KEY);
      if (queueStr) {
        this.offlineQueue = JSON.parse(queueStr);
      }

      // Load sync status
      const statusStr = localStorage.getItem(this.SYNC_STATUS_KEY);
      if (statusStr) {
        const savedStatus = JSON.parse(statusStr);
        this.syncStatus = {
          ...this.syncStatus,
          ...savedStatus,
          lastSyncTime: savedStatus.lastSyncTime ? new Date(savedStatus.lastSyncTime) : null,
        };
      }
    } catch (error) {
      console.error('Error loading sync configuration:', error);
    }
  }

  /**
   * Setup connectivity monitoring
   */
  private static setupConnectivityMonitoring(): void {
    // Network status listeners
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    // Connection quality monitoring
    this.monitorConnectionQuality();

    // Periodic connectivity check
    setInterval(() => {
      this.checkConnectivity();
    }, 10000); // Check every 10 seconds
  }

  /**
   * Monitor connection quality and adjust bandwidth settings
   */
  private static monitorConnectionQuality(): void {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      const updateBandwidth = () => {
        const effectiveType = connection.effectiveType;
        switch (effectiveType) {
          case 'slow-2g':
          case '2g':
            this.syncStatus.bandwidth = 'low';
            break;
          case '3g':
            this.syncStatus.bandwidth = 'medium';
            break;
          case '4g':
          default:
            this.syncStatus.bandwidth = 'high';
            break;
        }
        this.saveState();
      };

      connection.addEventListener('change', updateBandwidth);
      updateBandwidth();
    }
  }

  /**
   * Check connectivity to Firebase
   */
  private static async checkConnectivity(): Promise<void> {
    try {
      if (!this.userId) return;

      // Try to read a small document to test connectivity
      const testDoc = doc(db, 'users', this.userId);
      await FirestoreService.getDocument('users', this.userId);
      
      this.syncStatus.isConnected = true;
    } catch (error) {
      this.syncStatus.isConnected = false;
      console.log('Connectivity check failed:', error);
    }
    
    this.saveState();
  }

  /**
   * Setup real-time listeners for different data types
   */
  private static async setupRealtimeListeners(): Promise<void> {
    if (!this.userId) return;

    try {
      // Setup sync events listener
      await this.setupSyncEventsListener();

      // Setup individual data type listeners
      if (this.selectiveSyncOptions.accounts) {
        await this.setupAccountsListener();
      }
      if (this.selectiveSyncOptions.folders) {
        await this.setupFoldersListener();
      }
      if (this.selectiveSyncOptions.tags) {
        await this.setupTagsListener();
      }
      if (this.selectiveSyncOptions.settings) {
        await this.setupSettingsListener();
      }

    } catch (error) {
      console.error('Error setting up real-time listeners:', error);
    }
  }

  /**
   * Setup sync events listener for cross-device communication
   */
  private static async setupSyncEventsListener(): Promise<void> {
    if (!this.userId) return;

    const eventsRef = collection(db, 'users', this.userId, this.SYNC_EVENTS_COLLECTION);
    const q = query(
      eventsRef,
      where('deviceId', '!=', this.deviceId),
      where('synced', '==', false),
      orderBy('deviceId'),
      orderBy('timestamp', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => this.handleSyncEventsSnapshot(snapshot),
      (error) => this.handleRealtimeError('sync_events', error)
    );

    this.listeners.set('sync_events', unsubscribe);
  }

  /**
   * Setup accounts listener
   */
  private static async setupAccountsListener(): Promise<void> {
    if (!this.userId) return;

    const accountsRef = collection(db, 'users', this.userId, 'accounts');
    const q = query(accountsRef, orderBy('updatedAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => this.handleAccountsSnapshot(snapshot),
      (error) => this.handleRealtimeError('accounts', error)
    );

    this.listeners.set('accounts', unsubscribe);
  }

  /**
   * Setup folders listener
   */
  private static async setupFoldersListener(): Promise<void> {
    if (!this.userId) return;

    const foldersRef = collection(db, 'users', this.userId, 'folders');
    const q = query(foldersRef, orderBy('updatedAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => this.handleFoldersSnapshot(snapshot),
      (error) => this.handleRealtimeError('folders', error)
    );

    this.listeners.set('folders', unsubscribe);
  }

  /**
   * Setup tags listener
   */
  private static async setupTagsListener(): Promise<void> {
    if (!this.userId) return;

    const tagsRef = collection(db, 'users', this.userId, 'tags');
    const q = query(tagsRef, orderBy('updatedAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => this.handleTagsSnapshot(snapshot),
      (error) => this.handleRealtimeError('tags', error)
    );

    this.listeners.set('tags', unsubscribe);
  }

  /**
   * Setup settings listener
   */
  private static async setupSettingsListener(): Promise<void> {
    if (!this.userId) return;

    const userDoc = doc(db, 'users', this.userId);
    const unsubscribe = onSnapshot(
      userDoc,
      (snapshot) => this.handleSettingsSnapshot(snapshot),
      (error) => this.handleRealtimeError('settings', error)
    );

    this.listeners.set('settings', unsubscribe);
  }

  /**
   * Handle sync events snapshot
   */
  private static async handleSyncEventsSnapshot(snapshot: any): Promise<void> {
    const changes = snapshot.docChanges();
    
    for (const change of changes) {
      if (change.type === 'added') {
        const eventData = {
          id: change.doc.id,
          ...change.doc.data(),
          timestamp: change.doc.data().timestamp?.toDate() || new Date(),
        } as SyncEvent;

        // Skip events from current device
        if (eventData.deviceId === this.deviceId) continue;

        await this.processSyncEvent(eventData);
      }
    }
  }

  /**
   * Handle accounts snapshot changes
   */
  private static async handleAccountsSnapshot(snapshot: any): Promise<void> {
    const changes = snapshot.docChanges();
    
    for (const change of changes) {
      const accountData = {
        id: change.doc.id,
        ...change.doc.data(),
        createdAt: change.doc.data().createdAt?.toDate(),
        updatedAt: change.doc.data().updatedAt?.toDate(),
      } as OTPAccount;

      await this.handleDataChange('account', change.type, accountData);
    }
  }

  /**
   * Handle folders snapshot changes
   */
  private static async handleFoldersSnapshot(snapshot: any): Promise<void> {
    const changes = snapshot.docChanges();
    
    for (const change of changes) {
      const folderData = {
        id: change.doc.id,
        ...change.doc.data(),
        createdAt: change.doc.data().createdAt?.toDate(),
        updatedAt: change.doc.data().updatedAt?.toDate(),
      };

      await this.handleDataChange('folder', change.type, folderData);
    }
  }

  /**
   * Handle tags snapshot changes
   */
  private static async handleTagsSnapshot(snapshot: any): Promise<void> {
    const changes = snapshot.docChanges();
    
    for (const change of changes) {
      const tagData = {
        id: change.doc.id,
        ...change.doc.data(),
        createdAt: change.doc.data().createdAt?.toDate(),
        updatedAt: change.doc.data().updatedAt?.toDate(),
      };

      await this.handleDataChange('tag', change.type, tagData);
    }
  }

  /**
   * Handle settings snapshot changes
   */
  private static async handleSettingsSnapshot(snapshot: any): Promise<void> {
    if (snapshot.exists()) {
      const userData = {
        id: snapshot.id,
        ...snapshot.data(),
        createdAt: snapshot.data()?.createdAt?.toDate(),
        updatedAt: snapshot.data()?.updatedAt?.toDate(),
      } as User;

      await this.handleDataChange('settings', 'modified', userData);
    }
  }

  /**
   * Handle individual data changes with conflict detection
   */
  private static async handleDataChange(
    type: 'account' | 'folder' | 'tag' | 'settings',
    changeType: 'added' | 'modified' | 'removed',
    data: any
  ): Promise<void> {
    try {
      // Check if this change should be processed based on selective sync
      if (!this.shouldProcessChange(type, data)) {
        return;
      }

      // Get local version for conflict detection
      const localData = await this.getLocalData(type, data.id);
      
      if (changeType === 'removed') {
        await this.removeLocalData(type, data.id);
        this.emitSyncEvent(`${type}_deleted` as SyncEventType, data);
        return;
      }

      // Conflict detection for modifications
      if (localData && changeType === 'modified') {
        const conflict = await this.detectConflict(type, localData, data);
        if (conflict) {
          this.conflicts.set(conflict.id, conflict);
          this.syncStatus.conflictCount++;
          this.emitSyncEvent('conflict_detected', conflict);
          this.saveState();
          return;
        }
      }

      // Apply change
      await this.saveLocalData(type, data);
      this.emitSyncEvent(
        changeType === 'added' ? `${type}_added` as SyncEventType : `${type}_updated` as SyncEventType,
        data
      );

    } catch (error) {
      console.error(`Error handling ${type} change:`, error);
      this.syncStatus.errors.push(`${type} sync error: ${error}`);
      this.saveState();
    }
  }

  /**
   * Check if change should be processed based on selective sync settings
   */
  private static shouldProcessChange(type: 'account' | 'folder' | 'tag' | 'settings', data: any): boolean {
    if (!this.syncConfig.enableSelectiveSync) {
      return true;
    }

    // Check global type settings
    const typeKey = type === 'settings' ? 'settings' : `${type}s` as keyof SelectiveSyncOptions;
    if (!this.selectiveSyncOptions[typeKey]) {
      return false;
    }

    // Check device-specific settings
    if (this.deviceId && this.selectiveSyncOptions.deviceSpecific[this.deviceId]) {
      const deviceSettings = this.selectiveSyncOptions.deviceSpecific[this.deviceId];
      const itemList = deviceSettings[`${type}s` as keyof typeof deviceSettings] as string[];
      
      if (itemList && itemList.length > 0) {
        return itemList.includes(data.id);
      }
    }

    return true;
  }

  /**
   * Detect conflicts between local and remote data
   */
  private static async detectConflict(
    type: 'account' | 'folder' | 'tag' | 'settings',
    localData: any,
    remoteData: any
  ): Promise<SyncConflict | null> {
    const localChecksum = await this.calculateChecksum(localData);
    const remoteChecksum = await this.calculateChecksum(remoteData);

    // No conflict if data is identical
    if (localChecksum === remoteChecksum) {
      return null;
    }

    const localTime = localData.updatedAt?.getTime() || 0;
    const remoteTime = remoteData.updatedAt?.getTime() || 0;
    const timeDiff = Math.abs(localTime - remoteTime);

    // If modified within conflict threshold, check for real conflicts
    if (timeDiff < 60000) { // 1 minute threshold
      return {
        id: `conflict_${Date.now()}_${Math.random()}`,
        type,
        entityId: localData.id,
        localData,
        remoteData,
        localTimestamp: new Date(localTime),
        remoteTimestamp: new Date(remoteTime),
        localChecksum,
        remoteChecksum,
        resolved: false,
      };
    }

    // Auto-resolve based on strategy
    return await this.autoResolveConflict(type, localData, remoteData);
  }

  /**
   * Auto-resolve conflicts based on configured strategy
   */
  private static async autoResolveConflict(
    type: 'account' | 'folder' | 'tag' | 'settings',
    localData: any,
    remoteData: any
  ): Promise<SyncConflict | null> {
    if (this.syncConfig.conflictResolutionStrategy === 'manual') {
      return {
        id: `conflict_${Date.now()}_${Math.random()}`,
        type,
        entityId: localData.id,
        localData,
        remoteData,
        localTimestamp: localData.updatedAt || new Date(),
        remoteTimestamp: remoteData.updatedAt || new Date(),
        localChecksum: await this.calculateChecksum(localData),
        remoteChecksum: await this.calculateChecksum(remoteData),
        resolved: false,
      };
    }

    let resolvedData: any;
    let resolution: 'local' | 'remote' | 'merge';

    switch (this.syncConfig.conflictResolutionStrategy) {
      case 'newest':
        const localTime = localData.updatedAt?.getTime() || 0;
        const remoteTime = remoteData.updatedAt?.getTime() || 0;
        resolvedData = localTime > remoteTime ? localData : remoteData;
        resolution = localTime > remoteTime ? 'local' : 'remote';
        break;
      
      case 'merge':
        resolvedData = await this.mergeData(type, localData, remoteData);
        resolution = 'merge';
        break;
      
      default:
        return null;
    }

    // Apply auto-resolution
    await this.saveLocalData(type, resolvedData);
    this.analytics.conflictsResolved++;
    this.saveState();

    return null; // No conflict to show user
  }

  /**
   * Merge conflicting data intelligently
   */
  private static async mergeData(type: 'account' | 'folder' | 'tag' | 'settings', localData: any, remoteData: any): Promise<any> {
    const merged = { ...remoteData };

    switch (type) {
      case 'account':
        // Use most recent timestamp for most fields, merge arrays
        merged.tags = [...new Set([...(localData.tags || []), ...(remoteData.tags || [])])];
        merged.isFavorite = localData.isFavorite || remoteData.isFavorite;
        merged.notes = remoteData.notes || localData.notes;
        break;
      
      case 'folder':
        merged.accountIds = [...new Set([...(localData.accountIds || []), ...(remoteData.accountIds || [])])];
        break;
      
      case 'tag':
        merged.accountIds = [...new Set([...(localData.accountIds || []), ...(remoteData.accountIds || [])])];
        break;
      
      case 'settings':
        // Merge settings objects
        merged.preferences = { ...(localData.preferences || {}), ...(remoteData.preferences || {}) };
        merged.security = { ...(localData.security || {}), ...(remoteData.security || {}) };
        break;
    }

    merged.updatedAt = new Date();
    return merged;
  }

  /**
   * Calculate checksum for data integrity
   */
  private static async calculateChecksum(data: any): Promise<string> {
    const jsonStr = JSON.stringify(data, Object.keys(data).sort());
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(jsonStr);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Compress data if above threshold
   */
  private static async compressData(data: any): Promise<{ data: string; compressed: boolean }> {
    const jsonStr = JSON.stringify(data);
    
    if (!this.syncConfig.enableCompression || jsonStr.length < this.syncConfig.compressionThreshold) {
      return { data: jsonStr, compressed: false };
    }

    try {
      // Simple compression using CompressionStream if available
      if ('CompressionStream' in window) {
        const stream = new CompressionStream('gzip');
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        
        writer.write(new TextEncoder().encode(jsonStr));
        writer.close();
        
        const chunks = [];
        let done = false;
        
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) chunks.push(value);
        }
        
        const compressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
        let offset = 0;
        for (const chunk of chunks) {
          compressed.set(chunk, offset);
          offset += chunk.length;
        }
        
        return { 
          data: btoa(String.fromCharCode(...compressed)), 
          compressed: true 
        };
      }
    } catch (error) {
      console.warn('Compression failed, using uncompressed data:', error);
    }
    
    return { data: jsonStr, compressed: false };
  }

  /**
   * Decompress data
   */
  private static async decompressData(compressedData: string, isCompressed: boolean): Promise<any> {
    if (!isCompressed) {
      return JSON.parse(compressedData);
    }

    try {
      if ('DecompressionStream' in window) {
        const compressed = Uint8Array.from(atob(compressedData), c => c.charCodeAt(0));
        const stream = new DecompressionStream('gzip');
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        
        writer.write(compressed);
        writer.close();
        
        const chunks = [];
        let done = false;
        
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) chunks.push(value);
        }
        
        const decompressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
        let offset = 0;
        for (const chunk of chunks) {
          decompressed.set(chunk, offset);
          offset += chunk.length;
        }
        
        const jsonStr = new TextDecoder().decode(decompressed);
        return JSON.parse(jsonStr);
      }
    } catch (error) {
      console.error('Decompression failed:', error);
      // Fallback to treating as uncompressed
      return JSON.parse(compressedData);
    }
    
    return JSON.parse(compressedData);
  }

  /**
   * Publish sync event to other devices
   */
  static async publishSyncEvent(type: SyncEventType, data: any, priority: number = 1): Promise<void> {
    if (!this.userId || !this.deviceId) {
      console.warn('Cannot publish sync event: user or device not initialized');
      return;
    }

    try {
      const compressed = await this.compressData(data);
      const checksum = await this.calculateChecksum(data);

      const syncEvent: Omit<SyncEvent, 'id'> = {
        type,
        userId: this.userId,
        deviceId: this.deviceId,
        timestamp: new Date(),
        data: compressed.data,
        checksum,
        compressed: compressed.compressed,
        priority,
        retryCount: 0,
        synced: false,
      };

      if (this.syncStatus.isOnline && this.syncStatus.isConnected) {
        // Publish to Firestore
        const eventsRef = collection(db, 'users', this.userId, this.SYNC_EVENTS_COLLECTION);
        await FirestoreService.addDocument(eventsRef.path, syncEvent);
        
        this.analytics.totalSyncs++;
        this.analytics.dataTransferred += JSON.stringify(syncEvent).length;
      } else {
        // Queue for offline processing
        this.addToOfflineQueue({ ...syncEvent, id: `offline_${Date.now()}_${Math.random()}` });
      }

      this.saveState();
    } catch (error) {
      console.error('Error publishing sync event:', error);
      this.syncStatus.errors.push(`Publish error: ${error}`);
      this.saveState();
    }
  }

  /**
   * Process sync event from other devices
   */
  private static async processSyncEvent(event: SyncEvent): Promise<void> {
    try {
      // Decompress data
      const data = await this.decompressData(event.data, event.compressed);
      
      // Verify checksum
      const calculatedChecksum = await this.calculateChecksum(data);
      if (calculatedChecksum !== event.checksum) {
        throw new Error('Checksum mismatch - data corruption detected');
      }

      // Process based on event type
      switch (event.type) {
        case 'account_added':
        case 'account_updated':
          await this.saveLocalData('account', data);
          break;
        case 'account_deleted':
          await this.removeLocalData('account', data.id);
          break;
        case 'folder_added':
        case 'folder_updated':
          await this.saveLocalData('folder', data);
          break;
        case 'folder_deleted':
          await this.removeLocalData('folder', data.id);
          break;
        case 'tag_added':
        case 'tag_updated':
          await this.saveLocalData('tag', data);
          break;
        case 'tag_deleted':
          await this.removeLocalData('tag', data.id);
          break;
        case 'settings_updated':
          await this.saveLocalData('settings', data);
          break;
      }

      // Mark event as processed
      if (this.userId) {
        const eventRef = doc(db, 'users', this.userId, this.SYNC_EVENTS_COLLECTION, event.id);
        await updateDoc(eventRef, { synced: true });
      }

      // Emit local event
      this.emitSyncEvent(event.type, data);

      this.analytics.successfulSyncs++;
    } catch (error) {
      console.error('Error processing sync event:', error);
      this.syncStatus.errors.push(`Process error: ${error}`);
      this.analytics.failedSyncs++;
    }
    
    this.saveState();
  }

  /**
   * Add event to offline queue
   */
  private static addToOfflineQueue(event: SyncEvent): void {
    this.offlineQueue.push(event);
    
    // Sort by priority and timestamp
    this.offlineQueue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority; // Lower number = higher priority
      }
      return a.timestamp.getTime() - b.timestamp.getTime();
    });

    // Limit queue size
    if (this.offlineQueue.length > 1000) {
      this.offlineQueue = this.offlineQueue.slice(0, 1000);
    }

    this.syncStatus.pendingChanges = this.offlineQueue.length;
    this.saveOfflineQueue();
  }

  /**
   * Process offline queue when back online
   */
  private static async processOfflineQueue(): Promise<void> {
    if (!this.syncStatus.isOnline || !this.syncStatus.isConnected || this.offlineQueue.length === 0) {
      return;
    }

    this.syncStatus.isSyncing = true;
    const startTime = Date.now();
    let processed = 0;
    let failed = 0;

    try {
      const batch = writeBatch(db);
      const eventsToProcess = this.offlineQueue.slice(0, 500); // Process in chunks

      for (const event of eventsToProcess) {
        try {
          if (event.retryCount >= this.syncConfig.maxRetries) {
            console.warn('Max retries exceeded for event:', event.id);
            failed++;
            continue;
          }

          // Add to batch
          if (this.userId) {
            const eventRef = doc(db, 'users', this.userId, this.SYNC_EVENTS_COLLECTION);
            const { id, ...eventData } = event;
            batch.set(eventRef, { ...eventData, retryCount: event.retryCount + 1 });
          }
          
          processed++;
        } catch (error) {
          console.error('Error processing queued event:', error);
          event.retryCount++;
          failed++;
        }
      }

      // Commit batch
      await batch.commit();

      // Remove processed events from queue
      this.offlineQueue = this.offlineQueue.slice(processed + failed);
      this.syncStatus.pendingChanges = this.offlineQueue.length;

      // Update analytics
      this.analytics.totalSyncs += processed;
      this.analytics.successfulSyncs += processed;
      this.analytics.failedSyncs += failed;

      const duration = Date.now() - startTime;
      this.analytics.averageSync Duration = 
        (this.analytics.averageSync Duration * (this.analytics.totalSyncs - processed) + duration) / 
        this.analytics.totalSyncs;

    } catch (error) {
      console.error('Error processing offline queue:', error);
    } finally {
      this.syncStatus.isSyncing = false;
      this.saveState();
      this.saveOfflineQueue();
    }
  }

  /**
   * Handle online status
   */
  private static async handleOnline(): Promise<void> {
    this.syncStatus.isOnline = true;
    await this.checkConnectivity();
    
    if (this.syncStatus.isConnected) {
      await this.processOfflineQueue();
    }
    
    this.emitSyncEvent('sync_started', { reason: 'came_online' });
  }

  /**
   * Handle offline status
   */
  private static handleOffline(): void {
    this.syncStatus.isOnline = false;
    this.syncStatus.isConnected = false;
    this.saveState();
  }

  /**
   * Handle real-time listener errors
   */
  private static handleRealtimeError(collection: string, error: FirestoreError): void {
    console.error(`Real-time error for ${collection}:`, error);
    this.syncStatus.errors.push(`${collection}: ${error.message}`);
    this.emitSyncEvent('sync_error', { collection, error: error.message });
    this.saveState();
  }

  /**
   * Start periodic sync for non-real-time mode
   */
  private static startPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(async () => {
      if (this.syncStatus.isOnline && this.syncStatus.isConnected && !this.syncStatus.isSyncing) {
        await this.performPeriodicSync();
      }
    }, this.syncConfig.syncIntervalMs);
  }

  /**
   * Perform periodic sync
   */
  private static async performPeriodicSync(): Promise<void> {
    this.syncStatus.isSyncing = true;
    this.emitSyncEvent('sync_started', { reason: 'periodic' });

    try {
      await this.processOfflineQueue();
      this.syncStatus.lastSyncTime = new Date();
      this.emitSyncEvent('sync_completed', { 
        timestamp: this.syncStatus.lastSyncTime,
        pendingChanges: this.syncStatus.pendingChanges 
      });
    } catch (error) {
      console.error('Periodic sync error:', error);
      this.emitSyncEvent('sync_error', { error: error });
    } finally {
      this.syncStatus.isSyncing = false;
      this.saveState();
    }
  }

  /**
   * Manual sync trigger
   */
  static async manualSync(): Promise<void> {
    if (!this.syncStatus.isOnline) {
      throw new Error('Cannot sync while offline');
    }

    await this.checkConnectivity();
    
    if (!this.syncStatus.isConnected) {
      throw new Error('No connection to sync service');
    }

    await this.performPeriodicSync();
  }

  /**
   * Resolve conflict manually
   */
  static async resolveConflict(
    conflictId: string, 
    resolution: 'local' | 'remote' | 'merge',
    customData?: any
  ): Promise<void> {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) {
      throw new Error('Conflict not found');
    }

    try {
      let resolvedData: any;

      switch (resolution) {
        case 'local':
          resolvedData = conflict.localData;
          break;
        case 'remote':
          resolvedData = conflict.remoteData;
          break;
        case 'merge':
          if (customData) {
            resolvedData = customData;
          } else {
            resolvedData = await this.mergeData(
              conflict.type as 'account' | 'folder' | 'tag' | 'settings', 
              conflict.localData, 
              conflict.remoteData
            );
          }
          break;
      }

      // Save resolved data locally
      await this.saveLocalData(conflict.type as 'account' | 'folder' | 'tag' | 'settings', resolvedData);

      // Publish resolution to other devices
      await this.publishSyncEvent(`${conflict.type}_updated` as SyncEventType, resolvedData, 0);

      // Mark conflict as resolved
      conflict.resolved = true;
      conflict.resolution = resolution;
      conflict.resolutionData = resolvedData;

      // Remove from conflicts
      this.conflicts.delete(conflictId);
      this.syncStatus.conflictCount--;
      this.analytics.conflictsResolved++;

      this.emitSyncEvent('conflict_resolved', { conflictId, resolution, data: resolvedData });
      this.saveState();

    } catch (error) {
      console.error('Error resolving conflict:', error);
      throw error;
    }
  }

  /**
   * Update sync configuration
   */
  static updateSyncConfig(newConfig: Partial<SyncConfig>): void {
    this.syncConfig = { ...this.syncConfig, ...newConfig };
    localStorage.setItem(this.SYNC_CONFIG_KEY, JSON.stringify(this.syncConfig));

    // Restart listeners if real-time setting changed
    if ('enableRealTime' in newConfig) {
      this.restartSyncSystem();
    }

    // Update periodic sync interval
    if ('syncIntervalMs' in newConfig && !this.syncConfig.enableRealTime) {
      this.startPeriodicSync();
    }
  }

  /**
   * Update selective sync options
   */
  static updateSelectiveSyncOptions(options: Partial<SelectiveSyncOptions>): void {
    this.selectiveSyncOptions = { ...this.selectiveSyncOptions, ...options };
    localStorage.setItem(this.SELECTIVE_SYNC_KEY, JSON.stringify(this.selectiveSyncOptions));

    // Restart listeners to apply new filters
    if (this.syncConfig.enableRealTime) {
      this.restartSyncSystem();
    }
  }

  /**
   * Restart sync system
   */
  private static async restartSyncSystem(): Promise<void> {
    // Cleanup existing listeners
    this.cleanup();

    // Reinitialize if we have user ID
    if (this.userId) {
      await this.initialize(this.userId);
    }
  }

  /**
   * Get current sync status
   */
  static getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * Get sync configuration
   */
  static getSyncConfig(): SyncConfig {
    return { ...this.syncConfig };
  }

  /**
   * Get selective sync options
   */
  static getSelectiveSyncOptions(): SelectiveSyncOptions {
    return { ...this.selectiveSyncOptions };
  }

  /**
   * Get sync analytics
   */
  static getSyncAnalytics(): SyncAnalytics {
    return { ...this.analytics };
  }

  /**
   * Get unresolved conflicts
   */
  static getUnresolvedConflicts(): SyncConflict[] {
    return Array.from(this.conflicts.values()).filter(c => !c.resolved);
  }

  /**
   * Subscribe to sync events
   */
  static onSyncEvent(type: SyncEventType, handler: (event: SyncEvent | any) => void): () => void {
    if (!this.eventHandlers.has(type)) {
      this.eventHandlers.set(type, []);
    }
    
    this.eventHandlers.get(type)!.push(handler);
    
    return () => {
      const handlers = this.eventHandlers.get(type);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  /**
   * Emit sync event to subscribers
   */
  private static emitSyncEvent(type: SyncEventType, data: any): void {
    const handlers = this.eventHandlers.get(type) || [];
    handlers.forEach(handler => {
      try {
        handler({ type, data, timestamp: new Date() });
      } catch (error) {
        console.error('Event handler error:', error);
      }
    });
  }

  /**
   * Save current state to localStorage
   */
  private static saveState(): void {
    try {
      localStorage.setItem(this.SYNC_STATUS_KEY, JSON.stringify(this.syncStatus));
      localStorage.setItem(this.SYNC_ANALYTICS_KEY, JSON.stringify(this.analytics));
    } catch (error) {
      console.error('Error saving sync state:', error);
    }
  }

  /**
   * Save offline queue to localStorage
   */
  private static saveOfflineQueue(): void {
    try {
      localStorage.setItem(this.OFFLINE_QUEUE_KEY, JSON.stringify(this.offlineQueue));
    } catch (error) {
      console.error('Error saving offline queue:', error);
    }
  }

  /**
   * Cleanup sync service
   */
  static cleanup(): void {
    // Clear listeners
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners.clear();

    // Clear event handlers
    this.eventHandlers.clear();

    // Clear intervals
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    // Remove network listeners
    window.removeEventListener('online', this.handleOnline.bind(this));
    window.removeEventListener('offline', this.handleOffline.bind(this));

    // Reset state
    this.userId = null;
    this.deviceId = null;
    this.conflicts.clear();
    this.offlineQueue = [];
  }

  /**
   * Local data operations (implemented by platform-specific adapters)
   */
  private static async getLocalData(type: 'account' | 'folder' | 'tag' | 'settings', id: string): Promise<any | null> {
    try {
      const data = await MobileEncryptionService.secureGet(`${type}_${id}`);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  private static async saveLocalData(type: 'account' | 'folder' | 'tag' | 'settings', data: any): Promise<void> {
    await MobileEncryptionService.secureStore(`${type}_${data.id}`, JSON.stringify(data));
  }

  private static async removeLocalData(type: 'account' | 'folder' | 'tag' | 'settings', id: string): Promise<void> {
    await MobileEncryptionService.secureRemove(`${type}_${id}`);
  }
}