/**
 * Bundle optimization utilities
 * @module utils/bundle-optimizer
 */

import React from 'react';

/**
 * Lazy load components with retry mechanism
 */
export const createLazyComponent = <T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ComponentType,
  retries: number = 3
) => {
  return React.lazy(async () => {
    let attempts = 0;
    
    while (attempts < retries) {
      try {
        return await importFunc();
      } catch (_error) {
        attempts++;
        
        if (attempts >= retries) {
          console.error(`Failed to load component after ${retries} attempts:`, _error);
          
          // Return a fallback component if loading fails
          if (fallback) {
            return { default: fallback };
          }
          
          // Return an error component
          return {
            default: () => React.createElement('div', {
              style: {
                padding: '20px',
                border: '1px solid #ff6b6b',
                borderRadius: '4px',
                backgroundColor: '#ffe0e0',
                color: '#d63031'
              }
            }, 'Failed to load component. Please refresh the page.')
          };
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }
    
    throw new Error('This should never be reached');
  });
};

/**
 * Preload critical components
 */
export const preloadComponents = {
  // Auth components
  LoginPage: () => import('@pages/auth/LoginPage'),
  RegisterPage: () => import('@pages/auth/RegisterPage'),
  
  // Core components
  AccountsList: () => import('@components/accounts/AccountsList'),
  AddAccountModal: () => import('@components/accounts/AddAccountModal'),
  SettingsPage: () => import('@pages/settings/SettingsPage'),
  
  // Admin components (only preload for admin users)
  AdminDashboard: () => import('@pages/admin/AdminDashboard'),
  UserManagement: () => import('@pages/admin/UserManagement')
};

/**
 * Intelligent preloading based on user behavior
 */
export class PreloadManager {
  private static preloadedComponents: Set<string> = new Set();
  private static preloadQueue: Array<{ name: string; loader: () => Promise<any> }> = [];
  private static isPreloading = false;

  /**
   * Preload component based on user interaction
   */
  static preloadOnHover(componentName: keyof typeof preloadComponents): void {
    if (this.preloadedComponents.has(componentName)) return;

    const loader = preloadComponents[componentName];
    if (loader) {
      this.queuePreload(componentName, loader);
    }
  }

  /**
   * Preload component on route change
   */
  static preloadOnRouteChange(route: string): void {
    const routeComponentMap: Record<string, keyof typeof preloadComponents> = {
      '/login': 'LoginPage',
      '/register': 'RegisterPage',
      '/accounts': 'AccountsList',
      '/settings': 'SettingsPage',
      '/admin': 'AdminDashboard',
      '/admin/users': 'UserManagement'
    };

    const componentName = routeComponentMap[route];
    if (componentName && !this.preloadedComponents.has(componentName)) {
      const loader = preloadComponents[componentName];
      if (loader) {
        this.queuePreload(componentName, loader);
      }
    }
  }

  /**
   * Preload based on user role
   */
  static preloadForUserRole(role: 'admin' | 'user'): void {
    if (role === 'admin') {
      this.preloadOnHover('AdminDashboard');
      this.preloadOnHover('UserManagement');
    }
    
    // Always preload core components
    this.preloadOnHover('AccountsList');
    this.preloadOnHover('SettingsPage');
  }

  /**
   * Queue component for preloading
   */
  private static queuePreload(name: string, loader: () => Promise<any>): void {
    this.preloadQueue.push({ name, loader });
    this.processQueue();
  }

  /**
   * Process preload queue
   */
  private static async processQueue(): Promise<void> {
    if (this.isPreloading || this.preloadQueue.length === 0) return;

    this.isPreloading = true;

    while (this.preloadQueue.length > 0) {
      const { name, loader } = this.preloadQueue.shift()!;
      
      try {
        // Only preload when network and CPU are idle
        await this.waitForIdleTime();
        
        await loader();
        this.preloadedComponents.add(name);
        
        console.log(`Preloaded component: ${name}`);
      } catch (_error) {
        console.warn(`Failed to preload component ${name}:`, _error);
      }
    }

    this.isPreloading = false;
  }

  /**
   * Wait for idle time to avoid blocking main thread
   */
  private static waitForIdleTime(): Promise<void> {
    return new Promise(resolve => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => resolve(), { timeout: 5000 });
      } else {
        setTimeout(resolve, 100);
      }
    });
  }
}

