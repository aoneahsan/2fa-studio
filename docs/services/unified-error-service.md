# Unified Error Service

## Overview

The `UnifiedErrorService` provides comprehensive error tracking and reporting using the `unified-error-handling` package (v2.0.0). It captures, categorizes, and reports errors across the application with support for multiple error reporting backends.

## Features

- ✅ Automatic error capture and categorization
- ✅ Multiple severity levels
- ✅ Stack trace parsing
- ✅ User context tracking
- ✅ Custom metadata support
- ✅ Error statistics and history
- ✅ Integration with Firebase Crashlytics
- ✅ Offline error queuing

## API Reference

### Initialization

```typescript
import { UnifiedErrorService } from '@services/unified-error.service';

// Initialize service (called in App.tsx)
await UnifiedErrorService.initialize({
  enableCrashlytics: true,
  enableConsoleLog: process.env.NODE_ENV === 'development',
  enableRemoteLogging: true,
  userId: currentUser?.id,
  environment: process.env.NODE_ENV
});
```

### Capturing Errors

```typescript
// Capture any error
UnifiedErrorService.captureError(error);

// Capture with severity
UnifiedErrorService.captureError(error, ErrorSeverity.WARNING);

// Capture with metadata
UnifiedErrorService.captureError(error, ErrorSeverity.ERROR, {
  component: 'LoginForm',
  action: 'submit',
  userId: user.id
});

// Capture exception (alias)
UnifiedErrorService.captureException(new Error('Something went wrong'));

// Capture message
UnifiedErrorService.captureMessage('User action failed', ErrorSeverity.INFO, {
  action: 'delete_account',
  reason: 'insufficient_permissions'
});
```

### Error Severity Levels

```typescript
enum ErrorSeverity {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  FATAL = 'fatal'
}
```

### User Context

```typescript
// Set user context for all future errors
UnifiedErrorService.setUserContext({
  id: user.id,
  email: user.email,
  subscriptionTier: user.subscription
});

// Add custom user properties
UnifiedErrorService.addUserProperty('last_login', new Date().toISOString());

// Clear user context (on logout)
UnifiedErrorService.clearUserContext();
```

### Error Statistics

```typescript
// Get error statistics
const stats = await UnifiedErrorService.getErrorStats();
// Returns: {
//   total: number;
//   byLevel: Record<ErrorLevel, number>;
//   bySeverity: Record<ErrorSeverity, number>;
//   recent: ErrorEntry[];
// }

// Get recent errors
const recentErrors = await UnifiedErrorService.getRecentErrors(10);

// Clear error history
await UnifiedErrorService.clearErrorHistory();
```

## Usage Examples

### Global Error Handler

```typescript
// In App.tsx or error boundary
import { UnifiedErrorService } from '@services/unified-error.service';

class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    UnifiedErrorService.captureError(error, ErrorSeverity.ERROR, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true
    });
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}

// Global unhandled promise rejection
window.addEventListener('unhandledrejection', (event) => {
  UnifiedErrorService.captureError(
    new Error(event.reason),
    ErrorSeverity.ERROR,
    { unhandledRejection: true }
  );
});
```

### API Error Handling

```typescript
import { UnifiedErrorService } from '@services/unified-error.service';

export class ApiService {
  static async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers
        }
      });

      if (!response.ok) {
        throw new ApiError(response.status, response.statusText);
      }

      return await response.json();
    } catch (error) {
      // Capture API errors with context
      UnifiedErrorService.captureError(error, ErrorSeverity.ERROR, {
        endpoint,
        method: options?.method || 'GET',
        status: error.status,
        apiError: true
      });
      
      throw error;
    }
  }
}
```

### Form Validation Errors

```typescript
export function LoginForm() {
  const handleSubmit = async (values: LoginFormValues) => {
    try {
      await loginUser(values);
    } catch (error) {
      // Capture authentication errors
      if (error.code === 'auth/invalid-credentials') {
        UnifiedErrorService.captureMessage(
          'Login failed - invalid credentials',
          ErrorSeverity.WARNING,
          {
            email: values.email,
            timestamp: new Date().toISOString()
          }
        );
      } else {
        UnifiedErrorService.captureError(error, ErrorSeverity.ERROR, {
          form: 'login',
          action: 'submit'
        });
      }
      
      showErrorToast(error.message);
    }
  };
}
```

