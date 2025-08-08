# Unified Tracking Service

## Overview

The `UnifiedTrackingService` provides comprehensive analytics and event tracking using the `unified-tracking` package (v3.0.0). It supports multiple analytics providers and offers a unified API for tracking user behavior, performance metrics, and custom events.

## Features

- ✅ Multi-provider support (Google Analytics, Firebase, Mixpanel, etc.)
- ✅ Event tracking with properties
- ✅ User identification and properties
- ✅ Screen/page view tracking
- ✅ E-commerce tracking
- ✅ Custom metrics and dimensions
- ✅ Offline event queuing
- ✅ GDPR compliance tools

## API Reference

### Initialization

```typescript
import { UnifiedTrackingService } from '@services/unified-tracking.service';

// Initialize service (called in App.tsx)
await UnifiedTrackingService.initialize({
  providers: ['firebase', 'google-analytics'],
  enableDebugMode: process.env.NODE_ENV === 'development',
  batchSize: 20,
  flushInterval: 30000 // 30 seconds
});
```

### Event Tracking

```typescript
// Track simple event
await UnifiedTrackingService.track('button_clicked');

// Track event with properties
await UnifiedTrackingService.track('account_added', {
  issuer: 'Google',
  type: 'TOTP',
  hasIcon: true,
  setupMethod: 'qr_scan'
});

// Track with custom metrics
await UnifiedTrackingService.track('backup_completed', {
  accountCount: 25,
  backupSize: 1024 * 5, // 5KB
  duration: 1500, // milliseconds
  method: 'google_drive'
});
```

### User Identification

```typescript
// Identify user
await UnifiedTrackingService.identify('user_123', {
  email: 'user@example.com',
  subscriptionTier: 'premium',
  accountCount: 15,
  createdAt: '2024-01-15'
});

// Update user properties
await UnifiedTrackingService.setUserProperties({
  lastBackup: new Date().toISOString(),
  biometricEnabled: true,
  preferredTheme: 'dark'
});

// Track user property changes
await UnifiedTrackingService.incrementUserProperty('total_logins', 1);
```

### Screen Tracking

```typescript
// Track screen view
await UnifiedTrackingService.trackScreen('AccountsPage', {
  accountCount: 10,
  hasSearch: true
});

// Track with additional properties
await UnifiedTrackingService.trackScreen('SettingsPage', {
  section: 'security',
  previousScreen: 'AccountsPage'
});
```

### E-commerce Tracking

```typescript
// Track purchase
await UnifiedTrackingService.trackPurchase({
  transactionId: 'TXN_123',
  revenue: 9.99,
  currency: 'USD',
  items: [{
    itemId: 'premium_monthly',
    itemName: 'Premium Monthly Subscription',
    price: 9.99,
    quantity: 1,
    category: 'subscription'
  }]
});

// Track subscription event
await UnifiedTrackingService.track('subscription_started', {
  plan: 'premium_monthly',
  price: 9.99,
  billingCycle: 'monthly',
  paymentMethod: 'credit_card'
});
```

## Usage Examples

### App Lifecycle Tracking

```typescript
import { UnifiedTrackingService } from '@services/unified-tracking.service';

export function App() {
  useEffect(() => {
    // Track app launch
    UnifiedTrackingService.track('app_launched', {
      version: APP_VERSION,
      platform: Capacitor.getPlatform(),
      isFirstLaunch: !hasLaunchedBefore
    });

    // Track app foreground/background
    const handleAppStateChange = (state: AppState) => {
      UnifiedTrackingService.track('app_state_changed', {
        state: state.isActive ? 'foreground' : 'background',
        timestamp: new Date().toISOString()
      });
    };

    App.addListener('appStateChange', handleAppStateChange);

    return () => {
      App.removeListener('appStateChange', handleAppStateChange);
    };
  }, []);
}
```

### Feature Usage Tracking

```typescript
export function QRScanner() {
  const handleScanSuccess = async (data: string) => {
    // Track successful QR scan
    await UnifiedTrackingService.track('qr_code_scanned', {
      success: true,
      scanDuration: Date.now() - scanStartTime,
      accountType: detectAccountType(data)
    });
    
    // Process QR code...
  };

  const handleManualEntry = () => {
    // Track manual entry
    UnifiedTrackingService.track('manual_entry_selected', {
      reason: 'qr_scan_unavailable'
    });
  };
}
```

### Performance Tracking

