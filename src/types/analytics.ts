/**
 * Analytics-related type definitions
 * @module types/analytics
 */

export interface AccountUsage {
  accountId: string;
  userId: string;
  timestamp: Date;
  action: 'view' | 'copy' | 'generate';
  deviceId?: string;
  sessionId?: string;
}

export interface UsageStats {
  accountId: string;
  totalViews: number;
  totalCopies: number;
  totalGenerations: number;
  lastUsed: Date;
  firstUsed: Date;
  dailyUsage: DailyUsage[];
  hourlyDistribution: HourlyDistribution;
  deviceDistribution: DeviceDistribution;
}

export interface DailyUsage {
  date: string; // YYYY-MM-DD
  views: number;
  copies: number;
  generations: number;
}

export interface HourlyDistribution {
  [hour: number]: number; // 0-23
}

export interface DeviceDistribution {
  [deviceId: string]: {
    name: string;
    platform: string;
    usageCount: number;
    lastUsed: Date;
  };
}

export interface GlobalUsageStats {
  userId: string;
  totalAccounts: number;
  totalActions: number;
  mostUsedAccounts: {
    accountId: string;
    issuer: string;
    label: string;
    usageCount: number;
  }[];
  leastUsedAccounts: {
    accountId: string;
    issuer: string;
    label: string;
    usageCount: number;
    lastUsed?: Date;
  }[];
  peakUsageHours: number[];
  averageActionsPerDay: number;
  accountsNotUsedInDays: {
    accountId: string;
    issuer: string;
    label: string;
    daysSinceLastUse: number;
  }[];
}