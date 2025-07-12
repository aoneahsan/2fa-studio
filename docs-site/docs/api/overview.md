---
sidebar_position: 1
---

# API Overview

The 2FA Studio API is organized into three main categories:

## Services

Core business logic and external integrations:

- **[AuthService](./services/auth-service.md)** - Authentication and user management
- **[EncryptionService](./services/encryption-service.md)** - AES-256-GCM encryption for secure data handling
- **[OTPService](./services/otp-service.md)** - TOTP/HOTP code generation and validation
- **[GoogleDriveService](./services/google-drive-service.md)** - Google Drive backup integration
- **[ImportExportService](./services/import-export-service.md)** - Account import/export functionality

## React Hooks

Custom hooks for state management and functionality:

- **[useAuth](./hooks/use-auth.md)** - Authentication state and operations
- **[useAccounts](./hooks/use-accounts.md)** - 2FA account management
- **[useBiometric](./hooks/use-biometric.md)** - Biometric authentication
- **[useGoogleDrive](./hooks/use-google-drive.md)** - Google Drive backup operations
- **[useAppDispatch & useAppSelector](./hooks/use-app-store.md)** - Redux store access

## Key Components

Reusable UI components:

- **[AccountCard](./components/account-card.md)** - Displays 2FA account with code generation
- **[AccountsList](./components/accounts-list.md)** - Manages list of 2FA accounts
- **[QRScanner](./components/qr-scanner.md)** - QR code scanning for account import
- **[GoogleDriveBackup](./components/google-drive-backup.md)** - Backup management UI
- **[LockScreen](./components/lock-screen.md)** - App security screen

## Architecture Notes

### Security Model

All sensitive data (2FA secrets) are encrypted using AES-256-GCM before storage:
- Client-side encryption with user-derived keys
- Zero-knowledge architecture - Firebase never has access to decryption keys
- Biometric authentication for local device security

### Data Flow

1. **Authentication**: Firebase Auth → AuthService → Redux Store
2. **Account Management**: User Action → Hook → Service → Firestore → Redux Store
3. **Code Generation**: Account Data → OTPService → UI Component
4. **Backup**: Local Data → EncryptionService → GoogleDriveService → Google Drive

### Offline Support

The app uses Capacitor Preferences API for offline caching:
- Encrypted accounts cached locally
- Code generation works offline
- Sync queue for offline changes