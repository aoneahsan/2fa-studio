/**
 * Accounts page component
 * @module pages/AccountsPage
 */

import React from 'react';

/**
 * Page for managing 2FA accounts
 */
const AccountsPage: React.FC = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Accounts</h1>
      <p className="text-muted-foreground mt-2">Manage your 2FA accounts</p>
    </div>
  );
};

export default AccountsPage;