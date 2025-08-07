# Social Login Integration Guide

## Overview

Social login is now integrated using the `capacitor-auth-manager` package v2.1.0, which provides OAuth authentication for multiple providers.

## Available Providers

- Google
- Apple
- Facebook
- Microsoft
- GitHub
- Twitter

## Usage

### Basic Implementation

```tsx
import SocialLoginButtons from '@components/auth/SocialLoginButtons';

// In your login page
<SocialLoginButtons
  onSuccess={() => {
    console.log('Login successful');
  }}
  onError={(error) => {
    console.error('Login failed:', error);
  }}
/>
```

### Custom Implementation

```tsx
import { AuthManagerService } from '@services/auth-manager.service';

// Sign in with a specific provider
const handleGoogleLogin = async () => {
  try {
    const result = await AuthManagerService.signInWithProvider({
      provider: 'google',
      scopes: ['email', 'profile'],
    });
    
    if (result.success) {
      console.log('User:', result.user);
    }
  } catch (error) {
    console.error('Login failed:', error);
  }
};
```

## Configuration

Each provider requires configuration in their respective developer consoles:

### Google
- Create OAuth 2.0 credentials in Google Cloud Console
- Add authorized redirect URIs
- Configure OAuth consent screen

### Apple
- Enable Sign in with Apple in App ID configuration
- Create Service ID for web
- Configure domains and redirect URLs

### Facebook
- Create Facebook App
- Add Facebook Login product
- Configure OAuth redirect URIs

### Microsoft
- Register application in Azure Portal
- Configure redirect URIs
- Set up authentication

### GitHub
- Create OAuth App in GitHub settings
- Set authorization callback URL

### Twitter
- Create Twitter App
- Enable OAuth 2.0
- Set callback URLs

## Features

- Automatic session management
- Token refresh handling
- Cross-platform support (Web, iOS, Android)
- Secure token storage
- User profile data retrieval

## Security Considerations

1. Always use HTTPS in production
2. Store sensitive credentials securely
3. Implement proper logout functionality
4. Handle token expiration gracefully
5. Validate user data from providers