/**
 * Dashboard page component
 * @module pages/DashboardPage
 */

import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '@src/store';
import { useAccounts } from '@hooks/useAccounts';
import GlobalUsageStats from '@components/analytics/GlobalUsageStats';
import { 
  PlusIcon,
  KeyIcon,
  ShieldCheckIcon,
  CloudArrowUpIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import AdBanner from '@components/ads/AdBanner';
import AdInterstitialTrigger from '@components/ads/AdInterstitialTrigger';

/**
 * Main dashboard page
 */
const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state._auth);
  const { accounts, isLoading } = useAccounts();
  const { lastBackup } = useSelector((state: RootState) => state.settings);

  const stats = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    return {
      totalAccounts: accounts.length,
      recentlyUsed: accounts.filter(acc => acc.updatedAt > thirtyDaysAgo).length,
      backupStatus: lastBackup ? 'Backed up' : 'Not backed up',
      accountsRemaining: user?.subscription.accountLimit ? user.subscription.accountLimit - accounts.length : 0,
    };
  }, [accounts, user, lastBackup]);

  const quickActions = [
    {
      title: 'Add Account',
      description: 'Add a new 2FA account',
      icon: PlusIcon,
      action: () => navigate('/accounts?action=add'),
      color: 'text-blue-500',
    },
    {
      title: 'View Accounts',
      description: 'Manage your 2FA codes',
      icon: KeyIcon,
      action: () => navigate('/accounts'),
      color: 'text-green-500',
    },
    {
      title: 'Backup Data',
      description: 'Backup to Google Drive',
      icon: CloudArrowUpIcon,
      action: () => navigate('/backup'),
      color: 'text-purple-500',
    },
    {
      title: 'Security Settings',
      description: 'Configure app security',
      icon: ShieldCheckIcon,
      action: () => navigate('/settings'),
      color: 'text-orange-500',
    },
  ];

  return (
    <>
      {/* Ad Components for Free Users */}
      <AdBanner position="bottom" />
      <AdInterstitialTrigger triggerAfterActions={5} triggerAfterSeconds={180} />
      
      <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {user?.displayName || user?.email?.split('@')[0]}!
        </h1>
        <p className="text-muted-foreground mt-1">
          Your 2FA codes are secure and encrypted
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">Total Accounts</p>
              <p className="text-2xl font-bold text-foreground">{stats.totalAccounts}</p>
            </div>
            <KeyIcon className="h-8 w-8 text-primary" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">Recently Used</p>
              <p className="text-2xl font-bold text-foreground">{stats.recentlyUsed}</p>
            </div>
            <ChartBarIcon className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">Backup Status</p>
              <p className="text-sm font-semibold text-foreground">{stats.backupStatus}</p>
            </div>
            <CloudArrowUpIcon className={`h-8 w-8 ${lastBackup ? 'text-green-500' : 'text-yellow-500'}`} />
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">Account Limit</p>
              <p className="text-2xl font-bold text-foreground">
                {stats.accountsRemaining > 0 ? stats.accountsRemaining : 'Unlimited'}
              </p>
              {user?.subscription.type === 'free' && (
                <p className="text-xs text-muted-foreground">remaining</p>
              )}
            </div>
            <ShieldCheckIcon className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {quickActions.map((action) => (
            <button
              key={action.title}
              onClick={action.action}
              className="flex items-start gap-4 p-4 bg-card border border-border rounded-lg hover:bg-muted transition-colors text-left"
            >
              <action.icon className={`h-6 w-6 ${action.color} mt-0.5`} />
              <div className="flex-1">
                <h3 className="font-medium text-foreground">{action.title}</h3>
                <p className="text-sm text-muted-foreground">{action.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Upgrade Banner for Free Users */}
      {user?.subscription.type === 'free' && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Upgrade to Premium</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Get unlimited accounts, no ads, and priority support
              </p>
            </div>
            <button
              onClick={() => navigate('/settings?tab=subscription')}
              className="btn btn-primary btn-sm"
            >
              Upgrade Now
            </button>
          </div>
        </div>
      )}

      {/* Usage Analytics */}
      <div className="mt-8">
        <GlobalUsageStats />
      </div>
    </div>
    </>
  );
};

export default DashboardPage;