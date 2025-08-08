import React from 'react';
import { CheckIcon } from '@heroicons/react/24/solid';

// Circular Progress Indicator
interface CircularProgressProps {
  value: number; // 0-100
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showValue?: boolean;
  strokeWidth?: number;
  className?: string;
  color?: string;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  size = 'md',
  showValue = true,
  strokeWidth = 4,
  className = '',
  color = 'rgb(59, 130, 246)' // primary blue
}) => {
  const sizes = {
    sm: 40,
    md: 60,
    lg: 80,
    xl: 100
  };

  const dimension = sizes[size];
  const radius = (dimension - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={dimension}
        height={dimension}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/20"
        />
        {/* Progress circle */}
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-300 ease-out"
        />
      </svg>
      {showValue && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-medium ${size === 'sm' ? 'text-xs' : size === 'xl' ? 'text-lg' : 'text-sm'}`}>
            {value}%
          </span>
        </div>
      )}
    </div>
  );
};

// Linear Progress Indicator
interface LinearProgressProps {
  value: number; // 0-100
  height?: 'xs' | 'sm' | 'md' | 'lg';
  showValue?: boolean;
  animated?: boolean;
  className?: string;
  color?: string;
}

export const LinearProgress: React.FC<LinearProgressProps> = ({
  value,
  height = 'md',
  showValue = false,
  animated = true,
  className = '',
  color = 'bg-primary'
}) => {
  const heights = {
    xs: 'h-1',
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  };

  return (
    <div className={`w-full ${className}`}>
      {showValue && (
        <div className="flex justify-between mb-1">
          <span className="text-sm text-muted-foreground">Progress</span>
          <span className="text-sm font-medium">{value}%</span>
        </div>
      )}
      <div className={`w-full bg-muted rounded-full overflow-hidden ${heights[height]}`}>
        <div
          className={`h-full ${color} ${animated ? 'transition-all duration-300 ease-out' : ''}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
};

// Step Progress Indicator
interface StepProgressProps {
  steps: {
    id: string;
    title: string;
    description?: string;
    status: 'pending' | 'current' | 'completed';
  }[];
  orientation?: 'horizontal' | 'vertical';
  showDescription?: boolean;
  className?: string;
}

export const StepProgress: React.FC<StepProgressProps> = ({
  steps,
  orientation = 'horizontal',
  showDescription = true,
  className = ''
}) => {
  const isHorizontal = orientation === 'horizontal';

  return (
    <div className={`${isHorizontal ? 'flex items-start' : 'space-y-4'} ${className}`}>
      {steps.map((step, index) => (
        <div
          key={step.id}
          className={`${isHorizontal ? 'flex-1 flex items-start' : 'flex'}`}
        >
          <div className={`flex ${isHorizontal ? 'flex-col items-center' : 'items-start'}`}>
            {/* Step indicator */}
            <div className="relative">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-colors ${
                  step.status === 'completed'
                    ? 'bg-primary text-primary-foreground'
                    : step.status === 'current'
                    ? 'bg-primary/20 text-primary border-2 border-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {step.status === 'completed' ? (
                  <CheckIcon className="w-5 h-5" />
                ) : (
                  index + 1
                )}
              </div>
            </div>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div
                className={`${
                  isHorizontal
                    ? 'w-full h-0.5 mt-5 -translate-y-5'
                    : 'w-0.5 h-16 ml-5 -translate-x-5'
                } ${
                  step.status === 'completed' ? 'bg-primary' : 'bg-muted'
                }`}
              />
            )}
          </div>

          {/* Step content */}
          <div className={`${isHorizontal ? 'mt-3 text-center' : 'ml-4 flex-1'}`}>
            <p className={`font-medium ${step.status === 'current' ? 'text-primary' : ''}`}>
              {step.title}
            </p>
            {showDescription && step.description && (
              <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// Indeterminate Progress Indicator
interface IndeterminateProgressProps {
  type?: 'linear' | 'circular' | 'dots';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const IndeterminateProgress: React.FC<IndeterminateProgressProps> = ({
  type = 'linear',
  size = 'md',
  className = ''
}) => {
  if (type === 'circular') {
    const sizes = {
      sm: 'w-8 h-8',
      md: 'w-12 h-12',
      lg: 'w-16 h-16'
    };

    return (
      <div className={`${sizes[size]} ${className}`}>
        <svg
          className="animate-spin"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
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
      </div>
    );
  }

  if (type === 'dots') {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`rounded-full bg-primary animate-pulse ${
              size === 'sm' ? 'w-2 h-2' : size === 'lg' ? 'w-4 h-4' : 'w-3 h-3'
            }`}
            style={{
              animationDelay: `${i * 0.15}s`
            }}
          />
        ))}
      </div>
    );
  }

  // Linear indeterminate
  const heights = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  return (
    <div className={`w-full bg-muted rounded-full overflow-hidden ${heights[size]} ${className}`}>
      <div className="h-full w-1/3 bg-primary animate-indeterminate-progress" />
    </div>
  );
};

// Progress with label
interface LabeledProgressProps {
  label: string;
  value: number;
  max?: number;
  type?: 'linear' | 'circular';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LabeledProgress: React.FC<LabeledProgressProps> = ({
  label,
  value,
  max = 100,
  type = 'linear',
  size = 'md',
  className = ''
}) => {
  const percentage = Math.round((value / max) * 100);

  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm text-muted-foreground">
          {value} / {max}
        </span>
      </div>
      {type === 'linear' ? (
        <LinearProgress value={percentage} height={size} />
      ) : (
        <CircularProgress value={percentage} size={size} />
      )}
    </div>
  );
};