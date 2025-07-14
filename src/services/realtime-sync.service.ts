/**
 * Real-time synchronization service with conflict resolution
 * @module services/realtime-sync
 */

import {
  onSnapshot,
  doc,
  collection,
  query,
  orderBy,
  serverTimestamp,
  writeBatch,
  Unsubscribe,
  DocumentSnapshot,
  QuerySnapshot,
  FirestoreError
} from 'firebase/firestore';
import { db } from '@src/config/firebase';
import { FirestoreService } from './firestore.service';
import { MobileEncryptionService } from './mobile-encryption.service';
import { OTPAccount } from './otp.service';
import { User } from '@src/types';

export interface SyncState {
  lastSync: Date;
  pendingChanges: number;
  conflictCount: number;
  isOnline: boolean;
  isSyncing: boolean;
}

export interface ConflictItem extends Record<string, unknown> {
  id: string;
  type: 'account' | 'folder' | 'tag';
  local: Record<string, unknown>;
  remote: Record<string, unknown>;
  timestamp: Date;
  resolution?: 'local' | 'remote' | 'merge';
}

export interface SyncEvent {
  type: 'sync_start' | 'sync_complete' | 'sync_error' | 'conflict_detected' | 'data_changed';
  data?: Record<string, unknown>;
  error?: Error;
}

export type SyncEventListener = (event: SyncEvent) => void;

export class RealtimeSyncService {
  private static userId: string | null = null;
  private static listeners: Map<string, Unsubscribe> = new Map();
  private static eventListeners: Set<SyncEventListener> = new Set();
  private static syncState: SyncState = {
    lastSync: new Date(),
    pendingChanges: 0,
    conflictCount: 0,
    isOnline: navigator.onLine,
    isSyncing: false
  };
  private static conflicts: Map<string, ConflictItem> = new Map();
  private static pendingOperations: Map<string, Record<string, unknown>> = new Map();

  /**
   * Initialize sync service for user
   */
  static async initialize(userId: string): Promise<void> {
    this.userId = userId;
    
    // Listen to network status
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    
    // Start syncing
    await this.startSync();
    
    this.emitEvent({ type: 'sync_start' });
  }

  /**
   * Start real-time synchronization
   */
  private static async startSync(): Promise<void> {
    if (!this.userId) {
      throw new Error('User ID not set');
    }

    try {
      this.syncState.isSyncing = true;
      
      // Sync accounts
      await this.syncAccounts();
      
      // Sync folders
      await this.syncFolders();
      
      // Sync tags
      await this.syncTags();
      
      // Sync user settings
      await this.syncUserSettings();
      
      this.syncState.lastSync = new Date();
      this.syncState.isSyncing = false;
      
      this.emitEvent({ type: 'sync_complete' });
    } catch (error) {
      this.syncState.isSyncing = false;
      this.emitEvent({ type: 'sync_error', error: error as Error });
    }
  }

