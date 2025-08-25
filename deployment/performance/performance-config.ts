/**
 * Performance Optimization Configuration for 2FA Studio
 * 
 * This module provides comprehensive performance optimization including
 * caching strategies, bundle optimization, lazy loading, and performance monitoring.
 */

export interface PerformanceConfig {
  caching: CachingConfig;
  bundleOptimization: BundleOptimizationConfig;
  lazyLoading: LazyLoadingConfig;
  cdn: CDNConfig;
  serviceWorker: ServiceWorkerConfig;
  imageOptimization: ImageOptimizationConfig;
  preloading: PreloadingConfig;
  monitoring: PerformanceMonitoringConfig;
}

export interface CachingConfig {
  enabled: boolean;
  strategies: {
    static: CacheStrategy;
    api: CacheStrategy;
    database: CacheStrategy;
    images: CacheStrategy;
  };
  maxAge: {
    static: number;
    api: number;
    database: number;
    images: number;
  };
  versioning: {
    enabled: boolean;
    strategy: 'timestamp' | 'hash' | 'version';
  };
}

export interface CacheStrategy {
  type: 'memory' | 'localStorage' | 'indexedDB' | 'serviceWorker';
  maxSize: number; // in MB
  ttl: number; // in seconds
  invalidationRules: string[];
}

export interface BundleOptimizationConfig {
  enabled: boolean;
  splitChunks: {
    vendor: boolean;
    common: boolean;
    async: boolean;
  };
  treeshaking: boolean;
  minification: {
    js: boolean;
    css: boolean;
    html: boolean;
  };
  compression: {
    gzip: boolean;
    brotli: boolean;
  };
  sizeAnalysis: {
    enabled: boolean;
    threshold: number; // in KB
    reportPath: string;
  };
}

export interface LazyLoadingConfig {
  enabled: boolean;
  components: {
    routes: boolean;
    images: boolean;
    modules: boolean;
  };
  thresholds: {
    viewport: string; // CSS units
    connectionSpeed: 'slow-2g' | '2g' | '3g' | '4g';
  };
  preloadCount: number;
}

export interface CDNConfig {
  enabled: boolean;
  provider: 'cloudflare' | 'aws' | 'firebase';
  endpoints: {
    static: string;
    images: string;
    fonts: string;
  };
  caching: {
    browserCache: number; // seconds
    edgeCache: number; // seconds
  };
  optimization: {
    minify: boolean;
    compress: boolean;
    imageOptimization: boolean;
  };
}

export interface ServiceWorkerConfig {
  enabled: boolean;
  strategies: {
    html: 'networkFirst' | 'cacheFirst' | 'staleWhileRevalidate';
    css: 'networkFirst' | 'cacheFirst' | 'staleWhileRevalidate';
    js: 'networkFirst' | 'cacheFirst' | 'staleWhileRevalidate';
    images: 'networkFirst' | 'cacheFirst' | 'staleWhileRevalidate';
    api: 'networkFirst' | 'cacheFirst' | 'staleWhileRevalidate';
  };
  precaching: {
    enabled: boolean;
    routes: string[];
    assets: string[];
  };
  runtime: {
    maxEntries: number;
    maxAgeSeconds: number;
  };
}

export interface ImageOptimizationConfig {
  enabled: boolean;
  formats: {
    webp: boolean;
    avif: boolean;
    jpeg: boolean;
    png: boolean;
  };
  quality: {
    webp: number;
    avif: number;
    jpeg: number;
    png: number;
  };
  responsive: {
    enabled: boolean;
    breakpoints: number[];
  };
  lazyLoading: {
    enabled: boolean;
    threshold: string;
    placeholder: 'blur' | 'empty' | 'skeleton';
  };
}

export interface PreloadingConfig {
  enabled: boolean;
  critical: {
    css: string[];
    js: string[];
    fonts: string[];
  };
  dns: {
    prefetch: string[];
    preconnect: string[];
  };
  resources: {
    prefetch: string[];
    preload: string[];
  };
}

