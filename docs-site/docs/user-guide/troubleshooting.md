---
sidebar_position: 5
---

# Troubleshooting

Find solutions to common issues and get answers to frequently asked questions about 2FA Studio.

## Common Issues

### App Issues

#### App Won't Open

**Symptoms:**
- App crashes on startup
- Stuck on splash screen
- Black/white screen

**Solutions:**
1. **Force close and restart**:
   - iOS: Swipe up and remove app from recents
   - Android: Settings > Apps > 2FA Studio > Force Stop

2. **Clear app cache** (Android):
   ```
   Settings > Apps > 2FA Studio > Storage > Clear Cache
   ```

3. **Reinstall app**:
   - Backup your data first
   - Uninstall app
   - Restart device
   - Install from app store

4. **Check device compatibility**:
   - iOS 13.0+ required
   - Android 7.0+ required
   - 100MB free storage

#### App is Slow/Laggy

**Solutions:**
1. Update to latest version
2. Reduce number of accounts (archive unused)
3. Clear app cache
4. Disable animations in settings
5. Close other apps
6. Restart device

### Authentication Issues

#### Can't Unlock App

**Biometric Failure:**
1. Try master password instead
2. Clean sensor (fingerprint)
3. Re-register biometrics
4. Update OS to latest version

**Forgotten Master Password:**
1. No direct recovery possible (security feature)
2. If you have backup:
   - Reinstall app
   - Restore from backup
   - Set new master password
3. Without backup:
   - Must manually re-add all accounts
   - Contact support for guidance

#### Biometric Not Working

**Solutions:**
1. **Check permissions**:
   ```
   Settings > Apps > 2FA Studio > Permissions > Biometric
   ```

2. **Re-enable biometric**:
   - Disable biometric in app
   - Re-enable and register again

3. **System issues**:
   - Update device OS
   - Check if biometric works in other apps
   - Reset biometric data in system settings

### Code Generation Issues

#### Codes Not Working

**Common causes and solutions:**

1. **Time sync issue** (Most common):
   ```
   Settings > Time Sync > Sync Now
   ```
   Or manually:
   - Enable automatic time on device
   - Restart device
   - Verify correct timezone

2. **Wrong account**:
   - Verify you're using correct service
   - Check account name matches
   - Try alternate account if multiple

3. **Wrong algorithm**:
   - Check if service uses non-standard settings
   - Verify: Algorithm (SHA1/SHA256/SHA512)
   - Verify: Digits (6/8)
   - Verify: Period (30/60 seconds)

4. **Account migration**:
   - Service may have reset 2FA
   - Re-scan QR code
   - Contact service support

#### Codes Changing Too Fast/Slow

**Solutions:**
1. Check code period setting (default 30 seconds)
2. Verify time sync is accurate
3. Some services use 60-second periods
4. Enable "Show Next Code" option

#### Can't Scan QR Code

**Camera issues:**
1. Grant camera permission
2. Clean camera lens
3. Improve lighting
4. Hold steady, let autofocus work

**QR code issues:**
1. Increase screen brightness (if scanning screen)
2. Reduce screen glare
3. Try manual entry instead
4. Take screenshot and import

**Manual entry option:**
```
Add Account > Enter Manually > 
- Service: [Name]
- Account: [Your username]
- Secret: [32-character code]
```

### Sync and Backup Issues

#### Sync Not Working

**Check these first:**
1. Internet connection active
2. Signed into same account on all devices
3. Sync enabled in settings
4. No sync conflicts

**Troubleshooting steps:**

1. **Force sync**:
   ```
   Settings > Sync > Force Sync Now
   ```

2. **Check sync status**:
   - Look for sync indicator
   - Check last sync time
   - View sync log for errors

3. **Reset sync**:
   - Sign out on all devices
   - Sign in on primary device first
   - Wait for sync to complete
   - Sign in on other devices

#### Backup Fails

**Google Drive backup issues:**

