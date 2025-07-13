/**
 * Import/Export Service
 * @module services/importExport
 */

import { OTPAccount } from '@services/otp.service';
import { EncryptionService } from '@services/encryption.service';
import { OTPService } from '@services/otp.service';
import { AuditLogService } from '@services/audit-log.service';
import { auth } from '@src/config/firebase';

export type ExportFormat = 
  | 'json' 
  | 'google_authenticator' 
  | 'authy' 
  | '2fas' 
  | 'aegis' 
  | 'raivo';

export type ImportFormat = ExportFormat;

export interface ExportData {
  version: string;
  exported: string;
  encrypted: boolean;
  accounts: unknown[];
  checksum?: string;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: string[];
  accounts: OTPAccount[];
}

export class ImportExportService {
  private static readonly SUPPORTED_FORMATS = ['2fas', 'aegis', 'andotp', 'google', 'plain'];
  private static readonly EXPORT_VERSION = '1.0';

  /**
   * Export accounts to various formats
   */
  static async exportAccounts(
    accounts: OTPAccount[],
    format: ExportFormat = 'json',
    password?: string
  ): Promise<string> {
    const userId = auth.currentUser?.uid || 'unknown';
    
    try {
      let _result: string;
      
      switch (format) {
      case 'json':
      case '2fas':
        result = await this.exportTo2FAS(accounts, password);
        break;
      case 'aegis':
        result = await this.exportToAegis(accounts, password);
        break;
      case 'google_authenticator':
        result = await this.exportToGoogleAuth(accounts);
        break;
      case 'authy':
      case 'raivo':
        result = await this.exportToPlainText(accounts);
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
      }
      
      // Log successful export
      await AuditLogService.log({
        userId,
        action: 'account.exported',
        resource: 'accounts',
        severity: 'info',
        success: true,
        details: {
          format,
          accountCount: accounts.length,
          encrypted: !!password
        }
      });
      
      return result;
    } catch (_error) {
      // Log failed export
      await AuditLogService.log({
        userId,
        action: 'account.exported',
        resource: 'accounts',
        severity: 'warning',
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        details: {
          format,
          accountCount: accounts.length
        }
      });
      
      throw error;
    }
  }

  /**
   * Import accounts from various formats
   */
  static async importAccounts(
    data: string,
    format: ImportFormat = 'json',
    password?: string
  ): Promise<OTPAccount[]> {
    // For now, we don't support auto-detect
    // Later we can implement detectFormat method

    let _result: ImportResult;
    
    switch (format) {
      case '2fas':
        result = await this.importFrom2FAS(data, password);
        break;
      case 'aegis':
        result = await this.importFromAegis(data, password);
        break;
      case 'json':
      case 'google_authenticator':
        result = await this.importFromGoogleAuth(data);
        break;
      case 'authy':
        result = await this.importFromPlainText(data);
        break;
      case 'raivo':
        result = await this.importFromPlainText(data);
        break;
      default:
        throw new Error(`Unsupported import format: ${format}`);
    }
    
    const userId = auth.currentUser?.uid || 'unknown';
    
    if (!result.success) {
      // Log failed import
      await AuditLogService.log({
        userId,
        action: 'account.imported',
        resource: 'accounts',
        severity: 'warning',
        success: false,
        errorMessage: result.errors.join(', '),
        details: {
          format,
          attemptedCount: result.imported + result.failed,
          failedCount: result.failed,
          errors: result.errors
        }
      });
      
      throw new Error(result.errors.join(', '));
    }
    
    // Log successful import
    await AuditLogService.log({
      userId,
      action: 'account.imported',
      resource: 'accounts',
      severity: 'info',
      success: true,
      details: {
        format,
        importedCount: result.imported,
        failedCount: result.failed,
        encrypted: !!password
      }
    });
    
    return result.accounts;
  }

