/**
 * Cross-Platform Sync Service
 * Provides unified sync interface across Web, iOS, Android, and Browser Extension platforms
 * @module services/cross-platform-sync
 */

import { AdvancedSyncService } from './advanced-sync.service';
import { BandwidthOptimizationService } from './bandwidth-optimization.service';
import { OfflineQueueService } from './offline-queue.service';
import { DeviceFingerprintService } from './device-fingerprint.service';
import { SyncAnalyticsService } from './sync-analytics.service';
import { DeviceService } from './device.service';
import { UnifiedTrackingService } from './unified-tracking.service';

export interface PlatformCapabilities {
  platform: 'web' | 'ios' | 'android' | 'extension';
  supportsBiometrics: boolean;
  supportsNotifications: boolean;
  supportsBackgroundSync: boolean;
  supportsOfflineStorage: boolean;
  supportsCompression: boolean;
  supportsEncryption: boolean;
  supportsPushNotifications: boolean;
  supportsFileSystem: boolean;
  supportsCamera: boolean;
  supportsClipboard: boolean;
  maxStorageSize: number; // in bytes
  networkingRestrictions: string[];
  securityFeatures: string[];
}

export interface PlatformAdapter {
  platform: 'web' | 'ios' | 'android' | 'extension';
  initialize(): Promise<void>;
  sync(data: any, options: any): Promise<any>;
  store(key: string, data: any): Promise<void>;
  retrieve(key: string): Promise<any>;
  delete(key: string): Promise<void>;
  notify(title: string, message: string, options?: any): Promise<void>;
  getCapabilities(): PlatformCapabilities;
  cleanup(): void;
}

export interface SyncConfiguration {
  enableRealTimeSync: boolean;
  enableBackgroundSync: boolean;
  enablePushNotifications: boolean;
  enableBiometricProtection: boolean;
  enableOfflineQueue: boolean;
  enableCompression: boolean;
  enableEncryption: boolean;
  syncIntervalMs: number;
  maxRetries: number;
  batchSize: number;
  platformSpecific: {
    web?: WebSyncConfig;
    ios?: MobileSyncConfig;
    android?: MobileSyncConfig;
    extension?: ExtensionSyncConfig;
  };
}

export interface WebSyncConfig {
  useServiceWorker: boolean;
  enablePersistentStorage: boolean;
  maxCacheSize: number;
  enableWebPush: boolean;
}

export interface MobileSyncConfig {
  useNativeStorage: boolean;
  enableBackgroundAppRefresh: boolean;
  enablePushNotifications: boolean;
  useBiometricAuth: boolean;
}

export interface ExtensionSyncConfig {
  useChromeStorage: boolean;
  enableBackgroundScript: boolean;
  maxStorageQuota: number;
  enableNativeMessaging: boolean;
}

const PROJECT_PREFIX = 'fa2s_';

export class CrossPlatformSyncService {
  private static currentPlatform: 'web' | 'ios' | 'android' | 'extension' = 'web';
  private static platformAdapter: PlatformAdapter | null = null;
  private static capabilities: PlatformCapabilities | null = null;
  private static syncConfiguration: SyncConfiguration = {
    enableRealTimeSync: true,
    enableBackgroundSync: true,
    enablePushNotifications: true,
    enableBiometricProtection: true,
    enableOfflineQueue: true,
    enableCompression: true,
    enableEncryption: true,
    syncIntervalMs: 30000,
    maxRetries: 3,
    batchSize: 50,
    platformSpecific: {},
  };

  /**
   * Initialize cross-platform sync service
   */
  static async initialize(userId: string, deviceId: string): Promise<void> {
    try {
      // Detect platform
      this.currentPlatform = this.detectPlatform();
      
      // Create platform adapter
      this.platformAdapter = this.createPlatformAdapter(this.currentPlatform);
      
      // Get platform capabilities
      this.capabilities = this.platformAdapter.getCapabilities();
      
      // Initialize platform adapter
      await this.platformAdapter.initialize();
      
      // Configure sync based on platform capabilities
      this.configureSyncForPlatform();
      
      // Initialize core sync services
      await this.initializeCoreServices(userId, deviceId);
      
      console.log('CrossPlatformSyncService initialized', {
        platform: this.currentPlatform,
        capabilities: this.capabilities,
        configuration: this.syncConfiguration,
      });

      await UnifiedTrackingService.track('cross_platform_sync_initialized', {
        platform: this.currentPlatform,
        capabilities: this.capabilities,
        userId,
        deviceId,
      });
    } catch (error) {
      console.error('Error initializing cross-platform sync service:', error);
      throw error;
    }
  }

