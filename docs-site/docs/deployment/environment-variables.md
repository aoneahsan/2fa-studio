---
sidebar_position: 6
---

# Environment Variables

Complete reference for all environment variables used in 2FA Studio across different platforms and deployment environments.

## Overview

Environment variables are used to:
- Store sensitive information (API keys, secrets)
- Configure different environments (dev, staging, prod)
- Enable/disable features
- Set application behavior

## Variable Naming Convention

```bash
# React App (Web/Mobile)
REACT_APP_*

# Cloud Functions
FUNCTIONS_*

# Build Process
BUILD_*

# CI/CD
CI_*
```

## Core Configuration

### Firebase Configuration

```bash
# Required for all environments
REACT_APP_FIREBASE_API_KEY=AIzaSyD...
REACT_APP_FIREBASE_AUTH_DOMAIN=2fa-studio.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=2fa-studio-prod
REACT_APP_FIREBASE_STORAGE_BUCKET=2fa-studio-prod.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=1:123456789:web:abc123
REACT_APP_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# Optional Firebase services
REACT_APP_FIREBASE_DATABASE_URL=https://2fa-studio-prod.firebaseio.com
REACT_APP_FIREBASE_VAPID_KEY=BNsZr... # For FCM web push
```

### Application Configuration

```bash
# Environment identifier
REACT_APP_ENVIRONMENT=production # development, staging, production

# Application version (auto-populated from package.json)
REACT_APP_VERSION=$npm_package_version

# API endpoints
REACT_APP_API_ENDPOINT=https://api.2fastudio.app
REACT_APP_WEBSOCKET_URL=wss://ws.2fastudio.app

# Application URLs
REACT_APP_WEB_URL=https://app.2fastudio.app
REACT_APP_LANDING_URL=https://2fastudio.app
REACT_APP_HELP_URL=https://help.2fastudio.app
```

## Feature Flags

### Analytics and Monitoring

```bash
# Analytics
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_GA_MEASUREMENT_ID=G-XXXXXXXXXX
REACT_APP_MIXPANEL_TOKEN=your_mixpanel_token # Optional

# Error tracking
REACT_APP_ENABLE_ERROR_REPORTING=true
REACT_APP_SENTRY_DSN=https://xxx@sentry.io/xxx
REACT_APP_SENTRY_ENVIRONMENT=production
REACT_APP_SENTRY_TRACES_SAMPLE_RATE=0.1

# Performance monitoring
REACT_APP_ENABLE_PERFORMANCE=true
REACT_APP_PERFORMANCE_SAMPLE_RATE=0.1
```

### Feature Toggles

```bash
# Core features
REACT_APP_ENABLE_CLOUD_SYNC=true
REACT_APP_ENABLE_GOOGLE_DRIVE_BACKUP=true
REACT_APP_ENABLE_BIOMETRIC_AUTH=true
REACT_APP_ENABLE_BROWSER_EXTENSION=true

# Premium features
REACT_APP_ENABLE_PREMIUM_FEATURES=true
REACT_APP_ENABLE_SUBSCRIPTION=true
REACT_APP_ENABLE_ADS=true # For free tier

# Beta features
REACT_APP_ENABLE_BETA_FEATURES=false
REACT_APP_ENABLE_EXPERIMENTAL_UI=false
```

## Third-Party Services

### Google Services

```bash
# Google OAuth (for Google Drive)
REACT_APP_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
REACT_APP_GOOGLE_CLIENT_SECRET=GOCSPX-xxx # Server-side only
REACT_APP_GOOGLE_DRIVE_API_KEY=AIzaSyD...
REACT_APP_GOOGLE_DRIVE_SCOPE=https://www.googleapis.com/auth/drive.file

# Google Maps (if needed)
REACT_APP_GOOGLE_MAPS_API_KEY=AIzaSyD...

# reCAPTCHA
REACT_APP_RECAPTCHA_SITE_KEY=6Lc...
REACT_APP_RECAPTCHA_SECRET_KEY=6Lc... # Server-side only
```