export interface PerformanceMonitoringConfig {
  enabled: boolean;
  metrics: {
    coreWebVitals: boolean;
    customMetrics: boolean;
    resourceTiming: boolean;
    navigationTiming: boolean;
  };
  thresholds: {
    fcp: number; // First Contentful Paint
    lcp: number; // Largest Contentful Paint
    fid: number; // First Input Delay
    cls: number; // Cumulative Layout Shift
    ttfb: number; // Time to First Byte
  };
  reporting: {
    interval: number; // seconds
    endpoint: string;
    batchSize: number;
  };
}

/**
 * Production Performance Configuration
 */
export const PRODUCTION_PERFORMANCE_CONFIG: PerformanceConfig = {
  caching: {
    enabled: true,
    strategies: {
      static: {
        type: 'serviceWorker',
        maxSize: 50, // MB
        ttl: 31536000, // 1 year
        invalidationRules: ['version-change', 'manual']
      },
      api: {
        type: 'memory',
        maxSize: 10, // MB
        ttl: 300, // 5 minutes
        invalidationRules: ['user-action', 'time-based']
      },
      database: {
        type: 'indexedDB',
        maxSize: 25, // MB
        ttl: 3600, // 1 hour
        invalidationRules: ['data-change', 'sync']
      },
      images: {
        type: 'serviceWorker',
        maxSize: 100, // MB
        ttl: 2592000, // 30 days
        invalidationRules: ['storage-limit']
      }
    },
    maxAge: {
      static: 31536000, // 1 year
      api: 300, // 5 minutes
      database: 3600, // 1 hour
      images: 2592000 // 30 days
    },
    versioning: {
      enabled: true,
      strategy: 'hash'
    }
  },

  bundleOptimization: {
    enabled: true,
    splitChunks: {
      vendor: true,
      common: true,
      async: true
    },
    treeshaking: true,
    minification: {
      js: true,
      css: true,
      html: true
    },
    compression: {
      gzip: true,
      brotli: true
    },
    sizeAnalysis: {
      enabled: true,
      threshold: 500, // KB
      reportPath: 'dist/bundle-analysis.json'
    }
  },

  lazyLoading: {
    enabled: true,
    components: {
      routes: true,
      images: true,
      modules: true
    },
    thresholds: {
      viewport: '50px',
      connectionSpeed: '3g'
    },
    preloadCount: 3
  },

  cdn: {
    enabled: true,
    provider: 'firebase',
    endpoints: {
      static: 'https://cdn.2fastudio.com/static',
      images: 'https://cdn.2fastudio.com/images',
      fonts: 'https://fonts.googleapis.com'
    },
    caching: {
      browserCache: 31536000, // 1 year
      edgeCache: 86400 // 1 day
    },
    optimization: {
      minify: true,
      compress: true,
      imageOptimization: true
    }
  },

  serviceWorker: {
    enabled: true,
    strategies: {
      html: 'networkFirst',
      css: 'cacheFirst',
      js: 'cacheFirst',
      images: 'cacheFirst',
      api: 'networkFirst'
    },
    precaching: {
      enabled: true,
      routes: ['/', '/accounts', '/settings'],
      assets: ['manifest.json', 'icons/*.png']
    },
    runtime: {
      maxEntries: 100,
      maxAgeSeconds: 2592000 // 30 days
    }
  },

  imageOptimization: {
    enabled: true,
    formats: {
      webp: true,
      avif: true,
      jpeg: true,
      png: true
    },
    quality: {
      webp: 80,
      avif: 70,
      jpeg: 85,
      png: 90
    },
    responsive: {
      enabled: true,
      breakpoints: [320, 640, 768, 1024, 1280, 1536]
    },
    lazyLoading: {
      enabled: true,
      threshold: '10px',
      placeholder: 'blur'
    }
  },

  preloading: {
    enabled: true,
    critical: {
      css: ['/assets/index.css'],
      js: ['/assets/index.js'],
      fonts: [
        'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
      ]
    },
    dns: {
      prefetch: [
        '//fonts.googleapis.com',
        '//fonts.gstatic.com',
        '//firebaseapp.com',
        '//googleapis.com'
      ],
      preconnect: [
        'https://fonts.googleapis.com',
        'https://fonts.gstatic.com'
      ]
    },
    resources: {
      prefetch: ['/api/config', '/api/features'],
      preload: ['/manifest.json']
    }
  },

  monitoring: {
    enabled: true,
    metrics: {
      coreWebVitals: true,
      customMetrics: true,
      resourceTiming: true,
      navigationTiming: true
    },
    thresholds: {
      fcp: 1800, // ms
      lcp: 2500, // ms
      fid: 100, // ms
      cls: 0.1,
      ttfb: 600 // ms
    },
    reporting: {
      interval: 30, // seconds
      endpoint: '/api/performance/metrics',
      batchSize: 50
    }
  }
};

