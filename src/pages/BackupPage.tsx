/**
 * Backup page component
 * @module pages/BackupPage
 */

import React from 'react';

/**
 * Page for backup and restore functionality
 */
const BackupPage: React.FC = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Backup & Restore</h1>
      <p className="text-muted-foreground mt-2">Manage your data backups</p>
    </div>
  );
};

export default BackupPage;