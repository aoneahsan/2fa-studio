/**
 * Loading screen component
 * @module components/common/LoadingScreen
 */

import React from 'react';

interface LoadingScreenProps {
  message?: string;
}

/**
 * Full screen loading indicator
 */
const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = 'Loading...' }) => {
  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="relative w-20 h-20 mx-auto mb-4">
          <div className="absolute top-0 left-0 w-full h-full rounded-full border-4 border-muted"></div>
          <div className="absolute top-0 left-0 w-full h-full rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
        </div>
        <p className="text-muted-foreground text-sm">{message}</p>
      </div>
    </div>
  );
};

export default LoadingScreen;