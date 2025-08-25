/**
 * Bandwidth Optimization Service
 * Provides data compression, delta sync, and intelligent bandwidth management for sync operations
 * @module services/bandwidth-optimization
 */

import { MobileEncryptionService } from './mobile-encryption.service';
import { UnifiedTrackingService } from './unified-tracking.service';

export interface CompressionResult {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  algorithm: 'gzip' | 'deflate' | 'brotli' | 'lz4' | 'none';
  duration: number;
}

export interface DeltaSyncResult {
  hasChanges: boolean;
  deltaSize: number;
  fullSize: number;
  compressionRatio: number;
  operations: DeltaOperation[];
}

export interface DeltaOperation {
  type: 'add' | 'update' | 'delete' | 'move';
  path: string;
  oldValue?: any;
  newValue?: any;
  metadata?: {
    timestamp: Date;
    priority: number;
    size: number;
  };
}

export interface BandwidthProfile {
  type: 'high' | 'medium' | 'low' | 'critical';
  maxPayloadSize: number;
  compressionThreshold: number;
  enableDeltaSync: boolean;
  enableImageOptimization: boolean;
  enablePrefetching: boolean;
  batchSize: number;
  retryBackoff: number;
  prioritizeOperations: boolean;
}

export interface OptimizationStats {
  totalOriginalSize: number;
  totalOptimizedSize: number;
  totalSavings: number;
  averageCompressionRatio: number;
  deltaOperationsCount: number;
  fullSyncCount: number;
  optimizationTime: number;
  bandwidthProfile: string;
}

const PROJECT_PREFIX = 'fa2s_';

export class BandwidthOptimizationService {
  private static readonly DELTA_CACHE_KEY = `${PROJECT_PREFIX}delta_cache`;
  private static readonly OPTIMIZATION_STATS_KEY = `${PROJECT_PREFIX}optimization_stats`;
  private static readonly BANDWIDTH_PROFILE_KEY = `${PROJECT_PREFIX}bandwidth_profile`;

  private static deltaCache: Map<string, any> = new Map();
  private static compressionCache: Map<string, CompressionResult> = new Map();
  private static currentBandwidthProfile: BandwidthProfile = {
    type: 'high',
    maxPayloadSize: 10 * 1024 * 1024, // 10MB
    compressionThreshold: 1024, // 1KB
    enableDeltaSync: true,
    enableImageOptimization: true,
    enablePrefetching: true,
    batchSize: 50,
    retryBackoff: 1000,
    prioritizeOperations: true,
  };
  private static optimizationStats: OptimizationStats = {
    totalOriginalSize: 0,
    totalOptimizedSize: 0,
    totalSavings: 0,
    averageCompressionRatio: 0,
    deltaOperationsCount: 0,
    fullSyncCount: 0,
    optimizationTime: 0,
    bandwidthProfile: 'high',
  };

  // Bandwidth profiles for different network conditions
  private static readonly BANDWIDTH_PROFILES: Record<string, BandwidthProfile> = {
    high: {
      type: 'high',
      maxPayloadSize: 10 * 1024 * 1024, // 10MB
      compressionThreshold: 1024, // 1KB
      enableDeltaSync: true,
      enableImageOptimization: false, // Not needed on high bandwidth
      enablePrefetching: true,
      batchSize: 100,
      retryBackoff: 1000,
      prioritizeOperations: false,
    },
    medium: {
      type: 'medium',
      maxPayloadSize: 5 * 1024 * 1024, // 5MB
      compressionThreshold: 512, // 512B
      enableDeltaSync: true,
      enableImageOptimization: true,
      enablePrefetching: false,
      batchSize: 50,
      retryBackoff: 2000,
      prioritizeOperations: true,
    },
    low: {
      type: 'low',
      maxPayloadSize: 1024 * 1024, // 1MB
      compressionThreshold: 256, // 256B
      enableDeltaSync: true,
      enableImageOptimization: true,
      enablePrefetching: false,
      batchSize: 20,
      retryBackoff: 5000,
      prioritizeOperations: true,
    },
    critical: {
      type: 'critical',
      maxPayloadSize: 100 * 1024, // 100KB
      compressionThreshold: 128, // 128B
      enableDeltaSync: true,
      enableImageOptimization: true,
      enablePrefetching: false,
      batchSize: 5,
      retryBackoff: 10000,
      prioritizeOperations: true,
    },
  };

