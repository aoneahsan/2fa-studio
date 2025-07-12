---
sidebar_position: 3
---

# useBiometric

React hook for managing biometric authentication using device-native biometric sensors.

## Overview

The `useBiometric` hook provides a simple interface for biometric authentication (Face ID, Touch ID, fingerprint) across different platforms using Capacitor's biometric authentication plugin.

```typescript
import { useBiometric } from '@/hooks/useBiometric';
```

## Usage

```typescript
function SecuritySettings() {
  const {
    isAvailable,
    isEnabled,
    biometryType,
    authenticate,
    enable,
    disable,
    isChecking
  } = useBiometric();

  if (!isAvailable) {
    return <p>Biometric authentication not available on this device</p>;
  }

  return (
    <div>
      <h3>Biometric Authentication ({biometryType})</h3>
      <Switch
        checked={isEnabled}
        onChange={isEnabled ? disable : enable}
        disabled={isChecking}
      />
    </div>
  );
}
```

## Return Value

### isAvailable

**Type:** `boolean`

Indicates whether biometric authentication is available on the device.

**Example:**
```typescript
const { isAvailable } = useBiometric();

if (!isAvailable) {
  // Hide biometric options
}
```

### isEnabled

**Type:** `boolean`

Indicates whether the user has enabled biometric authentication for the app.

**Example:**
```typescript
const { isEnabled } = useBiometric();

if (isEnabled) {
  // Show biometric prompt on app launch
}
```

### biometryType

**Type:** `BiometryType | null`

The type of biometry available on the device.

**Values:**
- `'touchId'` - Touch ID (iOS)
- `'faceId'` - Face ID (iOS)
- `'fingerprint'` - Fingerprint (Android)
- `'face'` - Face authentication (Android)
- `'iris'` - Iris authentication (Android)
- `null` - No biometry available

**Example:**
```typescript
const { biometryType } = useBiometric();

const getIcon = () => {
  switch (biometryType) {
    case 'faceId':
    case 'face':
      return <FaceIcon />;
    case 'touchId':
    case 'fingerprint':
      return <FingerprintIcon />;
    default:
      return <LockIcon />;
  }
};
```

### isChecking

**Type:** `boolean`

Indicates whether the hook is checking biometric availability.

### authenticate

**Type:** `(reason?: string) => Promise<boolean>`

Prompts the user for biometric authentication.

**Parameters:**
- `reason` - Optional reason shown in the authentication prompt

**Returns:**
- Promise resolving to `true` if authentication succeeded, `false` otherwise

**Example:**
```typescript
const { authenticate } = useBiometric();

const unlockApp = async () => {
  const success = await authenticate('Unlock 2FA Studio');
  
  if (success) {
    // Grant access
    navigateToDashboard();
  } else {
    // Show error
    showToast('Authentication failed');
  }
};
```

### enable

**Type:** `() => Promise<boolean>`

Enables biometric authentication for the app.

**Returns:**
- Promise resolving to `true` if successfully enabled

**Example:**
```typescript
const { enable } = useBiometric();

const handleEnableBiometric = async () => {
  const success = await enable();
  
  if (success) {
    showToast('Biometric authentication enabled');
  } else {
    showToast('Failed to enable biometric authentication');
  }
};
```

### disable

**Type:** `() => Promise<boolean>`

Disables biometric authentication for the app.

**Returns:**
- Promise resolving to `true` if successfully disabled

**Example:**
```typescript
const { disable } = useBiometric();

const handleDisableBiometric = async () => {
  // Confirm with user first
  if (confirm('Disable biometric authentication?')) {
    await disable();
    showToast('Biometric authentication disabled');
  }
};
```

## Complete Example

```typescript
import React, { useEffect } from 'react';
import { useBiometric } from '@/hooks/useBiometric';
import { useAuth } from '@/hooks/useAuth';

function AppLockScreen({ onUnlock }) {
  const { user } = useAuth();
  const {
    isAvailable,
    isEnabled,
    biometryType,
    authenticate
  } = useBiometric();

  useEffect(() => {
    // Auto-prompt for biometric if enabled
    if (isEnabled && user?.settings.biometricAuth) {
      handleBiometricUnlock();
    }
  }, [isEnabled]);

  const handleBiometricUnlock = async () => {
    const reason = `Unlock ${user?.displayName}'s 2FA accounts`;
    const success = await authenticate(reason);
    
    if (success) {
      onUnlock();
    } else {
      // Fall back to PIN/password
      setShowPinEntry(true);
    }
  };

  const getBiometricLabel = () => {
    switch (biometryType) {
      case 'faceId':
        return 'Face ID';
      case 'touchId':
        return 'Touch ID';
      case 'fingerprint':
        return 'Fingerprint';
      case 'face':
        return 'Face Unlock';
      default:
        return 'Biometric';
    }
  };

  return (
    <div className="lock-screen">
      <h1>2FA Studio Locked</h1>
      <p>Authenticate to access your accounts</p>
      
      {isEnabled && (
        <button
          onClick={handleBiometricUnlock}
          className="biometric-button"
        >
          <BiometricIcon type={biometryType} />
          Unlock with {getBiometricLabel()}
        </button>
      )}
      
      <button onClick={() => setShowPinEntry(true)}>
        Use PIN Instead
      </button>
    </div>
  );
}
```

## Platform-Specific Behavior

### iOS
- Requires Face ID/Touch ID to be configured in device settings
- Shows native iOS authentication prompt
- Automatically detects biometry type

### Android
- Requires fingerprint/face to be enrolled
- Shows native Android BiometricPrompt
- Falls back to device credentials if configured

### Web
- Returns `isAvailable: false`
- Can implement WebAuthn as alternative

## Error Handling

The hook handles common biometric errors internally:

```typescript
// Internal error handling
try {
  const result = await BiometricAuth.authenticate({ reason });
  return result.success;
} catch (error) {
  if (error.code === 'USER_CANCELLED') {
    // User cancelled - not an error
    return false;
  } else if (error.code === 'BIOMETRY_LOCKED') {
    // Too many failed attempts
    showToast('Biometric authentication locked. Try again later.');
  } else if (error.code === 'BIOMETRY_NOT_ENROLLED') {
    // User hasn't set up biometrics
    showToast('Please set up biometric authentication in device settings.');
  }
  return false;
}
```

## Security Considerations

1. **Fallback Authentication**: Always provide alternative authentication
2. **Secure Storage**: Biometric status stored in secure preferences
3. **No Biometric Data**: The app never stores actual biometric data
4. **Rate Limiting**: OS handles failed attempt limits
5. **Privacy**: Biometric authentication happens entirely on-device

## Testing

```typescript
// Mock for testing
jest.mock('@/hooks/useBiometric', () => ({
  useBiometric: () => ({
    isAvailable: true,
    isEnabled: false,
    biometryType: 'fingerprint',
    authenticate: jest.fn().mockResolvedValue(true),
    enable: jest.fn().mockResolvedValue(true),
    disable: jest.fn().mockResolvedValue(true),
    isChecking: false
  })
}));
```

## Best Practices

1. **Check Availability First**: Always verify biometric is available
2. **Provide Context**: Use meaningful reasons in authenticate()
3. **Handle Failures Gracefully**: Offer alternative authentication
4. **Respect User Choice**: Make biometric authentication optional
5. **Test on Real Devices**: Biometric behavior varies by device