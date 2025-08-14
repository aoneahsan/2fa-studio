/**
 * Production Monitoring Service
 * Handles performance monitoring, error tracking, and analytics
 */

import { performance as firebasePerformance } from '../config/firebase';
import { analytics } from '../config/firebase';
import { logEvent, setUserId, setUserProperties } from 'firebase/analytics';
import { trace } from 'firebase/performance';

export enum EventCategory {
  AUTHENTICATION = 'authentication',
  ACCOUNT = 'account',
  BACKUP = 'backup',
  SYNC = 'sync',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  ERROR = 'error',
  USER_ACTION = 'user_action'
}

export interface MonitoringEvent {
  category: EventCategory;
  action: string;
  label?: string;
  value?: number;
  metadata?: Record<string, any>;
}

export interface PerformanceMetric {
  name: string;
  duration: number;
  success: boolean;
  metadata?: Record<string, any>;
}

export interface ErrorReport {
  message: string;
  stack?: string;
  context?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  metadata?: Record<string, any>;
}

export class MonitoringService {
  private static instance: MonitoringService;
  private static userId: string | null = null;
  private static sessionId: string = crypto.randomUUID();
  private static errorQueue: ErrorReport[] = [];
  private static metricsBuffer: PerformanceMetric[] = [];
  private static isInitialized = false;

  private constructor() {}

  public static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  /**
   * Initialize monitoring services
   */
  public async initialize(userId?: string): Promise<void> {
    try {
      MonitoringService.isInitialized = true;
      
      if (userId) {
        MonitoringService.userId = userId;
        
        // Set user ID for analytics
        if (analytics) {
          await analytics.then(a => {
            if (a) {
              setUserId(a, userId);
              setUserProperties(a, {
                account_type: 'standard',
                app_version: '1.0.0'
              });
            }
          });
        }
      }

      // Start monitoring
      this.startPerformanceMonitoring();
      this.startErrorMonitoring();
      
      // Track session start
      this.trackEvent({
        category: EventCategory.USER_ACTION,
        action: 'session_start',
        metadata: {
          sessionId: MonitoringService.sessionId
        }
      });

      console.log('Monitoring service initialized');
    } catch (error) {
      console.error('Failed to initialize monitoring:', error);
    }
  }

  /**
   * Track custom event
   */
  public async trackEvent(event: MonitoringEvent): Promise<void> {
    if (!MonitoringService.isInitialized) return;

    try {
      // Log to Firebase Analytics
      if (analytics) {
        await analytics.then(a => {
          if (a) {
            logEvent(a, event.action, {
              category: event.category,
              label: event.label,
              value: event.value,
              ...event.metadata
            });
          }
        });
      }

      // Also log to console in development
      if (import.meta.env.DEV) {
        console.log('[Analytics]', event);
      }
    } catch (error) {
      console.error('Failed to track event:', error);
    }
  }

  /**
   * Track performance metric
   */
  public async trackPerformance(metric: PerformanceMetric): Promise<void> {
    if (!MonitoringService.isInitialized) return;

    try {
      MonitoringService.metricsBuffer.push(metric);

      // Log to Firebase Performance
      if (firebasePerformance) {
        const customTrace = trace(firebasePerformance, metric.name);
        customTrace.putMetric('duration', metric.duration);
        customTrace.putAttribute('success', metric.success.toString());
        
        if (metric.metadata) {
          Object.entries(metric.metadata).forEach(([key, value]) => {
            customTrace.putAttribute(key, String(value));
          });
        }
        
        customTrace.stop();
      }

      // Flush buffer if needed
      if (MonitoringService.metricsBuffer.length > 10) {
        await this.flushMetrics();
      }
    } catch (error) {
      console.error('Failed to track performance:', error);
    }
  }

  /**
   * Report error
   */
  public async reportError(error: ErrorReport): Promise<void> {
    if (!MonitoringService.isInitialized) return;

    try {
      // Add to error queue
      MonitoringService.errorQueue.push({
        ...error,
        userId: error.userId || MonitoringService.userId,
        metadata: {
          ...error.metadata,
          sessionId: MonitoringService.sessionId,
          timestamp: new Date().toISOString()
        }
      });

      // Track error event
      await this.trackEvent({
        category: EventCategory.ERROR,
        action: 'error_occurred',
        label: error.severity,
        metadata: {
          message: error.message,
          context: error.context
        }
      });

      // Flush errors if critical
      if (error.severity === 'critical') {
        await this.flushErrors();
      }
    } catch (err) {
      console.error('Failed to report error:', err);
    }
  }

  /**
   * Measure operation performance
   */
  public async measurePerformance<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();
    let success = false;
    
