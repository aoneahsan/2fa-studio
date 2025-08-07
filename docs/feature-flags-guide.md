# Feature Flags Guide

## Overview

Feature flags are implemented using Firebase Remote Config through the `capacitor-firebase-kit` package. This allows you to control app features remotely without deploying new versions.

## Usage

### Check Single Feature Flag

```tsx
import { useFeatureFlag, FEATURE_FLAGS } from '@hooks/useFeatureFlag';

function MyComponent() {
  const isSocialLoginEnabled = useFeatureFlag(FEATURE_FLAGS.SOCIAL_LOGIN);
  
  if (!isSocialLoginEnabled) {
    return null;
  }
  
  return <SocialLoginButtons />;
}
```

### Check Multiple Feature Flags

```tsx
import { useFeatureFlags } from '@hooks/useFeatureFlag';

function SettingsPage() {
  const flags = useFeatureFlags();
  
  return (
    <div>
      {flags.biometric_auth && <BiometricSettings />}
      {flags.google_drive_backup && <BackupSettings />}
      {flags.dark_mode && <ThemeToggle />}
    </div>
  );
}
```

### Direct Service Usage

```tsx
import { FirebaseKitService } from '@services/firebase-kit.service';

// Check feature synchronously (uses cached value)
const isEnabled = await FirebaseKitService.isFeatureEnabled('social_login');

// Get all remote config values
const config = await FirebaseKitService.getRemoteConfig();
```

## Available Feature Flags

| Flag | Description | Default |
|------|-------------|---------|
| `social_login` | Enable OAuth providers | `false` |
| `biometric_auth` | Enable biometric authentication | `true` |
| `google_drive_backup` | Enable Google Drive backups | `true` |
| `browser_extension` | Show browser extension settings | `true` |
| `premium_features` | Enable premium features | `false` |
| `analytics_enabled` | Enable analytics tracking | `true` |
| `crash_reporting` | Enable crash reporting | `true` |
| `performance_monitoring` | Enable performance monitoring | `true` |
| `in_app_updates` | Enable OTA updates | `true` |
| `dark_mode` | Enable dark mode toggle | `true` |
| `advanced_search` | Enable advanced search features | `true` |
| `export_import` | Enable account export/import | `true` |
| `multi_device_sync` | Enable device synchronization | `true` |
| `security_dashboard` | Show security dashboard | `false` |
| `password_generator` | Enable password generator | `false` |

## Firebase Console Setup

1. Go to Firebase Console > Remote Config
2. Create parameters for each feature flag
3. Set default values
4. Create conditions for different user segments:
   - Platform (iOS, Android, Web)
   - App version
   - User properties
   - Percentage rollout

## Best Practices

1. **Graceful Degradation**: Always provide default values
2. **Caching**: Remote config values are cached for 12 hours by default
3. **Testing**: Use Firebase A/B testing for gradual rollouts
4. **Documentation**: Document all feature flags and their purpose
5. **Cleanup**: Remove unused feature flags regularly

## Example: Gradual Feature Rollout

```javascript
// In Firebase Console, create conditions:
// 1. 10% of users: social_login = true
// 2. iOS users: social_login = true
// 3. Version >= 2.0.0: social_login = true
// 4. Default: social_login = false
```

## Monitoring

Track feature flag usage with analytics:

```tsx
import { UnifiedTrackingService } from '@services/unified-tracking.service';

// Track when feature is used
if (isSocialLoginEnabled) {
  UnifiedTrackingService.track('feature_used', {
    feature: 'social_login',
    enabled: true
  });
}
```