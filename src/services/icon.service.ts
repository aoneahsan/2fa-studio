/**
 * Comprehensive Icon Service
 * Main service for icon management, fetching, caching, and analytics
 */

import { 
  ServiceIcon, 
  CustomIcon, 
  IconSearchQuery, 
  IconSearchResult, 
  IconCache, 
  IconEvent, 
  IconSystemConfig,
  IconFormat,
  IconSize,
  IconTheme,
  IconCategory,
  IconError,
  IconVersionInfo,
  Platform
} from '@/types/icon';
import { IconDatabase } from '@/data/icon-database';
import { IconValidator, IconProcessor, IconUtils, IconQualityAssessor, IconSearchUtils } from '@/utils/icon-utils';
import { EncryptionService } from './encryption.service';
import { FirestoreService } from './firestore.service';
import { UnifiedTrackingService } from './unified-tracking.service';
import { UnifiedErrorService } from './unified-error.service';
import { StorageService } from './storage.service';

/**
 * Icon Caching Service
 */
class IconCacheService {
  private cache: Map<string, IconCache> = new Map();
  private readonly maxCacheSize: number;
  private readonly defaultTTL: number;

  constructor(maxSize: number = 100 * 1024 * 1024, ttl: number = 24 * 60 * 60 * 1000) {
    this.maxCacheSize = maxSize;
    this.defaultTTL = ttl;
    this.loadCacheFromStorage();
  }

  /**
   * Get cached icon
   */
  async get(key: string): Promise<string | null> {
    const cached = this.cache.get(key);
    
    if (!cached) {
      await this.trackCacheEvent('cache-miss', key);
      return null;
    }
    
    // Check expiration
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      await this.saveCacheToStorage();
      await this.trackCacheEvent('cache-expired', key);
      return null;
    }
    
    // Update access stats
    cached.accessCount++;
    cached.lastAccessed = Date.now();
    
