/**
 * Backup Button Component
 * @module components/backup/BackupButton
 */

import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { CloudArrowUpIcon } from '@heroicons/react/24/outline';
import { useAppSelector } from '@hooks/useAppSelector';
import { selectAllAccounts } from '@store/slices/accountsSlice';
import { openModal, addToast } from '@store/slices/uiSlice';
import { BackupService } from '@services/backup.service';
import { GoogleAuthService } from '@services/google-auth.service';

export const BackupButton: React.FC = () => {
  const dispatch = useDispatch();
  const accounts = useAppSelector(selectAllAccounts);
  const [isBackingUp, setIsBackingUp] = useState(false);

  const handleBackup = async () => {
    setIsBackingUp(true);

    try {
      // Open backup modal for password
      dispatch(openModal({
        type: 'backup',
        data: { accounts }
      }) as any);
    } catch (error) {
      console.error('Backup error:', error);
      dispatch(addToast({
        type: 'error',
        message: 'Failed to start backup process'
      }) as any);
    } finally {
      setIsBackingUp(false);
    }
  };

  return (
    <button
      onClick={handleBackup}
      disabled={isBackingUp || accounts.length === 0}
      className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      title={accounts.length === 0 ? 'No accounts to backup' : 'Backup to Google Drive'}
    >
      <CloudArrowUpIcon className="w-5 h-5" />
      <span>{isBackingUp ? 'Backing up...' : 'Backup'}</span>
    </button>
  );
};