  /**
   * Export to 2FAS format
   */
  private static async exportTo2FAS(accounts: OTPAccount[], password?: string): Promise<string> {
    const exportData: ExportData = {
      version: this.EXPORT_VERSION,
      exported: new Date().toISOString(),
      encrypted: !!password,
      accounts: accounts.map(account => ({
        name: account.label,
        secret: account.secret,
        issuer: account.issuer,
        type: account.type.toUpperCase(),
        algorithm: account.algorithm,
        digits: account.digits,
        period: account.period,
        counter: account.counter,
        icon: account.iconUrl,
        tags: account.tags
      }))
    };

    let jsonString = JSON.stringify(exportData, null, 2);

    // Encrypt if password provided
    if (password) {
      const encrypted = await EncryptionService.encrypt({
        data: jsonString,
        password
      });
      jsonString = JSON.stringify(encrypted);
    }

    return jsonString;
  }

  /**
   * Export to Aegis format
   */
  private static async exportToAegis(accounts: OTPAccount[], password?: string): Promise<string> {
    const aegisData = {
      version: 1,
      header: {
        slots: null,
        params: null
      },
      db: {
        version: 2,
        entries: accounts.map(account => ({
          type: account.type.toLowerCase(),
          uuid: crypto.randomUUID(),
          name: account.label,
          issuer: account.issuer,
          note: '',
          icon: null,
          info: {
            secret: account.secret,
            algo: account.algorithm,
            digits: account.digits,
            period: account.period,
            counter: account.counter
          }
        }))
      }
    };

    const jsonString = JSON.stringify(aegisData);

    // Aegis uses its own encryption format
    if (password) {
      // Note: This is a simplified version. Aegis uses a specific encryption scheme
      console.warn('Password encryption for Aegis format is not fully implemented');
    }

    return jsonString;
  }

  /**
   * Export to andOTP format
   */
  private static async exportToAndOTP(accounts: OTPAccount[], password?: string): Promise<string> {
    const andOTPData = accounts.map(account => ({
      secret: account.secret,
      issuer: account.issuer,
      label: account.label,
      digits: account.digits,
      type: account.type.toUpperCase(),
      algorithm: account.algorithm,
      thumbnail: 'Default',
      last_used: 0,
      used_frequency: 0,
      period: account.period,
      counter: account.counter,
      tags: account.tags
    }));

    const jsonString = JSON.stringify(andOTPData);

    // andOTP uses its own encryption format
    if (password) {
      // Note: This is a simplified version. andOTP uses a specific encryption scheme
      console.warn('Password encryption for andOTP format is not fully implemented');
    }

    return jsonString;
  }

  /**
   * Export to Google Authenticator format (unencrypted URI list)
   */
  private static exportToGoogleAuth(accounts: OTPAccount[]): string {
    return accounts
      .map(account => OTPService.generateURI(account))
      .join('\n');
  }

  /**
   * Export to plain text format
   */
  private static exportToPlainText(accounts: OTPAccount[]): string {
    return accounts.map(account => {
      const parts = [
        `Issuer: ${account.issuer}`,
        `Account: ${account.label}`,
        `Secret: ${account.secret}`,
        `Type: ${account.type.toUpperCase()}`,
        `Algorithm: ${account.algorithm}`,
        `Digits: ${account.digits}`
      ];

      if (account.type === 'totp') {
        parts.push(`Period: ${account.period}`);
      } else {
        parts.push(`Counter: ${account.counter}`);
      }

      if (account.tags?.length) {
        parts.push(`Tags: ${account.tags.join(', ')}`);
      }

      return parts.join('\n');
    }).join('\n\n---\n\n');
  }

