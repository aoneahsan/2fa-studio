/**
 * Backup scheduler service
 * @module services/backup-scheduler
 */

import {
	collection,
	doc,
	addDoc,
	updateDoc,
	deleteDoc,
	getDocs,
	query,
	where,
	onSnapshot,
	serverTimestamp,
	Timestamp,
} from 'firebase/firestore';
import { db } from '@src/config/firebase';
import { BackupSchedule, BackupHistory } from '@app-types/backup';
import { BackupService } from '@services/backup.service';
import { NotificationService } from '@services/notification-service';
import {
	addDays,
	addWeeks,
	addMonths,
	setHours,
	setMinutes,
	parseISO,
	format,
} from 'date-fns';

export class BackupSchedulerService {
	private static SCHEDULES_COLLECTION = 'backupSchedules';
	private static HISTORY_COLLECTION = 'backupHistory';
	private static timers: Map<string, NodeJS.Timeout> = new Map();
	private static listeners: Map<string, () => void> = new Map();

	/**
	 * Initialize backup scheduler for a user
	 */
	static async initialize(userId: string): Promise<void> {
		// Listen for schedule changes
		const schedulesRef = collection(
			db,
			`users/${userId}/${this.SCHEDULES_COLLECTION}`
		);
		const unsubscribe = onSnapshot(schedulesRef, (snapshot) => {
			snapshot.docChanges().forEach((change) => {
				const schedule = {
					id: (change as any).doc.id,
					...change.doc.data(),
				} as BackupSchedule;

				if (change.type === 'added' || change.type === 'modified') {
					this.scheduleBackup(userId, schedule);
				} else if (change.type === 'removed') {
					this.cancelSchedule(schedule.id);
				}
			});
		});

		this.listeners.set(userId, unsubscribe);
	}

	/**
	 * Cleanup scheduler for a user
	 */
	static cleanup(userId: string): void {
		const unsubscribe = this.listeners.get(userId);
		if (unsubscribe) {
			unsubscribe();
			this.listeners.delete(userId);
		}

		// Cancel all timers for this user
		this.timers.forEach((timer, scheduleId) => {
			if (scheduleId.startsWith(userId)) {
				clearTimeout(timer);
				this.timers.delete(scheduleId);
			}
		});
	}

