/**
 * Empty state component for accounts
 * @module components/accounts/EmptyState
 */

import React from 'react';
import { useDispatch } from 'react-redux';
import { openModal } from '@store/slices/uiSlice';
import { KeyIcon, PlusIcon } from '@heroicons/react/24/outline';

/**
 * Empty state shown when no accounts exist
 */
const EmptyState: React.FC = () => {
  const dispatch = useDispatch();

  const handleAddAccount = () => {
    dispatch(openModal({ type: 'addAccount' }) as any);
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
        <KeyIcon className="w-10 h-10 text-primary" />
      </div>
      
      <h3 className="text-xl font-semibold text-foreground mb-2">
        No accounts yet
      </h3>
      
      <p className="text-muted-foreground text-center max-w-sm mb-8">
        Add your first 2FA account to start generating secure codes
      </p>
      
      <button
        onClick={handleAddAccount}
        className="btn btn-primary btn-lg flex items-center gap-2"
      >
        <PlusIcon className="w-5 h-5" />
        Add Your First Account
      </button>

      <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
        <div>
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h4 className="font-medium text-foreground mb-1">Secure</h4>
          <p className="text-sm text-muted-foreground">
            End-to-end encrypted
          </p>
        </div>
        
        <div>
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h4 className="font-medium text-foreground mb-1">Easy</h4>
          <p className="text-sm text-muted-foreground">
            Scan QR or enter manually
          </p>
        </div>
        
        <div>
          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <h4 className="font-medium text-foreground mb-1">Backup</h4>
          <p className="text-sm text-muted-foreground">
            Never lose your codes
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmptyState;