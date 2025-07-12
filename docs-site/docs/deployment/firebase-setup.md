---
sidebar_position: 5
---

# Firebase Setup

Complete guide for setting up Firebase services for 2FA Studio including Authentication, Firestore, Storage, and Cloud Functions.

## Prerequisites

### Required Accounts
- Google account
- Firebase account (free tier available)
- Google Cloud Platform access (automatically created with Firebase)

### Development Tools
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Verify installation
firebase --version

# Login to Firebase
firebase login
```

## Project Creation

### 1. Create Firebase Project

```bash
# Create via CLI
firebase projects:create 2fa-studio-prod --display-name "2FA Studio Production"

# Or create via Console
# 1. Visit https://console.firebase.google.com
# 2. Click "Create Project"
# 3. Name: 2fa-studio-prod
# 4. Enable Google Analytics
# 5. Select Analytics account
```

### 2. Project Configuration

```bash
# Initialize Firebase in your project
cd /path/to/2fa-studio
firebase init

# Select services:
# ◉ Firestore
# ◉ Functions
# ◉ Hosting
# ◉ Storage
# ◉ Emulators

# Configuration options:
# Firestore rules: firestore.rules
# Firestore indexes: firestore.indexes.json
# Functions language: TypeScript
# ESLint: Yes
# Install dependencies: Yes
# Public directory: build
# Single-page app: Yes
# Set up automatic builds: No
```

## Firebase Authentication

### 1. Enable Authentication Methods

```javascript
// Via Firebase Console:
// Authentication > Sign-in method

// Enable these providers:
// ✓ Email/Password
// ✓ Google
// ✓ Apple (iOS only)
// ✓ Anonymous (for trials)
```

### 2. Configure Auth Settings

```javascript
// firebase/auth.config.js
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  setPersistence, 
  browserLocalPersistence,
  connectAuthEmulator 
} from 'firebase/auth';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Set persistence
setPersistence(auth, browserLocalPersistence);

// Configure auth settings
auth.settings = {
  appVerificationDisabledForTesting: false
};

// Connect to emulator in development
if (process.env.NODE_ENV === 'development') {
  connectAuthEmulator(auth, 'http://localhost:9099');
}

