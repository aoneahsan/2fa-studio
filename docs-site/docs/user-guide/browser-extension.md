---
sidebar_position: 6
---

# Browser Extension Guide

Learn how to install, configure, and use the 2FA Studio Chrome extension for seamless two-factor authentication in your browser.

## Overview

The 2FA Studio browser extension provides:
- **Quick Access**: View codes without opening mobile app
- **Auto-fill**: Automatically fill 2FA codes on websites
- **Secure Sync**: Real-time sync with your mobile app
- **Privacy**: All data encrypted end-to-end

## Installation

### Requirements

- **Browser**: Chrome 88+ (or Chromium-based browsers)
- **Mobile App**: 2FA Studio installed and configured
- **Account**: Same account on both extension and app
- **Network**: Both devices on same network (for pairing)

### Install from Chrome Web Store

1. Open Chrome browser
2. Visit [Chrome Web Store - 2FA Studio](https://chrome.google.com/webstore/2fastudio)
3. Click **Add to Chrome**
4. Review permissions and click **Add Extension**
5. Pin extension for easy access:
   - Click puzzle icon in toolbar
   - Click pin next to 2FA Studio

### First-Time Setup

#### Method 1: QR Code Pairing (Recommended)

1. **On Chrome Extension**:
   - Click 2FA Studio icon
   - Select **Pair with Mobile App**
   - QR code appears

2. **On Mobile App**:
   - Go to **Settings** > **Browser Extension**
   - Tap **Scan QR Code**
   - Point camera at QR code
   - Confirm pairing

3. **Verification**:
   - Extension shows "Connected"
   - Test by viewing an account

#### Method 2: Manual Pairing

1. **On Mobile App**:
   - Settings > Browser Extension
   - Tap **Generate Pairing Code**
   - Note the 8-digit code

2. **On Extension**:
   - Click **Enter Code Manually**
   - Type 8-digit code
   - Click **Pair**

## Basic Usage

### Viewing Codes

1. Click 2FA Studio icon in toolbar
2. Search or scroll to find account
3. Click account to reveal code
4. Code automatically copies to clipboard
5. Paste into website's 2FA field

### Quick Search

- Press `Ctrl+Shift+F` (Windows) or `Cmd+Shift+F` (Mac)
- Type account name
- Press Enter to copy code
- ESC to close

### Code Display Options

```
Extension Options > Display:
├── Show codes immediately
├── Require click to reveal
├── Blur codes until hover
└── Large font mode
```

## Auto-fill Feature

### How Auto-fill Works

1. **Detection**: Extension detects 2FA input fields
2. **Matching**: Finds matching account by domain
3. **Notification**: Shows fill prompt
4. **Approval**: Click to fill or approve from mobile
5. **Fill**: Code inserted automatically

### Enabling Auto-fill

1. Click extension icon
2. Go to **Settings** > **Auto-fill**
3. Toggle **Enable Auto-fill**
4. Choose security level:
   - **Automatic**: Fill without asking
   - **Notify**: Show popup first
   - **Approve**: Require mobile approval

### Domain Management

#### Adding Trusted Domains

1. Navigate to website requiring 2FA
2. Click extension icon
3. Click **Add This Site**
4. Confirm domain details
5. Link to existing account

#### Managing Domains

```
Settings > Domains > 
├── View all linked domains
├── Edit domain-account mappings
├── Remove domains
└── Import/Export domain list
```

### Smart Detection

The extension intelligently detects:
- Common 2FA field names
- OTP/TOTP input patterns
- Multi-step authentication flows
- Popular service patterns

## Security Features

### Encryption

- **End-to-end**: All data encrypted before sync
- **Local storage**: Encrypted with domain-specific key
- **Transit**: TLS 1.3 for all communications
- **No servers**: Direct device-to-device sync

### Privacy Controls

#### Incognito Mode

1. Right-click extension icon
2. Select **Manage Extension**
3. Toggle **Allow in Incognito**
4. Choose privacy level:
   - Never sync in incognito
   - Separate incognito vault
   - Read-only mode

#### Site Permissions

Control where extension works:
```
Settings > Permissions >
├── On all sites (not recommended)
├── On specific sites (recommended)
├── Only when clicked
└── Custom rules
```

### Security Options

#### Timeout Settings

```
Settings > Security > Auto-lock:
├── After 1 minute
├── After 5 minutes  
├── After 15 minutes
├── On browser close
└── Never (not recommended)
```

#### Authentication

1. **Extension PIN**:
   - Set 4-8 digit PIN
   - Required after timeout
   - Different from master password

2. **Biometric** (if supported):
   - Windows Hello
   - Touch ID (Mac)
   - Quick unlock

3. **Mobile Approval**:
   - Require approval for sensitive actions
   - Push notifications
   - Time-limited approvals

## Advanced Features

### Keyboard Shortcuts

Customize shortcuts in Chrome:
```
chrome://extensions/shortcuts
```

Default shortcuts:
- `Ctrl+Shift+F`: Quick search
- `Ctrl+Shift+L`: Lock extension
- `Ctrl+Shift+C`: Copy current site's code
- `Ctrl+Shift+A`: Auto-fill on current page

### Multiple Accounts

Handle multiple accounts per service:

1. **Smart Selection**:
   - Extension shows all matching accounts
   - Select correct one from dropdown
   - Remember choice for session

2. **Account Aliases**:
   ```
   Edit Account > Advanced >
   - Display Name: "Work Gmail"
   - Domain Override: "mail.google.com"
   - Auto-select: Enable
   ```

### Workspace Profiles

Perfect for separating work/personal:

1. **Create Profile**:
   - Settings > Profiles > New
   - Name profile (e.g., "Work")
   - Select accounts to include

2. **Switch Profiles**:
   - Click profile icon in extension
   - Quick switch between profiles
   - Different PIN per profile

### Integration Features

#### Password Manager Integration

Works alongside password managers:
1. Password manager fills username/password
2. 2FA Studio fills 2FA code
3. Seamless login experience

#### Form Detection API

For developers:
```javascript
// Add to your website
<input type="text" 
       autocomplete="one-time-code"
       data-2fa="true"
       placeholder="Enter 2FA code">
```

## Troubleshooting

### Connection Issues

#### Extension Can't Find App

1. **Check same account**:
   - Sign out and back in
   - Verify email matches

2. **Network issues**:
   - Both on same WiFi
   - Disable VPN temporarily
   - Check firewall settings

3. **Re-pair devices**:
   - Remove extension from app
   - Uninstall extension
   - Reinstall and pair again

#### Sync Not Working

**Quick fixes**:
1. Click sync icon to force sync
2. Check internet connection
3. Update both app and extension
4. Clear extension cache

**Advanced troubleshooting**:
```
Extension Options > Advanced >
- Clear cache
- Reset sync
- View sync log
- Export debug info
```

### Auto-fill Problems

#### Not Detecting Fields

**Solutions**:
1. Refresh the page
2. Check domain is added
3. Report site to support
4. Use manual fill instead

#### Wrong Account Selected

1. Edit account domain mapping
2. Create account alias
3. Use specific subdomain
4. Set priority for accounts

### Performance Issues

#### Extension Slow

1. Reduce number of accounts shown
2. Disable animations
3. Clear cache and data
4. Check Chrome performance

#### High Memory Usage

- Limit account sync
- Disable rich icons
- Use pagination
- Enable lite mode

## Best Practices

### Security Recommendations

1. **Always verify domains** before auto-filling
2. **Use PIN/biometric** lock
3. **Regular security audits** of connected sites
4. **Limit permissions** to necessary sites only
5. **Update regularly** for security patches

### Workflow Tips

1. **Organize accounts** by frequency of use
2. **Use search** instead of scrolling
3. **Keyboard shortcuts** for efficiency
4. **Profile separation** for work/personal
5. **Backup extension** settings

### Privacy Tips

1. **Disable in incognito** by default
2. **Clear clipboard** after use
3. **Lock when idle**
4. **Review permissions** monthly
5. **Minimal sync** options

## Managing the Extension

### Updates

#### Automatic Updates

Extension updates automatically, but you can:
1. Check version: Extension Options > About
2. Force update: chrome://extensions > Update
3. View changelog in extension

#### Beta Channel

Join beta for early features:
1. Settings > Advanced > Beta Channel
2. Understand risks
3. Report bugs
4. Provide feedback

### Data Management

#### Export Extension Data

1. Settings > Backup > Export
2. Choose what to export:
   - Settings only
   - Domain mappings
   - Everything
3. Save encrypted file

#### Import Settings

1. Settings > Backup > Import
2. Select backup file
3. Choose what to import
4. Merge or replace

#### Clear Extension Data

**Warning**: This removes all local data
1. Settings > Advanced > Clear Data
2. Choose data to clear:
   - Cache only
   - Settings
   - Everything
3. Confirm action

### Uninstalling

1. **Before uninstalling**:
   - Export your settings
   - Note custom configurations
   - Remove from paired devices

2. **Uninstall process**:
   - Right-click extension icon
   - Select "Remove from Chrome"
   - Confirm removal

3. **Clean up**:
   - Remove from mobile app
   - Clear any saved passwords
   - Review site permissions

## Enterprise Features

### Managed Deployment

For IT administrators:

1. **Group Policy**:
   ```json
   {
     "ExtensionSettings": {
       "2fastudio-extension-id": {
         "installation_mode": "force_installed",
         "update_url": "https://clients2.google.com/service/update2/crx"
       }
     }
   }
   ```

2. **Configuration**:
   - Pre-set organization defaults
   - Disable certain features
   - Force security policies
   - Centralized management

### Compliance Features

- **Audit logging** of all actions
- **Policy enforcement**
- **Data residency** options
- **SSO integration**

## Tips and Tricks

### Power User Features

1. **Quick Actions**:
   - Right-click account for menu
   - Drag to reorder accounts
   - Bulk operations with Shift+Click

2. **Smart Filters**:
   ```
   Search syntax:
   - @work (tag filter)
   - domain:google.com
   - type:totp
   - recent:7d
   ```

3. **Custom CSS**:
   - Settings > Appearance > Custom CSS
   - Theme extension your way
   - Share themes with community

### Integration Ideas

1. **Bookmark combinations**:
   - Create login bookmark sets
   - Include 2FA in workflow
   - One-click secure login

2. **Automation**:
   - Use with automation tools
   - Scripted secure logins
   - Testing workflows

## Getting Help

### Resources

- **Help Center**: help.2fastudio.app/extension
- **Video Tutorials**: youtube.com/2fastudio
- **Community Forum**: forum.2fastudio.app
- **GitHub**: github.com/2fastudio/extension

### Report Issues

When reporting extension issues:
1. Include Chrome version
2. Extension version
3. Console errors (F12 > Console)
4. Steps to reproduce
5. Screenshots if applicable

### Feature Requests

Submit ideas:
- feedback@2fastudio.app
- Vote on roadmap
- Join beta testing
- Contribute to open source

## Quick Reference Card

| Action | Shortcut | Description |
|--------|----------|-------------|
| Quick Search | Ctrl+Shift+F | Find and copy code |
| Lock | Ctrl+Shift+L | Lock extension |
| Auto-fill | Ctrl+Shift+A | Fill on current page |
| Copy Code | Ctrl+Shift+C | Copy active code |
| Settings | Ctrl+, | Open settings |
| Sync | Ctrl+R | Force sync |

Remember: The extension is a convenience tool. Always keep your mobile app as the primary secure backup for your 2FA accounts.