  /**
   * Sync data across platforms
   */
  static async sync(
    type: 'account' | 'folder' | 'tag' | 'settings',
    data: any,
    operation: 'create' | 'update' | 'delete',
    options: {
      priority?: 'high' | 'medium' | 'low';
      forceSync?: boolean;
      metadata?: any;
    } = {}
  ): Promise<void> {
    if (!this.platformAdapter) {
      throw new Error('Platform adapter not initialized');
    }

    const startTime = Date.now();
    
    try {
      // Platform-specific data preparation
      const preparedData = await this.prepareDataForSync(type, data, operation);
      
      // Use platform adapter for sync
      await this.platformAdapter.sync(preparedData, {
        type,
        operation,
        ...options,
      });
      
      // Record analytics
      const duration = Date.now() - startTime;
      await SyncAnalyticsService.recordSyncMetrics(
        `${type}_${operation}`,
        duration,
        JSON.stringify(data).length,
        true,
        'current-user', // This should be passed from caller
        'current-device', // This should be passed from caller
        {
          retryCount: 0,
        }
      );

      await UnifiedTrackingService.track('cross_platform_sync_completed', {
        type,
        operation,
        platform: this.currentPlatform,
        duration,
        dataSize: JSON.stringify(data).length,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Record failed sync
      await SyncAnalyticsService.recordSyncMetrics(
        `${type}_${operation}`,
        duration,
        JSON.stringify(data).length,
        false,
        'current-user',
        'current-device',
        {
          errorMessage: error instanceof Error ? error.message : String(error),
        }
      );

      console.error('Cross-platform sync failed:', error);
      throw error;
    }
  }

  /**
   * Get current platform
   */
  static getCurrentPlatform(): 'web' | 'ios' | 'android' | 'extension' {
    return this.currentPlatform;
  }

  /**
   * Get platform capabilities
   */
  static getPlatformCapabilities(): PlatformCapabilities | null {
    return this.capabilities;
  }

  /**
   * Get sync configuration
   */
  static getSyncConfiguration(): SyncConfiguration {
    return { ...this.syncConfiguration };
  }

  /**
   * Update sync configuration
   */
  static updateSyncConfiguration(config: Partial<SyncConfiguration>): void {
    this.syncConfiguration = { ...this.syncConfiguration, ...config };
    this.applyConfigurationChanges();
  }

  /**
   * Detect current platform
   */
  private static detectPlatform(): 'web' | 'ios' | 'android' | 'extension' {
    // Check if running in browser extension
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
      return 'extension';
    }
    
    // Check if Capacitor is available (mobile)
    if (typeof window !== 'undefined' && (window as any).Capacitor) {
      const platform = (window as any).Capacitor.getPlatform();
      if (platform === 'ios' || platform === 'android') {
        return platform;
      }
    }
    
    // Default to web
    return 'web';
  }

  /**
   * Create platform-specific adapter
   */
  private static createPlatformAdapter(platform: 'web' | 'ios' | 'android' | 'extension'): PlatformAdapter {
    switch (platform) {
      case 'web':
        return new WebSyncAdapter();
      case 'ios':
        return new IOSSyncAdapter();
      case 'android':
        return new AndroidSyncAdapter();
      case 'extension':
        return new ExtensionSyncAdapter();
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  /**
   * Configure sync based on platform capabilities
   */
  private static configureSyncForPlatform(): void {
    if (!this.capabilities) return;

    // Adjust configuration based on capabilities
    this.syncConfiguration.enableCompression = this.capabilities.supportsCompression;
    this.syncConfiguration.enableEncryption = this.capabilities.supportsEncryption;
    this.syncConfiguration.enablePushNotifications = this.capabilities.supportsPushNotifications;
    this.syncConfiguration.enableBackgroundSync = this.capabilities.supportsBackgroundSync;
    
    // Platform-specific adjustments
    switch (this.currentPlatform) {
      case 'web':
        this.syncConfiguration.syncIntervalMs = 15000; // More frequent for web
        break;
      case 'ios':
      case 'android':
        this.syncConfiguration.enableBiometricProtection = this.capabilities.supportsBiometrics;
        this.syncConfiguration.syncIntervalMs = 60000; // Less frequent for mobile
        break;
      case 'extension':
        this.syncConfiguration.batchSize = 25; // Smaller batches for extension
        break;
    }
  }

  /**
   * Initialize core sync services
   */
  private static async initializeCoreServices(userId: string, deviceId: string): Promise<void> {
    const initPromises = [];

    // Always initialize these core services
    initPromises.push(AdvancedSyncService.initialize(userId));
    initPromises.push(DeviceService.registerDevice(userId));
    
    // Initialize based on capabilities
    if (this.capabilities?.supportsOfflineStorage) {
      initPromises.push(OfflineQueueService.initialize());
    }
    
    if (this.capabilities?.supportsCompression) {
      initPromises.push(BandwidthOptimizationService.initialize());
    }
    
    // Initialize device fingerprinting for security
    initPromises.push(DeviceFingerprintService.initialize());
    
    // Initialize analytics
    initPromises.push(SyncAnalyticsService.initialize(userId, deviceId));

    await Promise.all(initPromises);
  }

  /**
   * Prepare data for platform-specific sync
   */
  private static async prepareDataForSync(
    type: 'account' | 'folder' | 'tag' | 'settings',
    data: any,
    operation: 'create' | 'update' | 'delete'
  ): Promise<any> {
    let preparedData = data;

    // Apply bandwidth optimization if supported
    if (this.capabilities?.supportsCompression && this.syncConfiguration.enableCompression) {
      const optimized = await BandwidthOptimizationService.optimizeData(
        data,
        `${type}_${data.id || 'unknown'}`,
        { type, priority: 'medium' }
      );
      preparedData = optimized.optimizedData;
    }

    // Add platform-specific metadata
    preparedData = {
      ...preparedData,
      _platform: this.currentPlatform,
      _timestamp: new Date(),
      _operation: operation,
      _type: type,
    };

    return preparedData;
  }

  /**
   * Apply configuration changes
   */
  private static applyConfigurationChanges(): void {
    // Update AdvancedSyncService configuration
    AdvancedSyncService.updateSyncConfig({
      enableRealTime: this.syncConfiguration.enableRealTimeSync,
      enableCompression: this.syncConfiguration.enableCompression,
      enableDeltaSync: true,
      syncIntervalMs: this.syncConfiguration.syncIntervalMs,
      maxRetries: this.syncConfiguration.maxRetries,
    });

    // Update OfflineQueueService configuration
    OfflineQueueService.updateConfig({
      batchSize: this.syncConfiguration.batchSize,
      maxRetries: this.syncConfiguration.maxRetries,
    });
  }

  /**
   * Cleanup cross-platform sync service
   */
  static cleanup(): void {
    if (this.platformAdapter) {
      this.platformAdapter.cleanup();
      this.platformAdapter = null;
    }

    // Cleanup core services
    AdvancedSyncService.cleanup();
    OfflineQueueService.cleanup();
    BandwidthOptimizationService.cleanup();
    DeviceFingerprintService.cleanup();
    SyncAnalyticsService.cleanup();
  }
}

/**
 * Web Platform Adapter
 */
class WebSyncAdapter implements PlatformAdapter {
  platform: 'web' = 'web';

  async initialize(): Promise<void> {
    // Initialize web-specific features
    if ('serviceWorker' in navigator) {
      await this.registerServiceWorker();
    }
    
    // Request persistent storage if available
    if ('storage' in navigator && 'persist' in navigator.storage) {
      await navigator.storage.persist();
    }
  }

  async sync(data: any, options: any): Promise<any> {
    // Use AdvancedSyncService for web sync
    return await AdvancedSyncService.publishSyncEvent(
      `${options.type}_${options.operation}`,
      data,
      this.getPriority(options.priority)
    );
  }

  async store(key: string, data: any): Promise<void> {
    localStorage.setItem(`${PROJECT_PREFIX}${key}`, JSON.stringify(data));
  }

  async retrieve(key: string): Promise<any> {
    const stored = localStorage.getItem(`${PROJECT_PREFIX}${key}`);
    return stored ? JSON.parse(stored) : null;
  }

  async delete(key: string): Promise<void> {
    localStorage.removeItem(`${PROJECT_PREFIX}${key}`);
  }

  async notify(title: string, message: string, options: any = {}): Promise<void> {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body: message, ...options });
    }
  }

