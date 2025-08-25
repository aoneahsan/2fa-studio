# Test Fixtures Documentation

This directory contains test data fixtures used across the Cypress E2E test suite for the 2FA Studio application.

## Fixture Files

### `test-users.json`
Contains various user profiles for testing different user scenarios:
- **validUser**: Standard test user with valid credentials
- **adminUser**: Administrator user for testing admin features
- **premiumUser**: Premium subscription user
- **freeUser**: Free tier user with limitations
- **weakPassUser**: User with weak password for validation testing
- **socialLoginUser**: User for social authentication testing
- **testBatch**: Array of users for batch operations testing

### `test-accounts.json`
Contains 2FA account test data:
- **validAccounts**: Collection of valid TOTP accounts (Google, GitHub, Microsoft, etc.)
- **hotpAccounts**: HOTP-based accounts (banking, PayPal)
- **steamAccounts**: Steam Guard specific accounts
- **customAccounts**: Accounts with custom parameters (SHA256, 8 digits, etc.)
- **invalidAccounts**: Invalid account data for error testing
- **backupCodes**: Sample backup codes for testing
- **qrCodeUrls**: OTPAuth URLs for QR code testing

### `subscription-plans.json`
Contains subscription and billing test data:
- **plans**: Free, Premium, and Pro plan configurations
- **paymentMethods**: Valid, expired, and declined credit card data
- **coupons**: Discount codes for testing promotion flows

### `backup-data.json`
Contains backup and restore test scenarios:
- **validBackup**: Complete backup with accounts, folders, and settings
- **invalidBackupVersions**: Unsupported backup versions
- **corruptedBackup**: Malformed backup data
- **emptyBackup**: Backup with no accounts
- **legacyFormats**: Aegis, Authy, and Google Authenticator export formats
- **encryptedBackups**: Password-protected backup files

### `browser-extension-data.json`
Contains browser extension testing data:
- **extensionSettings**: Configuration options for extension
- **connectedSites**: Site-to-account mappings
- **shortcuts**: Keyboard shortcuts configuration
- **syncData**: Extension sync status and data
- **notifications**: Extension notification examples
- **contentScriptTargets**: Auto-fill target configurations
- **testPages**: Mock login pages for auto-fill testing
- **permissions**: Required and optional extension permissions

## Usage Examples

```javascript
// Load user data
cy.fixture('test-users').then((users) => {
  const user = users.validUser;
  cy.login(user.email, user.password, user.encryptionPassword);
});

// Load account data
cy.fixture('test-accounts').then((accounts) => {
  accounts.validAccounts.forEach(account => {
    cy.addAccount(account);
  });
});

// Load subscription data
cy.fixture('subscription-plans').then((plans) => {
  const card = plans.paymentMethods.validCard;
  cy.changeSubscription('premium', card);
});
```

## Data Structure Guidelines

### User Objects
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "encryptionPassword": "EncryptionKey123!",
  "encryptionHint": "Descriptive hint",
  "name": "User Name",
  "displayName": "Display Name",
  "subscriptionPlan": "free|premium|pro"
}
```

### Account Objects
```json
{
  "issuer": "Service Name",
  "label": "user@service.com",
  "secret": "BASE32_SECRET_KEY",
  "type": "totp|hotp|steam",
  "algorithm": "SHA1|SHA256|SHA512",
  "digits": 6,
  "period": 30,
  "counter": 0,
  "icon": "service-icon",
  "category": "Email|Development|Finance"
}
```

## Maintenance

- Update test data when adding new features
- Ensure secrets use valid Base32 encoding
- Keep email addresses in test domains (@2fastudio.app, @example.com)
- Use realistic but non-functional credit card numbers
- Maintain data consistency across related fixtures

## Security Notes

- All test data uses fake/mock credentials
- No real secrets or sensitive information should be included
- Test credit cards use Stripe test numbers
- Test users should not exist in production systems