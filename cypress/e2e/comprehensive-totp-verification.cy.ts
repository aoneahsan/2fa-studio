/**
 * Comprehensive TOTP Code Generation and Verification E2E Tests
 * Tests all aspects of OTP generation, verification, and time-based functionality
 */

describe('Comprehensive TOTP Verification Tests', () => {
  beforeEach(() => {
    cy.cleanup();
    cy.setupEmulator();
    cy.setupTestUser('premium');
  });

  describe('TOTP Code Generation', () => {
    beforeEach(() => {
      cy.fixture('test-accounts').then((accounts) => {
        cy.visit('/accounts');
        // Add various types of accounts
        cy.addAccount(accounts.validAccounts[0]); // Google TOTP
        cy.addAccount(accounts.hotpAccounts[0]);   // Bank HOTP
        cy.addAccount(accounts.steamAccounts[0]); // Steam
        cy.addAccount(accounts.customAccounts[0]); // Custom SHA256
      });
    });

    it('should generate 6-digit TOTP codes', () => {
      cy.fixture('test-accounts').then((accounts) => {
        const account = accounts.validAccounts[0]; // Google account
        
        cy.get('[data-cy="account-card"]')
          .contains(account.issuer)
          .parents('[data-cy="account-card"]')
          .within(() => {
            // Verify 6-digit code
            cy.get('[data-cy="account-code"], .totp-code').should('be.visible');
            cy.get('[data-cy="account-code"], .totp-code')
              .invoke('text')
              .should('match', /^\d{6}$/);
            
            // Verify countdown timer
            cy.get('[data-cy="countdown-timer"], .countdown').should('be.visible');
            cy.get('[data-cy="countdown-timer"], .countdown')
              .invoke('text')
              .should('match', /^\d{1,2}$/);
          });
      });
    });

    it('should generate 8-digit custom TOTP codes', () => {
      cy.fixture('test-accounts').then((accounts) => {
        const account = accounts.customAccounts[0]; // Custom 8-digit account
        
        cy.get('[data-cy="account-card"]')
          .contains(account.issuer)
          .parents('[data-cy="account-card"]')
          .within(() => {
            // Verify 8-digit code
            cy.get('[data-cy="account-code"]')
              .invoke('text')
              .should('match', /^\d{8}$/);
          });
      });
    });

    it('should generate 5-digit Steam codes', () => {
      cy.fixture('test-accounts').then((accounts) => {
        const account = accounts.steamAccounts[0];
        
        cy.get('[data-cy="account-card"]')
          .contains(account.issuer)
          .parents('[data-cy="account-card"]')
          .within(() => {
            // Verify 5-digit Steam code
            cy.get('[data-cy="account-code"]')
              .invoke('text')
              .should('match', /^[BCDFGHJKMNPQRTVWXY2-9]{5}$/); // Steam uses custom alphabet
          });
      });
    });

    it('should handle HOTP counter increments', () => {
      cy.fixture('test-accounts').then((accounts) => {
        const account = accounts.hotpAccounts[0]; // Bank HOTP
        
        cy.get('[data-cy="account-card"]')
          .contains(account.issuer)
          .parents('[data-cy="account-card"]')
          .within(() => {
            // Check initial counter
            cy.get('[data-cy="hotp-counter"], .counter-display')
              .should('contain', '0');
            
            // Generate new HOTP code
            cy.get('[data-cy="generate-hotp"], button:contains("Generate")').click();
            
            // Counter should increment
            cy.get('[data-cy="hotp-counter"], .counter-display')
              .should('contain', '1');
            
            // Code should change
            cy.get('[data-cy="account-code"]').should('be.visible');
          });
      });
    });

    it('should update TOTP codes every 30 seconds', () => {
      cy.fixture('test-accounts').then((accounts) => {
        const account = accounts.validAccounts[0]; // Google account
        
        cy.get('[data-cy="account-card"]')
          .contains(account.issuer)
          .parents('[data-cy="account-card"]')
          .within(() => {
            // Get initial code
            cy.get('[data-cy="account-code"]')
              .invoke('text')
              .then((initialCode) => {
                // Wait for countdown to reach near 0
                cy.get('[data-cy="countdown-timer"]')
                  .should('contain', '1')
                  .or('contain', '2')
                  .or('contain', '3');
                
                // Wait for code refresh
                cy.wait(3000);
                
                // Code should have changed
                cy.get('[data-cy="account-code"]')
                  .invoke('text')
                  .should('not.equal', initialCode);
                
                // Countdown should reset
                cy.get('[data-cy="countdown-timer"]')
                  .invoke('text')
                  .then((countdown) => {
                    expect(parseInt(countdown)).to.be.greaterThan(25);
                  });
              });
          });
      });
    });

    it('should generate different codes for different algorithms', () => {
      cy.fixture('test-accounts').then((accounts) => {
        const sha1Account = accounts.validAccounts[0]; // SHA1
        const sha256Account = accounts.customAccounts[0]; // SHA256
        
        // Both should have codes but they should be different for same time
        cy.get('[data-cy="account-card"]')
          .contains(sha1Account.issuer)
          .parents('[data-cy="account-card"]')
          .find('[data-cy="account-code"]')
          .invoke('text')
          .then((sha1Code) => {
            cy.get('[data-cy="account-card"]')
              .contains(sha256Account.issuer)
              .parents('[data-cy="account-card"]')
              .find('[data-cy="account-code"]')
              .invoke('text')
              .should('not.equal', sha1Code);
          });
      });
    });
  });

  describe('Code Copy and Share Functionality', () => {
    beforeEach(() => {
      cy.fixture('test-accounts').then((accounts) => {
        cy.visit('/accounts');
        cy.addAccount(accounts.validAccounts[0]); // Google account
      });
    });

    it('should copy TOTP code to clipboard', () => {
      cy.get('[data-cy="account-card"]')
        .contains('Google')
        .parents('[data-cy="account-card"]')
        .within(() => {
          // Click copy button
          cy.get('button[data-cy="copy-code"], button[title*="copy" i]').click();
        });
      
      // Should show success toast
      cy.get('[data-cy="toast-success"], .toast-success, [role="alert"]')
        .should('be.visible')
        .and('contain.text', 'copied');
      
      // Verify clipboard content (if supported by browser)
      cy.window().then((win) => {
        if (win.navigator.clipboard) {
          win.navigator.clipboard.readText().then((text) => {
            expect(text).to.match(/^\d{6}$/);
          });
        }
      });
    });

    it('should auto-copy code when clicked', () => {
      cy.get('[data-cy="account-card"]')
        .contains('Google')
        .parents('[data-cy="account-card"]')
        .within(() => {
          // Click on the code itself
          cy.get('[data-cy="account-code"], .totp-code').click();
        });
      
      // Should show copy confirmation
      cy.get('[data-cy="toast-success"]')
        .should('be.visible')
        .and('contain.text', 'copied');
    });

    it('should show copy feedback animation', () => {
      cy.get('[data-cy="account-card"]')
        .contains('Google')
        .parents('[data-cy="account-card"]')
        .within(() => {
          cy.get('button[data-cy="copy-code"]').click();
          
          // Should show copied state
          cy.get('[data-cy="copy-feedback"], .copy-success').should('be.visible');
          cy.get('button[data-cy="copy-code"]').should('contain.text', 'Copied');
          
          // Should reset after delay
          cy.wait(2000);
          cy.get('button[data-cy="copy-code"]').should('not.contain.text', 'Copied');
        });
    });

    it('should prevent code copying in sensitive mode', () => {
      // Enable privacy mode
      cy.visit('/settings/security');
      cy.get('input[data-cy="privacy-mode"], input[name="privacyMode"]').check();
      
      cy.visit('/accounts');
      
      cy.get('[data-cy="account-card"]')
        .contains('Google')
        .parents('[data-cy="account-card"]')
        .within(() => {
          // Code should be hidden
          cy.get('[data-cy="account-code"]').should('contain.text', '••••••');
          
          // Reveal button should be present
          cy.get('button[data-cy="reveal-code"], button[title*="reveal" i]').should('be.visible');
          
          // Click reveal
          cy.get('button[data-cy="reveal-code"]').click();
          
          // Code should be visible temporarily
          cy.get('[data-cy="account-code"]').should('match', /^\d{6}$/);
        });
    });
  });

  describe('Code Verification and Validation', () => {
    beforeEach(() => {
      cy.fixture('test-accounts').then((accounts) => {
        cy.visit('/accounts');
        cy.addAccount(accounts.validAccounts[0]); // Google account
      });
    });

    it('should validate TOTP codes against known test vectors', () => {
      // Test with known TOTP test vector (RFC 6238)
      const testSecret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
      const testTime = 1234567890; // Known timestamp
      const expectedCode = '005924'; // Expected code for this time
      
      // Add test account with known secret
      cy.addAccount({
        issuer: 'Test Vector',
        label: 'RFC 6238',
        secret: testSecret,
        type: 'totp',
        algorithm: 'SHA1',
        digits: 6,
        period: 30
      });
      
      // Mock time for consistent testing
      cy.window().then((win) => {
        cy.stub(win.Date, 'now').returns(testTime * 1000);
      });
      
      // Trigger code refresh
      cy.get('[data-cy="refresh-codes"], button[title*="refresh" i]').click();
      
      // Verify expected code
      cy.get('[data-cy="account-card"]')
        .contains('Test Vector')
        .parents('[data-cy="account-card"]')
        .find('[data-cy="account-code"]')
        .should('contain.text', expectedCode);
    });

    it('should show code strength indicators', () => {
      cy.get('[data-cy="account-card"]')
        .contains('Google')
        .parents('[data-cy="account-card"]')
        .within(() => {
          // Should show algorithm info
          cy.get('[data-cy="account-algorithm"], .algorithm-badge').should('contain', 'SHA1');
          
          // Should show security level
          cy.get('[data-cy="security-level"], .security-badge').should('be.visible');
        });
    });

    it('should warn about weak configurations', () => {
      // Add account with weak configuration (4 digits)
      cy.addAccount({
        issuer: 'Weak Config',
        label: 'test@weak.com',
        secret: 'JBSWY3DPEHPK3PXP',
        type: 'totp',
        algorithm: 'SHA1',
        digits: 4,
        period: 30
      });
      
      cy.get('[data-cy="account-card"]')
        .contains('Weak Config')
        .parents('[data-cy="account-card"]')
        .within(() => {
          // Should show warning
          cy.get('[data-cy="security-warning"], .warning-icon').should('be.visible');
          cy.get('[data-cy="security-warning"]').should('have.attr', 'title').and('contain', 'weak');
        });
    });

    it('should validate time synchronization', () => {
      cy.visit('/settings/time-sync');
      
      // Check time sync status
      cy.get('[data-cy="time-sync-status"]').should('contain', 'Synchronized');
      
      // Test time sync
      cy.get('button[data-cy="test-time-sync"]').click();
      
      // Should show sync results
      cy.get('[data-cy="sync-results"]').should('be.visible');
      cy.get('[data-cy="time-offset"]').should('contain', 'ms');
      
      // If offset is too high, should show warning
      cy.get('[data-cy="sync-warning"]').then($warning => {
        if ($warning.is(':visible')) {
          cy.wrap($warning).should('contain', 'time difference detected');
        }
      });
    });
  });

  describe('Backup Codes Management', () => {
    beforeEach(() => {
      cy.fixture('test-accounts').then((accounts) => {
        cy.visit('/accounts');
        cy.addAccount(accounts.validAccounts[0]); // Google account
      });
    });

    it('should manage backup codes for accounts', () => {
      cy.get('[data-cy="account-card"]')
        .contains('Google')
        .parents('[data-cy="account-card"]')
        .find('button[data-cy="manage-backup-codes"], button:contains("Backup Codes")')
        .click();
      
      // Should show backup codes modal
      cy.get('[data-cy="backup-codes-modal"]').should('be.visible');
      
      // Add backup codes
      cy.get('button[data-cy="add-backup-codes"]').click();
      
      cy.fixture('test-accounts').then((accounts) => {
        const backupCodes = accounts.backupCodes[0].codes;
        const codeText = backupCodes.join('\n');
        
        cy.get('textarea[data-cy="backup-codes-input"]').type(codeText);
        cy.get('button[data-cy="save-backup-codes"]').click();
        
        // Should show success message
        cy.contains('Backup codes saved', { matchCase: false }).should('be.visible');
        
        // Should display backup codes count
        cy.get('[data-cy="backup-codes-count"]').should('contain', backupCodes.length);
      });
    });

    it('should use backup codes when TOTP is unavailable', () => {
      // First add backup codes
      cy.get('[data-cy="account-card"]')
        .contains('Google')
        .parents('[data-cy="account-card"]')
        .find('button[data-cy="manage-backup-codes"]')
        .click();
      
      cy.get('button[data-cy="add-backup-codes"]').click();
      cy.get('textarea[data-cy="backup-codes-input"]').type('12345-67890\n09876-54321');
      cy.get('button[data-cy="save-backup-codes"]').click();
      
      // Close modal
      cy.get('button[data-cy="close-modal"], [data-cy="modal-close"]').click();
      
      // Use backup code
      cy.get('[data-cy="account-card"]')
        .contains('Google')
        .parents('[data-cy="account-card"]')
        .find('button[data-cy="use-backup-code"]')
        .click();
      
      // Should show backup code usage modal
      cy.get('[data-cy="use-backup-code-modal"]').should('be.visible');
      cy.get('input[data-cy="backup-code-input"]').type('12345-67890');
      cy.get('button[data-cy="use-code"]').click();
      
      // Should mark code as used
      cy.contains('Backup code used', { matchCase: false }).should('be.visible');
    });

    it('should show backup code usage history', () => {
      // Add and use backup codes
      cy.get('[data-cy="account-card"]')
        .contains('Google')
        .parents('[data-cy="account-card"]')
        .find('button[data-cy="manage-backup-codes"]')
        .click();
      
      // Check history tab
      cy.get('[data-cy="backup-code-history-tab"]').click();
      
      // Should show usage history
      cy.get('[data-cy="backup-code-history"]').should('be.visible');
      
      // If codes were used, should show usage dates
      cy.get('[data-cy="backup-code-history"]').then($history => {
        if ($history.find('.used-code').length > 0) {
          cy.get('.used-code').should('contain', 'Used on');
        } else {
          cy.get('[data-cy="no-usage"]').should('contain', 'No backup codes have been used');
        }
      });
    });

    it('should warn when backup codes are running low', () => {
      // Mock low backup codes scenario
      cy.window().then((win) => {
        (win as any).dispatchEvent(new CustomEvent('backup-codes-low', {
          detail: { remainingCodes: 2 }
        }));
      });
      
      // Should show warning
      cy.get('[data-cy="backup-codes-warning"], .warning-banner')
        .should('be.visible')
        .and('contain', 'running low');
      
      cy.get('[data-cy="backup-codes-warning"]')
        .should('contain', '2 remaining');
    });
  });

  describe('Code Security Features', () => {
    beforeEach(() => {
      cy.fixture('test-accounts').then((accounts) => {
        cy.visit('/accounts');
        cy.addAccount(accounts.validAccounts[0]); // Google account
      });
    });

    it('should prevent screenshot of sensitive codes', () => {
      // Enable screenshot protection
      cy.visit('/settings/security');
      cy.get('input[data-cy="screenshot-protection"]').check();
      
      cy.visit('/accounts');
      
      // Mock screenshot attempt
      cy.window().then((win) => {
        const event = new KeyboardEvent('keydown', {
          key: 'PrintScreen',
          ctrlKey: false,
          altKey: false,
          shiftKey: false
        });
        win.dispatchEvent(event);
        
        // Should show warning
        cy.get('[data-cy="screenshot-blocked"]')
          .should('be.visible')
          .and('contain', 'Screenshot blocked');
      });
    });

    it('should auto-hide codes after timeout', () => {
      // Enable auto-hide
      cy.visit('/settings/security');
      cy.get('input[data-cy="auto-hide-codes"]').check();
      cy.get('input[data-cy="hide-timeout"]').clear().type('5');
      cy.get('button[type="submit"]').click();
      
      cy.visit('/accounts');
      
      // Codes should be visible initially
      cy.get('[data-cy="account-code"]').should('not.contain', '•');
      
      // Wait for timeout
      cy.wait(6000);
      
      // Codes should be hidden
      cy.get('[data-cy="account-code"]').should('contain', '••••••');
    });

    it('should require authentication to view codes', () => {
      // Enable authentication requirement
      cy.visit('/settings/security');
      cy.get('input[data-cy="require-auth-for-codes"]').check();
      cy.get('button[type="submit"]').click();
      
      cy.visit('/accounts');
      
      // Codes should be hidden
      cy.get('[data-cy="account-code"]').should('contain', '••••••');
      
      // Click to reveal
      cy.get('[data-cy="account-card"]')
        .contains('Google')
        .parents('[data-cy="account-card"]')
        .find('button[data-cy="reveal-code"]')
        .click();
      
      // Should prompt for authentication
      cy.get('[data-cy="auth-prompt-modal"]').should('be.visible');
      cy.get('input[data-cy="auth-password"]').type('TestPassword123!');
      cy.get('button[data-cy="authenticate"]').click();
      
      // Codes should now be visible
      cy.get('[data-cy="account-code"]').should('match', /^\d{6}$/);
    });

    it('should detect and prevent code replay attacks', () => {
      // Get current code
      cy.get('[data-cy="account-card"]')
        .contains('Google')
        .parents('[data-cy="account-card"]')
        .find('[data-cy="account-code"]')
        .invoke('text')
        .then((currentCode) => {
          // Try to use the same code multiple times
          cy.window().then((win) => {
            (win as any).dispatchEvent(new CustomEvent('code-verification-attempt', {
              detail: { code: currentCode, timestamp: Date.now() }
            }));
            
            // Second attempt with same code should be flagged
            (win as any).dispatchEvent(new CustomEvent('code-verification-attempt', {
              detail: { code: currentCode, timestamp: Date.now() + 1000 }
            }));
            
            // Should show replay attack warning
            cy.get('[data-cy="replay-attack-warning"]')
              .should('be.visible')
              .and('contain', 'Code already used');
          });
        });
    });
  });

  describe('Performance and Reliability', () => {
    beforeEach(() => {
      cy.fixture('test-accounts').then((accounts) => {
        cy.visit('/accounts');
        // Add many accounts to test performance
        accounts.validAccounts.forEach(account => {
          cy.addAccount(account);
        });
      });
    });

    it('should handle large number of accounts efficiently', () => {
      // Add more accounts for stress testing
      for (let i = 0; i < 10; i++) {
        cy.addAccount({
          issuer: `Test Account ${i}`,
          label: `user${i}@test.com`,
          secret: 'JBSWY3DPEHPK3PXP',
          type: 'totp'
        });
      }
      
      // All codes should still generate within reasonable time
      cy.get('[data-cy="account-card"]', { timeout: 10000 })
        .should('have.length.at.least', 10);
      
      // All codes should be visible
      cy.get('[data-cy="account-code"]').each($code => {
        cy.wrap($code).should('match', /^\d{6}$/);
      });
      
      // Performance should be acceptable (all codes update together)
      cy.get('button[data-cy="refresh-all-codes"]').click();
      cy.get('[data-cy="account-code"]', { timeout: 5000 }).should('be.visible');
    });

    it('should maintain accuracy during system clock changes', () => {
      // Get initial code
      cy.get('[data-cy="account-card"]')
        .first()
        .find('[data-cy="account-code"]')
        .invoke('text')
        .then((initialCode) => {
          // Mock system clock change
          cy.window().then((win) => {
            const originalNow = Date.now;
            cy.stub(win.Date, 'now').returns(originalNow() + 60000); // Jump 1 minute forward
            
            // Trigger code refresh
            cy.get('button[data-cy="refresh-codes"]').click();
            
            // Code should update based on new time
            cy.get('[data-cy="account-card"]')
              .first()
              .find('[data-cy="account-code"]')
              .invoke('text')
              .should('not.equal', initialCode);
          });
        });
    });

    it('should handle network connectivity issues gracefully', () => {
      // Simulate network failure
      cy.intercept('**', { forceNetworkError: true }).as('networkError');
      
      // Codes should still generate (they don't require network)
      cy.get('[data-cy="account-code"]').should('be.visible');
      
      // But sync features should show offline status
      cy.get('[data-cy="offline-indicator"], .offline-status')
        .should('be.visible')
        .and('contain', 'Offline');
      
      // Restore network
      cy.intercept('**', { statusCode: 200 }).as('networkRestored');
      
      // Should reconnect automatically
      cy.wait(2000);
      cy.get('[data-cy="online-indicator"], .online-status')
        .should('be.visible');
    });
  });
});