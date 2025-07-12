---
sidebar_position: 1
---

# useAuth

React hook for managing authentication state and user information.

## Overview

The `useAuth` hook provides a simple interface to access authentication state from the Redux store and automatically initializes the authentication listener when the component mounts.

```typescript
import { useAuth } from '@/hooks/useAuth';
```

## Usage

```typescript
function MyComponent() {
  const { user, isLoading, isAuthenticated, error } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <div>Welcome, {user.displayName}!</div>;
}
```

## Return Value

The hook returns an object with the following properties:

### user

**Type:** `User | null`

The currently authenticated user object containing:
- `id` (string) - Unique user identifier
- `email` (string) - User's email address
- `displayName` (string) - User's display name
- `photoURL` (string) - Profile photo URL
- `subscription` (Subscription) - Subscription details
- `settings` (UserSettings) - User preferences
- Other user properties

**Example:**
```typescript
const { user } = useAuth();

if (user) {
  console.log(`Logged in as: ${user.email}`);
  console.log(`Subscription tier: ${user.subscription.tier}`);
}
```

### isLoading

**Type:** `boolean`

Indicates whether the authentication state is being determined. Useful for showing loading states during initial app load.

**Example:**
```typescript
const { isLoading } = useAuth();

if (isLoading) {
  return <div>Checking authentication...</div>;
}
```

### isAuthenticated

**Type:** `boolean`

Indicates whether a user is currently authenticated.

**Example:**
```typescript
const { isAuthenticated } = useAuth();

return isAuthenticated ? <Dashboard /> : <LandingPage />;
```

### error

**Type:** `string | null`

Contains any authentication-related error messages.

**Example:**
```typescript
const { error } = useAuth();

if (error) {
  return <Alert type="error">{error}</Alert>;
}
```

## Implementation Details

The hook:
1. Connects to the Redux store to access auth state
2. Initializes the Firebase auth listener on mount
3. Automatically updates when auth state changes
4. Cleans up the listener on unmount

## Complete Example

```typescript
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children }) {
  const { user, isLoading, isAuthenticated } = useAuth();

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="spinner" />
        <span>Loading...</span>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check subscription features
  const canAccessFeature = user?.subscription.features.advancedSecurity;
  
  if (!canAccessFeature) {
    return (
      <div className="upgrade-prompt">
        <h2>Upgrade Required</h2>
        <p>This feature requires a premium subscription.</p>
        <button>Upgrade Now</button>
      </div>
    );
  }

  // Render protected content
  return children;
}
```

## Related APIs

- [AuthService](../services/auth-service.md) - For authentication operations
- [useAppSelector](./use-app-store.md) - For accessing other Redux state
- [authSlice](../store/auth-slice.md) - Redux slice containing auth state

## Best Practices

1. **Always check isLoading** before rendering auth-dependent UI
2. **Use isAuthenticated** for route protection
3. **Access user properties safely** with optional chaining
4. **Handle errors gracefully** in the UI

## TypeScript Support

The hook is fully typed. The User type is imported from the types module:

```typescript
interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL: string;
  createdAt: Date;
  updatedAt: Date;
  subscription: Subscription;
  settings: UserSettings;
  lastBackup: Date | null;
  backupEnabled: boolean;
  deviceCount: number;
}
```