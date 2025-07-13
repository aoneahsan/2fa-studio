/**
 * Backup-related type definitions
 * @module types/backup
 */

export interface BackupSchedule {
  id: string;
  userId: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string; // HH:MM format
  dayOfWeek?: number; // 0-6 for weekly backups
  dayOfMonth?: number; // 1-31 for monthly backups
  enabled: boolean;
  lastRun?: Date;
  nextRun: Date;
  destination: 'googledrive' | 'local' | 'both';
  encryptionEnabled: boolean;
  includeSettings: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BackupHistory {
  id: string;
  userId: string;
  scheduleId?: string; // If triggered by schedule
  timestamp: Date;
  status: 'success' | 'failed' | 'partial';
  destination: 'googledrive' | 'local';
  accountsCount: number;
  fileSize?: number;
  error?: string;
  duration: number; // in seconds
}

export interface BackupNotification {
  type: 'reminder' | 'success' | 'failure';
  scheduleId?: string;
  message: string;
  timestamp: Date;
}