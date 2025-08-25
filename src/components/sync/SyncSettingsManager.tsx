/**
 * Sync Settings Manager Component
 * Provides UI for configuring sync settings, selective sync, and device management
 */

import React, { useState, useEffect } from 'react';
import {
  AdvancedSyncService,
  SyncConfig,
  SelectiveSyncOptions,
  SyncAnalytics,
} from '@src/services/advanced-sync.service';
import { DeviceService, DeviceInfo } from '@src/services/device.service';
import { Button } from '@src/components/ui/button';
import { Card } from '@src/components/ui/card';
import { Switch } from '@src/components/ui/switch';
import { Badge } from '@src/components/common/Badge';
import { Tooltip } from '@src/components/common/Tooltip';
import { ConfirmationDialog } from '@src/components/common/ConfirmationDialog';
import { useAuth } from '@src/hooks/useAuth';
import {
  CogIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  GlobeAltIcon,
  CloudIcon,
  ChartBarIcon,
  TrashIcon,
  ShieldCheckIcon,
  WifiIcon,
} from '@heroicons/react/24/outline';

interface SyncSettingsManagerProps {
  className?: string;
}

const SyncSettingsManager: React.FC<SyncSettingsManagerProps> = ({
  className = '',
}) => {
  const { user } = useAuth();
  const [syncConfig, setSyncConfig] = useState<SyncConfig>(AdvancedSyncService.getSyncConfig());
  const [selectiveSync, setSelectiveSync] = useState<SelectiveSyncOptions>(
    AdvancedSyncService.getSelectiveSyncOptions()
  );
  const [analytics, setAnalytics] = useState<SyncAnalytics>(AdvancedSyncService.getSyncAnalytics());
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeviceRemovalDialog, setShowDeviceRemovalDialog] = useState(false);
  const [deviceToRemove, setDeviceToRemove] = useState<DeviceInfo | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'selective' | 'devices' | 'analytics'>('general');

  useEffect(() => {
    loadDevices();
    
    // Update analytics periodically
    const analyticsInterval = setInterval(() => {
      setAnalytics(AdvancedSyncService.getSyncAnalytics());
    }, 30000);

    return () => clearInterval(analyticsInterval);
  }, [user]);

  const loadDevices = async () => {
    if (user?.uid) {
      try {
        const userDevices = await DeviceService.getUserDevices(user.uid);
        setDevices(userDevices);
      } catch (error) {
        console.error('Error loading devices:', error);
      }
    }
  };

  const handleConfigUpdate = (updates: Partial<SyncConfig>) => {
    const newConfig = { ...syncConfig, ...updates };
    setSyncConfig(newConfig);
    AdvancedSyncService.updateSyncConfig(newConfig);
  };

  const handleSelectiveSyncUpdate = (updates: Partial<SelectiveSyncOptions>) => {
    const newOptions = { ...selectiveSync, ...updates };
    setSelectiveSync(newOptions);
    AdvancedSyncService.updateSelectiveSyncOptions(newOptions);
  };

  const handleDeviceRemoval = (device: DeviceInfo) => {
    setDeviceToRemove(device);
    setShowDeviceRemovalDialog(true);
  };

  const confirmDeviceRemoval = async () => {
    if (!deviceToRemove || !user?.uid) return;

    setIsLoading(true);
    try {
      await DeviceService.removeDevice(user.uid, deviceToRemove.deviceId);
      await loadDevices();
    } catch (error) {
      console.error('Error removing device:', error);
    } finally {
      setIsLoading(false);
      setShowDeviceRemovalDialog(false);
      setDeviceToRemove(null);
    }
  };

  const handleTrustDevice = async (device: DeviceInfo) => {
    if (!user?.uid) return;

    setIsLoading(true);
    try {
      await DeviceService.trustDevice(user.uid, device.id);
      await loadDevices();
    } catch (error) {
      console.error('Error trusting device:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatLastActive = (date: Date) => {
    const diff = Date.now() - date.getTime();
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

  const getDeviceIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'ios':
      case 'android':
        return DevicePhoneMobileIcon;
      case 'web':
        return GlobeAltIcon;
      default:
        return ComputerDesktopIcon;
    }
  };

  const tabs = [
    { id: 'general' as const, label: 'General', icon: CogIcon },
    { id: 'selective' as const, label: 'Selective Sync', icon: CloudIcon },
    { id: 'devices' as const, label: 'Devices', icon: DevicePhoneMobileIcon },
    { id: 'analytics' as const, label: 'Analytics', icon: ChartBarIcon },
  ];

  return (
    <div className={`space-y-6 ${className}`}>
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
              </button>
            );
          })}
        </nav>
      </div>

      {/* General Settings */}
      {activeTab === 'general' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <CogIcon className="w-5 h-5 mr-2" />
            General Sync Settings
          </h3>
          
          <div className="space-y-6">
            {/* Real-time Sync */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="font-medium">Real-time Sync</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Sync changes immediately as they occur
                </div>
              </div>
              <Switch
                checked={syncConfig.enableRealTime}
                onCheckedChange={(checked) => handleConfigUpdate({ enableRealTime: checked })}
              />
            </div>

            {/* Compression */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="font-medium">Data Compression</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Compress data to reduce bandwidth usage
                </div>
              </div>
              <Switch
                checked={syncConfig.enableCompression}
                onCheckedChange={(checked) => handleConfigUpdate({ enableCompression: checked })}
              />
            </div>

            {/* Delta Sync */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="font-medium">Delta Sync</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Only sync changes instead of full data
                </div>
              </div>
              <Switch
                checked={syncConfig.enableDeltaSync}
                onCheckedChange={(checked) => handleConfigUpdate({ enableDeltaSync: checked })}
              />
            </div>

            {/* Conflict Resolution Strategy */}
            <div>
              <div className="font-medium mb-2">Conflict Resolution Strategy</div>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="conflictStrategy"
                    value="manual"
                    checked={syncConfig.conflictResolutionStrategy === 'manual'}
                    onChange={() => handleConfigUpdate({ conflictResolutionStrategy: 'manual' })}
                    className="mr-2"
                  />
                  <span className="text-sm">Manual resolution (recommended)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="conflictStrategy"
                    value="newest"
                    checked={syncConfig.conflictResolutionStrategy === 'newest'}
                    onChange={() => handleConfigUpdate({ conflictResolutionStrategy: 'newest' })}
                    className="mr-2"
                  />
                  <span className="text-sm">Keep newest version</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="conflictStrategy"
                    value="merge"
                    checked={syncConfig.conflictResolutionStrategy === 'merge'}
                    onChange={() => handleConfigUpdate({ conflictResolutionStrategy: 'merge' })}
                    className="mr-2"
                  />
                  <span className="text-sm">Automatic merge</span>
                </label>
              </div>
            </div>

            {/* Sync Interval (for non-real-time) */}
            {!syncConfig.enableRealTime && (
              <div>
                <div className="font-medium mb-2">Sync Interval</div>
                <select
                  value={syncConfig.syncIntervalMs}
                  onChange={(e) => handleConfigUpdate({ syncIntervalMs: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                >
                  <option value={15000}>15 seconds</option>
                  <option value={30000}>30 seconds</option>
                  <option value={60000}>1 minute</option>
                  <option value={300000}>5 minutes</option>
                  <option value={600000}>10 minutes</option>
                </select>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Selective Sync Settings */}
      {activeTab === 'selective' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <CloudIcon className="w-5 h-5 mr-2" />
            Selective Sync Settings
          </h3>
          
          <div className="space-y-6">
            {/* Enable Selective Sync */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="font-medium">Enable Selective Sync</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Control what data types are synchronized
                </div>
              </div>
              <Switch
                checked={syncConfig.enableSelectiveSync}
                onCheckedChange={(checked) => handleConfigUpdate({ enableSelectiveSync: checked })}
              />
            </div>

            {syncConfig.enableSelectiveSync && (
              <div className="border-l-4 border-blue-500 pl-4 space-y-4">
                {/* Data Types */}
                <div>
                  <div className="font-medium mb-3">Sync Data Types</div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Accounts</span>
                      <Switch
                        checked={selectiveSync.accounts}
                        onCheckedChange={(checked) => handleSelectiveSyncUpdate({ accounts: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Folders</span>
                      <Switch
                        checked={selectiveSync.folders}
                        onCheckedChange={(checked) => handleSelectiveSyncUpdate({ folders: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Tags</span>
                      <Switch
                        checked={selectiveSync.tags}
                        onCheckedChange={(checked) => handleSelectiveSyncUpdate({ tags: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Settings</span>
                      <Switch
                        checked={selectiveSync.settings}
                        onCheckedChange={(checked) => handleSelectiveSyncUpdate({ settings: checked })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Device Management */}
      {activeTab === 'devices' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <DevicePhoneMobileIcon className="w-5 h-5 mr-2" />
            Connected Devices ({devices.length})
          </h3>
          
          <div className="space-y-4">
            {devices.map((device) => {
              const DeviceIcon = getDeviceIcon(device.platform);
              
              return (
                <div key={device.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-lg ${
                      device.isCurrentDevice 
                        ? 'bg-blue-100 dark:bg-blue-900/20' 
                        : 'bg-gray-100 dark:bg-gray-700'
                    }`}>
                      <DeviceIcon className={`w-6 h-6 ${
                        device.isCurrentDevice 
                          ? 'text-blue-600 dark:text-blue-400' 
                          : 'text-gray-600 dark:text-gray-400'
                      }`} />
                    </div>
                    
                    <div>
                      <div className="font-medium flex items-center space-x-2">
                        <span>{device.name}</span>
                        {device.isCurrentDevice && (
                          <Badge variant="secondary">This device</Badge>
                        )}
                        {device.isTrusted && (
                          <Tooltip content="Trusted device">
                            <ShieldCheckIcon className="w-4 h-4 text-green-500" />
                          </Tooltip>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {device.platform} • {device.model || 'Unknown model'}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        Last active: {formatLastActive(device.lastActive)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {!device.isTrusted && !device.isCurrentDevice && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTrustDevice(device)}
                        disabled={isLoading}
                      >
                        Trust
                      </Button>
                    )}
                    {!device.isCurrentDevice && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeviceRemoval(device)}
                        disabled={isLoading}
                        className="text-red-600 hover:text-red-700"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
            
            {devices.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <DevicePhoneMobileIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <div className="text-lg font-medium mb-2">No Devices Connected</div>
                <div className="text-sm">Connect other devices to enable sync</div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Analytics */}
      {activeTab === 'analytics' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <ChartBarIcon className="w-5 h-5 mr-2" />
            Sync Analytics
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {analytics.totalSyncs}
              </div>
              <div className="text-sm text-blue-600/80 dark:text-blue-400/80">Total Syncs</div>
            </div>
            
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {analytics.totalSyncs > 0 ? Math.round((analytics.successfulSyncs / analytics.totalSyncs) * 100) : 0}%
              </div>
              <div className="text-sm text-green-600/80 dark:text-green-400/80">Success Rate</div>
            </div>
            
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {formatBytes(analytics.dataTransferred)}
              </div>
              <div className="text-sm text-purple-600/80 dark:text-purple-400/80">Data Transferred</div>
            </div>
            
            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {Math.round(analytics.averageSync Duration)}ms
              </div>
              <div className="text-sm text-orange-600/80 dark:text-orange-400/80">Avg Duration</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">Bandwidth Usage</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Upload:</span>
                  <span>{formatBytes(analytics.bandwidthUsage.upload)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Download:</span>
                  <span>{formatBytes(analytics.bandwidthUsage.download)}</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-3">Conflicts</h4>
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {analytics.conflictsResolved}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Total Resolved</div>
            </div>
          </div>
        </Card>
      )}

      {/* Device Removal Confirmation */}
      <ConfirmationDialog
        isOpen={showDeviceRemovalDialog}
        title="Remove Device"
        message={
          deviceToRemove
            ? `Are you sure you want to remove "${deviceToRemove.name}" from your account? This will end all active sessions on that device.`
            : ''
        }
        confirmText={isLoading ? 'Removing...' : 'Remove Device'}
        cancelText="Cancel"
        onConfirm={confirmDeviceRemoval}
        onCancel={() => setShowDeviceRemovalDialog(false)}
        isDestructive={true}
        isLoading={isLoading}
      />
    </div>
  );
};

export default SyncSettingsManager;