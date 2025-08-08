# Mobile Testing Guide

## Overview

This guide provides instructions for testing all integrated services on iOS and Android platforms.

## Prerequisites

### iOS Testing
- macOS with Xcode installed
- iOS device or simulator
- Apple Developer account (for device testing)
- CocoaPods installed

### Android Testing
- Android Studio installed
- Android device or emulator
- USB debugging enabled (for device testing)

## Building for Mobile

### iOS Build

```bash
# Install dependencies
yarn install

# Build web assets
yarn build

# Sync with Capacitor
npx cap sync ios

# Open in Xcode
npx cap open ios

# Or run directly
npx cap run ios
```

### Android Build

```bash
# Install dependencies
yarn install

# Build web assets
yarn build

# Sync with Capacitor
npx cap sync android

# Open in Android Studio
npx cap open android

# Or run directly
npx cap run android
```

## Service Testing Checklist

### 1. Mobile Biometric Service

**iOS Testing:**
- [ ] Face ID authentication on supported devices
- [ ] Touch ID authentication on older devices
- [ ] Fallback to device passcode
- [ ] Error handling for no biometrics enrolled

**Android Testing:**
- [ ] Fingerprint authentication
- [ ] Face unlock (if supported)
- [ ] PIN/Pattern fallback
- [ ] BiometricPrompt UI appearance

**Test Code:**
```typescript
// Test biometric availability
const available = await MobileBiometricService.checkAvailability();
console.log('Biometric available:', available);

// Test authentication
const result = await MobileBiometricService.authenticate({
  reason: 'Test biometric authentication'
});
console.log('Auth result:', result);
```

### 2. Storage Service

**Platform Testing:**
- [ ] Data persistence after app restart
- [ ] Large data storage (>1MB)
- [ ] Concurrent read/write operations
- [ ] Storage quota handling

**Test Code:**
```typescript
// Test storage operations
await StorageService.set('test_key', { data: 'test' });
const retrieved = await StorageService.get('test_key');
console.log('Storage test:', retrieved);

// Test bulk operations
await StorageService.setMultiple({
  key1: 'value1',
  key2: 'value2'
});
```

### 3. Notification Kit Service

**iOS Testing:**
- [ ] Permission request dialog
- [ ] Push notification delivery
- [ ] Notification actions
- [ ] Badge count updates
- [ ] Quiet hours respect

**Android Testing:**
- [ ] Notification channels
- [ ] Heads-up notifications
- [ ] Notification grouping
- [ ] Custom sounds
- [ ] Do Not Disturb mode

**Test Code:**
```typescript
// Request permission
const granted = await NotificationKitService.requestPermission();
console.log('Permission granted:', granted);

// Schedule test notification
await NotificationKitService.scheduleNotification({
  title: 'Test Notification',
  body: 'This is a test',
  id: 999,
  schedule: { at: new Date(Date.now() + 5000) }
});
```

### 4. Native Update Service

**Testing Steps:**
1. Deploy v1.0.0 to device
2. Deploy v1.0.1 to update server
3. Launch app and check for updates
4. Download and install update
5. Verify app restarts with new version

**Test Code:**
```typescript
// Check for updates
const updateInfo = await NativeUpdateService.checkForUpdate();
console.log('Update available:', updateInfo);

// Monitor download progress
NativeUpdateService.onDownloadProgress((progress) => {
  console.log('Download progress:', progress.percent);
});
```

### 5. Auth Manager Service

**OAuth Provider Testing:**
- [ ] Google Sign-In (iOS & Android)
- [ ] Apple Sign-In (iOS)
- [ ] Facebook Login
- [ ] Token refresh
- [ ] Logout functionality

**Test Code:**
```typescript
// Test OAuth login
const result = await AuthManagerService.signInWithProvider({
  provider: 'google'
});
console.log('OAuth result:', result);

// Test session
const session = await AuthManagerService.getCurrentSession();
console.log('Current session:', session);
```

### 6. Firebase Kit Service

**Testing Areas:**
- [ ] Analytics event logging
- [ ] Crashlytics error reporting
- [ ] Performance trace recording
- [ ] Remote config fetching
- [ ] User property setting

**Test Code:**
```typescript
// Test analytics
await FirebaseKitService.logEvent('test_event', {
  platform: Capacitor.getPlatform()
});

// Test remote config
const testFlag = await FirebaseKitService.isFeatureEnabled('test_feature');
console.log('Test feature enabled:', testFlag);
```

## Common Issues and Solutions

### iOS Issues

1. **Biometric not working in simulator**
   - Use Features > Face ID/Touch ID menu
   - Test on real device for accurate behavior

2. **Push notifications not received**
   - Check push notification entitlement
   - Verify APNS configuration
   - Test on real device

3. **OAuth redirect issues**
   - Add URL schemes to Info.plist
   - Configure associated domains

### Android Issues

1. **Biometric crashes on older devices**
   - Check API level compatibility
   - Use androidx.biometric library

2. **Storage permission denied**
   - Add permissions to AndroidManifest.xml
   - Request runtime permissions

3. **OAuth not returning to app**
   - Configure intent filters
   - Add redirect URI to manifest

## Performance Testing

### Memory Usage
```typescript
// Monitor memory usage
if (Capacitor.getPlatform() === 'ios') {
  // Use Xcode Instruments
} else if (Capacitor.getPlatform() === 'android') {
  // Use Android Studio Profiler
}
```

### Battery Impact
- Test with Battery Historian (Android)
- Use Energy Log (iOS)
- Monitor background service usage

## Debugging Tools

### iOS Debugging
- Safari Web Inspector
- Xcode Console
- Charles Proxy for network

### Android Debugging
- Chrome DevTools
- Android Studio Logcat
- Stetho for database inspection

## Automated Testing

### Appium Setup
```javascript
// Appium test example
const driver = await wdio.remote({
  capabilities: {
    platformName: 'iOS',
    deviceName: 'iPhone 13',
    app: '/path/to/app'
  }
});

// Test biometric
await driver.execute('mobile: enrollBiometric', { isEnabled: true });
```

## Release Testing Checklist

- [ ] Test on minimum supported OS versions
- [ ] Test on various screen sizes
- [ ] Test offline functionality
- [ ] Test app updates
- [ ] Test deep linking
- [ ] Test accessibility features
- [ ] Test localization
- [ ] Performance profiling
- [ ] Security testing
- [ ] Crash-free rate monitoring