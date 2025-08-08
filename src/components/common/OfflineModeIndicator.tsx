import React, { useState, useEffect } from 'react';
import { WifiIcon, WifiOffIcon } from 'lucide-react';
import { Card } from '@components/ui/card';
import { Button } from '@components/ui/button';

interface OfflineModeIndicatorProps {
  className?: string;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center';
  showBanner?: boolean;
}

export const OfflineModeIndicator: React.FC<OfflineModeIndicatorProps> = ({
  className = '',
  position = 'bottom-right',
  showBanner = true
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getPositionClasses = () => {
    switch (position) {
      case 'top-right':
        return 'top-4 right-4';
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'center':
        return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
      default:
        return 'bottom-4 right-4';
    }
  };

  // Show reconnected message
  if (showReconnected && isOnline) {
    return (
      <div className={`fixed ${getPositionClasses()} z-50 ${className}`}>
        <div className="bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
          <WifiIcon className="w-5 h-5" />
          <span className="font-medium">Back Online</span>
        </div>
      </div>
    );
  }

  // Show offline indicator
  if (!isOnline) {
    return (
      <>
        {/* Floating indicator */}
        <div className={`fixed ${getPositionClasses()} z-50 ${className}`}>
          <div className="bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <WifiOffIcon className="w-5 h-5 text-yellow-400" />
            <span className="font-medium">Offline Mode</span>
          </div>
        </div>

        {/* Optional full-width banner */}
        {showBanner && (
          <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-yellow-900 px-4 py-2 z-40">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-2">
                <WifiOffIcon className="w-5 h-5" />
                <span className="font-medium">
                  You're offline. Some features may be limited.
                </span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

// Minimal offline indicator (icon only)
export const OfflineStatusIcon: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const updateStatus = () => setIsOnline(navigator.onLine);
    
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, []);

  if (!isOnline) {
    return (
      <div className="flex items-center gap-1 text-yellow-500">
        <WifiOffIcon className="w-4 h-4" />
        <span className="text-sm">Offline</span>
      </div>
    );
  }

  return null;
};

// Full-screen offline page for critical features
export const OfflineScreen: React.FC<{
  message?: string;
  onRetry?: () => void;
}> = ({ 
  message = "This feature requires an internet connection.", 
  onRetry 
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full p-8 text-center">
        <WifiOffIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">You're Offline</h2>
        <p className="text-muted-foreground mb-6">{message}</p>
        
        <div className="space-y-3">
          <Button 
            onClick={onRetry || (() => window.location.reload())}
            className="w-full"
          >
            Try Again
          </Button>
          <p className="text-sm text-muted-foreground">
            Check your internet connection and try again
          </p>
        </div>
      </Card>
    </div>
  );
};

// Hook to check online status
export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleStatusChange = () => setIsOnline(navigator.onLine);
    
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);

    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  return isOnline;
};