export { auth };
```

### 3. Auth Security Rules

```javascript
// Custom claims for role-based access
exports.setUserRole = functions.auth.user().onCreate(async (user) => {
  // Default role
  let role = 'free';
  
  // Check for premium indicators
  if (user.email?.endsWith('@company.com')) {
    role = 'premium';
  }
  
  // Set custom claims
  await admin.auth().setCustomUserClaims(user.uid, {
    role,
    createdAt: Date.now()
  });
  
  // Create user document
  await admin.firestore().collection('users').doc(user.uid).set({
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    role,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    settings: {
      theme: 'light',
      notifications: true,
      autoLock: true
    }
  });
});
```

## Cloud Firestore

### 1. Database Structure

```javascript
// Firestore Collections Structure
{
  // Users collection
  users: {
    userId: {
      email: "user@example.com",
      displayName: "John Doe",
      photoURL: "https://...",
      role: "premium", // free, premium, enterprise
      createdAt: Timestamp,
      updatedAt: Timestamp,
      settings: {
        theme: "dark",
        biometricEnabled: true,
        syncEnabled: true,
        backupFrequency: "daily"
      },
      subscription: {
        status: "active",
        plan: "premium",
        expiresAt: Timestamp,
        customerId: "stripe_customer_id"
      }
    }
  },
  
  // Accounts collection (2FA accounts)
  accounts: {
    accountId: {
      userId: "userId",
      issuer: "Google",
      accountName: "user@gmail.com",
      encryptedSecret: "encrypted_base32_secret",
      algorithm: "SHA1", // SHA1, SHA256, SHA512
      digits: 6, // 6 or 8
      period: 30, // seconds
      icon: "google",
      category: "work",
      tags: ["important", "email"],
      createdAt: Timestamp,
      updatedAt: Timestamp,
      lastUsed: Timestamp,
      backupCodes: ["encrypted_code1", "encrypted_code2"],
      notes: "encrypted_notes"
    }
  },
  
  // Devices collection
  devices: {
    deviceId: {
      userId: "userId",
      name: "iPhone 13 Pro",
      platform: "ios",
      deviceInfo: {
        model: "iPhone14,2",
        osVersion: "16.0",
        appVersion: "1.0.0"
      },
      pushToken: "fcm_token",
      lastSeen: Timestamp,
      createdAt: Timestamp,
      trusted: true
    }
  },
  
  // Sync sessions
  syncSessions: {
    sessionId: {
      userId: "userId",
      devices: ["deviceId1", "deviceId2"],
      status: "active", // active, completed, failed
      startedAt: Timestamp,
      completedAt: Timestamp,
      changes: {
        added: 5,
        updated: 2,
        deleted: 1
      }
    }
  },
  
  // Backups collection
  backups: {
    backupId: {
      userId: "userId",
      deviceId: "deviceId",
      encryptedData: "base64_encrypted_backup",
      checksum: "sha256_hash",
      size: 1024, // bytes
      accountCount: 25,
      createdAt: Timestamp,
      expiresAt: Timestamp,
      metadata: {
        version: "1.0.0",
        encryption: "AES-256-GCM"
      }
    }
  }
}
```

### 2. Security Rules

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    function isPremium() {
      return isAuthenticated() && 
        request.auth.token.role in ['premium', 'enterprise'];
    }
    
    function isValidAccount() {
      return request.resource.data.keys().hasAll(['issuer', 'accountName', 'encryptedSecret']) &&
        request.resource.data.algorithm in ['SHA1', 'SHA256', 'SHA512'] &&
        request.resource.data.digits in [6, 8] &&
        request.resource.data.period > 0;
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if isOwner(userId);
      allow create: if isOwner(userId);
      allow update: if isOwner(userId) && 
        !request.resource.data.diff(resource.data).affectedKeys().hasAny(['role', 'subscription']);
      allow delete: if false; // Soft delete only
    }
    
    // Accounts collection
    match /accounts/{accountId} {
      allow read: if isOwner(resource.data.userId);
      allow create: if isOwner(request.resource.data.userId) && 
        isValidAccount() &&
        (resource == null || resource.data.userId == request.auth.uid);
      allow update: if isOwner(resource.data.userId) && 
        isValidAccount() &&
        request.resource.data.userId == resource.data.userId;
      allow delete: if isOwner(resource.data.userId);
    }
    
    // Devices collection
    match /devices/{deviceId} {
      allow read: if isOwner(resource.data.userId);
      allow create: if isOwner(request.resource.data.userId);
      allow update: if isOwner(resource.data.userId);
      allow delete: if isOwner(resource.data.userId);
    }
    
    // Backups collection
    match /backups/{backupId} {
      allow read: if isOwner(resource.data.userId);
      allow create: if isOwner(request.resource.data.userId) && 
        isPremium(); // Only premium users can create backups
      allow update: if false; // Backups are immutable
      allow delete: if isOwner(resource.data.userId);
    }
    
    // Sync sessions
    match /syncSessions/{sessionId} {
      allow read: if isOwner(resource.data.userId);
      allow create: if isOwner(request.resource.data.userId);
      allow update: if isOwner(resource.data.userId) && 
        resource.data.status == 'active';
      allow delete: if false;
    }
  }
}
```

### 3. Indexes

```json
// firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "accounts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "updatedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "accounts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "category", "order": "ASCENDING" },
        { "fieldPath": "issuer", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "devices",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "lastSeen", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "backups",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

## Cloud Storage

### 1. Storage Structure

```
gs://2fa-studio-prod.appspot.com/
├── backups/
│   └── {userId}/
│       └── {backupId}.encrypted
├── exports/
│   └── {userId}/
│       └── {timestamp}_export.json
├── icons/
│   ├── services/
│   │   ├── google.png
│   │   ├── facebook.png
│   │   └── ...
│   └── custom/
│       └── {userId}/
│           └── {iconId}.png
└── temp/
    └── {sessionId}/
        └── transfer.data
```

### 2. Storage Rules

```javascript
// storage.rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    function isValidImage() {
      return request.resource.size < 5 * 1024 * 1024 && // 5MB limit
        request.resource.contentType.matches('image/.*');
    }
    
    function isValidBackup() {
      return request.resource.size < 50 * 1024 * 1024 && // 50MB limit
        request.resource.contentType == 'application/octet-stream';
    }
    
    // Backups
    match /backups/{userId}/{backupId} {
      allow read: if isOwner(userId);
      allow write: if isOwner(userId) && isValidBackup();
      allow delete: if isOwner(userId);
    }
    
    // Exports
    match /exports/{userId}/{exportFile} {
      allow read: if isOwner(userId);
      allow write: if isOwner(userId) && 
        request.resource.size < 10 * 1024 * 1024; // 10MB limit
      allow delete: if isOwner(userId);
    }
    
    // Service icons (public read)
    match /icons/services/{icon} {
      allow read: if true;
      allow write: if false; // Admin only
    }
    
    // Custom icons
    match /icons/custom/{userId}/{iconId} {
      allow read: if isOwner(userId);
      allow write: if isOwner(userId) && isValidImage();
      allow delete: if isOwner(userId);
    }
    
    // Temporary files
    match /temp/{sessionId}/{file} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && 
        request.resource.size < 5 * 1024 * 1024;
      allow delete: if isAuthenticated();
    }
  }
}
```

### 3. Storage Configuration

```javascript
// firebase/storage.config.js
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from './config';

