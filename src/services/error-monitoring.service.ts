/**
 * Error monitoring and reporting service
 * @module services/error-monitoring
 */

import { FirestoreService } from './firestore.service';

export interface ErrorReport {
  id?: string;
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: Date;
  userAgent: string;
  url: string;
  userId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'auth' | 'firestore' | 'network' | 'ui' | 'encryption' | 'sync' | 'payment' | 'unknown';
  resolved: boolean;
  metadata?: Record<string, any>;
}

export interface ErrorStats {
  totalErrors: number;
  errorsByCategory: Record<string, number>;
  errorsBySeverity: Record<string, number>;
  recentErrors: ErrorReport[];
  topErrors: Array<{ message: string; count: number }>;
}

export class ErrorMonitoringService {
  private static isInitialized = false;
  private static errorQueue: ErrorReport[] = [];
  private static maxQueueSize = 50;
  private static flushInterval = 30000; // 30 seconds
  private static retryAttempts = 3;

  /**
   * Initialize error monitoring service
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Set up global error handlers
    this.setupGlobalErrorHandlers();
    
    // Set up periodic error reporting
    this.setupPeriodicReporting();
    
    // Process any queued errors from localStorage
    await this.processStoredErrors();
    
    this.isInitialized = true;
  }

  /**
   * Report an error
   */
  static async reportError(
    _error: Error | string,
    metadata?: {
      userId?: string;
      category?: ErrorReport['category'];
      severity?: ErrorReport['severity'];
      context?: Record<string, any>;
    }
  ): Promise<void> {
    const errorReport: ErrorReport = {
      message: typeof error === 'string' ? _error : error.message,
      stack: typeof error === 'object' ? error.stack : undefined,
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: metadata?.userId,
      severity: metadata?.severity || 'medium',
      category: metadata?.category || 'unknown',
      resolved: false,
      metadata: metadata?.context
    };

    // Add to queue
    this.errorQueue.push(errorReport);
    
    // Limit queue size
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift();
    }

    // Store in localStorage as backup
    this.storeErrorLocally(errorReport);

