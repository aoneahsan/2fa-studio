/**
 * Performance monitoring utilities
 * @module utils/performance-monitor
 */

import React from 'react';

export interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  bundleSize: number;
  memoryUsage: number;
  networkRequests: number;
  errors: number;
  userId?: string;
  timestamp: Date;
}

export interface ComponentPerformance {
  componentName: string;
  renderTime: number;
  mountTime: number;
  updateCount: number;
  rerenderReasons: string[];
}

export class PerformanceMonitor {
  private static metrics: PerformanceMetrics[] = [];
  private static componentMetrics: Map<string, ComponentPerformance> = new Map();
  private static observers: PerformanceObserver[] = [];

  /**
   * Initialize performance monitoring
   */
  static initialize(): void {
    this.setupPerformanceObservers();
    this.setupMemoryMonitoring();
    this.setupNetworkMonitoring();
    this.startPeriodicReporting();
  }

  /**
   * Record page load performance
   */
  static recordPageLoad(): void {
    if (typeof window === 'undefined') return;

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (!navigation) return;

    const metrics: PerformanceMetrics = {
      loadTime: navigation.loadEventEnd - navigation.fetchStart,
      renderTime: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      bundleSize: this.calculateBundleSize(),
      memoryUsage: this.getMemoryUsage(),
      networkRequests: performance.getEntriesByType('resource').length,
      errors: 0,
      timestamp: new Date()
    };

    this.metrics.push(metrics);
    this.reportMetrics(metrics);
  }

  /**
   * Record component performance
   */
  static recordComponentRender(
    componentName: string,
    renderTime: number,
    mountTime?: number,
    rerenderReason?: string
  ): void {
    const existing = this.componentMetrics.get(componentName);
    
    if (existing) {
      existing.renderTime = renderTime;
      existing.updateCount++;
      if (rerenderReason) {
        existing.rerenderReasons.push(rerenderReason);
      }
    } else {
      this.componentMetrics.set(componentName, {
        componentName,
        renderTime,
        mountTime: mountTime || 0,
        updateCount: 1,
        rerenderReasons: rerenderReason ? [rerenderReason] : []
      });
    }
  }

