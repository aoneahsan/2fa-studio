/**
 * Firebase configuration
 * @module config/firebase
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getFunctions } from 'firebase/functions';
import { getPerformance } from 'firebase/performance';
import { createMockFirebaseApp, isMockFirebase } from './firebase-mock';

/**
 * Firebase configuration object
 * These values should be replaced with your actual Firebase project config
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ''
};

// Check if we should use mock Firebase
const useMockFirebase = isMockFirebase();

// Check if Firebase config is valid
const isFirebaseConfigured = firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== 'your_api_key_here' && 
  !useMockFirebase;

// Initialize Firebase or use mock
let app: any = null;
let auth: any = null;
let db: any = null;
let storage: any = null;
let functions: any = null;
let analytics: any = Promise.resolve(null);
let performance: any = null;

if (isFirebaseConfigured) {
  // Real Firebase initialization
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    functions = getFunctions(app);
    
    // Initialize Analytics conditionally (only in browser and when supported)
    analytics = isSupported().then(yes => yes ? getAnalytics(app) : null).catch(() => null);
    
    // Initialize Performance Monitoring
    performance = typeof window !== 'undefined' ? getPerformance(app) : null;
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    // Fall back to mock
    const mockApp = createMockFirebaseApp();
    auth = mockApp.auth();
    db = mockApp.firestore();
    storage = mockApp.storage();
    analytics = Promise.resolve(mockApp.analytics());
  }
} else if (useMockFirebase) {
  // Use mock Firebase for testing
  console.info('Using mock Firebase for testing/development');
  const mockApp = createMockFirebaseApp();
  auth = mockApp.auth();
  db = mockApp.firestore();
  storage = mockApp.storage();
  analytics = Promise.resolve(mockApp.analytics());
} else {
  console.warn('Firebase is not configured. Please add your Firebase configuration to the .env file.');
}

export { auth, db, storage, functions, analytics, performance };

export default app;