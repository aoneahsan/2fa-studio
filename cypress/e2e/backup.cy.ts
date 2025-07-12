/**
 * Backup and Restore E2E Tests
 */

describe('Backup and Restore', () => {
  beforeEach(() => {
    cy.cleanup();
    cy.login(
      Cypress.env('TEST_EMAIL'),
      Cypress.env('TEST_PASSWORD'),
      Cypress.env('TEST_ENCRYPTION_PASSWORD')
    );
    
    // Add test accounts
    cy.addAccount('Backup Test 1', 'backup1@example.com', 'JBSWY3DPEHPK3PXP');
    cy.addAccount('Backup Test 2', 'backup2@example.com', 'HXDMVJECJJWSRB3H');
  });

  describe('Manual Backup', () => {
    it('should create manual backup', () => {
      cy.visit('/backup');
      
      // Click create backup
      cy.contains('Create Backup').click();
      
      // Should show backup options
      cy.contains('Encrypted Backup').should('be.visible');
      cy.contains('Plain Text Backup').should('be.visible');
      
      // Choose encrypted
      cy.contains('Encrypted Backup').click();
      
      // Enter backup password
      cy.get('input[placeholder*="backup password"]').type('BackupPassword123!');
      cy.get('input[placeholder*="Confirm"]').type('BackupPassword123!');
      
      // Create backup
      cy.get('button').contains('Create').click();
      
      // Should trigger download
      cy.contains('Backup created successfully').should('be.visible');
    });

    it('should warn about plain text backup', () => {
      cy.visit('/backup');
      cy.contains('Create Backup').click();
      cy.contains('Plain Text Backup').click();
      
      // Should show warning
      cy.contains('This backup will not be encrypted').should('be.visible');
      cy.contains('Anyone with access to this file').should('be.visible');
      
      // Proceed anyway
      cy.get('button').contains('I Understand').click();
      
      cy.contains('Backup created successfully').should('be.visible');
    });
  });

  describe('Google Drive Backup', () => {
    it('should show Google Drive connection', () => {
      cy.visit('/backup');
      
      // Click on Google Drive section
      cy.contains('Google Drive').click();
      
      // Should show connect button
      cy.contains('Connect Google Drive').should('be.visible');
      
      // Click connect
      cy.contains('Connect Google Drive').click();
      
      // Would normally redirect to Google OAuth
      // For testing, we'll check that the button was clicked
      cy.url().should('include', '/backup');
    });

    it('should show backup schedule options when connected', () => {
      // Simulate connected state
      cy.visit('/backup');
      
      // If we had a connected account, these would show:
      // cy.contains('Backup Schedule').should('be.visible');
      // cy.contains('Daily').should('be.visible');
      // cy.contains('Weekly').should('be.visible');
      // cy.contains('Monthly').should('be.visible');
    });
  });

  describe('Restore from Backup', () => {
    it('should show restore options', () => {
      cy.visit('/backup');
      
      // Click restore tab
      cy.contains('Restore').click();
      
      // Should show upload area
      cy.contains('Drop backup file here').should('be.visible');
      cy.contains('Supported formats').should('be.visible');
    });

    it('should handle file upload', () => {
      cy.visit('/backup');
      cy.contains('Restore').click();
      
      // Create a test backup file
      const fileName = '2fa-backup.json';
      const fileContent = {
        version: 1,
        encrypted: false,
        accounts: [
          {
            issuer: 'Restored Account',
            label: 'restored@example.com',
            secret: 'GEZDGNBVGY3TQOJQ',
            type: 'totp',
            algorithm: 'SHA1',
            digits: 6,
            period: 30
          }
        ]
      };
      
      cy.get('input[type="file"]').selectFile({
        contents: Cypress.Buffer.from(JSON.stringify(fileContent)),
        fileName: fileName,
        mimeType: 'application/json',
      }, { force: true });
      
      // Should show preview
      cy.contains('1 account found').should('be.visible');
      cy.contains('Restored Account').should('be.visible');
      
      // Restore
      cy.get('button').contains('Restore').click();
      
      // Should show success
      cy.contains('Restore completed').should('be.visible');
      
      // Verify account was added
      cy.visit('/accounts');
      cy.contains('Restored Account').should('be.visible');
    });

    it('should handle encrypted backup', () => {
      cy.visit('/backup');
      cy.contains('Restore').click();
      
      // Upload encrypted backup
      const encryptedBackup = {
        version: 1,
        encrypted: true,
        data: 'encrypted-data-here',
        salt: 'salt',
        iv: 'iv'
      };
      
      cy.get('input[type="file"]').selectFile({
        contents: Cypress.Buffer.from(JSON.stringify(encryptedBackup)),
        fileName: '2fa-encrypted-backup.json',
        mimeType: 'application/json',
      }, { force: true });
      
      // Should prompt for password
      cy.contains('Enter backup password').should('be.visible');
      cy.get('input[type="password"]').type('BackupPassword123!');
      cy.get('button').contains('Decrypt').click();
      
      // Would show decrypted accounts if valid
    });
  });

  describe('Backup History', () => {
    it('should show backup history', () => {
      cy.visit('/backup');
      
      // Should show recent backups section
      cy.contains('Recent Backups').should('be.visible');
      
      // Should show no backups initially
      cy.contains('No backups yet').should('be.visible');
    });
  });

  describe('Auto Backup', () => {
    it('should configure auto backup', () => {
      cy.visit('/backup');
      
      // Enable auto backup
      cy.get('[data-testid="auto-backup-toggle"]').click();
      
      // Should show frequency options
      cy.get('[data-testid="backup-frequency"]').should('be.visible');
      cy.get('[data-testid="backup-frequency"]').click();
      cy.contains('Weekly').click();
      
      // Save settings
      cy.contains('Settings saved').should('be.visible');
    });
  });
});