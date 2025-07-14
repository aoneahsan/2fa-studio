/**
 * Google Drive backup component
 * @module components/backup/GoogleDriveBackup
 */

import React, { useState } from 'react';
import { useGoogleDrive } from '@hooks/useGoogleDrive';
import { 
  CloudArrowUpIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

interface GoogleDriveBackupProps {
  encryptionPassword?: string;
}

/**
 * Component for managing Google Drive backups
 */
const GoogleDriveBackup: React.FC<GoogleDriveBackupProps> = ({ encryptionPassword }) => {
  const {
    isConnected,
    isLoading,
    backups,
    connect,
    disconnect,
    createBackup,
    restoreBackup,
    deleteBackup,
    refreshBackups,
    syncNow
  } = useGoogleDrive();

  const [selectedBackup, setSelectedBackup] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [backupPassword, setBackupPassword] = useState('');

  const handleConnect = async () => {
    await connect();
  };

  const handleCreateBackup = async () => {
    try {
      await createBackup(encryptionPassword || backupPassword);
      setBackupPassword('');
    } catch (_error) {
      console.error('Backup failed:', _error);
    }
  };

  const handleRestore = async (backupId: string) => {
    const confirmed = window.confirm(
      'This will replace all current data. Are you sure you want to restore from this backup?'
    );
    
    if (!confirmed) return;

    try {
      await restoreBackup(backupId, encryptionPassword || backupPassword);
      setBackupPassword('');
    } catch (_error) {
      console.error('Restore failed:', _error);
    }
  };

  const handleDelete = async (backupId: string) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this backup? This cannot be undone.'
    );
    
    if (!confirmed) return;

    try {
      await deleteBackup(backupId);
    } catch (_error) {
      console.error('Delete failed:', _error);
    }
  };

  const formatFileSize = (bytes: string): string => {
    const size = parseInt(bytes) || 0;
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (!isConnected) {
    return (
      <div className="text-center py-8">
        <img 
          src="/google-drive-icon.svg" 
          alt="Google Drive" 
          className="w-16 h-16 mx-auto mb-4"
        />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Connect to Google Drive
        </h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
          Back up your 2FA accounts securely to Google Drive with end-to-end encryption
        </p>
        <button
          onClick={handleConnect}
          disabled={isLoading}
          className="btn btn-primary"
        >
          {isLoading ? 'Connecting...' : 'Connect Google Drive'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
        <div className="flex items-center gap-3">
          <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
          <div>
            <p className="font-medium text-foreground">Connected to Google Drive</p>
            <p className="text-sm text-muted-foreground">
              Your backups are synced automatically
            </p>
          </div>
        </div>
        <button
          onClick={disconnect}
          className="text-sm text-red-600 hover:text-red-700"
        >
          Disconnect
        </button>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleCreateBackup}
          disabled={isLoading}
          className="btn btn-primary"
        >
          <CloudArrowUpIcon className="w-5 h-5" />
          Create Backup
        </button>
        
        <button
          onClick={() => syncNow(encryptionPassword)}
          disabled={isLoading}
          className="btn btn-outline"
        >
          <ArrowPathIcon className="w-5 h-5" />
          Sync Now
        </button>
        
        <button
          onClick={refreshBackups}
          disabled={isLoading}
          className="btn btn-ghost"
        >
          <ArrowPathIcon className="w-5 h-5" />
          Refresh
        </button>
      </div>

      {/* Encryption Password (if not provided) */}
      {!encryptionPassword && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <label className="block text-sm font-medium text-foreground mb-2">
            Backup Encryption Password
          </label>
          <input
            type={showPassword ? 'text' : 'password'}
            value={backupPassword}
            onChange={(_e) => setBackupPassword(e.target.value)}
            placeholder="Enter password for encrypted backups"
            className="input mb-2"
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(_e) => setShowPassword(e.target.checked)}
              className="checkbox"
            />
            Show password
          </label>
        </div>
      )}

      {/* Backup List */}
      <div>
        <h3 className="text-sm font-medium text-foreground mb-3">
          Google Drive Backups ({backups.length})
        </h3>
        
        {isLoading && backups.length === 0 ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground mt-2">Loading backups...</p>
          </div>
        ) : backups.length === 0 ? (
          <div className="text-center py-8 bg-muted/30 rounded-lg">
            <p className="text-muted-foreground">No backups found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create your first backup to get started
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {backups.map((backup) => (
              <div
                key={backup.id}
                className="flex items-center justify-between p-4 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                    <CloudArrowUpIcon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  
                  <div>
                    <p className="font-medium text-foreground">
                      {formatDate(backup.createdTime)}
                    </p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>{backup.accountCount || 0} accounts</span>
                      <span>•</span>
                      <span>{formatFileSize(backup.size)}</span>
                      {backup.encrypted && (
                        <>
                          <span>•</span>
                          <span className="text-green-600 dark:text-green-400">Encrypted</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRestore(backup.id)}
                    disabled={isLoading}
                    className="btn btn-ghost btn-sm"
                    title="Restore backup"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => handleDelete(backup.id)}
                    disabled={isLoading}
                    className="btn btn-ghost btn-sm text-red-600 hover:text-red-700"
                    title="Delete backup"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Storage Info */}
      <div className="text-xs text-muted-foreground">
        <p>• Backups are stored in your Google Drive app folder</p>
        <p>• Only this app can access these backups</p>
        <p>• All backups are encrypted before upload</p>
      </div>
    </div>
  );
};

export default GoogleDriveBackup;