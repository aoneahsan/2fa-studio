---
sidebar_position: 1
---

# AccountCard

Component for displaying a single 2FA account with real-time OTP code generation and management actions.

## Overview

The `AccountCard` component renders an individual 2FA account, automatically generating and updating OTP codes, providing copy functionality, and offering edit/delete actions.

```typescript
import { AccountCard } from '@/components/accounts/AccountCard';
```

## Props

### account

**Type:** `OTPAccount`  
**Required:** Yes

The 2FA account data to display.

```typescript
interface OTPAccount {
  id: string;
  issuer: string;
  label: string;
  secret: string;
  algorithm: 'SHA1' | 'SHA256' | 'SHA512';
  digits: number;
  period: number;
  type: 'totp' | 'hotp';
  counter?: number;
  iconUrl?: string;
  tags?: string[];
  // ... other fields
}
```

### onEdit

**Type:** `(account: OTPAccount) => void`  
**Required:** Yes

Callback function triggered when the edit button is clicked.

### onDelete

**Type:** `(account: OTPAccount) => void`  
**Required:** Yes

Callback function triggered when the delete button is clicked.

## Usage

```typescript
function AccountsList() {
  const handleEdit = (account: OTPAccount) => {
    // Open edit modal
    setEditingAccount(account);
    setShowEditModal(true);
  };

  const handleDelete = (account: OTPAccount) => {
    if (confirm(`Delete ${account.issuer}?`)) {
      deleteAccount(account.id);
    }
  };

  return (
    <div>
      {accounts.map(account => (
        <AccountCard
          key={account.id}
          account={account}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}
```

## Features

### Automatic Code Generation

For TOTP accounts:
- Generates new codes every second
- Shows remaining time until code expires
- Displays progress bar indicating time left

For HOTP accounts:
- Shows current counter value
- Provides button to generate next code
- Updates counter after generation

### Code Display

```typescript
// Codes are formatted for readability
"123456" → "123 456"
"12345678" → "1234 5678"
```

### Copy to Clipboard

- Click the code to copy it
- Visual feedback when copied
- Toast notification confirms copy
- Handles clipboard API errors gracefully

### Account Icons

- Displays custom icon if provided
- Falls back to favicon service
- Shows first letter if icon fails to load

### Tags Display

- Shows all tags as colored badges
- Useful for categorizing accounts

## Component Structure

```jsx
<div className="account-card">
  <div className="account-header">
    {/* Icon */}
    <div className="account-icon">
      <img src={iconUrl} /> or <div>G</div>
    </div>
    
    {/* Account Info */}
    <div className="account-info">
      <h3>GitHub</h3>
      <p>user@example.com</p>
      <div className="tags">
        <span>work</span>
        <span>development</span>
      </div>
    </div>
    
    {/* Actions */}
    <div className="actions">
      <button onClick={onEdit}>Edit</button>
      <button onClick={onDelete}>Delete</button>
    </div>
  </div>
  
  {/* OTP Code */}
  <div className="otp-section">
    <button className="otp-code" onClick={copyCode}>
      <span>123 456</span>
      <ClipboardIcon />
    </button>
    
    {/* Timer or Counter */}
    <div className="timer">
      <CircularProgress value={50} />
      <span>15</span>
    </div>
  </div>
  
  {/* Progress Bar (TOTP only) */}
  <div className="progress-bar">
    <div style={{ width: '50%' }} />
  </div>
</div>
```

## State Management

The component manages several internal states:

```typescript
const [otpCode, setOtpCode] = useState('');
const [remainingTime, setRemainingTime] = useState(0);
const [progress, setProgress] = useState(0);
const [isCopying, setIsCopying] = useState(false);
```

## Lifecycle

1. **Mount**: Generates initial code
2. **Update**: Sets up interval for TOTP updates
3. **Unmount**: Clears update interval

## Error Handling

- **Code Generation Errors**: Displays "ERROR" instead of code
- **Icon Loading Errors**: Falls back to letter avatar
- **Copy Errors**: Shows error toast

## Styling

The component uses Tailwind CSS classes with semantic naming:
- `bg-card` - Card background
- `text-foreground` - Primary text color
- `text-muted-foreground` - Secondary text
- `bg-primary/10` - Tag background
- `hover:bg-muted` - Hover states

## Accessibility

- Buttons have descriptive `title` attributes
- Semantic HTML structure
- Keyboard navigation support
- Screen reader friendly

## Testing

Key test scenarios:
- TOTP code updates every second
- HOTP counter increments correctly
- Copy to clipboard functionality
- Error states display properly

```typescript
// Example test
it('should update TOTP code every second', async () => {
  const account = createMockTOTPAccount();
  render(<AccountCard account={account} onEdit={jest.fn()} onDelete={jest.fn()} />);
  
  const initialCode = screen.getByTestId('totp-code').textContent;
  
  // Wait for code to change
  await waitFor(() => {
    const newCode = screen.getByTestId('totp-code').textContent;
    expect(newCode).not.toBe(initialCode);
  }, { timeout: 31000 }); // Wait for period + 1 second
});
```

## Performance Considerations

- Uses `useCallback` for memoized functions
- Intervals cleared on unmount to prevent memory leaks
- Efficient re-renders using React.memo (if needed)

## Related Components

- [QRScanner](./qr-scanner.md) - For importing new accounts
- [OTPService](../services/otp-service.md) - Service used for code generation