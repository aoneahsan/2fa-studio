/**
 * Global usage statistics component
 * @module components/analytics/GlobalUsageStats
 */

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@src/store';
import { AnalyticsService } from '@services/analytics.service';
import { GlobalUsageStats as GlobalStats } from '@app-types/analytics';
import { 
  ChartBarIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  DevicePhoneMobileIcon,
} from '@heroicons/react/24/outline';

/**
 * Component for displaying global usage statistics
 */
const GlobalUsageStats: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const { accounts } = useSelector((state: RootState) => state.accounts);
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(30);

  useEffect(() => {
    if (user && accounts.length > 0) {
      loadStats();
    }
  }, [user, accounts, timeRange]);

  const loadStats = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const globalStats = await AnalyticsService.getGlobalUsageStats(
        user.id,
        accounts,
        timeRange
      );
      setStats(globalStats);
    } catch (error) {
      console.error('Error loading global stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <ChartBarIcon className="w-12 h-12 mx-auto text-muted-foreground mb-3 animate-pulse" />
        <p className="text-muted-foreground">Loading analytics...</p>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const formatHour = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour} ${period}`;
  };

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Usage Analytics</h2>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(Number(e.target.value))}
          className="px-3 py-1.5 border border-border rounded-md bg-background text-sm"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Total Actions</h3>
            <ChartBarIcon className="w-5 h-5 text-primary" />
          </div>
          <p className="text-2xl font-bold">{stats.totalActions}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {stats.averageActionsPerDay.toFixed(1)} per day
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Active Accounts</h3>
            <DevicePhoneMobileIcon className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold">
            {stats.totalAccounts - stats.accountsNotUsedInDays.length}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            of {stats.totalAccounts} total
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Peak Hours</h3>
            <ClockIcon className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-lg font-medium">
            {stats.peakUsageHours.map(formatHour).join(', ')}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Most active times
          </p>
        </div>
      </div>

      {/* Most Used Accounts */}
      {stats.mostUsedAccounts.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            <TrendingUpIcon className="w-5 h-5 text-green-500" />
            Most Used Accounts
          </h3>
          <div className="space-y-3">
            {stats.mostUsedAccounts.map((account, index) => (
              <div key={account.accountId} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-muted-foreground w-6">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium">{account.issuer}</p>
                    <p className="text-sm text-muted-foreground">{account.label}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold">{account.usageCount}</p>
                  <p className="text-xs text-muted-foreground">actions</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Least Used / Inactive Accounts */}
      {stats.accountsNotUsedInDays.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />
            Inactive Accounts
          </h3>
          <div className="space-y-3">
            {stats.accountsNotUsedInDays.map((account) => (
              <div key={account.accountId} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{account.issuer}</p>
                  <p className="text-sm text-muted-foreground">{account.label}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                    {account.daysSinceLastUse === Infinity 
                      ? 'Never used' 
                      : `${account.daysSinceLastUse} days ago`
                    }
                  </p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Consider removing unused accounts to improve security
          </p>
        </div>
      )}

      {/* No Data */}
      {stats.totalActions === 0 && (
        <div className="bg-muted/20 rounded-lg p-12 text-center">
          <ChartBarIcon className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Usage Data Yet</h3>
          <p className="text-muted-foreground">
            Start using your 2FA accounts to see analytics and insights
          </p>
        </div>
      )}
    </div>
  );
};

export default GlobalUsageStats;