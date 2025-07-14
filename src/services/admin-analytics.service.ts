/**
 * Admin analytics and dashboard service
 * @module services/admin-analytics
 */

import { 
  SubscriptionAnalytics, 
  SubscriptionTier, 
  UserSubscription,
  Usage 
} from '@src/types/subscription';
import { User } from '@src/types';
import { FirestoreService } from './firestore.service';

export interface DashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  totalRevenue: number;
  monthlyRevenue: number;
  activeSubscriptions: number;
  churnRate: number;
  averageRevenuePerUser: number;
  conversionRate: number;
  totalAccounts: number;
  totalBackups: number;
}

export interface UserMetrics {
  totalUsers: number;
  activeUsers: number;
  newUsers: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  usersByTier: Record<SubscriptionTier, number>;
  userRetention: {
    day1: number;
    day7: number;
    day30: number;
  };
  topCountries: Array<{ country: string; count: number }>;
}

export interface RevenueMetrics {
  totalRevenue: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  revenueByTier: Record<SubscriptionTier, number>;
  revenueGrowth: {
    monthly: number;
    yearly: number;
  };
  averageRevenuePerUser: number;
  lifetimeValue: number;
  churnRate: number;
  refundRate: number;
}

export interface UsageMetrics {
  totalAccounts: number;
  totalBackups: number;
  totalApiCalls: number;
  storageUsed: number;
  averageAccountsPerUser: number;
  averageBackupsPerUser: number;
  topFeatures: Array<{ feature: string; usage: number }>;
}

export interface PerformanceMetrics {
  responseTime: number;
  uptime: number;
  errorRate: number;
  activeConnections: number;
  requestsPerSecond: number;
  databasePerformance: {
    reads: number;
    writes: number;
    averageLatency: number;
  };
}

export interface SupportMetrics {
  openTickets: number;
  resolvedTickets: number;
  averageResponseTime: number;
  customerSatisfaction: number;
  ticketsByCategory: Record<string, number>;
  escalationRate: number;
}

export interface SecurityMetrics {
  failedLoginAttempts: number;
  suspiciousActivity: number;
  blockedRequests: number;
  dataBreaches: number;
  vulnerabilitiesFound: number;
  complianceScore: number;
}

export interface TimeSeriesData {
  date: Date;
  value: number;
  label?: string;
}

export interface AnalyticsFilter {
  startDate?: Date;
  endDate?: Date;
  tier?: SubscriptionTier;
  country?: string;
  platform?: 'web' | 'android' | 'ios';
  segment?: 'new' | 'returning' | 'churned';
}

export class AdminAnalyticsService {
  private static readonly CACHE_TTL = 300000; // 5 minutes
  private static cache: Map<string, { data: any; timestamp: number }> = new Map();