  getCapabilities(): PlatformCapabilities {
    return {
      platform: 'web',
      supportsBiometrics: 'credentials' in navigator && 'create' in navigator.credentials,
      supportsNotifications: 'Notification' in window,
      supportsBackgroundSync: 'serviceWorker' in navigator,
      supportsOfflineStorage: true,
      supportsCompression: 'CompressionStream' in window,
      supportsEncryption: 'crypto' in window && 'subtle' in window.crypto,
      supportsPushNotifications: 'PushManager' in window,
      supportsFileSystem: 'showOpenFilePicker' in window,
      supportsCamera: 'mediaDevices' in navigator,
      supportsClipboard: 'clipboard' in navigator,
      maxStorageSize: 50 * 1024 * 1024, // Estimate 50MB
      networkingRestrictions: ['cors', 'mixed-content'],
      securityFeatures: ['csp', 'same-origin', 'webauthn'],
    };
  }

  private async registerServiceWorker(): Promise<void> {
    try {
      await navigator.serviceWorker.register('/sw.js');
    } catch (error) {
      console.warn('Service worker registration failed:', error);
    }
  }

  private getPriority(priority?: string): number {
    switch (priority) {
      case 'high': return 1;
      case 'medium': return 2;
      case 'low': return 3;
      default: return 2;
    }
  }

  cleanup(): void {
    // Web-specific cleanup
  }
}

/**
 * iOS Platform Adapter
 */
class IOSSyncAdapter implements PlatformAdapter {
  platform: 'ios' = 'ios';

  async initialize(): Promise<void> {
    // Initialize iOS-specific features
    await this.setupBackgroundSync();
  }

  async sync(data: any, options: any): Promise<any> {
    // Use Capacitor plugins for iOS-specific sync
    return await AdvancedSyncService.publishSyncEvent(
      `${options.type}_${options.operation}`,
      data,
      this.getPriority(options.priority)
    );
  }

  async store(key: string, data: any): Promise<void> {
    // Use Capacitor secure storage
    const { MobileEncryptionService } = await import('./mobile-encryption.service');
    await MobileEncryptionService.secureStore(key, JSON.stringify(data));
  }

  async retrieve(key: string): Promise<any> {
    const { MobileEncryptionService } = await import('./mobile-encryption.service');
    const stored = await MobileEncryptionService.secureGet(key);
    return stored ? JSON.parse(stored) : null;
  }

  async delete(key: string): Promise<void> {
    const { MobileEncryptionService } = await import('./mobile-encryption.service');
    await MobileEncryptionService.secureRemove(key);
  }

  async notify(title: string, message: string, options: any = {}): Promise<void> {
    // Use Capacitor local notifications
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      await LocalNotifications.schedule({
        notifications: [{
          id: Date.now(),
          title,
          body: message,
          ...options,
        }],
      });
    } catch (error) {
      console.warn('Local notification failed:', error);
    }
  }

  getCapabilities(): PlatformCapabilities {
    return {
      platform: 'ios',
      supportsBiometrics: true,
      supportsNotifications: true,
      supportsBackgroundSync: true,
      supportsOfflineStorage: true,
      supportsCompression: false, // Limited on iOS
      supportsEncryption: true,
      supportsPushNotifications: true,
      supportsFileSystem: true,
      supportsCamera: true,
      supportsClipboard: true,
      maxStorageSize: 100 * 1024 * 1024, // 100MB
      networkingRestrictions: ['ats', 'background-limits'],
      securityFeatures: ['keychain', 'biometrics', 'app-transport-security'],
    };
  }

  private async setupBackgroundSync(): Promise<void> {
    // iOS-specific background sync setup
    try {
      const { BackgroundMode } = await import('@capacitor/background-mode');
      await BackgroundMode.enable();
    } catch (error) {
      console.warn('Background mode setup failed:', error);
    }
  }

  private getPriority(priority?: string): number {
    switch (priority) {
      case 'high': return 1;
      case 'medium': return 2;
      case 'low': return 3;
      default: return 2;
    }
  }

  cleanup(): void {
    // iOS-specific cleanup
  }
}

/**
 * Android Platform Adapter
 */
class AndroidSyncAdapter implements PlatformAdapter {
  platform: 'android' = 'android';

  async initialize(): Promise<void> {
    // Initialize Android-specific features
    await this.setupBackgroundSync();
  }

  async sync(data: any, options: any): Promise<any> {
    return await AdvancedSyncService.publishSyncEvent(
      `${options.type}_${options.operation}`,
      data,
      this.getPriority(options.priority)
    );
  }

  async store(key: string, data: any): Promise<void> {
    const { MobileEncryptionService } = await import('./mobile-encryption.service');
    await MobileEncryptionService.secureStore(key, JSON.stringify(data));
  }

