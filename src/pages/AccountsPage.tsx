/**
 * Accounts page component
 * @module pages/AccountsPage
 */

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@src/store';
import { openModal } from '@store/slices/uiSlice';
import { useAccounts } from '@hooks/useAccounts';
import AccountsList from '@components/accounts/AccountsList';
import AdvancedSearch from '@components/accounts/AdvancedSearch';
import AccountFilters from '@components/accounts/AccountFilters';
import AddAccountModal from '@components/accounts/AddAccountModal';
import DeleteAccountDialog from '@components/accounts/DeleteAccountDialog';
import EditAccountModal from '@components/accounts/EditAccountModal';
import { ImportAccountsModal } from '@components/accounts/ImportAccountsModal';
import { ExportAccountsModal } from '@components/accounts/ExportAccountsModal';
import TagFilter from '@components/tags/TagFilter';
import TagManager from '@components/tags/TagManager';
import FolderSidebar from '@components/folders/FolderSidebar';
import FolderManager from '@components/folders/FolderManager';
import { fetchTags } from '@store/slices/tagsSlice';
import { toggleShowFavoritesOnly } from '@store/slices/accountsSlice';
import { selectFolder } from '@store/slices/foldersSlice';
import { 
  PlusIcon, 
  AdjustmentsHorizontalIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  TagIcon,
  StarIcon,
  FolderIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';

/**
 * Page for managing 2FA accounts
 */
const AccountsPage: React.FC = () => {
  const dispatch = useDispatch();
  const modal = useSelector((state: RootState) => (state as any).ui.modal);
  const { user } = useSelector((state: RootState) => state._auth);
  const showFavoritesOnly = useSelector((state: RootState) => (state as any).accounts.showFavoritesOnly);
  const { filteredAccounts, isLoading } = useAccounts();
  const [showFilters, setShowFilters] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  const [showFolderManager, setShowFolderManager] = useState(false);
  const [showFolderSidebar, setShowFolderSidebar] = useState(true);
  
  // Load tags on mount
  useEffect(() => {
    if (user) {
      dispatch(fetchTags(user.id) as any);
    }
  }, [user, dispatch]);

  const handleAddAccount = () => {
    dispatch(openModal({ type: 'addAccount' }) as any);
  };

  const handleImport = () => {
    dispatch(openModal({ type: 'import' }) as any);
  };

  const handleExport = () => {
    dispatch(openModal({ type: 'export' }) as any);
  };

  const handleFolderSelect = (folderId: string | null) => {
    dispatch(selectFolder(folderId) as any);
  };

  // Check if user has reached account limit
  const hasReachedLimit = user?.subscription.type === 'free' && 
    filteredAccounts.length >= (user?.subscription.accountLimit || 10);

  return (
    <div className="flex gap-6">
      {/* Folder Sidebar */}
      {showFolderSidebar && (
        <div className="w-64 flex-shrink-0">
          <FolderSidebar
            onFolderSelect={handleFolderSelect}
            onManageFolders={() => setShowFolderManager(true)}
            className="sticky top-6"
          />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 space-y-6">
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
              onClick={() => dispatch(openModal({ type: 'settings', data: { tab: 'subscription' } }) as any)}
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
          <AdvancedSearch />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
            <button
              onClick={() => setShowFolderSidebar(!showFolderSidebar)}
              className={`btn btn-outline btn-md ${showFolderSidebar ? 'bg-muted' : ''}`}
              title="Toggle folder sidebar"
            >
              <FolderIcon className="w-5 h-5" />
              <span className="hidden sm:inline">Folders</span>
            </button>

            <button
              onClick={() => dispatch(toggleShowFavoritesOnly() as any)}
            className={`btn btn-outline btn-md ${showFavoritesOnly ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500' : ''}`}
            title="Show favorites only"
          >
            {showFavoritesOnly ? (
              <StarSolidIcon className="w-5 h-5" />
            ) : (
              <StarIcon className="w-5 h-5" />
            )}
            <span className="hidden sm:inline">Favorites</span>
          </button>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn btn-outline btn-md ${showFilters ? 'bg-muted' : ''}`}
          >
            <AdjustmentsHorizontalIcon className="w-5 h-5" />
            <span className="hidden sm:inline">Filters</span>
          </button>

          <button
            onClick={() => setShowTagManager(true)}
            className="btn btn-outline btn-md"
            title="Manage tags"
          >
            <TagIcon className="w-5 h-5" />
            <span className="hidden sm:inline">Tags</span>
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
        
        {/* Tag Filter */}
        <TagFilter className="mt-4" />

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
            {filteredAccounts.filter((a: any) => a.type === 'totp').length}
          </p>
        </div>
        
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">HOTP</p>
          <p className="text-2xl font-bold text-foreground">
            {filteredAccounts.filter((a: any) => a.type === 'hotp').length}
          </p>
        </div>
        
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Favorites</p>
          <p className="text-2xl font-bold text-foreground">
            {filteredAccounts.filter((a: any) => a.isFavorite).length}
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
        onClose={() => dispatch(openModal({ type: null }) as any)} 
      />
      <ExportAccountsModal 
        isOpen={modal.type === 'export'} 
        onClose={() => dispatch(openModal({ type: null }) as any)} 
      />
        <TagManager 
          isOpen={showTagManager} 
          onClose={() => setShowTagManager(false)} 
        />
        <FolderManager
          isOpen={showFolderManager}
          onClose={() => setShowFolderManager(false)}
        />
      </div>
    </div>
  );
};

export default AccountsPage;