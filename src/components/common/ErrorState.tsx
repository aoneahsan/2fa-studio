import React from 'react';
import { Button } from '@components/ui/button';
import { 
  ExclamationTriangleIcon, 
  XCircleIcon, 
  ArrowPathIcon,
  HomeIcon 
} from '@heroicons/react/24/outline';

interface ErrorStateProps {
  type?: 'error' | 'warning' | 'not-found' | 'permission' | 'server';
  title?: string;
  message?: string;
  onRetry?: () => void;
  showHomeButton?: boolean;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  type = 'error',
  title,
  message,
  onRetry,
  showHomeButton = false,
  className = ''
}) => {
  const getIcon = () => {
    switch (type) {
      case 'warning':
        return <ExclamationTriangleIcon className="w-16 h-16 text-yellow-500" />;
      case 'not-found':
        return (
          <div className="text-6xl font-bold text-muted-foreground">404</div>
        );
      case 'permission':
        return <XCircleIcon className="w-16 h-16 text-red-500" />;
      case 'server':
        return (
          <div className="text-6xl font-bold text-muted-foreground">500</div>
        );
      default:
        return <XCircleIcon className="w-16 h-16 text-red-500" />;
    }
  };

  const getDefaultTitle = () => {
    switch (type) {
      case 'warning':
        return 'Warning';
      case 'not-found':
        return 'Page Not Found';
      case 'permission':
        return 'Access Denied';
      case 'server':
        return 'Server Error';
      default:
        return 'Something went wrong';
    }
  };

  const getDefaultMessage = () => {
    switch (type) {
      case 'not-found':
        return "The page you're looking for doesn't exist.";
      case 'permission':
        return "You don't have permission to access this resource.";
      case 'server':
        return 'An unexpected server error occurred. Please try again later.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
      <div className="mb-4">{getIcon()}</div>
      
      <h2 className="text-xl font-semibold mb-2">
        {title || getDefaultTitle()}
      </h2>
      
      <p className="text-muted-foreground mb-6 max-w-md">
        {message || getDefaultMessage()}
      </p>
      
      <div className="flex gap-3">
        {onRetry && (
          <Button onClick={onRetry} variant="primary">
            <ArrowPathIcon className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        )}
        
        {showHomeButton && (
          <Button 
            onClick={() => window.location.href = '/'} 
            variant={onRetry ? 'outline' : 'primary'}
          >
            <HomeIcon className="w-4 h-4 mr-2" />
            Go Home
          </Button>
        )}
      </div>
    </div>
  );
};

// Specific error state components
export const NotFoundError: React.FC<{ message?: string }> = ({ message }) => (
  <ErrorState
    type="not-found"
    message={message}
    showHomeButton={true}
  />
);

export const PermissionError: React.FC<{ message?: string; onRetry?: () => void }> = ({ 
  message, 
  onRetry 
}) => (
  <ErrorState
    type="permission"
    message={message}
    onRetry={onRetry}
    showHomeButton={true}
  />
);

export const ServerError: React.FC<{ message?: string; onRetry?: () => void }> = ({ 
  message, 
  onRetry 
}) => (
  <ErrorState
    type="server"
    message={message}
    onRetry={onRetry}
  />
);

// Generic error boundary fallback
export const ErrorBoundaryFallback: React.FC<{
  error: Error;
  resetError: () => void;
}> = ({ error, resetError }) => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <ErrorState
      type="error"
      title="Application Error"
      message={error.message || 'An unexpected error occurred'}
      onRetry={resetError}
    />
  </div>
);