# Remaining Package Integrations Guide

## Priority Order

### 1. notification-kit v2.0.3
- Replace OneSignal in mobile-notifications.service.ts
- Update push notification handling
- Add local notification support

### 2. capacitor-native-update v2.0.0
- Create update service
- Add update check on app launch
- Implement update UI

### 3. capacitor-auth-manager v2.1.0
- Enhance auth.service.ts with OAuth providers
- Add social login support
- Implement better session management

### 4. buildkit-ui v1.3.0
- Replace existing UI components where applicable
- Use pre-built form components
- Leverage animation utilities

### 5. ts-buildkit & react-buildkit
- Add development utilities
- Enhance type safety
- Add React hooks and utilities

## Implementation Notes
- Each integration should be done in isolation
- Test on both web and mobile platforms
- Update documentation after each integration