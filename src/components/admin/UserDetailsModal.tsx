/**
 * User Details Modal Component
 * @module components/admin/UserDetailsModal
 */

import React from 'react';
import { Dialog } from '@headlessui/react';
import { 
  XMarkIcon,
  UserCircleIcon,
  CreditCardIcon,
  DevicePhoneMobileIcon,
  ClockIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { User } from '@src/types';
import { Button } from '@components/ui/button';

interface UserDetailsModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onUpdateSubscription: () => void;
}

const UserDetailsModal: React.FC<UserDetailsModalProps> = ({
  user,
  isOpen,
  onClose,
  onUpdateSubscription
}) => {
  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleString();
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-2xl w-full rounded-lg bg-white dark:bg-gray-800 shadow-xl max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white dark:bg-gray-800 flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
              User Details
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* User Profile */}
            <div className="flex items-start gap-4">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName}
                  className="h-16 w-16 rounded-full"
                />
              ) : (
                <UserCircleIcon className="h-16 w-16 text-gray-400" />
              )}
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {user.displayName || 'Unnamed User'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">{user.email}</p>
                <div className="mt-2 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <span>ID: {user.id}</span>
                  {user.role && user.role !== 'user' && (
                    <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-400 rounded-full text-xs font-medium">
                      {user.role}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Subscription Details */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <CreditCardIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                <h4 className="font-medium text-gray-900 dark:text-white">
                  Subscription Details
                </h4>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Tier:</span>
                  <p className="font-medium text-gray-900 dark:text-white capitalize">
                    {user.subscription.tier}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Status:</span>
                  <p className="font-medium text-gray-900 dark:text-white capitalize">
                    {user.subscription.status}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Account Limit:</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {user.subscription.accountLimit || 'Unlimited'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Current Accounts:</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {user.accountCount || 0}
                  </p>
                </div>
                {user.subscription.stripeCustomerId && (
                  <div className="col-span-2">
                    <span className="text-gray-600 dark:text-gray-400">Stripe Customer ID:</span>
                    <p className="font-mono text-xs text-gray-900 dark:text-white">
                      {user.subscription.stripeCustomerId}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Account Activity */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <ClockIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                <h4 className="font-medium text-gray-900 dark:text-white">
                  Account Activity
                </h4>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Created:</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formatDate(user.createdAt)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Last Login:</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formatDate(user.lastLogin)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Last Backup:</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formatDate(user.lastBackup)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Device Count:</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {user.deviceCount || 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Security Settings */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheckIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                <h4 className="font-medium text-gray-900 dark:text-white">
                  Security Settings
                </h4>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Biometric Auth:</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {user.settings?.biometricAuth ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Auto Lock:</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {user.settings?.autoLock ? `${user.settings.autoLockTimeout}s` : 'Disabled'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Backup Enabled:</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {user.backupEnabled ? 'Yes' : 'No'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Google Drive:</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {user.googleDriveConnected ? 'Connected' : 'Not Connected'}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                onClick={onClose}
              >
                Close
              </Button>
              <Button
                onClick={onUpdateSubscription}
              >
                Update Subscription
              </Button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default UserDetailsModal;