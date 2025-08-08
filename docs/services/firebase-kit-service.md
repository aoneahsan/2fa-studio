# Firebase Kit Service

## Overview

The `FirebaseKitService` provides Firebase integration using the `capacitor-firebase-kit` package (v2.1.0). It includes Analytics, Crashlytics, Performance Monitoring, and Remote Config.

## Features

- ✅ Firebase Analytics
- ✅ Crashlytics
- ✅ Performance Monitoring
- ✅ Remote Config
- ✅ Dynamic Links
- ✅ In-App Messaging

## API Reference

### Initialization

```typescript
import { FirebaseKitService } from '@services/firebase-kit.service';

// Initialize service
await FirebaseKitService.initialize({
  analyticsEnabled: true,
  crashlyticsEnabled: true,
  performanceEnabled: true
});
```

### Analytics

```typescript
// Log event
await FirebaseKitService.logEvent('purchase', {
  value: 9.99,
  currency: 'USD',
  items: ['premium_subscription']
});

// Set user property
await FirebaseKitService.setUserProperty('subscription_tier', 'premium');

// Set user ID
await FirebaseKitService.setUserId('user_123');
```

### Remote Config

```typescript
// Get remote config value
const isEnabled = await FirebaseKitService.isFeatureEnabled('social_login');

// Get all config
const config = await FirebaseKitService.getRemoteConfig();

// Fetch and activate
await FirebaseKitService.fetchAndActivateRemoteConfig();
```

### Crashlytics

```typescript
// Log error
await FirebaseKitService.recordError(error, {
  fatal: false,
  customKeys: {
    component: 'LoginForm',
    action: 'submit'
  }
});

// Set custom key
await FirebaseKitService.setCrashlyticsCustomKey('user_type', 'premium');
```

### Performance Monitoring

```typescript
// Start trace
const trace = await FirebaseKitService.startTrace('account_sync');

// Add metrics
await trace.putMetric('account_count', 25);
await trace.putAttribute('sync_type', 'full');

// Stop trace
await trace.stop();
```

## Usage Examples

### Feature Flags

```typescript
import { useFeatureFlag } from '@hooks/useFeatureFlag';

export function FeatureGatedComponent() {
  const isEnabled = useFeatureFlag('new_feature');
  
  if (!isEnabled) return null;
  
  return <NewFeature />;
}
```

### Performance Tracking

```typescript
export async function syncAccounts() {
  const trace = await FirebaseKitService.startTrace('sync_accounts');
  
  try {
    const accounts = await fetchAccounts();
    await trace.putMetric('count', accounts.length);
    return accounts;
  } finally {
    await trace.stop();
  }
}
```

## Best Practices

1. **Use feature flags** for gradual rollouts
2. **Track key metrics** for insights
3. **Log non-fatal errors** to Crashlytics
4. **Monitor performance** of critical paths
5. **Respect user privacy** settings