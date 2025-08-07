/**
 * Mock for capacitor-firebase-kit package
 */
import { vi } from 'vitest';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

export interface RemoteConfigValue {
  value: any;
  source: string;
}

export class FirebaseKit {
  remoteConfig = {
    setDefaults: vi.fn(),
    fetchAndActivate: vi.fn(),
    getValue: vi.fn(() => ({ value: true })),
    getAll: vi.fn(() => ({})),
    onConfigUpdated: vi.fn(),
  };

  firestore = {
    enableOfflinePersistence: vi.fn(),
  };

  database = {
    onConnectionStateChanged: vi.fn(),
  };

  crashlytics = {
    setCrashlyticsCollectionEnabled: vi.fn(),
    setUserId: vi.fn(),
    setCustomKeys: vi.fn(),
    recordException: vi.fn(),
  };

  analytics = {
    logEvent: vi.fn(),
    setUserProperty: vi.fn(),
  };

  performance = {
    setPerformanceCollectionEnabled: vi.fn(),
    startTrace: vi.fn(() => ({ stop: vi.fn() })),
  };

  constructor(config: FirebaseConfig) {}

  async init(): Promise<void> {
    // Mock implementation
  }
}