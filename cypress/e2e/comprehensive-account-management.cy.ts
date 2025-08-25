/**
 * Comprehensive Account Management E2E Tests
 * Tests all account management functionality including add, edit, delete, organize, import/export
 */

describe('Comprehensive Account Management Tests', () => {
  beforeEach(() => {
    cy.cleanup();
    cy.setupEmulator();
    cy.setupTestUser('premium'); // Use premium user for full features
  });

  describe('Add Accounts', () => {
    it('should add TOTP account manually', () => {
      cy.fixture('test-accounts').then((accounts) => {
        const account = accounts.validAccounts[0]; // Google account
        
        cy.visit('/accounts');
        cy.addAccount(account);
        
        // Verify account appears in list
        cy.get('[data-cy="account-card"], [data-testid="account-card"]')
          .should('contain', account.issuer)
          .and('contain', account.label);
        
        // Verify TOTP code is generated
        cy.verifyTOTPCode(account.issuer);
      });
    });

    it('should add HOTP account manually', () => {
      cy.fixture('test-accounts').then((accounts) => {
        const account = accounts.hotpAccounts[0]; // Bank account
        
        cy.visit('/accounts');
        cy.addAccount(account);
        
        // Verify account appears in list
        cy.get('[data-cy="account-card"]')
          .should('contain', account.issuer)
          .and('contain', account.label);
        
        // Verify HOTP counter is displayed
        cy.get('[data-cy="account-card"]')
          .contains(account.issuer)
          .parents('[data-cy="account-card"]')
          .should('contain', 'Counter:');
      });
    });

    it('should add Steam account', () => {
      cy.fixture('test-accounts').then((accounts) => {
        const account = accounts.steamAccounts[0];
        
        cy.visit('/accounts');
        cy.addAccount(account);
        
        // Verify Steam account with 5-digit code
        cy.get('[data-cy="account-card"]')
          .contains(account.issuer)
          .parents('[data-cy="account-card"]')
          .within(() => {
            cy.get('[data-cy="account-code"]')
              .invoke('text')
              .should('match', /^\d{5}$/);
          });
      });
    });

    it('should add account via QR code', () => {
      cy.fixture('test-accounts').then((accounts) => {
        const qrUrl = accounts.qrCodeUrls[0];
        
        cy.visit('/accounts');
        cy.addAccountViaQR(qrUrl);
        
        // Verify account was added from QR code
        cy.get('[data-cy="account-card"]')
          .should('contain', 'Google')
          .and('contain', 'test@gmail.com');
      });
    });

    it('should handle invalid account data', () => {
      cy.fixture('test-accounts').then((accounts) => {
        const invalidAccount = accounts.invalidAccounts[0]; // Empty issuer
        
        cy.visit('/accounts');
        cy.get('button[data-cy="add-account-btn"]').click();
        cy.get('[data-cy="manual-entry-tab"]').click();
        
        // Try to add invalid account
        cy.get('input[data-cy="account-label"]').type(invalidAccount.label);
        cy.get('input[data-cy="account-secret"]').type(invalidAccount.secret);
        cy.get('button[data-cy="save-account-btn"]').click();
        
        // Should show validation error
        cy.contains('Issuer is required', { matchCase: false }).should('be.visible');
      });
    });

    it('should prevent duplicate accounts', () => {
      cy.fixture('test-accounts').then((accounts) => {
        const account = accounts.validAccounts[0];
        
        cy.visit('/accounts');
        
        // Add account first time
        cy.addAccount(account);
        
        // Try to add same account again
        cy.get('button[data-cy="add-account-btn"]').click();
        cy.get('[data-cy="manual-entry-tab"]').click();
        cy.get('input[data-cy="account-issuer"]').type(account.issuer);
        cy.get('input[data-cy="account-label"]').type(account.label);
        cy.get('input[data-cy="account-secret"]').type(account.secret);
        cy.get('button[data-cy="save-account-btn"]').click();
        
        // Should show duplicate error
        cy.contains('Account already exists', { matchCase: false }).should('be.visible');
      });
    });

    it('should validate Base32 secret format', () => {
      cy.fixture('test-accounts').then((accounts) => {
        const invalidSecret = accounts.invalidAccounts[1]; // Invalid Base32
        
        cy.visit('/accounts');
        cy.get('button[data-cy="add-account-btn"]').click();
        cy.get('[data-cy="manual-entry-tab"]').click();
        
        cy.get('input[data-cy="account-issuer"]').type(invalidSecret.issuer);
        cy.get('input[data-cy="account-label"]').type(invalidSecret.label);
        cy.get('input[data-cy="account-secret"]').type(invalidSecret.secret);
        cy.get('button[data-cy="save-account-btn"]').click();
        
        cy.contains('Invalid Base32 secret', { matchCase: false }).should('be.visible');
      });
    });
  });

  describe('Edit Accounts', () => {
    beforeEach(() => {
      cy.fixture('test-accounts').then((accounts) => {
        // Add a test account first
        cy.visit('/accounts');
        cy.addAccount(accounts.validAccounts[0]);
      });
    });

    it('should edit account issuer and label', () => {
      const newIssuer = 'Updated Google';
      const newLabel = 'updated.user@gmail.com';
      
      cy.editAccount('Google', {
        issuer: newIssuer,
        label: newLabel
      });
      
      // Verify changes are reflected
      cy.get('[data-cy="account-card"]')
        .should('contain', newIssuer)
        .and('contain', newLabel);
    });

    it('should change account icon', () => {
      cy.editAccount('Google', {
        icon: 'microsoft'
      });
      
      // Verify icon change
      cy.get('[data-cy="account-card"]')
        .contains('Google')
        .parents('[data-cy="account-card"]')
        .find('img, [data-cy="account-icon"]')
        .should('have.attr', 'src')
        .and('include', 'microsoft');
    });

    it('should organize account into category', () => {
      cy.editAccount('Google', {
        category: 'Work'
      });
      
      // Verify category is set
      cy.get('[data-cy="account-card"]')
        .contains('Google')
        .parents('[data-cy="account-card"]')
        .should('contain', 'Work');
    });

    it('should validate edited data', () => {
      cy.get('[data-cy="account-card"]')
        .contains('Google')
        .parents('[data-cy="account-card"]')
        .find('button[data-cy="edit-account"]')
        .click();
      
      // Clear issuer (make it invalid)
      cy.get('input[name="issuer"]').clear();
      cy.get('button[data-cy="save-changes"]').click();
      
      cy.contains('Issuer is required', { matchCase: false }).should('be.visible');
    });
  });

  describe('Delete Accounts', () => {
    beforeEach(() => {
      cy.fixture('test-accounts').then((accounts) => {
        // Add multiple test accounts
        cy.visit('/accounts');
        accounts.validAccounts.slice(0, 3).forEach(account => {
          cy.addAccount(account);
        });
      });
    });

    it('should delete single account with confirmation', () => {
      cy.deleteAccount('Google');
      
      // Verify account is removed
      cy.get('[data-cy="account-card"]')
        .should('not.contain', 'Google');
      
      // Verify other accounts remain
      cy.get('[data-cy="account-card"]')
        .should('contain', 'GitHub')
        .and('contain', 'Microsoft');
    });

    it('should cancel delete operation', () => {
      cy.get('[data-cy="account-card"]')
        .contains('Google')
        .parents('[data-cy="account-card"]')
        .find('button[data-cy="delete-account"]')
        .click();
      
      // Cancel deletion
      cy.get('button:contains("Cancel"), button:contains("No")').click();
      
      // Account should still exist
      cy.get('[data-cy="account-card"]').should('contain', 'Google');
    });

    it('should delete multiple accounts', () => {
      // Enable selection mode
      cy.get('button[data-cy="select-multiple"], button:contains("Select")').click();
      
      // Select multiple accounts
      cy.get('[data-cy="account-card"]')
        .contains('Google')
        .parents('[data-cy="account-card"]')
        .find('input[type="checkbox"]')
        .check();
      
      cy.get('[data-cy="account-card"]')
        .contains('GitHub')
        .parents('[data-cy="account-card"]')
        .find('input[type="checkbox"]')
        .check();
      
      // Delete selected accounts
      cy.get('button[data-cy="delete-selected"], button:contains("Delete Selected")').click();
      cy.get('button:contains("Confirm"), button:contains("Yes")').click();
      
      // Verify accounts are removed
      cy.get('[data-cy="account-card"]')
        .should('not.contain', 'Google')
        .and('not.contain', 'GitHub')
        .and('contain', 'Microsoft'); // Should remain
    });
  });

  describe('Account Organization', () => {
    beforeEach(() => {
      cy.fixture('test-accounts').then((accounts) => {
        cy.visit('/accounts');
        // Add accounts with different categories
        accounts.validAccounts.forEach(account => {
          cy.addAccount(account);
        });
      });
    });

    it('should create and manage folders', () => {
      cy.visit('/accounts');
      
      // Create new folder
      cy.get('button[data-cy="create-folder"], button:contains("New Folder")').click();
      cy.get('input[data-cy="folder-name"]').type('Work Accounts');
      cy.get('input[data-cy="folder-color"]').click();
      cy.get('.color-picker').find('[data-color="#3B82F6"]').click(); // Blue
      cy.get('button[data-cy="save-folder"]').click();
      
      // Verify folder is created
      cy.get('[data-cy="folder-list"]').should('contain', 'Work Accounts');
      
      // Move account to folder
      cy.get('[data-cy="account-card"]')
        .contains('Google')
        .parents('[data-cy="account-card"]')
        .find('button[data-cy="move-to-folder"]')
        .click();
      
      cy.get('select[data-cy="folder-select"]').select('Work Accounts');
      cy.get('button[data-cy="move-confirm"]').click();
      
      // Filter by folder
      cy.get('[data-cy="folder-list"]').contains('Work Accounts').click();
      cy.get('[data-cy="account-card"]').should('contain', 'Google');
    });

    it('should add and filter by tags', () => {
      // Add tag to account
      cy.get('[data-cy="account-card"]')
        .contains('Google')
        .parents('[data-cy="account-card"]')
        .find('button[data-cy="add-tag"]')
        .click();
      
      cy.get('input[data-cy="tag-input"]').type('important');
      cy.get('button[data-cy="create-tag"]').click();
      
      // Verify tag is added
      cy.get('[data-cy="account-card"]')
        .contains('Google')
        .parents('[data-cy="account-card"]')
        .should('contain', 'important');
      
      // Filter by tag
      cy.get('[data-cy="tag-filter"]').click();
      cy.get('[data-cy="tag-list"]').contains('important').click();
      
      cy.get('[data-cy="account-card"]').should('have.length', 1);
      cy.get('[data-cy="account-card"]').should('contain', 'Google');
    });

    it('should sort accounts by different criteria', () => {
      // Sort by name
      cy.get('select[data-cy="sort-by"], button[data-cy="sort-menu"]').click();
      cy.get('[data-cy="sort-name"], option[value="name"]').click();
      
      // Verify alphabetical order
      cy.get('[data-cy="account-card"]').then($cards => {
        const issuers = Array.from($cards).map(card => 
          Cypress.$(card).find('.issuer-text, [data-cy="account-issuer"]').text()
        );
        const sortedIssuers = [...issuers].sort();
        expect(issuers).to.deep.equal(sortedIssuers);
      });
      
      // Sort by recently used
      cy.get('select[data-cy="sort-by"], button[data-cy="sort-menu"]').click();
      cy.get('[data-cy="sort-recent"], option[value="recent"]').click();
      
      // Sort by creation date
      cy.get('select[data-cy="sort-by"], button[data-cy="sort-menu"]').click();
      cy.get('[data-cy="sort-created"], option[value="created"]').click();
    });

    it('should search accounts', () => {
      // Search by issuer
      cy.get('input[data-cy="search-input"], input[placeholder*="search" i]')
        .type('Google');
      
      cy.get('[data-cy="account-card"]').should('have.length', 1);
      cy.get('[data-cy="account-card"]').should('contain', 'Google');
      
      // Search by label
      cy.get('input[data-cy="search-input"]').clear().type('github');
      
      cy.get('[data-cy="account-card"]').should('have.length', 1);
      cy.get('[data-cy="account-card"]').should('contain', 'GitHub');
      
      // Clear search
      cy.get('button[data-cy="clear-search"], [data-cy="search-clear"]').click();
      cy.get('[data-cy="account-card"]').should('have.length.at.least', 3);
    });

    it('should use advanced search filters', () => {
      cy.get('button[data-cy="advanced-search"], button:contains("Advanced Search")').click();
      
      // Filter by account type
      cy.get('select[data-cy="filter-type"]').select('TOTP');
      cy.get('button[data-cy="apply-filters"]').click();
      
      // Should only show TOTP accounts
      cy.get('[data-cy="account-card"]').each($card => {
        cy.wrap($card).should('not.contain', 'HOTP');
      });
      
      // Filter by algorithm
      cy.get('select[data-cy="filter-algorithm"]').select('SHA1');
      cy.get('button[data-cy="apply-filters"]').click();
      
      // Add date range filter
      cy.get('input[data-cy="date-from"]').type('2024-01-01');
      cy.get('input[data-cy="date-to"]').type('2024-12-31');
      cy.get('button[data-cy="apply-filters"]').click();
    });
  });

  describe('Import/Export Accounts', () => {
    beforeEach(() => {
      cy.fixture('test-accounts').then((accounts) => {
        cy.visit('/accounts');
        // Add some test accounts first
        accounts.validAccounts.slice(0, 3).forEach(account => {
          cy.addAccount(account);
        });
      });
    });

    it('should export accounts to JSON', () => {
      cy.visit('/settings/import-export');
      
      // Export accounts
      cy.get('button[data-cy="export-accounts"], button:contains("Export")').click();
      
      // Select export format
      cy.get('select[data-cy="export-format"]').select('json');
      
      // Set encryption password
      cy.get('input[data-cy="export-password"]').type('ExportPassword123!');
      cy.get('input[data-cy="confirm-export-password"]').type('ExportPassword123!');
      
      cy.get('button[data-cy="start-export"]').click();
      
      // Should download file
      cy.get('[data-cy="download-link"], a[download]').should('be.visible');
      cy.contains('Export completed', { matchCase: false }).should('be.visible');
    });

    it('should import accounts from JSON', () => {
      cy.fixture('backup-data').then((backupData) => {
        cy.visit('/settings/import-export');
        
        // Upload backup file
        const fileName = 'test-import.json';
        cy.get('input[type="file"], input[data-cy="import-file"]').selectFile({
          contents: JSON.stringify(backupData.validBackup),
          fileName,
          mimeType: 'application/json'
        });
        
        // Enter decryption password
        cy.get('input[data-cy="import-password"]').type('ExportPassword123!');
        
        cy.get('button[data-cy="start-import"]').click();
        
        cy.contains('Import completed', { matchCase: false }).should('be.visible');
        
        // Verify imported accounts appear
        cy.visit('/accounts');
        cy.get('[data-cy="account-card"]').should('contain', 'Google');
        cy.get('[data-cy="account-card"]').should('contain', 'GitHub');
      });
    });

    it('should import from Aegis Authenticator', () => {
      cy.fixture('backup-data').then((backupData) => {
        cy.visit('/settings/import-export');
        
        cy.get('select[data-cy="import-format"]').select('aegis');
        
        cy.get('input[type="file"]').selectFile({
          contents: JSON.stringify(backupData.legacyFormats.aegisBackup),
          fileName: 'aegis-backup.json',
          mimeType: 'application/json'
        });
        
        cy.get('button[data-cy="start-import"]').click();
        
        cy.contains('Import completed', { matchCase: false }).should('be.visible');
        
        // Check imported account
        cy.visit('/accounts');
        cy.get('[data-cy="account-card"]').should('contain', 'Legacy Service');
      });
    });

    it('should import from Authy', () => {
      cy.fixture('backup-data').then((backupData) => {
        cy.visit('/settings/import-export');
        
        cy.get('select[data-cy="import-format"]').select('authy');
        
        cy.get('input[type="file"]').selectFile({
          contents: JSON.stringify(backupData.legacyFormats.authyBackup),
          fileName: 'authy-backup.json',
          mimeType: 'application/json'
        });
        
        cy.get('button[data-cy="start-import"]').click();
        
        cy.contains('Import completed', { matchCase: false }).should('be.visible');
      });
    });

    it('should handle import errors gracefully', () => {
      cy.visit('/settings/import-export');
      
      // Upload invalid file
      cy.get('input[type="file"]').selectFile({
        contents: 'invalid json content',
        fileName: 'invalid.json',
        mimeType: 'application/json'
      });
      
      cy.get('button[data-cy="start-import"]').click();
      
      cy.contains('Invalid file format', { matchCase: false }).should('be.visible');
    });

    it('should preview import before confirming', () => {
      cy.fixture('backup-data').then((backupData) => {
        cy.visit('/settings/import-export');
        
        cy.get('input[type="file"]').selectFile({
          contents: JSON.stringify(backupData.validBackup),
          fileName: 'preview-test.json',
          mimeType: 'application/json'
        });
        
        cy.get('input[data-cy="import-password"]').type('ExportPassword123!');
        cy.get('button[data-cy="preview-import"]').click();
        
        // Should show preview
        cy.get('[data-cy="import-preview"]').should('be.visible');
        cy.get('[data-cy="preview-accounts"]').should('contain', 'Google');
        cy.get('[data-cy="preview-accounts"]').should('contain', 'GitHub');
        
        // Confirm import
        cy.get('button[data-cy="confirm-import"]').click();
        cy.contains('Import completed', { matchCase: false }).should('be.visible');
      });
    });
  });

  describe('Bulk Operations', () => {
    beforeEach(() => {
      cy.fixture('test-accounts').then((accounts) => {
        cy.visit('/accounts');
        // Add multiple accounts for bulk operations
        accounts.validAccounts.forEach(account => {
          cy.addAccount(account);
        });
      });
    });

    it('should select all accounts', () => {
      cy.get('button[data-cy="select-all"], input[data-cy="select-all"]').click();
      
      // All checkboxes should be checked
      cy.get('[data-cy="account-card"] input[type="checkbox"]').should('be.checked');
      
      // Bulk actions should be visible
      cy.get('[data-cy="bulk-actions"]').should('be.visible');
      cy.get('button[data-cy="bulk-delete"]').should('be.visible');
      cy.get('button[data-cy="bulk-move"]').should('be.visible');
    });

    it('should bulk move accounts to folder', () => {
      // Create folder first
      cy.get('button[data-cy="create-folder"]').click();
      cy.get('input[data-cy="folder-name"]').type('Bulk Move Folder');
      cy.get('button[data-cy="save-folder"]').click();
      
      // Select multiple accounts
      cy.get('button[data-cy="select-multiple"]').click();
      cy.get('[data-cy="account-card"]').first().find('input[type="checkbox"]').check();
      cy.get('[data-cy="account-card"]').eq(1).find('input[type="checkbox"]').check();
      
      // Bulk move
      cy.get('button[data-cy="bulk-move"]').click();
      cy.get('select[data-cy="bulk-folder-select"]').select('Bulk Move Folder');
      cy.get('button[data-cy="confirm-bulk-move"]').click();
      
      cy.contains('Accounts moved', { matchCase: false }).should('be.visible');
    });

    it('should bulk add tags', () => {
      // Select accounts
      cy.get('button[data-cy="select-multiple"]').click();
      cy.get('[data-cy="account-card"]').first().find('input[type="checkbox"]').check();
      cy.get('[data-cy="account-card"]').eq(1).find('input[type="checkbox"]').check();
      
      // Bulk tag
      cy.get('button[data-cy="bulk-tag"]').click();
      cy.get('input[data-cy="bulk-tag-input"]').type('work-related');
      cy.get('button[data-cy="confirm-bulk-tag"]').click();
      
      // Verify tags added
      cy.get('[data-cy="account-card"]').first().should('contain', 'work-related');
      cy.get('[data-cy="account-card"]').eq(1).should('contain', 'work-related');
    });

    it('should bulk export selected accounts', () => {
      // Select specific accounts
      cy.get('button[data-cy="select-multiple"]').click();
      cy.get('[data-cy="account-card"]').first().find('input[type="checkbox"]').check();
      cy.get('[data-cy="account-card"]').eq(1).find('input[type="checkbox"]').check();
      
      // Bulk export
      cy.get('button[data-cy="bulk-export"]').click();
      cy.get('input[data-cy="export-password"]').type('BulkExportPass123!');
      cy.get('button[data-cy="start-bulk-export"]').click();
      
      cy.contains('Selected accounts exported', { matchCase: false }).should('be.visible');
    });
  });

  describe('Account Details and History', () => {
    beforeEach(() => {
      cy.fixture('test-accounts').then((accounts) => {
        cy.visit('/accounts');
        cy.addAccount(accounts.validAccounts[0]); // Add Google account
      });
    });

    it('should view account details', () => {
      cy.get('[data-cy="account-card"]')
        .contains('Google')
        .parents('[data-cy="account-card"]')
        .find('button[data-cy="view-details"], button:contains("Details")')
        .click();
      
      // Should show account details modal
      cy.get('[data-cy="account-details-modal"]').should('be.visible');
      cy.get('[data-cy="account-details-modal"]').should('contain', 'Google');
      cy.get('[data-cy="account-details-modal"]').should('contain', 'TOTP');
      cy.get('[data-cy="account-details-modal"]').should('contain', 'SHA1');
      cy.get('[data-cy="account-details-modal"]').should('contain', '6 digits');
      cy.get('[data-cy="account-details-modal"]').should('contain', '30 seconds');
    });

    it('should show usage history', () => {
      // Generate some usage by copying codes
      cy.get('[data-cy="account-card"]')
        .contains('Google')
        .parents('[data-cy="account-card"]')
        .find('button[data-cy="copy-code"]')
        .click();
      
      cy.wait(1000);
      cy.get('[data-cy="account-card"]')
        .contains('Google')
        .parents('[data-cy="account-card"]')
        .find('button[data-cy="copy-code"]')
        .click();
      
      // View details
      cy.get('[data-cy="account-card"]')
        .contains('Google')
        .parents('[data-cy="account-card"]')
        .find('button[data-cy="view-details"]')
        .click();
      
      // Check usage history tab
      cy.get('[data-cy="usage-history-tab"]').click();
      cy.get('[data-cy="usage-history"]').should('contain', 'Copied');
      cy.get('[data-cy="usage-history"]').should('contain', 'ago');
    });

    it('should show security alerts', () => {
      // Mock security alert
      cy.window().then((win) => {
        (win as any).dispatchEvent(new CustomEvent('security-alert', {
          detail: {
            accountId: 'google-account',
            type: 'suspicious-activity',
            message: 'Multiple failed login attempts detected'
          }
        }));
      });
      
      // View account details
      cy.get('[data-cy="account-card"]')
        .contains('Google')
        .parents('[data-cy="account-card"]')
        .find('button[data-cy="view-details"]')
        .click();
      
      // Check security tab
      cy.get('[data-cy="security-tab"]').click();
      cy.get('[data-cy="security-alerts"]').should('contain', 'suspicious-activity');
      cy.get('[data-cy="security-alerts"]').should('contain', 'Multiple failed login attempts');
    });
  });
});