  /**
   * Initialize the bandwidth optimization service
   */
  static async initialize(): Promise<void> {
    try {
      await this.loadStoredData();
      await this.detectBandwidthConditions();
      
      // Monitor network changes
      if (typeof navigator !== 'undefined' && 'connection' in navigator) {
        const connection = (navigator as any).connection;
        connection.addEventListener('change', this.handleConnectionChange.bind(this));
        this.updateBandwidthProfile(connection);
      }

      console.log('BandwidthOptimizationService initialized', {
        profile: this.currentBandwidthProfile.type,
        deltaCacheSize: this.deltaCache.size,
        stats: this.optimizationStats,
      });

      await UnifiedTrackingService.track('bandwidth_optimization_initialized', {
        profile: this.currentBandwidthProfile.type,
        enableDeltaSync: this.currentBandwidthProfile.enableDeltaSync,
      });
    } catch (error) {
      console.error('Error initializing bandwidth optimization service:', error);
    }
  }

  /**
   * Optimize data for transmission
   */
  static async optimizeData(
    data: any,
    key: string,
    options: {
      forceFullSync?: boolean;
      priority?: 'high' | 'medium' | 'low';
      type?: 'account' | 'folder' | 'tag' | 'settings';
    } = {}
  ): Promise<{
    optimizedData: any;
    metadata: {
      originalSize: number;
      optimizedSize: number;
      compressionRatio: number;
      isDelta: boolean;
      operations: DeltaOperation[];
      algorithm: string;
      optimizationTime: number;
    };
  }> {
    const startTime = Date.now();
    const originalData = JSON.stringify(data);
    const originalSize = new TextEncoder().encode(originalData).length;

    let optimizedData = data;
    let isDelta = false;
    let operations: DeltaOperation[] = [];
    let compressionResult: CompressionResult | null = null;

    // Step 1: Delta Sync (if enabled and previous version exists)
    if (this.currentBandwidthProfile.enableDeltaSync && !options.forceFullSync) {
      const deltaResult = await this.calculateDelta(key, data);
      if (deltaResult.hasChanges && deltaResult.deltaSize < originalSize * 0.7) {
        // Use delta if it's at least 30% smaller
        optimizedData = {
          isDelta: true,
          operations: deltaResult.operations,
          checksum: await this.calculateChecksum(data),
        };
        isDelta = true;
        operations = deltaResult.operations;
        this.optimizationStats.deltaOperationsCount++;
      } else {
        this.optimizationStats.fullSyncCount++;
      }
    }

    // Step 2: Compression (if data is above threshold)
    const dataToCompress = JSON.stringify(optimizedData);
    const dataSize = new TextEncoder().encode(dataToCompress).length;
    
    if (dataSize >= this.currentBandwidthProfile.compressionThreshold) {
      compressionResult = await this.compressData(dataToCompress, key);
      if (compressionResult.compressionRatio > 0.1) { // At least 10% savings
        optimizedData = {
          compressed: true,
          algorithm: compressionResult.algorithm,
          data: compressionResult,
          metadata: optimizedData.isDelta ? optimizedData : undefined,
        };
      }
    }

    // Step 3: Update cache with current data
    this.deltaCache.set(key, data);

    // Calculate final sizes and stats
    const finalDataStr = JSON.stringify(optimizedData);
    const optimizedSize = new TextEncoder().encode(finalDataStr).length;
    const compressionRatio = (originalSize - optimizedSize) / originalSize;
    const optimizationTime = Date.now() - startTime;

    // Update stats
    this.updateOptimizationStats(originalSize, optimizedSize, optimizationTime);

    await UnifiedTrackingService.track('data_optimized', {
      originalSize,
      optimizedSize,
      compressionRatio,
      isDelta,
      operationsCount: operations.length,
      optimizationTime,
      type: options.type,
    });

    return {
      optimizedData,
      metadata: {
        originalSize,
        optimizedSize,
        compressionRatio,
        isDelta,
        operations,
        algorithm: compressionResult?.algorithm || 'none',
        optimizationTime,
      },
    };
  }

