# Mobile Biometric Service

## Overview

The `MobileBiometricService` provides biometric authentication functionality using the `capacitor-biometric-authentication` package (v2.0.0). It enables secure authentication through fingerprint, Face ID, or other biometric methods available on the device.

## Features

- ✅ Biometric availability checking
- ✅ Multiple authentication methods (fingerprint, face, iris)
- ✅ Secure credential storage
- ✅ Session management
- ✅ Fallback to device passcode
- ✅ Cross-platform support (iOS/Android)

## API Reference

### Initialization

```typescript
import { MobileBiometricService } from '@services/mobile-biometric.service';

// Initialize service (called in App.tsx)
await MobileBiometricService.initialize();
```

### Check Biometric Availability

```typescript
// Check if biometric auth is available
const isAvailable = await MobileBiometricService.checkAvailability();

// Get detailed availability info
const availabilityInfo = await MobileBiometricService.checkBiometricAvailability();
// Returns: {
//   available: boolean;
//   strongBiometryAvailable: boolean;
//   biometryTypes: BiometryType[];
//   reason?: string;
// }
```

### Authenticate User

```typescript
// Simple authentication
const result = await MobileBiometricService.authenticate({
  reason: 'Please authenticate to access your accounts'
});

if (result.authenticated) {
  // User authenticated successfully
}

// Authentication with options
const result = await MobileBiometricService.authenticate({
  reason: 'Authenticate to unlock app',
  cancelTitle: 'Cancel',
  fallbackTitle: 'Use Passcode',
  disableBackup: false,
  maxAttempts: 3,
  requireConfirmation: true,
  iosFallbackToPasscode: true,
  androidBiometryStrength: BiometryStrength.STRONG
});
```

### Store and Retrieve Credentials

```typescript
// Store encrypted credentials
await MobileBiometricService.storeCredentials({
  server: 'https://api.2fastudio.com',
  username: 'user@example.com',
  password: 'secure_token'
});

// Retrieve credentials (requires authentication)
const credentials = await MobileBiometricService.getCredentials({
  server: 'https://api.2fastudio.com'
});

// Delete stored credentials
await MobileBiometricService.deleteCredentials({
  server: 'https://api.2fastudio.com'
});
```

### Lock Management

```typescript
// Lock the app (require biometric on next access)
await MobileBiometricService.lockApp();

// Unlock the app
const unlocked = await MobileBiometricService.unlockApp();

// Check lock status
const isLocked = await MobileBiometricService.isAppLocked();
```

## Usage Examples

### Basic Integration

```typescript
import { MobileBiometricService } from '@services/mobile-biometric.service';

export function BiometricLogin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleBiometricAuth = async () => {
    try {
      const available = await MobileBiometricService.checkAvailability();
      
      if (!available) {
        showToast('Biometric authentication not available');
        return;
      }

      const result = await MobileBiometricService.authenticate({
        reason: 'Authenticate to access your 2FA codes'
      });

      if (result.authenticated) {
        setIsAuthenticated(true);
        navigateToAccounts();
      }
    } catch (error) {
      console.error('Biometric auth failed:', error);
      showToast('Authentication failed');
    }
  };

  return (
    <button onClick={handleBiometricAuth}>
      Unlock with Biometrics
    </button>
  );
}
```

### Protected Routes

```typescript
import { useBiometric } from '@hooks/useBiometric';

export function ProtectedRoute({ children }) {
  const { biometricEnabled, checkBiometric } = useBiometric();
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    if (biometricEnabled && !isUnlocked) {
      checkBiometric().then(success => {
        setIsUnlocked(success);
      });
    }
  }, [biometricEnabled]);

  if (biometricEnabled && !isUnlocked) {
    return <LockScreen />;
  }

  return children;
}
```

### Settings Integration

```typescript
export function BiometricSettings() {
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometryType, setBiometryType] = useState<string>('');

  useEffect(() => {
    checkBiometricStatus();
  }, []);

  const checkBiometricStatus = async () => {
    const info = await MobileBiometricService.checkBiometricAvailability();
    if (info.available) {
      setBiometryType(info.biometryTypes[0] || 'Biometric');
      const settings = await StorageService.get('biometric_settings');
      setBiometricEnabled(settings?.enabled || false);
    }
  };

  const toggleBiometric = async () => {
    if (!biometricEnabled) {
      // Enable biometric
      const result = await MobileBiometricService.authenticate({
        reason: 'Enable biometric authentication'
      });
      
      if (result.authenticated) {
        await StorageService.set('biometric_settings', { enabled: true });
        setBiometricEnabled(true);
      }
    } else {
      // Disable biometric
      await StorageService.set('biometric_settings', { enabled: false });
      setBiometricEnabled(false);
    }
  };

  return (
    <div>
      <h3>Security</h3>
      <label>
        <input
          type="checkbox"
          checked={biometricEnabled}
          onChange={toggleBiometric}
        />
        Enable {biometryType} Authentication
      </label>
    </div>
  );
}
```

## Error Handling

```typescript
try {
  const result = await MobileBiometricService.authenticate({
    reason: 'Please authenticate'
  });
} catch (error) {
  if (error.code === 'USER_CANCELLED') {
    // User cancelled authentication
  } else if (error.code === 'BIOMETRY_LOCKED') {
    // Too many failed attempts
  } else if (error.code === 'BIOMETRY_NOT_ENROLLED') {
    // No biometric data enrolled
  } else {
    // Other error
    console.error('Authentication error:', error);
  }
}
```

## Platform-Specific Notes

### iOS
- Supports Face ID and Touch ID
- Requires `NSFaceIDUsageDescription` in Info.plist
- Falls back to device passcode if enabled

### Android
- Supports fingerprint, face, and iris recognition
- Requires `USE_BIOMETRIC` permission
- Supports different biometry strength levels

## Best Practices

1. **Always check availability** before attempting authentication
2. **Provide clear reasons** for authentication requests
3. **Handle errors gracefully** with user-friendly messages
4. **Offer alternatives** like passcode or password login
5. **Store minimal sensitive data** in biometric-protected storage
6. **Test on real devices** as simulators have limited biometric support

## Security Considerations

- Biometric data never leaves the device
- Credentials are encrypted using device's secure keychain
- Authentication results cannot be spoofed
- Session management prevents unauthorized access
- Automatic lock on app background (configurable)