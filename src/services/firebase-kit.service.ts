/**
 * Enhanced Firebase Service using capacitor-firebase-kit v2.1.0
 * @module services/firebase-kit
 */

import { firebaseKit } from 'capacitor-firebase-kit';

// Define types since they're not exported with the expected names
interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

interface RemoteConfigValue {
  value: string;
  source: 'default' | 'remote' | 'static';
}
import { Capacitor } from '@capacitor/core';
import { auth, db, analytics, performance } from '@src/config/firebase';
import { UnifiedErrorService } from './unified-error.service';
import { UnifiedTrackingService } from './unified-tracking.service';

export interface FirebaseKitConfig extends FirebaseConfig {
  enableOfflineSync?: boolean;
  enablePerformanceMonitoring?: boolean;
  enableCrashlytics?: boolean;
  enableRemoteConfig?: boolean;
}

export class FirebaseKitService {
  private static kit: typeof firebaseKit;
  private static isInitialized = false;
  private static remoteConfigDefaults: Record<string, any> = {
    // Feature flags
    enable_social_login: true,
    enable_biometric_auth: true,
    enable_cloud_backup: true,
    enable_browser_extension: false,
    
    // Limits
    free_account_limit: 10,
    premium_account_limit: -1,
    backup_retention_days: 30,
    
    // Security
    max_login_attempts: 5,
    lockout_duration_minutes: 15,
    session_timeout_minutes: 60,
    
    // UI Configuration
    show_update_banner: true,
    show_premium_features: true,
    maintenance_mode: false,
    maintenance_message: 'We are currently performing maintenance. Please try again later.'
  };

  /**
   * Initialize Firebase Kit
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const config: FirebaseKitConfig = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
        measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
        
        // Enhanced features
        enableOfflineSync: true,
        enablePerformanceMonitoring: true,
        enableCrashlytics: Capacitor.isNativePlatform(),
        enableRemoteConfig: true
      };

      this.kit = firebaseKit;
      await this.kit.initialize?.();
      
      // Initialize Remote Config
      if (config.enableRemoteConfig) {
        await this.initializeRemoteConfig();
      }
      
      // Setup offline persistence
      if (config.enableOfflineSync) {
        await this.setupOfflineSync();
      }
      
      // Initialize Crashlytics
      if (config.enableCrashlytics && Capacitor.isNativePlatform()) {
        await this.initializeCrashlytics();
      }
      
      this.isInitialized = true;
    } catch (error) {
      await UnifiedErrorService.reportError(error as Error, {
        category: 'firebase',
        severity: 'high',
        metadata: { operation: 'firebase_kit_init' }
      });
    }
  }

  /**
   * Initialize Remote Config
   */
  private static async initializeRemoteConfig(): Promise<void> {
    try {
      await this.firebaseKit.remoteConfig.setDefaults(this.remoteConfigDefaults);
      await this.firebaseKit.remoteConfig.fetchAndActivate();
      
      // Set up listener for config updates
      this.firebaseKit.remoteConfig.onConfigUpdated(() => {
        console.log('Remote config updated');
        this.handleConfigUpdate();
      });
    } catch (error) {
      console.error('Failed to initialize remote config:', error);
    }
  }

  /**
   * Setup offline sync
   */
  private static async setupOfflineSync(): Promise<void> {
    try {
      await this.firebaseKit.firestore.enableOfflinePersistence({
        synchronizeTabs: true
      });
      
      // Monitor connection state
      this.firebaseKit.database.onConnectionStateChanged((connected) => {
        console.log('Firebase connection state:', connected ? 'connected' : 'disconnected');
        UnifiedTrackingService.trackEvent('connection_state_changed', {
          connected
        });
      });
    } catch (error) {
      console.error('Failed to setup offline sync:', error);
    }
  }

