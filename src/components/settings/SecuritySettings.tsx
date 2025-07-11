/**
 * Security settings component
 * @module components/settings/SecuritySettings
 */

import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { 
  setBiometricEnabled, 
  setAutoLockTimeout,
  setShowNotifications 
} from '../../store/slices/settingsSlice';
import { addToast } from '../../store/slices/uiSlice';
import { useBiometric } from '../../hooks/useBiometric';
import { 
  FingerPrintIcon, 
  LockClosedIcon, 
  KeyIcon,
  ShieldCheckIcon,
  ClockIcon,
  BellIcon
} from '@heroicons/react/24/outline';

/**
 * Security settings tab component
 */
const SecuritySettings: React.FC = () => {
  const dispatch = useDispatch();
  const settings = useSelector((state: RootState) => state.settings);
  const { biometricStatus, enableBiometric, disableBiometric } = useBiometric();
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isChangingEncryption, setIsChangingEncryption] = useState(false);

  const autoLockOptions = [
    { value: 0, label: 'Immediately' },
    { value: 1, label: '1 minute' },
    { value: 5, label: '5 minutes' },
    { value: 15, label: '15 minutes' },
    { value: 30, label: '30 minutes' },
    { value: 60, label: '1 hour' },
    { value: -1, label: 'Never' }
  ];

  const handleBiometricToggle = async () => {
    if (settings.biometricEnabled) {
      const success = await disableBiometric();
      if (!success) {
        dispatch(addToast({
          type: 'error',
          message: 'Failed to disable biometric authentication'
        }));
      }
    } else {
      const success = await enableBiometric();
      if (!success) {
        dispatch(addToast({
          type: 'error',
          message: 'Failed to enable biometric authentication'
        }));
      }
    }
  };

  const handleAutoLockChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const timeout = parseInt(e.target.value);
    dispatch(setAutoLockTimeout(timeout));
    dispatch(addToast({
      type: 'success',
      message: 'Auto-lock timeout updated'
    }));
  };

  const handleNotificationsToggle = () => {
    dispatch(setShowNotifications(!settings.showNotifications));
  };

  const handleChangePassword = () => {
    setIsChangingPassword(true);
    dispatch(addToast({
      type: 'info',
      message: 'Password change feature coming soon'
    }));
  };

  const handleChangeEncryption = () => {
    setIsChangingEncryption(true);
    dispatch(addToast({
      type: 'warning',
      message: 'Changing encryption password requires re-encrypting all data'
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-2">Security</h2>
        <p className="text-sm text-muted-foreground">
          Manage your app security and authentication settings
        </p>
      </div>

      {/* Biometric Authentication */}
      <div className="border-b border-border pb-6">
        <h3 className="text-sm font-medium text-foreground mb-4">Authentication</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FingerPrintIcon className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">Biometric Authentication</p>
                <p className="text-sm text-muted-foreground">
                  Use Face ID or Touch ID to unlock the app
                </p>
                {!biometricStatus.isAvailable && (
                  <p className="text-xs text-red-500 mt-1">
                    {biometricStatus.reason || 'Not available on this device'}
                  </p>
                )}
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.biometricEnabled}
                onChange={handleBiometricToggle}
                disabled={!biometricStatus.isAvailable}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Auto-lock */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ClockIcon className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">Auto-lock</p>
                <p className="text-sm text-muted-foreground">
                  Automatically lock the app after inactivity
                </p>
              </div>
            </div>
            <select
              value={settings.autoLockTimeout}
              onChange={handleAutoLockChange}
              className="input w-32"
            >
              {autoLockOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Password Management */}
      <div className="border-b border-border pb-6">
        <h3 className="text-sm font-medium text-foreground mb-4">Password Management</h3>
        
        <div className="space-y-4">
          {/* Account Password */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <KeyIcon className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">Account Password</p>
                <p className="text-sm text-muted-foreground">
                  Change your login password
                </p>
              </div>
            </div>
            <button
              onClick={handleChangePassword}
              className="btn btn-outline btn-sm"
            >
              Change
            </button>
          </div>

          {/* Encryption Password */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <LockClosedIcon className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">Encryption Password</p>
                <p className="text-sm text-muted-foreground">
                  Change your data encryption password
                </p>
              </div>
            </div>
            <button
              onClick={handleChangeEncryption}
              className="btn btn-outline btn-sm"
            >
              Change
            </button>
          </div>
        </div>
      </div>

      {/* Security Features */}
      <div className="border-b border-border pb-6">
        <h3 className="text-sm font-medium text-foreground mb-4">Security Features</h3>
        
        <div className="space-y-4">
          {/* Security Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BellIcon className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">Security Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Get notified about security events
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showNotifications}
                onChange={handleNotificationsToggle}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Screenshot Protection */}
          <div className="flex items-center justify-between opacity-50">
            <div className="flex items-center gap-3">
              <ShieldCheckIcon className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">Screenshot Protection</p>
                <p className="text-sm text-muted-foreground">
                  Prevent screenshots on mobile (Coming soon)
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-not-allowed">
              <input
                type="checkbox"
                disabled
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 rounded-full dark:bg-gray-700"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Security Tips */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
          Security Tips
        </h4>
        <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
          <li>• Use a strong, unique encryption password</li>
          <li>• Enable biometric authentication for quick access</li>
          <li>• Set auto-lock to protect against unauthorized access</li>
          <li>• Regularly backup your encrypted data</li>
          <li>• Never share your encryption password</li>
        </ul>
      </div>
    </div>
  );
};

export default SecuritySettings;