    // Attempt immediate reporting if online
    if (navigator.onLine) {
      await this.flushErrors();
    }
  }

  /**
   * Report authentication errors
   */
  static async reportAuthError(_error: Error, context?: Record<string, any>): Promise<void> {
    await this.reportError(_error, {
      category: 'auth',
      severity: 'high',
      context
    });
  }

  /**
   * Report Firestore errors
   */
  static async reportFirestoreError(_error: Error, operation: string, path: string): Promise<void> {
    await this.reportError(_error, {
      category: 'firestore',
      severity: 'medium',
      _context: { operation, path }
    });
  }

  /**
   * Report network errors
   */
  static async reportNetworkError(_error: Error, url: string, method?: string): Promise<void> {
    await this.reportError(_error, {
      category: 'network',
      severity: 'medium',
      _context: { url, method }
    });
  }

  /**
   * Report encryption errors
   */
  static async reportEncryptionError(_error: Error, operation: string): Promise<void> {
    await this.reportError(_error, {
      category: 'encryption',
      severity: 'critical',
      _context: { operation }
    });
  }

  /**
   * Report payment errors
   */
  static async reportPaymentError(_error: Error, provider: string, operation: string): Promise<void> {
    await this.reportError(_error, {
      category: 'payment',
      severity: 'high',
      _context: { provider, operation }
    });
  }

  /**
   * Get error statistics
   */
  static async getErrorStats(timeRange?: { start: Date; end: Date }): Promise<ErrorStats> {
    try {
      const filters: unknown[] = [];
      
      if (timeRange) {
        filters.push(
          { field: 'timestamp', operator: '>=', value: timeRange.start },
          { field: 'timestamp', operator: '<=', value: timeRange.end }
        );
      }

      const result = await FirestoreService.getCollection<ErrorReport>(
        'error_reports',
        filters,
        { limit: 1000, orderBy: { field: 'timestamp', direction: 'desc' } }
      );

      if (!result.success) {
        throw new Error('Failed to fetch error stats');
      }

      const errors = result.data;
      
      return {
        totalErrors: errors.length,
        errorsByCategory: this.groupBy(errors, 'category'),
        errorsBySeverity: this.groupBy(errors, 'severity'),
        recentErrors: errors.slice(0, 10),
        topErrors: this.getTopErrors(errors)
      };
    } catch (_error) {
      console.error('Failed to get error stats:', error);
      return {
        totalErrors: 0,
        errorsByCategory: {},
        errorsBySeverity: {},
        recentErrors: [],
        topErrors: []
      };
    }
  }

  /**
   * Mark error as resolved
   */
  static async resolveError(errorId: string): Promise<void> {
    try {
      await FirestoreService.updateDocument('error_reports', errorId, {
        resolved: true,
        resolvedAt: new Date()
      });
    } catch (_error) {
      console.error('Failed to resolve _error:', error);
    }
  }

  /**
   * Setup global error handlers
   */
  private static setupGlobalErrorHandlers(): void {
    // Catch unhandled JavaScript errors
    window.addEventListener('error', (event) => {
      this.reportError(event.error || event.message, {
        category: 'ui',
        severity: 'medium',
        _context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      });
    });

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.reportError(event.reason, {
        category: 'unknown',
        severity: 'medium',
        _context: {
          type: 'unhandled_promise_rejection'
        }
      });
    });

    // Catch network errors
    window.addEventListener('offline', () => {
      this.reportError('Network connection lost', {
        category: 'network',
        severity: 'low',
        _context: { type: 'offline' }
      });
    });
  }

  /**
   * Setup periodic error reporting
   */
  private static setupPeriodicReporting(): void {
    setInterval(async () => {
      if (navigator.onLine && this.errorQueue.length > 0) {
        await this.flushErrors();
      }
    }, this.flushInterval);
  }

  /**
   * Flush errors to remote storage
   */
  private static async flushErrors(): Promise<void> {
    if (this.errorQueue.length === 0) return;

    const errorsToFlush = [...this.errorQueue];
    this.errorQueue = [];

    for (const error of errorsToFlush) {
      try {
        await FirestoreService.createDocument('error_reports', _error);
      } catch (_e) {
        // If failed to report, add back to queue for retry
        this.errorQueue.push(_error);
        console.error('Failed to report _error:', _e);
      }
    }
  }

  /**
   * Store error in localStorage as backup
   */
  private static storeErrorLocally(_error: ErrorReport): void {
    try {
      const stored = JSON.parse(localStorage.getItem('error_queue') || '[]');
      stored.push(_error);
      
      // Keep only last 20 errors
      if (stored.length > 20) {
        stored.splice(0, stored.length - 20);
      }
      
      localStorage.setItem('error_queue', JSON.stringify(stored));
    } catch (_e) {
      console.error('Failed to store error locally:', _e);
    }
  }

  /**
   * Process errors stored in localStorage
   */
  private static async processStoredErrors(): Promise<void> {
    try {
      const storedErrors = JSON.parse(localStorage.getItem('error_queue') || '[]');
      
      if (storedErrors.length > 0) {
        this.errorQueue.push(...storedErrors);
        localStorage.removeItem('error_queue');
        
        if (navigator.onLine) {
          await this.flushErrors();
        }
      }
    } catch (_e) {
      console.error('Failed to process stored errors:', _e);
    }
  }

  /**
   * Group errors by field
   */
  private static groupBy(errors: ErrorReport[], field: keyof ErrorReport): Record<string, number> {
    return errors.reduce((acc, _error) => {
      const key = String(error[field]);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Get top occurring errors
   */
  private static getTopErrors(errors: ErrorReport[]): Array<{ message: string; count: number }> {
    const errorCounts = errors.reduce((acc, _error) => {
      acc[error.message] = (acc[error.message] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(errorCounts)
      .map(([message, count]) => ({ message, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  /**
   * Set user context for error reporting
   */
  static setUserContext(userId: string): void {
    // Store user context for subsequent error reports
    localStorage.setItem('error_monitoring_user_id', userId);
  }

  /**
   * Clear user context
   */
  static clearUserContext(): void {
    localStorage.removeItem('error_monitoring_user_id');
  }

  /**
   * Get current user context
   */
  private static getUserContext(): string | null {
    return localStorage.getItem('error_monitoring_user_id');
  }
}