  async retrieve(key: string): Promise<any> {
    const { MobileEncryptionService } = await import('./mobile-encryption.service');
    const stored = await MobileEncryptionService.secureGet(key);
    return stored ? JSON.parse(stored) : null;
  }

  async delete(key: string): Promise<void> {
    const { MobileEncryptionService } = await import('./mobile-encryption.service');
    await MobileEncryptionService.secureRemove(key);
  }

  async notify(title: string, message: string, options: any = {}): Promise<void> {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      await LocalNotifications.schedule({
        notifications: [{
          id: Date.now(),
          title,
          body: message,
          ...options,
        }],
      });
    } catch (error) {
      console.warn('Local notification failed:', error);
    }
  }

  getCapabilities(): PlatformCapabilities {
    return {
      platform: 'android',
      supportsBiometrics: true,
      supportsNotifications: true,
      supportsBackgroundSync: true,
      supportsOfflineStorage: true,
      supportsCompression: true,
      supportsEncryption: true,
      supportsPushNotifications: true,
      supportsFileSystem: true,
      supportsCamera: true,
      supportsClipboard: true,
      maxStorageSize: 200 * 1024 * 1024, // 200MB
      networkingRestrictions: ['doze-mode', 'background-limits'],
      securityFeatures: ['keystore', 'biometrics', 'app-signing'],
    };
  }

  private async setupBackgroundSync(): Promise<void> {
    // Android-specific background sync setup
    try {
      const { BackgroundMode } = await import('@capacitor/background-mode');
      await BackgroundMode.enable();
    } catch (error) {
      console.warn('Background mode setup failed:', error);
    }
  }

  private getPriority(priority?: string): number {
    switch (priority) {
      case 'high': return 1;
      case 'medium': return 2;
      case 'low': return 3;
      default: return 2;
    }
  }

  cleanup(): void {
    // Android-specific cleanup
  }
}

/**
 * Extension Platform Adapter
 */
class ExtensionSyncAdapter implements PlatformAdapter {
  platform: 'extension' = 'extension';

  async initialize(): Promise<void> {
    // Initialize extension-specific features
    await this.setupMessagePassing();
  }

  async sync(data: any, options: any): Promise<any> {
    // Use extension storage and messaging
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const key = `sync_${options.type}_${Date.now()}`;
      await chrome.storage.local.set({ [key]: { data, options, timestamp: Date.now() } });
      
      // Notify background script
      if (chrome.runtime) {
        chrome.runtime.sendMessage({
          type: 'sync_data',
          payload: { data, options },
        });
      }
    }
  }

  async store(key: string, data: any): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.local.set({ [`${PROJECT_PREFIX}${key}`]: data });
    }
  }

  async retrieve(key: string): Promise<any> {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const result = await chrome.storage.local.get([`${PROJECT_PREFIX}${key}`]);
      return result[`${PROJECT_PREFIX}${key}`] || null;
    }
    return null;
  }

  async delete(key: string): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.local.remove([`${PROJECT_PREFIX}${key}`]);
    }
  }

  async notify(title: string, message: string, options: any = {}): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.notifications) {
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: options.iconUrl || 'icon-48.png',
        title,
        message,
        ...options,
      });
    }
  }

  getCapabilities(): PlatformCapabilities {
    return {
      platform: 'extension',
      supportsBiometrics: false,
      supportsNotifications: typeof chrome !== 'undefined' && !!chrome.notifications,
      supportsBackgroundSync: true,
      supportsOfflineStorage: true,
      supportsCompression: 'CompressionStream' in window,
      supportsEncryption: 'crypto' in window && 'subtle' in window.crypto,
      supportsPushNotifications: false,
      supportsFileSystem: false,
      supportsCamera: false,
      supportsClipboard: false,
      maxStorageSize: 5 * 1024 * 1024, // 5MB limit for extensions
      networkingRestrictions: ['host-permissions', 'content-security-policy'],
      securityFeatures: ['isolated-world', 'content-scripts'],
    };
  }

  private async setupMessagePassing(): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'sync_response') {
          // Handle sync responses from background script
          console.log('Received sync response:', message.payload);
        }
      });
    }
  }

  private getPriority(priority?: string): number {
    switch (priority) {
      case 'high': return 1;
      case 'medium': return 2;
      case 'low': return 3;
      default: return 2;
    }
  }

  cleanup(): void {
    // Extension-specific cleanup
  }
}