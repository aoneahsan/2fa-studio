/**
 * Mock for unified-error-handling package
 */
import { vi } from 'vitest';

export class ErrorHandler {
  constructor(config: any) {}
  
  async init(): Promise<void> {}
  async captureError(error: Error | string, context?: any): Promise<void> {}
  captureMessage(message: string, level?: string): void {}
  async setUser(user: any): Promise<void> {}
  async clearUser(): Promise<void> {}
  setContext(key: string, value: any): void {}
  clearContext(): void {}
  beforeBreadcrumb(callback: Function): void {}
  async flush(): Promise<void> {}
  async getStats(timeRange?: any): Promise<any> {
    return { errors: 0, warnings: 0 };
  }
  
  static formatError(error: Error): string {
    return error.message;
  }
}

export const errorReporter = {
  report: vi.fn(),
  reportError: vi.fn(),
  reportWarning: vi.fn(),
  reportInfo: vi.fn(),
};

export const createErrorBoundary = (Component: any) => Component;

export const withErrorHandler = (Component: any) => Component;

export const errorTypes = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  PERMISSION_ERROR: 'PERMISSION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
};

export const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

export type ErrorContext = {
  category?: string;
  severity?: string;
  tags?: string[];
  metadata?: Record<string, any>;
};

export type ErrorCategory = string;
export type ErrorHandlerConfig = any;