  /**
   * Sync accounts with real-time listener
   */
  private static async syncAccounts(): Promise<void> {
    if (!this.userId) return;

    const accountsQuery = query(
      collection(db, `users/${this.userId}/accounts`),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(accountsQuery,
      (snapshot) => this.handleAccountsSnapshot(snapshot),
      (error) => this.handleSyncError('accounts', error)
    );

    this.listeners.set('accounts', unsubscribe);
  }

  /**
   * Sync folders with real-time listener
   */
  private static async syncFolders(): Promise<void> {
    if (!this.userId) return;

    const foldersQuery = query(
      collection(db, `users/${this.userId}/folders`),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(foldersQuery,
      (snapshot) => this.handleFoldersSnapshot(snapshot),
      (error) => this.handleSyncError('folders', error)
    );

    this.listeners.set('folders', unsubscribe);
  }

  /**
   * Sync tags with real-time listener
   */
  private static async syncTags(): Promise<void> {
    if (!this.userId) return;

    const tagsQuery = query(
      collection(db, `users/${this.userId}/tags`),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(tagsQuery,
      (snapshot) => this.handleTagsSnapshot(snapshot),
      (error) => this.handleSyncError('tags', error)
    );

    this.listeners.set('tags', unsubscribe);
  }

  /**
   * Sync user settings
   */
  private static async syncUserSettings(): Promise<void> {
    if (!this.userId) return;

    const userDoc = doc(db, 'users', this.userId);

    const unsubscribe = onSnapshot(userDoc,
      (snapshot) => this.handleUserSnapshot(snapshot),
      (error) => this.handleSyncError('user', error)
    );

    this.listeners.set('user', unsubscribe);
  }

  /**
   * Handle accounts snapshot
   */
  private static async handleAccountsSnapshot(snapshot: QuerySnapshot): Promise<void> {
    const changes = snapshot.docChanges();
    
    for (const change of changes) {
      const data = {
        id: (change as any).doc.id,
        ...change.doc.data(),
        createdAt: change.doc.data().createdAt?.toDate(),
        updatedAt: change.doc.data().updatedAt?.toDate()
      } as OTPAccount;

      await this.handleAccountChange(change.type, data);
    }
  }

  /**
   * Handle individual account change
   */
  private static async handleAccountChange(
    changeType: 'added' | 'modified' | 'removed',
    account: OTPAccount
  ): Promise<void> {
    const localAccount = await this.getLocalAccount(account.id);
    
    if (changeType === 'removed') {
      await this.removeLocalAccount(account.id);
      this.emitEvent({ type: 'data_changed', data: { type: 'account_removed', account } });
      return;
    }

    if (localAccount && changeType === 'modified') {
      // Check for conflicts
      const conflict = await this.detectAccountConflict(localAccount, account);
      if (conflict) {
        this.conflicts.set(account.id, conflict);
        this.syncState.conflictCount++;
        this.emitEvent({ type: 'conflict_detected', data: conflict });
        return;
      }
    }

    // No conflict, apply change
    await this.saveLocalAccount(account);
    this.emitEvent({ 
      type: 'data_changed', 
      data: { 
        type: changeType === 'added' ? 'account_added' : 'account_updated', 
        account 
      } 
    });
  }

  /**
   * Handle folders snapshot
   */
  private static async handleFoldersSnapshot(snapshot: QuerySnapshot): Promise<void> {
    const changes = snapshot.docChanges();
    
    for (const change of changes) {
      const data = {
        id: (change as any).doc.id,
        ...change.doc.data(),
        createdAt: change.doc.data().createdAt?.toDate(),
        updatedAt: change.doc.data().updatedAt?.toDate()
      };

      await this.handleFolderChange(change.type, data);
    }
  }

  /**
   * Handle individual folder change
   */
  private static async handleFolderChange(
    changeType: 'added' | 'modified' | 'removed',
    folder: unknown
  ): Promise<void> {
    // Similar to account handling but for folders
    if (changeType === 'removed') {
      await this.removeLocalFolder(folder.id);
    } else {
      await this.saveLocalFolder(folder);
    }
    
    this.emitEvent({ 
      type: 'data_changed', 
      data: { 
        type: `folder_${changeType}`, 
        folder 
      } 
    });
  }

  /**
   * Handle tags snapshot
   */
  private static async handleTagsSnapshot(snapshot: QuerySnapshot): Promise<void> {
    const changes = snapshot.docChanges();
    
    for (const change of changes) {
      const data = {
        id: (change as any).doc.id,
        ...change.doc.data(),
        createdAt: change.doc.data().createdAt?.toDate(),
        updatedAt: change.doc.data().updatedAt?.toDate()
      };

      await this.handleTagChange(change.type, data);
    }
  }

  /**
   * Handle individual tag change
   */
  private static async handleTagChange(
    changeType: 'added' | 'modified' | 'removed',
    tag: unknown
  ): Promise<void> {
    if (changeType === 'removed') {
      await this.removeLocalTag(tag.id);
    } else {
      await this.saveLocalTag(tag);
    }
    
    this.emitEvent({ 
      type: 'data_changed', 
      data: { 
        type: `tag_${changeType}`, 
        tag 
      } 
    });
  }

  /**
   * Handle user settings snapshot
   */
  private static async handleUserSnapshot(snapshot: DocumentSnapshot): Promise<void> {
    if (snapshot.exists()) {
      const userData = {
        id: snapshot.id,
        ...snapshot.data(),
        createdAt: snapshot.data()?.createdAt?.toDate(),
        updatedAt: snapshot.data()?.updatedAt?.toDate()
      } as User;

      await this.saveLocalUser(userData);
      this.emitEvent({ 
        type: 'data_changed', 
        data: { 
          type: 'user_updated', 
          user: userData 
        } 
      });
    }
  }

  /**
   * Detect account conflicts
   */
  private static async detectAccountConflict(
    local: OTPAccount,
    remote: OTPAccount
  ): Promise<ConflictItem | null> {
    // Check if both have been modified recently
    const localTime = local.updatedAt?.getTime() || 0;
    const remoteTime = remote.updatedAt?.getTime() || 0;
    const timeDiff = Math.abs(localTime - remoteTime);
    
    // If modified within 5 minutes of each other, check for real conflicts
    if (timeDiff < 5 * 60 * 1000) {
      const hasConflict = 
        local.label !== remote.label ||
        local.issuer !== remote.issuer ||
        local.encryptedSecret !== remote.encryptedSecret ||
        local.category !== remote.category ||
        JSON.stringify(local.tags) !== JSON.stringify(remote.tags);

      if (hasConflict) {
        return {
          id: local.id,
          type: 'account',
          local,
          remote,
          timestamp: new Date()
        };
      }
    }

    return null;
  }

  /**
   * Resolve conflict
   */
  static async resolveConflict(
    conflictId: string,
    resolution: 'local' | 'remote' | 'merge'
  ): Promise<void> {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) {
      throw new Error('Conflict not found');
    }

    try {
      let resolvedData: unknown;

      switch (resolution) {
        case 'local':
          resolvedData = conflict.local;
          break;
        case 'remote':
          resolvedData = conflict.remote;
          break;
        case 'merge':
          resolvedData = await this.mergeConflictData(conflict);
          break;
      }

      // Save resolved data
      if (conflict.type === 'account') {
        await this.saveRemoteAccount(resolvedData);
        await this.saveLocalAccount(resolvedData);
      }

      // Remove conflict
      this.conflicts.delete(conflictId);
      this.syncState.conflictCount--;
      
      this.emitEvent({ 
        type: 'data_changed', 
        data: { 
          type: 'conflict_resolved', 
          conflictId, 
          resolution,
          data: resolvedData
        } 
      });
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
      throw error;
    }
  }

  /**
   * Merge conflict data
   */
  private static async mergeConflictData(conflict: ConflictItem): Promise<any> {
    if (conflict.type === 'account') {
      const local = conflict.local as unknown as OTPAccount;
      const remote = conflict.remote as unknown as OTPAccount;

      // Use the most recent updatedAt
      const useLocal = (local.updatedAt?.getTime() || 0) > (remote.updatedAt?.getTime() || 0);
      
      return {
        ...(remote as Record<string, unknown>),
        // Keep remote ID and userId
        label: useLocal ? local.label : remote.label,
        issuer: useLocal ? local.issuer : remote.issuer,
        tags: [...new Set([...((local as unknown).tags || []), ...((remote as unknown).tags || [])])],
        isFavorite: local.isFavorite || remote.isFavorite,
        updatedAt: new Date()
      };
    }

    return conflict.remote;
  }

  /**
   * Sync pending changes to server
   */
  static async syncPendingChanges(): Promise<void> {
    if (!this.userId || this.pendingOperations.size === 0) {
      return;
    }

    this.syncState.isSyncing = true;
    
    try {
      const batch = writeBatch(db);
      
      for (const [id, operation] of this.pendingOperations) {
        const { type, collection: collectionName, data } = operation;
        const docRef = doc(db, `users/${this.userId}/${collectionName}`, id);
        
        switch (type) {
          case 'create':
          case 'update':
            batch.set(docRef, {
              ...data,
              updatedAt: serverTimestamp()
            }, { merge: true });
            break;
          case 'delete':
            batch.delete(docRef);
            break;
        }
      }
      
      await batch.commit();
      this.pendingOperations.clear();
      this.syncState.pendingChanges = 0;
      
    } catch (error) {
      console.error('Failed to sync pending changes:', error);
      throw error;
    } finally {
      this.syncState.isSyncing = false;
    }
  }

  /**
   * Queue operation for offline sync
   */
  static queueOperation(
    id: string,
    type: 'create' | 'update' | 'delete',
    collection: string,
    data?: unknown
  ): void {
    this.pendingOperations.set(id, { type, collection, data });
    this.syncState.pendingChanges = (this as any).pendingOperations.size;
  }

  /**
   * Handle online status
   */
  private static async handleOnline(): Promise<void> {
    this.syncState.isOnline = true;
    
    // Sync pending changes
    if (this.pendingOperations.size > 0) {
      await this.syncPendingChanges();
    }
  }

  /**
   * Handle offline status
   */
  private static handleOffline(): void {
    this.syncState.isOnline = false;
  }

  /**
   * Handle sync errors
   */
  private static handleSyncError(collection: string, error: FirestoreError): void {
    console.error(`Sync error for ${collection}:`, error);
    this.emitEvent({ type: 'sync_error', error });
  }

  /**
   * Event management
   */
  static addEventListener(listener: SyncEventListener): void {
    this.eventListeners.add(listener);
  }

  static removeEventListener(listener: SyncEventListener): void {
    this.eventListeners.delete(listener);
  }

  private static emitEvent(event: SyncEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Event listener error:', error);
      }
    });
  }

  /**
   * Get current sync state
   */
  static getSyncState(): SyncState {
    return { ...this.syncState };
  }

  /**
   * Get active conflicts
   */
  static getConflicts(): ConflictItem[] {
    return Array.from(this.conflicts.values());
  }

  /**
   * Cleanup and stop sync
   */
  static cleanup(): void {
    // Unsubscribe from all listeners
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners.clear();
    
    // Clear event listeners
    this.eventListeners.clear();
    
    // Remove network listeners
    window.removeEventListener('online', this.handleOnline.bind(this));
    window.removeEventListener('offline', this.handleOffline.bind(this));
    
    // Clear state
    this.conflicts.clear();
    this.pendingOperations.clear();
    this.userId = null;
  }

  /**
   * Local storage operations (placeholder implementations)
   */
  private static async getLocalAccount(accountId: string): Promise<OTPAccount | null> {
    // Implementation would read from local storage/IndexedDB
    return null;
  }

  private static async saveLocalAccount(account: OTPAccount): Promise<void> {
    // Implementation would save to local storage/IndexedDB
    await MobileEncryptionService.secureStore(`account_${account.id}`, JSON.stringify(account));
  }

  private static async removeLocalAccount(accountId: string): Promise<void> {
    // Implementation would remove from local storage/IndexedDB
    await MobileEncryptionService.secureRemove(`account_${accountId}`);
  }

  private static async saveRemoteAccount(account: OTPAccount): Promise<void> {
    if (!this.userId) return;
    
    await FirestoreService.updateDocument(
      `users/${this.userId}/accounts`,
      account.id,
      account
    );
  }

  private static async saveLocalFolder(folder: unknown): Promise<void> {
    await MobileEncryptionService.secureStore(`folder_${folder.id}`, JSON.stringify(folder));
  }

  private static async removeLocalFolder(folderId: string): Promise<void> {
    await MobileEncryptionService.secureRemove(`folder_${folderId}`);
  }

  private static async saveLocalTag(tag: unknown): Promise<void> {
    await MobileEncryptionService.secureStore(`tag_${tag.id}`, JSON.stringify(tag));
  }

  private static async removeLocalTag(tagId: string): Promise<void> {
    await MobileEncryptionService.secureRemove(`tag_${tagId}`);
  }

  private static async saveLocalUser(user: User): Promise<void> {
    await MobileEncryptionService.secureStore('user', JSON.stringify(user));
  }
}