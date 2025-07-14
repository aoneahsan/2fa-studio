/**
 * Analytics service for tracking account usage
 * @module services/analytics
 */

import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@src/config/firebase';
import { 
  AccountUsage, 
  UsageStats, 
  GlobalUsageStats,
  DailyUsage,
  HourlyDistribution,
  DeviceDistribution 
} from '@app-types/analytics';
import { OTPAccount } from '@services/otp.service';
import { DeviceService } from '@services/device.service';
import { startOfDay, differenceInDays, format } from 'date-fns';

export class AnalyticsService {
  private static USAGE_COLLECTION = 'usage';
  private static BATCH_SIZE = 100;

  /**
   * Track account usage action
   */
  static async trackUsage(
    userId: string,
    accountId: string,
    action: AccountUsage['action']
  ): Promise<void> {
    try {
      const deviceId = await DeviceService.getDeviceId();
      const sessionId = DeviceService.getSessionId();

      const usageRef = collection(db, `users/${userId}/${this.USAGE_COLLECTION}`);
      await addDoc(usageRef, {
        accountId,
        userId,
        action,
        deviceId,
        sessionId,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error tracking usage:', error);
      // Don't throw - analytics should not break the app
    }
  }

  /**
   * Get usage stats for a specific account
   */
  static async getAccountUsageStats(
    userId: string,
    accountId: string,
    days: number = 30
  ): Promise<UsageStats> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const usageRef = collection(db, `users/${userId}/${this.USAGE_COLLECTION}`);
      const q = query(
        usageRef,
        where('accountId', '==', accountId),
        where('timestamp', '>=', Timestamp.fromDate(startDate)),
        orderBy('timestamp', 'desc')
      );

      const snapshot = await getDocs(q);
      const usageData: AccountUsage[] = snapshot.docs.map((doc: any) => ({
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate(),
      })) as AccountUsage[];

      return this.calculateUsageStats(accountId, usageData);
    } catch (error) {
      console.error('Error getting account usage stats:', error);
      return this.getEmptyStats(accountId);
    }
  }

  /**
   * Get global usage statistics for a user
   */
  static async getGlobalUsageStats(
    userId: string,
    accounts: OTPAccount[],
    days: number = 30
  ): Promise<GlobalUsageStats> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const usageRef = collection(db, `users/${userId}/${this.USAGE_COLLECTION}`);
      const q = query(
        usageRef,
        where('timestamp', '>=', Timestamp.fromDate(startDate)),
        orderBy('timestamp', 'desc')
      );

      const snapshot = await getDocs(q);
      const allUsage: AccountUsage[] = snapshot.docs.map((doc: any) => ({
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate(),
      })) as AccountUsage[];

      // Calculate usage per account
      const accountUsage = new Map<string, number>();
      const lastUsed = new Map<string, Date>();
      const hourlyUsage = new Array(24).fill(0);

      allUsage.forEach(usage => {
        // Count usage per account
        const count = accountUsage.get(usage.accountId) || 0;
        accountUsage.set(usage.accountId, count + 1);

        // Track last used
        const lastDate = lastUsed.get(usage.accountId);
        if (!lastDate || usage.timestamp > lastDate) {
          lastUsed.set(usage.accountId, usage.timestamp);
        }

        // Track hourly distribution
        const hour = usage.timestamp.getHours();
        hourlyUsage[hour]++;
      });

      // Find most and least used accounts
      const accountsWithUsage = (accounts || []).map((account: any) => ({
        accountId: account.id,
        issuer: account.issuer,
        label: account.label,
        usageCount: accountUsage.get(account.id) || 0,
        lastUsed: lastUsed.get(account.id),
      }));

