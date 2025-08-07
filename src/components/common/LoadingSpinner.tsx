/**
 * Loading Spinner Component
 * @module components/common/LoadingSpinner
 */

import React from 'react';
import { Spinner } from '@services/buildkit-ui.service';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className = '' 
}) => {
  return (
    <div className={`flex justify-center items-center ${className}`}>
      <Spinner 
        size={size}
        color="primary"
        className="text-blue-600"
      />
    </div>
  );
};

export default LoadingSpinner;