  /**
   * Import from 2FAS format
   */
  private static async importFrom2FAS(data: string, password?: string): Promise<ImportResult> {
    const _result: ImportResult = {
      success: false,
      imported: 0,
      failed: 0,
      errors: [],
      accounts: []
    };

    try {
      let parsedData: unknown;

      // Try to parse as encrypted data first
      try {
        const encrypted = JSON.parse(data);
        if (encrypted.salt && encrypted.iterations && password) {
          const decrypted = await EncryptionService.decrypt({
            encryptedData: encrypted,
            password
          });
          parsedData = JSON.parse(decrypted);
        } else {
          parsedData = encrypted;
        }
      } catch {
        // If parsing fails, assume it's plain JSON
        parsedData = JSON.parse(data);
      }

      // Validate format
      if (!parsedData.accounts || !Array.isArray(parsedData.accounts)) {
        throw new Error('Invalid 2FAS format: missing accounts array');
      }

      // Import accounts
      for (const accountData of parsedData.accounts) {
        try {
          const account: OTPAccount = {
            id: crypto.randomUUID(),
            type: (accountData.type || 'TOTP').toLowerCase() as 'totp' | 'hotp',
            issuer: accountData.issuer || accountData.name || 'Unknown',
            label: accountData.name || accountData.account || '',
            secret: accountData.secret,
            algorithm: accountData.algorithm || 'SHA1',
            digits: accountData.digits || 6,
            period: accountData.period || 30,
            counter: accountData.counter || 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            tags: accountData.tags || [],
            iconUrl: accountData.icon
          };

          // Validate account
          if (!account.secret) {
            throw new Error('Missing secret key');
          }

          result.accounts.push(account);
          result.imported++;
        } catch (_error: unknown) {
          result.failed++;
          result.errors.push(`Failed to import ${accountData.name}: ${error.message}`);
        }
      }

      result.success = result.imported > 0;
    } catch (_error: unknown) {
      result.errors.push(`Failed to parse 2FAS data: ${error.message}`);
    }

    return result;
  }

  /**
   * Import from Aegis format
   */
  private static async importFromAegis(data: string, password?: string): Promise<ImportResult> {
    const _result: ImportResult = {
      success: false,
      imported: 0,
      failed: 0,
      errors: [],
      accounts: []
    };

    try {
      const parsedData = JSON.parse(data);

      // Check if encrypted
      if (parsedData.header?.slots && password) {
        result.errors.push('Encrypted Aegis imports are not yet supported');
        return result;
      }

      // Validate format
      if (!parsedData.db?.entries || !Array.isArray(parsedData.db.entries)) {
        throw new Error('Invalid Aegis format: missing entries');
      }

      // Import accounts
      for (const entry of parsedData.db.entries) {
        try {
          const account: OTPAccount = {
            id: crypto.randomUUID(),
            type: entry.type as 'totp' | 'hotp',
            issuer: entry.issuer || 'Unknown',
            label: entry.name,
            secret: entry.info.secret,
            algorithm: entry.info.algo || 'SHA1',
            digits: entry.info.digits || 6,
            period: entry.info.period || 30,
            counter: entry.info.counter || 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            tags: []
          };

          result.accounts.push(account);
          result.imported++;
        } catch (_error: unknown) {
          result.failed++;
          result.errors.push(`Failed to import ${entry.name}: ${error.message}`);
        }
      }

      result.success = result.imported > 0;
    } catch (_error: unknown) {
      result.errors.push(`Failed to parse Aegis data: ${error.message}`);
    }

    return result;
  }

  /**
   * Import from andOTP format
   */
  private static async importFromAndOTP(data: string, password?: string): Promise<ImportResult> {
    const _result: ImportResult = {
      success: false,
      imported: 0,
      failed: 0,
      errors: [],
      accounts: []
    };

    try {
      const parsedData = JSON.parse(data);

      // Check if it's an array
      const entries = Array.isArray(parsedData) ? parsedData : [parsedData];

      // Import accounts
      for (const entry of entries) {
        try {
          const account: OTPAccount = {
            id: crypto.randomUUID(),
            type: (entry.type || 'TOTP').toLowerCase() as 'totp' | 'hotp',
            issuer: entry.issuer || entry.label || 'Unknown',
            label: entry.label || '',
            secret: entry.secret,
            algorithm: entry.algorithm || 'SHA1',
            digits: entry.digits || 6,
            period: entry.period || 30,
            counter: entry.counter || 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            tags: entry.tags || []
          };

          result.accounts.push(account);
          result.imported++;
        } catch (_error: unknown) {
          result.failed++;
          result.errors.push(`Failed to import account: ${error.message}`);
        }
      }

      result.success = result.imported > 0;
    } catch (_error: unknown) {
      result.errors.push(`Failed to parse andOTP data: ${error.message}`);
    }

    return result;
  }