const storage = getStorage(app);

// Configure storage settings
export const storageConfig = {
  maxUploadSize: 50 * 1024 * 1024, // 50MB
  allowedMimeTypes: {
    backup: ['application/octet-stream'],
    export: ['application/json'],
    icon: ['image/png', 'image/jpeg', 'image/webp']
  },
  cacheControl: {
    icons: 'public, max-age=31536000', // 1 year
    backups: 'private, max-age=0',
    exports: 'private, max-age=3600' // 1 hour
  }
};

// Upload with metadata
export async function uploadFile(path, file, metadata = {}) {
  const storageRef = ref(storage, path);
  
  const uploadMetadata = {
    contentType: file.type,
    customMetadata: {
      uploadedAt: new Date().toISOString(),
      ...metadata
    }
  };
  
  const snapshot = await uploadBytes(storageRef, file, uploadMetadata);
  return getDownloadURL(snapshot.ref);
}
```

## Cloud Functions

### 1. Function Structure

```typescript
// functions/src/index.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

// Auth triggers
export { onUserCreate } from './auth/onCreate';
export { onUserDelete } from './auth/onDelete';

// Firestore triggers
export { onAccountWrite } from './firestore/onAccountWrite';
export { onBackupCreate } from './firestore/onBackupCreate';

// HTTP functions
export { api } from './http/api';
export { backup } from './http/backup';
export { migrate } from './http/migrate';

// Scheduled functions
export { cleanupOldBackups } from './scheduled/cleanup';
export { generateUsageReports } from './scheduled/reports';
```

### 2. Key Functions Implementation

```typescript
// functions/src/auth/onCreate.ts
export const onUserCreate = functions.auth.user().onCreate(async (user) => {
  const db = admin.firestore();
  const batch = db.batch();
  
  // Create user document
  const userRef = db.collection('users').doc(user.uid);
  batch.set(userRef, {
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    role: 'free',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    settings: {
      theme: 'system',
      biometricEnabled: false,
      syncEnabled: true,
      autoLockMinutes: 5
    },
    limits: {
      maxAccounts: 10,
      maxDevices: 2,
      maxBackups: 5
    }
  });
  
  // Create welcome notification
  const notificationRef = db.collection('notifications').doc();
  batch.set(notificationRef, {
    userId: user.uid,
    type: 'welcome',
    title: 'Welcome to 2FA Studio!',
    message: 'Get started by adding your first 2FA account.',
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  await batch.commit();
  
  // Send welcome email
  await sendWelcomeEmail(user.email);
});

// functions/src/http/backup.ts
export const backup = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated'
    );
  }
  
  const userId = context.auth.uid;
  const { encryptedData, checksum } = data;
  
  // Verify user is premium
  const user = await admin.firestore()
    .collection('users')
    .doc(userId)
    .get();
    
  if (user.data()?.role === 'free') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Backup feature requires premium subscription'
    );
  }
  
  // Create backup document
  const backupRef = admin.firestore().collection('backups').doc();
  await backupRef.set({
    userId,
    deviceId: data.deviceId,
    encryptedData,
    checksum,
    size: Buffer.byteLength(encryptedData, 'base64'),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
    )
  });
  
  return { backupId: backupRef.id, success: true };
});

// functions/src/scheduled/cleanup.ts
export const cleanupOldBackups = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const db = admin.firestore();
    const storage = admin.storage();
    
    // Find expired backups
    const expiredBackups = await db
      .collection('backups')
      .where('expiresAt', '<', admin.firestore.Timestamp.now())
      .get();
    
    const batch = db.batch();
    const deletePromises: Promise<any>[] = [];
    
    expiredBackups.forEach((doc) => {
      // Delete Firestore document
      batch.delete(doc.ref);
      
      // Delete Storage file
      const backup = doc.data();
      const filePath = `backups/${backup.userId}/${doc.id}.encrypted`;
      deletePromises.push(
        storage.bucket().file(filePath).delete().catch(() => {
          // File might already be deleted
        })
      );
    });
    
    await Promise.all([
      batch.commit(),
      ...deletePromises
    ]);
    
    console.log(`Cleaned up ${expiredBackups.size} expired backups`);
  });
