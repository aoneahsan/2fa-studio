import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Button } from '@components/ui/button';
import { Card } from '@components/ui/card';
import { ClockIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { logout } from '@store/slices/authSlice';

interface SessionTimeoutWarningProps {
  warningTime?: number; // Minutes before timeout to show warning
  sessionTimeout?: number; // Total session timeout in minutes
}

export const SessionTimeoutWarning: React.FC<SessionTimeoutWarningProps> = ({
  warningTime = 5,
  sessionTimeout = 30
}) => {
  const dispatch = useDispatch();
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(warningTime * 60);
  const [lastActivity, setLastActivity] = useState(Date.now());

  useEffect(() => {
    const handleActivity = () => {
      setLastActivity(Date.now());
      setShowWarning(false);
    };

    // Track user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Check for inactivity
    const checkInterval = setInterval(() => {
      const inactiveTime = (Date.now() - lastActivity) / 1000 / 60; // in minutes
      
      if (inactiveTime >= sessionTimeout) {
        // Auto logout
        dispatch(logout());
      } else if (inactiveTime >= (sessionTimeout - warningTime)) {
        setShowWarning(true);
        setTimeRemaining(Math.floor((sessionTimeout - inactiveTime) * 60));
      }
    }, 10000); // Check every 10 seconds

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      clearInterval(checkInterval);
    };
  }, [dispatch, lastActivity, sessionTimeout, warningTime]);

  useEffect(() => {
    if (!showWarning) return;

    const countdown = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          dispatch(logout());
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdown);
  }, [showWarning, dispatch]);

  const extendSession = () => {
    setLastActivity(Date.now());
    setShowWarning(false);
  };

  if (!showWarning) return null;

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <ClockIcon className="w-6 h-6 text-yellow-500" />
            <h2 className="text-lg font-semibold">Session Timeout Warning</h2>
          </div>
          <button
            onClick={() => setShowWarning(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        
        <p className="text-muted-foreground mb-4">
          Your session will expire in {minutes}:{seconds.toString().padStart(2, '0')} due to inactivity.
        </p>
        
        <div className="flex gap-3">
          <Button onClick={extendSession} className="flex-1">
            Continue Session
          </Button>
          <Button
            onClick={() => dispatch(logout())}
            variant="outline"
            className="flex-1"
          >
            Logout Now
          </Button>
        </div>
      </Card>
    </div>
  );
};