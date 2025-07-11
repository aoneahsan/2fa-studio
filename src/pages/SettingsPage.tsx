/**
 * Settings page component
 * @module pages/SettingsPage
 */

import React from 'react';

/**
 * Page for app settings
 */
const SettingsPage: React.FC = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Settings</h1>
      <p className="text-muted-foreground mt-2">Configure your app preferences</p>
    </div>
  );
};

export default SettingsPage;