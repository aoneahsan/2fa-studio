import React, { useState, useEffect } from 'react';
import { Button } from '@components/ui/button';
import { Card } from '@components/ui/card';
import { WifiIcon, ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface NetworkErrorProps {
  error?: Error | null;
  onRetry?: () => void;
  fullScreen?: boolean;
}

export const NetworkError: React.FC<NetworkErrorProps> = ({
  error,
  onRetry,
  fullScreen = false
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = async () => {
    if (onRetry) {
      setRetrying(true);
      try {
        await onRetry();
      } finally {
        setRetrying(false);
      }
    }
  };

  const content = (
    <div className="flex flex-col items-center justify-center text-center p-8">
      <div className="mb-4">
        {!isOnline ? (
          <WifiIcon className="w-16 h-16 text-muted-foreground mx-auto" />
        ) : (
          <ExclamationTriangleIcon className="w-16 h-16 text-yellow-500 mx-auto" />
        )}
      </div>
      
      <h2 className="text-xl font-semibold mb-2">
        {!isOnline ? 'No Internet Connection' : 'Network Error'}
      </h2>
      
      <p className="text-muted-foreground mb-6 max-w-md">
        {!isOnline
          ? 'Please check your internet connection and try again.'
          : error?.message || 'Something went wrong. Please try again later.'}
      </p>
      
      {onRetry && (
        <Button
          onClick={handleRetry}
          disabled={retrying || !isOnline}
          className="min-w-[120px]"
        >
          {retrying ? (
            <>
              <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
              Retrying...
            </>
          ) : (
            <>
              <ArrowPathIcon className="w-4 h-4 mr-2" />
              Try Again
            </>
          )}
        </Button>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center p-4">
        {content}
      </div>
    );
  }

  return <Card className="w-full">{content}</Card>;
};

// Network Status Indicator
export const NetworkStatusIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const handleOnline = () => {
      setIsOnline(true);
      setShowIndicator(true);
      timeout = setTimeout(() => setShowIndicator(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowIndicator(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Show indicator if starting offline
    if (!navigator.onLine) {
      setShowIndicator(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearTimeout(timeout);
    };
  }, []);

  if (!showIndicator) return null;

  return (
    <div
      className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
        isOnline
          ? 'bg-green-500 text-white'
          : 'bg-red-500 text-white'
      }`}
    >
      <WifiIcon className="w-4 h-4" />
      <span className="text-sm font-medium">
        {isOnline ? 'Back Online' : 'No Connection'}
      </span>
    </div>
  );
};

// Hook for network status
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline };
};