      const mostUsed = accountsWithUsage
        .filter((a: any) => a.usageCount > 0)
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 5);

      const leastUsed = accountsWithUsage
        .filter((a: any) => a.usageCount === 0 || a.usageCount < 5)
        .sort((a, b) => a.usageCount - b.usageCount)
        .slice(0, 5);

      // Find peak usage hours
      const peakUsageHours = hourlyUsage
        .map((count, hour) => ({ hour, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
        .map((item: any) => item.hour);

      // Calculate average actions per day
      const totalDays = Math.min(days, differenceInDays(new Date(), accounts[0]?.createdAt || new Date()) + 1);
      const averageActionsPerDay = allUsage.length / totalDays;

      // Find accounts not used recently
      const accountsNotUsedInDays = accountsWithUsage
        .filter((a: any) => !a.lastUsed || differenceInDays(new Date(), a.lastUsed) > 7)
        .map((a: any) => ({
          accountId: a.accountId,
          issuer: a.issuer,
          label: a.label,
          daysSinceLastUse: a.lastUsed ? differenceInDays(new Date(), a.lastUsed) : Infinity,
        }))
        .sort((a, b) => b.daysSinceLastUse - a.daysSinceLastUse)
        .slice(0, 5);

      return {
        userId,
        totalAccounts: accounts.length,
        totalActions: allUsage.length,
        mostUsedAccounts: mostUsed,
        leastUsedAccounts: leastUsed,
        peakUsageHours,
        averageActionsPerDay,
        accountsNotUsedInDays,
      };
    } catch (error) {
      console.error('Error getting global usage stats:', error);
      return {
        userId,
        totalAccounts: accounts.length,
        totalActions: 0,
        mostUsedAccounts: [],
        leastUsedAccounts: [],
        peakUsageHours: [],
        averageActionsPerDay: 0,
        accountsNotUsedInDays: [],
      };
    }
  }

  /**
   * Calculate usage statistics from raw data
   */
  private static calculateUsageStats(
    accountId: string,
    usageData: AccountUsage[]
  ): UsageStats {
    if (usageData.length === 0) {
      return this.getEmptyStats(accountId);
    }

    const totalViews = usageData.filter((u: any) => u.action === 'view').length;
    const totalCopies = usageData.filter((u: any) => u.action === 'copy').length;
    const totalGenerations = usageData.filter((u: any) => u.action === 'generate').length;

    const timestamps = usageData.map((u: any) => u.timestamp);
    const lastUsed = new Date(Math.max(...timestamps.map((t: any) => t.getTime())));
    const firstUsed = new Date(Math.min(...timestamps.map((t: any) => t.getTime())));

    // Calculate daily usage
    const dailyMap = new Map<string, DailyUsage>();
    usageData.forEach(usage => {
      const dateKey = format(usage.timestamp, 'yyyy-MM-dd');
      const daily = dailyMap.get(dateKey) || {
        date: dateKey,
        views: 0,
        copies: 0,
        generations: 0,
      };

      switch (usage.action) {
        case 'view':
          daily.views++;
          break;
        case 'copy':
          daily.copies++;
          break;
        case 'generate':
          daily.generations++;
          break;
      }

      dailyMap.set(dateKey, daily);
    });

    const dailyUsage = Array.from(dailyMap.values())
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate hourly distribution
    const hourlyDistribution: HourlyDistribution = {};
    for (let i = 0; i < 24; i++) {
      hourlyDistribution[i] = 0;
    }
    usageData.forEach(usage => {
      const hour = usage.timestamp.getHours();
      hourlyDistribution[hour]++;
    });

    // Calculate device distribution
    const deviceDistribution: DeviceDistribution = {};
    const deviceUsage = new Map<string, AccountUsage[]>();
    
    usageData.forEach(usage => {
      if (usage.deviceId) {
        const deviceData = deviceUsage.get(usage.deviceId) || [];
        deviceData.push(usage);
        deviceUsage.set(usage.deviceId, deviceData);
      }
    });

    // TODO: Get device info from DeviceService
    deviceUsage.forEach((usages, deviceId) => {
      deviceDistribution[deviceId] = {
        name: `Device ${deviceId.slice(0, 8)}`,
        platform: 'unknown',
        usageCount: usages.length,
        lastUsed: new Date(Math.max(...usages.map((u: any) => u.timestamp.getTime()))),
      };
    });

    return {
      accountId,
      totalViews,
      totalCopies,
      totalGenerations,
      lastUsed,
      firstUsed,
      dailyUsage,
      hourlyDistribution,
      deviceDistribution,
    };
  }

  /**
   * Get empty stats object
   */
  private static getEmptyStats(accountId: string): UsageStats {
    const hourlyDistribution: HourlyDistribution = {};
    for (let i = 0; i < 24; i++) {
      hourlyDistribution[i] = 0;
    }

    return {
      accountId,
      totalViews: 0,
      totalCopies: 0,
      totalGenerations: 0,
      lastUsed: new Date(),
      firstUsed: new Date(),
      dailyUsage: [],
      hourlyDistribution,
      deviceDistribution: {},
    };
  }

  /**
   * Clean up old usage data
   */
  static async cleanupOldData(userId: string, daysToKeep: number = 90): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const usageRef = collection(db, `users/${userId}/${this.USAGE_COLLECTION}`);
      const q = query(
        usageRef,
        where('timestamp', '<', Timestamp.fromDate(cutoffDate)),
        limit(this.BATCH_SIZE)
      );

      const snapshot = await getDocs(q);
      
      // Delete in batches
      const deletePromises = snapshot.docs.map((doc: any) => doc.ref.delete());
      await Promise.all(deletePromises);

      // If we deleted a full batch, there might be more
      if (snapshot.size === this.BATCH_SIZE) {
        await this.cleanupOldData(userId, daysToKeep);
      }
    } catch (error) {
      console.error('Error cleaning up old usage data:', error);
    }
  }
}