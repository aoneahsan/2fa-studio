/**
 * Account Management E2E Tests
 */

describe('Account Management', () => {
  beforeEach(() => {
    cy.cleanup();
    // Login before each test
    cy.login(
      Cypress.env('TEST_EMAIL'),
      Cypress.env('TEST_PASSWORD'),
      Cypress.env('TEST_ENCRYPTION_PASSWORD')
    );
  });

  describe('Add Account', () => {
    it('should add account manually', () => {
      cy.visit('/accounts');
      
      // Click add account button
      cy.get('[data-testid="add-account-btn"]').click();
      
      // Choose manual entry
      cy.contains('Enter Manually').click();
      
      // Fill form
      cy.get('input[name="issuer"]').type('GitHub');
      cy.get('input[name="label"]').type('john.doe@github.com');
      cy.get('input[name="secret"]').type('JBSWY3DPEHPK3PXP');
      
      // Submit
      cy.get('button').contains('Add Account').click();
      
      // Verify account appears
      cy.contains('GitHub').should('be.visible');
      cy.contains('john.doe@github.com').should('be.visible');
      
      // Verify TOTP code is displayed
      cy.get('[data-testid="totp-code"]').should('have.length', 1);
      cy.get('[data-testid="totp-code"]').should('match', /^\d{6}$/);
    });

    it('should validate secret key format', () => {
      cy.visit('/accounts');
      cy.get('[data-testid="add-account-btn"]').click();
      cy.contains('Enter Manually').click();
      
      cy.get('input[name="issuer"]').type('Test');
      cy.get('input[name="label"]').type('test@example.com');
      cy.get('input[name="secret"]').type('invalid secret!');
      
      cy.get('button').contains('Add Account').click();
      
      cy.contains('Invalid secret key').should('be.visible');
    });

    it('should handle QR code scanner', () => {
      cy.visit('/accounts');
      cy.get('[data-testid="add-account-btn"]').click();
      
      // Click scan QR code
      cy.contains('Scan QR Code').click();
      
      // Should show camera permission prompt or scanner
      cy.contains('Point your camera at the QR code').should('be.visible');
      
      // Close scanner
      cy.get('[data-testid="close-scanner"]').click();
    });
  });

  describe('Edit Account', () => {
    beforeEach(() => {
      // Add a test account
      cy.addAccount('Google', 'test@gmail.com', 'JBSWY3DPEHPK3PXP');
    });

    it('should edit account details', () => {
      cy.visit('/accounts');
      
      // Click edit on the account
      cy.contains('Google').parent().parent().within(() => {
        cy.get('[data-testid="edit-account"]').click();
      });
      
      // Update details
      cy.get('input[name="issuer"]').clear().type('Google Workspace');
      cy.get('input[name="label"]').clear().type('work@company.com');
      
      cy.get('button').contains('Save').click();
      
      // Verify changes
      cy.contains('Google Workspace').should('be.visible');
      cy.contains('work@company.com').should('be.visible');
    });
  });

  describe('Delete Account', () => {
    beforeEach(() => {
      // Add test accounts
      cy.addAccount('Facebook', 'user@facebook.com', 'HXDMVJECJJWSRB3H');
      cy.addAccount('Twitter', 'user@twitter.com', 'GEZDGNBVGY3TQOJQ');
    });

    it('should delete account with confirmation', () => {
      cy.visit('/accounts');
      
      // Find and delete Facebook account
      cy.contains('Facebook').parent().parent().within(() => {
        cy.get('[data-testid="delete-account"]').click();
      });
      
      // Confirm deletion
      cy.contains('Are you sure').should('be.visible');
      cy.get('button').contains('Delete').click();
      
      // Verify account is removed
      cy.contains('Facebook').should('not.exist');
      
      // Twitter should still exist
      cy.contains('Twitter').should('be.visible');
    });

    it('should cancel deletion', () => {
      cy.visit('/accounts');
      
      cy.contains('Twitter').parent().parent().within(() => {
        cy.get('[data-testid="delete-account"]').click();
      });
      
      // Cancel deletion
      cy.get('button').contains('Cancel').click();
      
      // Account should still exist
      cy.contains('Twitter').should('be.visible');
    });
  });

  describe('Search and Filter', () => {
    beforeEach(() => {
      // Add multiple accounts
      cy.addAccount('Google', 'personal@gmail.com', 'JBSWY3DPEHPK3PXP');
      cy.addAccount('GitHub', 'developer@github.com', 'HXDMVJECJJWSRB3H');
      cy.addAccount('AWS', 'admin@aws.com', 'GEZDGNBVGY3TQOJQ');
      cy.addAccount('Microsoft', 'user@outlook.com', 'MFRGGZDFMZTWQ2LK');
    });

    it('should search accounts', () => {
      cy.visit('/accounts');
      
      // Search for GitHub
      cy.get('input[placeholder*="Search"]').type('github');
      
      // Only GitHub should be visible
      cy.contains('GitHub').should('be.visible');
      cy.contains('Google').should('not.exist');
      cy.contains('AWS').should('not.exist');
      cy.contains('Microsoft').should('not.exist');
      
      // Clear search
      cy.get('input[placeholder*="Search"]').clear();
      
      // All should be visible again
      cy.contains('Google').should('be.visible');
      cy.contains('GitHub').should('be.visible');
      cy.contains('AWS').should('be.visible');
      cy.contains('Microsoft').should('be.visible');
    });

    it('should sort accounts', () => {
      cy.visit('/accounts');
      
      // Click sort dropdown
      cy.get('[data-testid="sort-dropdown"]').click();
      
      // Sort by name A-Z
      cy.contains('Name (A-Z)').click();
      
      // Check order
      cy.get('[data-testid="account-card"]').then(($cards) => {
        const names = $cards.map((i, el) => Cypress.$(el).find('[data-testid="issuer"]').text()).get();
        const sorted = [...names].sort();
        expect(names).to.deep.equal(sorted);
      });
    });
  });

  describe('Copy TOTP Code', () => {
    beforeEach(() => {
      cy.addAccount('Test Service', 'test@example.com', 'JBSWY3DPEHPK3PXP');
    });

    it('should copy TOTP code to clipboard', () => {
      cy.visit('/accounts');
      
      // Click on the TOTP code to copy
      cy.get('[data-testid="totp-code"]').click();
      
      // Should show copied notification
      cy.contains('Copied to clipboard').should('be.visible');
    });
  });

  describe('Backup Codes', () => {
    beforeEach(() => {
      cy.addAccount('Secure Service', 'secure@example.com', 'KVKFKRCPNZQUYMLX');
    });

    it('should manage backup codes', () => {
      cy.visit('/accounts');
      
      // Click on account to expand
      cy.contains('Secure Service').click();
      
      // Click manage backup codes
      cy.contains('Backup Codes').click();
      
      // Generate backup codes if not exists
      if (cy.contains('Generate Backup Codes').should('exist')) {
        cy.contains('Generate Backup Codes').click();
        
        // Should show backup codes
        cy.get('[data-testid="backup-code"]').should('have.length.at.least', 6);
        
        // Download codes
        cy.contains('Download Codes').click();
      }
    });
  });
});