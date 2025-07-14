/**
 * Backup scheduler component
 * @module components/backup/BackupScheduler
 */

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@src/store';
import { BackupSchedulerService } from '@services/backup-scheduler.service';
import { BackupSchedule } from '@app-types/backup';
import { 
  PlusIcon, 
  TrashIcon, 
  PencilIcon,
  PlayIcon,
  ClockIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
// import Button from '@components/common/Button';
// import Modal from '@components/common/Modal';

/**
 * Component for managing backup schedules
 */
const BackupScheduler: React.FC = () => {
  const { user } = useSelector((state: RootState) => state._auth);
  const [schedules, setSchedules] = useState<BackupSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<BackupSchedule | null>(null);

  // Form state
  const [frequency, setFrequency] = useState<BackupSchedule['frequency']>('daily');
  const [time, setTime] = useState('02:00');
  const [dayOfWeek, setDayOfWeek] = useState(0);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [destination, setDestination] = useState<BackupSchedule['destination']>('googledrive');
  const [encryptionEnabled, setEncryptionEnabled] = useState(true);
  const [includeSettings, setIncludeSettings] = useState(true);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (user) {
      loadSchedules();
      BackupSchedulerService.initialize(user.id);
    }

    return () => {
      if (user) {
        BackupSchedulerService.cleanup(user.id);
      }
    };
  }, [user]);

  const loadSchedules = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const userSchedules = await BackupSchedulerService.getSchedules(user.id);
      setSchedules(userSchedules);
    } catch (error) {
      console.error('Error loading schedules:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSchedule = async () => {
    if (!user) return;

    try {
      const scheduleData: Omit<BackupSchedule, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'nextRun'> = {
        frequency,
        time,
        dayOfWeek: frequency === 'weekly' ? dayOfWeek : undefined,
        dayOfMonth: frequency === 'monthly' ? dayOfMonth : undefined,
        destination,
        encryptionEnabled,
        includeSettings,
        enabled,
      };

      if (editingSchedule) {
        await BackupSchedulerService.updateSchedule(
          user.id,
          editingSchedule.id,
          scheduleData
        );
      } else {
        await BackupSchedulerService.createSchedule(user.id, scheduleData);
      }

      await loadSchedules();
      resetForm();
    } catch (error) {
      console.error('Error saving schedule:', error);
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!user || !confirm('Are you sure you want to delete this backup schedule?')) return;

    try {
      await BackupSchedulerService.deleteSchedule(user.id, scheduleId);
      await loadSchedules();
    } catch (error) {
      console.error('Error deleting schedule:', error);
    }
  };

  const handleRunNow = async (scheduleId: string) => {
    if (!user) return;

    try {
      await BackupSchedulerService.runBackupNow(user.id, scheduleId);
    } catch (error) {
      console.error('Error running backup:', error);
    }
  };

  const editSchedule = (schedule: BackupSchedule) => {
    setEditingSchedule(schedule);
    setFrequency(schedule.frequency);
    setTime(schedule.time);
    setDayOfWeek(schedule.dayOfWeek || 0);
    setDayOfMonth(schedule.dayOfMonth || 1);
    setDestination(schedule.destination);
    setEncryptionEnabled(schedule.encryptionEnabled);
    setIncludeSettings(schedule.includeSettings);
    setEnabled(schedule.enabled);
    setShowScheduleModal(true);
  };

  const resetForm = () => {
    setShowScheduleModal(false);
    setEditingSchedule(null);
    setFrequency('daily');
    setTime('02:00');
    setDayOfWeek(0);
    setDayOfMonth(1);
    setDestination('googledrive');
    setEncryptionEnabled(true);
    setIncludeSettings(true);
    setEnabled(true);
  };

  const getFrequencyDescription = (schedule: BackupSchedule) => {
    switch (schedule.frequency) {
      case 'daily':
        return `Daily at ${schedule.time}`;
      case 'weekly':
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return `Every ${days[schedule.dayOfWeek || 0]} at ${schedule.time}`;
      case 'monthly':
        return `Monthly on day ${schedule.dayOfMonth} at ${schedule.time}`;
      default:
        return 'Unknown frequency';
    }
  };

  const getDestinationIcon = (destination: BackupSchedule['destination']) => {
    switch (destination) {
      case 'googledrive':
        return '☁️';
      case 'local':
        return '💾';
      case 'both':
        return '☁️💾';
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading schedules...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Backup Schedules</h3>
        <Button
          onClick={() => setShowScheduleModal(true)}
          variant="primary"
          size="sm"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          New Schedule
        </Button>
      </div>

      {schedules.length === 0 ? (
        <div className="text-center py-12 bg-muted/20 rounded-lg">
          <CalendarDaysIcon className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No backup schedules configured</p>
          <p className="text-sm text-muted-foreground mt-1">
            Create a schedule to automatically backup your accounts
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map((schedule) => (
            <div
              key={schedule.id}
              className={`p-4 border rounded-lg ${
                schedule.enabled ? 'border-border' : 'border-muted opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <ClockIcon className="w-5 h-5 text-muted-foreground" />
                    <span className="font-medium">{getFrequencyDescription(schedule)}</span>
                    <span className="text-sm">{getDestinationIcon(schedule.destination)}</span>
                    {!schedule.enabled && (
                      <span className="text-xs bg-muted px-2 py-1 rounded">Disabled</span>
                    )}
                  </div>
                  
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Next run: {format(schedule.nextRun, 'PPp')}</p>
                    {schedule.lastRun && (
                      <p>Last run: {format(schedule.lastRun, 'PPp')}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      {schedule.encryptionEnabled && (
                        <span className="text-xs">🔒 Encrypted</span>
                      )}
                      {schedule.includeSettings && (
                        <span className="text-xs">⚙️ Includes settings</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRunNow(schedule.id)}
                    className="p-2 text-primary hover:bg-primary/10 rounded-md transition-colors"
                    title="Run backup now"
                  >
                    <PlayIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => editSchedule(schedule)}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteSchedule(schedule.id)}
                    className="p-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Schedule Modal */}
      <Modal
        isOpen={showScheduleModal}
        onClose={resetForm}
        title={editingSchedule ? 'Edit Backup Schedule' : 'Create Backup Schedule'}
      >
        <div className="space-y-4">
          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium mb-2">Frequency</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as BackupSchedule['frequency'])}
              className="w-full px-3 py-2 border border-border rounded-md bg-background"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          {/* Time */}
          <div>
            <label className="block text-sm font-medium mb-2">Time</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background"
            />
          </div>

          {/* Day of Week (for weekly) */}
          {frequency === 'weekly' && (
            <div>
              <label className="block text-sm font-medium mb-2">Day of Week</label>
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(Number(e.target.value))}
                className="w-full px-3 py-2 border border-border rounded-md bg-background"
              >
                <option value={0}>Sunday</option>
                <option value={1}>Monday</option>
                <option value={2}>Tuesday</option>
                <option value={3}>Wednesday</option>
                <option value={4}>Thursday</option>
                <option value={5}>Friday</option>
                <option value={6}>Saturday</option>
              </select>
            </div>
          )}

          {/* Day of Month (for monthly) */}
          {frequency === 'monthly' && (
            <div>
              <label className="block text-sm font-medium mb-2">Day of Month</label>
              <input
                type="number"
                min="1"
                max="31"
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(Number(e.target.value))}
                className="w-full px-3 py-2 border border-border rounded-md bg-background"
              />
            </div>
          )}

          {/* Destination */}
          <div>
            <label className="block text-sm font-medium mb-2">Backup Destination</label>
            <select
              value={destination}
              onChange={(e) => setDestination(e.target.value as BackupSchedule['destination'])}
              className="w-full px-3 py-2 border border-border rounded-md bg-background"
            >
              <option value="googledrive">Google Drive</option>
              <option value="local">Local Download</option>
              <option value="both">Both</option>
            </select>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={encryptionEnabled}
                onChange={(e) => setEncryptionEnabled(e.target.checked)}
                className="rounded border-border"
              />
              <span className="text-sm">Enable encryption</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeSettings}
                onChange={(e) => setIncludeSettings(e.target.checked)}
                className="rounded border-border"
              />
              <span className="text-sm">Include app settings</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="rounded border-border"
              />
              <span className="text-sm">Enable schedule</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={resetForm}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateSchedule}>
              {editingSchedule ? 'Update' : 'Create'} Schedule
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default BackupScheduler;