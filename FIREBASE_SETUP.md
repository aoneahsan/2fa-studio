# Firebase Project Setup Guide

This guide will help you set up a Firebase project for the 2FA Studio application.

## 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name: `2fa-studio-[your-name]`
4. Enable Google Analytics (recommended)
5. Choose or create a Google Analytics account
6. Click "Create project"

## 2. Enable Authentication

1. In Firebase Console, go to "Authentication" > "Sign-in method"
2. Enable the following providers:
   - **Email/Password** (required)
   - **Google** (recommended for backup)
   - **Apple** (for iOS users)
   - **Facebook** (optional)
   - **Microsoft** (optional)

### Google Sign-In Configuration
1. Click on Google provider
2. Enable it
3. Set support email
4. Download OAuth 2.0 config if prompted
5. Note the Web client ID for later use

## 3. Set up Firestore Database

1. Go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" (we'll add security rules later)
4. Select a location near your users
5. Click "Done"

### Create Collections
The app will automatically create these collections when needed:
- `users` - User profiles and settings
- `accounts` - Encrypted 2FA account data
- `backups` - Backup metadata
- `sessions` - Active user sessions
- `analytics_events` - Usage analytics

## 4. Configure Storage

1. Go to "Storage"
2. Click "Get started"
3. Choose "Start in test mode"
4. Select same location as Firestore
5. Click "Done"

## 5. Set up Cloud Functions (Optional)

1. Go to "Functions"
2. Click "Get started"
3. Install Firebase CLI: `npm install -g firebase-tools`
4. Initialize functions: `firebase init functions`

## 6. Configure Firebase Project Settings

1. Go to Project Settings (gear icon)
2. In "General" tab, scroll to "Your apps"
3. Click "Web app" icon (</>) to add web app
4. Enter app nickname: "2FA Studio Web"
5. Check "Also set up Firebase Hosting" (optional)
6. Click "Register app"
7. Copy the Firebase SDK configuration

## 7. Update Environment Variables

1. Copy the Firebase configuration from step 6
2. Update your `.env` file with the values:

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

## 8. Security Rules

### Firestore Security Rules
Replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Users can read/write their own accounts
    match /accounts/{accountId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
    
    // Users can read/write their own backups
    match /backups/{backupId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
    
    // Users can read/write their own sessions
    match /sessions/{sessionId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
    
    // Analytics events (write-only for users)
    match /analytics_events/{eventId} {
      allow create: if request.auth != null;
      allow read: if false; // Only backend can read
    }
  }
}
```

### Storage Security Rules
Replace the default rules with:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Users can upload/download their own backups
    match /backups/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Users can upload/download their own profile images
    match /profiles/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 9. Test Firebase Connection

1. Restart your development server: `yarn dev`
2. Open browser console
3. Should see "Firebase initialized successfully" message
4. No "Firebase is not configured" warning should appear

## 10. Deploy Security Rules

Install Firebase CLI if not already installed:
```bash
npm install -g firebase-tools
```

Login and set project:
```bash
firebase login
firebase use your_project_id
```

Deploy rules:
```bash
firebase deploy --only firestore:rules,storage:rules
```

## 11. Optional: Set up Firebase Hosting

If you want to deploy to Firebase Hosting:

```bash
firebase init hosting
```

Choose:
- Use existing project
- Set public directory to `dist`
- Configure as single-page app: `y`
- Don't overwrite index.html: `n`

Deploy:
```bash
yarn build
firebase deploy --only hosting
```

## Security Considerations

1. **Never commit API keys to version control**
2. **Use environment variables for all sensitive data**
3. **Implement proper Firestore security rules**
4. **Enable App Check for production** (optional but recommended)
5. **Set up monitoring and alerts**
6. **Regular security reviews of Firebase project settings**

## Troubleshooting

### Common Issues

1. **"Firebase not configured" warning**
   - Check that all environment variables are set correctly
   - Ensure `.env` file is in project root
   - Restart development server after changes

2. **Authentication not working**
   - Check Firebase Authentication is enabled
   - Verify sign-in methods are configured
   - Check browser console for errors

3. **Firestore permission denied**
   - Verify security rules are deployed
   - Check user authentication status
   - Ensure user UID matches document structure

4. **Storage upload fails**
   - Check Storage security rules
   - Verify file size limits
   - Check user authentication

## Next Steps

After completing Firebase setup:

1. Test user registration and login
2. Test 2FA account creation and storage
3. Test backup functionality
4. Deploy to production
5. Set up monitoring and analytics
6. Configure production security rules

For additional help, see:
- [Firebase Documentation](https://firebase.google.com/docs)
- [2FA Studio Documentation](./docs/)