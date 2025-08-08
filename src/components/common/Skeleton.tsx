import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'text',
  width,
  height,
  animation = 'pulse'
}) => {
  const baseClasses = 'bg-muted';
  
  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: ''
  };
  
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg'
  };
  
  const style: React.CSSProperties = {
    width: width || (variant === 'text' ? '100%' : undefined),
    height: height || (variant === 'text' ? '1rem' : undefined)
  };
  
  return (
    <div
      className={`${baseClasses} ${animationClasses[animation]} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
};

// Account Card Skeleton
export const AccountCardSkeleton: React.FC = () => (
  <div className="bg-card rounded-lg p-4 space-y-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="space-y-2">
          <Skeleton width={120} height={16} />
          <Skeleton width={80} height={12} />
        </div>
      </div>
      <Skeleton width={60} height={32} />
    </div>
    <Skeleton width="100%" height={4} />
  </div>
);

// Account List Skeleton
export const AccountListSkeleton: React.FC = () => (
  <div className="space-y-3">
    {[1, 2, 3, 4, 5].map(i => (
      <AccountCardSkeleton key={i} />
    ))}
  </div>
);

// Settings Section Skeleton
export const SettingsSectionSkeleton: React.FC = () => (
  <div className="bg-card rounded-lg p-6 space-y-4">
    <Skeleton width={200} height={24} />
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton width={150} height={16} />
            <Skeleton width={250} height={12} />
          </div>
          <Skeleton variant="rectangular" width={50} height={24} />
        </div>
      ))}
    </div>
  </div>
);

// Table Skeleton
export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({ 
  rows = 5, 
  columns = 4 
}) => (
  <div className="bg-card rounded-lg overflow-hidden">
    <div className="border-b p-4">
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} width={100} height={16} />
        ))}
      </div>
    </div>
    <div className="divide-y">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="p-4">
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton key={colIndex} width="100%" height={16} />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Dashboard Card Skeleton
export const DashboardCardSkeleton: React.FC = () => (
  <div className="bg-card rounded-lg p-6 space-y-2">
    <Skeleton width={100} height={12} />
    <Skeleton width={150} height={32} />
    <Skeleton width={80} height={12} />
  </div>
);