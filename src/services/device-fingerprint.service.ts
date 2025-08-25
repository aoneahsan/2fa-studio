/**
 * Device Fingerprinting Service
 * Creates unique device fingerprints for enhanced security and device identification
 * @module services/device-fingerprint
 */

import { Device } from '@capacitor/device';
import { App } from '@capacitor/app';
import { Network } from '@capacitor/network';
import { MobileEncryptionService } from './mobile-encryption.service';
import { UnifiedTrackingService } from './unified-tracking.service';

export interface DeviceFingerprint {
  id: string;
  platformInfo: {
    platform: string;
    manufacturer?: string;
    model?: string;
    operatingSystem?: string;
    osVersion?: string;
    webViewVersion?: string;
  };
  hardwareInfo: {
    isVirtual?: boolean;
    memoryUsed?: number;
    diskFree?: number;
    diskTotal?: number;
    batteryLevel?: number;
  };
  screenInfo: {
    width: number;
    height: number;
    pixelRatio: number;
    colorDepth: number;
    orientation: string;
  };
  networkInfo: {
    connectionType?: string;
    carrier?: string;
  };
  browserInfo?: {
    userAgent: string;
    language: string;
    languages: string[];
    timezone: string;
    cookieEnabled: boolean;
    doNotTrack: boolean;
    platform: string;
    vendor?: string;
    plugins: string[];
    mimeTypes: string[];
  };
  securityFeatures: {
    isBiometricAvailable?: boolean;
    isPasscodeSet?: boolean;
    isScreenLockEnabled?: boolean;
    hasSecureElement?: boolean;
  };
  capabilities: {
    hasCamera: boolean;
    hasNFC: boolean;
    hasBluetooth: boolean;
    hasWifi: boolean;
    hasCellular: boolean;
    hasGPS: boolean;
    hasAccelerometer: boolean;
    hasGyroscope: boolean;
    hasCompass: boolean;
  };
  appInfo: {
    appId?: string;
    appName?: string;
    appVersion?: string;
    appBuild?: string;
    installDate?: Date;
    lastUpdateDate?: Date;
  };
  timestamp: Date;
  version: number;
}

export interface FingerprintValidationResult {
  isValid: boolean;
  confidence: number; // 0-100
  changes: {
    category: string;
    field: string;
    oldValue: any;
    newValue: any;
    severity: 'low' | 'medium' | 'high';
  }[];
  riskLevel: 'low' | 'medium' | 'high';
  recommendation: 'allow' | 'verify' | 'block';
}

const PROJECT_PREFIX = 'fa2s_';

export class DeviceFingerprintService {
  private static readonly FINGERPRINT_KEY = `${PROJECT_PREFIX}device_fingerprint`;
  private static readonly FINGERPRINT_HISTORY_KEY = `${PROJECT_PREFIX}fingerprint_history`;
  private static readonly VALIDATION_CONFIG_KEY = `${PROJECT_PREFIX}fingerprint_validation`;
  
  private static currentFingerprint: DeviceFingerprint | null = null;
  private static fingerprintHistory: DeviceFingerprint[] = [];
  private static validationConfig = {
    confidenceThreshold: 80,
    allowedChanges: {
      // Platform info changes (rare, high risk)
      platform: 'high',
      manufacturer: 'high',
      model: 'high',
      operatingSystem: 'medium',
      osVersion: 'low',
      
      // Hardware info changes
      memoryUsed: 'low',
      diskFree: 'low',
      diskTotal: 'medium',
      batteryLevel: 'low',
      
      // Screen info changes
      screenWidth: 'medium',
      screenHeight: 'medium',
      pixelRatio: 'high',
      colorDepth: 'high',
      
      // Network changes (common)
      connectionType: 'low',
      carrier: 'low',
      
      // Browser changes
      userAgent: 'medium',
      language: 'low',
      timezone: 'low',
      
      // Security features
      isBiometricAvailable: 'medium',
      isPasscodeSet: 'low',
      
      // App info
      appVersion: 'low',
      appBuild: 'low',
    },
    historyLimit: 10,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  };

  /**
   * Initialize the device fingerprinting service
   */
  static async initialize(): Promise<void> {
    try {
      await this.loadStoredData();
      await this.generateFingerprint();
      
      console.log('DeviceFingerprintService initialized', {
        fingerprintId: this.currentFingerprint?.id,
        historyCount: this.fingerprintHistory.length,
      });

      await UnifiedTrackingService.track('device_fingerprint_initialized', {
        platform: this.currentFingerprint?.platformInfo.platform,
        version: this.currentFingerprint?.version,
      });
    } catch (error) {
      console.error('Error initializing device fingerprint service:', error);
    }
  }

  /**
   * Generate device fingerprint
   */
  static async generateFingerprint(force = false): Promise<DeviceFingerprint> {
    try {
      // Get platform info
      const deviceInfo = await Device.getInfo();
      const batteryInfo = await Device.getBatteryInfo();
      const languageCode = await Device.getLanguageCode();

      // Get network info
      const networkStatus = await Network.getStatus();

      // Get app info
      let appInfo = {};
      try {
        const appInfoResult = await App.getInfo();
        appInfo = {
          appId: appInfoResult.id,
          appName: appInfoResult.name,
          appVersion: appInfoResult.version,
          appBuild: appInfoResult.build,
        };
      } catch (error) {
        console.warn('Could not get app info:', error);
      }

      // Get browser-specific info (if web platform)
      let browserInfo;
      if (typeof window !== 'undefined') {
        browserInfo = await this.getBrowserInfo();
      }

      // Get screen info
      const screenInfo = this.getScreenInfo();

      // Get hardware capabilities
      const capabilities = await this.getCapabilities();

      // Get security features
      const securityFeatures = await this.getSecurityFeatures();

      const fingerprint: DeviceFingerprint = {
        id: crypto.randomUUID(),
        platformInfo: {
          platform: deviceInfo.platform,
          manufacturer: deviceInfo.manufacturer,
          model: deviceInfo.model,
          operatingSystem: deviceInfo.operatingSystem,
          osVersion: deviceInfo.osVersion,
          webViewVersion: deviceInfo.webViewVersion,
        },
        hardwareInfo: {
          isVirtual: deviceInfo.isVirtual,
          memoryUsed: deviceInfo.memUsed,
          diskFree: deviceInfo.diskFree,
          diskTotal: deviceInfo.diskTotal,
          batteryLevel: batteryInfo.batteryLevel,
        },
        screenInfo,
        networkInfo: {
          connectionType: networkStatus.connectionType,
        },
        browserInfo,
        securityFeatures,
        capabilities,
        appInfo,
        timestamp: new Date(),
        version: 1,
      };

      // Generate stable fingerprint ID based on hardware characteristics
      const stableId = await this.generateStableId(fingerprint);
      fingerprint.id = stableId;

      // Update current fingerprint
      const oldFingerprint = this.currentFingerprint;
      this.currentFingerprint = fingerprint;

      // Add to history if significantly different
      if (!oldFingerprint || force || this.hasSignificantChanges(oldFingerprint, fingerprint)) {
        this.addToHistory(fingerprint);
      }

      await this.saveStoredData();

      await UnifiedTrackingService.track('device_fingerprint_generated', {
        fingerprintId: fingerprint.id,
        platform: fingerprint.platformInfo.platform,
        hasChanges: !!oldFingerprint && this.hasSignificantChanges(oldFingerprint, fingerprint),
      });

      return fingerprint;
    } catch (error) {
      console.error('Error generating device fingerprint:', error);
      throw error;
    }
  }

  /**
   * Validate device fingerprint against known fingerprints
   */
  static async validateFingerprint(
    fingerprintToValidate: DeviceFingerprint,
    knownFingerprints: DeviceFingerprint[] = []
  ): Promise<FingerprintValidationResult> {
    const allKnownFingerprints = [...this.fingerprintHistory, ...knownFingerprints];
    
    if (allKnownFingerprints.length === 0) {
      return {
        isValid: true,
        confidence: 100,
        changes: [],
        riskLevel: 'low',
        recommendation: 'allow',
      };
    }

    // Find the most similar fingerprint
    let bestMatch: DeviceFingerprint | null = null;
    let highestSimilarity = 0;

    for (const knownFingerprint of allKnownFingerprints) {
      const similarity = this.calculateSimilarity(fingerprintToValidate, knownFingerprint);
      if (similarity > highestSimilarity) {
        highestSimilarity = similarity;
        bestMatch = knownFingerprint;
      }
    }

    if (!bestMatch) {
      return {
        isValid: false,
        confidence: 0,
        changes: [],
        riskLevel: 'high',
        recommendation: 'block',
      };
    }

    // Analyze changes
    const changes = this.analyzeChanges(bestMatch, fingerprintToValidate);
    const riskLevel = this.calculateRiskLevel(changes);
    const confidence = Math.round(highestSimilarity * 100);

    let recommendation: 'allow' | 'verify' | 'block' = 'allow';
    if (confidence < this.validationConfig.confidenceThreshold) {
      recommendation = riskLevel === 'high' ? 'block' : 'verify';
    } else if (riskLevel === 'high') {
      recommendation = 'verify';
    }

    const result: FingerprintValidationResult = {
      isValid: confidence >= this.validationConfig.confidenceThreshold,
      confidence,
      changes,
      riskLevel,
      recommendation,
    };

    await UnifiedTrackingService.track('device_fingerprint_validated', {
      confidence,
      riskLevel,
      recommendation,
      changesCount: changes.length,
    });

    return result;
  }

  /**
   * Get current device fingerprint
   */
  static getCurrentFingerprint(): DeviceFingerprint | null {
    return this.currentFingerprint;
  }

  /**
   * Get fingerprint history
   */
  static getFingerprintHistory(): DeviceFingerprint[] {
    return [...this.fingerprintHistory];
  }

  /**
   * Clear fingerprint history
   */
  static async clearHistory(): Promise<void> {
    this.fingerprintHistory = [];
    await this.saveStoredData();
  }

  /**
   * Update validation configuration
   */
  static updateValidationConfig(config: Partial<typeof DeviceFingerprintService.validationConfig>): void {
    this.validationConfig = { ...this.validationConfig, ...config };
    localStorage.setItem(this.VALIDATION_CONFIG_KEY, JSON.stringify(this.validationConfig));
  }