/**
 * Cache Management Class
 */
export class CacheManager {
  private caches: Map<string, Map<string, { data: any; timestamp: number; ttl: number }>> = new Map();
  private maxSizes: Map<string, number> = new Map();

  constructor(private config: CachingConfig) {
    this.setupCacheStrategies();
  }

  private setupCacheStrategies() {
    Object.entries(this.config.strategies).forEach(([name, strategy]) => {
      this.caches.set(name, new Map());
      this.maxSizes.set(name, strategy.maxSize * 1024 * 1024); // Convert MB to bytes
    });
  }

  async get<T>(cacheType: keyof CachingConfig['strategies'], key: string): Promise<T | null> {
    const cache = this.caches.get(cacheType);
    if (!cache) return null;

    const entry = cache.get(key);
    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.timestamp > entry.ttl * 1000) {
      cache.delete(key);
      return null;
    }

    return entry.data;
  }

  async set<T>(cacheType: keyof CachingConfig['strategies'], key: string, data: T): Promise<void> {
    const cache = this.caches.get(cacheType);
    if (!cache) return;

    const strategy = this.config.strategies[cacheType];
    const ttl = strategy.ttl;

    // Add to cache
    cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });

    // Cleanup if needed
    await this.cleanup(cacheType);
  }

  async invalidate(cacheType: keyof CachingConfig['strategies'], key?: string): Promise<void> {
    const cache = this.caches.get(cacheType);
    if (!cache) return;

    if (key) {
      cache.delete(key);
    } else {
      cache.clear();
    }
  }

  private async cleanup(cacheType: string): Promise<void> {
    const cache = this.caches.get(cacheType);
    const maxSize = this.maxSizes.get(cacheType);
    
    if (!cache || !maxSize) return;

    // Simple cleanup: remove oldest entries if over size limit
    let currentSize = this.estimateCacheSize(cache);
    
    if (currentSize > maxSize) {
      const entries = Array.from(cache.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      while (currentSize > maxSize * 0.8 && entries.length > 0) { // Keep 80% of max size
        const [key] = entries.shift()!;
        cache.delete(key);
        currentSize = this.estimateCacheSize(cache);
      }
    }
  }

  private estimateCacheSize(cache: Map<string, any>): number {
    // Simple size estimation
    let size = 0;
    for (const [key, value] of cache) {
      size += key.length * 2; // Approximate string size
      size += JSON.stringify(value).length * 2; // Approximate object size
    }
    return size;
  }

  getCacheStats(): Record<string, { size: number; entries: number; hitRate: number }> {
    const stats: Record<string, { size: number; entries: number; hitRate: number }> = {};
    
    this.caches.forEach((cache, cacheType) => {
      stats[cacheType] = {
        size: this.estimateCacheSize(cache),
        entries: cache.size,
        hitRate: 0 // Would need to track hits/misses for accurate calculation
      };
    });
    
    return stats;
  }
}

/**
 * Performance Monitor Class
 */
export class PerformanceMonitor {
  private metrics: Array<{
    type: string;
    value: number;
    timestamp: number;
    metadata?: Record<string, any>;
  }> = [];

