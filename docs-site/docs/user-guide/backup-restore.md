---
sidebar_position: 3
---

# Backup and Restore

Protect your 2FA accounts with secure backups and learn how to restore them when needed.

## Overview

2FA Studio provides multiple backup options to ensure you never lose access to your accounts:
- **Cloud Sync**: Automatic synchronization across devices
- **Google Drive Backup**: Encrypted backups stored in your Google Drive
- **Local Export**: Manual export to encrypted file

## Cloud Sync

### Enable Cloud Sync

1. Open 2FA Studio
2. Go to **Settings** > **Sync & Backup**
3. Toggle **Enable Cloud Sync**
4. Sign in with your account if prompted

### How Cloud Sync Works

- **Automatic**: Changes sync instantly across all devices
- **Encrypted**: All data is encrypted before leaving your device
- **Selective**: Choose which accounts to sync
- **Conflict Resolution**: Smart merging of changes from multiple devices

### Managing Synced Devices

1. Go to **Settings** > **Devices**
2. View all connected devices
3. Remove old or unauthorized devices
4. Set device-specific permissions

## Google Drive Backup

### Setting Up Google Drive Backup

1. Navigate to **Settings** > **Backup**
2. Tap **Connect Google Drive**
3. Sign in with your Google account
4. Grant necessary permissions
5. Choose backup frequency:
   - **Manual**: Backup on demand
   - **Daily**: Automatic daily backup
   - **Weekly**: Automatic weekly backup

### Creating a Backup

#### Automatic Backup
```
Settings > Backup > Automatic Backup > Enable
```

#### Manual Backup
1. Go to **Settings** > **Backup**
2. Tap **Backup Now**
3. Enter your master password
4. Wait for backup completion

### Backup Contents

Each backup includes:
- All 2FA account details
- Custom icons and categories
- Account settings and preferences
- Backup codes (if stored)

**Not included:**
- App settings
- Biometric data
- Device-specific configurations

## Local Export

### Exporting Your Data

1. Go to **Settings** > **Export**
2. Choose export format:
   - **Encrypted JSON**: Secure, importable format
   - **QR Codes**: Visual backup (less secure)
   - **Plain Text**: Unencrypted (use with caution)

3. Set encryption password (for encrypted formats)
4. Choose save location
5. Confirm export

### Export File Structure

```json
{
  "version": "1.0",
  "exported": "2024-01-15T10:30:00Z",
  "encryption": "AES-256-GCM",
  "accounts": [
    {
      "id": "unique-id",
      "issuer": "Google",
      "account": "user@example.com",
      "encrypted_secret": "...",
      "algorithm": "SHA1",
      "digits": 6,
      "period": 30
    }
  ]
}
```

## Restoring from Backup

### From Google Drive

1. Fresh install or go to **Settings** > **Restore**
2. Tap **Restore from Google Drive**
3. Sign in with the same Google account
4. Select backup to restore
5. Enter backup password
6. Confirm restoration

### From Local File

1. Go to **Settings** > **Import**
2. Tap **Import from File**
3. Select your backup file
4. Enter encryption password
5. Review accounts to import
6. Confirm import

### From Another Device

1. On new device: **Settings** > **Transfer**
2. Select **Receive from Another Device**
3. On old device: **Settings** > **Transfer**
4. Select **Send to Another Device**
5. Scan QR code or enter pairing code
6. Confirm transfer

## Backup Security

### Encryption Details

- **Algorithm**: AES-256-GCM
- **Key Derivation**: PBKDF2 with 100,000 iterations
- **Salt**: Unique per backup
- **Authentication**: HMAC-SHA256

### Best Practices

1. **Use Strong Passwords**
   - Minimum 12 characters
   - Mix of letters, numbers, symbols
   - Unique to your backups

2. **Regular Backups**
   - Enable automatic backups
   - Test restore process periodically
   - Keep multiple backup versions

3. **Secure Storage**
   - Use 2FA on your Google account
   - Store local backups securely
   - Never share backup files

## Troubleshooting Backup Issues

### Backup Fails

**Problem**: Backup process fails or times out

**Solutions**:
1. Check internet connection
2. Ensure sufficient Google Drive storage
3. Update app to latest version
4. Clear app cache and retry
5. Check Google account permissions

### Cannot Restore

**Problem**: Unable to restore from backup

**Solutions**:
1. Verify backup password is correct
2. Ensure backup file isn't corrupted
3. Check file format compatibility
4. Try restoring fewer accounts at once
5. Contact support with backup details

### Sync Conflicts

**Problem**: Different data on multiple devices

**Resolution**:
1. Check last sync time on each device
2. Choose master device with correct data
3. Force sync from master device
4. Verify all devices show same data

## Advanced Backup Options

### Scheduled Backups

```javascript
// Example backup schedule configuration
{
  "backup_schedule": {
    "enabled": true,
    "frequency": "daily",
    "time": "02:00",
    "retention": 30, // days
    "wifi_only": true
  }
}
```

### Selective Backup

1. Go to **Settings** > **Backup** > **Select Accounts**
2. Toggle accounts to include/exclude
3. Create account groups for easy selection
4. Save backup profile

### Backup Verification

1. After backup, tap **Verify Backup**
2. System performs integrity check
3. Confirms all accounts are included
4. Tests encryption/decryption

## Migration Guide

### From Other 2FA Apps

#### Google Authenticator
1. In Google Authenticator: **Transfer accounts**
2. In 2FA Studio: **Import** > **From QR Code**
3. Scan all QR codes
4. Verify all accounts work

#### Authy
1. Export from Authy (if supported)
2. Use 2FA Studio import tool
3. Manual entry if export unavailable
4. Test each account

#### Microsoft Authenticator
1. No direct export available
2. Add accounts manually to 2FA Studio
3. Keep both apps until migration complete
4. Remove from old app after verification

### Best Migration Practices

1. **Don't Delete Old App**: Keep until fully migrated
2. **Test Each Account**: Verify codes work
3. **Update Recovery**: Add 2FA Studio to account recovery
4. **Document Process**: Note any issues or special steps

## Recovery Scenarios

### Lost Phone

1. Install 2FA Studio on new device
2. Sign in with your account
3. Restore from Google Drive or cloud sync
4. Verify all accounts are restored
5. Remove lost device from account

### Forgotten Password

1. Use biometric unlock if available
2. Restore from unencrypted backup (if any)
3. Contact support for account recovery
4. Re-add accounts manually if needed

### Corrupted Data

1. Clear app data/cache
2. Reinstall application
3. Restore from most recent backup
4. Report issue to support team

## Backup Compliance

### GDPR Compliance

- Export all data: **Settings** > **Privacy** > **Export My Data**
- Delete all backups: **Settings** > **Privacy** > **Delete All Data**
- Backup retention policies honored
- Full data portability supported

### Enterprise Backup

For business accounts:
1. Centralized backup management
2. Admin-controlled backup policies
3. Compliance reporting
4. Audit trails for all backup operations

## Quick Reference

| Backup Type | Frequency | Encryption | Storage | Best For |
|------------|-----------|------------|---------|----------|
| Cloud Sync | Real-time | Yes | Cloud | Multiple devices |
| Google Drive | Daily/Weekly | Yes | Google | Long-term backup |
| Local Export | Manual | Optional | Local | Offline backup |
| Device Transfer | One-time | Yes | Direct | Device migration |

## Need Help?

- **Email**: support@2fastudio.app
- **Help Center**: help.2fastudio.app
- **Community**: r/2FAStudio
- **Emergency**: backup-recovery@2fastudio.app