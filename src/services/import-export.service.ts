/**
 * Import/Export Service
 * Handles importing and exporting 2FA accounts
 * @module services/import-export
 */

import { UnifiedErrorHandling } from 'unified-error-handling';
import { OTPAccount } from './otp.service';
import { EncryptionService } from './encryption.service';

export interface ExportFormat {
  version: string;
  exportedAt: string;
  accounts: OTPAccount[];
  encrypted: boolean;
}

export class ImportExportService {
  private static readonly EXPORT_VERSION = '1.0.0';

  /**
   * Export accounts to JSON
   */
  static async exportToJSON(
    accounts: OTPAccount[],
    options?: {
      encrypt?: boolean;
      password?: string;
    }
  ): Promise<string> {
    return UnifiedErrorHandling.withTryCatch(
      async () => {
        const exportData: ExportFormat = {
          version: this.EXPORT_VERSION,
          exportedAt: new Date().toISOString(),
          accounts: accounts.map(account => ({
            ...account,
            id: undefined // Remove IDs for clean export
          })) as OTPAccount[],
          encrypted: options?.encrypt || false
        };

        let jsonString = JSON.stringify(exportData, null, 2);

        if (options?.encrypt && options?.password) {
          const encrypted = await EncryptionService.encryptWithPassword(
            jsonString,
            options.password
          );
          jsonString = JSON.stringify({
            encrypted: true,
            data: encrypted.data,
            salt: encrypted.salt,
            iv: encrypted.iv
          });
        }

        return jsonString;
      },
      {
        operation: 'ImportExportService.exportToJSON',
        metadata: { accountCount: accounts.length, encrypted: options?.encrypt }
      }
    );
  }

  /**
   * Export to CSV
   */
  static exportToCSV(accounts: OTPAccount[]): string {
    const headers = [
      'Issuer',
      'Label',
      'Secret',
      'Type',
      'Algorithm',
      'Digits',
      'Period',
      'Counter'
    ];

    const rows = accounts.map(account => [
      account.issuer,
      account.label,
      account.secret,
      account.type,
      account.algorithm,
      account.digits.toString(),
      account.period?.toString() || '',
      account.counter?.toString() || ''
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csv;
  }

  /**
   * Import from JSON
   */
  static async importFromJSON(
    jsonString: string,
    password?: string
  ): Promise<OTPAccount[]> {
    return UnifiedErrorHandling.withTryCatch(
      async () => {
        let data: any;

        try {
          data = JSON.parse(jsonString);
        } catch {
          throw new Error('Invalid JSON format');
        }

        // Check if encrypted
        if (data.encrypted && data.data) {
          if (!password) {
            throw new Error('Password required for encrypted file');
          }

          const decrypted = await EncryptionService.decryptWithPassword(
            data.data,
            password,
            {
              salt: data.salt,
              iv: data.iv
            }
          );

          data = JSON.parse(decrypted);
        }

        // Validate format
        if (!data.version || !data.accounts || !Array.isArray(data.accounts)) {
          throw new Error('Invalid export format');
        }

        // Generate new IDs for imported accounts
        const accounts = data.accounts.map((account: any) => ({
          ...account,
          id: `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }));

        return accounts;
      },
      {
        operation: 'ImportExportService.importFromJSON',
        metadata: { hasPassword: !!password }
      }
    );
  }

  /**
   * Download file
   */
  static downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}