### Payment Processing

```bash
# Stripe
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_SECRET_KEY=sk_live_xxx # Server-side only
STRIPE_WEBHOOK_SECRET=whsec_xxx # Server-side only

# PayPal (alternative)
REACT_APP_PAYPAL_CLIENT_ID=xxx
PAYPAL_SECRET=xxx # Server-side only

# In-app purchases
REACT_APP_ENABLE_IAP=true
REACT_APP_APPLE_SHARED_SECRET=xxx # iOS receipt validation
REACT_APP_GOOGLE_PLAY_LICENSE_KEY=xxx # Android licensing
```

### Communication Services

```bash
# SendGrid (email)
SENDGRID_API_KEY=SG.xxx # Server-side only
SENDGRID_FROM_EMAIL=noreply@2fastudio.app
SENDGRID_TEMPLATE_WELCOME=d-xxx
SENDGRID_TEMPLATE_RESET_PASSWORD=d-xxx

# Twilio (SMS - optional)
TWILIO_ACCOUNT_SID=ACxxx # Server-side only
TWILIO_AUTH_TOKEN=xxx # Server-side only
TWILIO_FROM_NUMBER=+1234567890

# Push notifications
REACT_APP_VAPID_PUBLIC_KEY=BNsZr...
VAPID_PRIVATE_KEY=xxx # Server-side only
```

## Security Configuration

### Encryption Keys

```bash
# App-level encryption
REACT_APP_ENCRYPTION_ALGORITHM=AES-256-GCM
REACT_APP_PBKDF2_ITERATIONS=100000

# Server-side encryption
MASTER_ENCRYPTION_KEY=base64_encoded_32_byte_key # Server-side only
BACKUP_ENCRYPTION_KEY=base64_encoded_32_byte_key # Server-side only

# JWT configuration
JWT_SECRET=your_jwt_secret # Server-side only
JWT_EXPIRY=7d
REFRESH_TOKEN_SECRET=your_refresh_secret # Server-side only
REFRESH_TOKEN_EXPIRY=30d
```

### Security Policies

```bash
# CORS configuration
REACT_APP_ALLOWED_ORIGINS=https://2fastudio.app,https://app.2fastudio.app
REACT_APP_ALLOWED_METHODS=GET,POST,PUT,DELETE,OPTIONS

# Rate limiting
RATE_LIMIT_WINDOW=15m
RATE_LIMIT_MAX_REQUESTS=100

# Session configuration
SESSION_SECRET=your_session_secret # Server-side only
SESSION_TIMEOUT=3600000 # 1 hour in milliseconds
```

## Build Configuration

### Build Process

```bash
# Build metadata
BUILD_NUMBER=$CI_BUILD_NUMBER
BUILD_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
BUILD_COMMIT_SHA=$CI_COMMIT_SHA

# Build optimization
GENERATE_SOURCEMAP=false # Production only
INLINE_RUNTIME_CHUNK=false
IMAGE_INLINE_SIZE_LIMIT=10000

# Bundle analysis
ANALYZE_BUNDLE=false
BUNDLE_STATS=false
```

### Platform-Specific

```bash
# Android
ANDROID_KEYSTORE_PATH=/path/to/keystore.jks
ANDROID_KEYSTORE_PASSWORD=xxx
ANDROID_KEY_ALIAS=2fastudio
ANDROID_KEY_PASSWORD=xxx

# iOS
IOS_TEAM_ID=XXXXXXXXXX
IOS_PROVISIONING_PROFILE=xxx
IOS_CERTIFICATE_PASSWORD=xxx

# Chrome Extension
CHROME_EXTENSION_ID=xxx
CHROME_CLIENT_ID=xxx.apps.googleusercontent.com
CHROME_CLIENT_SECRET=GOCSPX-xxx
CHROME_REFRESH_TOKEN=xxx
```

## Environment Files

### Development (.env.development)

