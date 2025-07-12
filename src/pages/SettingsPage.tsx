/**
 * Settings page component
 * @module pages/SettingsPage
 */

import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { 
  UserCircleIcon, 
  PaintBrushIcon, 
  ShieldCheckIcon,
  CloudArrowUpIcon,
  CreditCardIcon,
  InformationCircleIcon,
  BellIcon
} from '@heroicons/react/24/outline';

// Import settings components
import ProfileSettings from '../components/settings/ProfileSettings';
import AppearanceSettings from '../components/settings/AppearanceSettings';
import SecuritySettings from '../components/settings/SecuritySettings';
import BackupSettings from '../components/settings/BackupSettings';
import SubscriptionSettings from '../components/settings/SubscriptionSettings';
import AboutSettings from '../components/settings/AboutSettings';
import NotificationSettings from '../components/settings/NotificationSettings';

type SettingsTab = 'profile' | 'appearance' | 'security' | 'backup' | 'notifications' | 'subscription' | 'about';

/**
 * Page for app settings
 */
const SettingsPage: React.FC = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  const tabs = [
    {
      id: 'profile' as const,
      label: 'Profile',
      icon: UserCircleIcon,
      component: ProfileSettings
    },
    {
      id: 'appearance' as const,
      label: 'Appearance',
      icon: PaintBrushIcon,
      component: AppearanceSettings
    },
    {
      id: 'security' as const,
      label: 'Security',
      icon: ShieldCheckIcon,
      component: SecuritySettings
    },
    {
      id: 'backup' as const,
      label: 'Backup',
      icon: CloudArrowUpIcon,
      component: BackupSettings
    },
    {
      id: 'notifications' as const,
      label: 'Notifications',
      icon: BellIcon,
      component: NotificationSettings
    },
    {
      id: 'subscription' as const,
      label: 'Subscription',
      icon: CreditCardIcon,
      component: SubscriptionSettings
    },
    {
      id: 'about' as const,
      label: 'About',
      icon: InformationCircleIcon,
      component: AboutSettings
    }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || ProfileSettings;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account and app preferences
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation */}
        <nav className="lg:w-64 flex-shrink-0">
          <ul className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <li key={tab.id}>
                  <button
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-lg
                      text-left transition-colors
                      ${isActive 
                        ? 'bg-primary text-primary-foreground' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium">{tab.label}</span>
                    
                    {/* Badge for subscription */}
                    {tab.id === 'subscription' && user?.subscription.type === 'free' && (
                      <span className="ml-auto text-xs bg-yellow-500 text-white px-2 py-0.5 rounded-full">
                        Free
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          <div className="bg-card border border-border rounded-lg p-6">
            <ActiveComponent />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;