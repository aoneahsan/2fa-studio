import React, { useState } from 'react';
import { AdminLayout } from '@components/admin/AdminLayout';
import { Card } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Switch } from '@components/ui/switch';
import { Input } from '@components/ui/input';
import { 
  CogIcon, 
  BellIcon, 
  ShieldCheckIcon, 
  CurrencyDollarIcon,
  DocumentTextIcon,
  GlobeAltIcon 
} from '@heroicons/react/24/outline';

interface SettingSection {
  id: string;
  title: string;
  icon: React.ReactNode;
}

const AdminSettings: React.FC = () => {
  const [activeSection, setActiveSection] = useState('general');
  const [settings, setSettings] = useState({
    // General
    siteName: '2FA Studio',
    supportEmail: 'support@2fastudio.com',
    maintenanceMode: false,
    
    // Security
    maxLoginAttempts: 5,
    sessionTimeout: 30,
    requireEmailVerification: true,
    enforce2FA: false,
    
    // Notifications
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    notificationEmail: 'admin@2fastudio.com',
    
    // Billing
    stripeLiveMode: false,
    defaultCurrency: 'USD',
    taxRate: 0,
    
    // Features
    enableBrowserExtension: true,
    enableAPIAccess: true,
    enableGoogleDriveBackup: true,
    maxAccountsPerUser: 1000
  });

  const sections: SettingSection[] = [
    { id: 'general', title: 'General', icon: <CogIcon className="w-5 h-5" /> },
    { id: 'security', title: 'Security', icon: <ShieldCheckIcon className="w-5 h-5" /> },
    { id: 'notifications', title: 'Notifications', icon: <BellIcon className="w-5 h-5" /> },
    { id: 'billing', title: 'Billing', icon: <CurrencyDollarIcon className="w-5 h-5" /> },
    { id: 'features', title: 'Features', icon: <DocumentTextIcon className="w-5 h-5" /> },
    { id: 'api', title: 'API', icon: <GlobeAltIcon className="w-5 h-5" /> }
  ];

  const handleSave = () => {
    // Save settings
    console.log('Saving settings:', settings);
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'general':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Site Name</label>
              <Input
                value={settings.siteName}
                onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Support Email</label>
              <Input
                type="email"
                value={settings.supportEmail}
                onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Maintenance Mode</p>
                <p className="text-sm text-muted-foreground">
                  Show maintenance page to all users
                </p>
              </div>
              <Switch
                checked={settings.maintenanceMode}
                onCheckedChange={(checked) => 
                  setSettings({ ...settings, maintenanceMode: checked })
                }
              />
            </div>
          </div>
        );
        
      case 'security':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Max Login Attempts</label>
              <Input
                type="number"
                value={settings.maxLoginAttempts}
                onChange={(e) => setSettings({ 
                  ...settings, 
                  maxLoginAttempts: parseInt(e.target.value) 
                })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Session Timeout (minutes)</label>
              <Input
                type="number"
                value={settings.sessionTimeout}
                onChange={(e) => setSettings({ 
                  ...settings, 
                  sessionTimeout: parseInt(e.target.value) 
                })}
                className="mt-1"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Require Email Verification</p>
                <p className="text-sm text-muted-foreground">
                  Users must verify email before access
                </p>
              </div>
              <Switch
                checked={settings.requireEmailVerification}
                onCheckedChange={(checked) => 
                  setSettings({ ...settings, requireEmailVerification: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Enforce 2FA for All Users</p>
                <p className="text-sm text-muted-foreground">
                  Require 2FA for enhanced security
                </p>
              </div>
              <Switch
                checked={settings.enforce2FA}
                onCheckedChange={(checked) => 
                  setSettings({ ...settings, enforce2FA: checked })
                }
              />
            </div>
          </div>
        );
        
      case 'notifications':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Admin Notification Email</label>
              <Input
                type="email"
                value={settings.notificationEmail}
                onChange={(e) => setSettings({ 
                  ...settings, 
                  notificationEmail: e.target.value 
                })}
                className="mt-1"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Send system notifications via email
                </p>
              </div>
              <Switch
                checked={settings.emailNotifications}
                onCheckedChange={(checked) => 
                  setSettings({ ...settings, emailNotifications: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Push Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Enable push notifications
                </p>
              </div>
              <Switch
                checked={settings.pushNotifications}
                onCheckedChange={(checked) => 
                  setSettings({ ...settings, pushNotifications: checked })
                }
              />
            </div>
          </div>
        );
        
      case 'features':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Max Accounts Per User</label>
              <Input
                type="number"
                value={settings.maxAccountsPerUser}
                onChange={(e) => setSettings({ 
                  ...settings, 
                  maxAccountsPerUser: parseInt(e.target.value) 
                })}
                className="mt-1"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Browser Extension</p>
                <p className="text-sm text-muted-foreground">
                  Allow users to use browser extension
                </p>
              </div>
              <Switch
                checked={settings.enableBrowserExtension}
                onCheckedChange={(checked) => 
                  setSettings({ ...settings, enableBrowserExtension: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">API Access</p>
                <p className="text-sm text-muted-foreground">
                  Enable developer API access
                </p>
              </div>
              <Switch
                checked={settings.enableAPIAccess}
                onCheckedChange={(checked) => 
                  setSettings({ ...settings, enableAPIAccess: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Google Drive Backup</p>
                <p className="text-sm text-muted-foreground">
                  Allow cloud backup feature
                </p>
              </div>
              <Switch
                checked={settings.enableGoogleDriveBackup}
                onCheckedChange={(checked) => 
                  setSettings({ ...settings, enableGoogleDriveBackup: checked })
                }
              />
            </div>
          </div>
        );
        
      default:
        return <div>Section not implemented</div>;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Admin Settings</h1>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="p-2">
              <nav className="space-y-1">
                {sections.map(section => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeSection === section.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    {section.icon}
                    {section.title}
                  </button>
                ))}
              </nav>
            </Card>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">
                {sections.find(s => s.id === activeSection)?.title}
              </h2>
              {renderSection()}
              
              <div className="mt-6 pt-6 border-t flex justify-end">
                <Button onClick={handleSave}>Save Changes</Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;