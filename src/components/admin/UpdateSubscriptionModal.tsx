/**
 * Update Subscription Modal Component
 * @module components/admin/UpdateSubscriptionModal
 */

import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { User, SubscriptionTier, SubscriptionStatus } from '@src/types';
import { adminService, UserUpdateParams } from '@services/admin.service';
import { Button } from '@components/ui/button';
import { showToast } from '@utils/toast';

interface UpdateSubscriptionModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const UpdateSubscriptionModal: React.FC<UpdateSubscriptionModalProps> = ({
  user,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [tier, setTier] = useState<SubscriptionTier>(user.subscription.tier);
  const [status, setStatus] = useState<SubscriptionStatus>(user.subscription.status);
  const [accountLimit, setAccountLimit] = useState<string>(
    user.subscription.accountLimit?.toString() || ''
  );
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (_e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      showToast('error', 'Please provide a reason for the update');
      return;
    }

    try {
      setLoading(true);
      
      const updates: UserUpdateParams = {
        userId: user.id,
        updates: {
          subscriptionTier: tier,
          subscriptionStatus: status,
          accountLimit: accountLimit ? parseInt(accountLimit) : null
        },
        reason
      };

      await adminService.updateUserSubscription(updates);
      
      showToast('success', 'Subscription updated successfully');
      onSuccess();
    } catch (error) {
      console.error('Error updating subscription:', error);
      showToast('error', 'Failed to update subscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-lg w-full rounded-lg bg-white dark:bg-gray-800 shadow-xl">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
              Update Subscription
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* User Info */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">User</div>
              <div className="font-medium text-gray-900 dark:text-white">
                {user.displayName || 'Unnamed User'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {user.email}
              </div>
            </div>

            {/* Subscription Tier */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Subscription Tier
              </label>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value as SubscriptionTier)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
              >
                <option value="free">Free</option>
                <option value="premium">Premium</option>
                <option value="family">Family</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>

            {/* Subscription Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Subscription Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as SubscriptionStatus)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
              >
                <option value="active">Active</option>
                <option value="trialing">Trialing</option>
                <option value="past_due">Past Due</option>
                <option value="cancelled">Cancelled</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            {/* Account Limit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Account Limit (leave empty for unlimited)
              </label>
              <input
                type="number"
                value={accountLimit}
                onChange={(e) => setAccountLimit(e.target.value)}
                placeholder="e.g., 10"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reason for Update *
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Provide a reason for this update..."
                rows={3}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Warning */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 p-4 rounded-lg text-sm">
              <strong>Warning:</strong> This action will immediately update the user's subscription. 
              The user will be notified of this change.
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
              >
                {loading ? 'Updating...' : 'Update Subscription'}
              </Button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default UpdateSubscriptionModal;