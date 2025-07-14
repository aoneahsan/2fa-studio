/**
 * Global error boundary component
 * @module utils/error-boundary
 */

import React, { Component, ReactNode } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  _error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (_error: Error, errorInfo: React.ErrorInfo) => void;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      _error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(_error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(_error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by ErrorBoundary:', _error, errorInfo);
    
    this.setState({
      _error,
      errorInfo
    });

    // Report error to monitoring service
    this.reportError(_error, errorInfo);
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(_error, errorInfo);
    }
  }

  private reportError(_error: Error, errorInfo: React.ErrorInfo) {
    // In a real app, this would send to Sentry or similar service
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Queue error for reporting when online
    this.queueErrorReport(errorReport);
  }

  private queueErrorReport(errorReport: unknown) {
    try {
      const existingErrors = JSON.parse(
        localStorage.getItem('error_queue') || '[]'
      );
      
      existingErrors.push(errorReport);
      
      // Keep only last 10 errors to prevent storage overflow
      if (existingErrors.length > 10) {
        existingErrors.splice(0, existingErrors.length - 10);
      }
      
      localStorage.setItem('error_queue', JSON.stringify(existingErrors));
    } catch (_e) {
      console.error('Failed to queue error report:', _e);
    }
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      _error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary">
          <div className="error-boundary__container">
            <h2 className="error-boundary__title">
              Something went wrong
            </h2>
            
            <p className="error-boundary__message">
              We're sorry, but something unexpected happened. Please try again.
            </p>
            
            <div className="error-boundary__actions">
              <button 
                onClick={this.handleRetry}
                className="error-boundary__retry-button"
              >
                Try Again
              </button>
              
              <button 
                onClick={() => window.location.reload()}
                className="error-boundary__reload-button"
              >
                Reload Page
              </button>
            </div>
            
            {process.env.NODE_ENV === 'development' && (
              <details className="error-boundary__details">
                <summary>Error Details (Development Only)</summary>
                <pre className="error-boundary__error">
                  {this.state.error?.stack}
                </pre>
                <pre className="error-boundary__component-stack">
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for functional components
export const useErrorHandler = () => {
  const handleError = (_error: Error, errorInfo?: unknown) => {
    console.error('Error handled by hook:', _error);
    
    // Report error
    const errorReport = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      ...errorInfo
    };

    try {
      const existingErrors = JSON.parse(
        localStorage.getItem('error_queue') || '[]'
      );
      
      existingErrors.push(errorReport);
      localStorage.setItem('error_queue', JSON.stringify(existingErrors));
    } catch (_e) {
      console.error('Failed to queue error report:', _e);
    }
  };

  return { handleError };
};

// Error boundary wrapper for specific components
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) => {
  return (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );
};