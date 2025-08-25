/**
 * CDN Optimization Configuration for 2FA Studio
 * 
 * This script configures various CDN optimizations including:
 * - Asset compression
 * - Image optimization
 * - Bundle splitting
 * - Critical resource preloading
 */

import { resolve } from 'path';
import { defineConfig } from 'vite';

// CDN Configuration
export const CDN_CONFIG = {
  // CloudFlare CDN settings (recommended for Firebase Hosting)
  cloudflare: {
    enabled: true,
    zones: {
      production: 'your-cloudflare-zone-id',
      staging: 'your-staging-cloudflare-zone-id'
    },
    settings: {
      // Performance optimizations
      minify: {
        css: true,
        js: true,
        html: true
      },
      
      // Compression
      compression: 'brotli', // Brotli > Gzip for better compression
      
      // Image optimization
      polish: 'lossy', // Automatic image optimization
      webp: true, // Convert images to WebP when supported
      
      // Caching
      browserCacheTtl: 31536000, // 1 year for static assets
      edgeCacheTtl: 86400, // 1 day for edge cache
      
      // Security
      ssl: 'strict',
      alwaysUseHttps: true,
      
      // Performance
      http2: true,
      http3: true,
      earlyHints: true,
      
      // Bot protection
      botFight: true,
      challengePassage: 'jschallenge'
    }
  },

  // Asset optimization rules
  assets: {
    // Critical resources (should be inlined or preloaded)
    critical: [
      '/manifest.json',
      '/sw.js',
      '/icons/icon-192x192.png'
    ],
    
    // Resources to preload
    preload: [
      {
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
        as: 'style',
        crossorigin: 'anonymous'
      },
      {
        href: 'https://fonts.gstatic.com',
        as: 'font',
        crossorigin: 'anonymous'
      }
    ],
    
    // Resources to prefetch
    prefetch: [
      '/api/config',
      '/api/features'
    ],
    
    // Image optimization settings
    images: {
      formats: ['avif', 'webp', 'jpeg', 'png'],
      quality: {
        avif: 50,
        webp: 70,
        jpeg: 80,
        png: 90
      },
      sizes: [96, 128, 192, 384, 512, 1024],
      lazy: true,
      placeholder: 'blur'
    }
  },

  // Bundle optimization
  bundles: {
    // Code splitting configuration
    splitChunks: {
      vendor: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendors',
        priority: 10,
        chunks: 'all'
      },
      firebase: {
        test: /[\\/]node_modules[\\/](firebase|@firebase)[\\/]/,
        name: 'firebase',
        priority: 20,
        chunks: 'all'
      },
      ui: {
        test: /[\\/]node_modules[\\/](@headlessui|@heroicons|buildkit-ui)[\\/]/,
        name: 'ui',
        priority: 15,
        chunks: 'all'
      },
      crypto: {
        test: /[\\/]node_modules[\\/](crypto-js|otplib|otpauth)[\\/]/,
        name: 'crypto',
        priority: 15,
        chunks: 'all'
      }
    },
    
    // Bundle size limits
    maxSize: {
      total: 512000, // 512KB total
      vendor: 256000, // 256KB for vendors
      main: 128000 // 128KB for main bundle
    }
  }
};

/**
 * Generate preload links for critical resources
 */
export function generatePreloadLinks() {
  return CDN_CONFIG.assets.preload.map(resource => `
    <link 
      rel="preload" 
      href="${resource.href}" 
      as="${resource.as}"
      ${resource.crossorigin ? `crossorigin="${resource.crossorigin}"` : ''}
    >`
  ).join('\n');
}

/**
 * Generate prefetch links for non-critical resources
 */
export function generatePrefetchLinks() {
  return CDN_CONFIG.assets.prefetch.map(href => `
    <link rel="prefetch" href="${href}">
  `).join('\n');
}

/**
 * Vite plugin for CDN optimization
 */
export function cdnOptimizationPlugin() {
  return {
    name: 'cdn-optimization',
    configResolved(config) {
      // Optimize build for CDN
      config.build.rollupOptions.output = {
        ...config.build.rollupOptions.output,
        manualChunks: CDN_CONFIG.bundles.splitChunks
      };
    },
    generateBundle(options, bundle) {
      // Add cache headers information
      Object.keys(bundle).forEach(fileName => {
        const chunk = bundle[fileName];
        if (chunk.type === 'chunk') {
          // Add version hash to chunk names for better caching
          const versionHash = Date.now().toString(36);
          chunk.fileName = chunk.fileName.replace(/\.js$/, `.${versionHash}.js`);
        }
      });
    },
    transformIndexHtml: {
      enforce: 'pre',
      transform(html, context) {
        // Inject preload and prefetch links
        const preloadLinks = generatePreloadLinks();
        const prefetchLinks = generatePrefetchLinks();
        
        return html.replace(
          '<head>',
          `<head>
            ${preloadLinks}
            ${prefetchLinks}
            <link rel="dns-prefetch" href="//fonts.googleapis.com">
            <link rel="dns-prefetch" href="//fonts.gstatic.com">
            <link rel="dns-prefetch" href="//firebaseapp.com">
            <link rel="dns-prefetch" href="//googleapis.com">
          `
        );
      }
    }
  };
}

/**
 * CloudFlare API integration for cache purging
 */
export class CloudFlareManager {
  constructor(apiToken, zoneId) {
    this.apiToken = apiToken;
    this.zoneId = zoneId;
    this.baseUrl = 'https://api.cloudflare.com/client/v4';
  }

  async purgeCache(files = []) {
    const response = await fetch(
      `${this.baseUrl}/zones/${this.zoneId}/purge_cache`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          files: files.length > 0 ? files : ['https://your-domain.com/*']
        })
      }
    );

    return response.json();
  }

  async updateSettings(settings) {
    const promises = Object.entries(settings).map(([setting, value]) =>
      fetch(
        `${this.baseUrl}/zones/${this.zoneId}/settings/${setting}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ value })
        }
      )
    );

    return Promise.all(promises);
  }

  async enableHSTS() {
    return this.updateSettings({
      security_header: {
        strict_transport_security: {
          enabled: true,
          max_age: 31536000,
          include_subdomains: true,
          nosniff: true
        }
      }
    });
  }
}

/**
 * Performance monitoring integration
 */
export function setupPerformanceMonitoring() {
  if (typeof window !== 'undefined') {
    // Core Web Vitals monitoring
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(console.log);
      getFID(console.log);
      getFCP(console.log);
      getLCP(console.log);
      getTTFB(console.log);
    });

    // Resource timing monitoring
    window.addEventListener('load', () => {
      const perfData = performance.getEntriesByType('navigation')[0];
      const metrics = {
        dns: perfData.domainLookupEnd - perfData.domainLookupStart,
        tcp: perfData.connectEnd - perfData.connectStart,
        ssl: perfData.connectEnd - perfData.secureConnectionStart,
        ttfb: perfData.responseStart - perfData.requestStart,
        domComplete: perfData.domComplete - perfData.navigationStart,
        loadComplete: perfData.loadEventEnd - perfData.navigationStart
      };

      // Send metrics to analytics
      if (window.gtag) {
        window.gtag('event', 'performance_metrics', {
          custom_map: metrics
        });
      }
    });
  }
}

export default CDN_CONFIG;