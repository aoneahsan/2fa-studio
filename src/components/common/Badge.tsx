import React from 'react';

// Base Badge component
interface BadgeProps {
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
  rounded?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'sm',
  children,
  className = '',
  rounded = false
}) => {
  const variants = {
    default: 'bg-primary/10 text-primary',
    secondary: 'bg-muted text-muted-foreground',
    success: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    error: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
  };

  const sizes = {
    xs: 'text-xs px-1.5 py-0.5',
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  return (
    <span
      className={`inline-flex items-center font-medium ${rounded ? 'rounded-full' : 'rounded'} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </span>
  );
};

// Notification Badge (count indicator)
interface NotificationBadgeProps {
  count: number;
  max?: number;
  dot?: boolean;
  color?: 'red' | 'blue' | 'green' | 'yellow';
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  pulse?: boolean;
  children?: React.ReactNode;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  count,
  max = 99,
  dot = false,
  color = 'red',
  position = 'top-right',
  pulse = false,
  children
}) => {
  const colors = {
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500'
  };

  const positions = {
    'top-right': '-top-1 -right-1',
    'top-left': '-top-1 -left-1',
    'bottom-right': '-bottom-1 -right-1',
    'bottom-left': '-bottom-1 -left-1'
  };

  const displayCount = count > max ? `${max}+` : count;
  const showBadge = dot || count > 0;

  if (!showBadge) return <>{children}</>;

  return (
    <div className="relative inline-flex">
      {children}
      <span
        className={`absolute ${positions[position]} flex items-center justify-center ${
          dot ? 'w-2 h-2' : 'min-w-[20px] h-5 px-1.5'
        } text-xs font-bold text-white ${colors[color]} rounded-full ${
          pulse ? 'animate-pulse' : ''
        }`}
      >
        {!dot && displayCount}
      </span>
    </div>
  );
};

// Status Badge
interface StatusBadgeProps {
  status: 'online' | 'offline' | 'away' | 'busy' | 'active' | 'inactive';
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  showLabel = true,
  size = 'md',
  className = ''
}) => {
  const statusConfig = {
    online: { color: 'bg-green-500', label: 'Online' },
    offline: { color: 'bg-gray-400', label: 'Offline' },
    away: { color: 'bg-yellow-500', label: 'Away' },
    busy: { color: 'bg-red-500', label: 'Busy' },
    active: { color: 'bg-green-500', label: 'Active' },
    inactive: { color: 'bg-gray-400', label: 'Inactive' }
  };

  const sizes = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  const config = statusConfig[status];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className={`inline-block ${sizes[size]} ${config.color} rounded-full`} />
      {showLabel && <span className="text-sm">{config.label}</span>}
    </div>
  );
};

// Label Badge (for tags, categories)
interface LabelBadgeProps {
  label: string;
  onRemove?: () => void;
  color?: string;
  icon?: React.ReactNode;
  className?: string;
}

export const LabelBadge: React.FC<LabelBadgeProps> = ({
  label,
  onRemove,
  color,
  icon,
  className = ''
}) => {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
        color || 'bg-muted text-muted-foreground'
      } ${className}`}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{label}</span>
      {onRemove && (
        <button
          onClick={onRemove}
          className="flex-shrink-0 ml-1 hover:text-foreground"
        >
          ×
        </button>
      )}
    </span>
  );
};

// Priority Badge
interface PriorityBadgeProps {
  priority: 'low' | 'medium' | 'high' | 'critical';
  showIcon?: boolean;
  className?: string;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority,
  showIcon = false,
  className = ''
}) => {
  const priorityConfig = {
    low: { color: 'bg-gray-100 text-gray-700', icon: '↓' },
    medium: { color: 'bg-blue-100 text-blue-700', icon: '→' },
    high: { color: 'bg-orange-100 text-orange-700', icon: '↑' },
    critical: { color: 'bg-red-100 text-red-700', icon: '⚡' }
  };

  const config = priorityConfig[priority];

  return (
    <Badge className={`${config.color} ${className}`}>
      {showIcon && <span className="mr-1">{config.icon}</span>}
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </Badge>
  );
};

// Icon Badge (badge with just an icon)
interface IconBadgeProps {
  icon: React.ReactNode;
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const IconBadge: React.FC<IconBadgeProps> = ({
  icon,
  variant = 'default',
  size = 'md',
  className = ''
}) => {
  const variants = {
    default: 'bg-primary/10 text-primary',
    secondary: 'bg-muted text-muted-foreground',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    error: 'bg-red-100 text-red-700'
  };

  const sizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  };

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {icon}
    </span>
  );
};