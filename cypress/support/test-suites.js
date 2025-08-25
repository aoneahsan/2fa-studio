/**
 * Test Suite Configurations for 2FA Studio
 * Defines different test suites for various testing scenarios
 */

const testSuites = {
  // Smoke tests - Quick validation of critical functionality
  smoke: [
    'cypress/e2e/comprehensive-auth.cy.ts',
    'cypress/e2e/comprehensive-account-management.cy.ts'
  ],

  // Core functionality tests
  core: [
    'cypress/e2e/comprehensive-auth.cy.ts',
    'cypress/e2e/comprehensive-account-management.cy.ts',
    'cypress/e2e/comprehensive-totp-verification.cy.ts'
  ],

  // Full feature tests
  features: [
    'cypress/e2e/comprehensive-auth.cy.ts',
    'cypress/e2e/comprehensive-account-management.cy.ts',
    'cypress/e2e/comprehensive-totp-verification.cy.ts',
    'cypress/e2e/comprehensive-backup-restore.cy.ts',
    'cypress/e2e/comprehensive-subscription.cy.ts',
    'cypress/e2e/comprehensive-settings.cy.ts'
  ],

  // Integration tests
  integration: [
    'cypress/e2e/comprehensive-browser-extension.cy.ts',
    'cypress/e2e/comprehensive-mobile-native.cy.ts'
  ],

  // Security and quality tests
  security: [
    'cypress/e2e/comprehensive-security-error-handling.cy.ts'
  ],

  // Performance and accessibility tests
  quality: [
    'cypress/e2e/comprehensive-performance-accessibility.cy.ts'
  ],

  // All tests
  all: [
    'cypress/e2e/comprehensive-auth.cy.ts',
    'cypress/e2e/comprehensive-account-management.cy.ts',
    'cypress/e2e/comprehensive-totp-verification.cy.ts',
    'cypress/e2e/comprehensive-backup-restore.cy.ts',
    'cypress/e2e/comprehensive-subscription.cy.ts',
    'cypress/e2e/comprehensive-settings.cy.ts',
    'cypress/e2e/comprehensive-browser-extension.cy.ts',
    'cypress/e2e/comprehensive-mobile-native.cy.ts',
    'cypress/e2e/comprehensive-security-error-handling.cy.ts',
    'cypress/e2e/comprehensive-performance-accessibility.cy.ts'
  ],

  // Critical path tests for production deployment
  critical: [
    'cypress/e2e/comprehensive-auth.cy.ts',
    'cypress/e2e/comprehensive-totp-verification.cy.ts',
    'cypress/e2e/comprehensive-security-error-handling.cy.ts'
  ],

  // Regression tests for specific areas
  regression: {
    auth: ['cypress/e2e/comprehensive-auth.cy.ts'],
    accounts: ['cypress/e2e/comprehensive-account-management.cy.ts'],
    backup: ['cypress/e2e/comprehensive-backup-restore.cy.ts'],
    subscription: ['cypress/e2e/comprehensive-subscription.cy.ts'],
    security: ['cypress/e2e/comprehensive-security-error-handling.cy.ts']
  }
};

// Export test suite configurations
module.exports = testSuites;

// CLI usage examples:
/*
# Run smoke tests
npx cypress run --spec "$(node -e "console.log(require('./cypress/support/test-suites').smoke.join(','))")"

# Run core functionality tests
npx cypress run --spec "$(node -e "console.log(require('./cypress/support/test-suites').core.join(','))")"

# Run all tests
npx cypress run --spec "$(node -e "console.log(require('./cypress/support/test-suites').all.join(','))")"

# Run security regression tests
npx cypress run --spec "$(node -e "console.log(require('./cypress/support/test-suites').regression.security.join(','))")"
*/