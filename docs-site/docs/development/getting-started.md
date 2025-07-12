---
sidebar_position: 1
title: Getting Started
description: Set up and start developing the 2FA Studio application
---

# Getting Started

This guide will help you set up and start developing the 2FA Studio application.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18 or higher
- **Yarn** 1.22 or higher
- **Git**
- **Firebase account** (for backend services)
- **Google Cloud account** (for Drive backup functionality)

### Platform-Specific Requirements

#### Android Development
- Android Studio
- Android SDK
- Java 11 or higher

#### iOS Development
- macOS
- Xcode 14 or higher
- CocoaPods

## Quick Setup

The fastest way to get started is using our automated setup script:

```bash
# Clone the repository
git clone https://github.com/yourusername/2fa-studio.git
cd 2fa-studio

# Run automated setup
yarn install
yarn setup
```

## Manual Setup

If you prefer manual setup or the automated script encounters issues:

### 1. Install Dependencies

```bash
# Install all project dependencies
yarn install
```

### 2. Environment Configuration

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Google Drive API
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_GOOGLE_API_KEY=your_google_api_key

# App Configuration
VITE_APP_NAME=2FA Studio
VITE_APP_VERSION=1.0.0
```

### 3. Firebase Setup

1. **Create a Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Create a new project or select existing one

2. **Enable Required Services**
   - Authentication (Email/Password)
   - Cloud Firestore
   - Cloud Storage
   - Cloud Functions (for premium features)

3. **Configure Security Rules**
   ```bash
   # Deploy Firestore rules
   firebase deploy --only firestore:rules
   
   # Deploy Storage rules
   firebase deploy --only storage:rules
   ```

### 4. Google Drive API Setup

1. **Enable Google Drive API**
   - Visit [Google Cloud Console](https://console.cloud.google.com)
   - Enable Google Drive API
   - Create OAuth 2.0 credentials

2. **Configure OAuth Consent Screen**
   - Add required scopes: `drive.file`, `drive.appdata`
   - Add authorized domains

## Development

### Start Development Server

```bash
# Start the web development server
yarn dev

# The app will be available at http://localhost:5173
```

### Mobile Development

#### Android

```bash
# Add Android platform
npx cap add android

# Sync web code to Android
yarn cap:sync

# Open in Android Studio
yarn cap:android
```

#### iOS

```bash
# Add iOS platform
npx cap add ios

# Sync web code to iOS
yarn cap:sync

# Install iOS dependencies
cd ios/App && pod install && cd ../..

# Open in Xcode
yarn cap:ios
```

## Common Commands

```bash
# Development
yarn dev              # Start development server
yarn build           # Build for production
yarn preview         # Preview production build

# Testing
yarn test            # Run unit tests
yarn test:watch      # Run tests in watch mode
yarn test:e2e        # Run E2E tests
yarn test:coverage   # Generate coverage report

# Code Quality
yarn lint            # Run ESLint
yarn format          # Format code with Prettier
yarn type-check      # Run TypeScript type checking

# Mobile
yarn cap:sync        # Sync web code to native platforms
yarn cap:android     # Open Android Studio
yarn cap:ios         # Open Xcode

# Firebase
yarn firebase:deploy # Deploy to Firebase
yarn firebase:serve  # Run Firebase emulators
```

## Project Structure

```
2fa-studio/
├── src/               # Source code
│   ├── components/    # React components
│   ├── pages/        # Page components
│   ├── services/     # Business logic
│   ├── store/        # Redux store
│   ├── hooks/        # Custom React hooks
│   └── utils/        # Utility functions
├── public/           # Static assets
├── android/          # Android native code
├── ios/              # iOS native code
├── chrome-extension/ # Browser extension
├── docs/             # Documentation
└── tests/           # Test files
```

## Next Steps

1. **Explore the Codebase**
   - Check out the [Architecture Overview](/docs/architecture/overview.md)
   - Review the [Development Plan](/docs/development/development-plan.md)

2. **Start Developing**
   - Pick a feature from [Features Checklist](/docs/project-status/features-checklist.md)
   - Follow our [Testing Strategy](/docs/development/testing-strategy.md)

3. **Join the Community**
   - Join the project development team
   - Check the [Current Status](/docs/project-status/current-status.md)

## Troubleshooting

### Common Issues

1. **Dependencies Installation Fails**
   ```bash
   # Clear cache and reinstall
   rm -rf node_modules yarn.lock
   yarn install
   ```

2. **Firebase Connection Issues**
   - Verify your Firebase configuration in `.env`
   - Check Firebase project settings
   - Ensure services are enabled

3. **Mobile Build Errors**
   ```bash
   # Clean and rebuild
   yarn cap:sync
   cd android && ./gradlew clean && cd ..
   # or for iOS
   cd ios/App && pod install && cd ../..
   ```

## Getting Help

- Check the [Documentation](/docs/)
- Check the project documentation
- Open an [Issue](https://github.com/yourusername/2fa-studio/issues)
- Contact: aoneahsan@gmail.com