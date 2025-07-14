/**
 * Delete account confirmation dialog
 * @module components/accounts/DeleteAccountDialog
 */

import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@src/store';
import { closeModal, addToast } from '@store/slices/uiSlice';
import { useAccounts } from '@hooks/useAccounts';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

/**
 * Confirmation dialog for deleting accounts
 */
const DeleteAccountDialog: React.FC = () => {
  const dispatch = useDispatch();
  const { deleteAccount } = useAccounts();
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  
  const modalData = useSelector((state: RootState) => state.ui.modal.data);
  const account = modalData;

  if (!account) {
    return null;
  }

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') {
      dispatch(addToast({
        type: 'error',
        message: 'Please type DELETE to confirm'
      }));
      return;
    }

    setIsDeleting(true);

    try {
      await deleteAccount(account.id);
      
      dispatch(addToast({
        type: 'success',
        message: 'Account deleted successfully'
      }));
      
      dispatch(closeModal());
    } catch (_error) {
      console.error('Failed to delete account:', _error);
      dispatch(addToast({
        type: 'error',
        message: 'Failed to delete account'
      }));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Delete Account
              </h2>
              <p className="text-sm text-muted-foreground">
                This action cannot be undone
              </p>
            </div>
          </div>

          {/* Account Info */}
          <div className="bg-muted rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              {account.iconUrl && (
                <img 
                  src={account.iconUrl} 
                  alt={account.issuer}
                  className="w-8 h-8 rounded"
                />
              )}
              <div>
                <p className="font-medium text-foreground">{account.issuer}</p>
                <p className="text-sm text-muted-foreground">{account.label}</p>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800 dark:text-red-200">
              <strong>Warning:</strong> Deleting this account will permanently remove it from your device. 
              Make sure you have another way to access your {account.issuer} account before proceeding.
            </p>
          </div>

          {/* Confirmation Input */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Type <span className="font-mono bg-muted px-1 rounded">DELETE</span> to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(_e) => setConfirmText(e.target.value)}
              className="input"
              placeholder="Type DELETE"
              autoComplete="off"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-border">
          <button
            onClick={() => dispatch(closeModal())}
            className="btn btn-outline flex-1"
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting || confirmText !== 'DELETE'}
            className="btn bg-red-600 hover:bg-red-700 text-white flex-1 disabled:opacity-50"
          >
            {isDeleting ? 'Deleting...' : 'Delete Account'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteAccountDialog;