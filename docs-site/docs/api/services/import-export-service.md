---
sidebar_position: 5
---

# ImportExportService

Service for importing and exporting 2FA accounts in various formats with encryption support.

## Overview

The `ImportExportService` handles data portability, allowing users to import accounts from other 2FA apps and export their accounts for backup or migration purposes.

```typescript
import { ImportExportService } from '@/services/importExport.service';
```

## Methods

### exportAccounts

Exports accounts in the specified format.

```typescript
static async exportAccounts(
  accounts: OTPAccount[],
  format: ExportFormat,
  options?: ExportOptions
): Promise<ExportResult>
```

**Parameters:**
- `accounts` - Array of accounts to export
- `format` - Export format: 'json' | 'csv' | 'encrypted' | 'qr'
- `options` - Optional export configuration

**Returns:**
- `ExportResult` with data and metadata

**Example:**
```typescript
// Export as encrypted JSON
const result = await ImportExportService.exportAccounts(
  accounts,
  'encrypted',
  { password: 'export-password' }
);

// Export as CSV
const csvResult = await ImportExportService.exportAccounts(
  accounts,
  'csv'
);
```

### importAccounts

Imports accounts from various formats.

```typescript
static async importAccounts(
  data: string | File,
  format: ImportFormat,
  options?: ImportOptions
): Promise<ImportResult>
```

**Parameters:**
- `data` - Import data (string or file)
- `format` - Import format: 'json' | 'csv' | 'encrypted' | '2fas' | 'aegis' | 'googleauth'
- `options` - Import options (e.g., decryption password)

**Returns:**
- `ImportResult` with imported accounts and statistics

**Example:**
```typescript
// Import from encrypted backup
const result = await ImportExportService.importAccounts(
  encryptedData,
  'encrypted',
  { password: 'import-password' }
);

console.log(`Imported ${result.imported} accounts`);
```

### detectFormat

Auto-detects the format of import data.

```typescript
static detectFormat(data: string): ImportFormat | null
```

**Parameters:**
- `data` - Import data to analyze

**Returns:**
- Detected format or null if unknown

**Example:**
```typescript
const format = ImportExportService.detectFormat(importData);
if (format) {
  console.log(`Detected format: ${format}`);
}
```

### generateQRCodes

Generates QR codes for account export.

```typescript
static async generateQRCodes(
  accounts: OTPAccount[],
  options?: QRCodeOptions
): Promise<QRCodeData[]>
```

**Parameters:**
- `accounts` - Accounts to generate QR codes for
- `options` - QR code generation options

**Returns:**
- Array of QR code data URLs

**Example:**
```typescript
const qrCodes = await ImportExportService.generateQRCodes(accounts, {
  size: 256,
  errorCorrectionLevel: 'M'
});
```

### validateImportData

Validates import data before processing.

```typescript
static validateImportData(
  data: string,
  format: ImportFormat
): ValidationResult
```

**Parameters:**
- `data` - Data to validate
- `format` - Expected format

**Returns:**
- Validation result with errors/warnings

### convertFormat

Converts between different 2FA app formats.

```typescript
static convertFormat(
  data: string,
  fromFormat: ImportFormat,
  toFormat: ExportFormat
): Promise<string>
```

**Parameters:**
- `data` - Source data
- `fromFormat` - Source format
- `toFormat` - Target format

**Returns:**
- Converted data string

## Supported Formats

### Export Formats

#### JSON (Plain)
```json
{
  "version": "1.0",
  "accounts": [
    {
      "issuer": "GitHub",
      "label": "user@example.com",
      "secret": "JBSWY3DPEHPK3PXP",
      "type": "totp",
      "algorithm": "SHA1",
      "digits": 6,
      "period": 30
    }
  ]
}
```

#### CSV
```csv
issuer,label,secret,type,algorithm,digits,period
GitHub,user@example.com,JBSWY3DPEHPK3PXP,totp,SHA1,6,30
```

#### Encrypted JSON
```json
{
  "version": "1.0",
  "encrypted": true,
  "data": "encrypted-base64-content",
  "salt": "base64-salt",
  "iv": "base64-iv"
}
```

### Import Formats

- **2FAS Auth**: JSON format with specific schema
- **Aegis Authenticator**: JSON with encryption support
- **Google Authenticator**: QR code or transfer format
- **andOTP**: Encrypted JSON format
- **Authenticator Plus**: CSV format

## Types

### ExportFormat
```typescript
type ExportFormat = 'json' | 'csv' | 'encrypted' | 'qr';
```

