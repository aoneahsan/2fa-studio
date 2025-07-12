---
sidebar_position: 1
---

# AuthService

Authentication service for managing user authentication, registration, and profile management.

## Overview

The `AuthService` class provides a comprehensive authentication solution integrated with Firebase Auth and Firestore. It handles user registration, login, profile management, device tracking, and subscription management.

```typescript
import { AuthService } from '@/services/auth.service';
```

## Methods

### initialize

Sets up an authentication state listener.

```typescript
static initialize(onUserChange: (user: User | null) => void): () => void
```

**Parameters:**
- `onUserChange` - Callback function triggered when authentication state changes

**Returns:**
- Unsubscribe function to remove the listener

**Example:**
```typescript
useEffect(() => {
  const unsubscribe = AuthService.initialize((user) => {
    console.log('User state changed:', user);
  });
  
  return () => unsubscribe();
}, []);
```

### setPersistence

Sets the authentication persistence level.

```typescript
static async setPersistence(rememberMe: boolean): Promise<void>
```

**Parameters:**
- `rememberMe` - If true, uses local persistence; otherwise uses session persistence

**Example:**
```typescript
await AuthService.setPersistence(true); // Remember user across browser sessions
```

### signUp

Creates a new user account with email and password.

```typescript
static async signUp(credentials: AuthCredentials): Promise<User>
```

**Parameters:**
- `credentials` - Object containing:
  - `email` (string) - User's email address
  - `password` (string) - User's password

**Returns:**
- `User` object with complete profile and subscription data

**Throws:**
- Error with user-friendly message if signup fails

**Example:**
```typescript
try {
  const user = await AuthService.signUp({
    email: 'user@example.com',
    password: 'SecurePassword123!'
  });
  console.log('User created:', user);
} catch (error) {
  console.error('Signup failed:', error.message);
}
```

**Notes:**
- Automatically creates user profile in Firestore
- Sets up free tier subscription with 10 account limit
- Registers the current device

### signIn

Authenticates an existing user with email and password.

```typescript
static async signIn(credentials: AuthCredentials): Promise<User>
```

**Parameters:**
- `credentials` - Object containing:
  - `email` (string) - User's email address
  - `password` (string) - User's password

**Returns:**
- `User` object with complete profile data

**Example:**
```typescript
try {
  const user = await AuthService.signIn({
    email: 'user@example.com',
    password: 'SecurePassword123!'
  });
  console.log('Signed in:', user);
} catch (error) {
  console.error('Sign in failed:', error.message);
}
```

### signInWithGoogle

Authenticates user using Google OAuth.

```typescript
static async signInWithGoogle(): Promise<User>
```

**Returns:**
- `User` object with profile data

**Features:**
- Requests Google Drive access scope for backup functionality
- Uses popup on web, redirect on mobile
- Google users automatically get cloud backup enabled

**Example:**
```typescript
try {
  const user = await AuthService.signInWithGoogle();
  console.log('Signed in with Google:', user);
} catch (error) {
  console.error('Google sign in failed:', error.message);
}
```

### signOut

Signs out the current user.

```typescript
static async signOut(): Promise<void>
```

**Example:**
```typescript
await AuthService.signOut();
console.log('User signed out');
```

**Notes:**
- Unregisters the current device
- Clears local session data

### sendPasswordResetEmail

Sends a password reset email to the specified address.

```typescript
static async sendPasswordResetEmail(email: string): Promise<void>
```

**Parameters:**
- `email` - Email address to send reset link to

**Example:**
```typescript
await AuthService.sendPasswordResetEmail('user@example.com');
console.log('Password reset email sent');
```

### updateProfile

Updates user profile information.

```typescript
static async updateProfile(profile: UserProfile): Promise<void>
```

**Parameters:**
- `profile` - Object containing:
  - `displayName?` (string) - User's display name
  - `photoURL?` (string) - URL to user's profile photo
  - `phoneNumber?` (string) - User's phone number

**Example:**
```typescript
await AuthService.updateProfile({
  displayName: 'John Doe',
  photoURL: 'https://example.com/photo.jpg'
});
```

### updatePassword

Changes the current user's password.

```typescript
static async updatePassword(currentPassword: string, newPassword: string): Promise<void>
```

**Parameters:**
- `currentPassword` - User's current password for verification
- `newPassword` - New password to set

**Example:**
```typescript
try {
  await AuthService.updatePassword('oldPassword123', 'newPassword456');
  console.log('Password updated successfully');
} catch (error) {
  console.error('Password update failed:', error.message);
}
```

**Notes:**
- Requires re-authentication with current password
- Validates password strength requirements

### hasPremiumFeature

Checks if the current user has access to a specific premium feature.

```typescript
static hasPremiumFeature(feature: keyof Subscription['features']): boolean
```

**Parameters:**
- `feature` - Feature name to check:
  - `cloudBackup` - Google Drive backup
  - `browserExtension` - Browser extension support
  - `prioritySupport` - Priority customer support
  - `advancedSecurity` - Advanced security features
  - `noAds` - Ad-free experience

**Returns:**
- `boolean` - True if user has access to the feature

**Example:**
```typescript
if (AuthService.hasPremiumFeature('cloudBackup')) {
  // Enable backup UI
}
```

### canAddMoreAccounts

Checks if user can add more 2FA accounts based on their subscription limit.

```typescript
static canAddMoreAccounts(currentCount: number): boolean
```

**Parameters:**
- `currentCount` - Number of accounts user currently has

**Returns:**
- `boolean` - True if user can add more accounts

**Example:**
```typescript
const accountCount = accounts.length;
if (AuthService.canAddMoreAccounts(accountCount)) {
  // Show add account button
} else {
  // Show upgrade prompt
}
```

## Types

### AuthCredentials

```typescript
interface AuthCredentials {
  email: string;
  password: string;
}
```

### UserProfile

```typescript
interface UserProfile {
  displayName?: string;
  photoURL?: string;
  phoneNumber?: string;
}
```

### User

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

## Error Handling

The service provides user-friendly error messages for common authentication errors:

- `auth/email-already-in-use` → "This email is already registered"
- `auth/invalid-email` → "Invalid email address"
- `auth/weak-password` → "Password is too weak"
- `auth/user-not-found` → "No account found with this email"
- `auth/wrong-password` → "Incorrect password"
- `auth/too-many-requests` → "Too many failed attempts. Please try again later"

## Security Notes

- Passwords are never stored in plain text
- Device fingerprinting tracks trusted devices
- Automatic session management based on user preference
- Re-authentication required for sensitive operations (password change)
- Implements rate limiting through Firebase Auth