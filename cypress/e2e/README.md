# E2E Test Suite Documentation

This directory contains comprehensive end-to-end tests for the 2FA Studio application using Cypress.

## Test Files Overview

### Core Functionality Tests

#### `comprehensive-auth.cy.ts`
Tests all authentication flows including:
- User registration with validation
- Login/logout with encryption password
- Social authentication (Google, GitHub, Apple)
- Password reset and account recovery
- Session management and timeouts
- Device management and verification
- Account lockout protection
- Two-factor authentication setup

#### `comprehensive-account-management.cy.ts`
Tests account management features:
- Adding accounts (TOTP, HOTP, Steam)
- Manual entry and QR code scanning
- Account editing and deletion
- Organization (folders, tags, categories)
- Search and filtering
- Bulk operations
- Import/export functionality
- Account details and history

#### `comprehensive-totp-verification.cy.ts`
Tests OTP code generation and verification:
- TOTP code generation (6, 8 digits)
- HOTP counter increments
- Steam Guard 5-character codes
- Code copying and sharing
- Time synchronization
- Backup codes management
- Code security features
- Performance optimization

### Advanced Feature Tests

#### `comprehensive-backup-restore.cy.ts`
Tests backup and restore functionality:
- Local encrypted backups
- Google Drive cloud backups
- Automatic backup scheduling
- Backup restoration with conflict resolution
- Legacy format migration (Aegis, Authy)
- Backup security and compliance
- Storage management

#### `comprehensive-subscription.cy.ts`
Tests subscription and billing:
- Plan comparison and selection
- Payment processing
- Upgrade/downgrade flows
- Billing history and invoices
- Team and enterprise features
- Coupon codes and promotions
- Subscription analytics
- Cancellation and reactivation

#### `comprehensive-settings.cy.ts`
Tests application settings:
- Security settings (auto-lock, biometric)
- Appearance customization
- Notification preferences
- Language and localization
- Import/export preferences
- Keyboard shortcuts
- Advanced configuration
- Settings search and navigation

### Integration Tests

#### `comprehensive-browser-extension.cy.ts`
Tests browser extension integration:
- Extension installation and setup
- Auto-fill functionality
- Context menu integration
- Sync and communication
- Security features
- Troubleshooting and diagnostics
- Analytics and usage tracking

#### `comprehensive-mobile-native.cy.ts`
Tests mobile app native features:
- Biometric authentication
- Camera and QR code scanning
- Push notifications
- Device lifecycle events
- Mobile gestures and UX
- Performance optimization
- Platform-specific features

### Quality Assurance Tests

#### `comprehensive-security-error-handling.cy.ts`
Tests security and error scenarios:
- Input validation and sanitization
- XSS and injection prevention
- Authentication security
- Data encryption protection
- Network error handling
- Edge cases and data validation
- Error recovery and resilience
- Security monitoring

#### `comprehensive-performance-accessibility.cy.ts`
Tests performance and accessibility:
- Load time optimization
- Large dataset handling
- Memory usage efficiency
- Bundle size optimization
- Accessibility compliance (WCAG 2.1)
- Keyboard navigation
- Screen reader support
- User experience patterns

## Test Structure

### Test Organization
Each test file follows a consistent structure:
```javascript
describe('Feature Category', () => {
  beforeEach(() => {
    cy.cleanup();
    cy.setupEmulator();
    cy.setupTestUser('premium');
  });

  describe('Sub-feature', () => {
    it('should perform specific action', () => {
      // Test implementation
    });
  });
});
```

### Custom Commands
Tests use enhanced custom commands from `cypress/support/commands.ts`:
- `cy.login(email, password, encryptionPassword)`
- `cy.register(userData)`
- `cy.addAccount(accountData)`
- `cy.setupTestUser(subscription)`
- `cy.mockBiometric(success)`
- `cy.waitForElement(selector, options)`

### Test Data
Tests use fixtures from `cypress/fixtures/`:
- User profiles and credentials
- 2FA account configurations
- Subscription plans and payments
- Backup data and scenarios
- Browser extension configurations

## Running Tests

### Command Line
```bash
# Run all tests headlessly
npx cypress run

# Run specific test file
npx cypress run --spec "cypress/e2e/comprehensive-auth.cy.ts"

# Run tests with specific browser
npx cypress run --browser chrome

# Run tests in interactive mode
npx cypress open
```

### Test Categories
```bash
# Core functionality
npx cypress run --spec "cypress/e2e/comprehensive-auth.cy.ts,cypress/e2e/comprehensive-account-management.cy.ts"

# Security and performance
npx cypress run --spec "cypress/e2e/comprehensive-security-error-handling.cy.ts,cypress/e2e/comprehensive-performance-accessibility.cy.ts"

# Integration tests
npx cypress run --spec "cypress/e2e/comprehensive-browser-extension.cy.ts,cypress/e2e/comprehensive-mobile-native.cy.ts"
```

## Test Environment Setup

### Prerequisites
1. Firebase emulators running (Auth, Firestore, Functions)
2. Test database seeded with initial data
3. Mock services configured
4. Environment variables set

### Configuration
Tests are configured in `cypress.config.js`:
- Base URL: `http://localhost:5173`
- Viewport: 1280x720
- Timeouts and retries configured
- Test user credentials in env variables

### Mocking
Tests extensively use mocking for:
- Native device features (biometric, camera)
- External APIs (payment, sync)
- Browser extension APIs
- Network conditions
- Error scenarios

## Best Practices

### Test Design
- Tests are independent and can run in any order
- Each test cleans up after itself
- Tests use realistic data and scenarios
- Error cases are thoroughly tested

### Assertions
- Use semantic assertions (`should('be.visible')`)
- Test user experience, not implementation details
- Verify accessibility and usability
- Check performance characteristics

### Maintenance
- Update tests when features change
- Keep test data current and realistic
- Monitor test execution times
- Review and refactor regularly

## Continuous Integration

Tests are designed to run in CI/CD pipelines:
- Deterministic and reliable
- Proper wait strategies
- Screenshot and video capture on failures
- Parallel execution support
- Integration with reporting tools

## Troubleshooting

### Common Issues
1. **Timing Issues**: Use `cy.waitForElement()` instead of fixed waits
2. **Flaky Tests**: Check for proper cleanup and state isolation
3. **Network Dependencies**: Ensure proper mocking of external services
4. **Browser Compatibility**: Test across multiple browsers

### Debugging
- Use `cy.debug()` to pause execution
- Enable video recording for failed tests
- Check console logs and network requests
- Use interactive mode for development

## Coverage Goals

The test suite aims for:
- 90%+ functional coverage
- All critical user paths tested
- Error scenarios covered
- Accessibility compliance verified
- Performance benchmarks validated
- Security vulnerabilities checked