  constructor(private config: PerformanceMonitoringConfig) {
    if (config.enabled) {
      this.initializeMonitoring();
    }
  }

  private initializeMonitoring() {
    // Monitor Core Web Vitals
    if (this.config.metrics.coreWebVitals && typeof window !== 'undefined') {
      this.monitorCoreWebVitals();
    }

    // Monitor resource timing
    if (this.config.metrics.resourceTiming && typeof window !== 'undefined') {
      this.monitorResourceTiming();
    }

    // Monitor navigation timing
    if (this.config.metrics.navigationTiming && typeof window !== 'undefined') {
      this.monitorNavigationTiming();
    }

    // Start reporting
    this.startReporting();
  }

  private monitorCoreWebVitals() {
    // Use web-vitals library if available
    if (typeof window !== 'undefined') {
      import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
        getCLS(this.recordMetric.bind(this, 'CLS'));
        getFID(this.recordMetric.bind(this, 'FID'));
        getFCP(this.recordMetric.bind(this, 'FCP'));
        getLCP(this.recordMetric.bind(this, 'LCP'));
        getTTFB(this.recordMetric.bind(this, 'TTFB'));
      }).catch(() => {
        console.warn('web-vitals library not available');
      });
    }
  }

  private monitorResourceTiming() {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as PerformanceResourceTiming[]) {
          this.recordMetric('resource-timing', entry.duration, {
            name: entry.name,
            type: entry.initiatorType,
            size: entry.transferSize,
            cached: entry.transferSize === 0
          });
        }
      });

      try {
        observer.observe({ entryTypes: ['resource'] });
      } catch (error) {
        console.warn('Resource timing monitoring not supported');
      }
    }
  }

  private monitorNavigationTiming() {
    if (typeof window !== 'undefined' && 'performance' in window) {
      window.addEventListener('load', () => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        if (navigation) {
          this.recordMetric('dom-content-loaded', navigation.domContentLoadedEventEnd - navigation.navigationStart);
          this.recordMetric('load-complete', navigation.loadEventEnd - navigation.navigationStart);
          this.recordMetric('dns-lookup', navigation.domainLookupEnd - navigation.domainLookupStart);
          this.recordMetric('tcp-connect', navigation.connectEnd - navigation.connectStart);
          this.recordMetric('ssl-negotiation', navigation.connectEnd - navigation.secureConnectionStart);
        }
      });
    }
  }

  private recordMetric(type: string, valueOrVital: number | any, metadata?: Record<string, any>) {
    let value: number;
    let meta: Record<string, any> = metadata || {};

    if (typeof valueOrVital === 'object' && 'value' in valueOrVital) {
      // Web Vitals format
      value = valueOrVital.value;
      meta = { ...meta, id: valueOrVital.id, name: valueOrVital.name };
    } else {
      value = valueOrVital;
    }

    this.metrics.push({
      type,
      value,
      timestamp: Date.now(),
      metadata: meta
    });

    // Check thresholds
    this.checkThresholds(type, value);

    // Keep only recent metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-500);
    }
  }

  private checkThresholds(type: string, value: number) {
    const thresholds = this.config.thresholds;
    let threshold: number | undefined;

    switch (type.toLowerCase()) {
      case 'fcp':
        threshold = thresholds.fcp;
        break;
      case 'lcp':
        threshold = thresholds.lcp;
        break;
      case 'fid':
        threshold = thresholds.fid;
        break;
      case 'cls':
        threshold = thresholds.cls;
        break;
      case 'ttfb':
        threshold = thresholds.ttfb;
        break;
    }

    if (threshold && value > threshold) {
      console.warn(`Performance threshold exceeded: ${type} = ${value} (threshold: ${threshold})`);
      
      // Report to monitoring service
      this.reportThresholdExceeded(type, value, threshold);
    }
  }

  private startReporting() {
    if (this.config.reporting.interval > 0) {
      setInterval(() => {
        this.sendMetrics();
      }, this.config.reporting.interval * 1000);
    }
  }

  private async sendMetrics() {
    if (this.metrics.length === 0) return;

    const batch = this.metrics.splice(0, this.config.reporting.batchSize);
    
    try {
      await fetch(this.config.reporting.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics: batch,
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          url: window.location.href
        })
      });
    } catch (error) {
      console.error('Failed to send performance metrics:', error);
      // Put metrics back for retry
      this.metrics.unshift(...batch);
    }
  }

  private async reportThresholdExceeded(type: string, value: number, threshold: number) {
    try {
      await fetch('/api/performance/threshold-exceeded', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          value,
          threshold,
          timestamp: Date.now(),
          url: window.location.href,
          userAgent: navigator.userAgent
        })
      });
    } catch (error) {
      console.error('Failed to report performance threshold exceeded:', error);
    }
  }

  getMetrics(type?: string, limit?: number): typeof this.metrics {
    let filtered = type ? this.metrics.filter(m => m.type === type) : this.metrics;
    if (limit) {
      filtered = filtered.slice(-limit);
    }
    return filtered;
  }

  getAverageMetric(type: string, timeWindow?: number): number {
    const now = Date.now();
    const windowStart = timeWindow ? now - timeWindow : 0;
    
    const relevant = this.metrics.filter(m => 
      m.type === type && m.timestamp >= windowStart
    );
    
    if (relevant.length === 0) return 0;
    
    const sum = relevant.reduce((acc, m) => acc + m.value, 0);
    return sum / relevant.length;
  }
}