  /**
   * Restore optimized data to original format
   */
  static async restoreData(optimizedData: any, key: string): Promise<any> {
    try {
      let data = optimizedData;

      // Step 1: Decompress if needed
      if (data.compressed) {
        const decompressedStr = await this.decompressData(data.data);
        data = JSON.parse(decompressedStr);
        
        // If there was delta metadata, restore it
        if (data.metadata) {
          data = data.metadata;
        }
      }

      // Step 2: Apply delta operations if needed
      if (data.isDelta) {
        const baseData = this.deltaCache.get(key) || {};
        data = this.applyDeltaOperations(baseData, data.operations);
        
        // Verify checksum
        const calculatedChecksum = await this.calculateChecksum(data);
        if (calculatedChecksum !== data.checksum) {
          console.warn('Checksum mismatch detected, requesting full sync');
          throw new Error('Data integrity check failed');
        }
      }

      // Update cache with restored data
      this.deltaCache.set(key, data);
      
      return data;
    } catch (error) {
      console.error('Error restoring optimized data:', error);
      throw error;
    }
  }

  /**
   * Calculate delta between old and new data
   */
  private static async calculateDelta(key: string, newData: any): Promise<DeltaSyncResult> {
    const oldData = this.deltaCache.get(key);
    
    if (!oldData) {
      return {
        hasChanges: true,
        deltaSize: JSON.stringify(newData).length,
        fullSize: JSON.stringify(newData).length,
        compressionRatio: 0,
        operations: [
          {
            type: 'add',
            path: '',
            newValue: newData,
            metadata: {
              timestamp: new Date(),
              priority: 1,
              size: JSON.stringify(newData).length,
            },
          },
        ],
      };
    }

    const operations = this.generateDeltaOperations(oldData, newData);
    const deltaSize = JSON.stringify({ operations }).length;
    const fullSize = JSON.stringify(newData).length;

    return {
      hasChanges: operations.length > 0,
      deltaSize,
      fullSize,
      compressionRatio: (fullSize - deltaSize) / fullSize,
      operations,
    };
  }

  /**
   * Generate delta operations between old and new data
   */
  private static generateDeltaOperations(oldData: any, newData: any, path = ''): DeltaOperation[] {
    const operations: DeltaOperation[] = [];

    if (typeof oldData !== typeof newData) {
      operations.push({
        type: 'update',
        path,
        oldValue: oldData,
        newValue: newData,
        metadata: {
          timestamp: new Date(),
          priority: 1,
          size: JSON.stringify(newData).length,
        },
      });
      return operations;
    }

    if (Array.isArray(oldData) && Array.isArray(newData)) {
      // Handle array changes
      const maxLength = Math.max(oldData.length, newData.length);
      
      for (let i = 0; i < maxLength; i++) {
        const currentPath = `${path}[${i}]`;
        
        if (i >= oldData.length) {
          operations.push({
            type: 'add',
            path: currentPath,
            newValue: newData[i],
            metadata: {
              timestamp: new Date(),
              priority: 2,
              size: JSON.stringify(newData[i]).length,
            },
          });
        } else if (i >= newData.length) {
          operations.push({
            type: 'delete',
            path: currentPath,
            oldValue: oldData[i],
            metadata: {
              timestamp: new Date(),
              priority: 2,
              size: 0,
            },
          });
        } else if (JSON.stringify(oldData[i]) !== JSON.stringify(newData[i])) {
          operations.push(...this.generateDeltaOperations(oldData[i], newData[i], currentPath));
        }
      }
    } else if (typeof oldData === 'object' && oldData !== null && newData !== null) {
      // Handle object changes
      const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
      
      for (const key of allKeys) {
        const currentPath = path ? `${path}.${key}` : key;
        
        if (!(key in oldData)) {
          operations.push({
            type: 'add',
            path: currentPath,
            newValue: newData[key],
            metadata: {
              timestamp: new Date(),
              priority: 2,
              size: JSON.stringify(newData[key]).length,
            },
          });
        } else if (!(key in newData)) {
          operations.push({
            type: 'delete',
            path: currentPath,
            oldValue: oldData[key],
            metadata: {
              timestamp: new Date(),
              priority: 2,
              size: 0,
            },
          });
        } else if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
          operations.push(...this.generateDeltaOperations(oldData[key], newData[key], currentPath));
        }
      }
    } else if (oldData !== newData) {
      operations.push({
        type: 'update',
        path,
        oldValue: oldData,
        newValue: newData,
        metadata: {
          timestamp: new Date(),
          priority: 1,
          size: JSON.stringify(newData).length,
        },
      });
    }