1. **Storage full**:
   - Check Google Drive storage
   - Free up space or upgrade
   - Try smaller incremental backup

2. **Permission denied**:
   - Reconnect Google account
   - Check app permissions in Google account
   - Revoke and re-grant access

3. **Network timeout**:
   - Use WiFi instead of cellular
   - Try at different time
   - Check firewall/VPN settings

**Local backup issues:**
1. Insufficient device storage
2. File system permissions
3. Backup password too weak
4. Special characters in password

#### Can't Restore Backup

**Common issues:**

1. **Wrong password**:
   - Password is case-sensitive
   - Check for extra spaces
   - Try without special characters
   - Remember: backup password ≠ master password

2. **Corrupted file**:
   - Try older backup
   - Use backup verification tool
   - Check file size (shouldn't be 0KB)
   - Contact support with file details

3. **Version mismatch**:
   - Update app to latest version
   - Check backup format compatibility
   - Try import instead of restore

### Browser Extension Issues

#### Extension Not Working

**Installation problems:**
1. Verify installed from official Chrome Web Store
2. Check Chrome version (88+ required)
3. Enable developer mode if needed
4. Restart Chrome after installation

**Connection issues:**
1. Extension and app must be on same network
2. Both must be signed into same account
3. Check firewall settings
4. Disable VPN temporarily

#### Can't Auto-fill Codes

**Solutions:**
1. **Check permissions**:
   - Right-click extension icon
   - Manage extension > Site access
   - Allow on specific sites

2. **Verify domain match**:
   - Domain must exactly match
   - Add both www and non-www versions
   - Check for typos

3. **Manual approval**:
   - Enable "Require approval" in settings
   - Approve each request from mobile app

### Account Management Issues

#### Can't Delete Account

**Possible reasons:**
1. Account is locked
2. Sync in progress
3. Account in use (generating code)

**Solutions:**
1. Wait 30 seconds and try again
2. Disable sync temporarily
3. Force close and reopen app
4. Long-press for force delete option

#### Duplicate Accounts

**To fix:**
1. Identify which is correct (test codes)
2. Note any differences
3. Delete duplicates one by one
4. Enable "Prevent duplicates" in settings

#### Lost Account Icons

**Solutions:**
1. Pull down to refresh
2. Re-sync from cloud
3. Manually update icon:
   ```
   Edit Account > Icon > Search or Browse
   ```
4. Clear icon cache in settings

## Performance Optimization

### Reduce Battery Usage

1. **Disable unnecessary features**:
   - Background sync
   - Automatic backups
   - Animations
   - Widgets

2. **Optimize sync frequency**:
   - Change from real-time to hourly
   - Sync only on WiFi
   - Manual sync only

3. **Reduce account count**:
   - Archive unused accounts
   - Delete old accounts
   - Use folders to organize

### Improve App Speed

1. **Regular maintenance**:
   - Clear cache monthly
   - Archive old accounts
   - Delete unused backups
   - Optimize database

2. **Settings optimization**:
   ```
   Settings > Performance >
   - Disable animations
   - Reduce image quality
   - Enable lite mode
   - Limit recent items
   ```

## Data and Privacy Issues

### Export Not Working

**Solutions:**
1. Check storage permission
2. Ensure sufficient space
3. Try different export format
4. Disable encryption temporarily
5. Export fewer accounts at once

### Can't Delete All Data

**Proper deletion process:**
1. Export data first (backup)
2. Sign out of all devices
3. Go to Settings > Privacy
4. Select "Delete All Data"
5. Enter master password
6. Confirm deletion
7. Uninstall app

### Privacy Mode Issues

**If privacy mode not working:**
1. Update to latest version
2. Check system permissions
3. Enable in both app and system settings
4. Restart app after enabling

## Platform-Specific Issues

### iOS Specific

#### Widget Not Updating
1. Remove and re-add widget
2. Check widget permissions
3. Ensure app is not in low power mode
4. Update to latest iOS version

#### Siri Shortcuts Failed
1. Re-record shortcut
2. Check Siri permissions
3. Ensure account names are unique
4. Try simpler voice commands

### Android Specific

#### Can't Install APK
1. Enable "Unknown sources"
2. Check APK signature
3. Ensure sufficient storage
4. Download from official source only

#### Autofill Service Issues
1. Enable in system settings:
   ```
   Settings > System > Languages & input > 
   Autofill service > 2FA Studio
   ```
2. Grant necessary permissions
3. Restart device
4. Check Android version (8.0+ required)

## Error Messages

### Common Error Codes

#### Error 1001: Network Timeout
- Check internet connection
- Disable VPN/proxy
- Try cellular instead of WiFi
- Wait and retry

#### Error 2001: Sync Conflict
- Choose "Keep Local" or "Keep Remote"
- Review changes before deciding
- Force sync after resolution
- Check all devices are updated

#### Error 3001: Encryption Failed
- Check device storage
- Verify password complexity
- Clear app cache
- Update app version

#### Error 4001: Backup Corrupted
- Try older backup
- Use verification tool
- Export and reimport
- Contact support

## Getting Help

### Before Contacting Support

1. **Try basic troubleshooting**:
   - Restart app
   - Update to latest version
   - Check internet connection
   - Review this guide

2. **Gather information**:
   - App version number
   - Device model and OS version
   - Error messages (screenshots)
   - Steps to reproduce issue

3. **Check resources**:
   - FAQ section
   - Community forum
   - Video tutorials
   - Knowledge base

### Contact Support

**Email Support**: support@2fastudio.app
- Response time: 24-48 hours
- Include all relevant details
- Attach screenshots if helpful

**Priority Support** (Premium):
- Live chat: 9 AM - 6 PM EST
- Response time: 2-4 hours
- Phone support available

**Community Support**:
- Reddit: r/2FAStudio
- Discord: discord.gg/2fastudio
- Twitter: @2FAStudio

## Frequently Asked Questions

### General Questions

**Q: Is 2FA Studio secure?**
A: Yes, we use industry-standard AES-256 encryption, zero-knowledge architecture, and never have access to your unencrypted data.

**Q: Can I use 2FA Studio offline?**
A: Yes, codes are generated locally and work offline. Only sync and backup require internet.

**Q: What happens if I lose my phone?**
A: Restore from backup on new device, or use backup codes stored separately. Always maintain current backups.

**Q: Can I use on multiple devices?**
A: Yes, unlimited devices with premium. Free tier allows 2 devices.

### Technical Questions

**Q: Why do codes not work sometimes?**
A: Usually due to time sync issues. Enable automatic time on your device and sync in app settings.

**Q: What's the difference from Google Authenticator?**
A: Cloud backup, sync, browser extension, better organization, premium features, and enhanced security.

**Q: Does it work with all services?**
A: Works with any service supporting TOTP/HOTP standards (99% of services).

**Q: Can I migrate from another app?**
A: Yes, we support import from most major 2FA apps via QR codes or manual entry.

### Security Questions

**Q: Can you see my codes?**
A: No, we use zero-knowledge encryption. Only you can decrypt your data.

**Q: What if 2FA Studio shuts down?**
A: Export your data anytime. Standard format works with other apps. Local functionality continues working.

**Q: Is biometric data stored?**
A: No, biometric authentication is handled by your device OS. We never store biometric data.

**Q: How secure are backups?**
A: Backups are encrypted with AES-256 before leaving your device. Even we cannot read them.

### Account Questions

**Q: Can I share accounts?**
A: No, sharing 2FA codes compromises security. Each person should have their own 2FA setup.

**Q: How many accounts can I add?**
A: Free: 10 accounts. Premium: Unlimited accounts.

**Q: Can I organize accounts?**
A: Yes, use folders, tags, custom icons, and search to organize any number of accounts.

**Q: What about business use?**
A: We offer 2FA Studio Business with centralized management, policies, and compliance features.