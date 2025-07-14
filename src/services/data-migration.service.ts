/**
 * Data migration tools for version upgrades and data format changes
 * @module services/data-migration
 */

import { FirestoreService } from './firestore.service';
import { EncryptionService } from './encryption.service';
import { MobileEncryptionService } from './mobile-encryption.service';
import { OTPAccount } from './otp.service';
import { User } from '@src/types';

export interface MigrationResult {
  success: boolean;
  migratedCount: number;
  errorCount: number;
  errors: string[];
  version: string;
}

export interface BackupValidationResult {
  isValid: boolean;
  version: string;
  accountCount: number;
  errors: string[];
  warnings: string[];
}

export interface MigrationPlan {
  fromVersion: string;
  toVersion: string;
  steps: MigrationStep[];
  estimatedTime: number;
  requiresBackup: boolean;
}

export interface MigrationStep {
  id: string;
  description: string;
  action: string;
  reversible: boolean;
  critical: boolean;
}

export class DataMigrationService {
  private static readonly CURRENT_VERSION = '2.0.0';
  private static readonly SUPPORTED_VERSIONS = ['1.0.0', '1.1.0', '1.2.0', '2.0.0'];

  /**
   * Check if migration is needed
   */
  static async checkMigrationNeeded(userId: string): Promise<{
    needed: boolean;
    currentVersion: string;
    targetVersion: string;
    plan?: MigrationPlan;
  }> {
    try {
      const user = await FirestoreService.getDocument<User>('users', userId);
      const currentVersion = user?.dataVersion || '1.0.0';
      
      if (currentVersion === this.CURRENT_VERSION) {
        return {
          needed: false,
          currentVersion,
          targetVersion: this.CURRENT_VERSION
        };
      }

      const plan = await this.createMigrationPlan(currentVersion, this.CURRENT_VERSION);
      
      return {
        needed: true,
        currentVersion,
        targetVersion: this.CURRENT_VERSION,
        plan
      };
    } catch (_error) {
      console.error('Failed to check migration:', _error);
      throw error;
    }
  }

  /**
   * Create migration plan
   */
  static async createMigrationPlan(
    fromVersion: string,
    toVersion: string
  ): Promise<MigrationPlan> {
    const steps: MigrationStep[] = [];
    let estimatedTime = 0;
    let requiresBackup = false;

    // Define migration paths
    if (fromVersion === '1.0.0' && toVersion === '2.0.0') {
      steps.push({
        id: 'backup_data',
        description: 'Create backup of existing data',
        action: 'backup',
        reversible: false,
        critical: true
      });

      steps.push({
        id: 'migrate_encryption',
        description: 'Migrate to new encryption format',
        action: 'encrypt',
        reversible: true,
        critical: true
      });

      steps.push({
        id: 'update_schema',
        description: 'Update account schema',
        action: 'schema',
        reversible: true,
        critical: true
      });

      steps.push({
        id: 'add_biometric_fields',
        description: 'Add biometric authentication fields',
        action: 'fields',
        reversible: true,
        critical: false
      });

      steps.push({
        id: 'migrate_folders',
        description: 'Convert categories to folders',
        action: 'convert',
        reversible: true,
        critical: false
      });

      estimatedTime = 300; // 5 minutes
      requiresBackup = true;
    }

    if (fromVersion === '1.1.0' && toVersion === '2.0.0') {
      steps.push({
        id: 'update_encryption',
        description: 'Update encryption to latest format',
        action: 'encrypt',
        reversible: true,
        critical: true
      });

      steps.push({
        id: 'add_mobile_fields',
        description: 'Add mobile-specific fields',
        action: 'fields',
        reversible: true,
        critical: false
      });

      estimatedTime = 120; // 2 minutes
      requiresBackup = true;
    }

    return {
      fromVersion,
      toVersion,
      steps,
      estimatedTime,
      requiresBackup
    };
  }