    return operations;
  }

  /**
   * Apply delta operations to base data
   */
  private static applyDeltaOperations(baseData: any, operations: DeltaOperation[]): any {
    let result = JSON.parse(JSON.stringify(baseData)); // Deep clone

    for (const operation of operations) {
      try {
        result = this.applyDeltaOperation(result, operation);
      } catch (error) {
        console.error('Error applying delta operation:', operation, error);
        throw error;
      }
    }

    return result;
  }

  /**
   * Apply single delta operation
   */
  private static applyDeltaOperation(data: any, operation: DeltaOperation): any {
    if (!operation.path) {
      // Root level change
      switch (operation.type) {
        case 'add':
        case 'update':
          return operation.newValue;
        case 'delete':
          return undefined;
        default:
          return data;
      }
    }

    const pathParts = this.parsePath(operation.path);
    const target = this.getNestedValue(data, pathParts.slice(0, -1));
    const lastKey = pathParts[pathParts.length - 1];

    if (!target) {
      console.warn('Cannot apply delta operation: path not found', operation.path);
      return data;
    }

    switch (operation.type) {
      case 'add':
      case 'update':
        if (Array.isArray(target) && typeof lastKey === 'number') {
          target[lastKey] = operation.newValue;
        } else {
          target[lastKey] = operation.newValue;
        }
        break;
      case 'delete':
        if (Array.isArray(target) && typeof lastKey === 'number') {
          target.splice(lastKey, 1);
        } else {
          delete target[lastKey];
        }
        break;
    }

    return data;
  }

  /**
   * Parse path string into array of keys
   */
  private static parsePath(path: string): (string | number)[] {
    return path.split('.').flatMap(part => {
      const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
      if (arrayMatch) {
        return [arrayMatch[1], parseInt(arrayMatch[2])];
      }
      return [part];
    }).filter(key => key !== '');
  }

  /**
   * Get nested value from object using path
   */
  private static getNestedValue(obj: any, path: (string | number)[]): any {
    return path.reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Compress data using best available algorithm
   */
  private static async compressData(data: string, key?: string): Promise<CompressionResult> {
    const startTime = Date.now();
    const originalSize = new TextEncoder().encode(data).length;
    
    // Check cache first
    if (key && this.compressionCache.has(key)) {
      const cached = this.compressionCache.get(key)!;
      if (cached.originalSize === originalSize) {
        return cached;
      }
    }

    let bestResult: CompressionResult = {
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 0,
      algorithm: 'none',
      duration: Date.now() - startTime,
    };

    // Try different compression algorithms
    const algorithms = this.getAvailableCompressionAlgorithms();
    
    for (const algorithm of algorithms) {
      try {
        const compressedData = await this.compressWith(data, algorithm);
        const compressedSize = compressedData.length;
        const compressionRatio = (originalSize - compressedSize) / originalSize;
        
        if (compressionRatio > bestResult.compressionRatio) {
          bestResult = {
            originalSize,
            compressedSize,
            compressionRatio,
            algorithm,
            duration: Date.now() - startTime,
          };
        }
      } catch (error) {
        console.warn(`Compression with ${algorithm} failed:`, error);
      }
    }

    // Cache the result
    if (key && bestResult.compressionRatio > 0.1) {
      this.compressionCache.set(key, bestResult);
      
      // Limit cache size
      if (this.compressionCache.size > 100) {
        const oldestKey = this.compressionCache.keys().next().value;
        this.compressionCache.delete(oldestKey);
      }
    }

    return bestResult;
  }

  /**
   * Get available compression algorithms
   */
  private static getAvailableCompressionAlgorithms(): ('gzip' | 'deflate' | 'brotli')[] {
    const algorithms: ('gzip' | 'deflate' | 'brotli')[] = [];
    
    if ('CompressionStream' in window) {
      algorithms.push('gzip', 'deflate');
      
      // Check if Brotli is available
      try {
        new CompressionStream('br');
        algorithms.push('brotli');
      } catch {
        // Brotli not available
      }
    }
    
    return algorithms;
  }

  /**
   * Compress with specific algorithm
   */
  private static async compressWith(data: string, algorithm: 'gzip' | 'deflate' | 'brotli'): Promise<Uint8Array> {
    if (!('CompressionStream' in window)) {
      throw new Error('CompressionStream not available');
    }

    const algorithmMap = {
      gzip: 'gzip',
      deflate: 'deflate',
      brotli: 'br',
    };

    const stream = new CompressionStream(algorithmMap[algorithm]);
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();

    writer.write(new TextEncoder().encode(data));
    writer.close();

    const chunks = [];
    let done = false;

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) {
        chunks.push(value);
      }
    }

    // Combine chunks
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;

    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return result;
  }

  /**
   * Decompress data
   */
  private static async decompressData(compressedData: CompressionResult): Promise<string> {
    if (!('DecompressionStream' in window)) {
      throw new Error('DecompressionStream not available');
    }

    if (compressedData.algorithm === 'none') {
      return JSON.stringify(compressedData);
    }

    const algorithmMap = {
      gzip: 'gzip',
      deflate: 'deflate',
      brotli: 'br',
    };

    const stream = new DecompressionStream(algorithmMap[compressedData.algorithm]);
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();

    // Convert back to Uint8Array if needed
    const compressedBytes = typeof compressedData === 'string' 
      ? new TextEncoder().encode(compressedData)
      : compressedData as any;

    writer.write(compressedBytes);
    writer.close();

    const chunks = [];
    let done = false;

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) {
        chunks.push(value);
      }
    }

    // Combine chunks and decode
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;

    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return new TextDecoder().decode(result);
  }

  /**
   * Calculate checksum for data integrity
   */
  private static async calculateChecksum(data: any): Promise<string> {
    const jsonStr = JSON.stringify(data, Object.keys(data).sort());
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(jsonStr);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
  }

  /**
   * Detect and update bandwidth conditions
   */
  private static async detectBandwidthConditions(): Promise<void> {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      this.updateBandwidthProfile(connection);
    } else {
      // Fallback: Use simple network test
      await this.performBandwidthTest();
    }
  }

  /**
   * Update bandwidth profile based on connection
   */
  private static updateBandwidthProfile(connection: any): void {
    let profileType: keyof typeof BandwidthOptimizationService.BANDWIDTH_PROFILES = 'high';

    if (connection.effectiveType) {
      switch (connection.effectiveType) {
        case 'slow-2g':
          profileType = 'critical';
          break;
        case '2g':
          profileType = 'low';
          break;
        case '3g':
          profileType = 'medium';
          break;
        case '4g':
        default:
          profileType = 'high';
          break;
      }
    }

    // Consider other factors
    if (connection.saveData) {
      profileType = profileType === 'high' ? 'medium' : 'low';
    }

    if (connection.downlink && connection.downlink < 1.0) {
      profileType = 'low';
    }

    this.setBandwidthProfile(profileType);
  }

  /**
   * Perform simple bandwidth test
   */
  private static async performBandwidthTest(): Promise<void> {
    try {
      const startTime = Date.now();
      const testUrl = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; // 1x1 pixel
      
      await fetch(testUrl, { cache: 'no-cache' });
      
      const duration = Date.now() - startTime;
      
      // Simple heuristic based on response time
      let profileType: keyof typeof BandwidthOptimizationService.BANDWIDTH_PROFILES = 'high';
      if (duration > 2000) {
        profileType = 'critical';
      } else if (duration > 1000) {
        profileType = 'low';
      } else if (duration > 500) {
        profileType = 'medium';
      }
      
      this.setBandwidthProfile(profileType);
    } catch (error) {
      console.warn('Bandwidth test failed, using default profile:', error);
      this.setBandwidthProfile('medium');
    }
  }

  /**
   * Set bandwidth profile
   */
  private static setBandwidthProfile(profileType: keyof typeof BandwidthOptimizationService.BANDWIDTH_PROFILES): void {
    const newProfile = this.BANDWIDTH_PROFILES[profileType];
    
    if (JSON.stringify(newProfile) !== JSON.stringify(this.currentBandwidthProfile)) {
      console.log(`Bandwidth profile changed: ${this.currentBandwidthProfile.type} -> ${profileType}`);
      this.currentBandwidthProfile = { ...newProfile };
      this.optimizationStats.bandwidthProfile = profileType;
      
      // Save to storage
      localStorage.setItem(this.BANDWIDTH_PROFILE_KEY, JSON.stringify(this.currentBandwidthProfile));
      
      UnifiedTrackingService.track('bandwidth_profile_changed', {
        from: this.currentBandwidthProfile.type,
        to: profileType,
        maxPayloadSize: newProfile.maxPayloadSize,
        enableDeltaSync: newProfile.enableDeltaSync,
      });
    }
  }

  /**
   * Handle connection change
   */
  private static handleConnectionChange(): void {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      this.updateBandwidthProfile(connection);
    }
  }

  /**
   * Update optimization statistics
   */
  private static updateOptimizationStats(originalSize: number, optimizedSize: number, optimizationTime: number): void {
    this.optimizationStats.totalOriginalSize += originalSize;
    this.optimizationStats.totalOptimizedSize += optimizedSize;
    this.optimizationStats.totalSavings += (originalSize - optimizedSize);
    this.optimizationStats.optimizationTime += optimizationTime;
    
    if (this.optimizationStats.totalOriginalSize > 0) {
      this.optimizationStats.averageCompressionRatio = 
        this.optimizationStats.totalSavings / this.optimizationStats.totalOriginalSize;
    }

    // Save stats periodically
    if (Math.random() < 0.1) { // 10% chance to save
      this.saveOptimizationStats();
    }
  }

  /**
   * Get current bandwidth profile
   */
  static getBandwidthProfile(): BandwidthProfile {
    return { ...this.currentBandwidthProfile };
  }

  /**
   * Get optimization statistics
   */
  static getOptimizationStats(): OptimizationStats {
    return { ...this.optimizationStats };
  }

  /**
   * Clear delta cache
   */
  static clearDeltaCache(): void {
    this.deltaCache.clear();
    this.compressionCache.clear();
  }

  /**
   * Storage operations
   */
  private static async loadStoredData(): Promise<void> {
    try {
      // Load bandwidth profile
      const profileStr = localStorage.getItem(this.BANDWIDTH_PROFILE_KEY);
      if (profileStr) {
        this.currentBandwidthProfile = JSON.parse(profileStr);
      }

      // Load optimization stats
      const statsStr = await MobileEncryptionService.secureGet(this.OPTIMIZATION_STATS_KEY);
      if (statsStr) {
        this.optimizationStats = JSON.parse(statsStr);
      }

      // Load delta cache (recent items only)
      const cacheStr = await MobileEncryptionService.secureGet(this.DELTA_CACHE_KEY);
      if (cacheStr) {
        const cacheData = JSON.parse(cacheStr);
        this.deltaCache = new Map(Object.entries(cacheData));
      }
    } catch (error) {
      console.error('Error loading bandwidth optimization data:', error);
    }
  }

  private static async saveOptimizationStats(): Promise<void> {
    try {
      await MobileEncryptionService.secureStore(
        this.OPTIMIZATION_STATS_KEY,
        JSON.stringify(this.optimizationStats)
      );

      // Save delta cache (limit size)
      const cacheEntries = Array.from(this.deltaCache.entries()).slice(-50); // Keep last 50 items
      const cacheObject = Object.fromEntries(cacheEntries);
      await MobileEncryptionService.secureStore(
        this.DELTA_CACHE_KEY,
        JSON.stringify(cacheObject)
      );
    } catch (error) {
      console.error('Error saving optimization stats:', error);
    }
  }

  /**
   * Cleanup and shutdown
   */
  static cleanup(): void {
    this.saveOptimizationStats();
    this.deltaCache.clear();
    this.compressionCache.clear();
    
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      connection.removeEventListener('change', this.handleConnectionChange.bind(this));
    }
  }
}