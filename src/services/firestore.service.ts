/**
 * Firestore database service with enhanced CRUD operations and real-time sync
 * @module services/firestore
 */

import {
  doc,
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  runTransaction,
  enableNetwork,
  disableNetwork,
  waitForPendingWrites,
  DocumentSnapshot,
  QueryDocumentSnapshot,
  DocumentReference,
  CollectionReference,
  Query,
  Unsubscribe,
  FirestoreError,
  Timestamp
} from 'firebase/firestore';
import { db } from '@src/config/firebase';
import { OTPAccount } from './otp.service';
import { User, Device } from '@src/types';

export interface PaginationOptions {
  limit?: number;
  startAfter?: DocumentSnapshot;
  orderByField?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface SyncResult<T> {
  data: T[];
  hasMore: boolean;
  lastDoc?: DocumentSnapshot;
  fromCache: boolean;
}

export interface ConflictResolution {
  strategy: 'server' | 'client' | 'merge' | 'manual';
  mergeFields?: string[];
}

export class FirestoreService {
  private static syncListeners: Map<string, Unsubscribe> = new Map();
  private static offlineQueue: Array<{ operation: string; data: any }> = [];

  /**
   * Sanitize user input data
   */
  static sanitizeInput(data: any): unknown {
    if (typeof data === 'string') {
      return data
        .replace(/[<>'"]/g, '') // Remove potential HTML/JS chars
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+=/gi, '') // Remove event handlers
        .replace(/\.\.\//g, '') // Remove path traversal
        .replace(/\${.*?}/g, '') // Remove template injection
        .trim();
    }
    
    if (Array.isArray(data)) {
      return (data || []).map((item: any) => this.sanitizeInput(item));
    }
    
    if (data && typeof data === 'object') {
      const sanitized: unknown = {};
      Object.keys(data).forEach(key => {
        const sanitizedKey = this.sanitizeInput(key);
        sanitized[sanitizedKey] = this.sanitizeInput(data[key]);
      });
      return sanitized;
    }
    
    return data;
  }
  
  /**
   * Sanitize backup data
   */
  static sanitizeBackupData(backup: unknown): unknown {
    return this.sanitizeInput(backup);
  }
  
  /**
   * Validate user authorization for data access
   */
  static validateUserAccess(requestedPath: string, userId: string): boolean {
    // Ensure user can only access their own data
    const allowedPaths = [
      `users/${userId}`,
      `users/${userId}/accounts`,
      `users/${userId}/subscriptions`,
      `users/${userId}/backups`,
      `users/${userId}/devices`
    ];
    
    return allowedPaths.some(path => requestedPath.startsWith(path));
  }

  /**
   * Initialize Firestore service
   */
  static async initialize(): Promise<void> {
    try {
      // Enable offline persistence
      // Note: This should be called before any other Firestore operations
      console.log('Firestore service initialized');
    } catch (error) {
      console.error('Failed to initialize Firestore:', error);
    }
  }

  /**
   * Generic document operations
   */
  static async getDocument<T = any>(
    collectionPath: string,
    documentId: string
  ): Promise<T | null> {
    try {
      const docRef = doc(db, collectionPath, documentId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data(),
          createdAt: docSnap.data().createdAt?.toDate(),
          updatedAt: docSnap.data().updatedAt?.toDate()
        } as T;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting document:', error);
      throw error;
    }
  }

  /**
   * Get collection with pagination and filtering
   */
  static async getCollection<T = any>(
    collectionPath: string,
    filters: Array<{ field: string; operator: unknown; value: any }> = [],
    pagination: PaginationOptions = {}
  ): Promise<SyncResult<T>> {
    try {
      const collectionRef = collection(db, collectionPath);
      let q: Query = collectionRef;

      // Apply filters
      filters.forEach(filter => {
        q = query(q, where(filter.field, filter.operator, filter.value));
      });

      // Apply ordering
      if (pagination.orderByField) {
        q = query(q, orderBy(pagination.orderByField, pagination.orderDirection || 'asc'));
      }

      // Apply pagination
      if (pagination.startAfter) {
        q = query(q, startAfter(pagination.startAfter));
      }

      if (pagination.limit) {
        q = query(q, limit(pagination.limit + 1)); // +1 to check if there are more
      }

      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs;
      const hasMore = pagination.limit ? docs.length > pagination.limit : false;
      
      // Remove the extra document if we have more
      const resultDocs = hasMore ? docs.slice(0, -1) : docs;
      
      const data = resultDocs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      })) as T[];

      return {
        data,
        hasMore,
        lastDoc: resultDocs[resultDocs.length - 1],
        fromCache: querySnapshot.metadata.fromCache
      };
    } catch (error) {
      console.error('Error getting collection:', error);
      throw error;
    }
  }

