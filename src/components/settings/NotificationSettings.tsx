import React from 'react';
import { Bell, BellOff, Shield, Archive, Megaphone, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Switch } from '@components/ui/switch';
import { Button } from '@components/ui/button';
import { useNotifications } from '@hooks/useNotifications';
import { showSuccess, showError } from '@utils/toast';

const NotificationSettings: React.FC = () => {
  const { 
    isEnabled, 
    isLoading, 
    preferences, 
    requestPermission, 
    updatePreferences 
  } = useNotifications();

  const handleEnableNotifications = async () => {
    const granted = await requestPermission();
    if (granted) {
      showSuccess('Push notifications enabled');
    } else {
      showError('Push notifications permission denied');
    }
  };

  const handlePreferenceChange = async (
    key: keyof typeof preferences,
    value: boolean
  ) => {
    try {
      await updatePreferences({ [key]: value });
      showSuccess('Notification preferences updated');
    } catch (error) {
      showError('Failed to update preferences');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Push Notifications</CardTitle>
        <CardDescription>
          Manage how you receive notifications from 2FA Studio
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Notifications */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {isEnabled ? (
              <Bell className="h-5 w-5 text-green-500" />
            ) : (
              <BellOff className="h-5 w-5 text-gray-400" />
            )}
            <div>
              <p className="font-medium">Push Notifications</p>
              <p className="text-sm text-muted-foreground">
                {isEnabled 
                  ? 'Notifications are enabled' 
                  : 'Enable to receive important alerts'}
              </p>
            </div>
          </div>
          {!isEnabled && (
            <Button
              onClick={handleEnableNotifications}
              disabled={isLoading}
              size="sm"
            >
              Enable
            </Button>
          )}
        </div>

        {isEnabled && (
          <>
            <div className="border-t pt-6">
              <h3 className="text-sm font-medium mb-4">Notification Types</h3>
              
              {/* Security Alerts */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Security Alerts</p>
                    <p className="text-xs text-muted-foreground">
                      New device logins and security events
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.securityAlerts}
                  onCheckedChange={(checked) => 
                    handlePreferenceChange('securityAlerts', checked)
                  }
                />
              </div>

              {/* Backup Reminders */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Archive className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Backup Reminders</p>
                    <p className="text-xs text-muted-foreground">
                      Reminders to backup your accounts
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.backupReminders}
                  onCheckedChange={(checked) => 
                    handlePreferenceChange('backupReminders', checked)
                  }
                />
              </div>

              {/* Promotions */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Megaphone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Promotions</p>
                    <p className="text-xs text-muted-foreground">
                      Special offers and discounts
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.promotions}
                  onCheckedChange={(checked) => 
                    handlePreferenceChange('promotions', checked)
                  }
                />
              </div>

              {/* Updates */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <RefreshCw className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Product Updates</p>
                    <p className="text-xs text-muted-foreground">
                      New features and improvements
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.updates}
                  onCheckedChange={(checked) => 
                    handlePreferenceChange('updates', checked)
                  }
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-xs text-muted-foreground">
                You can change these preferences at any time. Security alerts are 
                recommended to keep your account safe.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationSettings;