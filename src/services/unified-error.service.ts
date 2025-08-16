/**
 * Unified Error Service using unified-error-handling v2.0.0
 * @module services/unified-error
 */

import * as UnifiedErrorHandling from 'unified-error-handling';

// Define types locally since they're not exported from the package
interface ErrorHandlerConfig {
  environment?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

interface ErrorContext {
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
}

type ErrorCategory = 'critical' | 'warning' | 'info';
type ErrorSeverity = 'high' | 'medium' | 'low';

// Create a wrapper class for UnifiedErrorHandler functionality
class UnifiedErrorHandler {
  constructor(config: any) {
    // Store config for later use
    this.config = config;
  }
  
  private config: any;
  
  async init() {
    await UnifiedErrorHandling.initialize(this.config);
  }
  
  handleError(error: Error, context?: string) {
    UnifiedErrorHandling.captureError(error as any);
  }
  
  logError(error: Error, level?: string) {
    UnifiedErrorHandling.captureMessage(error.message, level as any);
  }
}
import { FirestoreService } from './firestore.service';
import { StorageService, StorageKeys } from './storage.service';
import { Capacitor } from '@capacitor/core';

/**
 * Unified Error Service
 * Centralizes error handling using unified-error-handling package
 */
export class UnifiedErrorService {
  private static errorHandler: UnifiedErrorHandler;
  private static isInitialized = false;

  /**
   * Initialize the unified error handling service
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const config: ErrorHandlerConfig = {
      // Basic configuration
      appName: '2FA Studio',
      environment: process.env.NODE_ENV || 'production',
      userId: await this.getUserId(),
      
      // Error handling behavior
      enableGlobalHandlers: true,
      enableConsoleLogging: process.env.NODE_ENV === 'development',
      enableRemoteLogging: true,
      
      // Batching and performance
      batchErrors: true,
      batchInterval: 30000, // 30 seconds
      maxBatchSize: 50,
      maxRetries: 3,
      
      // Error filtering
      ignorePatterns: [
        /ResizeObserver loop limit exceeded/,
        /Non-Error promise rejection captured/,
        /Network request failed/
      ],
      
      // Custom error categories
      categories: {
        auth: 'Authentication',
        firestore: 'Database',
        network: 'Network',
        ui: 'User Interface',
        encryption: 'Encryption',
        sync: 'Synchronization',
        payment: 'Payment',
        biometric: 'Biometric',
        storage: 'Storage'
      },
      
      // Severity levels
      severityLevels: {
        low: 1,
        medium: 2,
        high: 3,
        critical: 4
      },
      
      // Custom metadata
      metadata: {
        platform: Capacitor.getPlatform(),
        appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
        deviceInfo: await this.getDeviceInfo()
      },
      
      // Error transformation
      transformError: (error, context) => {
        // Add custom transformations
        if (error.name === 'FirebaseError') {
          return {
            ...error,
            category: 'firestore' as ErrorCategory,
            severity: 'medium' as ErrorSeverity
          };
        }
        return error;
      },
      
      // Remote logging configuration
      remoteLogger: async (errors) => {
        // Send errors to Firestore
        for (const error of errors) {
          try {
            await FirestoreService.createDocument('error_reports', {
              message: error.message,
              stack: error.stack,
              category: error.category || 'unknown',
              severity: error.severity || 'medium',
              timestamp: new Date(),
              userId: error.userId,
              metadata: error.metadata,
              context: error.context,
              userAgent: navigator.userAgent,
              url: window.location.href,
              resolved: false
            });
          } catch (e) {
            console.error('Failed to log error to Firestore:', e);
          }
        }
      },
      
      // Local storage for offline support
      localStorage: {
        enabled: true,
        key: 'unified_error_queue',
        maxItems: 100
      },
      
      // Hooks
      beforeSend: async (error) => {
        // Add any pre-processing logic
        return error;
      },
      
      afterSend: async (error, success) => {
        // Add any post-processing logic
        if (!success) {
          console.error('Failed to send error:', error);
        }
      }
    };

    // Create error handler instance
    this.errorHandler = new UnifiedErrorHandler(config as any);
    
    // Initialize the error handler
    await this.errorHandler.init();
    
    // Set up additional error sources
    this.setupErrorSources();
    
    this.isInitialized = true;
  }

  /**
   * Report an error with context
   */
  static async reportError(
    error: Error | string,
    context?: ErrorContext
  ): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    await this.errorHandler.captureError(error, context);
  }

  /**
   * Report authentication error
   */
  static async reportAuthError(
    error: Error,
    operation: string
  ): Promise<void> {
    await this.reportError(error, {
      category: 'auth',
      severity: 'high',
      tags: ['authentication', operation],
      metadata: { operation }
    });
  }

