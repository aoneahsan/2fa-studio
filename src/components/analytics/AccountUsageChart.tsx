/**
 * Account usage chart component
 * @module components/analytics/AccountUsageChart
 */

import React from 'react';
import { UsageStats } from '@app-types/analytics';
import { format } from 'date-fns';
import { 
  ChartBarIcon,
  ClockIcon,
  CursorArrowRaysIcon,
  EyeIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface AccountUsageChartProps {
  stats: UsageStats;
  className?: string;
}

/**
 * Component for displaying account usage statistics
 */
const AccountUsageChart: React.FC<AccountUsageChartProps> = ({ stats, className = '' }) => {
  // Find peak hour
  const peakHour = Object.entries(stats.hourlyDistribution)
    .reduce((max, [hour, count]) => 
      count > max.count ? { hour: parseInt(hour), count } : max,
    { hour: 0, count: 0 });

  // Calculate total actions
  const totalActions = stats.totalViews + stats.totalCopies + stats.totalGenerations;

  // Get recent daily usage (last 7 days)
  const recentDailyUsage = stats.dailyUsage.slice(-7);
  const maxDailyUsage = Math.max(
    ...recentDailyUsage.map(d => d.views + d.copies + d.generations),
    1
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-muted/20 rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <EyeIcon className="w-4 h-4" />
            <span className="text-sm">Views</span>
          </div>
          <p className="text-2xl font-bold">{stats.totalViews}</p>
        </div>

        <div className="bg-muted/20 rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <CursorArrowRaysIcon className="w-4 h-4" />
            <span className="text-sm">Copies</span>
          </div>
          <p className="text-2xl font-bold">{stats.totalCopies}</p>
        </div>

        <div className="bg-muted/20 rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <ArrowPathIcon className="w-4 h-4" />
            <span className="text-sm">Generations</span>
          </div>
          <p className="text-2xl font-bold">{stats.totalGenerations}</p>
        </div>

        <div className="bg-muted/20 rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <ClockIcon className="w-4 h-4" />
            <span className="text-sm">Last Used</span>
          </div>
          <p className="text-sm font-medium">
            {format(stats.lastUsed, 'MMM d, h:mm a')}
          </p>
        </div>
      </div>

      {/* Daily Usage Chart */}
      {recentDailyUsage.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-3">Daily Usage (Last 7 Days)</h4>
          <div className="space-y-2">
            {recentDailyUsage.map((day) => {
              const total = day.views + day.copies + day.generations;
              const percentage = (total / maxDailyUsage) * 100;
              
              return (
                <div key={day.date} className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground w-16">
                    {format(new Date(day.date), 'EEE')}
                  </span>
                  <div className="flex-1 bg-muted rounded-full h-6 relative overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                      {total}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Hourly Distribution */}
      <div>
        <h4 className="text-sm font-medium mb-3">Usage by Hour</h4>
        <div className="grid grid-cols-12 gap-1 h-20">
          {Array.from({ length: 24 }, (_, hour) => {
            const count = stats.hourlyDistribution[hour] || 0;
            const maxHourly = Math.max(...Object.values(stats.hourlyDistribution), 1);
            const height = (count / maxHourly) * 100;
            const isPeak = hour === peakHour.hour && count > 0;
            
            return (
              <div
                key={hour}
                className={`col-span-1 ${hour >= 12 ? '' : ''}`}
                title={`${hour}:00 - ${count} actions`}
              >
                <div className="h-full flex items-end">
                  <div
                    className={`w-full rounded-t transition-all duration-300 ${
                      isPeak ? 'bg-primary' : 'bg-muted'
                    }`}
                    style={{ height: `${height}%` }}
                  />
                </div>
                {hour % 6 === 0 && (
                  <p className="text-xs text-muted-foreground text-center mt-1">
                    {hour}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        {peakHour.count > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            Peak usage at {peakHour.hour}:00 ({peakHour.count} actions)
          </p>
        )}
      </div>

      {/* Device Distribution */}
      {Object.keys(stats.deviceDistribution).length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-3">Device Usage</h4>
          <div className="space-y-2">
            {Object.entries(stats.deviceDistribution)
              .sort((a, b) => b[1].usageCount - a[1].usageCount)
              .map(([deviceId, device]) => (
                <div key={deviceId} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{device.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{device.usageCount} actions</span>
                    <span className="text-xs text-muted-foreground">
                      {format(device.lastUsed, 'MMM d')}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* No Usage Message */}
      {totalActions === 0 && (
        <div className="text-center py-8">
          <ChartBarIcon className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No usage data available</p>
          <p className="text-sm text-muted-foreground mt-1">
            Start using this account to see analytics
          </p>
        </div>
      )}
    </div>
  );
};

export default AccountUsageChart;