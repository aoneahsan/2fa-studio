import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@components/admin/AdminLayout';
import { Card } from '@components/ui/card';
import { AdminAnalyticsService } from '@services/admin-analytics.service';
import { BarChart3Icon, TrendingUpIcon, CalendarIcon } from 'lucide-react';

const AdminAnalytics: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      const data = await AdminAnalyticsService.getMetrics();
      setMetrics(data);
    } catch (error) {
      console.error('Failed to load metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading analytics...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Analytics Dashboard</h1>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Daily Active Users</p>
                <p className="text-xl font-bold">{metrics?.dau || 0}</p>
              </div>
              <BarChart3Icon className="w-6 h-6 text-blue-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Active Users</p>
                <p className="text-xl font-bold">{metrics?.mau || 0}</p>
              </div>
              <TrendingUpIcon className="w-6 h-6 text-green-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Retention Rate</p>
                <p className="text-xl font-bold">{metrics?.retentionRate || 0}%</p>
              </div>
              <CalendarIcon className="w-6 h-6 text-purple-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Session Duration</p>
                <p className="text-xl font-bold">{metrics?.avgSessionDuration || '0m'}</p>
              </div>
              <BarChart3Icon className="w-6 h-6 text-orange-500" />
            </div>
          </Card>
        </div>

        {/* Charts Placeholder */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">User Growth</h2>
          <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">Chart visualization coming soon</p>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Feature Usage</h2>
          <div className="space-y-2">
            {Object.entries(metrics?.featureUsage || {}).map(([feature, count]) => (
              <div key={feature} className="flex justify-between">
                <span className="capitalize">{feature.replace('_', ' ')}</span>
                <span className="font-medium">{count as number}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminAnalytics;