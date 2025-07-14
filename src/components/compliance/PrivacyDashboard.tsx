/**
 * Privacy Dashboard Component
 * Allows users to manage their GDPR rights and privacy settings
 * @module components/compliance/PrivacyDashboard
 */

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@store/index';
import { 
  GDPRComplianceService, 
  ConsentRecord, 
  ConsentType,
  DataExportRequest,
  DeletionRequest,
  PrivacySettings
} from '@services/compliance/gdpr-compliance.service';
import { format } from 'date-fns';
import {
  ShieldCheckIcon,
  DocumentArrowDownIcon,
  TrashIcon,
  CogIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '@components/common/LoadingSpinner';
import { Button } from '@components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@components/ui/card';
import { Switch } from '@components/ui/switch';

const PrivacyDashboard: React.FC = () => {
  const { user } = useSelector((state: RootState) => state._auth);
  const [loading, setLoading] = useState(true);
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings | null>(null);
  const [exportRequests, setExportRequests] = useState<DataExportRequest[]>([]);
  const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'consents' | 'data' | 'settings'>('consents');
  const [exportInProgress, setExportInProgress] = useState(false);
  const [showDeletionConfirm, setShowDeletionConfirm] = useState(false);

  useEffect(() => {
    if (user) {
      loadPrivacyData();
    }
  }, [user]);

  const loadPrivacyData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const [userConsents, settings] = await Promise.all([
        GDPRComplianceService.getUserConsents(user?.uid || ''),
        GDPRComplianceService.getPrivacySettings(user?.uid || '')
      ]);

      setConsents(userConsents);
      setPrivacySettings(settings);
    } catch (error) {
      console.error('Failed to load privacy data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConsentToggle = async (type: ConsentType, granted: boolean) => {
    if (!user) return;

    try {
      await GDPRComplianceService.recordConsent(user?.uid || '', type, granted);
      await loadPrivacyData();
    } catch (error) {
      console.error('Failed to update consent:', error);
    }
  };

  const handleDataExport = async (format: 'json' | 'csv' | 'pdf') => {
    if (!user) return;

    try {
      setExportInProgress(true);
      const requestId = await GDPRComplianceService.requestDataExport(user?.uid || '', format);
      
      // Show success message
      alert(`Data export requested. Request ID: ${requestId}. You will receive an email when it's ready.`);
    } catch (error) {
      console.error('Failed to request data export:', error);
      alert('Failed to request data export. Please try again.');
    } finally {
      setExportInProgress(false);
    }
  };

  const handleDeletionRequest = async () => {
    if (!user) return;

    try {
      const reason = prompt('Please provide a reason for deletion (optional):');
      const requestId = await GDPRComplianceService.requestDeletion(user?.uid || '', reason || undefined);
      
      alert(`Account deletion scheduled for ${format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'PPP')}. You will receive an email with instructions to cancel if needed.`);
      setShowDeletionConfirm(false);
    } catch (error) {
      console.error('Failed to request deletion:', error);
      alert('Failed to request account deletion. Please try again.');
    }
  };

  const handlePrivacySettingChange = async (
    category: keyof PrivacySettings,
    setting: string,
    value: boolean
  ) => {
    if (!user || !privacySettings) return;

    try {
      const updatedSettings = {
        ...privacySettings,
        [category]: {
          ...privacySettings[category as keyof PrivacySettings],
          [setting]: value
        }
      };

      await GDPRComplianceService.updatePrivacySettings(user?.uid || '', updatedSettings);
      setPrivacySettings(updatedSettings);
    } catch (error) {
      console.error('Failed to update privacy settings:', error);
    }
  };

  const getConsentValue = (type: ConsentType): boolean => {
    const consent = consents.find((c: any) => c.type === type);
    return consent?.granted || false;
  };

  const getConsentIcon = (granted: boolean) => {
    return granted ? (
      <CheckCircleIcon className="h-5 w-5 text-green-500" />
    ) : (
      <XCircleIcon className="h-5 w-5 text-red-500" />
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <ShieldCheckIcon className="h-8 w-8 mr-2 text-blue-600" />
            Privacy Center
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your privacy settings and exercise your data rights
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('consents')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'consents'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Consent Management
          </button>
          <button
            onClick={() => setActiveTab('data')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'data'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Your Data
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'settings'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Privacy Settings
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'consents' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cookie & Data Processing Consents</CardTitle>
              <CardDescription>
                Control how we process your data. Some features may be limited if you opt out.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Essential Cookies */}
              <div className="flex items-center justify-between py-3 border-b">
                <div className="flex-1">
                  <h4 className="font-medium">Essential Cookies</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Required for the app to function properly. Cannot be disabled.
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  <span className="text-sm text-gray-500">Always On</span>
                </div>
              </div>

              {/* Analytics */}
              <div className="flex items-center justify-between py-3 border-b">
                <div className="flex-1">
                  <h4 className="font-medium">Analytics & Performance</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Help us understand how you use the app to improve it.
                  </p>
                </div>
                <Switch
                  checked={getConsentValue(ConsentType.ANALYTICS)}
                  onCheckedChange={(checked) => handleConsentToggle(ConsentType.ANALYTICS, checked)}
                />
              </div>

              {/* Personalization */}
              <div className="flex items-center justify-between py-3 border-b">
                <div className="flex-1">
                  <h4 className="font-medium">Personalization</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Customize your experience based on your usage patterns.
                  </p>
                </div>
                <Switch
                  checked={getConsentValue(ConsentType.PERSONALIZATION)}
                  onCheckedChange={(checked) => handleConsentToggle(ConsentType.PERSONALIZATION, checked)}
                />
              </div>

              {/* Marketing */}
              <div className="flex items-center justify-between py-3">
                <div className="flex-1">
                  <h4 className="font-medium">Marketing Communications</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Receive updates about new features and offers.
                  </p>
                </div>
                <Switch
                  checked={getConsentValue(ConsentType.MARKETING)}
                  onCheckedChange={(checked) => handleConsentToggle(ConsentType.MARKETING, checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Consent History */}
          <Card>
            <CardHeader>
              <CardTitle>Consent History</CardTitle>
              <CardDescription>
                Your consent changes are recorded for transparency
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {consents.map((consent) => (
                  <div key={consent.id} className="flex items-center justify-between text-sm">
                    <span className="capitalize">{consent.type.replace('_', ' ')}</span>
                    <div className="flex items-center space-x-2">
                      {getConsentIcon(consent.granted)}
                      <span className="text-gray-500">
                        {format(consent.timestamp as Date, 'PPp')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'data' && (
        <div className="space-y-4">
          {/* Data Export */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                Export Your Data
              </CardTitle>
              <CardDescription>
                Download a copy of your data (GDPR Article 20 - Data Portability)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <div className="flex">
                    <InformationCircleIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        What's included in the export?
                      </h4>
                      <ul className="mt-1 text-sm text-blue-700 dark:text-blue-300 list-disc list-inside">
                        <li>All your 2FA accounts (secrets encrypted)</li>
                        <li>Settings and preferences</li>
                        <li>Backup history</li>
                        <li>Audit logs of your activity</li>
                        <li>Connected devices</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <Button
                    onClick={() => handleDataExport('json')}
                    disabled={exportInProgress}
                    variant="outline"
                  >
                    {exportInProgress ? <LoadingSpinner size="sm" /> : 'Export as JSON'}
                  </Button>
                  <Button
                    onClick={() => handleDataExport('csv')}
                    disabled={exportInProgress}
                    variant="outline"
                  >
                    Export as CSV
                  </Button>
                  <Button
                    onClick={() => handleDataExport('pdf')}
                    disabled={exportInProgress}
                    variant="outline"
                  >
                    Export as PDF
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Deletion */}
          <Card className="border-red-200 dark:border-red-900">
            <CardHeader>
              <CardTitle className="flex items-center text-red-600 dark:text-red-400">
                <TrashIcon className="h-5 w-5 mr-2" />
                Delete Your Account
              </CardTitle>
              <CardDescription>
                Permanently delete your account and all associated data (GDPR Article 17 - Right to Erasure)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                  <div className="flex">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-red-800 dark:text-red-200">
                        Warning: This action cannot be undone
                      </h4>
                      <ul className="mt-1 text-sm text-red-700 dark:text-red-300 list-disc list-inside">
                        <li>All your 2FA accounts will be permanently deleted</li>
                        <li>Your backups will be removed from all storage</li>
                        <li>Your subscription will be cancelled</li>
                        <li>You have 30 days to cancel this request</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {!showDeletionConfirm ? (
                  <Button
                    onClick={() => setShowDeletionConfirm(true)}
                    variant="outline"
                    className="border-red-300 text-red-600 hover:bg-red-50"
                  >
                    Request Account Deletion
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-red-600">
                      Are you absolutely sure? Type "DELETE" to confirm:
                    </p>
                    <div className="flex space-x-3">
                      <input
                        type="text"
                        placeholder="Type DELETE"
                        className="px-3 py-2 border rounded-md"
                        onChange={(e) => {
                          if (e.target.value === 'DELETE') {
                            handleDeletionRequest();
                          }
                        }}
                      />
                      <Button
                        onClick={() => setShowDeletionConfirm(false)}
                        variant="outline"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'settings' && privacySettings && (
        <div className="space-y-4">
          {/* Data Collection Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Data Collection</CardTitle>
              <CardDescription>
                Control what data we collect to improve the service
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b">
                <div className="flex-1">
                  <h4 className="font-medium">Analytics Data</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Anonymous usage statistics to improve features
                  </p>
                </div>
                <Switch
                  checked={privacySettings.dataCollection.analytics}
                  onCheckedChange={(checked) => 
                    handlePrivacySettingChange('dataCollection', 'analytics', checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between py-3 border-b">
                <div className="flex-1">
                  <h4 className="font-medium">Crash Reports</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Automatic error reporting to fix issues
                  </p>
                </div>
                <Switch
                  checked={privacySettings.dataCollection.crashReports}
                  onCheckedChange={(checked) => 
                    handlePrivacySettingChange('dataCollection', 'crashReports', checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between py-3">
                <div className="flex-1">
                  <h4 className="font-medium">Performance Metrics</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    App performance data to optimize speed
                  </p>
                </div>
                <Switch
                  checked={privacySettings.dataCollection.performanceMetrics}
                  onCheckedChange={(checked) => 
                    handlePrivacySettingChange('dataCollection', 'performanceMetrics', checked)
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Data Sharing Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Data Sharing</CardTitle>
              <CardDescription>
                Control how your data is shared
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b">
                <div className="flex-1">
                  <h4 className="font-medium">Third-Party Integrations</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Share data with connected services
                  </p>
                </div>
                <Switch
                  checked={privacySettings.dataSharing.thirdPartyIntegrations}
                  onCheckedChange={(checked) => 
                    handlePrivacySettingChange('dataSharing', 'thirdPartyIntegrations', checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between py-3">
                <div className="flex-1">
                  <h4 className="font-medium">Product Improvement</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Use anonymized data to improve the product
                  </p>
                </div>
                <Switch
                  checked={privacySettings.dataSharing.anonymizedDataForImprovement}
                  onCheckedChange={(checked) => 
                    handlePrivacySettingChange('dataSharing', 'anonymizedDataForImprovement', checked)
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Visibility Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Visibility</CardTitle>
              <CardDescription>
                Control who can see your information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b">
                <div className="flex-1">
                  <h4 className="font-medium">Profile Visible to Team</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Team members can see your profile info
                  </p>
                </div>
                <Switch
                  checked={privacySettings.visibility.profileVisibleToTeam}
                  onCheckedChange={(checked) => 
                    handlePrivacySettingChange('visibility', 'profileVisibleToTeam', checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between py-3">
                <div className="flex-1">
                  <h4 className="font-medium">Activity Visible to Admin</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Administrators can view your activity logs
                  </p>
                </div>
                <Switch
                  checked={privacySettings.visibility.activityVisibleToAdmin}
                  onCheckedChange={(checked) => 
                    handlePrivacySettingChange('visibility', 'activityVisibleToAdmin', checked)
                  }
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PrivacyDashboard;