### ImportFormat
```typescript
type ImportFormat = 'json' | 'csv' | 'encrypted' | '2fas' | 'aegis' | 'googleauth' | 'andotp' | 'authplus';
```

### ExportOptions
```typescript
interface ExportOptions {
  password?: string;          // For encrypted export
  includeBackupCodes?: boolean;
  includeNotes?: boolean;
  includeTags?: boolean;
  dateFormat?: string;
}
```

### ImportOptions
```typescript
interface ImportOptions {
  password?: string;          // For encrypted imports
  skipDuplicates?: boolean;
  mergeStrategy?: 'skip' | 'overwrite' | 'rename';
  tagPrefix?: string;         // Add prefix to imported tags
}
```

### ExportResult
```typescript
interface ExportResult {
  data: string;              // Export data
  format: ExportFormat;
  mimeType: string;
  filename: string;
  size: number;
  accountCount: number;
}
```

### ImportResult
```typescript
interface ImportResult {
  accounts: OTPAccount[];    // Successfully imported accounts
  imported: number;          // Count of imported accounts
  skipped: number;          // Count of skipped (duplicates)
  failed: number;           // Count of failed imports
  errors: ImportError[];    // Detailed error information
}
```

## Usage Examples

### Complete Export Flow

```typescript
async function exportToFile() {
  try {
    // Let user choose format
    const format = await showExportDialog();
    
    // Get export options
    const options: ExportOptions = {
      includeBackupCodes: true,
      includeTags: true
    };
    
    if (format === 'encrypted') {
      options.password = await promptPassword();
    }
    
    // Export accounts
    const result = await ImportExportService.exportAccounts(
      selectedAccounts,
      format,
      options
    );
    
    // Download file
    const blob = new Blob([result.data], { type: result.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.filename;
    a.click();
    
    showToast(`Exported ${result.accountCount} accounts`);
    
  } catch (error) {
    showToast('Export failed');
  }
}
```

### Complete Import Flow

```typescript
async function importFromFile(file: File) {
  try {
    // Read file
    const data = await file.text();
    
    // Detect format
    let format = ImportExportService.detectFormat(data);
    if (!format) {
      format = await promptFormatSelection();
    }
    
    // Validate data
    const validation = ImportExportService.validateImportData(data, format);
    if (!validation.isValid) {
      showErrors(validation.errors);
      return;
    }
    
    // Get import options
    const options: ImportOptions = {
      skipDuplicates: true,
      mergeStrategy: 'skip'
    };
    
    if (format === 'encrypted') {
      options.password = await promptPassword();
    }
    
    // Import accounts
    const result = await ImportExportService.importAccounts(
      data,
      format,
      options
    );
    
    // Show results
    showImportSummary({
      imported: result.imported,
      skipped: result.skipped,
      failed: result.failed,
      errors: result.errors
    });
    
    // Add imported accounts
    for (const account of result.accounts) {
      await addAccount(account);
    }
    
  } catch (error) {
    showToast('Import failed');
  }
}
```

### QR Code Export

```typescript
async function exportAsQRCodes() {
  const qrCodes = await ImportExportService.generateQRCodes(
    selectedAccounts,
    {
      size: 300,
      margin: 4,
      errorCorrectionLevel: 'H'
    }
  );
  
  // Display QR codes in modal
  qrCodes.forEach((qr, index) => {
    const img = document.createElement('img');
    img.src = qr.dataUrl;
    img.alt = `Account ${index + 1}`;
    qrContainer.appendChild(img);
  });
}
```

## Security Considerations

1. **Encrypted Exports**: Use strong passwords for encrypted exports
2. **Plain Text Warning**: Warn users about security risks of unencrypted exports
3. **Import Validation**: Thoroughly validate imported data to prevent injection
4. **Secure Deletion**: Clear sensitive data from memory after use
5. **Format Detection**: Be cautious with auto-detection to prevent malicious imports

## Error Handling

```typescript
try {
  const result = await ImportExportService.importAccounts(data, format);
  
  if (result.errors.length > 0) {
    // Handle partial import
    console.warn('Some accounts failed to import:', result.errors);
  }
  
} catch (error) {
  if (error.code === 'INVALID_PASSWORD') {
    showToast('Incorrect password');
  } else if (error.code === 'UNSUPPORTED_FORMAT') {
    showToast('This file format is not supported');
  } else if (error.code === 'CORRUPTED_DATA') {
    showToast('The import file appears to be corrupted');
  }
}
```