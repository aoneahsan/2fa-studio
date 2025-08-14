/**
 * Firebase Service
 * Core Firebase initialization and utilities
 * @module services/firebase
 */

import { initializeApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  Auth,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { 
  getFirestore, 
  Firestore,
  enableOfflineSupport,
  enableIndexedDbPersistence
} from 'firebase/firestore';
import { 
  getStorage, 
  FirebaseStorage 
} from 'firebase/storage';
import { 
  getFunctions, 
  Functions,
  connectFunctionsEmulator
} from 'firebase/functions';
import { 
  getAnalytics, 
  Analytics,
  isSupported as isAnalyticsSupported
} from 'firebase/analytics';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Firebase instances
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let firestore: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let functions: Functions | null = null;
let analytics: Analytics | null = null;

/**
 * Initialize Firebase services
 */
export const initializeFirebase = async (): Promise<void> => {
  try {
    // Initialize Firebase app
    app = initializeApp(firebaseConfig);
    
    // Initialize Auth
    auth = getAuth(app);
    
    // Initialize Firestore with offline support
    firestore = getFirestore(app);
    
    try {
      // Enable offline persistence for web
      await enableIndexedDbPersistence(firestore);
    } catch (err: any) {
      if (err.code === 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled in one tab at a time
        console.warn('Firebase persistence failed: Multiple tabs open');
      } else if (err.code === 'unimplemented') {
        // The current browser doesn't support persistence
        console.warn('Firebase persistence not supported in this browser');
      }
    }
    
    // Initialize Storage
    storage = getStorage(app);
    
    // Initialize Functions
    functions = getFunctions(app);
    
    // Connect to Functions emulator in development
    if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
      connectFunctionsEmulator(functions, 'localhost', 5001);
    }
    
    // Initialize Analytics (only if supported)
    const analyticsSupported = await isAnalyticsSupported();
    if (analyticsSupported) {
      analytics = getAnalytics(app);
    }
    
    console.log('Firebase initialized successfully');
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    throw error;
  }
};

/**
 * Get Firebase app instance
 */
export const getFirebaseApp = (): FirebaseApp => {
  if (!app) {
    throw new Error('Firebase not initialized. Call initializeFirebase() first.');
  }
  return app;
};

/**
 * Get Firebase Auth instance
 */
export const getFirebaseAuth = (): Auth => {
  if (!auth) {
    throw new Error('Firebase Auth not initialized. Call initializeFirebase() first.');
  }
  return auth;
};

/**
 * Get Firestore instance
 */
export const getFirebaseFirestore = (): Firestore => {
  if (!firestore) {
    throw new Error('Firestore not initialized. Call initializeFirebase() first.');
  }
  return firestore;
};

/**
 * Get Firebase Storage instance
 */
export const getFirebaseStorage = (): FirebaseStorage => {
  if (!storage) {
    throw new Error('Firebase Storage not initialized. Call initializeFirebase() first.');
  }
  return storage;
};

/**
 * Get Firebase Functions instance
 */
export const getFirebaseFunctions = (): Functions => {
  if (!functions) {
    throw new Error('Firebase Functions not initialized. Call initializeFirebase() first.');
  }
  return functions;
};

/**
 * Get Firebase Analytics instance
 */
export const getFirebaseAnalytics = (): Analytics | null => {
  return analytics;
};

/**
 * Subscribe to auth state changes
 */
export const onAuthStateChange = (callback: (user: User | null) => void): (() => void) => {
  const authInstance = getFirebaseAuth();
  return onAuthStateChanged(authInstance, callback);
};

/**
 * Check if Firebase is initialized
 */
export const isFirebaseInitialized = (): boolean => {
  return app !== null;
};

// Export Firebase types for use in other services
export type { 
  User,
  Auth,
  Firestore,
  FirebaseStorage,
  Functions,
  Analytics,
  FirebaseApp
} from 'firebase/app';

// Initialize Firebase on module load if config is available
if (firebaseConfig.apiKey && firebaseConfig.apiKey !== 'your_api_key_here') {
  initializeFirebase().catch(console.error);
}

export default {
  initializeFirebase,
  getFirebaseApp,
  getFirebaseAuth,
  getFirebaseFirestore,
  getFirebaseStorage,
  getFirebaseFunctions,
  getFirebaseAnalytics,
  onAuthStateChange,
  isFirebaseInitialized
};