  /**
   * Report Firestore error
   */
  static async reportFirestoreError(
    error: Error,
    operation: string,
    path: string
  ): Promise<void> {
    await this.reportError(error, {
      category: 'firestore',
      severity: 'medium',
      tags: ['database', operation],
      metadata: { operation, path }
    });
  }

  /**
   * Report network error
   */
  static async reportNetworkError(
    error: Error,
    url: string,
    method?: string
  ): Promise<void> {
    await this.reportError(error, {
      category: 'network',
      severity: 'medium',
      tags: ['network', method || 'unknown'],
      metadata: { url, method }
    });
  }

  /**
   * Report encryption error
   */
  static async reportEncryptionError(
    error: Error,
    operation: string
  ): Promise<void> {
    await this.reportError(error, {
      category: 'encryption',
      severity: 'critical',
      tags: ['security', 'encryption', operation],
      metadata: { operation }
    });
  }

  /**
   * Report payment error
   */
  static async reportPaymentError(
    error: Error,
    provider: string,
    operation: string
  ): Promise<void> {
    await this.reportError(error, {
      category: 'payment',
      severity: 'high',
      tags: ['payment', provider, operation],
      metadata: { provider, operation }
    });
  }

  /**
   * Report biometric error
   */
  static async reportBiometricError(
    error: Error,
    operation: string
  ): Promise<void> {
    await this.reportError(error, {
      category: 'biometric',
      severity: 'medium',
      tags: ['biometric', 'security', operation],
      metadata: { operation }
    });
  }

  /**
   * Report storage error
   */
  static async reportStorageError(
    error: Error,
    operation: string,
    key?: string
  ): Promise<void> {
    await this.reportError(error, {
      category: 'storage',
      severity: 'medium',
      tags: ['storage', operation],
      metadata: { operation, key }
    });
  }

  /**
   * Set user context
   */
  static async setUserContext(userId: string): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    await this.errorHandler.setUser({ id: userId });
    await StorageService.set('error_monitoring_user_id', userId);
  }

  /**
   * Clear user context
   */
  static async clearUserContext(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    await this.errorHandler.clearUser();
    await StorageService.remove('error_monitoring_user_id');
  }

  /**
   * Flush pending errors
   */
  static async flush(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    await this.errorHandler.flush();
  }

  /**
   * Get error statistics
   */
  static async getErrorStats(timeRange?: {
    start: Date;
    end: Date;
  }): Promise<any> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return await this.errorHandler.getStats(timeRange);
  }

  /**
   * Setup additional error sources
   */
  private static setupErrorSources(): void {
    // Catch React errors
    if (window.React && window.React.ErrorBoundary) {
      // React errors are caught by ErrorBoundary components
    }

    // Catch async errors in event handlers
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(...args: any[]) {
      const [type, listener, options] = args;
      
      if (typeof listener === 'function') {
        const wrappedListener = async function(this: any, ...eventArgs: any[]) {
          try {
            const result = listener.apply(this, eventArgs);
            if (result && typeof result.catch === 'function') {
              result.catch((error: Error) => {
                UnifiedErrorService.reportError(error, {
                  category: 'ui',
                  severity: 'medium',
                  tags: ['event-handler', type],
                  metadata: { eventType: type }
                });
              });
            }
            return result;
          } catch (error) {
            UnifiedErrorService.reportError(error as Error, {
              category: 'ui',
              severity: 'medium',
              tags: ['event-handler', type],
              metadata: { eventType: type }
            });
            throw error;
          }
        };
        
        return originalAddEventListener.call(this, type, wrappedListener, options);
      }
      
      return originalAddEventListener.apply(this, args);
    };
  }

  /**
   * Get user ID from storage
   */
  private static async getUserId(): Promise<string | undefined> {
    const userId = await StorageService.get<string>('error_monitoring_user_id');
    return userId || undefined;
  }

  /**
   * Get device information
   */
  private static async getDeviceInfo(): Promise<any> {
    if (Capacitor.isNativePlatform()) {
      try {
        const { Device } = await import('@capacitor/device');
        return await Device.getInfo();
      } catch (error) {
        console.error('Failed to get device info:', error);
      }
    }
    
    return {
      platform: 'web',
      userAgent: navigator.userAgent
    };
  }

  /**
   * Mark error as resolved in Firestore
   */
  static async resolveError(errorId: string): Promise<void> {
    try {
      await FirestoreService.updateDocument('error_reports', errorId, {
        resolved: true,
        resolvedAt: new Date()
      });
    } catch (error) {
      console.error('Failed to resolve error:', error);
    }
  }
}
