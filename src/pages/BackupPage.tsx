/**
 * Backup page component
 * @module pages/BackupPage
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
  CalendarDaysIcon,
  DocumentDuplicateIcon,
  FolderIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface BackupStats {
  totalBackups: number;
  lastBackupDate: Date | null;
  totalSize: number;
  autoBackupEnabled: boolean;
  nextBackupDate: Date | null;
}

/**
 * Page for managing backups and data recovery
 */
const BackupPage: React.FC = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { accounts } = useSelector((state: RootState) => state.accounts);
  
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null);
  
  // Mock backup stats - in real app this would come from state/backend
  const backupStats: BackupStats = {
    totalBackups: 12,
    lastBackupDate: new Date('2024-01-10T14:30:00'),
    totalSize: 15.4 * 1024 * 1024, // 15.4 MB
    autoBackupEnabled: true,
    nextBackupDate: new Date('2024-01-17T14:30:00')
  };

  // Mock backup history
  const backupHistory = [
    {
      id: '1',
      date: new Date('2024-01-10T14:30:00'),
      size: 2.4 * 1024 * 1024,
      accountCount: 45,
      type: 'automatic',
      provider: 'google_drive'
    },
    {
      id: '2', 
      date: new Date('2024-01-03T10:15:00'),
      size: 2.3 * 1024 * 1024,
      accountCount: 43,
      type: 'manual',
      provider: 'local'
    },
    {
      id: '3',
      date: new Date('2023-12-27T18:45:00'),
      size: 2.2 * 1024 * 1024,
      accountCount: 42,
      type: 'automatic',
      provider: 'google_drive'
    }
  ];

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const handleBackupNow = async () => {
    setIsBackingUp(true);
    
    try {
      // Simulate backup process
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      dispatch(addToast({
        type: 'success',
        message: `Successfully backed up ${accounts.length} accounts`
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

  const handleRestore = async (backupId: string) => {
    const backup = backupHistory.find(b => b.id === backupId);
    if (!backup) return;

    const confirmed = window.confirm(
      `Are you sure you want to restore from backup created on ${backup.date.toLocaleDateString()}? This will replace all current data.`
    );
    
    if (!confirmed) return;
    
    setIsRestoring(true);
    setSelectedBackup(backupId);
    
    try {
      // Simulate restore process
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      dispatch(addToast({
        type: 'success',
        message: `Successfully restored ${backup.accountCount} accounts`
      }));
    } catch (error) {
      dispatch(addToast({
        type: 'error',
        message: 'Restore failed. Please try again.'
      }));
    } finally {
      setIsRestoring(false);
      setSelectedBackup(null);
    }
  };

  const handleExportBackup = (backupId: string) => {
    const backup = backupHistory.find(b => b.id === backupId);
    if (!backup) return;

    dispatch(addToast({
      type: 'info',
      message: `Downloading backup from ${backup.date.toLocaleDateString()}...`
    }));
  };

  const handleImportBackup = () => {
    // Create hidden file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.2fas,.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        dispatch(addToast({
          type: 'info',
          message: `Importing ${file.name}...`
        }));
      }
    };
    input.click();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Backup & Restore</h1>
        <p className="text-muted-foreground mt-1">
          Keep your 2FA accounts safe with encrypted backups
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Backup Card */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <CloudArrowUpIcon className="w-5 h-5 text-primary" />
                Create Backup
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Back up your accounts to secure cloud storage
              </p>
            </div>
            <ShieldCheckIcon className="w-8 h-8 text-green-500" />
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Last backup</span>
              <span className="text-foreground font-medium">
                {backupStats.lastBackupDate 
                  ? formatRelativeTime(backupStats.lastBackupDate)
                  : 'Never'
                }
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Accounts to backup</span>
              <span className="text-foreground font-medium">{accounts.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Estimated size</span>
              <span className="text-foreground font-medium">
                {formatFileSize(accounts.length * 1024 * 50)}
              </span>
            </div>
          </div>

          <button
            onClick={handleBackupNow}
            disabled={isBackingUp}
            className="btn btn-primary w-full"
          >
            <CloudArrowUpIcon className="w-5 h-5" />
            {isBackingUp ? 'Creating backup...' : 'Backup Now'}
          </button>
        </div>

        {/* Restore Card */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <ArrowDownTrayIcon className="w-5 h-5 text-primary" />
                Restore Data
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Recover your accounts from a previous backup
              </p>
            </div>
            <DocumentDuplicateIcon className="w-8 h-8 text-blue-500" />
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Available backups</span>
              <span className="text-foreground font-medium">{backupStats.totalBackups}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total backup size</span>
              <span className="text-foreground font-medium">
                {formatFileSize(backupStats.totalSize)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Oldest backup</span>
              <span className="text-foreground font-medium">3 months ago</span>
            </div>
          </div>

          <button
            onClick={handleImportBackup}
            className="btn btn-outline w-full"
          >
            <ArrowUpTrayIcon className="w-5 h-5" />
            Import Backup File
          </button>
        </div>
      </div>

      {/* Auto-backup Status */}
      {backupStats.autoBackupEnabled && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ClockIcon className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium text-foreground">Automatic Backup Enabled</p>
                <p className="text-sm text-muted-foreground">
                  Next backup scheduled for {backupStats.nextBackupDate?.toLocaleDateString()}
                </p>
              </div>
            </div>
            <button 
              onClick={() => dispatch(addToast({ type: 'info', message: 'Configure in Settings > Backup' }))}
              className="text-sm text-primary hover:underline"
            >
              Configure
            </button>
          </div>
        </div>
      )}

      {/* Backup History */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Backup History</h2>
        
        <div className="space-y-3">
          {backupHistory.map((backup) => (
            <div 
              key={backup.id}
              className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                    <FolderIcon className="w-6 h-6 text-muted-foreground" />
                  </div>
                  
                  <div>
                    <p className="font-medium text-foreground">
                      Backup - {backup.date.toLocaleDateString()}
                    </p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-sm text-muted-foreground">
                        {backup.accountCount} accounts
                      </span>
                      <span className="text-sm text-muted-foreground">•</span>
                      <span className="text-sm text-muted-foreground">
                        {formatFileSize(backup.size)}
                      </span>
                      <span className="text-sm text-muted-foreground">•</span>
                      <span className="text-sm text-muted-foreground capitalize">
                        {backup.type}
                      </span>
                      {backup.provider === 'google_drive' && (
                        <>
                          <span className="text-sm text-muted-foreground">•</span>
                          <span className="text-sm text-green-600 dark:text-green-400">
                            Google Drive
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExportBackup(backup.id)}
                    className="btn btn-ghost btn-sm"
                    title="Download backup"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => handleRestore(backup.id)}
                    disabled={isRestoring}
                    className="btn btn-outline btn-sm"
                  >
                    {isRestoring && selectedBackup === backup.id ? 'Restoring...' : 'Restore'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {backupHistory.length === 0 && (
          <div className="text-center py-12">
            <FolderIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No backups found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create your first backup to protect your accounts
            </p>
          </div>
        )}
      </div>

      {/* Storage Info */}
      <div className="border-t border-border pt-6">
        <h3 className="text-sm font-medium text-foreground mb-4">Storage Information</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-muted/30 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Local Storage</p>
            <p className="text-xl font-bold text-foreground">
              {formatFileSize(backupStats.totalSize * 0.3)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">3 backups</p>
          </div>
          
          <div className="bg-muted/30 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Google Drive</p>
            <p className="text-xl font-bold text-foreground">
              {formatFileSize(backupStats.totalSize * 0.7)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">9 backups</p>
          </div>
          
          <div className="bg-muted/30 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Total Used</p>
            <p className="text-xl font-bold text-foreground">
              {formatFileSize(backupStats.totalSize)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">12 backups</p>
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
          Backup Best Practices
        </h4>
        <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
          <li>• Enable automatic backups to ensure your data is always protected</li>
          <li>• Keep at least 3 recent backups in case of corruption</li>
          <li>• Test restore functionality periodically</li>
          <li>• Use both local and cloud backups for redundancy</li>
          <li>• Never share your backup files - they contain sensitive data</li>
        </ul>
      </div>
    </div>
  );
};

export default BackupPage;