	/**
	 * Create a new backup schedule
	 */
	static async createSchedule(
		userId: string,
		schedule: Omit<
			BackupSchedule,
			'id' | 'userId' | 'createdAt' | 'updatedAt' | 'nextRun'
		>
	): Promise<BackupSchedule> {
		const schedulesRef = collection(
			db,
			`users/${userId}/${this.SCHEDULES_COLLECTION}`
		);

		const nextRun = this.calculateNextRun(schedule);

		const docRef = await addDoc(schedulesRef, {
			...schedule,
			userId,
			nextRun: Timestamp.fromDate(nextRun),
			createdAt: serverTimestamp(),
			updatedAt: serverTimestamp(),
		});

		const newSchedule = {
			id: docRef.id,
			...schedule,
			userId,
			nextRun,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		// Send notification about new schedule
		await this.sendBackupReminder(
			userId,
			`Backup schedule created: ${schedule.frequency} at ${schedule.time}`
		);

		return newSchedule;
	}

	/**
	 * Update an existing backup schedule
	 */
	static async updateSchedule(
		userId: string,
		scheduleId: string,
		updates: Partial<BackupSchedule>
	): Promise<void> {
		const scheduleRef = doc(
			db,
			`users/${userId}/${this.SCHEDULES_COLLECTION}`,
			scheduleId
		);

		// Recalculate next run if frequency or time changed
		const updateData: any = {
			...updates,
			updatedAt: serverTimestamp(),
		};

		if (
			updates.frequency ||
			updates.time ||
			updates.dayOfWeek ||
			updates.dayOfMonth
		) {
			const currentSchedule = { ...updates } as BackupSchedule;
			const nextRun = this.calculateNextRun(currentSchedule);
			updateData.nextRun = Timestamp.fromDate(nextRun);
		}

		await updateDoc(scheduleRef, updateData);
	}

	/**
	 * Delete a backup schedule
	 */
	static async deleteSchedule(
		userId: string,
		scheduleId: string
	): Promise<void> {
		const scheduleRef = doc(
			db,
			`users/${userId}/${this.SCHEDULES_COLLECTION}`,
			scheduleId
		);
		await deleteDoc(scheduleRef);
		this.cancelSchedule(scheduleId);
	}

	/**
	 * Get all schedules for a user
	 */
	static async getSchedules(userId: string): Promise<BackupSchedule[]> {
		const schedulesRef = collection(
			db,
			`users/${userId}/${this.SCHEDULES_COLLECTION}`
		);
		const snapshot = await getDocs(schedulesRef);

		return snapshot.docs.map((doc: any) => ({
			id: doc.id,
			...doc.data(),
			nextRun: doc.data().nextRun?.toDate(),
			lastRun: doc.data().lastRun?.toDate(),
			createdAt: doc.data().createdAt?.toDate(),
			updatedAt: doc.data().updatedAt?.toDate(),
		})) as BackupSchedule[];
	}

	/**
	 * Get backup history for a user
	 */
	static async getBackupHistory(
		userId: string,
		limit: number = 50
	): Promise<BackupHistory[]> {
		const historyRef = collection(
			db,
			`users/${userId}/${this.HISTORY_COLLECTION}`
		);
		const snapshot = await getDocs(
			query(historyRef, where('userId', '==', userId))
		);

		return snapshot.docs
			.map((doc: any) => ({
				id: doc.id,
				...doc.data(),
				timestamp: doc.data().timestamp?.toDate(),
			}))
			.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
			.slice(0, limit) as BackupHistory[];
	}

	/**
	 * Schedule a backup
	 */
	private static scheduleBackup(
		userId: string,
		schedule: BackupSchedule
	): void {
		if (!schedule.enabled) {
			this.cancelSchedule(schedule.id);
			return;
		}

		const now = new Date();
		const nextRun = new Date(schedule.nextRun);
		const delay = nextRun.getTime() - now.getTime();

		// Cancel existing timer
		this.cancelSchedule(schedule.id);

		// If next run is in the past, calculate the next occurrence
		if (delay < 0) {
			const newNextRun = this.calculateNextRun(schedule);
			this.updateSchedule(userId, schedule.id, { nextRun: newNextRun });
			return;
		}

		// Schedule the backup
		const timer = setTimeout(async () => {
			await this.executeBackup(userId, schedule);

			// Calculate and set next run
			const nextRun = this.calculateNextRun(schedule);
			await this.updateSchedule(userId, schedule.id, {
				lastRun: new Date(),
				nextRun,
			});

			// Reschedule
			this.scheduleBackup(userId, { ...schedule, nextRun });
		}, delay);

		this.timers.set(schedule.id, timer);
	}

	/**
	 * Cancel a scheduled backup
	 */
	private static cancelSchedule(scheduleId: string): void {
		const timer = this.timers.get(scheduleId);
		if (timer) {
			clearTimeout(timer);
			this.timers.delete(scheduleId);
		}
	}

	/**
	 * Execute a scheduled backup
	 */
	private static async executeBackup(
		userId: string,
		schedule: BackupSchedule
	): Promise<void> {
		const startTime = Date.now();
		let status: BackupHistory['status'] = 'success';
		let error: string | undefined;
		let accountsCount = 0;

		try {
			// Execute backup based on destination
			if (
				schedule.destination === 'googledrive' ||
				schedule.destination === 'both'
			) {
				const result = await BackupService.backupToGoogleDrive(
					userId,
					schedule.encryptionEnabled,
					schedule.includeSettings
				);
				accountsCount = result.accountsCount;
			}

			if (schedule.destination === 'local' || schedule.destination === 'both') {
				await BackupService.exportBackup(
					userId,
					'encrypted',
					schedule.includeSettings
				);
			}

			// Send success notification
			await this.sendBackupReminder(
				userId,
				`Backup completed successfully: ${accountsCount} accounts backed up`
			);
		} catch (err) {
			status = 'failed';
			error = err instanceof Error ? err.message : 'Unknown error';

			// Send failure notification
			await this.sendBackupReminder(userId, `Backup failed: ${error}`);
		}

		// Record backup history
		const duration = Math.round((Date.now() - startTime) / 1000);
		await this.recordBackupHistory(userId, {
			scheduleId: schedule.id,
			timestamp: new Date(),
			status,
			destination:
				schedule.destination === 'both' ? 'googledrive' : schedule.destination,
			accountsCount,
			error,
			duration,
		});
	}

	/**
	 * Record backup history
	 */
	private static async recordBackupHistory(
		userId: string,
		history: Omit<BackupHistory, 'id' | 'userId'>
	): Promise<void> {
		const historyRef = collection(
			db,
			`users/${userId}/${this.HISTORY_COLLECTION}`
		);
		await addDoc(historyRef, {
			...history,
			userId,
			timestamp: Timestamp.fromDate(history.timestamp),
		});
	}

	/**
	 * Send backup reminder notification
	 */
	private static async sendBackupReminder(
		userId: string,
		message: string
	): Promise<void> {
		// Skip notification for now - will be implemented when NotificationService is complete
		console.log(`Backup reminder for user ${userId}: ${message}`);
	}

	/**
	 * Calculate next run time for a schedule
	 */
	private static calculateNextRun(schedule: Partial<BackupSchedule>): Date {
		const now = new Date();
		const [hours, minutes] = (schedule.time || '00:00').split(':').map(Number);
		let nextRun = setMinutes(setHours(now, hours), minutes);

		// If the time has already passed today, start from tomorrow
		if (nextRun <= now) {
			nextRun = addDays(nextRun, 1);
		}

		switch (schedule.frequency) {
			case 'daily':
				// Already set to next occurrence
				break;

			case 'weekly': {
				const targetDay = schedule.dayOfWeek || 0;
				while (nextRun.getDay() !== targetDay) {
					nextRun = addDays(nextRun, 1);
				}
				break;
			}

			case 'monthly': {
				const targetDate = schedule.dayOfMonth || 1;
				nextRun.setDate(targetDate);
				if (nextRun <= now) {
					nextRun = addMonths(nextRun, 1);
				}
				break;
			}
		}

		return nextRun;
	}

	/**
	 * Run backup immediately (manual trigger)
	 */
	static async runBackupNow(userId: string, scheduleId: string): Promise<void> {
		const schedules = await this.getSchedules(userId);
		const schedule = schedules.find((s: any) => s.id === scheduleId);

		if (!schedule) {
			throw new Error('Schedule not found');
		}

		await this.executeBackup(userId, schedule);
	}
}