```

### 3. Function Configuration

```javascript
// functions/.env
SENDGRID_API_KEY=your_sendgrid_key
STRIPE_SECRET_KEY=your_stripe_key
GOOGLE_DRIVE_CLIENT_ID=your_client_id
GOOGLE_DRIVE_CLIENT_SECRET=your_client_secret
ENCRYPTION_KEY=your_encryption_key
```

```json
// functions/package.json
{
  "name": "2fa-studio-functions",
  "scripts": {
    "build": "tsc",
    "serve": "npm run build && firebase emulators:start --only functions",
    "shell": "npm run build && firebase functions:shell",
    "deploy": "firebase deploy --only functions",
    "logs": "firebase functions:log"
  },
  "engines": {
    "node": "18"
  },
  "dependencies": {
    "firebase-admin": "^11.9.0",
    "firebase-functions": "^4.4.0",
    "@sendgrid/mail": "^7.7.0",
    "stripe": "^12.0.0",
    "google-auth-library": "^8.8.0"
  },
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^5.59.0",
    "@typescript-eslint/parser": "^5.59.0",
    "eslint": "^8.42.0",
    "typescript": "^5.0.0"
  }
}
```

## Firebase Hosting

### 1. Hosting Configuration

```json
// firebase.json
{
  "hosting": {
    "public": "build",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "/api/**",
        "function": "api"
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(jpg|jpeg|gif|png|svg|webp)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      },
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      },
      {
        "source": "**",
        "headers": [
          {
            "key": "X-Frame-Options",
            "value": "SAMEORIGIN"
          },
          {
            "key": "X-Content-Type-Options",
            "value": "nosniff"
          },
          {
            "key": "Referrer-Policy",
            "value": "strict-origin-when-cross-origin"
          },
          {
            "key": "Permissions-Policy",
            "value": "camera=(), microphone=(), geolocation=()"
          }
        ]
      }
    ],
    "redirects": [
      {
        "source": "/help",
        "destination": "https://help.2fastudio.app",
        "type": 301
      }
    ]
  }
}
```

### 2. Deploy Configuration

```bash
# Deploy everything
firebase deploy

# Deploy specific services
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore:rules
firebase deploy --only storage:rules

# Deploy to specific project
firebase use production
firebase deploy --only hosting

# Preview channel deployment
firebase hosting:channel:deploy preview --expires 7d
```

## Environment Management

### 1. Multiple Environments

```bash
# Create projects for each environment
firebase projects:create 2fa-studio-dev
firebase projects:create 2fa-studio-staging
firebase projects:create 2fa-studio-prod

# Add aliases
firebase use --add
# Select 2fa-studio-dev, alias: development
# Select 2fa-studio-staging, alias: staging
# Select 2fa-studio-prod, alias: production

# Switch between environments
firebase use development
firebase use staging
firebase use production
```

### 2. Environment-Specific Config

```javascript
// src/firebase/environments.js
const environments = {
  development: {
    apiKey: "dev-api-key",
    authDomain: "2fa-studio-dev.firebaseapp.com",
    projectId: "2fa-studio-dev",
    storageBucket: "2fa-studio-dev.appspot.com",
    messagingSenderId: "dev-sender-id",
    appId: "dev-app-id"
  },
  staging: {
    apiKey: "staging-api-key",
    authDomain: "2fa-studio-staging.firebaseapp.com",
    projectId: "2fa-studio-staging",
    storageBucket: "2fa-studio-staging.appspot.com",
    messagingSenderId: "staging-sender-id",
    appId: "staging-app-id"
  },
  production: {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID
  }
};

export const firebaseConfig = environments[process.env.REACT_APP_ENVIRONMENT || 'development'];
```

## Security Best Practices

### 1. API Key Restrictions

```bash
# Restrict API keys in Google Cloud Console
1. Go to https://console.cloud.google.com/apis/credentials
2. Select your Firebase project
3. Click on each API key
4. Add restrictions:
   - Application restrictions: HTTP referrers
   - Website restrictions: 
     - https://2fastudio.app/*
     - https://*.2fastudio.app/*
   - API restrictions: Select specific APIs
