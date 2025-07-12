---
sidebar_position: 1
title: Getting Started
---

# Getting Started with 2FA Studio

Welcome to 2FA Studio! This guide will help you set up and start using 2FA Studio to secure your online accounts with two-factor authentication.

## What is 2FA Studio?

2FA Studio is a secure, cross-platform two-factor authentication (2FA) app that helps you protect your online accounts. It generates time-based one-time passwords (TOTP) that provide an extra layer of security beyond just your password.

## Installation

### Mobile App (Android/iOS)

1. **Download from App Store**
   - Android: Search for "2FA Studio" on Google Play Store
   - iOS: Search for "2FA Studio" on Apple App Store

2. **First Launch**
   - Grant necessary permissions (camera for QR scanning)
   - Set up biometric authentication (recommended)
   - Create a master password for app access

### Chrome Extension

1. **Install from Chrome Web Store**
   - Visit the Chrome Web Store
   - Search for "2FA Studio Extension"
   - Click "Add to Chrome"

2. **Initial Setup**
   - Click the extension icon in your browser toolbar
   - Sign in with your 2FA Studio account
   - Grant necessary permissions

### Web App

1. **Access the Web App**
   - Visit [https://app.2fastudio.com](https://app.2fastudio.com)
   - Sign in or create a new account
   - Enable two-factor authentication for your 2FA Studio account itself (recommended)

## Adding Your First Account

### Method 1: QR Code Scanning (Recommended)

1. Open 2FA Studio on your device
2. Tap the "+" or "Add Account" button
3. Select "Scan QR Code"
4. Point your camera at the QR code shown by the service
5. Enter a name for the account (e.g., "Google - Personal")
6. Tap "Save"

### Method 2: Manual Entry

1. Open 2FA Studio
2. Tap the "+" or "Add Account" button
3. Select "Manual Entry"
4. Enter the following information:
   - **Account Name**: A descriptive name (e.g., "GitHub - Work")
   - **Secret Key**: The key provided by the service
   - **Issuer**: The service name (e.g., "GitHub")
   - **Algorithm**: Usually SHA1 (default)
   - **Digits**: Usually 6 (default)
   - **Period**: Usually 30 seconds (default)
5. Tap "Save"

## Using 2FA Codes

1. **Viewing Codes**
   - Open 2FA Studio
   - Your accounts will be listed with their current codes
   - Codes refresh automatically (usually every 30 seconds)

2. **Copying Codes**
   - Tap on a code to copy it to your clipboard
   - The app will confirm the code was copied

3. **Code Timer**
   - A progress indicator shows how long the current code is valid
   - Wait for a new code if the timer is almost expired

## Setting Up Sync

To access your accounts across multiple devices:

1. **Create an Account**
   - Open Settings in 2FA Studio
   - Select "Account & Sync"
   - Create an account or sign in

2. **Enable Sync**
   - Toggle "Enable Sync" on
   - Your accounts will automatically sync across devices
   - All data is end-to-end encrypted

## Backup Your Accounts

**Important**: Always keep a backup of your 2FA accounts!

1. **Automatic Backup**
   - Go to Settings > Backup
   - Enable "Automatic Backup"
   - Choose backup location (Google Drive recommended)
   - Set backup frequency

2. **Manual Backup**
   - Go to Settings > Backup
   - Tap "Backup Now"
   - Choose export format and location
   - Save the encrypted backup file securely

## Security Tips

- **Enable Biometric Lock**: Use fingerprint or face recognition
- **Set a Strong Master Password**: If biometrics aren't available
- **Regular Backups**: Enable automatic backups
- **Verify Accounts**: Always verify new accounts work before relying on them
- **Keep App Updated**: Install updates for security patches

## Next Steps

- [Explore Features](features.md) - Learn about advanced features
- [Security Best Practices](security-best-practices.md) - Enhance your security
- [Backup & Restore Guide](backup-restore.md) - Detailed backup instructions
- [Troubleshooting](troubleshooting.md) - Solutions to common issues

## Need Help?

- Check our [FAQ](troubleshooting.md#faq)
- Visit our [Support Center](https://support.2fastudio.com)
- Contact us at support@2fastudio.com