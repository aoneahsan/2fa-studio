---
sidebar_position: 4
---

# GoogleDriveService

Service for managing encrypted backups to Google Drive with zero-knowledge architecture.

## Overview

The `GoogleDriveService` handles backup and restore operations with Google Drive, ensuring all data is encrypted client-side before upload. It uses the Google Drive API v3 with app-specific folder access.

```typescript
import { GoogleDriveService } from '@/services/googleDrive.service';
```

## Methods

### initialize

Initializes the Google Drive API client.

```typescript
static async initialize(accessToken: string): Promise<void>
```

**Parameters:**
- `accessToken` - Google OAuth access token with Drive scope

**Example:**
```typescript
// Get token from Google Sign-In
const token = await getGoogleAccessToken();
await GoogleDriveService.initialize(token);
```

### createBackup

Creates an encrypted backup of all accounts in Google Drive.

```typescript
static async createBackup(accounts: OTPAccount[], encryptionKey: string): Promise<BackupMetadata>
```

**Parameters:**
- `accounts` - Array of OTP accounts to backup
- `encryptionKey` - Master key for encryption

**Returns:**
- `BackupMetadata` object containing:
  - `id` (string) - Google Drive file ID
  - `name` (string) - Backup file name
  - `createdAt` (Date) - Creation timestamp
  - `size` (number) - File size in bytes
  - `checksum` (string) - SHA-256 hash of encrypted data

**Example:**
```typescript
const metadata = await GoogleDriveService.createBackup(
  accounts,
  userEncryptionKey
);
console.log(`Backup created: ${metadata.name}`);
```

**Process:**
1. Serialize accounts to JSON
2. Encrypt using AES-256-GCM
3. Create metadata with version info
4. Upload to app-specific folder
5. Return file metadata

### listBackups

Lists all available backups from Google Drive.

```typescript
static async listBackups(): Promise<BackupFile[]>
```

**Returns:**
- Array of `BackupFile` objects, sorted by date (newest first)

**Example:**
```typescript
const backups = await GoogleDriveService.listBackups();
backups.forEach(backup => {
  console.log(`${backup.name} - ${backup.createdAt}`);
});
```

### restoreBackup

Restores accounts from an encrypted backup.

```typescript
static async restoreBackup(fileId: string, encryptionKey: string): Promise<OTPAccount[]>
```

**Parameters:**
- `fileId` - Google Drive file ID of the backup
- `encryptionKey` - Master key for decryption

**Returns:**
- Array of decrypted OTP accounts

**Throws:**
- Error if decryption fails (wrong key or corrupted data)

**Example:**
```typescript
try {
  const accounts = await GoogleDriveService.restoreBackup(
    backupId,
    userEncryptionKey
  );
  console.log(`Restored ${accounts.length} accounts`);
} catch (error) {
  console.error('Invalid encryption key');
}
```

### deleteBackup

Deletes a backup from Google Drive.

```typescript
static async deleteBackup(fileId: string): Promise<void>
```

**Parameters:**
- `fileId` - Google Drive file ID to delete

**Example:**
```typescript
await GoogleDriveService.deleteBackup(oldBackupId);
```

### getBackupMetadata

Retrieves detailed metadata for a specific backup.

```typescript
static async getBackupMetadata(fileId: string): Promise<BackupMetadata>
```

**Parameters:**
- `fileId` - Google Drive file ID

**Returns:**
- Detailed backup metadata including version and encryption info

### verifyBackupIntegrity

Verifies backup file integrity using checksums.

```typescript
static async verifyBackupIntegrity(fileId: string): Promise<boolean>
```

**Parameters:**
- `fileId` - Google Drive file ID to verify

**Returns:**
- `boolean` - True if backup is intact

**Example:**
```typescript
const isValid = await GoogleDriveService.verifyBackupIntegrity(backupId);
if (!isValid) {
  console.warn('Backup may be corrupted');
}
```

## Types

### BackupFile

```typescript
interface BackupFile {
  id: string;
  name: string;
  createdAt: Date;
  modifiedAt: Date;
  size: number;
  mimeType: string;
}
```

### BackupMetadata

```typescript
interface BackupMetadata {
  id: string;
  name: string;
  version: string;
  createdAt: Date;
  accountCount: number;
  size: number;
  checksum: string;
  encryptionMethod: string;
  appVersion: string;
}
```

### BackupData

```typescript
interface BackupData {
  version: string;
  createdAt: string;
  accounts: OTPAccount[];
  metadata: {
    deviceName: string;
    appVersion: string;
    accountCount: number;
  };
}
```

## Backup Format

Backups are stored as encrypted JSON files with the following structure:

```json
{
  "version": "1.0",
  "encrypted": true,
  "encryptionMethod": "AES-256-GCM",
  "data": "base64-encrypted-content",
  "salt": "base64-salt",
  "iv": "base64-iv",
  "checksum": "sha256-hash"
}
```

## Security Features

### Zero-Knowledge Encryption
- All data encrypted client-side before upload
- Google never has access to encryption keys
- Keys derived from user's master password

### Backup Integrity
- SHA-256 checksums for verification
- Version tracking for compatibility
- Metadata validation before restore

### Access Control
- App-specific folder isolation
- OAuth scope limitations
- No access to user's general Drive files

## Error Handling

Common errors and their handling:

```typescript
try {
  await GoogleDriveService.createBackup(accounts, key);
} catch (error) {
  if (error.code === 401) {
    // Token expired - re-authenticate
    await refreshGoogleToken();
  } else if (error.code === 403) {
    // No Drive permission
    console.error('Drive access not granted');
  } else if (error.code === 507) {
    // Storage quota exceeded
    console.error('Google Drive storage full');
  }
}
```

## Usage Example

```typescript
// Complete backup flow
async function performBackup() {
  try {
    // Initialize with user's Google token
    const token = await getGoogleAccessToken();
    await GoogleDriveService.initialize(token);
    
    // Get current accounts
    const accounts = await getAccounts();
    
    // Create encrypted backup
    const metadata = await GoogleDriveService.createBackup(
      accounts,
      userEncryptionKey
    );
    
    // Update UI
    showToast(`Backup created: ${metadata.name}`);
    
    // Update last backup time
    await updateUserProfile({
      lastBackup: metadata.createdAt
    });
    
  } catch (error) {
    console.error('Backup failed:', error);
    showToast('Backup failed. Please try again.');
  }
}

// Complete restore flow
async function performRestore(backupId: string) {
  try {
    // Verify backup integrity first
    const isValid = await GoogleDriveService.verifyBackupIntegrity(backupId);
    if (!isValid) {
      throw new Error('Backup file is corrupted');
    }
    
    // Restore accounts
    const restoredAccounts = await GoogleDriveService.restoreBackup(
      backupId,
      userEncryptionKey
    );
    
    // Merge with existing accounts (avoid duplicates)
    await mergeAccounts(restoredAccounts);
    
    showToast(`Restored ${restoredAccounts.length} accounts`);
    
  } catch (error) {
    if (error.message.includes('decrypt')) {
      showToast('Invalid encryption key');
    } else {
      showToast('Restore failed');
    }
  }
}
```

## Best Practices

1. **Regular Backups**: Implement automatic daily/weekly backups
2. **Version Management**: Keep last 3-5 backups, delete older ones
3. **Error Recovery**: Implement retry logic for network failures
4. **Progress Indication**: Show upload/download progress for large backups
5. **Offline Queue**: Queue backup operations when offline

## Performance Considerations

- Compress large backups before encryption
- Use chunked uploads for better reliability
- Cache backup list for quick access
- Implement incremental backups for large datasets