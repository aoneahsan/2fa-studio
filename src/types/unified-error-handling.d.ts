declare module 'unified-error-handling' {
  export interface ErrorServiceConfig {
    environment?: string;
    userId?: string;
    metadata?: Record<string, any>;
  }

  export class UnifiedErrorHandler {
    constructor(config?: ErrorServiceConfig);
    handleError(error: Error, context?: string): void;
    logError(error: Error, level?: string): void;
  }

  export default UnifiedErrorHandler;
}