```typescript
export class PerformanceTracker {
  private static timers: Map<string, number> = new Map();

  static startTimer(label: string) {
    this.timers.set(label, Date.now());
  }

  static async endTimer(label: string, metadata?: Record<string, any>) {
    const startTime = this.timers.get(label);
    if (!startTime) return;

    const duration = Date.now() - startTime;
    this.timers.delete(label);

    await UnifiedTrackingService.track('performance_metric', {
      metric: label,
      duration,
      ...metadata
    });
  }
}

// Usage
PerformanceTracker.startTimer('account_sync');
await syncAccounts();
await PerformanceTracker.endTimer('account_sync', {
  accountCount: accounts.length,
  success: true
});
```

### Error Tracking Integration

```typescript
import { UnifiedErrorService } from '@services/unified-error.service';
import { UnifiedTrackingService } from '@services/unified-tracking.service';

// Track errors as events
UnifiedErrorService.on('error_captured', (error) => {
  UnifiedTrackingService.track('error_occurred', {
    errorType: error.name,
    errorMessage: error.message,
    severity: error.severity,
    component: error.metadata?.component
  });
});
```

### Conversion Tracking

```typescript
export function PremiumUpgradeFlow() {
  const [step, setStep] = useState(1);

  useEffect(() => {
    // Track funnel step
    UnifiedTrackingService.track('upgrade_funnel_step', {
      step,
      stepName: getStepName(step),
      timestamp: new Date().toISOString()
    });
  }, [step]);

  const handleUpgradeComplete = async (plan: string) => {
    // Track conversion
    await UnifiedTrackingService.track('upgrade_completed', {
      plan,
      previousPlan: 'free',
      upgradeSource: 'in_app_prompt',
      trialUsed: false
    });

    // Track revenue
    await UnifiedTrackingService.trackPurchase({
      transactionId: generateTransactionId(),
      revenue: getPlanPrice(plan),
      currency: 'USD',
      items: [{
        itemId: plan,
        itemName: getPlanName(plan),
        price: getPlanPrice(plan),
        quantity: 1,
        category: 'subscription'
      }]
    });
  };
}
```

### User Behavior Analysis

```typescript
export function AccountsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');

  // Track search usage
  const trackSearch = useDebouncedCallback((term: string) => {
    if (term.length > 0) {
      UnifiedTrackingService.track('search_performed', {
        searchLength: term.length,
        hasResults: filteredAccounts.length > 0,
        resultCount: filteredAccounts.length
      });
    }
  }, 1000);

  // Track sort preference
  const handleSortChange = (newSort: string) => {
    setSortBy(newSort);
    UnifiedTrackingService.track('sort_changed', {
      sortBy: newSort,
      previousSort: sortBy
    });
  };

  // Track feature discovery
  const handleAdvancedFeature = () => {
    UnifiedTrackingService.track('feature_discovered', {
      feature: 'bulk_export',
      userSegment: getUserSegment()
    });
  };
}
```

## Advanced Features

### Custom Dimensions

```typescript
// Set custom dimensions
await UnifiedTrackingService.setCustomDimension('user_type', 'premium');
await UnifiedTrackingService.setCustomDimension('ab_test_group', 'variant_a');
```

### Custom Metrics

```typescript
// Set custom metrics
await UnifiedTrackingService.setCustomMetric('account_count', 25);
await UnifiedTrackingService.setCustomMetric('backup_frequency_days', 7);
```

### Session Management

```typescript
// Start new session
await UnifiedTrackingService.startSession();

// End session
await UnifiedTrackingService.endSession({
  duration: sessionDuration,
  screenViews: screenViewCount
});
```

### GDPR Compliance

```typescript
// Get user consent
const hasConsent = await getAnalyticsConsent();

if (hasConsent) {
  await UnifiedTrackingService.enableTracking();
} else {
  await UnifiedTrackingService.disableTracking();
}

// Delete user data
await UnifiedTrackingService.deleteUserData();

// Export user data
const userData = await UnifiedTrackingService.exportUserData();
```

## Event Naming Conventions

Follow these conventions for consistent tracking:

```typescript
// User actions: verb_noun
'button_clicked'
'account_added'
'backup_completed'

// Screen views: screen_name_viewed
'accounts_page_viewed'
'settings_page_viewed'

// Errors: error_type_occurred
'network_error_occurred'
'validation_error_occurred'

// Features: feature_action
'biometric_enabled'
'theme_changed'
```

## Best Practices

1. **Track meaningful events** that provide business value
2. **Be consistent** with event naming and properties
3. **Avoid PII** in event properties
4. **Batch events** for better performance
5. **Test tracking** in development mode
6. **Document events** and their properties
7. **Review analytics** regularly for insights
8. **Respect user privacy** and consent

## Performance Optimization

- Events are batched and sent every 30 seconds
- Offline events are queued and sent when online
- Large properties are automatically truncated
- Duplicate events are filtered within same session

## Privacy Considerations

- No passwords or secrets in events
- IP addresses are anonymized
- User consent required for tracking
- Data retention policies enforced
- Right to deletion supported