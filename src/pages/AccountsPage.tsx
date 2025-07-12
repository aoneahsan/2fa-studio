/**
 * Accounts page component
 * @module pages/AccountsPage
 */

import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { openModal } from '../store/slices/uiSlice';
import { useAccounts } from '../hooks/useAccounts';
import AccountsList from '../components/accounts/AccountsList';
import AccountSearch from '../components/accounts/AccountSearch';
import AccountFilters from '../components/accounts/AccountFilters';
import AddAccountModal from '../components/accounts/AddAccountModal';
import DeleteAccountDialog from '../components/accounts/DeleteAccountDialog';
import EditAccountModal from '../components/accounts/EditAccountModal';
import { ImportAccountsModal } from '../components/accounts/ImportAccountsModal';
import { ExportAccountsModal } from '../components/accounts/ExportAccountsModal';
import { 
  PlusIcon, 
  AdjustmentsHorizontalIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon
} from '@heroicons/react/24/outline';

/**
 * Page for managing 2FA accounts
 */
const AccountsPage: React.FC = () => {
  const dispatch = useDispatch();
  const modal = useSelector((state: RootState) => state.ui.modal);
  const { user } = useSelector((state: RootState) => state.auth);
  const { filteredAccounts, isLoading } = useAccounts();
  const [showFilters, setShowFilters] = useState(false);

  const handleAddAccount = () => {
    dispatch(openModal({ type: 'addAccount' }));
  };

  const handleImport = () => {
    dispatch(openModal({ type: 'import' }));
  };

  const handleExport = () => {
    dispatch(openModal({ type: 'export' }));
  };

  // Check if user has reached account limit
  const hasReachedLimit = user?.subscription.type === 'free' && 
    filteredAccounts.length >= (user?.subscription.accountLimit || 10);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">2FA Accounts</h1>
        <p className="text-muted-foreground mt-1">
          Manage your two-factor authentication accounts
        </p>
      </div>

      {/* Account Limit Warning */}
      {hasReachedLimit && (
        <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            You've reached the free account limit. 
            <button 
              onClick={() => dispatch(openModal({ type: 'settings', data: { tab: 'subscription' } }))}
              className="ml-1 font-medium underline hover:no-underline"
            >
              Upgrade to Premium
            </button> for unlimited accounts.
          </p>
        </div>
      )}

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <AccountSearch />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn btn-outline btn-md ${showFilters ? 'bg-muted' : ''}`}
          >
            <AdjustmentsHorizontalIcon className="w-5 h-5" />
            <span className="hidden sm:inline">Filters</span>
          </button>

          <button
            onClick={handleImport}
            className="btn btn-outline btn-md"
            title="Import accounts"
          >
            <ArrowDownTrayIcon className="w-5 h-5" />
            <span className="hidden sm:inline">Import</span>
          </button>

          <button
            onClick={handleExport}
            className="btn btn-outline btn-md"
            title="Export accounts"
            disabled={filteredAccounts.length === 0}
          >
            <ArrowUpTrayIcon className="w-5 h-5" />
            <span className="hidden sm:inline">Export</span>
          </button>

          <button
            onClick={handleAddAccount}
            className="btn btn-primary btn-md"
            disabled={hasReachedLimit}
          >
            <PlusIcon className="w-5 h-5" />
            <span className="hidden sm:inline">Add Account</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-muted/30 rounded-lg p-4">
          <AccountFilters />
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Accounts</p>
          <p className="text-2xl font-bold text-foreground">
            {filteredAccounts.length}
          </p>
        </div>
        
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">TOTP</p>
          <p className="text-2xl font-bold text-foreground">
            {filteredAccounts.filter(a => a.type === 'totp').length}
          </p>
        </div>
        
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">HOTP</p>
          <p className="text-2xl font-bold text-foreground">
            {filteredAccounts.filter(a => a.type === 'hotp').length}
          </p>
        </div>
        
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Tags</p>
          <p className="text-2xl font-bold text-foreground">
            {new Set(filteredAccounts.flatMap(a => a.tags || [])).size}
          </p>
        </div>
      </div>

      {/* Accounts List */}
      <AccountsList 
        accounts={filteredAccounts} 
        isLoading={isLoading} 
      />

      {/* Modals */}
      {modal.type === 'addAccount' && <AddAccountModal />}
      {modal.type === 'deleteAccount' && <DeleteAccountDialog />}
      {modal.type === 'editAccount' && <EditAccountModal />}
      <ImportAccountsModal 
        isOpen={modal.type === 'import'} 
        onClose={() => dispatch(openModal({ type: null }))} 
      />
      <ExportAccountsModal 
        isOpen={modal.type === 'export'} 
        onClose={() => dispatch(openModal({ type: null }))} 
      />
    </div>
  );
};

export default AccountsPage;