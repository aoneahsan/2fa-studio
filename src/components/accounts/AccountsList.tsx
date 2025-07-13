/**
 * Accounts list component
 * @module components/accounts/AccountsList
 */

import React from 'react';
import { useDispatch } from 'react-redux';
import { OTPAccount } from '@services/otp.service';
import { openModal } from '@store/slices/uiSlice';
import AccountCard from '@components/accounts/AccountCard';
import EmptyState from '@components/accounts/EmptyState';

interface AccountsListProps {
  accounts: OTPAccount[];
  isLoading: boolean;
}

/**
 * Displays a list of 2FA accounts
 */
const AccountsList: React.FC<AccountsListProps> = ({ accounts, isLoading }) => {
  const dispatch = useDispatch();

  const handleEdit = (account: OTPAccount) => {
    dispatch(openModal({
      type: 'editAccount',
      data: { accountId: account.id }
    }));
  };

  const handleDelete = (account: OTPAccount) => {
    dispatch(openModal({
      type: 'deleteAccount',
      data: account
    }));
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, index) => (
          <div
            key={index}
            className="bg-card border border-border rounded-lg p-4 animate-pulse"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-muted rounded-lg"></div>
              <div className="flex-1">
                <div className="h-5 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </div>
            </div>
            <div className="mt-4">
              <div className="h-8 bg-muted rounded w-2/3"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (accounts.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {accounts.map((account) => (
        <AccountCard
          key={account.id}
          account={account}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
};

export default AccountsList;