/**
 * Data Retention Service for Compliance
 * Implements automated data lifecycle management for GDPR and SOC 2 compliance
 * @module services/compliance/data-retention
 */

import { 
  collection, 
  query, 
  where, 
  getDocs,
  writeBatch,
  doc,
  addDoc,
  Timestamp,
  serverTimestamp,
  deleteDoc,
  updateDoc,
  getDoc
} from 'firebase/firestore';
import { ref, deleteObject, listAll, getMetadata } from 'firebase/storage';
import { db, storage } from '@services/firebase';
import { AuditHelper } from './audit-helper';
import { AuditAction, AuditResource } from './audit-logging.service';

export interface RetentionPolicy {
  id: string;
  name: string;
  description: string;
  dataType: DataType;
  retentionPeriod: RetentionPeriod;
  action: RetentionAction;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  conditions?: RetentionCondition[];
  excludeConditions?: RetentionCondition[];
  createdAt: Date;
  updatedAt: Date;
}

export enum DataType {
  AUDIT_LOGS = 'audit_logs',
  USER_ACCOUNTS = 'user_accounts',
  BACKUPS = 'backups',
  SESSIONS = 'sessions',
  ANALYTICS = 'analytics',
  TEMP_DATA = 'temp_data',
  DELETED_USERS = 'deleted_users',
  EXPORT_FILES = 'export_files',
  USAGE_DATA = 'usage_data',
  ERROR_LOGS = 'error_logs'
}

export interface RetentionPeriod {
  value: number;
  unit: 'days' | 'months' | 'years';
}

export enum RetentionAction {
  DELETE = 'delete',
  ARCHIVE = 'archive',
  ANONYMIZE = 'anonymize',
  COMPRESS = 'compress'
}

export interface RetentionCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
  value: any;
}

export interface RetentionExecutionResult {
  policyId: string;
  policyName: string;
  dataType: DataType;
  startTime: Date;
  endTime: Date;
  itemsProcessed: number;
  itemsSucceeded: number;
  itemsFailed: number;
  errors: string[];
  status: 'success' | 'partial' | 'failed';
}

export class DataRetentionService {
  private static readonly POLICIES_COLLECTION = 'retention_policies';
  private static readonly EXECUTION_HISTORY = 'retention_execution_history';
  private static readonly BATCH_SIZE = 500;
  
