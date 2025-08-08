# 2FA Studio Services Documentation

## Overview

This directory contains comprehensive documentation for all services implemented in the 2FA Studio application. Each service integrates with one of the custom packages developed for the project.

## Service Categories

### Authentication & Security
- [Mobile Biometric Service](./mobile-biometric-service.md) - Biometric authentication using capacitor-biometric-authentication
- [Auth Manager Service](./auth-manager-service.md) - OAuth and authentication management using capacitor-auth-manager

### Storage & Data
- [Storage Service](./storage-service.md) - Universal storage API using strata-storage
- [Firebase Kit Service](./firebase-kit-service.md) - Firebase integration using capacitor-firebase-kit

### Error Handling & Analytics
- [Unified Error Service](./unified-error-service.md) - Error tracking using unified-error-handling
- [Unified Tracking Service](./unified-tracking-service.md) - Analytics using unified-tracking

### User Experience
- [Notification Kit Service](./notification-kit-service.md) - Push notifications using notification-kit
- [Native Update Service](./native-update-service.md) - OTA updates using capacitor-native-update
- [BuildKit UI Service](./buildkit-ui-service.md) - UI components using buildkit-ui

### Utilities
- [BuildKit Utils](./buildkit-utils.md) - TypeScript and React utilities using ts-buildkit and react-buildkit

## Quick Reference

| Service | Package | Version | Purpose |
|---------|---------|---------|---------|
| MobileBiometricService | capacitor-biometric-authentication | v2.0.0 | Biometric auth |
| StorageService | strata-storage | v2.0.3 | Cross-platform storage |
| UnifiedErrorService | unified-error-handling | v2.0.0 | Error tracking |
| UnifiedTrackingService | unified-tracking | v3.0.0 | Analytics |
| NotificationKitService | notification-kit | v2.0.3 | Notifications |
| NativeUpdateService | capacitor-native-update | v2.0.0 | App updates |
| AuthManagerService | capacitor-auth-manager | v2.1.0 | OAuth providers |
| BuildKitUIService | buildkit-ui | v1.3.0 | UI components |
| FirebaseKitService | capacitor-firebase-kit | v2.1.0 | Firebase features |

## Integration Patterns

All services follow a consistent pattern:

1. **Static class design** - No instantiation required
2. **Initialization method** - Called once in App.tsx
3. **Error handling** - All methods handle errors gracefully
4. **Platform checks** - Services verify platform compatibility
5. **TypeScript support** - Full type definitions

## Common Usage

```typescript
// Import service
import { ServiceName } from '@services/service-name.service';

// Initialize (in App.tsx)
await ServiceName.initialize();

// Use service methods
const result = await ServiceName.methodName(params);
```

## Testing

All services have comprehensive integration tests. Run tests with:

```bash
yarn test src/tests/integration/services.test.tsx
```

## Migration Notes

- OneSignal → NotificationKitService
- @capacitor/preferences → StorageService
- Custom error handling → UnifiedErrorService
- Basic analytics → UnifiedTrackingService
- Custom UI components → BuildKitUIService