  /**
   * Generate stable device ID based on hardware characteristics
   */
  private static async generateStableId(fingerprint: DeviceFingerprint): Promise<string> {
    // Use stable hardware characteristics that don't change frequently
    const stableData = {
      platform: fingerprint.platformInfo.platform,
      manufacturer: fingerprint.platformInfo.manufacturer,
      model: fingerprint.platformInfo.model,
      operatingSystem: fingerprint.platformInfo.operatingSystem,
      screenWidth: fingerprint.screenInfo.width,
      screenHeight: fingerprint.screenInfo.height,
      pixelRatio: fingerprint.screenInfo.pixelRatio,
      diskTotal: fingerprint.hardwareInfo.diskTotal,
      // Add browser-specific stable data for web
      ...(fingerprint.browserInfo && {
        platform: fingerprint.browserInfo.platform,
        vendor: fingerprint.browserInfo.vendor,
      }),
    };

    const stableString = JSON.stringify(stableData, Object.keys(stableData).sort());
    const encoder = new TextEncoder();
    const data = encoder.encode(stableString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
  }

  /**
   * Get browser-specific information
   */
  private static async getBrowserInfo() {
    if (typeof window === 'undefined') return undefined;

    const nav = window.navigator;
    
    return {
      userAgent: nav.userAgent,
      language: nav.language,
      languages: Array.from(nav.languages || []),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      cookieEnabled: nav.cookieEnabled,
      doNotTrack: nav.doNotTrack === '1',
      platform: nav.platform,
      vendor: nav.vendor,
      plugins: Array.from(nav.plugins || []).map(p => p.name).sort(),
      mimeTypes: Array.from(nav.mimeTypes || []).map(m => m.type).sort(),
    };
  }

  /**
   * Get screen information
   */
  private static getScreenInfo() {
    const screen = typeof window !== 'undefined' ? window.screen : null;
    
    return {
      width: screen?.width || 0,
      height: screen?.height || 0,
      pixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
      colorDepth: screen?.colorDepth || 24,
      orientation: screen?.orientation?.type || 'unknown',
    };
  }

  /**
   * Get device capabilities
   */
  private static async getCapabilities() {
    const capabilities = {
      hasCamera: false,
      hasNFC: false,
      hasBluetooth: false,
      hasWifi: false,
      hasCellular: false,
      hasGPS: false,
      hasAccelerometer: false,
      hasGyroscope: false,
      hasCompass: false,
    };

    if (typeof navigator !== 'undefined') {
      // Check for various APIs
      capabilities.hasCamera = 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;
      capabilities.hasNFC = 'nfc' in navigator;
      capabilities.hasBluetooth = 'bluetooth' in navigator;
      capabilities.hasWifi = 'connection' in navigator;
      capabilities.hasGPS = 'geolocation' in navigator;
      
      // Check for sensor APIs
      capabilities.hasAccelerometer = 'DeviceMotionEvent' in window;
      capabilities.hasGyroscope = 'DeviceOrientationEvent' in window;
      capabilities.hasCompass = 'DeviceOrientationEvent' in window;
    }

    return capabilities;
  }

  /**
   * Get security features information
   */
  private static async getSecurityFeatures() {
    const features = {
      isBiometricAvailable: false,
      isPasscodeSet: false,
      isScreenLockEnabled: false,
      hasSecureElement: false,
    };

    // These would be populated by actual security checks
    // For now, we'll leave them as defaults
    
    return features;
  }

  /**
   * Calculate similarity between two fingerprints
   */
  private static calculateSimilarity(fp1: DeviceFingerprint, fp2: DeviceFingerprint): number {
    const weights = {
      platformInfo: 0.3,
      hardwareInfo: 0.2,
      screenInfo: 0.2,
      browserInfo: 0.15,
      capabilities: 0.1,
      appInfo: 0.05,
    };

    let totalWeight = 0;
    let totalScore = 0;

    // Compare platform info
    const platformScore = this.comparePlatformInfo(fp1.platformInfo, fp2.platformInfo);
    totalScore += platformScore * weights.platformInfo;
    totalWeight += weights.platformInfo;

    // Compare hardware info
    const hardwareScore = this.compareHardwareInfo(fp1.hardwareInfo, fp2.hardwareInfo);
    totalScore += hardwareScore * weights.hardwareInfo;
    totalWeight += weights.hardwareInfo;

    // Compare screen info
    const screenScore = this.compareScreenInfo(fp1.screenInfo, fp2.screenInfo);
    totalScore += screenScore * weights.screenInfo;
    totalWeight += weights.screenInfo;

    // Compare browser info (if available)
    if (fp1.browserInfo && fp2.browserInfo) {
      const browserScore = this.compareBrowserInfo(fp1.browserInfo, fp2.browserInfo);
      totalScore += browserScore * weights.browserInfo;
      totalWeight += weights.browserInfo;
    }

    // Compare capabilities
    const capabilitiesScore = this.compareCapabilities(fp1.capabilities, fp2.capabilities);
    totalScore += capabilitiesScore * weights.capabilities;
    totalWeight += weights.capabilities;

    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  /**
   * Compare platform information
   */
  private static comparePlatformInfo(info1: any, info2: any): number {
    let score = 0;
    let count = 0;

    const fields = ['platform', 'manufacturer', 'model', 'operatingSystem'];
    for (const field of fields) {
      if (info1[field] && info2[field]) {
        score += info1[field] === info2[field] ? 1 : 0;
        count++;
      }
    }

    return count > 0 ? score / count : 0;
  }

  /**
   * Compare hardware information
   */
  private static compareHardwareInfo(info1: any, info2: any): number {
    let score = 0;
    let count = 0;

    // Binary fields
    const binaryFields = ['isVirtual'];
    for (const field of binaryFields) {
      if (info1[field] !== undefined && info2[field] !== undefined) {
        score += info1[field] === info2[field] ? 1 : 0;
        count++;
      }
    }

    // Numeric fields (with tolerance)
    const numericFields = [
      { field: 'diskTotal', tolerance: 0.1 },
      { field: 'memoryUsed', tolerance: 0.3 },
    ];
    
    for (const { field, tolerance } of numericFields) {
      if (info1[field] && info2[field]) {
        const diff = Math.abs(info1[field] - info2[field]) / Math.max(info1[field], info2[field]);
        score += diff <= tolerance ? 1 : 0;
        count++;
      }
    }

    return count > 0 ? score / count : 0;
  }

  /**
   * Compare screen information
   */
  private static compareScreenInfo(info1: any, info2: any): number {
    let score = 0;
    let count = 0;

    const exactFields = ['width', 'height', 'pixelRatio', 'colorDepth'];
    for (const field of exactFields) {
      if (info1[field] && info2[field]) {
        score += info1[field] === info2[field] ? 1 : 0;
        count++;
      }
    }

    return count > 0 ? score / count : 0;
  }

  /**
   * Compare browser information
   */
  private static compareBrowserInfo(info1: any, info2: any): number {
    let score = 0;
    let count = 0;

    const exactFields = ['platform', 'vendor', 'cookieEnabled'];
    for (const field of exactFields) {
      if (info1[field] !== undefined && info2[field] !== undefined) {
        score += info1[field] === info2[field] ? 1 : 0;
        count++;
      }
    }

    // Compare arrays
    const arrayFields = ['languages', 'plugins', 'mimeTypes'];
    for (const field of arrayFields) {
      if (info1[field] && info2[field]) {
        const similarity = this.compareArrays(info1[field], info2[field]);
        score += similarity;
        count++;
      }
    }

    return count > 0 ? score / count : 0;
  }

  /**
   * Compare capabilities
   */
  private static compareCapabilities(cap1: any, cap2: any): number {
    let score = 0;
    let count = 0;

    const fields = Object.keys(cap1);
    for (const field of fields) {
      if (cap1[field] !== undefined && cap2[field] !== undefined) {
        score += cap1[field] === cap2[field] ? 1 : 0;
        count++;
      }
    }

    return count > 0 ? score / count : 0;
  }

  /**
   * Compare arrays for similarity
   */
  private static compareArrays(arr1: any[], arr2: any[]): number {
    if (!Array.isArray(arr1) || !Array.isArray(arr2)) return 0;
    
    const set1 = new Set(arr1);
    const set2 = new Set(arr2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return union.size > 0 ? intersection.size / union.size : 1;
  }

  /**
   * Check if there are significant changes between fingerprints
   */
  private static hasSignificantChanges(old: DeviceFingerprint, current: DeviceFingerprint): boolean {
    const similarity = this.calculateSimilarity(old, current);
    return similarity < 0.9; // Consider 90% similarity threshold
  }

  /**
   * Analyze changes between fingerprints
   */
  private static analyzeChanges(
    oldFingerprint: DeviceFingerprint,
    newFingerprint: DeviceFingerprint
  ): Array<{
    category: string;
    field: string;
    oldValue: any;
    newValue: any;
    severity: 'low' | 'medium' | 'high';
  }> {
    const changes = [];

    // Platform info changes
    for (const [key, value] of Object.entries(newFingerprint.platformInfo)) {
      const oldValue = (oldFingerprint.platformInfo as any)[key];
      if (oldValue !== value && oldValue !== undefined) {
        changes.push({
          category: 'platform',
          field: key,
          oldValue,
          newValue: value,
          severity: this.getSeverity('platform', key),
        });
      }
    }

    // Hardware info changes
    for (const [key, value] of Object.entries(newFingerprint.hardwareInfo)) {
      const oldValue = (oldFingerprint.hardwareInfo as any)[key];
      if (oldValue !== value && oldValue !== undefined) {
        changes.push({
          category: 'hardware',
          field: key,
          oldValue,
          newValue: value,
          severity: this.getSeverity('hardware', key),
        });
      }
    }

    // Screen info changes
    for (const [key, value] of Object.entries(newFingerprint.screenInfo)) {
      const oldValue = (oldFingerprint.screenInfo as any)[key];
      if (oldValue !== value && oldValue !== undefined) {
        changes.push({
          category: 'screen',
          field: key,
          oldValue,
          newValue: value,
          severity: this.getSeverity('screen', key),
        });
      }
    }

    return changes;
  }

  /**
   * Get severity level for a field change
   */
  private static getSeverity(category: string, field: string): 'low' | 'medium' | 'high' {
    const key = `${category}_${field}`;
    const configuredSeverity = (this.validationConfig.allowedChanges as any)[key];
    return configuredSeverity || 'medium';
  }

  /**
   * Calculate risk level based on changes
   */
  private static calculateRiskLevel(changes: any[]): 'low' | 'medium' | 'high' {
    if (changes.length === 0) return 'low';

    const highSeverityCount = changes.filter(c => c.severity === 'high').length;
    const mediumSeverityCount = changes.filter(c => c.severity === 'medium').length;

    if (highSeverityCount > 0) return 'high';
    if (mediumSeverityCount > 2) return 'high';
    if (mediumSeverityCount > 0 || changes.length > 5) return 'medium';
    
    return 'low';
  }

  /**
   * Add fingerprint to history
   */
  private static addToHistory(fingerprint: DeviceFingerprint): void {
    this.fingerprintHistory.unshift(fingerprint);
    
    // Limit history size
    if (this.fingerprintHistory.length > this.validationConfig.historyLimit) {
      this.fingerprintHistory = this.fingerprintHistory.slice(0, this.validationConfig.historyLimit);
    }

    // Remove old fingerprints
    const maxAge = this.validationConfig.maxAge;
    const cutoffTime = Date.now() - maxAge;
    this.fingerprintHistory = this.fingerprintHistory.filter(
      fp => fp.timestamp.getTime() > cutoffTime
    );
  }

  /**
   * Load stored data
   */
  private static async loadStoredData(): Promise<void> {
    try {
      // Load current fingerprint
      const fingerprintStr = await MobileEncryptionService.secureGet(this.FINGERPRINT_KEY);
      if (fingerprintStr) {
        const storedFingerprint = JSON.parse(fingerprintStr);
        this.currentFingerprint = {
          ...storedFingerprint,
          timestamp: new Date(storedFingerprint.timestamp),
        };
      }

      // Load history
      const historyStr = await MobileEncryptionService.secureGet(this.FINGERPRINT_HISTORY_KEY);
      if (historyStr) {
        const storedHistory = JSON.parse(historyStr);
        this.fingerprintHistory = storedHistory.map((fp: any) => ({
          ...fp,
          timestamp: new Date(fp.timestamp),
        }));
      }

      // Load validation config
      const configStr = localStorage.getItem(this.VALIDATION_CONFIG_KEY);
      if (configStr) {
        const storedConfig = JSON.parse(configStr);
        this.validationConfig = { ...this.validationConfig, ...storedConfig };
      }
    } catch (error) {
      console.error('Error loading stored fingerprint data:', error);
    }
  }

  /**
   * Save stored data
   */
  private static async saveStoredData(): Promise<void> {
    try {
      // Save current fingerprint
      if (this.currentFingerprint) {
        await MobileEncryptionService.secureStore(
          this.FINGERPRINT_KEY,
          JSON.stringify(this.currentFingerprint)
        );
      }

      // Save history
      await MobileEncryptionService.secureStore(
        this.FINGERPRINT_HISTORY_KEY,
        JSON.stringify(this.fingerprintHistory)
      );
    } catch (error) {
      console.error('Error saving fingerprint data:', error);
    }
  }

  /**
   * Cleanup service
   */
  static cleanup(): void {
    this.currentFingerprint = null;
    this.fingerprintHistory = [];
  }
}