    await this.trackCacheEvent('cache-hit', key);
    return cached.data;
  }

  /**
   * Set cached icon
   */
  async set(key: string, data: string, metadata?: Partial<IconCache['metadata']>): Promise<void> {
    // Check if we need to free up space
    await this.ensureSpace(data.length);
    
    const cache: IconCache = {
      key,
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.defaultTTL,
      size: data.length,
      accessCount: 1,
      lastAccessed: Date.now(),
      metadata: {
        originalUrl: '',
        contentType: 'image/png',
        headers: {},
        ...metadata
      }
    };
    
    this.cache.set(key, cache);
    await this.saveCacheToStorage();
    await this.trackCacheEvent('cache-set', key);
  }

  /**
   * Clear cache
   */
  async clear(): Promise<void> {
    this.cache.clear();
    await StorageService.remove('icon-cache');
    await this.trackCacheEvent('cache-clear', 'all');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalSize: number;
    itemCount: number;
    hitRate: number;
    oldestItem: number;
    newestItem: number;
  } {
    let totalSize = 0;
    let totalAccess = 0;
    let oldestItem = Date.now();
    let newestItem = 0;
    
    for (const cached of this.cache.values()) {
      totalSize += cached.size;
      totalAccess += cached.accessCount;
      oldestItem = Math.min(oldestItem, cached.timestamp);
      newestItem = Math.max(newestItem, cached.timestamp);
    }
    
    return {
      totalSize,
      itemCount: this.cache.size,
      hitRate: totalAccess > 0 ? (totalAccess / this.cache.size) : 0,
      oldestItem,
      newestItem
    };
  }

  /**
   * Ensure cache has space for new item
   */
  private async ensureSpace(requiredSize: number): Promise<void> {
    const currentSize = this.getCurrentCacheSize();
    
    if (currentSize + requiredSize <= this.maxCacheSize) {
      return;
    }
    
    // Remove least recently used items
    const sortedEntries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    
    let freedSize = 0;
    for (const [key, cached] of sortedEntries) {
      this.cache.delete(key);
      freedSize += cached.size;
      
      if (currentSize + requiredSize - freedSize <= this.maxCacheSize) {
        break;
      }
    }
    
    await this.saveCacheToStorage();
  }

  /**
   * Get current cache size
   */
  private getCurrentCacheSize(): number {
    return Array.from(this.cache.values())
      .reduce((total, cached) => total + cached.size, 0);
  }

  /**
   * Load cache from storage
   */
  private async loadCacheFromStorage(): Promise<void> {
    try {
      const cached = await StorageService.get<Record<string, IconCache>>('icon-cache');
      if (cached) {
        for (const [key, value] of Object.entries(cached)) {
          // Skip expired items
          if (Date.now() < value.expiresAt) {
            this.cache.set(key, value);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load icon cache from storage:', error);
    }
  }

  /**
   * Save cache to storage
   */
  private async saveCacheToStorage(): Promise<void> {
    try {
      const cacheObject = Object.fromEntries(this.cache.entries());
      await StorageService.set('icon-cache', cacheObject);
    } catch (error) {
      console.warn('Failed to save icon cache to storage:', error);
    }
  }

  /**
   * Track cache events
   */
  private async trackCacheEvent(type: string, key: string): Promise<void> {
    try {
      await UnifiedTrackingService.trackEvent('icon_cache', {
        type,
        key,
        cache_size: this.cache.size,
        total_size: this.getCurrentCacheSize()
      });
    } catch (error) {
      // Ignore tracking errors
    }
  }
}

/**
 * Icon Fetching Service
 */
class IconFetchingService {
  private readonly commonIconSources: string[] = [
    'https://logo.clearbit.com/{domain}',
    'https://www.google.com/s2/favicons?domain={domain}&sz=256',
    'https://favicon.ninja/{domain}',
    'https://icons.duckduckgo.com/ip3/{domain}.ico'
  ];

  /**
   * Fetch icon from various sources
   */
  async fetchIconForService(serviceName: string, domain?: string): Promise<{
    success: boolean;
    iconData?: string;
    source?: string;
    error?: string;
  }> {
    // First, check our database
    const existingIcon = IconDatabase.findIconByName(serviceName);
    if (existingIcon && existingIcon.variants.length > 0) {
      const bestVariant = this.selectBestVariant(existingIcon.variants);
      return {
        success: true,
        iconData: bestVariant.url,
        source: 'database'
      };
    }

    // If no domain provided, try to guess from service name
    const targetDomain = domain || this.guessDomainFromService(serviceName);
    if (!targetDomain) {
      return {
        success: false,
        error: 'Could not determine domain for service'
      };
    }

    // Try fetching from external sources
    for (const sourceTemplate of this.commonIconSources) {
      try {
        const url = sourceTemplate.replace('{domain}', targetDomain);
        const result = await this.fetchFromUrl(url);
        
        if (result.success) {
          return {
            success: true,
            iconData: result.data,
            source: url
          };
        }
      } catch (error) {
        continue; // Try next source
      }
    }

    return {
      success: false,
      error: 'Could not fetch icon from any source'
    };
  }

  /**
   * Fetch icon from URL
   */
  private async fetchFromUrl(url: string): Promise<{
    success: boolean;
    data?: string;
    error?: string;
  }> {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'image/*',
          'User-Agent': '2FA-Studio/1.0'
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}`
        };
      }

      const blob = await response.blob();
      const dataUrl = await this.blobToDataURL(blob);
      
      return {
        success: true,
        data: dataUrl
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Convert blob to data URL
   */
  private blobToDataURL(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Guess domain from service name
   */
  private guessDomainFromService(serviceName: string): string | null {
    const commonDomains: Record<string, string> = {
      'google': 'google.com',
      'github': 'github.com',
      'microsoft': 'microsoft.com',
      'facebook': 'facebook.com',
      'twitter': 'twitter.com',
      'x': 'x.com',
      'instagram': 'instagram.com',
      'linkedin': 'linkedin.com',
      'discord': 'discord.com',
      'slack': 'slack.com',
      'zoom': 'zoom.us',
      'dropbox': 'dropbox.com',
      'netflix': 'netflix.com',
      'amazon': 'amazon.com',
      'paypal': 'paypal.com',
      'stripe': 'stripe.com'
    };

    const normalized = serviceName.toLowerCase().trim();
    return commonDomains[normalized] || `${normalized}.com`;
  }

  /**
   * Select best variant from available options
   */
  private selectBestVariant(variants: ServiceIcon['variants']): ServiceIcon['variants'][0] {
    // Prefer vector format
    let best = variants.find(v => v.format === 'svg') || variants[0];
    
    // Prefer larger sizes for better quality
    for (const variant of variants) {
      if (variant.format === 'svg' || 
          (variant.size === '128x128' && best.size !== 'vector')) {
        best = variant;
      }
    }
    
    return best;
  }
}

/**
 * Icon Analytics Service
 */
class IconAnalyticsService {
  private eventQueue: IconEvent[] = [];
  private readonly maxQueueSize = 100;

  /**
   * Track icon event
   */
  async trackEvent(
    type: IconEvent['type'],
    iconId?: string,
    metadata: Record<string, any> = {},
    userId?: string
  ): Promise<void> {
    const event: IconEvent = {
      type,
      timestamp: Date.now(),
      userId,
      iconId,
      metadata,
      platform: this.getCurrentPlatform(),
      sessionId: await this.getSessionId()
    };

    this.eventQueue.push(event);

    // Process queue if it gets too large
    if (this.eventQueue.length >= this.maxQueueSize) {
      await this.flushEvents();
    }

    // Also track with unified tracking
    try {
      await UnifiedTrackingService.trackEvent('icon_event', {
        event_type: type,
        icon_id: iconId,
        ...metadata
      });
    } catch (error) {
      // Ignore tracking errors
    }
  }

  /**
   * Get icon usage statistics
   */
  async getIconUsageStats(iconId: string, period: 'day' | 'week' | 'month' = 'week'): Promise<{
    views: number;
    selections: number;
    downloads: number;
    searches: number;
    period: string;
  }> {
    try {
      // In a real implementation, this would query the database
      // For now, return mock data
      return {
        views: Math.floor(Math.random() * 1000),
        selections: Math.floor(Math.random() * 500),
        downloads: Math.floor(Math.random() * 100),
        searches: Math.floor(Math.random() * 200),
        period
      };
    } catch (error) {
      throw new Error('Failed to get usage statistics');
    }
  }

  /**
   * Get popular icons
   */
  async getPopularIcons(limit: number = 10): Promise<ServiceIcon[]> {
    return IconDatabase.getPopularIcons(limit);
  }

  /**
   * Flush pending events
   */
  async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    try {
      // In a real implementation, this would send to analytics backend
      const events = [...this.eventQueue];
      this.eventQueue = [];
      
      // Store events locally for offline processing
      await StorageService.append('icon-events', events);
      
    } catch (error) {
      console.warn('Failed to flush icon events:', error);
    }
  }

  /**
   * Get current platform
   */
  private getCurrentPlatform(): Platform {
    if (typeof window !== 'undefined') {
      if (window.location.href.includes('chrome-extension://')) {
        return 'chrome-extension';
      }
      return 'web';
    }
    
    // Check for Capacitor
    if (typeof window !== 'undefined' && (window as any).Capacitor) {
      const platform = (window as any).Capacitor.getPlatform();
      if (platform === 'android' || platform === 'ios') {
        return platform;
      }
    }
    
    return 'web';
  }

  /**
   * Get session ID
   */
  private async getSessionId(): Promise<string> {
    let sessionId = await StorageService.get<string>('session-id');
    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await StorageService.set('session-id', sessionId);
    }
    return sessionId;
  }
}

/**
 * Fallback Icon Generator
 */
class FallbackIconGenerator {
  /**
   * Generate fallback icon for service
   */
  generateFallbackIcon(serviceName: string, options: {
    size?: number;
    format?: 'svg' | 'canvas';
    theme?: IconTheme;
    style?: 'initials' | 'geometric' | 'branded';
  } = {}): string {
    const {
      size = 64,
      format = 'svg',
      theme = 'auto',
      style = 'initials'
    } = options;

    switch (style) {
      case 'initials':
        return this.generateInitialsIcon(serviceName, size, format, theme);
      case 'geometric':
        return this.generateGeometricIcon(serviceName, size, format, theme);
      case 'branded':
        return this.generateBrandedIcon(serviceName, size, format, theme);
      default:
        return this.generateInitialsIcon(serviceName, size, format, theme);
    }
  }

  /**
   * Generate initials-based icon
   */
  private generateInitialsIcon(
    serviceName: string, 
    size: number, 
    format: 'svg' | 'canvas',
    theme: IconTheme
  ): string {
    const initials = IconUtils.generateInitials(serviceName, 2);
    const backgroundColor = IconUtils.generateColorFromString(serviceName);
    const textColor = IconUtils.isDarkColor(backgroundColor) ? '#FFFFFF' : '#000000';
    
    if (format === 'svg') {
      const svg = `
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
          <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="${backgroundColor}"/>
          <text
            x="50%"
            y="50%"
            text-anchor="middle"
            dominant-baseline="central"
            font-family="system-ui, -apple-system, sans-serif"
            font-size="${size * 0.4}"
            font-weight="600"
            fill="${textColor}"
          >
            ${initials}
          </text>
        </svg>
      `.trim();
      
      return `data:image/svg+xml;base64,${btoa(svg)}`;
    } else {
      // Canvas implementation
      return this.generateCanvasIcon(serviceName, size, backgroundColor, textColor, initials);
    }
  }

  /**
   * Generate geometric icon
   */
  private generateGeometricIcon(
    serviceName: string,
    size: number,
    format: 'svg' | 'canvas',
    theme: IconTheme
  ): string {
    const color = IconUtils.generateColorFromString(serviceName);
    const shapes = ['circle', 'square', 'triangle', 'diamond'];
    const shapeIndex = Math.abs(serviceName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % shapes.length;
    const shape = shapes[shapeIndex];
    
    if (format === 'svg') {
      const svg = this.generateGeometricSVG(shape, size, color);
      return `data:image/svg+xml;base64,${btoa(svg)}`;
    } else {
      return this.generateCanvasIcon(serviceName, size, color, '#FFFFFF', IconUtils.generateInitials(serviceName));
    }
  }

  /**
   * Generate branded icon
   */
  private generateBrandedIcon(
    serviceName: string,
    size: number,
    format: 'svg' | 'canvas',
    theme: IconTheme
  ): string {
    const brandInfo = IconUtils.getBrandInfo(serviceName);
    const backgroundColor = brandInfo?.primaryColor || IconUtils.generateColorFromString(serviceName);
    const initials = IconUtils.generateInitials(serviceName, 1);
    
    return this.generateInitialsIcon(serviceName, size, format, theme);
  }

  /**
   * Generate geometric SVG
   */
  private generateGeometricSVG(shape: string, size: number, color: string): string {
    const center = size / 2;
    const radius = size * 0.35;
    
    let shapeElement = '';
    
    switch (shape) {
      case 'circle':
        shapeElement = `<circle cx="${center}" cy="${center}" r="${radius}" fill="${color}"/>`;
        break;
      case 'square':
        const squareSize = radius * 1.4;
        shapeElement = `<rect x="${center - squareSize/2}" y="${center - squareSize/2}" width="${squareSize}" height="${squareSize}" rx="${squareSize * 0.1}" fill="${color}"/>`;
        break;
      case 'triangle':
        const points = [
          [center, center - radius],
          [center - radius * 0.866, center + radius * 0.5],
          [center + radius * 0.866, center + radius * 0.5]
        ].map(p => p.join(',')).join(' ');
        shapeElement = `<polygon points="${points}" fill="${color}"/>`;
        break;
      case 'diamond':
        const diamondPoints = [
          [center, center - radius],
          [center + radius, center],
          [center, center + radius],
          [center - radius, center]
        ].map(p => p.join(',')).join(' ');
        shapeElement = `<polygon points="${diamondPoints}" fill="${color}"/>`;
        break;
    }
    
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${size}" height="${size}" fill="#F5F5F5"/>
        ${shapeElement}
      </svg>
    `.trim();
  }

  /**
   * Generate canvas-based icon
   */
  private generateCanvasIcon(
    serviceName: string,
    size: number,
    backgroundColor: string,
    textColor: string,
    text: string
  ): string {
    if (typeof document === 'undefined') {
      // Fallback to SVG if no canvas available
      return this.generateInitialsIcon(serviceName, size, 'svg', 'auto');
    }

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    // Background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, size, size);
    
    // Text
    ctx.fillStyle = textColor;
    ctx.font = `600 ${size * 0.4}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, size / 2, size / 2);
    
    return canvas.toDataURL('image/png');
  }
}

/**
 * Icon Upload Service
 */
class IconUploadService {
  /**
   * Upload custom icon
   */
  async uploadCustomIcon(
    file: File,
    serviceName: string,
    userId: string
  ): Promise<{
    success: boolean;
    icon?: CustomIcon;
    error?: string;
  }> {
    try {
      // Validate file
      const validation = await IconValidator.validateFile(file);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join(', ')
        };
      }

      // Process icon
      const processing = await IconProcessor.processIcon(file);
      if (!processing.processed) {
        return {
          success: false,
          error: processing.error || 'Failed to process icon'
        };
      }

      // Create custom icon record
      const customIcon: CustomIcon = {
        id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        originalName: file.name,
        data: processing.result!,
        format: validation.details.format,
        size: processing.result!.length,
        serviceName,
        uploadedAt: Date.now(),
        usageCount: 0,
        storage: {
          type: 'local',
          path: `custom-icons/${userId}/${serviceName}`,
          url: processing.result!,
          backupUrls: []
        },
        processing: processing.processing
      };

      // Save to storage
      await this.saveCustomIcon(customIcon);

      // Track upload event
      await UnifiedTrackingService.trackEvent('icon_uploaded', {
        service_name: serviceName,
        file_size: file.size,
        format: validation.details.format
      });

      return {
        success: true,
        icon: customIcon
      };
    } catch (error) {
      await UnifiedErrorService.handleError(error as Error, 'IconUploadService.uploadCustomIcon');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  /**
   * Save custom icon
   */
  private async saveCustomIcon(icon: CustomIcon): Promise<void> {
    const userCustomIcons = await StorageService.get<Record<string, CustomIcon>>(`custom-icons-${icon.userId}`) || {};
    userCustomIcons[icon.id] = icon;
    await StorageService.set(`custom-icons-${icon.userId}`, userCustomIcons);
  }

  /**
   * Get user's custom icons
   */
  async getUserCustomIcons(userId: string): Promise<CustomIcon[]> {
    const userCustomIcons = await StorageService.get<Record<string, CustomIcon>>(`custom-icons-${userId}`) || {};
    return Object.values(userCustomIcons);
  }

  /**
   * Delete custom icon
   */
  async deleteCustomIcon(iconId: string, userId: string): Promise<boolean> {
    try {
      const userCustomIcons = await StorageService.get<Record<string, CustomIcon>>(`custom-icons-${userId}`) || {};
      delete userCustomIcons[iconId];
      await StorageService.set(`custom-icons-${userId}`, userCustomIcons);
      return true;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Main Icon Service
 */
export class IconService {
  private static instance: IconService;
  private config: IconSystemConfig;
  private cacheService: IconCacheService;
  private fetchingService: IconFetchingService;
  private analyticsService: IconAnalyticsService;
  private fallbackGenerator: FallbackIconGenerator;
  private uploadService: IconUploadService;

  private constructor(config?: Partial<IconSystemConfig>) {
    this.config = {
      enableAnalytics: true,
      enableCaching: true,
      cacheTTL: 24 * 60 * 60 * 1000, // 24 hours
      maxCacheSize: 100 * 1024 * 1024, // 100MB
      enableAutoDetection: true,
      defaultTheme: 'auto',
      cdn: {
        enabled: false,
        baseUrl: '',
        regions: [],
        cacheHeaders: {}
      },
      qualityThresholds: {
        minimumQuality: 70,
        autoRejectThreshold: 30,
        manualReviewThreshold: 80
      },
      uploadLimits: {
        maxFileSize: 5 * 1024 * 1024,
        allowedFormats: ['svg', 'png', 'jpg', 'webp'],
        maxUploadsPerDay: 50,
        maxDimensions: { width: 1024, height: 1024 }
      },
      rateLimits: {
        apiRequestsPerMinute: 100,
        searchRequestsPerMinute: 50,
        downloadRequestsPerMinute: 20,
        uploadRequestsPerHour: 10
      },
      ...config
    };

    this.cacheService = new IconCacheService(this.config.maxCacheSize, this.config.cacheTTL);
    this.fetchingService = new IconFetchingService();
    this.analyticsService = new IconAnalyticsService();
    this.fallbackGenerator = new FallbackIconGenerator();
    this.uploadService = new IconUploadService();
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: Partial<IconSystemConfig>): IconService {
    if (!IconService.instance) {
      IconService.instance = new IconService(config);
    }
    return IconService.instance;
  }

  /**
   * Get icon for service
   */
  async getIconForService(
    serviceName: string,
    options: {
      size?: IconSize;
      format?: IconFormat;
      theme?: IconTheme;
      userId?: string;
      preferCustom?: boolean;
    } = {}
  ): Promise<{
    iconUrl: string;
    source: 'database' | 'custom' | 'external' | 'fallback';
    cached: boolean;
  }> {
    const {
      size = '64x64',
      format = 'png',
      theme = this.config.defaultTheme,
      userId,
      preferCustom = false
    } = options;

    try {
      // Generate cache key
      const cacheKey = IconUtils.generateCacheKey(serviceName, size, format, theme);
      
      // Check cache first
      if (this.config.enableCaching) {
        const cached = await this.cacheService.get(cacheKey);
        if (cached) {
          await this.analyticsService.trackEvent('icon-view', serviceName, { source: 'cache' }, userId);
          return { iconUrl: cached, source: 'database', cached: true };
        }
      }

      // Check for custom icons first (if preferred and user provided)
      if (preferCustom && userId) {
        const customIcons = await this.uploadService.getUserCustomIcons(userId);
        const customIcon = customIcons.find(icon => 
          IconUtils.normalizeServiceName(icon.serviceName) === IconUtils.normalizeServiceName(serviceName)
        );
        
        if (customIcon) {
          await this.cacheService.set(cacheKey, customIcon.data);
          await this.analyticsService.trackEvent('icon-view', customIcon.id, { source: 'custom' }, userId);
          return { iconUrl: customIcon.data, source: 'custom', cached: false };
        }
      }

      // Check database
      const dbIcon = IconDatabase.findIconByName(serviceName);
      if (dbIcon) {
        const variant = this.selectBestVariant(dbIcon.variants, size, format, theme);
        if (variant) {
          await this.cacheService.set(cacheKey, variant.url);
          await this.analyticsService.trackEvent('icon-view', dbIcon.id, { source: 'database' }, userId);
          return { iconUrl: variant.url, source: 'database', cached: false };
        }
      }

      // Try external fetching
      if (this.config.enableAutoDetection) {
        const fetchResult = await this.fetchingService.fetchIconForService(serviceName);
        if (fetchResult.success && fetchResult.iconData) {
          await this.cacheService.set(cacheKey, fetchResult.iconData);
          await this.analyticsService.trackEvent('icon-view', serviceName, { source: 'external' }, userId);
          return { iconUrl: fetchResult.iconData, source: 'external', cached: false };
        }
      }

      // Generate fallback icon
      const fallbackIcon = this.fallbackGenerator.generateFallbackIcon(serviceName, {
        size: this.getSizeNumber(size),
        format: 'svg',
        theme,
        style: 'initials'
      });

      await this.cacheService.set(cacheKey, fallbackIcon);
      await this.analyticsService.trackEvent('icon-view', serviceName, { source: 'fallback' }, userId);
      
      return { iconUrl: fallbackIcon, source: 'fallback', cached: false };
    } catch (error) {
      await UnifiedErrorService.handleError(error as Error, 'IconService.getIconForService');
      
      // Return simple fallback
      const fallbackIcon = this.fallbackGenerator.generateFallbackIcon(serviceName);
      return { iconUrl: fallbackIcon, source: 'fallback', cached: false };
    }
  }

  /**
   * Search icons
   */
  async searchIcons(query: IconSearchQuery, userId?: string): Promise<IconSearchResult> {
    const startTime = Date.now();
    
    try {
      let results: ServiceIcon[] = [];
      
      if (query.query) {
        results = IconDatabase.searchIcons(query.query, query.limit || 20);
      } else {
        results = IconDatabase.getAllIcons().slice(0, query.limit || 20);
      }

      // Apply filters
      if (query.category) {
        results = results.filter(icon => icon.category === query.category);
      }

      if (query.minQuality) {
        results = results.filter(icon => icon.quality.score >= query.minQuality!);
      }

      // Sort results
      if (query.sort) {
        results = this.sortIcons(results, query.sort);
      }

      // Generate suggestions
      const suggestions = query.query 
        ? IconSearchUtils.generateSuggestions(query.query, IconDatabase.getAllIcons(), 5)
        : [];

      const executionTime = Date.now() - startTime;

      // Track search
      await this.analyticsService.trackEvent('icon-search', undefined, {
        query: query.query,
        results_count: results.length,
        execution_time: executionTime
      }, userId);

      return {
        results,
        total: results.length,
        suggestions,
        metadata: {
          originalQuery: query.query || '',
          processedQuery: query.query?.toLowerCase().trim() || '',
          filtersApplied: Object.keys(query).filter(key => query[key as keyof IconSearchQuery] !== undefined),
          algorithm: 'fuzzy',
          confidence: 0.8
        },
        executionTime
      };
    } catch (error) {
      await UnifiedErrorService.handleError(error as Error, 'IconService.searchIcons');
      throw error;
    }
  }

  /**
   * Upload custom icon
   */
  async uploadCustomIcon(file: File, serviceName: string, userId: string): Promise<CustomIcon> {
    const result = await this.uploadService.uploadCustomIcon(file, serviceName, userId);
    
    if (!result.success) {
      throw new Error(result.error || 'Upload failed');
    }
    
    return result.icon!;
  }

  /**
   * Get user's custom icons
   */
  async getUserCustomIcons(userId: string): Promise<CustomIcon[]> {
    return this.uploadService.getUserCustomIcons(userId);
  }

  /**
   * Delete custom icon
   */
  async deleteCustomIcon(iconId: string, userId: string): Promise<boolean> {
    return this.uploadService.deleteCustomIcon(iconId, userId);
  }

  /**
   * Get icon analytics
   */
  async getIconAnalytics(iconId: string, period: 'day' | 'week' | 'month' = 'week') {
    return this.analyticsService.getIconUsageStats(iconId, period);
  }

  /**
   * Get popular icons
   */
  async getPopularIcons(limit: number = 10): Promise<ServiceIcon[]> {
    return this.analyticsService.getPopularIcons(limit);
  }

  /**
   * Clear icon cache
   */
  async clearCache(): Promise<void> {
    await this.cacheService.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cacheService.getCacheStats();
  }

  /**
   * Generate fallback icon
   */
  generateFallbackIcon(serviceName: string, options: Parameters<FallbackIconGenerator['generateFallbackIcon']>[1] = {}): string {
    return this.fallbackGenerator.generateFallbackIcon(serviceName, options);
  }

  // Private helper methods

  /**
   * Select best variant from available options
   */
  private selectBestVariant(
    variants: ServiceIcon['variants'],
    preferredSize: IconSize,
    preferredFormat: IconFormat,
    preferredTheme: IconTheme
  ): ServiceIcon['variants'][0] | null {
    if (variants.length === 0) return null;

    // Find exact match
    let exact = variants.find(v => 
      v.size === preferredSize && 
      v.format === preferredFormat && 
      (v.theme === preferredTheme || preferredTheme === 'auto')
    );

    if (exact) return exact;

    // Find by format and size
    let formatSize = variants.find(v => 
      v.format === preferredFormat && 
      v.size === preferredSize
    );

    if (formatSize) return formatSize;

    // Find by format
    let format = variants.find(v => v.format === preferredFormat);
    if (format) return format;

    // Find vector format (best quality)
    let vector = variants.find(v => v.format === 'svg');
    if (vector) return vector;

    // Return first available
    return variants[0];
  }

  /**
   * Sort icons by criteria
   */
  private sortIcons(icons: ServiceIcon[], sort: IconSearchQuery['sort']): ServiceIcon[] {
    switch (sort) {
      case 'name':
        return icons.sort((a, b) => a.name.localeCompare(b.name));
      case 'popularity':
        return icons.sort((a, b) => b.analytics.usageCount - a.analytics.usageCount);
      case 'recently-added':
        return icons.sort((a, b) => b.createdAt - a.createdAt);
      case 'recently-updated':
        return icons.sort((a, b) => b.updatedAt - a.updatedAt);
      case 'quality-score':
        return icons.sort((a, b) => b.quality.score - a.quality.score);
      case 'usage-count':
        return icons.sort((a, b) => b.analytics.usageCount - a.analytics.usageCount);
      case 'relevance':
      default:
        return icons; // Already sorted by relevance in search
    }
  }

  /**
   * Convert IconSize to number
   */
  private getSizeNumber(size: IconSize): number {
    if (size === 'vector') return 64;
    const match = size.match(/^(\d+)x\d+$/);
    return match ? parseInt(match[1]) : 64;
  }
}

// Export singleton instance
export const iconService = IconService.getInstance();

export default IconService;