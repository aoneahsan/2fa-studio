/**
 * Device management component for viewing and managing connected devices
 * @module components/devices/DeviceManager
 */

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@src/store';
import { DeviceService, DeviceInfo, DeviceSession } from '@services/device.service';
import { 
  ComputerDesktopIcon, 
  DevicePhoneMobileIcon,
  DeviceTabletIcon,
  CheckBadgeIcon,
  TrashIcon,
  ClockIcon,
  SignalIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';

interface DeviceManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal for managing connected devices
 */
const DeviceManager: React.FC<DeviceManagerProps> = ({ isOpen, onClose }) => {
  const { user } = useSelector((state: RootState) => state._auth);
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      loadDevices();
    }
  }, [isOpen, user]);

  const loadDevices = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const [userDevices, activeSessions] = await Promise.all([
        DeviceService.getUserDevices(user.id),
        DeviceService.getActiveSessions(user.id),
      ]);

      setDevices(userDevices);
      setSessions(activeSessions);
    } catch (error) {
      console.error('Error loading devices:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrustDevice = async (deviceId: string) => {
    if (!user) return;

    try {
      await DeviceService.trustDevice(user.id, deviceId);
      await loadDevices();
    } catch (error) {
      console.error('Error trusting device:', error);
    }
  };

  const handleRemoveDevice = async (deviceId: string) => {
    if (!user) return;

    try {
      await DeviceService.removeDevice(user.id, deviceId);
      setShowConfirmDelete(null);
      await loadDevices();
    } catch (error) {
      console.error('Error removing device:', error);
    }
  };

  const handleEndSession = async (sessionId: string) => {
    if (!user) return;

    try {
      await DeviceService.endSession(user.id, sessionId);
      await loadDevices();
    } catch (error) {
      console.error('Error ending session:', error);
    }
  };

  const getDeviceIcon = (platform: string) => {
    switch (platform) {
      case 'ios':
      case 'android':
        return <DevicePhoneMobileIcon className="w-5 h-5" />;
      case 'ipad':
        return <DeviceTabletIcon className="w-5 h-5" />;
      default:
        return <ComputerDesktopIcon className="w-5 h-5" />;
    }
  };

  const getDeviceSessionInfo = (device: DeviceInfo) => {
    const deviceSessions = sessions.filter(s => s.deviceId === device.deviceId);
    const activeSession = deviceSessions.find(s => s.isActive);
    return { totalSessions: deviceSessions.length, activeSession };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background border border-border rounded-lg w-full max-w-3xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-xl font-semibold">Connected Devices</h2>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-icon"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-muted-foreground">Loading devices...</p>
            </div>
          ) : devices.length === 0 ? (
            <div className="text-center py-8">
              <ComputerDesktopIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No devices connected</p>
            </div>
          ) : (
            <div className="space-y-4">
              {devices.map((device) => {
                const { totalSessions, activeSession } = getDeviceSessionInfo(device);
                const isExpanded = selectedDevice === device.id;

                return (
                  <div
                    key={device.id}
                    className="border border-border rounded-lg overflow-hidden"
                  >
                    {/* Device Header */}
                    <div
                      className="p-4 flex items-center gap-4 cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedDevice(isExpanded ? null : device.id)}
                    >
                      <div className="flex-shrink-0">
                        {getDeviceIcon(device.platform)}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{device.name}</h3>
                          {device.isCurrentDevice && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                              This Device
                            </span>
                          )}
                          {device.isTrusted && (
                            <CheckBadgeIcon className="w-4 h-4 text-green-500" title="Trusted device" />
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span>{device.platform} {device.osVersion}</span>
                          <span className="flex items-center gap-1">
                            <ClockIcon className="w-3.5 h-3.5" />
                            Last active {formatDistanceToNow(device.lastActive, { addSuffix: true })}
                          </span>
                          {activeSession && (
                            <span className="flex items-center gap-1 text-green-500">
                              <SignalIcon className="w-3.5 h-3.5" />
                              Active
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!device.isTrusted && !device.isCurrentDevice && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTrustDevice(device.id);
                            }}
                            className="btn btn-outline btn-sm"
                          >
                            Trust
                          </button>
                        )}
                        {!device.isCurrentDevice && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowConfirmDelete(device.id);
                            }}
                            className="btn btn-ghost btn-sm text-error"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Device Details */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-border">
                        <div className="mt-4 space-y-2">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Device ID:</span>
                              <p className="font-mono text-xs mt-1">{device.deviceId}</p>
                            </div>
                            {device.model && (
                              <div>
                                <span className="text-muted-foreground">Model:</span>
                                <p>{device.model}</p>
                              </div>
                            )}
                            <div>
                              <span className="text-muted-foreground">First connected:</span>
                              <p>{device.createdAt.toLocaleDateString()}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Active sessions:</span>
                              <p>{totalSessions}</p>
                            </div>
                          </div>

                          {/* Active Sessions */}
                          {activeSession && (
                            <div className="mt-4">
                              <h4 className="text-sm font-medium mb-2">Active Session</h4>
                              <div className="bg-muted/50 rounded-md p-3 text-sm">
                                <div className="flex items-center justify-between">
                                  <span>
                                    Started {formatDistanceToNow(activeSession.startedAt, { addSuffix: true })}
                                  </span>
                                  {!device.isCurrentDevice && (
                                    <button
                                      onClick={() => handleEndSession(activeSession.id)}
                                      className="text-xs text-error hover:underline"
                                    >
                                      End Session
                                    </button>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  Expires {formatDistanceToNow(activeSession.expiresAt, { addSuffix: true })}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Manage devices that have access to your 2FA accounts. Remove any devices you don't recognize.
          </p>
        </div>

        {/* Delete Confirmation Dialog */}
        {showConfirmDelete && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-background border border-border rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">Remove Device?</h3>
              <p className="text-sm text-muted-foreground mb-6">
                This will end all sessions on this device and revoke its access. The device will need to sign in again to access your accounts.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmDelete(null)}
                  className="btn btn-outline flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRemoveDevice(showConfirmDelete)}
                  className="btn btn-error flex-1"
                >
                  Remove Device
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeviceManager;