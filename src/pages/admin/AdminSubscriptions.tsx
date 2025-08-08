import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@components/admin/AdminLayout';
import { Card } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { AdminSubscriptionManagementService } from '@services/admin-subscription-management.service';
import { RefreshCwIcon, TrendingUpIcon, UsersIcon, DollarSignIcon } from 'lucide-react';

export const AdminSubscriptions: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await AdminSubscriptionManagementService.getSubscriptionStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Subscription Management</h1>
          <Button onClick={loadStats} size="sm" variant="outline">
            <RefreshCwIcon className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">${stats?.totalRevenue || 0}</p>
              </div>
              <DollarSignIcon className="w-8 h-8 text-green-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Subscriptions</p>
                <p className="text-2xl font-bold">{stats?.activeSubscriptions || 0}</p>
              </div>
              <UsersIcon className="w-8 h-8 text-blue-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Growth Rate</p>
                <p className="text-2xl font-bold">{stats?.growthRate || 0}%</p>
              </div>
              <TrendingUpIcon className="w-8 h-8 text-purple-500" />
            </div>
          </Card>
        </div>

        {/* Subscription Plans */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Subscription Plans</h2>
          <div className="space-y-4">
            {['free', 'pro', 'business'].map(plan => (
              <div key={plan} className="flex justify-between items-center p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium capitalize">{plan}</h3>
                  <p className="text-sm text-muted-foreground">
                    {stats?.planDistribution?.[plan] || 0} users
                  </p>
                </div>
                <Button size="sm" variant="outline">Edit Plan</Button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
};