  /**
   * Execute migration
   */
  static async executeMigration(
    userId: string,
    plan: MigrationPlan,
    progressCallback?: (step: string, progress: number) => void
  ): Promise<MigrationResult> {
    const _result: MigrationResult = {
      success: false,
      migratedCount: 0,
      errorCount: 0,
      errors: [],
      version: plan.toVersion
    };

    try {
      // Create backup if required
      if (plan.requiresBackup) {
        progressCallback?.('Creating backup...', 0);
        await this.createMigrationBackup(userId);
        progressCallback?.('Backup created', 10);
      }

      // Execute migration steps
      for (let i = 0; i < plan.steps.length; i++) {
        const step = plan.steps[i];
        const progress = 10 + ((i + 1) / plan.steps.length) * 80;
        
        progressCallback?.(`Executing: ${step.description}`, progress);
        
        try {
          await this.executeStep(userId, step, plan.fromVersion, plan.toVersion);
          result.migratedCount++;
        } catch (_error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          result.errors.push(`Step ${step.id}: ${errorMsg}`);
          result.errorCount++;
          
          if (step.critical) {
            throw new Error(`Critical migration step failed: ${step.id}`);
          }
        }
      }

      // Update user version
      await FirestoreService.updateDocument('users', userId, {
        dataVersion: plan.toVersion,
        lastMigration: new Date(),
        migrationHistory: [{
          fromVersion: plan.fromVersion,
          toVersion: plan.toVersion,
          migratedAt: new Date(),
          success: true,
          steps: result.migratedCount
        }]
      });

      progressCallback?.('Migration complete', 100);
      result.success = true;
      
    } catch (_error) {
      const errorMsg = error instanceof Error ? error.message : 'Migration failed';
      result.errors.push(errorMsg);
      result.success = false;
      
      // Attempt rollback for reversible steps
      await this.attemptRollback(userId, plan, result.migratedCount);
    }

    return result;
  }

  /**
   * Execute individual migration step
   */
  private static async executeStep(
    userId: string,
    step: MigrationStep,
    fromVersion: string,
    toVersion: string
  ): Promise<void> {
    switch (step.action) {
      case 'backup':
        await this.createMigrationBackup(userId);
        break;
        
      case 'encrypt':
        await this.migrateEncryption(userId, fromVersion, toVersion);
        break;
        
      case 'schema':
        await this.updateAccountSchema(userId, fromVersion, toVersion);
        break;
        
      case 'fields':
        await this.addNewFields(userId, step.id, toVersion);
        break;
        
      case 'convert':
        await this.convertData(userId, step.id, fromVersion, toVersion);
        break;
        
      default:
        throw new Error(`Unknown migration action: ${step.action}`);
    }
  }

  /**
   * Migrate encryption format
   */
  private static async migrateEncryption(
    userId: string,
    fromVersion: string,
    toVersion: string
  ): Promise<void> {
    const accounts = await FirestoreService.getUserAccounts(userId);
    
    for (const account of accounts.data) {
      try {
        // Decrypt with old format
        let decryptedSecret: string;
        
        if (fromVersion === '1.0.0') {
          // Old format - simple base64 encoding
          decryptedSecret = atob(account.encryptedSecret);
        } else {
          // Use regular decryption
          decryptedSecret = await EncryptionService.decrypt({
            encryptedData: account.encryptedSecret,
            password: 'legacy-key' // This would be user's actual key
          });
        }

        // Re-encrypt with new format
        const newEncrypted = await MobileEncryptionService.encryptData(decryptedSecret);
        
        // Update account
        await FirestoreService.updateUserAccount(userId, account.id, {
          encryptedSecret: newEncrypted,
          encryptionVersion: toVersion
        });
        
      } catch (_error) {
        console.error(`Failed to migrate encryption for account ${account.id}:`, _error);
        throw error;
      }
    }
  }

  /**
   * Update account schema
   */
  private static async updateAccountSchema(
    userId: string,
    fromVersion: string,
    toVersion: string
  ): Promise<void> {
    const accounts = await FirestoreService.getUserAccounts(userId);
    
    for (const account of accounts.data) {
      const updates: Partial<OTPAccount> = {};
      
      if (fromVersion === '1.0.0') {
        // Add new required fields
        updates.algorithm = account.algorithm || 'SHA1';
        updates.digits = account.digits || 6;
        updates.period = account.period || 30;
        updates.type = account.type || 'TOTP';
        updates.tags = account.tags || [];
        updates.isFavorite = account.isFavorite || false;
        updates.category = account.category || 'default';
      }

      if (fromVersion <= '1.1.0') {
        // Add biometric fields
        updates.requiresBiometric = false;
        updates.biometricTimeout = null;
        updates.lastBiometricAuth = null;
      }

      if (Object.keys(updates).length > 0) {
        await FirestoreService.updateUserAccount(userId, account.id, updates);
      }
    }
  }