```

### 2. App Check

```javascript
// Enable App Check for additional security
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider('your-recaptcha-site-key'),
  isTokenAutoRefreshEnabled: true
});
```

### 3. Security Monitoring

```javascript
// Monitor security rules violations
exports.monitorSecurityRules = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async (context) => {
    const { SecurityCenter } = require('@google-cloud/security-center');
    const client = new SecurityCenter.v1.SecurityCenterClient();
    
    // Check for security findings
    const [findings] = await client.listFindings({
      parent: `projects/${process.env.GCLOUD_PROJECT}/sources/-`,
      filter: 'category="FIREBASE_SECURITY_RULES_VIOLATION"'
    });
    
    if (findings.length > 0) {
      // Alert administrators
      await sendSecurityAlert(findings);
    }
  });
```

## Performance Optimization

### 1. Firestore Optimization

```javascript
// Use collection group queries efficiently
const userAccounts = await db
  .collectionGroup('accounts')
  .where('userId', '==', userId)
  .orderBy('updatedAt', 'desc')
  .limit(50)
  .get();

// Implement pagination
const firstPage = await db
  .collection('accounts')
  .where('userId', '==', userId)
  .orderBy('createdAt')
  .limit(25)
  .get();

const lastDoc = firstPage.docs[firstPage.docs.length - 1];

const secondPage = await db
  .collection('accounts')
  .where('userId', '==', userId)
  .orderBy('createdAt')
  .startAfter(lastDoc)
  .limit(25)
  .get();
```

### 2. Caching Strategy

```javascript
// Enable offline persistence
import { enableIndexedDbPersistence } from 'firebase/firestore';

enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    // Multiple tabs open, persistence can only be enabled in one tab at a time
  } else if (err.code === 'unimplemented') {
    // The current browser doesn't support persistence
  }
});

// Use memory cache for frequently accessed data
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getCachedUser(userId) {
  const cached = cache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const doc = await db.collection('users').doc(userId).get();
  const data = doc.data();
  
  cache.set(userId, {
    data,
    timestamp: Date.now()
  });
  
  return data;
}
```

## Monitoring and Debugging

### 1. Firebase Console Monitoring

- **Authentication**: Monitor user growth and auth methods
- **Firestore**: Track reads/writes and performance
- **Storage**: Monitor bandwidth and storage usage
- **Functions**: View execution logs and errors
- **Hosting**: Track bandwidth and requests

### 2. Custom Monitoring

```javascript
// Track custom metrics
import { getPerformance } from 'firebase/performance';

const perf = getPerformance();
const trace = perf.trace('loadUserAccounts');
trace.start();

// Your code here
const accounts = await loadAccounts();

trace.putMetric('accountCount', accounts.length);
trace.stop();
```

### 3. Error Tracking

```javascript
// Comprehensive error tracking
window.addEventListener('unhandledrejection', event => {
  console.error('Unhandled promise rejection:', event.reason);
  
  // Log to Firebase
  functions.logger.error('Unhandled rejection', {
    error: event.reason,
    stack: event.reason?.stack,
    url: window.location.href,
    userAgent: navigator.userAgent
  });
});
```

## Cost Optimization

### 1. Firestore Cost Reduction

- Use collection group queries sparingly
- Implement proper pagination
- Cache frequently accessed data
- Use aggregation queries when possible
- Archive old data to Cloud Storage

### 2. Storage Cost Management

```javascript
// Implement lifecycle rules
{
  "lifecycle": {
    "rule": [
      {
        "action": { "type": "Delete" },
        "condition": {
          "age": 90,
          "matchesPrefix": ["temp/"]
        }
      },
      {
        "action": { "type": "SetStorageClass", "storageClass": "ARCHIVE" },
        "condition": {
          "age": 30,
          "matchesPrefix": ["backups/"]
        }
      }
    ]
  }
}
```

### 3. Function Optimization

- Use minimum memory allocation
- Implement function timeouts
- Use scheduled functions for batch operations
- Avoid unnecessary function invocations

## Troubleshooting

### Common Issues

1. **Permission Denied Errors**
   - Check security rules
   - Verify authentication state
   - Review custom claims

2. **Function Timeouts**
   - Increase memory allocation
   - Optimize database queries
   - Use batch operations

3. **Storage Errors**
   - Check CORS configuration
   - Verify file size limits
   - Review storage rules

### Debug Commands

```bash
# View function logs
firebase functions:log --only functionName

# Test security rules
firebase emulators:start --only firestore
# Navigate to http://localhost:4000/firestore

# Export Firestore data
firebase firestore:export gs://backup-bucket/2024-01-15

# Test functions locally
firebase functions:shell
```