```bash
# .env.development
REACT_APP_ENVIRONMENT=development
REACT_APP_FIREBASE_API_KEY=dev-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=2fa-studio-dev.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=2fa-studio-dev
REACT_APP_FIREBASE_STORAGE_BUCKET=2fa-studio-dev.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=dev-sender-id
REACT_APP_FIREBASE_APP_ID=dev-app-id

REACT_APP_API_ENDPOINT=http://localhost:5001/2fa-studio-dev/us-central1/api
REACT_APP_ENABLE_ANALYTICS=false
REACT_APP_ENABLE_ERROR_REPORTING=false
REACT_APP_ENABLE_PERFORMANCE=false
GENERATE_SOURCEMAP=true
```

### Staging (.env.staging)

```bash
# .env.staging
REACT_APP_ENVIRONMENT=staging
REACT_APP_FIREBASE_API_KEY=staging-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=2fa-studio-staging.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=2fa-studio-staging
REACT_APP_FIREBASE_STORAGE_BUCKET=2fa-studio-staging.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=staging-sender-id
REACT_APP_FIREBASE_APP_ID=staging-app-id

REACT_APP_API_ENDPOINT=https://staging-api.2fastudio.app
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_ENABLE_ERROR_REPORTING=true
REACT_APP_ENABLE_PERFORMANCE=true
REACT_APP_ENABLE_BETA_FEATURES=true
GENERATE_SOURCEMAP=true
```

### Production (.env.production)

```bash
# .env.production
REACT_APP_ENVIRONMENT=production
REACT_APP_FIREBASE_API_KEY=prod-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=app.2fastudio.app
REACT_APP_FIREBASE_PROJECT_ID=2fa-studio-prod
REACT_APP_FIREBASE_STORAGE_BUCKET=2fa-studio-prod.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=prod-sender-id
REACT_APP_FIREBASE_APP_ID=prod-app-id

REACT_APP_API_ENDPOINT=https://api.2fastudio.app
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_ENABLE_ERROR_REPORTING=true
REACT_APP_ENABLE_PERFORMANCE=true
REACT_APP_ENABLE_BETA_FEATURES=false
GENERATE_SOURCEMAP=false
```

## Cloud Functions Environment

### Functions Configuration

```bash
# Set function config
firebase functions:config:set \
  sendgrid.key="SG.xxx" \
  stripe.secret="sk_live_xxx" \
  stripe.webhook="whsec_xxx" \
  encryption.master="base64_key" \
  google.client_id="xxx.apps.googleusercontent.com" \
  google.client_secret="GOCSPX-xxx"

# Get function config
firebase functions:config:get

# Use in functions
const functions = require('firebase-functions');
const sendgridKey = functions.config().sendgrid.key;
```

### Local Functions Development

```json
// functions/.runtimeconfig.json (git ignored)
{
  "sendgrid": {
    "key": "SG.xxx"
  },
  "stripe": {
    "secret": "sk_test_xxx",
    "webhook": "whsec_xxx"
  },
  "encryption": {
    "master": "base64_key"
  }
}
```

## CI/CD Environment Variables

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
env:
  CI: true
  NODE_ENV: production
  
jobs:
  deploy:
    env:
      FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
      REACT_APP_FIREBASE_API_KEY: ${{ secrets.FIREBASE_API_KEY }}
      REACT_APP_FIREBASE_AUTH_DOMAIN: ${{ secrets.FIREBASE_AUTH_DOMAIN }}
      # ... other variables
```

### Secret Management

```bash
# GitHub Secrets (Repository Settings > Secrets)
FIREBASE_TOKEN
FIREBASE_SERVICE_ACCOUNT
ANDROID_KEYSTORE_BASE64
IOS_CERTIFICATE_BASE64
CHROME_REFRESH_TOKEN
SENTRY_AUTH_TOKEN
```

## Security Best Practices

### 1. Never Commit Secrets

```bash
# .gitignore
.env
.env.*
.runtimeconfig.json
*.key
*.pem
*.p12
*.keystore
```

### 2. Use Secret Management

```javascript
// Use environment variables
const apiKey = process.env.REACT_APP_API_KEY;