  // Default retention policies based on compliance requirements
  private static readonly DEFAULT_POLICIES: Omit<RetentionPolicy, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
      name: 'Audit Log Retention',
      description: 'Retain audit logs for 7 years for SOC 2 compliance',
      dataType: DataType.AUDIT_LOGS,
      retentionPeriod: { value: 7, unit: 'years' },
      action: RetentionAction.DELETE,
      enabled: true
    },
    {
      name: 'Session Cleanup',
      description: 'Delete expired sessions after 30 days',
      dataType: DataType.SESSIONS,
      retentionPeriod: { value: 30, unit: 'days' },
      action: RetentionAction.DELETE,
      enabled: true
    },
    {
      name: 'Backup Retention',
      description: 'Keep user backups for 1 year',
      dataType: DataType.BACKUPS,
      retentionPeriod: { value: 1, unit: 'years' },
      action: RetentionAction.DELETE,
      enabled: true
    },
    {
      name: 'Analytics Data Anonymization',
      description: 'Anonymize analytics data after 2 years',
      dataType: DataType.ANALYTICS,
      retentionPeriod: { value: 2, unit: 'years' },
      action: RetentionAction.ANONYMIZE,
      enabled: true
    },
    {
      name: 'Deleted User Data Cleanup',
      description: 'Permanently delete user data 30 days after account deletion',
      dataType: DataType.DELETED_USERS,
      retentionPeriod: { value: 30, unit: 'days' },
      action: RetentionAction.DELETE,
      enabled: true
    },
    {
      name: 'Export File Cleanup',
      description: 'Delete temporary export files after 7 days',
      dataType: DataType.EXPORT_FILES,
      retentionPeriod: { value: 7, unit: 'days' },
      action: RetentionAction.DELETE,
      enabled: true
    },
    {
      name: 'Error Log Compression',
      description: 'Compress error logs older than 6 months',
      dataType: DataType.ERROR_LOGS,
      retentionPeriod: { value: 6, unit: 'months' },
      action: RetentionAction.COMPRESS,
      enabled: true
    }
  ];
  
  /**
   * Initialize default retention policies
   */
  static async initializeDefaultPolicies(): Promise<void> {
    try {
      const policiesSnapshot = await getDocs(collection(db, this.POLICIES_COLLECTION));
      
      if (policiesSnapshot.empty) {
        const batch = writeBatch(db);
        
        for (const policy of this.DEFAULT_POLICIES) {
          const policyRef = doc(collection(db, this.POLICIES_COLLECTION));
          batch.set(policyRef, {
            ...policy,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
        
        await batch.commit();
        
        await AuditHelper.logComplianceAction(
          'consent_update',
          'system',
          'system',
          { action: 'initialized_retention_policies' }
        );
      }
    } catch (error) {
      console.error('Failed to initialize retention policies:', error);
      throw error;
    }
  }
  
  /**
   * Get all retention policies
   */
  static async getPolicies(): Promise<RetentionPolicy[]> {
    try {
      const snapshot = await getDocs(collection(db, this.POLICIES_COLLECTION));
      return snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
        lastRun: doc.data().lastRun?.toDate(),
        nextRun: doc.data().nextRun?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      } as RetentionPolicy));
    } catch (error) {
      console.error('Failed to get retention policies:', error);
      throw error;
    }
  }
  
  /**
   * Create or update a retention policy
   */
  static async upsertPolicy(
    policy: Omit<RetentionPolicy, 'id' | 'createdAt' | 'updatedAt'>,
    policyId?: string
  ): Promise<string> {
    try {
      const policyData = {
        ...policy,
        updatedAt: serverTimestamp()
      };
      
      if (policyId) {
        await updateDoc(doc(db, this.POLICIES_COLLECTION, policyId), policyData);
      } else {
        const docRef = await addDoc(collection(db, this.POLICIES_COLLECTION), {
          ...policyData,
          createdAt: serverTimestamp()
        });
        policyId = docRef.id;
      }
      
      await AuditHelper.logComplianceAction(
        'consent_update',
        'system',
        'system',
        { 
          action: policyId ? 'updated_retention_policy' : 'created_retention_policy',
          policyName: policy.name,
          dataType: policy.dataType
        }
      );
      
      return policyId!;
    } catch (error) {
      console.error('Failed to upsert retention policy:', error);
      throw error;
    }
  }
  
  /**
   * Execute a retention policy
   */
  static async executePolicy(policyId: string): Promise<RetentionExecutionResult> {
    const startTime = new Date();
    const errors: string[] = [];
    let itemsProcessed = 0;
    let itemsSucceeded = 0;
    let itemsFailed = 0;
    
    try {
      // Get policy
      const policyDoc = await getDoc(doc(db, this.POLICIES_COLLECTION, policyId));
      if (!policyDoc.exists()) {
        throw new Error('Policy not found');
      }
      
      const policy = {
        id: policyDoc.id,
        ...policyDoc.data()
      } as RetentionPolicy;
      
      if (!policy.enabled) {
        throw new Error('Policy is disabled');
      }
      
      // Calculate retention date
      const retentionDate = this.calculateRetentionDate(policy.retentionPeriod);
      
      // Execute based on data type
      switch (policy.dataType) {
        case DataType.AUDIT_LOGS:
          await this.processAuditLogs(retentionDate, policy.action, (processed, succeeded, failed, error) => {
            itemsProcessed += processed;
            itemsSucceeded += succeeded;
            itemsFailed += failed;
            if (error) errors.push(error);
          });
          break;
          
        case DataType.SESSIONS:
          await this.processSessions(retentionDate, policy.action, (processed, succeeded, failed, error) => {
            itemsProcessed += processed;
            itemsSucceeded += succeeded;
            itemsFailed += failed;
            if (error) errors.push(error);
          });
          break;
          
        case DataType.BACKUPS:
          await this.processBackups(retentionDate, policy.action, (processed, succeeded, failed, error) => {
            itemsProcessed += processed;
            itemsSucceeded += succeeded;
            itemsFailed += failed;
            if (error) errors.push(error);
          });
          break;
          
        case DataType.ANALYTICS:
          await this.processAnalytics(retentionDate, policy.action, (processed, succeeded, failed, error) => {
            itemsProcessed += processed;
            itemsSucceeded += succeeded;
            itemsFailed += failed;
            if (error) errors.push(error);
          });
          break;
          
        case DataType.DELETED_USERS:
          await this.processDeletedUsers(retentionDate, policy.action, (processed, succeeded, failed, error) => {
            itemsProcessed += processed;
            itemsSucceeded += succeeded;
            itemsFailed += failed;
            if (error) errors.push(error);
          });
          break;
          
        case DataType.EXPORT_FILES:
          await this.processExportFiles(retentionDate, policy.action, (processed, succeeded, failed, error) => {
            itemsProcessed += processed;
            itemsSucceeded += succeeded;
            itemsFailed += failed;
            if (error) errors.push(error);
          });
          break;
          
        default:
          throw new Error(`Unsupported data type: ${policy.dataType}`);
      }
      
      // Update policy last run
      await updateDoc(doc(db, this.POLICIES_COLLECTION, policyId), {
        lastRun: serverTimestamp(),
        nextRun: Timestamp.fromDate(this.calculateNextRun(policy.retentionPeriod))
      });
      
      const endTime = new Date();
      const status = itemsFailed === 0 ? 'success' : itemsFailed < itemsProcessed ? 'partial' : 'failed';
      
      const result: RetentionExecutionResult = {
        policyId,
        policyName: policy.name,
        dataType: policy.dataType,
        startTime,
        endTime,
        itemsProcessed,
        itemsSucceeded,
        itemsFailed,
        errors,
        status
      };
      
      // Log execution
      await this.logExecution(result);
      
      return result;
    } catch (error) {
      console.error('Failed to execute retention policy:', error);
      
      const endTime = new Date();
      const result: RetentionExecutionResult = {
        policyId,
        policyName: 'Unknown',
        dataType: DataType.TEMP_DATA,
        startTime,
        endTime,
        itemsProcessed,
        itemsSucceeded,
        itemsFailed,
        errors: [...errors, error instanceof Error ? error.message : 'Unknown error'],
        status: 'failed'
      };
      
      await this.logExecution(result);
      throw error;
    }
  }
  
  /**
   * Execute all enabled policies
   */
  static async executeAllPolicies(): Promise<RetentionExecutionResult[]> {
    try {
      const policies = await this.getPolicies();
      const enabledPolicies = policies.filter((p: any) => p.enabled);
      const results: RetentionExecutionResult[] = [];
      
      for (const policy of enabledPolicies) {
        try {
          const result = await this.executePolicy(policy.id);
          results.push(result);
        } catch (error) {
          console.error(`Failed to execute policy ${policy.name}:`, error);
        }
      }
      
      return results;
    } catch (error) {
      console.error('Failed to execute all policies:', error);
      throw error;
    }
  }
  
  /**
   * Get execution history
   */
  static async getExecutionHistory(limit: number = 100): Promise<RetentionExecutionResult[]> {
    try {
      const q = query(
        collection(db, this.EXECUTION_HISTORY),
        where('startTime', '>', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)), // Last 90 days
        limit(limit)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc: any) => ({
        ...doc.data(),
        startTime: doc.data().startTime?.toDate(),
        endTime: doc.data().endTime?.toDate()
      } as RetentionExecutionResult));
    } catch (error) {
      console.error('Failed to get execution history:', error);
      throw error;
    }
  }
  
  // Data processing methods
  
  private static async processAuditLogs(
    retentionDate: Date,
    action: RetentionAction,
    callback: (processed: number, succeeded: number, failed: number, error?: string) => void
  ): Promise<void> {
    const q = query(
      collection(db, 'audit_logs'),
      where('timestamp', '<', Timestamp.fromDate(retentionDate)),
      limit(this.BATCH_SIZE)
    );
    
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty && action === RetentionAction.DELETE) {
      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      
      try {
        await batch.commit();
        callback(snapshot.size, snapshot.size, 0);
      } catch (error) {
        callback(snapshot.size, 0, snapshot.size, error instanceof Error ? error.message : 'Unknown error');
      }
      
      // Continue processing if more documents
      if (snapshot.size === this.BATCH_SIZE) {
        await this.processAuditLogs(retentionDate, action, callback);
      }
    }
  }
  
  private static async processSessions(
    retentionDate: Date,
    action: RetentionAction,
    callback: (processed: number, succeeded: number, failed: number, error?: string) => void
  ): Promise<void> {
    const q = query(
      collection(db, 'sessions'),
      where('expiresAt', '<', Timestamp.fromDate(retentionDate)),
      limit(this.BATCH_SIZE)
    );
    
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty && action === RetentionAction.DELETE) {
      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      
      try {
        await batch.commit();
        callback(snapshot.size, snapshot.size, 0);
      } catch (error) {
        callback(snapshot.size, 0, snapshot.size, error instanceof Error ? error.message : 'Unknown error');
      }
      
      if (snapshot.size === this.BATCH_SIZE) {
        await this.processSessions(retentionDate, action, callback);
      }
    }
  }
  
  private static async processBackups(
    retentionDate: Date,
    action: RetentionAction,
    callback: (processed: number, succeeded: number, failed: number, error?: string) => void
  ): Promise<void> {
    const q = query(
      collection(db, 'backups'),
      where('createdAt', '<', Timestamp.fromDate(retentionDate)),
      limit(this.BATCH_SIZE)
    );
    
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty && action === RetentionAction.DELETE) {
      let succeeded = 0;
      let failed = 0;
      
      for (const doc of snapshot.docs) {
        try {
          // Delete from storage
          const backupData = doc.data();
          if (backupData.storageUrl) {
            const storageRef = ref(storage, backupData.storageUrl);
            await deleteObject(storageRef);
          }
          
          // Delete document
          await deleteDoc(doc.ref);
          succeeded++;
        } catch (error) {
          failed++;
          callback(1, 0, 1, error instanceof Error ? error.message : 'Unknown error');
        }
      }
      
      callback(snapshot.size, succeeded, failed);
      
      if (snapshot.size === this.BATCH_SIZE) {
        await this.processBackups(retentionDate, action, callback);
      }
    }
  }
  
  private static async processAnalytics(
    retentionDate: Date,
    action: RetentionAction,
    callback: (processed: number, succeeded: number, failed: number, error?: string) => void
  ): Promise<void> {
    const q = query(
      collection(db, 'analytics'),
      where('timestamp', '<', Timestamp.fromDate(retentionDate)),
      limit(this.BATCH_SIZE)
    );
    
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      if (action === RetentionAction.ANONYMIZE) {
        const batch = writeBatch(db);
        
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          batch.update(doc.ref, {
            userId: 'anonymous',
            userEmail: null,
            ipAddress: null,
            userAgent: null,
            anonymizedAt: serverTimestamp()
          });
        });
        
        try {
          await batch.commit();
          callback(snapshot.size, snapshot.size, 0);
        } catch (error) {
          callback(snapshot.size, 0, snapshot.size, error instanceof Error ? error.message : 'Unknown error');
        }
      } else if (action === RetentionAction.DELETE) {
        const batch = writeBatch(db);
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        
        try {
          await batch.commit();
          callback(snapshot.size, snapshot.size, 0);
        } catch (error) {
          callback(snapshot.size, 0, snapshot.size, error instanceof Error ? error.message : 'Unknown error');
        }
      }
      
      if (snapshot.size === this.BATCH_SIZE) {
        await this.processAnalytics(retentionDate, action, callback);
      }
    }
  }
  
  private static async processDeletedUsers(
    retentionDate: Date,
    action: RetentionAction,
    callback: (processed: number, succeeded: number, failed: number, error?: string) => void
  ): Promise<void> {
    const q = query(
      collection(db, 'deleted_users'),
      where('deletedAt', '<', Timestamp.fromDate(retentionDate)),
      limit(this.BATCH_SIZE)
    );
    
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty && action === RetentionAction.DELETE) {
      let succeeded = 0;
      let failed = 0;
      
      for (const doc of snapshot.docs) {
        try {
          const userId = doc.data().userId;
          
          // Delete all user data collections
          const collections = ['accounts', 'backups', 'sessions', 'devices', 'folders', 'tags'];
          
          for (const collectionName of collections) {
            const userCollectionRef = collection(db, `users/${userId}/${collectionName}`);
            const userDataSnapshot = await getDocs(userCollectionRef);
            
            const batch = writeBatch(db);
            userDataSnapshot.docs.forEach(dataDoc => batch.delete(dataDoc.ref));
            await batch.commit();
          }
          
          // Delete user document
          await deleteDoc(doc.ref);
          succeeded++;
        } catch (error) {
          failed++;
          callback(1, 0, 1, error instanceof Error ? error.message : 'Unknown error');
        }
      }
      
      callback(snapshot.size, succeeded, failed);
      
      if (snapshot.size === this.BATCH_SIZE) {
        await this.processDeletedUsers(retentionDate, action, callback);
      }
    }
  }
  
  private static async processExportFiles(
    retentionDate: Date,
    action: RetentionAction,
    callback: (processed: number, succeeded: number, failed: number, error?: string) => void
  ): Promise<void> {
    try {
      // List all files in exports directory
      const exportsRef = ref(storage, 'exports');
      const result = await listAll(exportsRef);
      
      let processed = 0;
      let succeeded = 0;
      let failed = 0;
      
      for (const item of result.items) {
        try {
          const metadata = await getMetadata(item);
          const createdAt = new Date(metadata.timeCreated);
          
          if (createdAt < retentionDate && action === RetentionAction.DELETE) {
            await deleteObject(item);
            succeeded++;
          }
          processed++;
        } catch (error) {
          failed++;
          callback(1, 0, 1, error instanceof Error ? error.message : 'Unknown error');
        }
      }
      
      callback(processed, succeeded, failed);
    } catch (error) {
      callback(0, 0, 0, error instanceof Error ? error.message : 'Unknown error');
    }
  }
  
  // Helper methods
  
  private static calculateRetentionDate(period: RetentionPeriod): Date {
    const now = new Date();
    
    switch (period.unit) {
      case 'days':
        now.setDate(now.getDate() - period.value);
        break;
      case 'months':
        now.setMonth(now.getMonth() - period.value);
        break;
      case 'years':
        now.setFullYear(now.getFullYear() - period.value);
        break;
    }
    
    return now;
  }
  
  private static calculateNextRun(period: RetentionPeriod): Date {
    const now = new Date();
    
    // Run daily for short retention periods, weekly for medium, monthly for long
    if (period.unit === 'days' && period.value <= 30) {
      now.setDate(now.getDate() + 1); // Daily
    } else if (period.unit === 'days' || (period.unit === 'months' && period.value <= 6)) {
      now.setDate(now.getDate() + 7); // Weekly
    } else {
      now.setMonth(now.getMonth() + 1); // Monthly
    }
    
    return now;
  }
  
  private static async logExecution(result: RetentionExecutionResult): Promise<void> {
    try {
      await addDoc(collection(db, this.EXECUTION_HISTORY), {
        ...result,
        startTime: Timestamp.fromDate(result.startTime),
        endTime: Timestamp.fromDate(result.endTime),
        createdAt: serverTimestamp()
      });
      
      // Log to audit trail
      await AuditHelper.logComplianceAction(
        'consent_update',
        'system',
        'system',
        {
          action: 'retention_policy_executed',
          policyName: result.policyName,
          dataType: result.dataType,
          itemsProcessed: result.itemsProcessed,
          status: result.status
        }
      );
    } catch (error) {
      console.error('Failed to log retention execution:', error);
    }
  }
}