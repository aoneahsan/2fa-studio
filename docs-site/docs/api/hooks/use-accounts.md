---
sidebar_position: 2
---

# useAccounts

React hook for managing 2FA accounts with real-time sync, encryption, and offline support.

## Overview

The `useAccounts` hook provides comprehensive account management functionality including CRUD operations, filtering, sorting, and automatic encryption/decryption of sensitive data.

```typescript
import { useAccounts } from '@/hooks/useAccounts';
```

## Usage

```typescript
function AccountsManager() {
  const {
    accounts,
    filteredAccounts,
    isLoading,
    error,
    addAccount,
    updateAccount,
    deleteAccount
  } = useAccounts();

  // Display filtered accounts
  return (
    <div>
      {filteredAccounts.map(account => (
        <AccountCard
          key={account.id}
          account={account}
          onEdit={updateAccount}
          onDelete={() => deleteAccount(account.id)}
        />
      ))}
    </div>
  );
}
```

## Return Value

### accounts

**Type:** `OTPAccount[]`

Array of all decrypted 2FA accounts for the current user.

**Example:**
```typescript
const { accounts } = useAccounts();
console.log(`Total accounts: ${accounts.length}`);
```

### filteredAccounts

**Type:** `OTPAccount[]`

Array of accounts after applying search, tag filters, and sorting.

**Example:**
```typescript
const { filteredAccounts } = useAccounts();
// Automatically filtered based on Redux state
```

### isLoading

**Type:** `boolean`

Indicates whether accounts are being loaded or synced.

**Example:**
```typescript
const { isLoading } = useAccounts();
if (isLoading) {
  return <Skeleton count={5} />;
}
```

### error

**Type:** `string | null`

Contains any error messages from account operations.

**Example:**
```typescript
const { error } = useAccounts();
if (error) {
  return <Alert variant="error">{error}</Alert>;
}
```

### addAccount

**Type:** `(account: Omit<OTPAccount, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>`

Adds a new 2FA account with automatic encryption.

**Parameters:**
- `account` - Account data without system-generated fields

**Example:**
```typescript
const { addAccount } = useAccounts();

try {
  await addAccount({
    issuer: 'GitHub',
    label: 'user@example.com',
    secret: 'JBSWY3DPEHPK3PXP',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    type: 'totp',
    tags: ['work', 'development']
  });
  console.log('Account added successfully');
} catch (error) {
  console.error('Failed to add account:', error);
}
```

### updateAccount

**Type:** `(account: OTPAccount) => Promise<void>`

Updates an existing account with re-encryption of the secret.

**Parameters:**
- `account` - Complete account object with updates

**Example:**
```typescript
const { updateAccount } = useAccounts();

const updatedAccount = {
  ...existingAccount,
  label: 'new-email@example.com',
  tags: ['personal']
};

await updateAccount(updatedAccount);
```

### deleteAccount

**Type:** `(accountId: string) => Promise<void>`

Deletes an account permanently.

**Parameters:**
- `accountId` - The ID of the account to delete

**Example:**
```typescript
const { deleteAccount } = useAccounts();

if (confirm('Delete this account?')) {
  await deleteAccount(account.id);
}
```

## Features

### Automatic Encryption

All account secrets are encrypted before storage using the user's encryption key:
```typescript
// Handled automatically by the hook
const encryptedSecret = await EncryptionService.encrypt({
  data: account.secret,
  password: encryptionKey
});
```

### Real-time Sync

Accounts are synchronized in real-time using Firestore listeners:
- Changes are immediately reflected across all devices
- Optimistic updates for better UX
- Conflict resolution handled automatically

### Offline Support

The hook implements offline caching using Capacitor Preferences:
```typescript
// Accounts are cached locally for offline access
await Preferences.set({
  key: 'cached_accounts',
  value: JSON.stringify(decryptedAccounts)
});
```

### Filtering and Sorting

Accounts can be filtered and sorted based on Redux state:
- **Search**: By issuer, label, or tags
- **Tag Filter**: Show only accounts with specific tags
- **Sort Options**: name, issuer, createdAt, lastUsed
- **Sort Order**: ascending or descending

## Complete Example

```typescript
import React, { useState } from 'react';
import { useAccounts } from '@/hooks/useAccounts';
import { OTPService } from '@/services/otp.service';

function AccountsDashboard() {
  const {
    accounts,
    filteredAccounts,
    isLoading,
    error,
    addAccount,
    updateAccount,
    deleteAccount
  } = useAccounts();

  const [showAddModal, setShowAddModal] = useState(false);

  const handleScanQR = async (uri: string) => {
    try {
      // Parse QR code
      const accountData = OTPService.parseURI(uri);
      
      // Add the account
      await addAccount({
        issuer: accountData.issuer || 'Unknown',
        label: accountData.label || 'Unknown',
        secret: accountData.secret!,
        algorithm: accountData.algorithm || 'SHA1',
        digits: accountData.digits || 6,
        period: accountData.period || 30,
        type: accountData.type || 'totp'
      });
      
      setShowAddModal(false);
    } catch (error) {
      alert('Invalid QR code');
    }
  };

  const handleManualAdd = async (formData: any) => {
    try {
      const secret = OTPService.generateSecret();
      
      await addAccount({
        ...formData,
        secret,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      setShowAddModal(false);
    } catch (error) {
      console.error('Failed to add account:', error);
    }
  };

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  return (
    <div className="p-4">
      <header className="mb-6">
        <h1>My 2FA Accounts ({accounts.length})</h1>
        <button onClick={() => setShowAddModal(true)}>
          Add Account
        </button>
      </header>

      <div className="grid gap-4">
        {filteredAccounts.map(account => (
          <AccountCard
            key={account.id}
            account={account}
            onEdit={updateAccount}
            onDelete={() => {
              if (confirm('Delete this account?')) {
                deleteAccount(account.id);
              }
            }}
          />
        ))}
      </div>

      {showAddModal && (
        <AddAccountModal
          onScanQR={handleScanQR}
          onManualAdd={handleManualAdd}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}
```

## State Management

The hook integrates with Redux for state management:
- **accountsSlice**: Stores account data and filter state
- **authSlice**: Provides user and encryption key
- **uiSlice**: Handles toast notifications

## Error Handling

The hook handles various error scenarios:
1. **Network Errors**: Falls back to cached data
2. **Decryption Errors**: Shows error state
3. **Permission Errors**: Handled by Firestore rules
4. **Sync Conflicts**: Last-write-wins resolution

## Performance Considerations

1. **Debounced Search**: Search operations are debounced
2. **Memoized Filtering**: Filter results are memoized
3. **Batch Operations**: Multiple updates are batched
4. **Lazy Decryption**: Secrets decrypted on-demand

## Security Notes

- Secrets are never stored in plain text
- Encryption key is derived from user authentication
- Firestore rules ensure users can only access their own accounts
- Local cache is also encrypted