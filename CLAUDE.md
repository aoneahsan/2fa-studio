# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a 2FA (Two-Factor Authentication) service application similar to 2FAS Auth, providing secure two-factor authentication codes for various services. The project will include:

- Mobile apps (Android/iOS) using React + Capacitor.js
- Chrome browser extension
- Firebase backend (Firestore, Auth, etc.)
- Admin panel for managing users and subscriptions
- Monetization through ads (free tier) and subscriptions (premium tier)

## Technology Stack

### Frontend
- **Framework**: React + Capacitor.js (chosen over Flutter based on developer's existing packages)
- **UI Library**: buildkit-ui (developer's NPM package)
- **State Management**: TBD (consider Redux Toolkit or Zustand)
- **Styling**: TBD (consider Tailwind CSS or styled-components)

### Backend
- **Services**: Firebase (Authentication, Firestore, Cloud Functions, Storage)
- **Database**: Firestore
- **File Storage**: Firebase Storage (for encrypted backups)

### Browser Extension
- **Framework**: Chrome Extension Manifest V3
- **Communication**: WebSockets or Firebase Realtime Database for real-time sync

### Developer's Existing Packages
- capacitor-auth-manager
- capacitor-biometric-auth
- capacitor-firebase-kit
- capacitor-native-update
- buildkit-ui

## Development Commands

Since the project hasn't been initialized yet, here are the commands to set up and run the project:

```bash
# Initial setup (when starting the project)
yarn create react-app 2fa-studio --template typescript
cd 2fa-studio
yarn add @capacitor/core @capacitor/cli
npx cap init

# Install developer's packages
yarn add capacitor-auth-manager capacitor-biometric-auth capacitor-firebase-kit capacitor-native-update buildkit-ui

# Development
yarn start              # Start React development server
yarn build             # Build for production
yarn test              # Run tests
yarn lint              # Run linter

# Capacitor commands
npx cap add android    # Add Android platform
npx cap add ios        # Add iOS platform
npx cap sync          # Sync web app to native platforms
npx cap open android  # Open in Android Studio
npx cap open ios      # Open in Xcode
```

## Key Architecture Decisions

### Security Architecture
1. **Encryption**: All 2FA secrets must be encrypted using AES-256-GCM before storage
2. **Biometric Protection**: Use capacitor-biometric-auth for local device authentication
3. **Zero-Knowledge**: Google Drive backups should be end-to-end encrypted - Firebase should never have access to decryption keys
4. **Device Management**: Implement device fingerprinting and session management in Firestore

### Data Architecture
```
Firestore Structure:
- users/
  - {userId}/
    - profile
    - devices/
    - subscription
- accounts/ (2FA accounts)
  - {accountId}/
    - encrypted_secret
    - issuer
    - label
    - backup_codes/
- sessions/
  - {sessionId}/
    - device_info
    - expiry
```

### Browser Extension Architecture
- Background script handles authentication and sync
- Content script for QR code detection
- Popup for quick access to codes
- Secure messaging between extension and mobile app via Firebase

## Critical Implementation Guidelines

### Security Requirements
1. Never store unencrypted 2FA secrets
2. Implement rate limiting for code generation
3. Use Firebase Security Rules to ensure users can only access their own data
4. Implement certificate pinning for mobile apps
5. Browser extension must validate all origins before injecting codes

### Offline Support
1. Cache encrypted 2FA accounts locally using Capacitor Preferences API
2. Generate TOTP codes offline
3. Queue backup code usage for sync when online
4. Show clear offline/online status indicators

### Google Drive Backup
1. Use Google Drive API v3
2. Store backups in app-specific folder
3. Encrypt data client-side before upload
4. Include metadata for version control

### Subscription & Monetization
1. Free tier: Limited accounts (e.g., 10), ads
2. Premium tiers: Unlimited accounts, no ads, priority support
3. Implement receipt validation for in-app purchases
4. Track feature usage for proper tier enforcement

## Development Priorities

1. **Phase 1**: Core 2FA functionality
   - TOTP/HOTP code generation
   - QR code scanning
   - Manual entry
   - Local encryption

2. **Phase 2**: Sync & Backup
   - Firebase integration
   - Device management
   - Google Drive backup

3. **Phase 3**: Browser Extension
   - Basic extension with manual approval
   - Auto-fill with time-based approval

4. **Phase 4**: Monetization
   - Subscription tiers
   - Ad integration
   - Admin panel

## Testing Requirements

- Unit tests for encryption/decryption functions
- Integration tests for Firebase operations
- E2E tests for critical user flows
- Security penetration testing before release

## Compliance Notes

- Implement GDPR-compliant data deletion
- Create privacy policy and terms of service pages
- Add cookie consent for web version
- Implement data export functionality