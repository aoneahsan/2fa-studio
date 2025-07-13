/**
 * Backup history component
 * @module components/backup/BackupHistory
 */

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@src/store';
import { BackupSchedulerService } from '@services/backup-scheduler.service';
import { BackupHistory as BackupHistoryType } from '@types/backup.types';
import { 
  CheckCircleIcon, 
  XCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CloudArrowDownIcon,
  ComputerDesktopIcon,
} from '@heroicons/react/24/outline';
import { format, formatDistanceToNow } from 'date-fns';

/**
 * Component for displaying backup history
 */
const BackupHistory: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [history, setHistory] = useState<BackupHistoryType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user]);

  const loadHistory = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const backupHistory = await BackupSchedulerService.getBackupHistory(user.id);
      setHistory(backupHistory);
    } catch (error) {
      console.error('Error loading backup history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: BackupHistoryType['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case 'partial':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getDestinationIcon = (destination: BackupHistoryType['destination']) => {
    return destination === 'googledrive' ? (
      <CloudArrowDownIcon className="w-4 h-4" />
    ) : (
      <ComputerDesktopIcon className="w-4 h-4" />
    );
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading backup history...</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Backup History</h3>

      {history.length === 0 ? (
        <div className="text-center py-12 bg-muted/20 rounded-lg">
          <ClockIcon className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No backup history available</p>
        </div>
      ) : (
        <div className="space-y-2">
          {history.map((backup) => (
            <div
              key={backup.id}
              className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/20 transition-colors"
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(backup.status)}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {formatDistanceToNow(backup.timestamp, { addSuffix: true })}
                    </span>
                    {getDestinationIcon(backup.destination)}
                    {backup.scheduleId && (
                      <span className="text-xs bg-muted px-2 py-1 rounded">Scheduled</span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {format(backup.timestamp, 'PPp')}
                  </div>
                  {backup.error && (
                    <div className="text-sm text-red-500 mt-1">
                      Error: {backup.error}
                    </div>
                  )}
                </div>
              </div>

              <div className="text-right text-sm text-muted-foreground">
                <div>{backup.accountsCount} accounts</div>
                <div>{formatFileSize(backup.fileSize)}</div>
                <div>{formatDuration(backup.duration)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BackupHistory;