  /**
   * Create document
   */
  static async createDocument<T = any>(
    collectionPath: string,
    data: Partial<T>,
    documentId?: string
  ): Promise<string> {
    try {
      const timestamp = serverTimestamp();
      const documentData = {
        ...data,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      if (documentId) {
        const docRef = doc(db, collectionPath, documentId);
        await setDoc(docRef, documentData);
        return documentId;
      } else {
        const collectionRef = collection(db, collectionPath);
        const docRef = await addDoc(collectionRef, documentData);
        return docRef.id;
      }
    } catch (error) {
      console.error('Error creating document:', error);
      throw error;
    }
  }

  /**
   * Update document
   */
  static async updateDocument<T = any>(
    collectionPath: string,
    documentId: string,
    data: Partial<T>,
    conflictResolution?: ConflictResolution
  ): Promise<void> {
    try {
      const docRef = doc(db, collectionPath, documentId);
      
      if (conflictResolution?.strategy === 'merge') {
        // Implement merge strategy
        const currentDoc = await getDoc(docRef);
        if (currentDoc.exists()) {
          const currentData = currentDoc.data();
          const mergedData = this.mergeDocuments(currentData, data, conflictResolution.mergeFields);
          
          await updateDoc(docRef, {
            ...mergedData,
            updatedAt: serverTimestamp()
          });
        } else {
          throw new Error('Document not found for merge operation');
        }
      } else {
        // Default update
        await updateDoc(docRef, {
          ...data,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error updating document:', error);
      throw error;
    }
  }

  /**
   * Delete document
   */
  static async deleteDocument(
    collectionPath: string,
    documentId: string
  ): Promise<void> {
    try {
      const docRef = doc(db, collectionPath, documentId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }

  /**
   * Batch operations
   */
  static async batchWrite(operations: Array<{
    type: 'create' | 'update' | 'delete';
    collectionPath: string;
    documentId?: string;
    data?: unknown;
  }>): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      operations.forEach(operation => {
        const docRef = operation.documentId 
          ? doc(db, operation.collectionPath, operation.documentId)
          : doc(collection(db, operation.collectionPath));

        switch (operation.type) {
          case 'create':
            batch.set(docRef, {
              ...operation.data,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
            break;
          case 'update':
            batch.update(docRef, {
              ...operation.data,
              updatedAt: serverTimestamp()
            });
            break;
          case 'delete':
            batch.delete(docRef);
            break;
        }
      });

      await batch.commit();
    } catch (error) {
      console.error('Error in batch operation:', error);
      throw error;
    }
  }

  /**
   * Transaction
   */
  static async runTransaction<T>(
    callback: (transaction: unknown) => Promise<T>
  ): Promise<T> {
    try {
      return await runTransaction(db, callback);
    } catch (error) {
      console.error('Transaction failed:', error);
      throw error;
    }
  }

  /**
   * Real-time subscription
   */
  static subscribeToDocument<T = any>(
    collectionPath: string,
    documentId: string,
    callback: (data: T | null, error?: FirestoreError) => void,
    subscriptionKey?: string
  ): Unsubscribe {
    try {
      const docRef = doc(db, collectionPath, documentId);
      
      const unsubscribe = onSnapshot(docRef, 
        (docSnap) => {
          if (docSnap.exists()) {
            const data = {
              id: docSnap.id,
              ...docSnap.data(),
              createdAt: docSnap.data().createdAt?.toDate(),
              updatedAt: docSnap.data().updatedAt?.toDate()
            } as T;
            callback(data);
          } else {
            callback(null);
          }
        },
        (error) => {
          console.error('Document subscription error:', error);
          callback(null, error);
        }
      );

      if (subscriptionKey) {
        this.syncListeners.set(subscriptionKey, unsubscribe);
      }

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up document subscription:', error);
      throw error;
    }
  }

  /**
   * Real-time collection subscription
   */
  static subscribeToCollection<T = any>(
    collectionPath: string,
    filters: Array<{ field: string; operator: unknown; value: any }> = [],
    callback: (data: T[], error?: FirestoreError) => void,
    subscriptionKey?: string,
    pagination?: PaginationOptions
  ): Unsubscribe {
    try {
      const collectionRef = collection(db, collectionPath);
      let q: Query = collectionRef;

      // Apply filters
      filters.forEach(filter => {
        q = query(q, where(filter.field, filter.operator, filter.value));
      });

      // Apply ordering
      if (pagination?.orderByField) {
        q = query(q, orderBy(pagination.orderByField, pagination.orderDirection || 'asc'));
      }

      // Apply limit
      if (pagination?.limit) {
        q = query(q, limit(pagination.limit));
      }

      const unsubscribe = onSnapshot(q,
        (querySnapshot) => {
          const data = querySnapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
            updatedAt: doc.data().updatedAt?.toDate()
          })) as T[];
          callback(data);
        },
        (error) => {
          console.error('Collection subscription error:', error);
          callback([], error);
        }
      );

      if (subscriptionKey) {
        this.syncListeners.set(subscriptionKey, unsubscribe);
      }

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up collection subscription:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from real-time updates
   */
  static unsubscribe(subscriptionKey: string): void {
    const unsubscribe = this.syncListeners.get(subscriptionKey);
    if (unsubscribe) {
      unsubscribe();
      this.syncListeners.delete(subscriptionKey);
    }
  }

  /**
   * Unsubscribe from all real-time updates
   */
  static unsubscribeAll(): void {
    this.syncListeners.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.syncListeners.clear();
  }

  /**
   * Network status management
   */
  static async enableOffline(): Promise<void> {
    try {
      await disableNetwork(db);
      console.log('Firestore offline mode enabled');
    } catch (error) {
      console.error('Error enabling offline mode:', error);
    }
  }

  static async enableOnline(): Promise<void> {
    try {
      await enableNetwork(db);
      console.log('Firestore online mode enabled');
    } catch (error) {
      console.error('Error enabling online mode:', error);
    }
  }

  static async waitForPendingWrites(): Promise<void> {
    try {
      await waitForPendingWrites(db);
    } catch (error) {
      console.error('Error waiting for pending writes:', error);
    }
  }

  /**
   * Merge documents for conflict resolution
   */
  private static mergeDocuments(
    currentData: unknown,
    newData: unknown,
    mergeFields?: string[]
  ): unknown {
    if (!mergeFields) {
      // Default merge strategy - newer values take precedence
      return { ...currentData, ...newData };
    }

    const merged = { ...currentData };
    mergeFields.forEach(field => {
      if (newData.hasOwnProperty(field)) {
        merged[field] = newData[field];
      }
    });

    return merged;
  }

  /**
   * Account-specific operations
   */
  static async getUserAccounts(
    userId: string,
    pagination?: PaginationOptions
  ): Promise<SyncResult<OTPAccount>> {
    return this.getCollection<OTPAccount>(
      `users/${userId}/accounts`,
      [],
      {
        orderByField: 'createdAt',
        orderDirection: 'desc',
        ...pagination
      }
    );
  }

  static async createUserAccount(
    userId: string,
    account: Partial<OTPAccount>
  ): Promise<string> {
    return this.createDocument(`users/${userId}/accounts`, account);
  }

  static async updateUserAccount(
    userId: string,
    accountId: string,
    account: Partial<OTPAccount>
  ): Promise<void> {
    return this.updateDocument(`users/${userId}/accounts`, accountId, account);
  }

  static async deleteUserAccount(
    userId: string,
    accountId: string
  ): Promise<void> {
    return this.deleteDocument(`users/${userId}/accounts`, accountId);
  }

  /**
   * Device management operations
   */
  static async getUserDevices(userId: string): Promise<SyncResult<Device>> {
    return this.getCollection<Device>(
      `users/${userId}/devices`,
      [],
      {
        orderByField: 'lastSeen',
        orderDirection: 'desc'
      }
    );
  }

  static async updateDeviceLastSeen(
    userId: string,
    deviceId: string
  ): Promise<void> {
    return this.updateDocument(`users/${userId}/devices`, deviceId, {
      lastSeen: new Date()
    });
  }

  /**
   * Backup operations
   */
  static async createBackupRecord(
    userId: string,
    backup: {
      provider: string;
      accountCount: number;
      size: number;
      encrypted: boolean;
      checksum?: string;
    }
  ): Promise<string> {
    return this.createDocument(`users/${userId}/backups`, backup);
  }

  static async getUserBackups(userId: string): Promise<SyncResult<any>> {
    return this.getCollection(
      `users/${userId}/backups`,
      [],
      {
        orderByField: 'createdAt',
        orderDirection: 'desc',
        limit: 50
      }
    );
  }
}