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

// Check if Firebase config is valid
const isFirebaseConfigured = firebaseConfig.apiKey && firebaseConfig.apiKey !== 'your_api_key_here';

// Initialize Firebase only if configured
const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;

// Initialize Firebase services conditionally
export const auth = app ? getAuth(app) : null as any;
export const db = app ? getFirestore(app) : null as any;
export const storage = app ? getStorage(app) : null as any;
export const functions = app ? getFunctions(app) : null as any;

// Initialize Analytics conditionally (only in browser and when supported)
export const analytics = app ? isSupported().then(yes => yes ? getAnalytics(app) : null) : Promise.resolve(null);

// Initialize Performance Monitoring
export const performance = app && typeof window !== 'undefined' ? getPerformance(app) : null;

// Log warning if Firebase is not configured
if (!isFirebaseConfigured) {
  console.warn('Firebase is not configured. Please add your Firebase configuration to the .env file.');
}

export default app;