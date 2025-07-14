/**
 * Browser Extension Settings Component
 * @module components/settings/BrowserExtensionSettings
 */

import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { QRCodeSVG } from 'qrcode.react';
import { browserExtensionService } from '@services/browser-extension.service';
import { addToast } from '@store/slices/uiSlice';
import { AppDispatch } from '@src/store';
import { Button } from '@components/ui/button';
import { Card } from '@components/ui/card';
import {
  ComputerDesktopIcon,
  LinkIcon,
  QrCodeIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';

interface ConnectedDevice {
  extensionId: string;
  deviceName: string;
  platform: string;
  connectedAt: Date;
  lastSeen: Date;
}

const BrowserExtensionSettings: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [isConnected, setIsConnected] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [pairingCode, setPairingCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<ConnectedDevice | null>(null);

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = () => {
    const connected = browserExtensionService.isExtensionConnected();
    setIsConnected(connected);
  };

  const generatePairingCode = async () => {
    setIsLoading(true);
    try {
      const code = await browserExtensionService.generatePairingCode();
      setPairingCode(code);
      setShowQRCode(true);
      
      // Auto-hide QR code after 5 minutes
      setTimeout(() => {
        setShowQRCode(false);
        setPairingCode('');
      }, 5 * 60 * 1000);
    } catch (error) {
      dispatch(addToast({
        type: 'error',
        message: 'Failed to generate pairing code',
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = async () => {
    setIsLoading(true);
    try {
      await browserExtensionService.disconnect();
      setIsConnected(false);
      setConnectedDevice(null);
      dispatch(addToast({
        type: 'success',
        message: 'Disconnected from browser extension',
      }));
    } catch (error) {
      dispatch(addToast({
        type: 'error',
        message: 'Failed to disconnect',
      }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Browser Extension</h3>
        <p className="text-sm text-muted-foreground">
          Connect your browser extension to sync 2FA codes and enable autofill
        </p>
      </div>

      {/* Connection Status */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <ComputerDesktopIcon className="w-8 h-8 text-primary" />
            <div>
              <h4 className="font-medium">Extension Connection</h4>
              <p className="text-sm text-muted-foreground">
                {isConnected ? 'Connected to browser' : 'Not connected'}
              </p>
            </div>
          </div>
          
          {isConnected ? (
            <CheckCircleIcon className="w-6 h-6 text-green-500" />
          ) : (
            <ExclamationCircleIcon className="w-6 h-6 text-yellow-500" />
          )}
        </div>

        {isConnected && connectedDevice ? (
          <div className="space-y-3">
            <div className="p-3 bg-muted/50 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Device:</span>
                <span className="font-medium">{connectedDevice.deviceName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Platform:</span>
                <span className="font-medium capitalize">{connectedDevice.platform}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Connected:</span>
                <span className="font-medium">
                  {new Date(connectedDevice.connectedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            
            <Button
              onClick={disconnect}
              disabled={isLoading}
              className="w-full"
              variant="destructive"
            >
              <XMarkIcon className="w-4 h-4 mr-2" />
              Disconnect
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {!showQRCode ? (
              <Button
                onClick={generatePairingCode}
                disabled={isLoading}
                className="w-full"
              >
                <LinkIcon className="w-4 h-4 mr-2" />
                Connect Browser Extension
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-white rounded-lg mx-auto w-fit">
                  <QRCodeSVG
                    value={pairingCode}
                    size={200}
                    level="M"
                    includeMargin={true}
                  />
                </div>
                
                <div className="text-center space-y-2">
                  <p className="text-sm font-medium">Scan with Browser Extension</p>
                  <p className="text-xs text-muted-foreground">
                    Open the 2FA Studio extension in your browser and scan this code
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Code expires in 5 minutes
                  </p>
                </div>
                
                <Button
                  onClick={() => {
                    setShowQRCode(false);
                    setPairingCode('');
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Features */}
      <Card className="p-6">
        <h4 className="font-medium mb-4">Extension Features</h4>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-primary rounded-full mt-1.5" />
            <div>
              <p className="text-sm font-medium">Real-time Sync</p>
              <p className="text-xs text-muted-foreground">
                Your 2FA accounts sync instantly between devices
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-primary rounded-full mt-1.5" />
            <div>
              <p className="text-sm font-medium">Autofill Codes</p>
              <p className="text-xs text-muted-foreground">
                Automatically fill 2FA codes on websites
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-primary rounded-full mt-1.5" />
            <div>
              <p className="text-sm font-medium">Secure Communication</p>
              <p className="text-xs text-muted-foreground">
                End-to-end encrypted connection between devices
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-primary rounded-full mt-1.5" />
            <div>
              <p className="text-sm font-medium">Biometric Protection</p>
              <p className="text-xs text-muted-foreground">
                Requires app authentication for sensitive accounts
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Security Notice */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
          Security Information
        </h5>
        <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
          <li>• Only pair with the official 2FA Studio browser extension</li>
          <li>• Connection is secured with end-to-end encryption</li>
          <li>• You can disconnect at any time from either device</li>
          <li>• Biometric-protected accounts require app authentication</li>
        </ul>
      </div>
    </div>
  );
};

export default BrowserExtensionSettings;