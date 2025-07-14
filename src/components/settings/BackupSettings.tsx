/**
 * Backup settings component
 * @module components/settings/BackupSettings
 */

import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@src/store';
import { addToast } from '@store/slices/uiSlice';
import { 
  CloudArrowUpIcon, 
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ShieldCheckIcon,
  ClockIcon,
  FolderIcon,
  KeyIcon
} from '@heroicons/react/24/outline';
import GoogleDriveBackup from '@components/backup/GoogleDriveBackup';

interface BackupInfo {
  lastBackup: Date | null;
  backupSize: number;
  backupCount: number;
  isAutoBackupEnabled: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  encryptionEnabled: boolean;
}

/**
 * Backup settings tab component
 */
const BackupSettings: React.FC = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state._auth);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  
  // Mock backup info - in real app this would come from state/backend
  const [backupInfo, setBackupInfo] = useState<BackupInfo>({
    lastBackup: new Date('2024-01-10T14:30:00'),
    backupSize: 2.4 * 1024 * 1024, // 2.4 MB in bytes
    backupCount: 45,
    isAutoBackupEnabled: true,
    backupFrequency: 'weekly',
    encryptionEnabled: true
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleBackupNow = async () => {
    setIsBackingUp(true);
    
    try {
      // Simulate backup process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setBackupInfo({
        ...backupInfo,
        lastBackup: new Date(),
        backupSize: backupInfo.backupSize + Math.random() * 100000
      });
      
      dispatch(addToast({
        type: 'success',
        message: 'Backup completed successfully'
      }));
    } catch (error) {
      dispatch(addToast({
        type: 'error',
        message: 'Backup failed. Please try again.'
      }));
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = async () => {
    const confirmed = window.confirm(
      'Restoring from backup will replace all current data. Continue?'
    );
    
    if (!confirmed) return;
    
    setIsRestoring(true);
    
    try {
      // Simulate restore process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      dispatch(addToast({
        type: 'success',
        message: 'Data restored successfully'
      }));
    } catch (error) {
      dispatch(addToast({
        type: 'error',
        message: 'Restore failed. Please try again.'
      }));
    } finally {
      setIsRestoring(false);
    }
  };

  const handleExportBackup = () => {
    dispatch(addToast({
      type: 'info',
      message: 'Downloading backup file...'
    }));
  };

  const handleImportBackup = () => {
    dispatch(addToast({
      type: 'info',
      message: 'Import backup feature coming soon'
    }));
  };

  const handleFrequencyChange = (_e: React.ChangeEvent<HTMLSelectElement>) => {
    const frequency = _e.target.value as BackupInfo['backupFrequency'];
    setBackupInfo({ ...backupInfo, backupFrequency: frequency });
    dispatch(addToast({
      type: 'success',
      message: 'Backup frequency updated'
    }));
  };

  const handleAutoBackupToggle = () => {
    setBackupInfo({ ...backupInfo, isAutoBackupEnabled: !backupInfo.isAutoBackupEnabled });
    dispatch(addToast({
      type: 'success',
      message: backupInfo.isAutoBackupEnabled ? 'Auto-backup disabled' : 'Auto-backup enabled'
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-2">Backup & Restore</h2>
        <p className="text-sm text-muted-foreground">
          Keep your 2FA accounts safe with encrypted backups
        </p>
      </div>

      {/* Backup Status */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-sm font-medium text-foreground mb-4">Backup Status</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div>
            <p className="text-sm text-muted-foreground">Last Backup</p>
            <p className="font-medium text-foreground">
              {backupInfo.lastBackup 
                ? backupInfo.lastBackup.toLocaleDateString() + ' ' + backupInfo.lastBackup.toLocaleTimeString()
                : 'Never'
              }
            </p>
          </div>
          
          <div>
            <p className="text-sm text-muted-foreground">Backup Size</p>
            <p className="font-medium text-foreground">
              {formatFileSize(backupInfo.backupSize)}
            </p>
          </div>
          
          <div>
            <p className="text-sm text-muted-foreground">Accounts Backed Up</p>
            <p className="font-medium text-foreground">
              {backupInfo.backupCount}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleBackupNow}
            disabled={isBackingUp}
            className="btn btn-primary"
          >
            <CloudArrowUpIcon className="w-5 h-5" />
            {isBackingUp ? 'Backing up...' : 'Backup Now'}
          </button>
          
          <button
            onClick={handleRestore}
            disabled={isRestoring || !backupInfo.lastBackup}
            className="btn btn-outline"
          >
            <ArrowDownTrayIcon className="w-5 h-5" />
            {isRestoring ? 'Restoring...' : 'Restore'}
          </button>
        </div>
      </div>

      {/* Google Drive Backup */}
      <div className="border-b border-border pb-6">
        <h3 className="text-sm font-medium text-foreground mb-4">Google Drive Backup</h3>
        <GoogleDriveBackup />
      </div>

      {/* Local Backup */}
      <div className="border-b border-border pb-6">
        <h3 className="text-sm font-medium text-foreground mb-4">Local Backup</h3>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Export and import your encrypted backup files locally
          </p>
          
          <div className="flex gap-3">
            <button
              onClick={handleExportBackup}
              className="btn btn-outline btn-sm"
            >
              <ArrowUpTrayIcon className="w-4 h-4" />
              Export Backup
            </button>
            
            <button
              onClick={handleImportBackup}
              className="btn btn-outline btn-sm"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              Import Backup
            </button>
          </div>
        </div>
      </div>

      {/* Backup Encryption */}
      <div className="border-b border-border pb-6">
        <h3 className="text-sm font-medium text-foreground mb-4">Backup Security</h3>
        
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <KeyIcon className="w-5 h-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="font-medium text-foreground">Backup Encryption Password</p>
              <p className="text-sm text-muted-foreground">
                Use a separate password for backup encryption (recommended)
              </p>
            </div>
            <button className="btn btn-outline btn-sm">
              Set Password
            </button>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Note:</strong> Your backup encryption password is separate from your account password. 
              Store it safely - you'll need it to restore your backups.
            </p>
          </div>
        </div>
      </div>

      {/* Backup History */}
      <div>
        <h3 className="text-sm font-medium text-foreground mb-4">Backup History</h3>
        
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <FolderIcon className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Backup - {new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {45 - i * 2} accounts • {formatFileSize(backupInfo.backupSize - i * 100000)}
                  </p>
                </div>
              </div>
              <button className="text-sm text-primary hover:underline">
                Download
              </button>
            </div>
          ))}
        </div>
        
        <button className="text-sm text-primary hover:underline mt-3">
          View all backups
        </button>
      </div>
    </div>
  );
};

export default BackupSettings;