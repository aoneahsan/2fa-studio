# Auth Manager Service

## Overview

The `AuthManagerService` provides comprehensive authentication management using the `capacitor-auth-manager` package (v2.1.0). It supports multiple OAuth providers and session management.

## Features

- ✅ Multiple OAuth providers (Google, Apple, Facebook, etc.)
- ✅ Session management
- ✅ Token refresh
- ✅ Secure credential storage
- ✅ Multi-factor authentication
- ✅ Account linking

## API Reference

### Initialization

```typescript
import { AuthManagerService } from '@services/auth-manager.service';

// Initialize service
await AuthManagerService.initialize({
  providers: ['google', 'apple', 'facebook'],
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
  autoRefreshToken: true
});
```

### Social Login

```typescript
// Sign in with provider
const result = await AuthManagerService.signInWithProvider({
  provider: 'google',
  scopes: ['email', 'profile']
});

if (result.success && result.user) {
  console.log('Signed in:', result.user.email);
}
```

### Session Management

```typescript
// Get current session
const session = await AuthManagerService.getCurrentSession();

// Check if authenticated
const isAuth = await AuthManagerService.isAuthenticated();

// Sign out
await AuthManagerService.signOut();
```

## Usage Examples

### Social Login Component

```typescript
import { AuthManagerService } from '@services/auth-manager.service';

export function SocialLoginButtons() {
  const providers = ['google', 'apple', 'facebook'];
  
  const handleLogin = async (provider: string) => {
    try {
      const result = await AuthManagerService.signInWithProvider({
        provider: provider as any
      });
      
      if (result.success) {
        navigate('/dashboard');
      }
    } catch (error) {
      showError('Login failed');
    }
  };
  
  return (
    <div>
      {providers.map(provider => (
        <button
          key={provider}
          onClick={() => handleLogin(provider)}
        >
          Sign in with {provider}
        </button>
      ))}
    </div>
  );
}
```

## Best Practices

1. **Handle all providers** gracefully
2. **Store tokens securely** using encryption
3. **Implement token refresh** before expiry
4. **Support account linking** for flexibility
5. **Test on real devices** for OAuth flows