  /**
   * Import from Google Authenticator format (URI list)
   */
  private static importFromGoogleAuth(data: string): ImportResult {
    const _result: ImportResult = {
      success: false,
      imported: 0,
      failed: 0,
      errors: [],
      accounts: []
    };

    const lines = data.split('\n').filter(line => line.trim());

    for (const line of lines) {
      try {
        if (!line.startsWith('otpauth://')) {
          continue;
        }

        const parsed = OTPService.parseURI(line);
        if (!parsed) {
          throw new Error('Failed to parse URI');
        }

        const account: OTPAccount = {
          id: crypto.randomUUID(),
          type: parsed.type as 'totp' | 'hotp',
          issuer: parsed.issuer || 'Unknown',
          label: parsed.label || (parsed as unknown).accountName || (parsed as unknown).name || '',
          secret: parsed.secret || '',
          algorithm: parsed.algorithm || 'SHA1',
          digits: parsed.digits || 6,
          period: parsed.period || 30,
          counter: parsed.counter || 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          tags: []
        };

        result.accounts.push(account);
        result.imported++;
      } catch (_error: unknown) {
        result.failed++;
        result.errors.push(`Failed to import URI: ${error.message}`);
      }
    }

    result.success = result.imported > 0;
    return result;
  }

  /**
   * Import from plain text format
   */
  private static importFromPlainText(data: string): ImportResult {
    const _result: ImportResult = {
      success: false,
      imported: 0,
      failed: 0,
      errors: [],
      accounts: []
    };

    // Split by common delimiters
    const entries = data.split(/\n---\n|\n\n\n/);

    for (const entry of entries) {
      try {
        const lines = entry.trim().split('\n');
        const account: Partial<OTPAccount> = {
          id: crypto.randomUUID(),
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // Parse each line
        for (const line of lines) {
          const [key, ...valueParts] = line.split(':');
          const value = valueParts.join(':').trim();

          switch (key.toLowerCase().trim()) {
            case 'issuer':
              account.issuer = value;
              break;
            case 'account':
            case 'label':
            case 'name':
              account.label = value;
              break;
            case 'secret':
            case 'key':
              account.secret = value.replace(/\s/g, '');
              break;
            case 'type':
              account.type = value.toLowerCase() as 'totp' | 'hotp';
              break;
            case 'algorithm':
            case 'algo':
              account.algorithm = value.toUpperCase() as 'SHA1' | 'SHA256' | 'SHA512';
              break;
            case 'digits':
              account.digits = parseInt(value) || 6;
              break;
            case 'period':
              account.period = parseInt(value) || 30;
              break;
            case 'counter':
              account.counter = parseInt(value) || 0;
              break;
            case 'tags':
              account.tags = value.split(',').map(t => t.trim());
              break;
          }
        }

        // Validate required fields
        if (!account.secret) {
          throw new Error('Missing secret key');
        }

        // Set defaults
        account.type = account.type || 'totp';
        account.issuer = account.issuer || 'Unknown';
        account.label = account.label || '';
        account.algorithm = account.algorithm || 'SHA1';
        account.digits = account.digits || 6;
        account.period = account.period || 30;
        account.counter = account.counter || 0;
        account.tags = account.tags || [];

        result.accounts.push(account as OTPAccount);
        result.imported++;
      } catch (_error: unknown) {
        result.failed++;
        result.errors.push(`Failed to import entry: ${error.message}`);
      }
    }

    result.success = result.imported > 0;
    return result;
  }

  /**
   * Detect format from data
   */
  private static detectFormat(data: string): string {
    try {
      const trimmed = data.trim();

      // Check for URI format
      if (trimmed.startsWith('otpauth://')) {
        return 'google';
      }

      // Try to parse as JSON
      const parsed = JSON.parse(trimmed);

      // Check for specific format markers
      if (parsed.version && parsed.accounts) {
        return '2fas';
      }
      if (parsed.db?.entries) {
        return 'aegis';
      }
      if (Array.isArray(parsed) && parsed[0]?.secret) {
        return 'andotp';
      }

      // Default to plain text
      return 'plain';
    } catch {
      // If not JSON, assume plain text
      return 'plain';
    }
  }

  /**
   * Download data as file
   */
  static downloadFile(data: string, filename: string, mimeType: string = 'application/json') {
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Read file as text
   */
  static async readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (_e) => resolve(e.target?.result as string);
      reader.onerror = (_e) => reject(_e);
      reader.readAsText(file);
    });
  }
}