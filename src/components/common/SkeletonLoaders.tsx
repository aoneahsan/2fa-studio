import React from 'react';

// Base skeleton component
interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width,
  height
}) => {
  return (
    <div
      className={`animate-pulse bg-muted rounded ${className}`}
      style={{ width, height }}
    />
  );
};

// Account card skeleton
export const AccountCardSkeleton: React.FC = () => {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-start gap-4">
        <Skeleton className="w-12 h-12 rounded-lg" />
        <div className="flex-1">
          <Skeleton className="h-5 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
      <div className="mt-4">
        <Skeleton className="h-8 w-2/3" />
      </div>
    </div>
  );
};

// Account list skeleton (grid of cards)
interface AccountListSkeletonProps {
  count?: number;
}

export const AccountListSkeleton: React.FC<AccountListSkeletonProps> = ({
  count = 6
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <AccountCardSkeleton key={index} />
      ))}
    </div>
  );
};

// List item skeleton
export const ListItemSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex items-center justify-between p-4 border border-border rounded-lg"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div>
              <Skeleton className="h-5 w-32 mb-1" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
};

// Table skeleton
interface TableSkeletonProps {
  columns?: number;
  rows?: number;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  columns = 5,
  rows = 10
}) => {
  return (
    <div className="w-full">
      {/* Header */}
      <div className="bg-muted/50 border-b">
        <div className="flex p-4 gap-4">
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton key={index} className="h-5 flex-1" />
          ))}
        </div>
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="border-b">
          <div className="flex p-4 gap-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton 
                key={colIndex} 
                className="h-4 flex-1"
                width={colIndex === 0 ? '60%' : undefined}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// Form skeleton
export const FormSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Form fields */}
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index}>
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      
      {/* Submit button */}
      <Skeleton className="h-10 w-32" />
    </div>
  );
};

// Card skeleton
export const CardSkeleton: React.FC<{ showHeader?: boolean }> = ({ 
  showHeader = true 
}) => {
  return (
    <div className="bg-card border border-border rounded-lg">
      {showHeader && (
        <div className="p-6 border-b">
          <Skeleton className="h-6 w-1/3" />
        </div>
      )}
      <div className="p-6 space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
};

// Navigation skeleton
export const NavigationSkeleton: React.FC = () => {
  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center gap-4">
        <Skeleton className="w-8 h-8 rounded" />
        <Skeleton className="h-6 w-32" />
      </div>
      <div className="flex items-center gap-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="w-20 h-8" />
        ))}
      </div>
    </div>
  );
};

// Modal skeleton
export const ModalSkeleton: React.FC = () => {
  return (
    <div className="p-6">
      <Skeleton className="h-8 w-1/2 mb-4" />
      <div className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-32 w-full" />
      </div>
      <div className="flex justify-end gap-2 mt-6">
        <Skeleton className="w-20 h-10" />
        <Skeleton className="w-20 h-10" />
      </div>
    </div>
  );
};

// Stats card skeleton
export const StatsCardSkeleton: React.FC = () => {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-2">
        <Skeleton className="w-12 h-12 rounded" />
        <Skeleton className="w-16 h-6 rounded-full" />
      </div>
      <Skeleton className="h-8 w-20 mb-1" />
      <Skeleton className="h-4 w-32" />
    </div>
  );
};

// Chart skeleton
export const ChartSkeleton: React.FC<{ height?: number }> = ({ height = 300 }) => {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <Skeleton className="h-6 w-32 mb-4" />
      <Skeleton className="w-full" height={height} />
    </div>
  );
};