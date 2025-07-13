/**
 * Admin Dashboard Page
 * @module pages/admin/AdminDashboard
 */

import React, { useEffect, useState } from 'react';
import { 
  UsersIcon, 
  CreditCardIcon, 
  CurrencyDollarIcon,
  ChartBarIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';
import { adminService } from '@services/admin.service';
import { AdminStats } from '@src/types';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import LoadingSpinner from '@components/common/LoadingSpinner';

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      const data = await adminService.getDashboardStats();
      setStats(data);
    } catch (err) {
      setError('Failed to load dashboard statistics');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg">
          {error || 'Failed to load statistics'}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers.toLocaleString(),
      icon: UsersIcon,
      change: '+12%',
      changeType: 'positive' as const
    },
    {
      title: 'Active Subscriptions',
      value: (stats.subscriptions.premium + stats.subscriptions.family).toLocaleString(),
      icon: CreditCardIcon,
      change: `${stats.conversionRate.toFixed(1)}% conversion`,
      changeType: 'neutral' as const
    },
    {
      title: 'Monthly Revenue',
      value: `$${(stats.revenue.monthly / 100).toLocaleString()}`,
      icon: CurrencyDollarIcon,
      change: '+8.4%',
      changeType: 'positive' as const
    },
    {
      title: 'Churn Rate',
      value: `${stats.churnRate.toFixed(1)}%`,
      icon: ChartBarIcon,
      change: '-0.5%',
      changeType: 'negative' as const
    }
  ];

  const getChangeIcon = (type: string) => {
    if (type === 'positive') return <ArrowUpIcon className="h-4 w-4" />;
    if (type === 'negative') return <ArrowDownIcon className="h-4 w-4" />;
    return null;
  };

  const getChangeColor = (type: string) => {
    if (type === 'positive') return 'text-green-600 dark:text-green-400';
    if (type === 'negative') return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Admin Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Overview of your application's performance and usage
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className={`flex items-center text-xs ${getChangeColor(stat.changeType)}`}>
                  {getChangeIcon(stat.changeType)}
                  <span className="ml-1">{stat.change}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Subscription Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Subscription Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Free Tier</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {stats.subscriptions.free.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-gray-400 h-2 rounded-full"
                    style={{ 
                      width: `${(stats.subscriptions.free / stats.totalUsers * 100).toFixed(1)}%` 
                    }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Premium</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {stats.subscriptions.premium.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-primary-500 h-2 rounded-full"
                    style={{ 
                      width: `${(stats.subscriptions.premium / stats.totalUsers * 100).toFixed(1)}%` 
                    }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Family</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {stats.subscriptions.family.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-purple-500 h-2 rounded-full"
                    style={{ 
                      width: `${(stats.subscriptions.family / stats.totalUsers * 100).toFixed(1)}%` 
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Daily Revenue</span>
                <span className="text-lg font-semibold">
                  ${(stats.revenue.daily / 100).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Monthly Revenue</span>
                <span className="text-lg font-semibold">
                  ${(stats.revenue.monthly / 100).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Annual Revenue</span>
                <span className="text-lg font-semibold">
                  ${(stats.revenue.yearly / 100).toLocaleString()}
                </span>
              </div>
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Average Revenue Per User</span>
                  <span className="text-lg font-semibold">
                    ${((stats.revenue.monthly / stats.totalUsers) / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <UsersIcon className="h-6 w-6 mb-2 text-gray-600 dark:text-gray-400" />
              <div className="text-sm font-medium">View All Users</div>
            </button>
            <button className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <CreditCardIcon className="h-6 w-6 mb-2 text-gray-600 dark:text-gray-400" />
              <div className="text-sm font-medium">Manage Subscriptions</div>
            </button>
            <button className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <ChartBarIcon className="h-6 w-6 mb-2 text-gray-600 dark:text-gray-400" />
              <div className="text-sm font-medium">View Analytics</div>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;