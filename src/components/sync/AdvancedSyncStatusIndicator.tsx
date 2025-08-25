/**
 * Advanced Sync Status Indicator Component
 * Shows detailed sync status with real-time updates
 */

import React, { useState, useEffect } from 'react';
import { 
  AdvancedSyncService, 
  SyncStatus, 
  SyncConfig, 
  SyncAnalytics,
  SyncEventType 
} from '@src/services/advanced-sync.service';
import { DeviceService, DeviceInfo } from '@src/services/device.service';
import { Button } from '@src/components/ui/button';
import { Badge } from '@src/components/common/Badge';
import { Tooltip } from '@src/components/common/Tooltip';
import { useAuth } from '@src/hooks/useAuth';

interface AdvancedSyncStatusIndicatorProps {
  showDetails?: boolean;
  showDevices?: boolean;
  showAnalytics?: boolean;
  compact?: boolean;
  className?: string;
}

const AdvancedSyncStatusIndicator: React.FC<AdvancedSyncStatusIndicatorProps> = ({
  showDetails = false,
  showDevices = false,
  showAnalytics = false,
  compact = false,
  className = '',
}) => {
  const { user } = useAuth();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(AdvancedSyncService.getSyncStatus());
  const [syncConfig, setSyncConfig] = useState<SyncConfig>(AdvancedSyncService.getSyncConfig());
  const [analytics, setAnalytics] = useState<SyncAnalytics>(AdvancedSyncService.getSyncAnalytics());
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastSyncEvent, setLastSyncEvent] = useState<{ type: SyncEventType; timestamp: Date } | null>(null);

  useEffect(() => {
    // Subscribe to sync events
    const unsubscribers = [
      AdvancedSyncService.onSyncEvent('sync_started', (event) => {
        setSyncStatus(AdvancedSyncService.getSyncStatus());
        setLastSyncEvent({ type: 'sync_started', timestamp: new Date() });
      }),
      AdvancedSyncService.onSyncEvent('sync_completed', (event) => {
        setSyncStatus(AdvancedSyncService.getSyncStatus());
        setAnalytics(AdvancedSyncService.getSyncAnalytics());
        setLastSyncEvent({ type: 'sync_completed', timestamp: new Date() });
      }),
      AdvancedSyncService.onSyncEvent('sync_error', (event) => {
        setSyncStatus(AdvancedSyncService.getSyncStatus());
        setLastSyncEvent({ type: 'sync_error', timestamp: new Date() });
      }),
      AdvancedSyncService.onSyncEvent('conflict_detected', (event) => {
        setSyncStatus(AdvancedSyncService.getSyncStatus());
        setLastSyncEvent({ type: 'conflict_detected', timestamp: new Date() });
      }),
    ];

    // Load devices if showing device info
    if (showDevices && user?.uid) {
      DeviceService.getUserDevices(user.uid).then(setDevices);
    }

    // Update status periodically
    const statusInterval = setInterval(() => {
      setSyncStatus(AdvancedSyncService.getSyncStatus());
      setAnalytics(AdvancedSyncService.getSyncAnalytics());
    }, 5000);

    return () => {
      unsubscribers.forEach(unsub => unsub());
      clearInterval(statusInterval);
    };
  }, [user, showDevices]);

  const handleManualSync = async () => {
    try {
      await AdvancedSyncService.manualSync();
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
  };

  const getStatusColor = () => {
    if (!syncStatus.isOnline) return 'bg-gray-500';
    if (!syncStatus.isConnected) return 'bg-orange-500';
    if (syncStatus.isSyncing) return 'bg-blue-500';
    if (syncStatus.conflictCount > 0) return 'bg-yellow-500';
    if (syncStatus.errors.length > 0) return 'bg-red-500';
    return 'bg-green-500';
  };

  const getStatusText = () => {
    if (!syncStatus.isOnline) return 'Offline';
    if (!syncStatus.isConnected) return 'Connecting...';
    if (syncStatus.isSyncing) return 'Syncing...';
    if (syncStatus.conflictCount > 0) return `${syncStatus.conflictCount} conflicts`;
    if (syncStatus.errors.length > 0) return 'Sync errors';
    return 'Synced';
  };

  const formatLastSync = () => {
    if (!syncStatus.lastSyncTime) return 'Never';
    const diff = Date.now() - syncStatus.lastSyncTime.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSecond: number) => {
    if (bytesPerSecond === 0) return '0 B/s';
    return formatBytes(bytesPerSecond) + '/s';
  };

  if (compact) {
    return (
      <Tooltip content={`Sync Status: ${getStatusText()}`}>
        <div className={`flex items-center space-x-2 ${className}`}>
          <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
          {syncStatus.pendingChanges > 0 && (
            <Badge variant="outline" className="text-xs">
              {syncStatus.pendingChanges}
            </Badge>
          )}
        </div>
      </Tooltip>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 border rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
          <span className="font-medium text-gray-900 dark:text-white">
            {getStatusText()}
          </span>
          {syncStatus.isSyncing && (
            <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {showDetails && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs"
            >
              {isExpanded ? 'Less' : 'More'}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualSync}
            disabled={!syncStatus.isOnline || syncStatus.isSyncing}
            className="text-xs"
          >
            Sync Now
          </Button>
        </div>
      </div>

      {/* Basic Status */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
        <div>
          <div className="text-gray-500 dark:text-gray-400">Last Sync</div>
          <div className="font-medium">{formatLastSync()}</div>
        </div>
        
        <div>
          <div className="text-gray-500 dark:text-gray-400">Pending</div>
          <div className="font-medium">
            {syncStatus.pendingChanges}
            {syncStatus.pendingChanges > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">!</Badge>
            )}
          </div>
        </div>
        
        <div>
          <div className="text-gray-500 dark:text-gray-400">Conflicts</div>
          <div className="font-medium">
            {syncStatus.conflictCount}
            {syncStatus.conflictCount > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs">!</Badge>
            )}
          </div>
        </div>
        
        <div>
          <div className="text-gray-500 dark:text-gray-400">Devices</div>
          <div className="font-medium">{syncStatus.connectedDevices}</div>
        </div>
      </div>

      {/* Network Status */}
      <div className="mt-3 flex items-center space-x-4 text-xs">
        <div className="flex items-center space-x-1">
          <div className={`w-2 h-2 rounded-full ${
            syncStatus.isOnline ? 'bg-green-500' : 'bg-red-500'
          }`} />
          <span>{syncStatus.isOnline ? 'Online' : 'Offline'}</span>
        </div>
        
        <div className="flex items-center space-x-1">
          <div className={`w-2 h-2 rounded-full ${
            syncStatus.isConnected ? 'bg-green-500' : 'bg-red-500'
          }`} />
          <span>{syncStatus.isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
        
        <div className="flex items-center space-x-1">
          <div className={`w-2 h-2 rounded-full ${
            syncStatus.bandwidth === 'high' ? 'bg-green-500' :
            syncStatus.bandwidth === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
          }`} />
          <span className="capitalize">{syncStatus.bandwidth} Speed</span>
        </div>
        
        {syncStatus.syncSpeed > 0 && (
          <div className="text-gray-500">
            {formatSpeed(syncStatus.syncSpeed)}
          </div>
        )}
      </div>

      {/* Errors */}
      {syncStatus.errors.length > 0 && (
        <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs">
          <div className="font-medium text-red-800 dark:text-red-200 mb-1">Recent Errors:</div>
          {syncStatus.errors.slice(-3).map((error, index) => (
            <div key={index} className="text-red-600 dark:text-red-300 truncate">
              {error}
            </div>
          ))}
        </div>
      )}

      {/* Expanded Details */}
      {isExpanded && showDetails && (
        <div className="mt-4 space-y-4">
          {/* Configuration */}
          <div>
            <h4 className="font-medium text-sm mb-2">Configuration</h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Mode:</span>
                <span className="ml-2">{syncConfig.enableRealTime ? 'Real-time' : 'Periodic'}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Compression:</span>
                <span className="ml-2">{syncConfig.enableCompression ? 'On' : 'Off'}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Delta Sync:</span>
                <span className="ml-2">{syncConfig.enableDeltaSync ? 'On' : 'Off'}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Selective:</span>
                <span className="ml-2">{syncConfig.enableSelectiveSync ? 'On' : 'Off'}</span>
              </div>
            </div>
          </div>

          {/* Analytics */}
          {showAnalytics && (
            <div>
              <h4 className="font-medium text-sm mb-2">Analytics</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Total Syncs:</span>
                  <span className="ml-2 font-medium">{analytics.totalSyncs}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Success Rate:</span>
                  <span className="ml-2 font-medium">
                    {analytics.totalSyncs > 0 
                      ? Math.round((analytics.successfulSyncs / analytics.totalSyncs) * 100) 
                      : 0}%
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Data Transfer:</span>
                  <span className="ml-2 font-medium">{formatBytes(analytics.dataTransferred)}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Avg Duration:</span>
                  <span className="ml-2 font-medium">{Math.round(analytics.averageSync Duration)}ms</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Upload:</span>
                  <span className="ml-2 font-medium">{formatBytes(analytics.bandwidthUsage.upload)}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Download:</span>
                  <span className="ml-2 font-medium">{formatBytes(analytics.bandwidthUsage.download)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Connected Devices */}
          {showDevices && devices.length > 0 && (
            <div>
              <h4 className="font-medium text-sm mb-2">Connected Devices</h4>
              <div className="space-y-2">
                {devices.slice(0, 5).map((device) => (
                  <div key={device.id} className="flex items-center justify-between text-xs p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        device.isCurrentDevice ? 'bg-blue-500' : 'bg-gray-400'
                      }`} />
                      <span className="font-medium">{device.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {device.platform}
                      </Badge>
                      {device.isCurrentDevice && (
                        <Badge variant="secondary" className="text-xs">This device</Badge>
                      )}
                    </div>
                    <div className="text-gray-500 dark:text-gray-400">
                      {formatLastSync()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Activity */}
          {lastSyncEvent && (
            <div>
              <h4 className="font-medium text-sm mb-2">Recent Activity</h4>
              <div className="text-xs p-2 bg-gray-50 dark:bg-gray-700 rounded">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    lastSyncEvent.type === 'sync_completed' ? 'bg-green-500' :
                    lastSyncEvent.type === 'sync_error' ? 'bg-red-500' :
                    lastSyncEvent.type === 'conflict_detected' ? 'bg-yellow-500' :
                    'bg-blue-500'
                  }`} />
                  <span>{lastSyncEvent.type.replace('_', ' ')}</span>
                  <span className="text-gray-500 dark:text-gray-400">
                    {formatLastSync()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdvancedSyncStatusIndicator;