/**
 * GDPR Compliance Service
 * Implements GDPR requirements including data portability, right to erasure, and consent management
 * @module services/compliance/gdpr-compliance
 */

import { 
  collection, 
  query, 
  where, 
  getDocs,
  deleteDoc,
  doc,
  writeBatch,
  updateDoc,
  serverTimestamp,
  Timestamp,
  getDoc
} from 'firebase/firestore';
import { ref, deleteObject, listAll, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@services/firebase';
import { AuthService } from '@services/auth.service';
import { AuditHelper } from './audit-helper';
import { AuditAction, AuditResource } from './audit-logging.service';
import { EncryptionService } from '@services/encryption.service';
import { AccountService } from '@services/account.service';
import { BackupService } from '@services/backup.service';
import { SubscriptionService } from '@services/subscription.service';

export interface ConsentRecord {
  id?: string;
  userId: string;
  type: ConsentType;
  granted: boolean;
  version: string;
  timestamp: Date | Timestamp;
  ipAddress?: string;
  details?: {
    purpose?: string;
    dataCategories?: string[];
    processingBasis?: string;
    retentionPeriod?: string;
  };
}

export enum ConsentType {
  MARKETING = 'marketing',
  ANALYTICS = 'analytics',
  PERSONALIZATION = 'personalization',
  THIRD_PARTY_SHARING = 'third_party_sharing',
  ESSENTIAL = 'essential',
  FUNCTIONAL = 'functional',
  PERFORMANCE = 'performance'
}

export interface DataExportRequest {
  id?: string;
  userId: string;
  userEmail: string;
  requestDate: Date | Timestamp;
  completedDate?: Date | Timestamp;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  format: 'json' | 'csv' | 'pdf';
  includeData: {
    accounts: boolean;
    settings: boolean;
    backups: boolean;
    auditLogs: boolean;
    sessions: boolean;
    devices: boolean;
  };
  downloadUrl?: string;
  expiryDate?: Date | Timestamp;
  errorMessage?: string;
}

export interface DeletionRequest {
  id?: string;
  userId: string;
  userEmail: string;
  requestDate: Date | Timestamp;
  scheduledDate: Date | Timestamp; // 30 days from request per GDPR
  completedDate?: Date | Timestamp;
  status: 'pending' | 'scheduled' | 'processing' | 'completed' | 'cancelled';
  reason?: string;
  dataToDelete: {
    accounts: boolean;
    personalData: boolean;
    backups: boolean;
    analytics: boolean;
    everything: boolean;
  };
  cancellationToken?: string;
}

export interface PrivacySettings {
  userId: string;
  dataCollection: {
    analytics: boolean;
    crashReports: boolean;
    usageStatistics: boolean;
    performanceMetrics: boolean;
  };
  dataSharing: {
    thirdPartyIntegrations: boolean;
    anonymizedDataForImprovement: boolean;
    marketingCommunications: boolean;
  };
  visibility: {
    profileVisibleToTeam: boolean;
    activityVisibleToAdmin: boolean;
  };
  retention: {
    autoDeleteInactiveDays?: number;
    autoDeleteBackupsDays?: number;
  };
  updatedAt: Date | Timestamp;
}

export class GDPRComplianceService {
  private static readonly CONSENT_COLLECTION = 'gdpr_consents';
  private static readonly EXPORT_REQUESTS = 'gdpr_export_requests';
  private static readonly DELETION_REQUESTS = 'gdpr_deletion_requests';
  private static readonly PRIVACY_SETTINGS = 'gdpr_privacy_settings';
  private static readonly CONSENT_VERSION = '2.0';
  private static readonly EXPORT_EXPIRY_DAYS = 7;
  private static readonly DELETION_GRACE_PERIOD_DAYS = 30;

  /**
   * Record user consent
   */
  static async recordConsent(
    userId: string,
    type: ConsentType,
    granted: boolean,
    details?: ConsentRecord['details']
  ): Promise<void> {
    try {
      const user = await AuthService.getCurrentUser();
      const consentRecord: Omit<ConsentRecord, 'id'> = {
        userId,
        type,
        granted,
        version: this.CONSENT_VERSION,
        timestamp: serverTimestamp() as Timestamp,
        ipAddress: await this.getClientIP(),
        details
      };

      await collection(db, this.CONSENT_COLLECTION).add(consentRecord);

      await AuditHelper.logComplianceAction(
        'consent_update',
        userId,
        user?.email || 'unknown',
        {
          consentType: type,
          granted,
          version: this.CONSENT_VERSION
        }
      );
    } catch (error) {
      console.error('Failed to record consent:', error);
      throw error;
    }
  }

  /**
   * Get user consents
   */
  static async getUserConsents(userId: string): Promise<ConsentRecord[]> {
    try {
      const q = query(
        collection(db, this.CONSENT_COLLECTION),
        where('userId', '==', userId)
      );

      const snapshot = await getDocs(q);
      
      // Get latest consent for each type
      const consentMap = new Map<ConsentType, ConsentRecord>();
      
      snapshot.docs.forEach(doc => {
        const consent = {
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate()
        } as ConsentRecord;
        
        const existing = consentMap.get(consent.type);
        if (!existing || consent.timestamp > existing.timestamp) {
          consentMap.set(consent.type, consent);
        }
      });

      return Array.from(consentMap.values());
    } catch (error) {
      console.error('Failed to get user consents:', error);
      throw error;
    }
  }

  /**
   * Request data export (GDPR Article 20 - Data Portability)
   */
  static async requestDataExport(
    userId: string,
    format: 'json' | 'csv' | 'pdf' = 'json',
    includeData?: Partial<DataExportRequest['includeData']>
  ): Promise<string> {
    try {
      const user = await AuthService.getCurrentUser();
      if (!user || user.uid !== userId) {
        throw new Error('Unauthorized');
      }

      const exportRequest: Omit<DataExportRequest, 'id'> = {
        userId,
        userEmail: user.email!,
        requestDate: serverTimestamp() as Timestamp,
        status: 'pending',
        format,
        includeData: {
          accounts: true,
          settings: true,
          backups: true,
          auditLogs: true,
          sessions: false,
          devices: true,
          ...includeData
        }
      };

      const docRef = await collection(db, this.EXPORT_REQUESTS).add(exportRequest);

      await AuditHelper.logComplianceAction(
        'data_request',
        userId,
        user.email!,
        {
          requestId: docRef.id,
          format,
          dataTypes: Object.keys(exportRequest.includeData).filter(
            key => exportRequest.includeData[key as keyof typeof exportRequest.includeData]
          )
        }
      );

      // Process export asynchronously
      this.processDataExport(docRef.id, userId, exportRequest);

      return docRef.id;
    } catch (error) {
      console.error('Failed to request data export:', error);
      throw error;
    }
  }

  /**
   * Process data export request
   */
  private static async processDataExport(
    requestId: string,
    userId: string,
    request: Omit<DataExportRequest, 'id'>
  ): Promise<void> {
    try {
      // Update status to processing
      await updateDoc(doc(db, this.EXPORT_REQUESTS, requestId), {
        status: 'processing'
      });

      const exportData: unknown = {
        exportDate: new Date().toISOString(),
        userId,
        userEmail: request.userEmail,
        dataIncluded: []
      };

      // Export accounts
      if ((request as any).includeData.accounts) {
        const accounts = await AccountService.getUserAccounts(userId);
        exportData.accounts = (accounts || []).map((acc: any) => ({
          ...acc,
          secret: '[ENCRYPTED]' // Don't export actual secrets
        }));
        exportData.dataIncluded.push('accounts');
      }

      // Export settings
      if ((request as any).includeData.settings) {
        const settings = await this.getUserSettings(userId);
        exportData.settings = settings;
        exportData.dataIncluded.push('settings');
      }

      // Export backups
      if ((request as any).includeData.backups) {
        const backups = await BackupService.listBackups(userId);
        exportData.backups = backups.map((backup: any) => ({
          ...backup,
          encryptedData: '[ENCRYPTED]' // Don't export actual backup data
        }));
        exportData.dataIncluded.push('backups');
      }

      // Export audit logs
      if ((request as any).includeData.auditLogs) {
        const auditLogs = await this.getUserAuditLogs(userId);
        exportData.auditLogs = auditLogs;
        exportData.dataIncluded.push('auditLogs');
      }

      // Export devices
      if ((request as any).includeData.devices) {
        const devices = await this.getUserDevices(userId);
        exportData.devices = devices;
        exportData.dataIncluded.push('devices');
      }

      // Generate export file
      let fileContent: string;
      let fileName: string;
      let contentType: string;

      switch (request.format) {
        case 'csv':
          fileContent = this.convertToCSV(exportData);
          fileName = `gdpr-export-${userId}-${Date.now()}.csv`;
          contentType = 'text/csv';
          break;
        case 'pdf':
          // For PDF, we'd need a PDF generation library
          // For now, fallback to JSON
          fileContent = JSON.stringify(exportData, null, 2);
          fileName = `gdpr-export-${userId}-${Date.now()}.json`;
          contentType = 'application/json';
          break;
        default:
          fileContent = JSON.stringify(exportData, null, 2);
          fileName = `gdpr-export-${userId}-${Date.now()}.json`;
          contentType = 'application/json';
      }

      // Upload to secure storage
      const storageRef = ref(storage, `gdpr-exports/${userId}/${fileName}`);
      const blob = new Blob([fileContent], { type: contentType });
      await uploadBytes(storageRef, blob, {
        contentType,
        customMetadata: {
          userId,
          requestId,
          exportDate: new Date().toISOString()
        }
      });

      const downloadUrl = await getDownloadURL(storageRef);
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + this.EXPORT_EXPIRY_DAYS);

      // Update request with download URL
      await updateDoc(doc(db, this.EXPORT_REQUESTS, requestId), {
        status: 'completed',
        completedDate: serverTimestamp(),
        downloadUrl,
        expiryDate: Timestamp.fromDate(expiryDate)
      });

      // Send notification to user (implement notification service)
      // NotificationService.send(userId, 'Your data export is ready', { downloadUrl });

    } catch (error) {
      console.error('Failed to process data export:', error);
      
      await updateDoc(doc(db, this.EXPORT_REQUESTS, requestId), {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Request account deletion (GDPR Article 17 - Right to Erasure)
   */
  static async requestDeletion(
    userId: string,
    reason?: string,
    dataToDelete?: Partial<DeletionRequest['dataToDelete']>
  ): Promise<string> {
    try {
      const user = await AuthService.getCurrentUser();
      if (!user || user.uid !== userId) {
        throw new Error('Unauthorized');
      }

      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + this.DELETION_GRACE_PERIOD_DAYS);

      const deletionRequest: Omit<DeletionRequest, 'id'> = {
        userId,
        userEmail: user.email!,
        requestDate: serverTimestamp() as Timestamp,
        scheduledDate: Timestamp.fromDate(scheduledDate),
        status: 'scheduled',
        reason,
        dataToDelete: {
          accounts: true,
          personalData: true,
          backups: true,
          analytics: true,
          everything: true,
          ...dataToDelete
        },
        cancellationToken: this.generateCancellationToken()
      };

      const docRef = await collection(db, this.DELETION_REQUESTS).add(deletionRequest);

      await AuditHelper.logComplianceAction(
        'deletion_request',
        userId,
        user.email!,
        {
          requestId: docRef.id,
          scheduledDate: scheduledDate.toISOString(),
          reason
        }
      );

      // Send confirmation email with cancellation link
      // EmailService.sendDeletionConfirmation(user.email!, docRef.id, deletionRequest.cancellationToken);

      return docRef.id;
    } catch (error) {
      console.error('Failed to request deletion:', error);
      throw error;
    }
  }

  /**
   * Cancel deletion request
   */
  static async cancelDeletion(
    requestId: string,
    cancellationToken: string
  ): Promise<void> {
    try {
      const requestDoc = await getDoc(doc(db, this.DELETION_REQUESTS, requestId));
      
      if (!requestDoc.exists()) {
        throw new Error('Deletion request not found');
      }

      const request = requestDoc.data() as DeletionRequest;
      
      if (request.cancellationToken !== cancellationToken) {
        throw new Error('Invalid cancellation token');
      }

      if (request.status !== 'scheduled') {
        throw new Error('Cannot cancel deletion in current status');
      }

      await updateDoc(doc(db, this.DELETION_REQUESTS, requestId), {
        status: 'cancelled',
        completedDate: serverTimestamp()
      });

      await AuditHelper.logComplianceAction(
        'deletion_request',
        request.userId,
        request.userEmail,
        {
          action: 'cancelled',
          requestId
        }
      );
    } catch (error) {
      console.error('Failed to cancel deletion:', error);
      throw error;
    }
  }

  /**
   * Process scheduled deletions
   */
  static async processScheduledDeletions(): Promise<void> {
    try {
      const q = query(
        collection(db, this.DELETION_REQUESTS),
        where('status', '==', 'scheduled'),
        where('scheduledDate', '<=', Timestamp.now())
      );

      const snapshot = await getDocs(q);

      for (const doc of snapshot.docs) {
        const request = {
          id: doc.id,
          ...doc.data()
        } as DeletionRequest;

        await this.executeDeleteion(request);
      }
    } catch (error) {
      console.error('Failed to process scheduled deletions:', error);
    }
  }

  /**
   * Execute user data deletion
   */
  private static async executeDeleteion(request: DeletionRequest): Promise<void> {
    try {
      // Update status
      await updateDoc(doc(db, this.DELETION_REQUESTS, request.id!), {
        status: 'processing'
      });

      const batch = writeBatch(db);

      // Delete accounts
      if ((request as any).dataToDelete.accounts) {
        const accountsQuery = query(
          collection(db, 'accounts'),
          where('userId', '==', request.userId)
        );
        const accountsSnapshot = await getDocs(accountsQuery);
        accountsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      }

      // Delete personal data
      if ((request as any).dataToDelete.personalData) {
        // Delete user profile
        batch.delete(doc(db, 'users', request.userId));
        
        // Delete settings
        const settingsQuery = query(
          collection(db, 'settings'),
          where('userId', '==', request.userId)
        );
        const settingsSnapshot = await getDocs(settingsQuery);
        settingsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      }

      // Delete backups
      if ((request as any).dataToDelete.backups) {
        // Delete from Firestore
        const backupsQuery = query(
          collection(db, 'backups'),
          where('userId', '==', request.userId)
        );
        const backupsSnapshot = await getDocs(backupsQuery);
        backupsSnapshot.docs.forEach(doc => batch.delete(doc.ref));

        // Delete from Storage
        const backupsRef = ref(storage, `backups/${request.userId}`);
        const backupsList = await listAll(backupsRef);
        await Promise.all(((backupsList.items) || []).map((item: any) => deleteObject(item)));
      }

      // Anonymize analytics data
      if ((request as any).dataToDelete.analytics) {
        const analyticsQuery = query(
          collection(db, 'analytics'),
          where('userId', '==', request.userId)
        );
        const analyticsSnapshot = await getDocs(analyticsQuery);
        
        analyticsSnapshot.docs.forEach(doc => {
          batch.update(doc.ref, {
            userId: 'deleted',
            userEmail: null,
            ipAddress: null,
            anonymizedAt: serverTimestamp()
          });
        });
      }

      // Execute batch delete
      await batch.commit();

      // Delete auth account
      if ((request as any).dataToDelete.everything) {
        await AuthService.deleteUser();
      }

      // Update request status
      await updateDoc(doc(db, this.DELETION_REQUESTS, request.id!), {
        status: 'completed',
        completedDate: serverTimestamp()
      });

      // Log completion
      await AuditHelper.logComplianceAction(
        'deletion_request',
        request.userId,
        request.userEmail,
        {
          action: 'completed',
          requestId: request.id,
          dataDeleted: Object.keys(request.dataToDelete).filter(
            key => request.dataToDelete[key as keyof typeof request.dataToDelete]
          )
        }
      );
    } catch (error) {
      console.error('Failed to execute deletion:', error);
      
      await updateDoc(doc(db, this.DELETION_REQUESTS, request.id!), {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Update privacy settings
   */
  static async updatePrivacySettings(
    userId: string,
    settings: Partial<PrivacySettings>
  ): Promise<void> {
    try {
      const user = await AuthService.getCurrentUser();
      if (!user || user.uid !== userId) {
        throw new Error('Unauthorized');
      }

      const privacySettings: PrivacySettings = {
        userId,
        dataCollection: {
          analytics: true,
          crashReports: true,
          usageStatistics: true,
          performanceMetrics: true,
          ...settings.dataCollection
        },
        dataSharing: {
          thirdPartyIntegrations: false,
          anonymizedDataForImprovement: true,
          marketingCommunications: false,
          ...settings.dataSharing
        },
        visibility: {
          profileVisibleToTeam: true,
          activityVisibleToAdmin: true,
          ...settings.visibility
        },
        retention: {
          ...settings.retention
        },
        updatedAt: serverTimestamp() as Timestamp
      };

      const docRef = doc(db, this.PRIVACY_SETTINGS, userId);
      await updateDoc(docRef, privacySettings);

      await AuditHelper.logComplianceAction(
        'consent_update',
        userId,
        user.email!,
        {
          action: 'privacy_settings_updated',
          changes: settings
        }
      );
    } catch (error) {
      console.error('Failed to update privacy settings:', error);
      throw error;
    }
  }

  /**
   * Get privacy settings
   */
  static async getPrivacySettings(userId: string): Promise<PrivacySettings | null> {
    try {
      const docRef = doc(db, this.PRIVACY_SETTINGS, userId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      return {
        ...docSnap.data(),
        updatedAt: docSnap.data().updatedAt?.toDate()
      } as PrivacySettings;
    } catch (error) {
      console.error('Failed to get privacy settings:', error);
      throw error;
    }
  }

  /**
   * Check data processing lawfulness
   */
  static async checkProcessingLawfulness(
    userId: string,
    processingType: ConsentType
  ): Promise<boolean> {
    try {
      const consents = await this.getUserConsents(userId);
      const consent = consents.find((c: any) => c.type === processingType);
      
      // Essential processing doesn't require consent
      if (processingType === ConsentType.ESSENTIAL) {
        return true;
      }

      return consent?.granted || false;
    } catch (error) {
      console.error('Failed to check processing lawfulness:', error);
      return false;
    }
  }

  // Helper methods

  private static async getUserSettings(userId: string): Promise<any> {
    const settingsQuery = query(
      collection(db, 'settings'),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(settingsQuery);
    return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
  }

  private static async getUserAuditLogs(userId: string): Promise<any[]> {
    const auditQuery = query(
      collection(db, 'audit_logs'),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(auditQuery);
    return snapshot.docs.map((doc: any) => ({ 
      id: doc.id, 
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate()
    }));
  }

  private static async getUserDevices(userId: string): Promise<any[]> {
    const devicesQuery = query(
      collection(db, 'devices'),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(devicesQuery);
    return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
  }

  private static convertToCSV(data: any): string {
    // Simple CSV conversion for flat data structures
    const flattenObject = (obj: unknown, prefix = ''): unknown => {
      return Object.keys(obj).reduce((acc, key) => {
        const value = obj[key];
        const newKey = prefix ? `${prefix}.${key}` : key;
        
        if (value === null || value === undefined) {
          acc[newKey] = '';
        } else if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
          Object.assign(acc, flattenObject(value, newKey));
        } else if (Array.isArray(value)) {
          acc[newKey] = value.join('; ');
        } else {
          acc[newKey] = value;
        }
        
        return acc;
      }, {} as unknown);
    };

    const flattened = flattenObject(data);
    const headers = Object.keys(flattened);
    const values = headers.map((header: any) => `"${flattened[header]}"`);

    return [headers.join(','), values.join(',')].join('\n');
  }

  private static generateCancellationToken(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b: any) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private static async getClientIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  }
}