// Never hardcode secrets
// BAD: const apiKey = 'AIzaSyD...';
// GOOD: const apiKey = process.env.REACT_APP_API_KEY;
```

### 3. Validate Environment

```javascript
// src/config/validate.js
const requiredEnvVars = [
  'REACT_APP_FIREBASE_API_KEY',
  'REACT_APP_FIREBASE_AUTH_DOMAIN',
  'REACT_APP_FIREBASE_PROJECT_ID',
  'REACT_APP_FIREBASE_STORAGE_BUCKET',
  'REACT_APP_FIREBASE_MESSAGING_SENDER_ID',
  'REACT_APP_FIREBASE_APP_ID'
];

function validateEnvironment() {
  const missing = requiredEnvVars.filter(
    varName => !process.env[varName]
  );
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
}

export default validateEnvironment;
```

### 4. Environment-Specific Behavior

```javascript
// src/config/environment.js
export const isDevelopment = process.env.REACT_APP_ENVIRONMENT === 'development';
export const isStaging = process.env.REACT_APP_ENVIRONMENT === 'staging';
export const isProduction = process.env.REACT_APP_ENVIRONMENT === 'production';

export const config = {
  // Use different behavior based on environment
  apiTimeout: isDevelopment ? 30000 : 10000,
  retryAttempts: isProduction ? 3 : 1,
  logLevel: isDevelopment ? 'debug' : 'error',
  
  // Feature flags
  features: {
    analytics: process.env.REACT_APP_ENABLE_ANALYTICS === 'true',
    errorReporting: process.env.REACT_APP_ENABLE_ERROR_REPORTING === 'true',
    betaFeatures: process.env.REACT_APP_ENABLE_BETA_FEATURES === 'true'
  }
};
```

## Loading Environment Variables

### React App

```javascript
// Variables prefixed with REACT_APP_ are automatically loaded
const apiKey = process.env.REACT_APP_FIREBASE_API_KEY;
```

### Node.js/Functions

```javascript
// Load .env file in development
require('dotenv').config();

// Access variables
const sendgridKey = process.env.SENDGRID_API_KEY;
```

### Build Time

```json
// package.json
{
  "scripts": {
    "build": "REACT_APP_VERSION=$npm_package_version react-scripts build",
    "build:staging": "env-cmd -f .env.staging yarn build",
    "build:production": "env-cmd -f .env.production yarn build"
  }
}
```

## Debugging Environment Variables

### Check Loaded Variables

```javascript
// Debug component
if (process.env.NODE_ENV === 'development') {
  console.log('Environment Variables:', {
    environment: process.env.REACT_APP_ENVIRONMENT,
    apiEndpoint: process.env.REACT_APP_API_ENDPOINT,
    analyticsEnabled: process.env.REACT_APP_ENABLE_ANALYTICS
  });
}
```

### Validate Configuration

```bash
# Print all REACT_APP_ variables
env | grep REACT_APP_

# Validate Firebase config
firebase projects:list
firebase apps:list
```

## Environment Variable Template

Create a `.env.example` file for developers:

```bash
# .env.example
# Copy this file to .env and fill in your values

# Firebase Configuration (Required)
REACT_APP_FIREBASE_API_KEY=your_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
REACT_APP_FIREBASE_PROJECT_ID=your_project_id_here
REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
REACT_APP_FIREBASE_APP_ID=your_app_id_here

# Environment
REACT_APP_ENVIRONMENT=development

# Features (Optional)
REACT_APP_ENABLE_ANALYTICS=false
REACT_APP_ENABLE_ERROR_REPORTING=false

# Third-party Services (Optional)
REACT_APP_SENTRY_DSN=
REACT_APP_GOOGLE_CLIENT_ID=
REACT_APP_STRIPE_PUBLISHABLE_KEY=
```

Remember: Always keep your environment variables secure and never commit sensitive values to version control!