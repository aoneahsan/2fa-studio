import React from 'react';
import { Button } from '@components/ui/button';
import { 
  PlusIcon,
  FolderOpenIcon,
  UserGroupIcon,
  BellIcon,
  DocumentTextIcon,
  CloudArrowUpIcon,
  MagnifyingGlassIcon,
  KeyIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  InboxIcon,
  CameraIcon
} from '@heroicons/react/24/outline';

interface EmptyStateProps {
  type: 'accounts' | 'search' | 'notifications' | 'backups' | 'tickets' | 'analytics' | 'generic';
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const emptyStateConfigs = {
  accounts: {
    icon: KeyIcon,
    title: 'No accounts yet',
    description: 'Start adding your 2FA accounts to keep them secure and organized.',
    actionLabel: 'Add First Account'
  },
  search: {
    icon: MagnifyingGlassIcon,
    title: 'No results found',
    description: 'Try adjusting your search criteria or filters.',
    actionLabel: 'Clear Search'
  },
  notifications: {
    icon: BellIcon,
    title: 'No notifications',
    description: 'You\'re all caught up! New notifications will appear here.',
    actionLabel: undefined
  },
  backups: {
    icon: CloudArrowUpIcon,
    title: 'No backups yet',
    description: 'Create your first backup to protect your accounts.',
    actionLabel: 'Create Backup'
  },
  tickets: {
    icon: InboxIcon,
    title: 'No support tickets',
    description: 'When you need help, your support tickets will appear here.',
    actionLabel: 'Contact Support'
  },
  analytics: {
    icon: ChartBarIcon,
    title: 'No data available',
    description: 'Analytics data will appear here once there\'s activity to track.',
    actionLabel: undefined
  },
  generic: {
    icon: FolderOpenIcon,
    title: 'Nothing here yet',
    description: 'This area is empty right now.',
    actionLabel: undefined
  }
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  type,
  title,
  description,
  action,
  className = ''
}) => {
  const config = emptyStateConfigs[type];
  const Icon = config.icon;
  
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      
      <h3 className="text-lg font-semibold mb-2">
        {title || config.title}
      </h3>
      
      <p className="text-muted-foreground mb-6 max-w-sm">
        {description || config.description}
      </p>
      
      {(action || config.actionLabel) && (
        <Button onClick={action?.onClick} variant="primary">
          <PlusIcon className="w-4 h-4 mr-2" />
          {action?.label || config.actionLabel}
        </Button>
      )}
    </div>
  );
};

// Specific empty state components for common use cases
export const EmptyAccountsList: React.FC<{ onAddAccount: () => void }> = ({ onAddAccount }) => (
  <EmptyState
    type="accounts"
    action={{
      label: 'Add First Account',
      onClick: onAddAccount
    }}
  />
);

export const EmptySearchResults: React.FC<{ onClearSearch: () => void }> = ({ onClearSearch }) => (
  <EmptyState
    type="search"
    action={{
      label: 'Clear Search',
      onClick: onClearSearch
    }}
  />
);

export const EmptyNotifications: React.FC = () => (
  <EmptyState type="notifications" />
);

export const EmptyBackupsList: React.FC<{ onCreateBackup: () => void }> = ({ onCreateBackup }) => (
  <EmptyState
    type="backups"
    action={{
      label: 'Create First Backup',
      onClick: onCreateBackup
    }}
  />
);

// Empty state with illustration
export const IllustratedEmptyState: React.FC<{
  illustration: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}> = ({ illustration, title, description, action, className = '' }) => {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center ${className}`}>
      <div className="mb-6">{illustration}</div>
      
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      
      {description && (
        <p className="text-muted-foreground mb-6 max-w-md">{description}</p>
      )}
      
      {action && (
        <Button onClick={action.onClick} size="lg">
          {action.label}
        </Button>
      )}
    </div>
  );
};

// Compact empty state for smaller containers
export const CompactEmptyState: React.FC<{
  icon?: React.ReactNode;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}> = ({ icon, message, action, className = '' }) => {
  return (
    <div className={`flex flex-col items-center justify-center p-6 text-center ${className}`}>
      {icon && <div className="mb-3 text-muted-foreground">{icon}</div>}
      
      <p className="text-sm text-muted-foreground mb-3">{message}</p>
      
      {action && (
        <Button onClick={action.onClick} size="sm" variant="outline">
          {action.label}
        </Button>
      )}
    </div>
  );
};

// Empty state for first-time users
export const WelcomeEmptyState: React.FC<{
  userName?: string;
  onGetStarted: () => void;
}> = ({ userName, onGetStarted }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
        <ShieldCheckIcon className="w-10 h-10 text-primary" />
      </div>
      
      <h2 className="text-2xl font-bold mb-3">
        Welcome{userName ? `, ${userName}` : ''}!
      </h2>
      
      <p className="text-muted-foreground mb-8 max-w-md">
        Let's get started by adding your first 2FA account. You can scan a QR code or enter the details manually.
      </p>
      
      <div className="flex gap-3">
        <Button onClick={onGetStarted} size="lg">
          <CameraIcon className="w-5 h-5 mr-2" />
          Scan QR Code
        </Button>
        <Button onClick={onGetStarted} variant="outline" size="lg">
          <KeyIcon className="w-5 h-5 mr-2" />
          Enter Manually
        </Button>
      </div>
    </div>
  );
};