  /**
   * Get comprehensive dashboard metrics
   */
  static async getDashboardMetrics(filter?: AnalyticsFilter): Promise<DashboardMetrics> {
    const cacheKey = `dashboard_${JSON.stringify(filter)}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const [
        userMetrics,
        revenueMetrics,
        usageMetrics
      ] = await Promise.all([
        this.getUserMetrics(filter),
        this.getRevenueMetrics(filter),
        this.getUsageMetrics(filter)
      ]);

      const metrics: DashboardMetrics = {
        totalUsers: userMetrics.totalUsers,
        activeUsers: userMetrics.activeUsers,
        newUsersToday: (userMetrics as any).newUsers.today,
        totalRevenue: revenueMetrics.totalRevenue,
        monthlyRevenue: revenueMetrics.monthlyRevenue,
        activeSubscriptions: Object.values(userMetrics.usersByTier).reduce((a, b) => a + b, 0),
        churnRate: revenueMetrics.churnRate,
        averageRevenuePerUser: revenueMetrics.averageRevenuePerUser,
        conversionRate: this.calculateConversionRate(userMetrics),
        totalAccounts: usageMetrics.totalAccounts,
        totalBackups: usageMetrics.totalBackups,
      };

      this.setCache(cacheKey, metrics);
      return metrics;
    } catch (error) {
      console.error('Error getting dashboard metrics:', error);
      throw error;
    }
  }

  /**
   * Get user analytics
   */
  static async getUserMetrics(filter?: AnalyticsFilter): Promise<UserMetrics> {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000));
      const monthAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));

      // Get total users
      const usersResult = await FirestoreService.getCollection('users');
      const totalUsers = usersResult.success ? usersResult.data.length : 0;

      // Get active users (users who logged in within last 30 days)
      const activeUsersResult = await FirestoreService.getCollection(
        'users',
        [{ field: 'lastLoginAt', operator: '>', value: monthAgo }]
      );
      const activeUsers = activeUsersResult.success ? activeUsersResult.data.length : 0;

      // Get new users
      const newUsersToday = await this.getNewUsersCount(today);
      const newUsersThisWeek = await this.getNewUsersCount(weekAgo);
      const newUsersThisMonth = await this.getNewUsersCount(monthAgo);

      // Get users by subscription tier
      const usersByTier = await this.getUsersByTier();

      // Calculate retention rates
      const userRetention = await this.calculateUserRetention();

      // Get top countries
      const topCountries = await this.getTopCountries();

      return {
        totalUsers,
        activeUsers,
        newUsers: {
          today: newUsersToday,
          thisWeek: newUsersThisWeek,
          thisMonth: newUsersThisMonth,
        },
        usersByTier,
        userRetention,
        topCountries,
      };
    } catch (error) {
      console.error('Error getting user metrics:', error);
      throw error;
    }
  }

  /**
   * Get revenue analytics
   */
  static async getRevenueMetrics(filter?: AnalyticsFilter): Promise<RevenueMetrics> {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfYear = new Date(now.getFullYear(), 0, 1);

      // Get all invoices
      const invoicesResult = await FirestoreService.getCollection('invoices');
      const invoices = invoicesResult.success ? invoicesResult.data : [];

      // Calculate total revenue
      const totalRevenue = invoices
        .filter((invoice: any) => invoice.status === 'paid')
        .reduce((sum, invoice) => sum + invoice.amount, 0) / 100; // Convert from cents

      // Calculate monthly revenue
      const monthlyRevenue = invoices
        .filter((invoice: any) => 
          invoice.status === 'paid' && 
          invoice.paidAt >= startOfMonth
        )
        .reduce((sum, invoice) => sum + invoice.amount, 0) / 100;

      // Calculate yearly revenue
      const yearlyRevenue = invoices
        .filter((invoice: any) => 
          invoice.status === 'paid' && 
          invoice.paidAt >= startOfYear
        )
        .reduce((sum, invoice) => sum + invoice.amount, 0) / 100;

      // Get revenue by tier
      const revenueByTier = await this.getRevenueByTier(invoices);

      // Calculate growth rates
      const revenueGrowth = await this.calculateRevenueGrowth();

      // Calculate ARPU
      const activeSubscriptionsResult = await FirestoreService.getCollection(
        'subscriptions',
        [{ field: 'status', operator: 'in', value: ['active', 'trialing'] }]
      );
      const activeSubscriptions = activeSubscriptionsResult.success ? activeSubscriptionsResult.data.length : 1;
      const averageRevenuePerUser = monthlyRevenue / activeSubscriptions;

      // Calculate other metrics
      const lifetimeValue = await this.calculateLifetimeValue();
      const churnRate = await this.calculateChurnRate();
      const refundRate = await this.calculateRefundRate();

      return {
        totalRevenue,
        monthlyRevenue,
        yearlyRevenue,
        revenueByTier,
        revenueGrowth,
        averageRevenuePerUser,
        lifetimeValue,
        churnRate,
        refundRate,
      };
    } catch (error) {
      console.error('Error getting revenue metrics:', error);
      throw error;
    }
  }

  /**
   * Get usage analytics
   */
  static async getUsageMetrics(filter?: AnalyticsFilter): Promise<UsageMetrics> {
    try {
      // Get usage data
      const usageResult = await FirestoreService.getCollection('usage');
      const usage = usageResult.success ? usageResult.data : [];

      const totalAccounts = usage.reduce((sum, u) => sum + u.accounts, 0);
      const totalBackups = usage.reduce((sum, u) => sum + u.backups, 0);
      const totalApiCalls = usage.reduce((sum, u) => sum + u.apiCalls, 0);
      const storageUsed = usage.reduce((sum, u) => sum + u.storageUsed, 0);

      const uniqueUsers = new Set(usage.map((u: any) => u.userId)).size;
      const averageAccountsPerUser = uniqueUsers > 0 ? totalAccounts / uniqueUsers : 0;
      const averageBackupsPerUser = uniqueUsers > 0 ? totalBackups / uniqueUsers : 0;

      // Get top features (mock data for now)
      const topFeatures = [
        { feature: 'Account Creation', usage: totalAccounts },
        { feature: 'Backup Creation', usage: totalBackups },
        { feature: 'API Calls', usage: totalApiCalls },
        { feature: 'Cloud Sync', usage: Math.floor(totalAccounts * 0.8) },
        { feature: 'Export', usage: Math.floor(totalAccounts * 0.3) },
      ].sort((a, b) => b.usage - a.usage);

      return {
        totalAccounts,
        totalBackups,
        totalApiCalls,
        storageUsed,
        averageAccountsPerUser,
        averageBackupsPerUser,
        topFeatures,
      };
    } catch (error) {
      console.error('Error getting usage metrics:', error);
      throw error;
    }
  }

  /**
   * Get time series data for a metric
   */
  static async getTimeSeriesData(
    metric: 'users' | 'revenue' | 'subscriptions' | 'usage',
    period: 'day' | 'week' | 'month' | 'year',
    filter?: AnalyticsFilter
  ): Promise<TimeSeriesData[]> {
    try {
      const endDate = filter?.endDate || new Date();
      const startDate = filter?.startDate || new Date(endDate.getTime() - this.getPeriodDuration(period));

      switch (metric) {
        case 'users':
          return this.getUserTimeSeriesData(startDate, endDate, period);
        case 'revenue':
          return this.getRevenueTimeSeriesData(startDate, endDate, period);
        case 'subscriptions':
          return this.getSubscriptionTimeSeriesData(startDate, endDate, period);
        case 'usage':
          return this.getUsageTimeSeriesData(startDate, endDate, period);
        default:
          return [];
      }
    } catch (error) {
      console.error('Error getting time series data:', error);
      return [];
    }
  }

  /**
   * Get real-time metrics
   */
  static async getRealTimeMetrics(): Promise<{
    activeUsers: number;
    requestsPerSecond: number;
    errorRate: number;
    responseTime: number;
  }> {
    try {
      // These would typically come from monitoring services like New Relic, DataDog, etc.
      // For now, we'll return mock data
      return {
        activeUsers: Math.floor(Math.random() * 1000) + 500,
        requestsPerSecond: Math.floor(Math.random() * 100) + 50,
        errorRate: Math.random() * 5, // 0-5%
        responseTime: Math.floor(Math.random() * 200) + 100, // 100-300ms
      };
    } catch (error) {
      console.error('Error getting real-time metrics:', error);
      return {
        activeUsers: 0,
        requestsPerSecond: 0,
        errorRate: 0,
        responseTime: 0,
      };
    }
  }

  /**
   * Generate custom analytics report
   */
  static async generateCustomReport(
    metrics: string[],
    filter?: AnalyticsFilter,
    groupBy?: 'day' | 'week' | 'month' | 'tier' | 'country'
  ): Promise<{
    data: Record<string, any>[];
    summary: Record<string, number>;
  }> {
    try {
      const data: Record<string, any>[] = [];
      const summary: Record<string, number> = {};

      // This would implement custom report generation based on requested metrics
      // For now, return basic structure
      
      return { data, summary };
    } catch (error) {
      console.error('Error generating custom report:', error);
      throw error;
    }
  }

  // Helper methods

  private static async getNewUsersCount(since: Date): Promise<number> {
    const result = await FirestoreService.getCollection(
      'users',
      [{ field: 'createdAt', operator: '>', value: since }]
    );
    return result.success ? result.data.length : 0;
  }

  private static async getUsersByTier(): Promise<Record<SubscriptionTier, number>> {
    const result = await FirestoreService.getCollection('subscriptions');
    const subscriptions = result.success ? result.data : [];

    const tierCounts: Record<SubscriptionTier, number> = {
      free: 0,
      premium: 0,
      family: 0,
      enterprise: 0,
    };

    subscriptions.forEach(sub => {
      if (sub.status === 'active' || sub.status === 'trialing') {
        tierCounts[sub.tier as SubscriptionTier]++;
      }
    });

    return tierCounts;
  }

  private static async calculateUserRetention(): Promise<{
    day1: number;
    day7: number;
    day30: number;
  }> {
    // This would calculate actual retention rates
    // For now, return mock data
    return {
      day1: 85,
      day7: 65,
      day30: 45,
    };
  }

  private static async getTopCountries(): Promise<Array<{ country: string; count: number }>> {
    // This would analyze user locations
    // For now, return mock data
    return [
      { country: 'United States', count: 1250 },
      { country: 'United Kingdom', count: 890 },
      { country: 'Germany', count: 675 },
      { country: 'Canada', count: 450 },
      { country: 'Australia', count: 340 },
    ];
  }

  private static calculateConversionRate(userMetrics: UserMetrics): number {
    const paidUsers = Object.entries(userMetrics.usersByTier)
      .filter(([tier]) => tier !== 'free')
      .reduce((sum, [, count]) => sum + count, 0);
    
    return userMetrics.totalUsers > 0 ? (paidUsers / userMetrics.totalUsers) * 100 : 0;
  }

  private static async getRevenueByTier(invoices: unknown[]): Promise<Record<SubscriptionTier, number>> {
    const revenueByTier: Record<SubscriptionTier, number> = {
      free: 0,
      premium: 0,
      family: 0,
      enterprise: 0,
    };

    // This would correlate invoices with subscription tiers
    // For now, return estimated distribution
    const totalRevenue = invoices.reduce((sum, invoice) => sum + invoice.amount, 0) / 100;
    
    revenueByTier.premium = totalRevenue * 0.4;
    revenueByTier.family = totalRevenue * 0.35;
    revenueByTier.business = totalRevenue * 0.25;

    return revenueByTier;
  }

  private static async calculateRevenueGrowth(): Promise<{ monthly: number; yearly: number }> {
    // This would calculate actual growth rates
    return {
      monthly: 15.2, // 15.2% month-over-month growth
      yearly: 185.5, // 185.5% year-over-year growth
    };
  }

  private static async calculateLifetimeValue(): Promise<number> {
    // This would calculate actual customer lifetime value
    return 89.50; // Average LTV in dollars
  }

  private static async calculateChurnRate(): Promise<number> {
    // This would calculate actual churn rate
    return 5.2; // 5.2% monthly churn rate
  }

  private static async calculateRefundRate(): Promise<number> {
    // This would calculate actual refund rate
    return 2.1; // 2.1% refund rate
  }

  private static getPeriodDuration(period: string): number {
    switch (period) {
      case 'day': return 24 * 60 * 60 * 1000;
      case 'week': return 7 * 24 * 60 * 60 * 1000;
      case 'month': return 30 * 24 * 60 * 60 * 1000;
      case 'year': return 365 * 24 * 60 * 60 * 1000;
      default: return 30 * 24 * 60 * 60 * 1000;
    }
  }

  private static async getUserTimeSeriesData(
    startDate: Date,
    endDate: Date,
    period: string
  ): Promise<TimeSeriesData[]> {
    // This would generate actual time series data for user registrations
    const data: TimeSeriesData[] = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      data.push({
        date: new Date(current),
        value: Math.floor(Math.random() * 50) + 10, // Mock data
        label: current.toLocaleDateString(),
      });
      
      // Increment by period
      switch (period) {
        case 'day':
          current.setDate(current.getDate() + 1);
          break;
        case 'week':
          current.setDate(current.getDate() + 7);
          break;
        case 'month':
          current.setMonth(current.getMonth() + 1);
          break;
        case 'year':
          current.setFullYear(current.getFullYear() + 1);
          break;
      }
    }
    
    return data;
  }

  private static async getRevenueTimeSeriesData(
    startDate: Date,
    endDate: Date,
    period: string
  ): Promise<TimeSeriesData[]> {
    // Similar implementation for revenue data
    return this.getUserTimeSeriesData(startDate, endDate, period);
  }

  private static async getSubscriptionTimeSeriesData(
    startDate: Date,
    endDate: Date,
    period: string
  ): Promise<TimeSeriesData[]> {
    // Similar implementation for subscription data
    return this.getUserTimeSeriesData(startDate, endDate, period);
  }

  private static async getUsageTimeSeriesData(
    startDate: Date,
    endDate: Date,
    period: string
  ): Promise<TimeSeriesData[]> {
    // Similar implementation for usage data
    return this.getUserTimeSeriesData(startDate, endDate, period);
  }

  private static getFromCache(key: string): unknown {
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      return cached.data;
    }
    return null;
  }

  private static setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  static clearCache(): void {
    this.cache.clear();
  }
}