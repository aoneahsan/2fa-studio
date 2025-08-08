import React, { useState, useEffect } from 'react';
import { Card } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { 
  ExclamationTriangleIcon, 
  ClockIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface RateLimitInfo {
  isLimited: boolean;
  remainingRequests?: number;
  resetTime?: Date;
  retryAfter?: number; // seconds
  message?: string;
}

interface RateLimitFeedbackProps {
  rateLimitInfo: RateLimitInfo;
  onRetry?: () => void;
  feature?: string;
  className?: string;
}

export const RateLimitFeedback: React.FC<RateLimitFeedbackProps> = ({
  rateLimitInfo,
  onRetry,
  feature = 'this action',
  className = ''
}) => {
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    if (!rateLimitInfo.resetTime) return;

    const updateTimer = () => {
      const now = new Date();
      const reset = new Date(rateLimitInfo.resetTime!);
      const diff = reset.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('');
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      if (minutes > 0) {
        setTimeRemaining(`${minutes}m ${seconds}s`);
      } else {
        setTimeRemaining(`${seconds}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [rateLimitInfo.resetTime]);

  if (!rateLimitInfo.isLimited) return null;

  return (
    <Card className={`p-4 border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 ${className}`}>
      <div className="flex items-start gap-3">
        <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-medium text-yellow-900 dark:text-yellow-100">
            Rate Limit Reached
          </h3>
          <p className="text-sm text-yellow-700 dark:text-yellow-200 mt-1">
            {rateLimitInfo.message || `You've reached the limit for ${feature}.`}
          </p>
          
          {rateLimitInfo.remainingRequests !== undefined && (
            <p className="text-sm text-yellow-600 dark:text-yellow-300 mt-2">
              Remaining requests: {rateLimitInfo.remainingRequests}
            </p>
          )}
          
          {timeRemaining && (
            <div className="flex items-center gap-2 mt-2 text-sm text-yellow-600 dark:text-yellow-300">
              <ClockIcon className="w-4 h-4" />
              <span>Resets in {timeRemaining}</span>
            </div>
          )}
          
          {onRetry && (
            <Button
              onClick={onRetry}
              variant="outline"
              size="sm"
              className="mt-3"
              disabled={!!timeRemaining}
            >
              <ArrowPathIcon className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

// Inline rate limit indicator
export const RateLimitIndicator: React.FC<{
  used: number;
  limit: number;
  className?: string;
}> = ({ used, limit, className = '' }) => {
  const percentage = (used / limit) * 100;
  const isWarning = percentage >= 80;
  const isError = percentage >= 95;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${
            isError ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-green-500'
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <span className={`text-xs font-medium ${
        isError ? 'text-red-500' : isWarning ? 'text-yellow-500' : 'text-muted-foreground'
      }`}>
        {used}/{limit}
      </span>
    </div>
  );
};

// Toast notification for rate limits
export const RateLimitToast: React.FC<{
  message?: string;
  retryAfter?: number;
}> = ({ message, retryAfter }) => {
  return (
    <div className="flex items-center gap-3">
      <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />
      <div>
        <p className="font-medium">Rate limit exceeded</p>
        <p className="text-sm text-muted-foreground">
          {message || 'Please try again later.'}
          {retryAfter && ` Wait ${retryAfter}s.`}
        </p>
      </div>
    </div>
  );
};

// Hook for managing rate limits
export const useRateLimit = (
  key: string,
  limit: number,
  windowMs: number = 60000 // 1 minute default
) => {
  const [requests, setRequests] = useState<number[]>([]);
  
  const checkLimit = (): RateLimitInfo => {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Filter out old requests
    const validRequests = requests.filter(time => time > windowStart);
    
    if (validRequests.length >= limit) {
      const oldestRequest = Math.min(...validRequests);
      const resetTime = new Date(oldestRequest + windowMs);
      
      return {
        isLimited: true,
        remainingRequests: 0,
        resetTime,
        retryAfter: Math.ceil((resetTime.getTime() - now) / 1000)
      };
    }
    
    return {
      isLimited: false,
      remainingRequests: limit - validRequests.length
    };
  };
  
  const increment = () => {
    const now = Date.now();
    setRequests(prev => [...prev, now]);
  };
  
  const reset = () => {
    setRequests([]);
  };
  
  // Clean up old requests periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const windowStart = now - windowMs;
      setRequests(prev => prev.filter(time => time > windowStart));
    }, 10000); // Clean every 10 seconds
    
    return () => clearInterval(interval);
  }, [windowMs]);
  
  return {
    checkLimit,
    increment,
    reset,
    currentCount: requests.filter(time => time > Date.now() - windowMs).length
  };
};