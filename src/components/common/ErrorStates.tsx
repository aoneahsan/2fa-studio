import React from 'react';
import { Button } from '@components/ui/button';
import { 
  ExclamationTriangleIcon,
  XCircleIcon,
  ArrowPathIcon,
  WifiIcon,
  ServerIcon,
  ShieldExclamationIcon,
  ClockIcon,
  BugAntIcon
} from '@heroicons/react/24/outline';

interface ErrorStateProps {
  type?: 'generic' | 'network' | 'server' | 'permission' | 'timeout' | 'not-found' | 'bug';
  title?: string;
  message?: string;
  onRetry?: () => void;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'outline';
  }>;
  className?: string;
}

const errorConfigs = {
  generic: {
    icon: ExclamationTriangleIcon,
    iconColor: 'text-red-500',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    title: 'Something went wrong',
    message: 'An unexpected error occurred. Please try again.'
  },
  network: {
    icon: WifiIcon,
    iconColor: 'text-yellow-500',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    title: 'Connection error',
    message: 'Please check your internet connection and try again.'
  },
  server: {
    icon: ServerIcon,
    iconColor: 'text-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    title: 'Server error',
    message: 'Our servers are having issues. Please try again later.'
  },
  permission: {
    icon: ShieldExclamationIcon,
    iconColor: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    title: 'Permission denied',
    message: 'You don\'t have permission to perform this action.'
  },
  timeout: {
    icon: ClockIcon,
    iconColor: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    title: 'Request timeout',
    message: 'The request took too long. Please try again.'
  },
  'not-found': {
    icon: XCircleIcon,
    iconColor: 'text-gray-500',
    bgColor: 'bg-gray-50 dark:bg-gray-900/20',
    title: 'Not found',
    message: 'The requested resource could not be found.'
  },
  bug: {
    icon: BugAntIcon,
    iconColor: 'text-red-500',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    title: 'Application error',
    message: 'We encountered a bug. Our team has been notified.'
  }
};

export const ErrorState: React.FC<ErrorStateProps> = ({
  type = 'generic',
  title,
  message,
  onRetry,
  actions = [],
  className = ''
}) => {
  const config = errorConfigs[type];
  const Icon = config.icon;

  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
      <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${config.bgColor}`}>
        <Icon className={`w-8 h-8 ${config.iconColor}`} />
      </div>
      
      <h3 className="text-lg font-semibold mb-2">
        {title || config.title}
      </h3>
      
      <p className="text-muted-foreground mb-6 max-w-sm">
        {message || config.message}
      </p>
      
      <div className="flex items-center gap-2">
        {onRetry && (
          <Button onClick={onRetry} variant="primary">
            <ArrowPathIcon className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        )}
        
        {actions.map((action, index) => (
          <Button
            key={index}
            onClick={action.onClick}
            variant={action.variant || 'outline'}
          >
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
};

// Inline error message
interface InlineErrorProps {
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export const InlineError: React.FC<InlineErrorProps> = ({
  message,
  onDismiss,
  className = ''
}) => {
  return (
    <div className={`flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-md ${className}`}>
      <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0" />
      <p className="text-sm flex-1">{message}</p>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-red-500 hover:text-red-700"
        >
          <XCircleIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

// Error boundary fallback
interface ErrorBoundaryFallbackProps {
  error: Error;
  resetError: () => void;
}

export const ErrorBoundaryFallback: React.FC<ErrorBoundaryFallbackProps> = ({
  error,
  resetError
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <ErrorState
          type="bug"
          title="Application Error"
          message={`${error.message || 'An unexpected error occurred'}`}
          onRetry={resetError}
          actions={[
            {
              label: 'Go Home',
              onClick: () => window.location.href = '/',
              variant: 'outline'
            }
          ]}
        />
        
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <summary className="cursor-pointer text-sm font-medium">
              Error Details (Development Only)
            </summary>
            <pre className="mt-2 text-xs overflow-auto">
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
};

// Field error message
export const FieldError: React.FC<{
  error?: string;
  className?: string;
}> = ({ error, className = '' }) => {
  if (!error) return null;
  
  return (
    <p className={`text-sm text-red-600 dark:text-red-400 mt-1 ${className}`}>
      {error}
    </p>
  );
};

// Error toast notification
export const ErrorToast: React.FC<{
  title?: string;
  message: string;
  onClose: () => void;
}> = ({ title = 'Error', message, onClose }) => {
  React.useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-4 right-4 max-w-sm bg-background border border-border rounded-lg shadow-lg p-4 animate-in slide-in-from-bottom-2">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <XCircleIcon className="w-5 h-5 text-red-500" />
        </div>
        <div className="flex-1">
          <h4 className="font-medium">{title}</h4>
          <p className="text-sm text-muted-foreground mt-1">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 text-muted-foreground hover:text-foreground"
        >
          <XCircleIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// Error summary for forms
interface FormErrorSummaryProps {
  errors: Record<string, string>;
  className?: string;
}

export const FormErrorSummary: React.FC<FormErrorSummaryProps> = ({
  errors,
  className = ''
}) => {
  const errorMessages = Object.entries(errors).filter(([_, message]) => message);
  
  if (errorMessages.length === 0) return null;

  return (
    <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-medium text-red-800 dark:text-red-200">
            Please fix the following errors:
          </h4>
          <ul className="mt-2 space-y-1">
            {errorMessages.map(([field, message]) => (
              <li key={field} className="text-sm text-red-700 dark:text-red-300">
                • {message}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

// Retry mechanism wrapper
interface RetryWrapperProps {
  error?: Error | null;
  loading?: boolean;
  onRetry: () => void;
  children: React.ReactNode;
  errorType?: ErrorStateProps['type'];
}

export const RetryWrapper: React.FC<RetryWrapperProps> = ({
  error,
  loading,
  onRetry,
  children,
  errorType = 'generic'
}) => {
  if (error) {
    return (
      <ErrorState
        type={errorType}
        message={error.message}
        onRetry={onRetry}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
};