### Service Integration Errors

```typescript
import { UnifiedErrorService } from '@services/unified-error.service';

export class BiometricAuthService {
  static async authenticate(): Promise<boolean> {
    try {
      const result = await MobileBiometricService.authenticate({
        reason: 'Please authenticate'
      });
      return result.authenticated;
    } catch (error) {
      // Categorize biometric errors
      const severity = error.code === 'USER_CANCELLED' 
        ? ErrorSeverity.INFO 
        : ErrorSeverity.ERROR;
      
      UnifiedErrorService.captureError(error, severity, {
        service: 'biometric',
        errorCode: error.code,
        platform: Capacitor.getPlatform()
      });
      
      return false;
    }
  }
}
```

### Error Dashboard Component

```typescript
export function ErrorDashboard() {
  const [stats, setStats] = useState<ErrorStats | null>(null);
  const [recentErrors, setRecentErrors] = useState<ErrorEntry[]>([]);

  useEffect(() => {
    loadErrorData();
  }, []);

  const loadErrorData = async () => {
    const errorStats = await UnifiedErrorService.getErrorStats();
    const recent = await UnifiedErrorService.getRecentErrors(20);
    
    setStats(errorStats);
    setRecentErrors(recent);
  };

  const clearErrors = async () => {
    await UnifiedErrorService.clearErrorHistory();
    await loadErrorData();
  };

  return (
    <div className="error-dashboard">
      <h2>Error Statistics</h2>
      
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total Errors</h3>
            <p>{stats.total}</p>
          </div>
          
          <div className="stat-card">
            <h3>By Severity</h3>
            {Object.entries(stats.bySeverity).map(([severity, count]) => (
              <p key={severity}>
                {severity}: {count}
              </p>
            ))}
          </div>
        </div>
      )}
      
      <h3>Recent Errors</h3>
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>Message</th>
            <th>Severity</th>
            <th>Component</th>
          </tr>
        </thead>
        <tbody>
          {recentErrors.map((error, index) => (
            <tr key={index}>
              <td>{new Date(error.timestamp).toLocaleString()}</td>
              <td>{error.message}</td>
              <td>{error.severity}</td>
              <td>{error.metadata?.component || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <button onClick={clearErrors}>Clear Error History</button>
    </div>
  );
}
```

## Error Types and Handling

### Network Errors
```typescript
if (error.name === 'NetworkError' || !navigator.onLine) {
  UnifiedErrorService.captureMessage(
    'Network request failed',
    ErrorSeverity.WARNING,
    { offline: !navigator.onLine }
  );
}
```

### Permission Errors
```typescript
if (error.code === 'PERMISSION_DENIED') {
  UnifiedErrorService.captureError(error, ErrorSeverity.INFO, {
    permission: 'camera',
    userAction: 'denied'
  });
}
```

### Validation Errors
```typescript
if (error instanceof ValidationError) {
  UnifiedErrorService.captureMessage(
    'Form validation failed',
    ErrorSeverity.DEBUG,
    { fields: error.fields }
  );
}
```

## Integration with Firebase Crashlytics

The service automatically integrates with Firebase Crashlytics when available:

```typescript
// Errors are automatically sent to Crashlytics
UnifiedErrorService.captureError(error);

// Custom keys for Crashlytics
UnifiedErrorService.captureError(error, ErrorSeverity.ERROR, {
  screen: 'AccountsPage',
  action: 'delete_account',
  accountId: account.id
});
```

## Best Practices

1. **Initialize early** in your app lifecycle
2. **Set user context** after authentication
3. **Use appropriate severity levels** for different error types
4. **Include relevant metadata** for debugging
5. **Don't capture sensitive information** in error messages
6. **Handle errors gracefully** with user-friendly messages
7. **Review error statistics** regularly
8. **Clear old errors** periodically to save storage

## Performance Considerations

- Errors are queued and sent in batches
- Offline errors are stored and sent when connection restored
- Large stack traces are truncated automatically
- Error history is limited to last 1000 entries

## Privacy and Security

- User passwords and secrets are never logged
- Sensitive data is automatically redacted
- Error reports can be disabled by users
- All data is encrypted in transit
- Compliance with GDPR and privacy regulations