/**
 * Image optimization utilities
 */
export class ImageOptimizer {
  private static imageCache: Map<string, HTMLImageElement> = new Map();

  /**
   * Preload critical images
   */
  static preloadImages(urls: string[]): Promise<void[]> {
    return Promise.all(
      urls.map(url => this.preloadImage(url))
    );
  }

  /**
   * Preload single image
   */
  static preloadImage(url: string): Promise<void> {
    if (this.imageCache.has(url)) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        this.imageCache.set(url, img);
        resolve();
      };
      
      img.onerror = () => {
        reject(new Error(`Failed to load image: ${url}`));
      };
      
      img.src = url;
    });
  }

  /**
   * Get responsive image component
   */
  static getResponsiveImageComponent() {
    return ResponsiveImage;
  }
}

/**
 * Service worker for caching
 */
export const registerServiceWorker = (): void => {
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', _registration);
        
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content available, show update notification
                console.log('New content available, reload to update');
              }
            });
          }
        });
      } catch (_error) {
        console.error('Service Worker registration failed:', _error);
      }
    });
  }
};

/**
 * Memory management utilities
 */
export class MemoryManager {
  private static intervals: Set<NodeJS.Timeout> = new Set();
  private static timeouts: Set<NodeJS.Timeout> = new Set();

  /**
   * Set interval with automatic cleanup
   */
  static setInterval(callback: () => void, delay: number): NodeJS.Timeout {
    const interval = setInterval(callback, delay);
    this.intervals.add(interval);
    return interval;
  }

  /**
   * Set timeout with automatic cleanup
   */
  static setTimeout(callback: () => void, delay: number): NodeJS.Timeout {
    const timeout = setTimeout(() => {
      callback();
      this.timeouts.delete(timeout);
    }, delay);
    this.timeouts.add(timeout);
    return timeout;
  }

  /**
   * Clear specific interval
   */
  static clearInterval(interval: NodeJS.Timeout): void {
    clearInterval(interval);
    this.intervals.delete(interval);
  }

  /**
   * Clear specific timeout
   */
  static clearTimeout(timeout: NodeJS.Timeout): void {
    clearTimeout(timeout);
    this.timeouts.delete(timeout);
  }

  /**
   * Cleanup all intervals and timeouts
   */
  static cleanup(): void {
    this.intervals.forEach(interval => clearInterval(interval));
    this.timeouts.forEach(timeout => clearTimeout(timeout));
    this.intervals.clear();
    this.timeouts.clear();
  }

  /**
   * Force garbage collection (for debugging)
   */
  static forceGC(): void {
    if ('gc' in window && typeof (window as unknown).gc === 'function') {
      (window as unknown).gc();
    }
  }
}

/**
 * Responsive Image Component with lazy loading
 */
export const ResponsiveImage: React.FC<{
  src: string;
  alt: string;
  sizes?: { width: number; height: number }[];
}> = ({ src, alt, sizes }) => {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [isInView, setIsInView] = React.useState(false);
  const imgRef = React.useRef<HTMLImageElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#f0f0f0'
      }}
    >
      {/* Placeholder while loading */}
      {!isLoaded && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#e0e0e0',
            animation: 'pulse 2s infinite'
          }}
        />
      )}
      
      {/* Actual image */}
      <img
        ref={imgRef}
        src={isInView ? src : undefined}
        alt={alt}
        onLoad={handleLoad}
        style={{
          width: '100%',
          height: 'auto',
          transition: 'opacity 0.3s ease',
          opacity: isLoaded ? 1 : 0
        }}
        loading="lazy"
      />
    </div>
  );
};