    try {
      const result = await operation();
      success = true;
      return result;
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const duration = performance.now() - startTime;
      
      await this.trackPerformance({
        name: operationName,
        duration,
        success
      });
    }
  }

  /**
   * Track page view
   */
  public async trackPageView(pageName: string, metadata?: Record<string, any>): Promise<void> {
    await this.trackEvent({
      category: EventCategory.USER_ACTION,
      action: 'page_view',
      label: pageName,
      metadata
    });
  }

  /**
   * Track user action
   */
  public async trackUserAction(
    action: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.trackEvent({
      category: EventCategory.USER_ACTION,
      action,
      metadata
    });
  }

  /**
   * Track authentication event
   */
  public async trackAuthentication(
    action: 'login' | 'logout' | 'register' | 'password_reset',
    success: boolean,
    method?: string
  ): Promise<void> {
    await this.trackEvent({
      category: EventCategory.AUTHENTICATION,
      action,
      label: success ? 'success' : 'failure',
      metadata: { method }
    });
  }

  /**
   * Track account operation
   */
  public async trackAccountOperation(
    operation: 'create' | 'update' | 'delete' | 'import' | 'export',
    count: number
  ): Promise<void> {
    await this.trackEvent({
      category: EventCategory.ACCOUNT,
      action: `account_${operation}`,
      value: count
    });
  }

  /**
   * Track backup operation
   */
  public async trackBackupOperation(
    operation: 'create' | 'restore' | 'delete',
    provider: 'google_drive' | 'local' | 'firebase',
    success: boolean
  ): Promise<void> {
    await this.trackEvent({
      category: EventCategory.BACKUP,
      action: `backup_${operation}`,
      label: provider,
      metadata: { success }
    });
  }

  /**
   * Track sync operation
   */
  public async trackSyncOperation(
    operation: 'start' | 'complete' | 'conflict' | 'error',
    deviceCount?: number
  ): Promise<void> {
    await this.trackEvent({
      category: EventCategory.SYNC,
      action: `sync_${operation}`,
      value: deviceCount
    });
  }

  /**
   * Get performance metrics
   */
  public getMetrics(): PerformanceMetric[] {
    return [...MonitoringService.metricsBuffer];
  }

  /**
   * Get error reports
   */
  public getErrors(): ErrorReport[] {
    return [...MonitoringService.errorQueue];
  }

  /**
   * Clear metrics buffer
   */
  public clearMetrics(): void {
    MonitoringService.metricsBuffer = [];
  }

  /**
   * Clear error queue
   */
  public clearErrors(): void {
    MonitoringService.errorQueue = [];
  }

  // Private helper methods

  private startPerformanceMonitoring(): void {
    // Monitor page load performance
    if (typeof window !== 'undefined' && window.performance) {
      window.addEventListener('load', () => {
        const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        if (perfData) {
          this.trackPerformance({
            name: 'page_load',
            duration: perfData.loadEventEnd - perfData.fetchStart,
            success: true,
            metadata: {
              domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
              domInteractive: perfData.domInteractive - perfData.fetchStart
            }
          });
        }
      });
    }

    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) { // Tasks longer than 50ms
              this.trackPerformance({
                name: 'long_task',
                duration: entry.duration,
                success: true,
                metadata: {
                  startTime: entry.startTime
                }
              });
            }
          }
        });
        
        observer.observe({ entryTypes: ['longtask'] });
      } catch (error) {
        console.warn('Long task monitoring not supported');
      }
    }
  }

  private startErrorMonitoring(): void {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.reportError({
        message: event.message,
        stack: event.error?.stack,
        context: 'window_error',
        severity: 'high',
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.reportError({
        message: event.reason?.message || 'Unhandled promise rejection',
        stack: event.reason?.stack,
        context: 'promise_rejection',
        severity: 'high'
      });
    });
  }

  private async flushMetrics(): Promise<void> {
    if (MonitoringService.metricsBuffer.length === 0) return;

    try {
      // Send metrics to backend
      // For now, just clear the buffer
      MonitoringService.metricsBuffer = [];
    } catch (error) {
      console.error('Failed to flush metrics:', error);
    }
  }

  private async flushErrors(): Promise<void> {
    if (MonitoringService.errorQueue.length === 0) return;

    try {
      // Send errors to backend
      // For now, just clear the queue
      MonitoringService.errorQueue = [];
    } catch (error) {
      console.error('Failed to flush errors:', error);
    }
  }

  /**
   * Cleanup on logout
   */
  public cleanup(): void {
    // Track session end
    this.trackEvent({
      category: EventCategory.USER_ACTION,
      action: 'session_end',
      metadata: {
        sessionId: MonitoringService.sessionId
      }
    });

    // Flush remaining data
    this.flushMetrics();
    this.flushErrors();

    // Reset state
    MonitoringService.userId = null;
    MonitoringService.sessionId = crypto.randomUUID();
    MonitoringService.errorQueue = [];
    MonitoringService.metricsBuffer = [];
  }
}