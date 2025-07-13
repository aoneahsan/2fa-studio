/**
 * Sync status indicator component
 * @module components/sync/SyncStatusIndicator
 */

import React, { useState, useEffect } from 'react';
import { SyncService, SyncStatus } from '@services/sync.service';
import { 
  CloudIcon, 
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';

interface SyncStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

/**
 * Component to display current sync status
 */
const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({ 
  className = '', 
  showDetails = false 
}) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(SyncService.getSyncStatus());
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Update sync status every second
    const interval = setInterval(() => {
      setSyncStatus(SyncService.getSyncStatus());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const getSyncIcon = () => {
    if (!syncStatus.isOnline) {
      return <XCircleIcon className="w-5 h-5 text-red-500" />;
    }
    
    if (syncStatus.syncInProgress) {
      return <ArrowPathIcon className="w-5 h-5 text-blue-500 animate-spin" />;
    }
    
    if (syncStatus.pendingChanges > 0) {
      return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
    }
    
    return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
  };

  const getSyncStatusText = () => {
    if (!syncStatus.isOnline) {
      return 'Offline';
    }
    
    if (syncStatus.syncInProgress) {
      return 'Syncing...';
    }
    
    if (syncStatus.pendingChanges > 0) {
      return `${syncStatus.pendingChanges} pending`;
    }
    
    return 'Synced';
  };

  const getSyncStatusColor = () => {
    if (!syncStatus.isOnline) return 'text-red-500';
    if (syncStatus.syncInProgress) return 'text-blue-500';
    if (syncStatus.pendingChanges > 0) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-muted/50 transition-colors ${
          showDetails ? 'cursor-pointer' : 'cursor-default'
        }`}
        disabled={!showDetails}
      >
        {getSyncIcon()}
        <span className={`text-sm font-medium ${getSyncStatusColor()}`}>
          {getSyncStatusText()}
        </span>
      </button>

      {/* Expanded Details */}
      {showDetails && isExpanded && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-background border border-border rounded-lg shadow-lg p-4 z-50">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <CloudIcon className="w-4 h-4" />
            Sync Status
          </h3>

          <div className="space-y-2 text-sm">
            {/* Connection Status */}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Connection:</span>
              <span className={syncStatus.isOnline ? 'text-green-500' : 'text-red-500'}>
                {syncStatus.isOnline ? 'Online' : 'Offline'}
              </span>
            </div>

            {/* Last Sync */}
            {syncStatus.lastSyncTime && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Last sync:</span>
                <span>
                  {formatDistanceToNow(syncStatus.lastSyncTime, { addSuffix: true })}
                </span>
              </div>
            )}

            {/* Pending Changes */}
            {syncStatus.pendingChanges > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Pending:</span>
                <span className="text-yellow-500">
                  {syncStatus.pendingChanges} change{syncStatus.pendingChanges !== 1 ? 's' : ''}
                </span>
              </div>
            )}

            {/* Connected Devices */}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Devices:</span>
              <span>{syncStatus.connectedDevices}</span>
            </div>

            {/* Sync Progress */}
            {syncStatus.syncInProgress && (
              <div className="pt-2 border-t border-border">
                <div className="flex items-center gap-2">
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Synchronizing...</span>
                </div>
              </div>
            )}

            {/* Offline Notice */}
            {!syncStatus.isOnline && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Changes will be synced when you're back online.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {showDetails && isExpanded && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </div>
  );
};

export default SyncStatusIndicator;