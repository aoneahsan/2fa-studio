/**
 * Comprehensive Sync Dashboard Component
 * Provides a unified interface for all sync-related features and monitoring
 */

import React, { useState, useEffect } from 'react';
import { 
  AdvancedSyncService,
  SyncStatus,
  SyncConfig,
  SyncAnalytics 
} from '@src/services/advanced-sync.service';
import { 
  CrossPlatformSyncService,
  PlatformCapabilities 
} from '@src/services/cross-platform-sync.service';
import { 
  OfflineQueueService,
  QueueStatus 
} from '@src/services/offline-queue.service';
import { 
  BandwidthOptimizationService,
  OptimizationStats 
} from '@src/services/bandwidth-optimization.service';
import { 
  SyncAnalyticsService,
  PerformanceMetrics,
  SyncHealthReport 
} from '@src/services/sync-analytics.service';
import { DeviceService, DeviceInfo } from '@src/services/device.service';
import AdvancedSyncStatusIndicator from './AdvancedSyncStatusIndicator';
import { SyncConflictResolver } from './SyncConflictResolver';
import SyncSettingsManager from './SyncSettingsManager';
import { Button } from '@src/components/ui/button';
import { Card } from '@src/components/ui/card';
import { Badge } from '@src/components/common/Badge';
import { Tooltip } from '@src/components/common/Tooltip';
import { useAuth } from '@src/hooks/useAuth';
import {
  ChartBarIcon,
  CogIcon,
  ExclamationTriangleIcon,
  CloudIcon,
  DevicePhoneMobileIcon,
  WifiIcon,
  LockClosedIcon,
  CheckCircleIcon,
  ClockIcon,
  SignalIcon,
  ArrowPathIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';

interface SyncDashboardProps {
  className?: string;
}

const SyncDashboard: React.FC<SyncDashboardProps> = ({
  className = '',
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'devices' | 'analytics' | 'settings' | 'conflicts'>('overview');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(AdvancedSyncService.getSyncStatus());
  const [queueStatus, setQueueStatus] = useState<QueueStatus>(OfflineQueueService.getQueueStatus());
  const [optimizationStats, setOptimizationStats] = useState<OptimizationStats>(BandwidthOptimizationService.getOptimizationStats());
  const [platformCapabilities, setPlatformCapabilities] = useState<PlatformCapabilities | null>(CrossPlatformSyncService.getPlatformCapabilities());
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [healthReport, setHealthReport] = useState<SyncHealthReport | null>(null);
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [conflicts, setConflicts] = useState(AdvancedSyncService.getUnresolvedConflicts());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Subscribe to sync events
    const unsubscribers = [
      AdvancedSyncService.onSyncEvent('sync_started', () => {
        setSyncStatus(AdvancedSyncService.getSyncStatus());
      }),
      AdvancedSyncService.onSyncEvent('sync_completed', () => {
        setSyncStatus(AdvancedSyncService.getSyncStatus());
        refreshData();
      }),
      AdvancedSyncService.onSyncEvent('conflict_detected', () => {
        setConflicts(AdvancedSyncService.getUnresolvedConflicts());
      }),
      AdvancedSyncService.onSyncEvent('conflict_resolved', () => {
        setConflicts(AdvancedSyncService.getUnresolvedConflicts());
      }),
    ];

    // Initial data load
    refreshData();

    // Periodic refresh
    const refreshInterval = setInterval(refreshData, 30000); // Every 30 seconds

    return () => {
      unsubscribers.forEach(unsub => unsub());
      clearInterval(refreshInterval);
    };
  }, [user]);

  const refreshData = async () => {
    if (!user?.uid) return;

    try {
      // Update all status data
      setSyncStatus(AdvancedSyncService.getSyncStatus());
      setQueueStatus(OfflineQueueService.getQueueStatus());
      setOptimizationStats(BandwidthOptimizationService.getOptimizationStats());
      setConflicts(AdvancedSyncService.getUnresolvedConflicts());

      // Load performance data
      const [performance, health, deviceList] = await Promise.all([
        SyncAnalyticsService.getPerformanceMetrics(),
        SyncAnalyticsService.getSyncHealthReport(),
        DeviceService.getUserDevices(user.uid),
      ]);

      setPerformanceMetrics(performance);
      setHealthReport(health);
      setDevices(deviceList);
    } catch (error) {
      console.error('Error refreshing dashboard data:', error);
    }
  };

  const handleManualSync = async () => {
    setIsLoading(true);
    try {
      await AdvancedSyncService.manualSync();
      await refreshData();
    } catch (error) {
      console.error('Manual sync failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 dark:text-green-400';
      case 'warning': return 'text-yellow-600 dark:text-yellow-400';
      case 'critical': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: ChartBarIcon },
    { id: 'devices' as const, label: 'Devices', icon: DevicePhoneMobileIcon },
    { id: 'analytics' as const, label: 'Analytics', icon: ChartBarIcon },
    { id: 'settings' as const, label: 'Settings', icon: CogIcon },
    { 
      id: 'conflicts' as const, 
      label: 'Conflicts', 
      icon: ExclamationTriangleIcon,
      badge: conflicts.length > 0 ? conflicts.length : undefined,
    },
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Sync Dashboard</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Monitor and manage synchronization across all your devices
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {platformCapabilities && (
            <Tooltip content={`Platform: ${platformCapabilities.platform}`}>
              <Badge variant="outline" className="capitalize">
                {platformCapabilities.platform}
              </Badge>
            </Tooltip>
          )}
          
          <Button
            onClick={handleManualSync}
            disabled={isLoading || !syncStatus.isOnline}
            size="sm"
          >
            <ArrowPathIcon className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
      </div>

      {/* Quick Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Sync Status</p>
              <p className={`text-lg font-semibold ${
                syncStatus.isOnline && syncStatus.isConnected 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {syncStatus.isOnline ? (syncStatus.isConnected ? 'Connected' : 'Connecting') : 'Offline'}
              </p>
            </div>
            <WifiIcon className={`w-8 h-8 ${
              syncStatus.isOnline && syncStatus.isConnected 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-gray-400'
            }`} />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending Items</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {queueStatus.pendingOperations}
              </p>
            </div>
            <ClockIcon className="w-8 h-8 text-orange-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Data Saved</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {formatBytes(optimizationStats.totalSavings)}
              </p>
            </div>
            <DocumentDuplicateIcon className="w-8 h-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Health Score</p>
              <p className={`text-lg font-semibold ${
                healthReport 
                  ? getHealthStatusColor(healthReport.overall.status)
                  : 'text-gray-500'
              }`}>
                {healthReport ? `${healthReport.overall.score}%` : '--'}
              </p>
            </div>
            {healthReport?.overall.status === 'healthy' ? (
              <CheckCircleIcon className="w-8 h-8 text-green-500" />
            ) : (
              <ExclamationTriangleIcon className="w-8 h-8 text-yellow-500" />
            )}
          </div>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <Badge variant="destructive" className="text-xs">
                    {tab.badge}
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Sync Status Indicator */}
            <AdvancedSyncStatusIndicator
              showDetails={true}
              showDevices={true}
              showAnalytics={true}
            />

            {/* Recent Activity */}
            {performanceMetrics && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Performance Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {performanceMetrics.successRate.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Success Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {formatDuration(performanceMetrics.averageDuration)}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Avg Duration</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {formatBytes(performanceMetrics.totalDataTransferred)}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Data Synced</div>
                  </div>
                </div>
              </Card>
            )}

            {/* Platform Capabilities */}
            {platformCapabilities && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Platform Capabilities</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { key: 'supportsBiometrics', label: 'Biometrics', icon: LockClosedIcon },
                    { key: 'supportsCompression', label: 'Compression', icon: DocumentDuplicateIcon },
                    { key: 'supportsBackgroundSync', label: 'Background Sync', icon: CloudIcon },
                    { key: 'supportsNotifications', label: 'Notifications', icon: SignalIcon },
                  ].map(({ key, label, icon: Icon }) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Icon className={`w-4 h-4 ${
                        (platformCapabilities as any)[key] 
                          ? 'text-green-500' 
                          : 'text-gray-400'
                      }`} />
                      <span className={`text-sm ${
                        (platformCapabilities as any)[key] 
                          ? 'text-gray-900 dark:text-white' 
                          : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'devices' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {devices.map((device) => (
                <Card key={device.id} className="p-4">
                  <div className="flex items-center space-x-3">
                    <DevicePhoneMobileIcon className={`w-8 h-8 ${
                      device.isCurrentDevice 
                        ? 'text-blue-500' 
                        : 'text-gray-400'
                    }`} />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {device.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {device.platform} • {device.model}
                      </div>
                      {device.isCurrentDevice && (
                        <Badge variant="secondary" className="text-xs mt-1">
                          This device
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && performanceMetrics && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Sync Statistics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Total Operations:</span>
                    <span className="text-sm font-medium">{performanceMetrics.totalOperations}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Successful:</span>
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">
                      {performanceMetrics.successfulOperations}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Failed:</span>
                    <span className="text-sm font-medium text-red-600 dark:text-red-400">
                      {performanceMetrics.failedOperations}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Retry Rate:</span>
                    <span className="text-sm font-medium">
                      {performanceMetrics.retryRate.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Avg Duration:</span>
                    <span className="text-sm font-medium">
                      {formatDuration(performanceMetrics.averageDuration)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">95th Percentile:</span>
                    <span className="text-sm font-medium">
                      {formatDuration(performanceMetrics.p95Duration)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Data Transferred:</span>
                    <span className="text-sm font-medium">
                      {formatBytes(performanceMetrics.totalDataTransferred)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Bandwidth Efficiency:</span>
                    <span className="text-sm font-medium">
                      {performanceMetrics.bandwidthEfficiency.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <SyncSettingsManager />
        )}

        {activeTab === 'conflicts' && (
          <SyncConflictResolver
            conflicts={conflicts}
            onConflictResolved={() => {
              setConflicts(AdvancedSyncService.getUnresolvedConflicts());
            }}
          />
        )}
      </div>
    </div>
  );
};

export default SyncDashboard;