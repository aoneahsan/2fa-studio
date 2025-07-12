/**
 * Settings E2E Tests
 */

describe('Settings', () => {
  beforeEach(() => {
    cy.cleanup();
    cy.login(
      Cypress.env('TEST_EMAIL'),
      Cypress.env('TEST_PASSWORD'),
      Cypress.env('TEST_ENCRYPTION_PASSWORD')
    );
  });

  describe('General Settings', () => {
    it('should change app theme', () => {
      cy.visit('/settings');
      
      // Click on General tab if not active
      cy.contains('General').click();
      
      // Change theme to dark
      cy.get('[data-testid="theme-select"]').click();
      cy.contains('Dark').click();
      
      // Verify dark theme is applied
      cy.get('html').should('have.class', 'dark');
      
      // Change back to light
      cy.get('[data-testid="theme-select"]').click();
      cy.contains('Light').click();
      
      // Verify light theme
      cy.get('html').should('not.have.class', 'dark');
    });

    it('should toggle show codes on launch', () => {
      cy.visit('/settings');
      
      // Toggle setting
      cy.get('[data-testid="show-codes-toggle"]').click();
      
      // Should show success message
      cy.contains('Settings updated').should('be.visible');
    });
  });

  describe('Security Settings', () => {
    it('should enable biometric authentication', () => {
      cy.visit('/settings');
      cy.contains('Security').click();
      
      // Enable biometric
      cy.get('[data-testid="biometric-toggle"]').click();
      
      // Should show biometric setup prompt
      cy.contains('Set up biometric authentication').should('be.visible');
    });

    it('should change auto-lock timeout', () => {
      cy.visit('/settings');
      cy.contains('Security').click();
      
      // Change auto-lock timeout
      cy.get('[data-testid="autolock-select"]').click();
      cy.contains('5 minutes').click();
      
      cy.contains('Settings updated').should('be.visible');
    });

    it('should change encryption password', () => {
      cy.visit('/settings');
      cy.contains('Security').click();
      
      // Click change encryption password
      cy.contains('Change Encryption Password').click();
      
      // Fill form
      cy.get('input[name="currentPassword"]').type(Cypress.env('TEST_ENCRYPTION_PASSWORD'));
      cy.get('input[name="newPassword"]').type('NewEncryption123!');
      cy.get('input[name="confirmPassword"]').type('NewEncryption123!');
      
      cy.get('button').contains('Change Password').click();
      
      // Should show success and re-encrypt accounts
      cy.contains('Encryption password changed successfully').should('be.visible');
    });
  });

  describe('Import/Export', () => {
    it('should export accounts', () => {
      // Add some accounts first
      cy.visit('/accounts');
      cy.addAccount('Export Test 1', 'test1@example.com', 'JBSWY3DPEHPK3PXP');
      cy.addAccount('Export Test 2', 'test2@example.com', 'HXDMVJECJJWSRB3H');
      
      // Go to settings
      cy.visit('/settings');
      cy.contains('Import/Export').click();
      
      // Click export
      cy.contains('Export Accounts').click();
      
      // Select format
      cy.get('[data-testid="export-format"]').click();
      cy.contains('2FAS (Encrypted)').click();
      
      // Enter password
      cy.get('input[type="password"]').type('ExportPassword123!');
      
      // Export
      cy.get('button').contains('Export').click();
      
      // Should trigger download
      cy.contains('Export completed').should('be.visible');
    });

    it('should show import options', () => {
      cy.visit('/settings');
      cy.contains('Import/Export').click();
      
      cy.contains('Import Accounts').click();
      
      // Should show supported formats
      cy.contains('2FAS').should('be.visible');
      cy.contains('Google Authenticator').should('be.visible');
      cy.contains('Aegis').should('be.visible');
      cy.contains('Authy').should('be.visible');
    });
  });

  describe('Subscription', () => {
    it('should show current subscription status', () => {
      cy.visit('/settings');
      cy.contains('Subscription').click();
      
      // Should show free tier by default
      cy.contains('Free Plan').should('be.visible');
      cy.contains('10 accounts').should('be.visible');
      
      // Should show upgrade options
      cy.contains('Premium').should('be.visible');
      cy.contains('Unlimited accounts').should('be.visible');
    });

    it('should show upgrade modal', () => {
      cy.visit('/settings');
      cy.contains('Subscription').click();
      
      // Click upgrade
      cy.contains('Upgrade to Premium').click();
      
      // Should show payment options
      cy.contains('Monthly').should('be.visible');
      cy.contains('Yearly').should('be.visible');
      
      // Close modal
      cy.get('[data-testid="close-modal"]').click();
    });
  });

  describe('Account Settings', () => {
    it('should update profile information', () => {
      cy.visit('/settings');
      cy.contains('Account').click();
      
      // Update display name
      cy.get('input[name="displayName"]').clear().type('John Doe');
      
      cy.get('button').contains('Save Changes').click();
      
      cy.contains('Profile updated').should('be.visible');
    });

    it('should manage connected devices', () => {
      cy.visit('/settings');
      cy.contains('Account').click();
      
      // Should show current device
      cy.contains('Current Device').should('be.visible');
      
      // Should show device info
      cy.get('[data-testid="device-list"]').within(() => {
        cy.contains('Chrome').should('be.visible');
        cy.contains('Active now').should('be.visible');
      });
    });

    it('should handle account deletion', () => {
      cy.visit('/settings');
      cy.contains('Account').click();
      
      // Scroll to danger zone
      cy.contains('Delete Account').scrollIntoView();
      cy.contains('Delete Account').click();
      
      // Should show confirmation
      cy.contains('This action cannot be undone').should('be.visible');
      
      // Cancel for test
      cy.get('button').contains('Cancel').click();
    });
  });
});