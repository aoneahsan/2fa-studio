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
import { useAccounts } from '@hooks/useAccounts';
import { AccountListSkeleton } from '@components/common/SkeletonLoaders';

interface AccountsListProps {
  accounts: OTPAccount[];
  isLoading: boolean;
}

/**
 * Displays a list of 2FA accounts
 */
const AccountsList: React.FC<AccountsListProps> = ({ accounts, isLoading }) => {
  const dispatch = useDispatch();
  const { updateAccount } = useAccounts();

  const handleEdit = (account: OTPAccount) => {
    dispatch(openModal({
      type: 'editAccount',
      data: { accountId: account.id }
    }) as any);
  };

  const handleDelete = (account: OTPAccount) => {
    dispatch(openModal({
      type: 'deleteAccount',
      data: account
    }) as any);
  };
  
  const handleToggleFavorite = async (account: OTPAccount) => {
    try {
      await updateAccount({
        ...account,
        isFavorite: !account.isFavorite
      });
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  if (isLoading) {
    return <AccountListSkeleton count={6} />;
  }

  if (accounts.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {(accounts || []).map((account) => (
        <AccountCard
          key={account.id}
          account={account}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleFavorite={handleToggleFavorite}
        />
      ))}
    </div>
  );
};

export default AccountsList;