  /**
   * Add new fields based on step
   */
  private static async addNewFields(
    userId: string,
    stepId: string,
    toVersion: string
  ): Promise<void> {
    if (stepId === 'add_biometric_fields') {
      const accounts = await FirestoreService.getUserAccounts(userId);
      
      for (const account of accounts.data) {
        await FirestoreService.updateUserAccount(userId, account.id, {
          requiresBiometric: false,
          biometricTimeout: null,
          lastBiometricAuth: null
        });
      }
    }

    if (stepId === 'add_mobile_fields') {
      const accounts = await FirestoreService.getUserAccounts(userId);
      
      for (const account of accounts.data) {
        await FirestoreService.updateUserAccount(userId, account.id, {
          mobileOptimized: true,
          lastSyncedAt: new Date(),
          syncVersion: 1
        });
      }
    }
  }

  /**
   * Convert data formats
   */
  private static async convertData(
    userId: string,
    stepId: string,
    fromVersion: string,
    toVersion: string
  ): Promise<void> {
    if (stepId === 'migrate_folders') {
      // Convert old categories to new folder system
      const accounts = await FirestoreService.getUserAccounts(userId);
      const categoryMap = new Map<string, string>();
      
      // Create folders for unique categories
      for (const account of accounts.data) {
        const category = account.category || 'default';
        
        if (!categoryMap.has(category) && category !== 'default') {
          const folderId = await FirestoreService.createDocument(
            `users/${userId}/folders`,
            {
              name: category,
              parentId: null,
              color: this.getCategoryColor(category),
              icon: this.getCategoryIcon(category)
            }
          );
          categoryMap.set(category, folderId);
        }
      }

      // Update accounts with folder references
      for (const account of accounts.data) {
        const category = account.category || 'default';
        const folderId = categoryMap.get(category) || null;
        
        await FirestoreService.updateUserAccount(userId, account.id, {
          folderId,
          category: undefined // Remove old category field
        });
      }
    }
  }

  /**
   * Create migration backup
   */
  private static async createMigrationBackup(userId: string): Promise<void> {
    const accounts = await FirestoreService.getUserAccounts(userId);
    const user = await FirestoreService.getDocument<User>('users', userId);
    
    const backupData = {
      version: '1.0',
      createdAt: new Date().toISOString(),
      purpose: 'migration_backup',
      user,
      accounts: accounts.data
    };

    await FirestoreService.createBackupRecord(userId, {
      provider: 'migration',
      accountCount: accounts.data.length,
      size: JSON.stringify(backupData).length,
      encrypted: false,
      checksum: await this.generateChecksum(JSON.stringify(backupData))
    });
  }

  /**
   * Attempt rollback
   */
  private static async attemptRollback(
    userId: string,
    plan: MigrationPlan,
    completedSteps: number
  ): Promise<void> {
    console.log(`Attempting rollback for user ${userId}, completed steps: ${completedSteps}`);
    
    // This would implement rollback logic for reversible steps
    // For now, we log the attempt
    
    await FirestoreService.updateDocument('users', userId, {
      migrationHistory: [{
        fromVersion: plan.fromVersion,
        toVersion: plan.toVersion,
        migratedAt: new Date(),
        success: false,
        rollback: true,
        completedSteps
      }]
    });
  }

  /**
   * Validate backup data
   */
  static async validateBackup(backupData: unknown): Promise<BackupValidationResult> {
    const _result: BackupValidationResult = {
      isValid: true,
      version: backupData.version || '1.0',
      accountCount: 0,
      errors: [],
      warnings: []
    };

    try {
      // Check version compatibility
      if (!this.SUPPORTED_VERSIONS.includes(result.version)) {
        result.errors.push(`Unsupported backup version: ${result.version}`);
        result.isValid = false;
      }

      // Validate structure
      if (!backupData.accounts || !Array.isArray(backupData.accounts)) {
        result.errors.push('Invalid backup structure: missing accounts array');
        result.isValid = false;
      } else {
        result.accountCount = backupData.accounts.length;

        // Validate each account
        for (let i = 0; i < backupData.accounts.length; i++) {
          const account = backupData.accounts[i];
          const accountErrors = this.validateAccountData(account, result.version);
          
          if (accountErrors.length > 0) {
            result.errors.push(`Account ${i + 1}: ${accountErrors.join(', ')}`);
          }
        }
      }

      // Check for encryption
      if (backupData.encrypted && !backupData.encryptionMetadata) {
        result.warnings.push('Backup is encrypted but missing encryption metadata');
      }

      // Check creation date
      if (!backupData.createdAt) {
        result.warnings.push('Backup missing creation date');
      }

    } catch (_error) {
      result.errors.push(`Validation _error: ${error}`);
      result.isValid = false;
    }

    return result;
  }

  /**
   * Validate individual account data
   */
  private static validateAccountData(account: unknown, version: string): string[] {
    const errors: string[] = [];

    // Required fields
    if (!account.label) errors.push('missing label');
    if (!account.issuer) errors.push('missing issuer');
    if (!account.encryptedSecret) errors.push('missing encrypted secret');

    // Version-specific validation
    if (version >= '2.0.0') {
      if (!account.algorithm) errors.push('missing algorithm');
      if (!account.digits) errors.push('missing digits');
      if (!account.period) errors.push('missing period');
    }

    return errors;
  }

  /**
   * Export data for external migration
   */
  static async exportForMigration(
    userId: string,
    format: 'json' | 'csv' | 'xml' = 'json'
  ): Promise<string> {
    const user = await FirestoreService.getDocument<User>('users', userId);
    const accounts = await FirestoreService.getUserAccounts(userId);
    
    const exportData = {
      exportedAt: new Date().toISOString(),
      exportFormat: format,
      sourceVersion: this.CURRENT_VERSION,
      user: {
        id: user?.id,
        email: user?.email,
        displayName: user?.displayName,
        settings: user?.settings,
        subscription: user?.subscription
      },
      accounts: accounts.data.map(account => ({
        label: account.label,
        issuer: account.issuer,
        type: account.type,
        algorithm: account.algorithm,
        digits: account.digits,
        period: account.period,
        tags: account.tags,
        category: account.category,
        isFavorite: account.isFavorite,
        createdAt: account.createdAt,
        // Note: encrypted secret is not included for security
      }))
    };

    switch (format) {
      case 'json':
        return JSON.stringify(exportData, null, 2);
      case 'csv':
        return this.convertToCSV(exportData.accounts);
      case 'xml':
        return this.convertToXML(exportData);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Helper methods
   */
  private static getCategoryColor(category: string): string {
    const colors = ['blue', 'green', 'red', 'purple', 'orange', 'yellow'];
    return colors[Math.abs(category.hashCode()) % colors.length];
  }

  private static getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      'social': 'users',
      'email': 'envelope',
      'finance': 'credit-card',
      'work': 'briefcase',
      'cloud': 'cloud',
      'gaming': 'gamepad',
      'shopping': 'shopping-cart'
    };
    return icons[category.toLowerCase()] || 'folder';
  }

  private static async generateChecksum(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private static convertToCSV(accounts: unknown[]): string {
    const headers = ['Label', 'Issuer', 'Type', 'Algorithm', 'Digits', 'Period', 'Tags', 'Category', 'Favorite'];
    const rows = accounts.map(account => [
      account.label,
      account.issuer,
      account.type,
      account.algorithm,
      account.digits,
      account.period,
      (account.tags || []).join(';'),
      account.category || '',
      account.isFavorite ? 'Yes' : 'No'
    ]);

    return [headers, ...rows].map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');
  }

  private static convertToXML(data: unknown): string {
    // Basic XML conversion - would need proper XML library for production
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<export>\n';
    xml += `  <metadata>\n`;
    xml += `    <exportedAt>${data.exportedAt}</exportedAt>\n`;
    xml += `    <sourceVersion>${data.sourceVersion}</sourceVersion>\n`;
    xml += `  </metadata>\n`;
    xml += `  <accounts>\n`;
    
    for (const account of data.accounts) {
      xml += `    <account>\n`;
      xml += `      <label>${account.label}</label>\n`;
      xml += `      <issuer>${account.issuer}</issuer>\n`;
      xml += `      <type>${account.type}</type>\n`;
      xml += `    </account>\n`;
    }
    
    xml += `  </accounts>\n</export>`;
    return xml;
  }
}

// String extension for hash code
declare global {
  interface String {
    hashCode(): number;
  }
}

String.prototype.hashCode = function(): number {
  let hash = 0;
  for (let i = 0; i < this.length; i++) {
    const char = this.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
};