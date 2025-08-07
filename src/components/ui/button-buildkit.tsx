/**
 * Button Component using buildkit-ui
 * @module components/ui/button-buildkit
 */

import React from 'react';
import { Button as BuildKitButton, cn } from 'buildkit-ui';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  children: React.ReactNode;
}

/**
 * Enhanced Button component using buildkit-ui
 * Maps existing button props to buildkit-ui Button
 */
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  className,
  children,
  ...props
}) => {
  // Map our variants to buildkit-ui variants
  const buildkitVariant = variant === 'danger' ? 'destructive' : variant;
  
  return (
    <BuildKitButton
      variant={buildkitVariant as any}
      size={size}
      className={cn(
        fullWidth && 'w-full',
        className
      )}
      disabled={props.disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Loading...
        </>
      ) : (
        children
      )}
    </BuildKitButton>
  );
};

// Export additional button variants from buildkit-ui
export { 
  Button as BuildKitButton,
  cn 
} from 'buildkit-ui';