  /**
   * Initialize Crashlytics
   */
  private static async initializeCrashlytics(): Promise<void> {
    try {
      await this.firebaseKit.crashlytics.setCrashlyticsCollectionEnabled(true);
      
      // Set user identifier if authenticated
      if (auth.currentUser) {
        await this.setUserIdentifier(auth.currentUser.uid);
      }
    } catch (error) {
      console.error('Failed to initialize crashlytics:', error);
    }
  }

  /**
   * Get remote config value
   */
  static async getRemoteConfig<T = any>(key: string): Promise<T> {
    if (!this.isInitialized) await this.initialize();
    
    const value = await this.firebaseKit.remoteConfig.getValue(key);
    return value.value as T;
  }

  /**
   * Get all remote config values
   */
  static async getAllRemoteConfigs(): Promise<Record<string, RemoteConfigValue>> {
    if (!this.isInitialized) await this.initialize();
    
    return await this.firebaseKit.remoteConfig.getAll();
  }

  /**
   * Log custom event
   */
  static async logEvent(name: string, params?: Record<string, any>): Promise<void> {
    if (!this.isInitialized) await this.initialize();
    
    await this.firebaseKit.analytics.logEvent(name, params);
  }

  /**
   * Set user properties
   */
  static async setUserProperties(properties: Record<string, any>): Promise<void> {
    if (!this.isInitialized) await this.initialize();
    
    for (const [key, value] of Object.entries(properties)) {
      await this.firebaseKit.analytics.setUserProperty(key, value);
    }
  }

  /**
   * Set user identifier for crashlytics
   */
  static async setUserIdentifier(userId: string): Promise<void> {
    if (!this.isInitialized) await this.initialize();
    
    if (Capacitor.isNativePlatform()) {
      await this.firebaseKit.crashlytics.setUserId(userId);
    }
  }

  /**
   * Log crashlytics custom keys
   */
  static async setCrashlyticsCustomKeys(keys: Record<string, any>): Promise<void> {
    if (!this.isInitialized) await this.initialize();
    
    if (Capacitor.isNativePlatform()) {
      await this.firebaseKit.crashlytics.setCustomKeys(keys);
    }
  }

  /**
   * Record error in crashlytics
   */
  static async recordError(error: Error, metadata?: Record<string, any>): Promise<void> {
    if (!this.isInitialized) await this.initialize();
    
    if (Capacitor.isNativePlatform()) {
      await this.firebaseKit.crashlytics.recordException({
        message: error.message,
        stackTrace: error.stack,
        metadata
      });
    }
  }

  /**
   * Enable/disable performance monitoring
   */
  static async setPerformanceMonitoringEnabled(enabled: boolean): Promise<void> {
    if (!this.isInitialized) await this.initialize();
    
    await this.firebaseKit.performance.setPerformanceCollectionEnabled(enabled);
  }

  /**
   * Start custom trace
   */
  static async startTrace(name: string): Promise<() => Promise<void>> {
    if (!this.isInitialized) await this.initialize();
    
    const trace = await this.firebaseKit.performance.startTrace(name);
    
    return async () => {
      await trace.stop();
    };
  }

  /**
   * Handle config updates
   */
  private static handleConfigUpdate(): void {
    // Reload feature flags
    this.getRemoteConfig<boolean>('maintenance_mode').then(inMaintenance => {
      if (inMaintenance) {
        // Show maintenance mode UI
        this.getRemoteConfig<string>('maintenance_message').then(message => {
          console.log('Maintenance mode active:', message);
        });
      }
    });
  }

  /**
   * Check if feature is enabled
   */
  static async isFeatureEnabled(feature: string): Promise<boolean> {
    try {
      return await this.getRemoteConfig<boolean>(`enable_${feature}`);
    } catch {
      // Return default value if config not found
      return this.remoteConfigDefaults[`enable_${feature}`] || false;
    }
  }

  /**
   * Get configuration limit
   */
  static async getConfigLimit(limit: string): Promise<number> {
    try {
      return await this.getRemoteConfig<number>(`${limit}_limit`);
    } catch {
      // Return default value if config not found
      return this.remoteConfigDefaults[`${limit}_limit`] || 0;
    }
  }
}