  /**
   * Mark performance milestone
   */
  static mark(name: string): void {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(name);
    }
  }

  /**
   * Measure performance between two marks
   */
  static measure(name: string, startMark: string, endMark?: string): number {
    if (typeof performance !== 'undefined' && performance.measure) {
      performance.measure(name, startMark, endMark);
      const measures = performance.getEntriesByName(name, 'measure');
      return measures.length > 0 ? measures[measures.length - 1].duration : 0;
    }
    return 0;
  }

  /**
   * Get current memory usage
   */
  static getMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as unknown).memory;
      return memory.usedJSHeapSize / (1024 * 1024); // MB
    }
    return 0;
  }

  /**
   * Get performance summary
   */
  static getPerformanceSummary(): {
    averageLoadTime: number;
    averageRenderTime: number;
    slowestComponents: ComponentPerformance[];
    memoryTrend: number[];
    errorRate: number;
  } {
    const recentMetrics = this.metrics.slice(-10);
    
    const averageLoadTime = recentMetrics.reduce((sum, m) => sum + m.loadTime, 0) / recentMetrics.length || 0;
    const averageRenderTime = recentMetrics.reduce((sum, m) => sum + m.renderTime, 0) / recentMetrics.length || 0;
    
    const slowestComponents = Array.from(this.componentMetrics.values())
      .sort((a, b) => b.renderTime - a.renderTime)
      .slice(0, 5);
    
    const memoryTrend = recentMetrics.map(m => m.memoryUsage);
    const errorRate = recentMetrics.reduce((sum, m) => sum + m.errors, 0) / recentMetrics.length || 0;

    return {
      averageLoadTime,
      averageRenderTime,
      slowestComponents,
      memoryTrend,
      errorRate
    };
  }

  /**
   * Setup performance observers
   */
  private static setupPerformanceObservers(): void {
    if (typeof PerformanceObserver === 'undefined') return;

    // Long Task Observer
    if ('PerformanceObserver' in window) {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.duration > 50) { // Tasks longer than 50ms
              console.warn(`Long task detected: ${entry.duration}ms`);
              this.reportLongTask(entry.duration);
            }
          });
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.push(longTaskObserver);
      } catch (_e) {
        // Long task API not supported
      }
    }

    // Layout Shift Observer
    try {
      const layoutShiftObserver = new PerformanceObserver((list) => {
        let cumulativeLayoutShift = 0;
        list.getEntries().forEach((entry: unknown) => {
          if (!entry.hadRecentInput) {
            cumulativeLayoutShift += entry.value;
          }
        });
        
        if (cumulativeLayoutShift > 0.1) {
          console.warn(`High layout shift detected: ${cumulativeLayoutShift}`);
        }
      });
      layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(layoutShiftObserver);
    } catch (_e) {
      // Layout shift API not supported
    }

    // Largest Contentful Paint Observer
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry.startTime > 2500) { // LCP > 2.5s is poor
          console.warn(`Poor LCP detected: ${lastEntry.startTime}ms`);
        }
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);
    } catch (_e) {
      // LCP API not supported
    }
  }

  /**
   * Setup memory monitoring
   */
  private static setupMemoryMonitoring(): void {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as unknown).memory;
        const usedMB = memory.usedJSHeapSize / (1024 * 1024);
        const limitMB = memory.jsHeapSizeLimit / (1024 * 1024);
        
        // Alert if memory usage is high
        if (usedMB / limitMB > 0.8) {
          console.warn(`High memory usage: ${usedMB.toFixed(2)}MB / ${limitMB.toFixed(2)}MB`);
        }
      }, 30000); // Check every 30 seconds
    }
  }

  /**
   * Setup network monitoring
   */
  private static setupNetworkMonitoring(): void {
    if ('navigator' in window && 'connection' in navigator) {
      const connection = (navigator as unknown).connection;
      
      if (connection) {
        const logConnectionInfo = () => {
          console.log(`Network: ${connection.effectiveType}, RTT: ${connection.rtt}ms, Downlink: ${connection.downlink}Mbps`);
        };
        
        connection.addEventListener('change', logConnectionInfo);
        logConnectionInfo(); // Log initial state
      }
    }
  }

  /**
   * Calculate bundle size
   */
  private static calculateBundleSize(): number {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    return resources
      .filter(resource => resource.name.includes('.js') || resource.name.includes('.css'))
      .reduce((total, resource) => total + (resource.transferSize || 0), 0);
  }

  /**
   * Report performance metrics
   */
  private static reportMetrics(metrics: PerformanceMetrics): void {
    // In a real app, this would send to analytics service
    console.log('Performance Metrics:', {
      loadTime: `${metrics.loadTime.toFixed(2)}ms`,
      renderTime: `${metrics.renderTime.toFixed(2)}ms`,
      bundleSize: `${(metrics.bundleSize / 1024).toFixed(2)}KB`,
      memoryUsage: `${metrics.memoryUsage.toFixed(2)}MB`,
      networkRequests: metrics.networkRequests
    });
  }

  /**
   * Report long task
   */
  private static reportLongTask(duration: number): void {
    // In a real app, this would send to monitoring service
    console.warn(`Long task: ${duration.toFixed(2)}ms`);
  }

  /**
   * Start periodic performance reporting
   */
  private static startPeriodicReporting(): void {
    setInterval(() => {
      const summary = this.getPerformanceSummary();
      console.log('Performance Summary:', summary);
    }, 60000); // Report every minute
  }

  /**
   * Cleanup observers
   */
  static cleanup(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

/**
 * React component performance wrapper
 */
export const withPerformanceMonitoring = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName: string
) => {
  return React.memo((props: P) => {
    const renderStart = React.useRef<number>();
    const mountStart = React.useRef<number>();

    React.useEffect(() => {
      mountStart.current = performance.now();
      
      return () => {
        if (mountStart.current) {
          const mountTime = performance.now() - mountStart.current;
          PerformanceMonitor.recordComponentRender(componentName, 0, mountTime);
        }
      };
    }, []);

    React.useLayoutEffect(() => {
      if (renderStart.current) {
        const renderTime = performance.now() - renderStart.current;
        PerformanceMonitor.recordComponentRender(componentName, renderTime);
      }
    });

    renderStart.current = performance.now();

    return React.createElement(WrappedComponent, props);
  });
};