/**
 * Initialize performance optimization
 */
export function initializePerformanceOptimization(config: PerformanceConfig = PRODUCTION_PERFORMANCE_CONFIG) {
  console.log('Initializing performance optimization...');
  
  // Initialize cache manager
  const cacheManager = new CacheManager(config.caching);
  
  // Initialize performance monitor
  const performanceMonitor = new PerformanceMonitor(config.monitoring);
  
  // Set up image lazy loading
  if (config.lazyLoading.enabled && config.lazyLoading.components.images) {
    initializeImageLazyLoading(config.imageOptimization);
  }
  
  // Set up preloading
  if (config.preloading.enabled) {
    setupResourcePreloading(config.preloading);
  }
  
  console.log('Performance optimization initialized successfully');
  
  return {
    cacheManager,
    performanceMonitor,
    config
  };
}

/**
 * Initialize image lazy loading
 */
function initializeImageLazyLoading(config: ImageOptimizationConfig) {
  if (typeof window === 'undefined' || !config.lazyLoading.enabled) return;

  const imageObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            imageObserver.unobserve(img);
          }
        }
      });
    },
    {
      rootMargin: config.lazyLoading.threshold
    }
  );

  // Observe existing images
  document.querySelectorAll('img[data-src]').forEach((img) => {
    imageObserver.observe(img);
  });

  // Observe new images
  const mutationObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          const images = element.querySelectorAll('img[data-src]');
          images.forEach((img) => imageObserver.observe(img));
        }
      });
    });
  });

  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
}

/**
 * Setup resource preloading
 */
function setupResourcePreloading(config: PreloadingConfig) {
  if (typeof document === 'undefined') return;

  const head = document.head;

  // DNS prefetch
  config.dns.prefetch.forEach((domain) => {
    const link = document.createElement('link');
    link.rel = 'dns-prefetch';
    link.href = domain;
    head.appendChild(link);
  });

  // Preconnect
  config.dns.preconnect.forEach((domain) => {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = domain;
    link.crossOrigin = 'anonymous';
    head.appendChild(link);
  });

  // Preload critical resources
  config.critical.css.forEach((href) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = 'style';
    head.appendChild(link);
  });

  config.critical.js.forEach((href) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = 'script';
    head.appendChild(link);
  });

  config.critical.fonts.forEach((href) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = 'style';
    link.crossOrigin = 'anonymous';
    head.appendChild(link);
  });
}

export default {
  PRODUCTION_PERFORMANCE_CONFIG,
  CacheManager,
  PerformanceMonitor,
  initializePerformanceOptimization
};