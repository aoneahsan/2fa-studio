/**
 * Comprehensive Security and Error Handling E2E Tests
 * Tests security features, error scenarios, edge cases, and system resilience
 */

describe('Comprehensive Security and Error Handling Tests', () => {
  beforeEach(() => {
    cy.cleanup();
    cy.setupEmulator();
    cy.setupTestUser('premium');
  });

  describe('Input Validation and Sanitization', () => {
    it('should prevent XSS attacks in user inputs', () => {
      cy.visit('/accounts');
      
      // Try to inject script in account issuer
      const xssPayload = '<script>alert("XSS")</script>';
      
      cy.get('button[data-cy="add-account-btn"]').click();
      cy.get('[data-cy="manual-entry-tab"]').click();
      
      cy.get('input[data-cy="account-issuer"]').type(xssPayload);
      cy.get('input[data-cy="account-label"]').type('test@example.com');
      cy.get('input[data-cy="account-secret"]').type('JBSWY3DPEHPK3PXP');
      cy.get('button[data-cy="save-account-btn"]').click();
      
      // Should sanitize the input
      cy.get('[data-cy="account-card"]').should('not.contain', '<script>');
      cy.get('[data-cy="account-card"]').should('contain', '&lt;script&gt;');
      
      // Check that no script was executed
      cy.window().then((win) => {
        expect((win as any).alertCalled).to.be.undefined;
      });
    });

    it('should validate SQL injection attempts', () => {
      const sqlPayload = "'; DROP TABLE accounts; --";
      
      cy.visit('/accounts');
      cy.get('input[data-cy="search-input"]').type(sqlPayload);
      cy.get('button[data-cy="search-button"]').click();
      
      // Should handle the input safely
      cy.get('[data-cy="search-results"]').should('be.visible');
      cy.get('[data-cy="no-results"]').should('contain', 'No accounts found');
      
      // Verify app is still functional
      cy.get('[data-cy="account-card"]').should('exist');
    });

    it('should handle malformed JSON input', () => {
      cy.visit('/settings/import-export');
      
      // Try to import malformed JSON
      cy.get('input[type="file"]').selectFile({
        contents: '{"invalid": json, "missing": quote}',
        fileName: 'malformed.json',
        mimeType: 'application/json'
      });
      
      cy.get('button[data-cy="preview-backup"]').click();
      
      // Should show proper error message
      cy.get('[data-cy="import-error"]').should('be.visible');
      cy.get('[data-cy="import-error"]').should('contain', 'Invalid JSON format');
      
      // Should not crash the application
      cy.get('[data-cy="import-modal"]').should('be.visible');
      cy.get('button[data-cy="close-modal"]').should('be.visible');
    });

    it('should validate TOTP secret formats', () => {
      cy.visit('/accounts');
      cy.get('button[data-cy="add-account-btn"]').click();
      cy.get('[data-cy="manual-entry-tab"]').click();
      
      // Test various invalid secret formats
      const invalidSecrets = [
        '123456', // Too short
        'invalid characters!@#', // Invalid characters
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789', // Too long
        '0O1Il', // Ambiguous characters
        '' // Empty
      ];
      
      invalidSecrets.forEach((secret, index) => {
        cy.get('input[data-cy="account-issuer"]').clear().type(`Test ${index}`);
        cy.get('input[data-cy="account-label"]').clear().type(`test${index}@example.com`);
        cy.get('input[data-cy="account-secret"]').clear().type(secret);
        cy.get('button[data-cy="save-account-btn"]').click();
        
        // Should show validation error
        cy.get('[data-cy="secret-validation-error"]').should('be.visible');
        cy.get('[data-cy="secret-validation-error"]').should('contain', 'Invalid secret');
      });
    });

    it('should handle edge cases in OTP generation', () => {
      cy.fixture('test-accounts').then((accounts) => {
        // Add account with edge case parameters
        cy.visit('/accounts');
        cy.addAccount({
          issuer: 'Edge Case',
          label: 'edge@test.com',
          secret: 'JBSWY3DPEHPK3PXP',
          type: 'totp',
          digits: 8, // Maximum digits
          period: 60, // Longer period
          algorithm: 'SHA256'
        });
        
        // Should generate valid 8-digit code
        cy.get('[data-cy="account-card"]')
          .contains('Edge Case')
          .parents('[data-cy="account-card"]')
          .find('[data-cy="account-code"]')
          .invoke('text')
          .should('match', /^\d{8}$/);
      });
    });
  });

  describe('Authentication Security', () => {
    it('should prevent brute force attacks', () => {
      cy.visit('/login');
      
      // Attempt multiple failed logins
      for (let i = 0; i < 5; i++) {
        cy.get('input[type="email"]').clear().type('test@example.com');
        cy.get('input[type="password"]').clear().type('wrong-password');
        cy.get('button[type="submit"]').click();
        
        if (i < 4) {
          cy.contains('Invalid credentials').should('be.visible');
          cy.get('button[type="submit"]').should('not.be.disabled');
        }
      }
      
      // Should be rate limited after 5 attempts
      cy.get('[data-cy="rate-limit-error"]').should('be.visible');
      cy.get('[data-cy="rate-limit-error"]').should('contain', 'Too many failed attempts');
      cy.get('button[type="submit"]').should('be.disabled');
      
      // Should show countdown timer
      cy.get('[data-cy="lockout-timer"]').should('be.visible');
      cy.get('[data-cy="lockout-timer"]').should('contain', 'Try again in');
    });

    it('should detect and prevent session hijacking', () => {
      cy.fixture('test-users').then((users) => {
        // Login normally
        cy.login(users.validUser.email, users.validUser.password, users.validUser.encryptionPassword);
        
        // Mock session token change (simulating hijacking attempt)
        cy.window().then((win) => {
          (win as any).dispatchEvent(new CustomEvent('suspicious-session-activity', {
            detail: {
              type: 'token-mismatch',
              originalFingerprint: 'abc123',
              currentFingerprint: 'xyz789'
            }
          }));
        });
        
        // Should show security warning
        cy.get('[data-cy="security-warning"]').should('be.visible');
        cy.get('[data-cy="security-warning"]').should('contain', 'Suspicious activity detected');
        
        // Should force re-authentication
        cy.get('[data-cy="force-logout-warning"]').should('be.visible');
        cy.get('button[data-cy="logout-all-sessions"]').should('be.visible');
      });
    });

    it('should handle expired sessions gracefully', () => {
      cy.fixture('test-users').then((users) => {
        cy.login(users.validUser.email, users.validUser.password, users.validUser.encryptionPassword);
        
        // Mock session expiry
        cy.window().then((win) => {
          (win as any).dispatchEvent(new CustomEvent('session-expired', {
            detail: { expiredAt: Date.now() }
          }));
        });
        
        // Should show session expiry notification
        cy.get('[data-cy="session-expired-modal"]').should('be.visible');
        cy.get('[data-cy="session-expired-modal"]').should('contain', 'Your session has expired');
        
        // Should offer to extend session or re-login
        cy.get('button[data-cy="extend-session"]').should('be.visible');
        cy.get('button[data-cy="login-again"]').should('be.visible');
      });
    });

    it('should protect against CSRF attacks', () => {
      cy.fixture('test-users').then((users) => {
        cy.login(users.validUser.email, users.validUser.password, users.validUser.encryptionPassword);
        
        // Mock CSRF attack attempt
        cy.request({
          method: 'POST',
          url: '/api/accounts',
          body: {
            issuer: 'CSRF Test',
            label: 'csrf@attack.com',
            secret: 'JBSWY3DPEHPK3PXP'
          },
          failOnStatusCode: false,
          headers: {
            'X-Requested-With': 'XMLHttpRequest'
            // Missing CSRF token
          }
        }).then((response) => {
          // Should reject the request
          expect(response.status).to.equal(403);
          expect(response.body).to.have.property('error');
          expect(response.body.error).to.contain('CSRF');
        });
      });
    });

    it('should validate JWT tokens properly', () => {
      cy.fixture('test-users').then((users) => {
        cy.login(users.validUser.email, users.validUser.password, users.validUser.encryptionPassword);
        
        // Mock invalid JWT token
        cy.window().then((win) => {
          // Corrupt the stored token
          localStorage.setItem('authToken', 'invalid.jwt.token');
          
          // Trigger API request that requires authentication
          (win as any).dispatchEvent(new CustomEvent('api-request', {
            detail: { endpoint: '/api/accounts' }
          }));
        });
        
        // Should detect invalid token and redirect to login
        cy.url().should('include', '/login');
        cy.get('[data-cy="invalid-session"]').should('be.visible');
      });
    });
  });

  describe('Data Encryption and Protection', () => {
    it('should handle encryption failures gracefully', () => {
      cy.fixture('test-accounts').then((accounts) => {
        cy.visit('/accounts');
        
        // Mock encryption failure
        cy.window().then((win) => {
          (win as any).mockEncryptionFailure = true;
        });
        
        // Try to add account when encryption fails
        cy.get('button[data-cy="add-account-btn"]').click();
        cy.get('[data-cy="manual-entry-tab"]').click();
        
        const account = accounts.validAccounts[0];
        cy.get('input[data-cy="account-issuer"]').type(account.issuer);
        cy.get('input[data-cy="account-label"]').type(account.label);
        cy.get('input[data-cy="account-secret"]').type(account.secret);
        cy.get('button[data-cy="save-account-btn"]').click();
        
        // Should show encryption error
        cy.get('[data-cy="encryption-error"]').should('be.visible');
        cy.get('[data-cy="encryption-error"]').should('contain', 'Failed to encrypt account data');
        
        // Should offer recovery options
        cy.get('button[data-cy="retry-encryption"]').should('be.visible');
        cy.get('button[data-cy="check-encryption-key"]').should('be.visible');
      });
    });

    it('should detect data tampering', () => {
      cy.fixture('test-accounts').then((accounts) => {
        cy.visit('/accounts');
        cy.addAccount(accounts.validAccounts[0]);
        
        // Mock data tampering
        cy.window().then((win) => {
          (win as any).dispatchEvent(new CustomEvent('data-integrity-violation', {
            detail: {
              type: 'checksum-mismatch',
              accountId: 'google-account-123',
              expectedHash: 'abc123',
              actualHash: 'def456'
            }
          }));
        });
        
        // Should show integrity warning
        cy.get('[data-cy="data-integrity-warning"]').should('be.visible');
        cy.get('[data-cy="data-integrity-warning"]').should('contain', 'Data integrity check failed');
        
        // Should offer data recovery options
        cy.get('button[data-cy="restore-from-backup"]').should('be.visible');
        cy.get('button[data-cy="re-encrypt-data"]').should('be.visible');
      });
    });

    it('should handle key derivation errors', () => {
      cy.visit('/settings/security');
      
      // Try to change encryption password with wrong current password
      cy.get('button[data-cy="change-encryption-password"]').click();
      cy.get('input[data-cy="current-encryption-password"]').type('wrong-password');
      cy.get('input[data-cy="new-encryption-password"]').type('NewPassword123!');
      cy.get('input[data-cy="confirm-new-encryption-password"]').type('NewPassword123!');
      cy.get('button[data-cy="update-encryption-password"]').click();
      
      // Should show key derivation error
      cy.get('[data-cy="key-derivation-error"]').should('be.visible');
      cy.get('[data-cy="key-derivation-error"]').should('contain', 'Current password is incorrect');
      
      // Should not proceed with password change
      cy.get('[data-cy="encryption-update-progress"]').should('not.exist');
    });
  });

  describe('Network and API Error Handling', () => {
    it('should handle network timeouts', () => {
      // Intercept and delay API calls
      cy.intercept('GET', '/api/accounts', (req) => {
        req.reply((res) => {
          res.delay(30000); // 30 second delay to trigger timeout
          res.send({ accounts: [] });
        });
      }).as('slowAccountsAPI');
      
      cy.visit('/accounts');
      
      // Should show loading state initially
      cy.get('[data-cy="loading-accounts"]').should('be.visible');
      
      // Should show timeout error
      cy.get('[data-cy="timeout-error"]', { timeout: 35000 }).should('be.visible');
      cy.get('[data-cy="timeout-error"]').should('contain', 'Request timed out');
      
      // Should offer retry option
      cy.get('button[data-cy="retry-request"]').should('be.visible');
    });

    it('should handle API rate limiting', () => {
      // Mock rate limit response
      cy.intercept('POST', '/api/accounts', {
        statusCode: 429,
        body: {
          error: 'Rate limit exceeded',
          retryAfter: 60
        }
      }).as('rateLimitedAPI');
      
      cy.fixture('test-accounts').then((accounts) => {
        cy.visit('/accounts');
        cy.get('button[data-cy="add-account-btn"]').click();
        cy.get('[data-cy="manual-entry-tab"]').click();
        
        const account = accounts.validAccounts[0];
        cy.get('input[data-cy="account-issuer"]').type(account.issuer);
        cy.get('input[data-cy="account-label"]').type(account.label);
        cy.get('input[data-cy="account-secret"]').type(account.secret);
        cy.get('button[data-cy="save-account-btn"]').click();
        
        cy.wait('@rateLimitedAPI');
        
        // Should show rate limit error with countdown
        cy.get('[data-cy="rate-limit-error"]').should('be.visible');
        cy.get('[data-cy="rate-limit-error"]').should('contain', 'Rate limit exceeded');
        cy.get('[data-cy="retry-countdown"]').should('contain', '60');
      });
    });

    it('should handle partial API failures', () => {
      // Mock partial failure in batch operations
      cy.intercept('POST', '/api/accounts/batch', {
        statusCode: 207, // Multi-status
        body: {
          results: [
            { success: true, id: 'account-1' },
            { success: false, error: 'Invalid secret format', id: 'account-2' },
            { success: true, id: 'account-3' }
          ]
        }
      }).as('batchAPI');
      
      cy.visit('/settings/import-export');
      
      // Mock importing multiple accounts
      cy.fixture('test-accounts').then((accounts) => {
        const importData = {
          accounts: accounts.validAccounts.slice(0, 3)
        };
        
        cy.get('input[type="file"]').selectFile({
          contents: JSON.stringify(importData),
          fileName: 'batch-import.json',
          mimeType: 'application/json'
        });
        
        cy.get('button[data-cy="start-import"]').click();
        cy.wait('@batchAPI');
        
        // Should show partial success results
        cy.get('[data-cy="import-results"]').should('be.visible');
        cy.get('[data-cy="successful-imports"]').should('contain', '2 accounts imported');
        cy.get('[data-cy="failed-imports"]').should('contain', '1 account failed');
        
        // Should show detailed error information
        cy.get('[data-cy="import-errors"]').should('be.visible');
        cy.get('[data-cy="import-errors"]').should('contain', 'Invalid secret format');
      });
    });

    it('should handle server errors gracefully', () => {
      // Mock server error
      cy.intercept('GET', '/api/user/profile', {
        statusCode: 500,
        body: {
          error: 'Internal server error',
          errorId: 'ERR-12345'
        }
      }).as('serverError');
      
      cy.visit('/settings/profile');
      cy.wait('@serverError');
      
      // Should show user-friendly error message
      cy.get('[data-cy="server-error"]').should('be.visible');
      cy.get('[data-cy="server-error"]').should('contain', 'Something went wrong');
      cy.get('[data-cy="error-id"]').should('contain', 'ERR-12345');
      
      // Should offer helpful actions
      cy.get('button[data-cy="retry-request"]').should('be.visible');
      cy.get('button[data-cy="contact-support"]').should('be.visible');
    });
  });

  describe('Data Validation and Edge Cases', () => {
    it('should handle extremely large datasets', () => {
      // Mock large number of accounts
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `account-${i}`,
        issuer: `Service ${i}`,
        label: `user${i}@example.com`,
        secret: 'JBSWY3DPEHPK3PXP'
      }));
      
      cy.intercept('GET', '/api/accounts', {
        statusCode: 200,
        body: { accounts: largeDataset }
      }).as('largeDataset');
      
      cy.visit('/accounts');
      cy.wait('@largeDataset');
      
      // Should handle large dataset without crashing
      cy.get('[data-cy="accounts-container"]').should('be.visible');
      
      // Should implement virtualization or pagination
      cy.get('[data-cy="account-card"]').should('have.length.at.most', 50);
      cy.get('[data-cy="load-more"]').should('be.visible');
      
      // Search should work with large dataset
      cy.get('input[data-cy="search-input"]').type('Service 500');
      cy.get('[data-cy="account-card"]').should('have.length', 1);
      cy.get('[data-cy="account-card"]').should('contain', 'Service 500');
    });

    it('should handle special characters in account data', () => {
      const specialCharacters = '!@#$%^&*()_+-=[]{}|;:,.<>?`~';
      
      cy.visit('/accounts');
      cy.get('button[data-cy="add-account-btn"]').click();
      cy.get('[data-cy="manual-entry-tab"]').click();
      
      // Test special characters in issuer name
      cy.get('input[data-cy="account-issuer"]').type(`Test ${specialCharacters}`);
      cy.get('input[data-cy="account-label"]').type('test@example.com');
      cy.get('input[data-cy="account-secret"]').type('JBSWY3DPEHPK3PXP');
      cy.get('button[data-cy="save-account-btn"]').click();
      
      // Should handle special characters properly
      cy.get('[data-cy="toast-success"]').should('be.visible');
      cy.get('[data-cy="account-card"]').should('contain', specialCharacters);
    });

    it('should handle timezone edge cases', () => {
      // Mock different timezone
      cy.window().then((win) => {
        // Override timezone
        const mockDate = new Date('2024-01-15T23:59:58Z'); // Near TOTP boundary
        cy.stub(win.Date, 'now').returns(mockDate.getTime());
      });
      
      cy.fixture('test-accounts').then((accounts) => {
        cy.visit('/accounts');
        cy.addAccount(accounts.validAccounts[0]);
        
        // Should generate code correctly even at TOTP boundary
        cy.get('[data-cy="account-code"]').should('be.visible');
        cy.get('[data-cy="countdown-timer"]').should('contain', '2');
        
        // Wait for code refresh at boundary
        cy.wait(3000);
        cy.get('[data-cy="countdown-timer"]').should('contain', '29');
      });
    });

    it('should handle concurrent modifications', () => {
      cy.fixture('test-accounts').then((accounts) => {
        cy.visit('/accounts');
        cy.addAccount(accounts.validAccounts[0]);
        
        // Start editing account
        cy.get('[data-cy="account-card"]').first().find('button[data-cy="edit-account"]').click();
        cy.get('input[data-cy="edit-issuer"]').clear().type('Updated Issuer');
        
        // Mock concurrent modification from another device
        cy.window().then((win) => {
          (win as any).dispatchEvent(new CustomEvent('account-modified-externally', {
            detail: {
              accountId: 'google-account-123',
              modifiedBy: 'Another Device',
              timestamp: Date.now()
            }
          }));
        });
        
        // Try to save changes
        cy.get('button[data-cy="save-changes"]').click();
        
        // Should show conflict resolution dialog
        cy.get('[data-cy="conflict-resolution-modal"]').should('be.visible');
        cy.get('[data-cy="conflict-message"]').should('contain', 'modified by another device');
        
        // Should offer resolution options
        cy.get('button[data-cy="use-local-changes"]').should('be.visible');
        cy.get('button[data-cy="use-remote-changes"]').should('be.visible');
        cy.get('button[data-cy="merge-changes"]').should('be.visible');
      });
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from database corruption', () => {
      // Mock database corruption
      cy.window().then((win) => {
        (win as any).dispatchEvent(new CustomEvent('database-corruption-detected', {
          detail: {
            table: 'accounts',
            error: 'SQLITE_CORRUPT',
            affectedRecords: 3
          }
        }));
      });
      
      cy.visit('/accounts');
      
      // Should show corruption warning
      cy.get('[data-cy="database-corruption-warning"]').should('be.visible');
      cy.get('[data-cy="database-corruption-warning"]').should('contain', 'Database corruption detected');
      
      // Should offer recovery options
      cy.get('button[data-cy="repair-database"]').should('be.visible');
      cy.get('button[data-cy="restore-from-backup"]').should('be.visible');
      cy.get('button[data-cy="export-readable-data"]').should('be.visible');
      
      // Try repair
      cy.get('button[data-cy="repair-database"]').click();
      
      // Should show repair progress
      cy.get('[data-cy="repair-progress"]').should('be.visible');
      cy.get('[data-cy="repair-status"]').should('contain', 'Repairing database');
    });

    it('should handle storage quota exceeded', () => {
      // Mock storage quota exceeded
      cy.window().then((win) => {
        Object.defineProperty(win.navigator, 'storage', {
          value: {
            estimate: () => Promise.resolve({
              quota: 50000000, // 50MB
              usage: 49000000  // 49MB used
            })
          }
        });
        
        (win as any).dispatchEvent(new CustomEvent('storage-quota-warning', {
          detail: { percentUsed: 98 }
        }));
      });
      
      cy.visit('/settings/storage');
      
      // Should show storage warning
      cy.get('[data-cy="storage-quota-warning"]').should('be.visible');
      cy.get('[data-cy="storage-quota-warning"]').should('contain', '98% of storage used');
      
      // Should offer storage management options
      cy.get('button[data-cy="clear-cache"]').should('be.visible');
      cy.get('button[data-cy="delete-old-backups"]').should('be.visible');
      cy.get('button[data-cy="compress-data"]').should('be.visible');
    });

    it('should implement circuit breaker for failing services', () => {
      let failureCount = 0;
      
      // Mock failing service
      cy.intercept('POST', '/api/sync', (req) => {
        failureCount++;
        if (failureCount < 5) {
          req.reply({
            statusCode: 500,
            body: { error: 'Service temporarily unavailable' }
          });
        } else {
          req.reply({ statusCode: 503, body: { error: 'Circuit breaker open' } });
        }
      }).as('failingSync');
      
      // Try sync multiple times
      cy.visit('/settings/sync');
      
      for (let i = 0; i < 5; i++) {
        cy.get('button[data-cy="sync-now"]').click();
        cy.wait('@failingSync');
        
        if (i < 4) {
          cy.get('[data-cy="sync-error"]').should('contain', 'temporarily unavailable');
        } else {
          cy.get('[data-cy="circuit-breaker-open"]').should('be.visible');
          cy.get('[data-cy="circuit-breaker-open"]').should('contain', 'Service temporarily disabled');
        }
      }
      
      // Should show circuit breaker cooldown
      cy.get('[data-cy="service-cooldown"]').should('be.visible');
      cy.get('[data-cy="cooldown-timer"]').should('be.visible');
    });

    it('should handle memory leaks and cleanup', () => {
      // Mock memory leak detection
      cy.window().then((win) => {
        (win as any).dispatchEvent(new CustomEvent('memory-leak-detected', {
          detail: {
            component: 'AccountsList',
            memoryUsage: 150000000, // 150MB
            threshold: 100000000    // 100MB
          }
        }));
      });
      
      cy.visit('/settings/advanced/memory');
      
      // Should show memory warning
      cy.get('[data-cy="memory-warning"]').should('be.visible');
      cy.get('[data-cy="memory-warning"]').should('contain', 'High memory usage detected');
      
      // Should offer memory management
      cy.get('button[data-cy="force-garbage-collection"]').should('be.visible');
      cy.get('button[data-cy="restart-components"]').should('be.visible');
      cy.get('button[data-cy="clear-memory-cache"]').should('be.visible');
      
      // Trigger garbage collection
      cy.get('button[data-cy="force-garbage-collection"]').click();
      
      cy.get('[data-cy="memory-cleaned"]').should('be.visible');
      cy.contains('Memory usage optimized').should('be.visible');
    });
  });

  describe('Security Monitoring and Alerts', () => {
    it('should detect unusual access patterns', () => {
      // Mock unusual access pattern
      cy.window().then((win) => {
        (win as any).dispatchEvent(new CustomEvent('unusual-access-detected', {
          detail: {
            pattern: 'rapid-account-access',
            accounts: ['Google', 'GitHub', 'Microsoft'],
            timespan: '30 seconds',
            riskLevel: 'medium'
          }
        }));
      });
      
      cy.visit('/dashboard');
      
      // Should show security alert
      cy.get('[data-cy="security-alert"]').should('be.visible');
      cy.get('[data-cy="security-alert"]').should('contain', 'Unusual access pattern detected');
      
      // Should show alert details
      cy.get('button[data-cy="view-alert-details"]').click();
      cy.get('[data-cy="alert-details-modal"]').should('be.visible');
      cy.get('[data-cy="alert-pattern"]').should('contain', 'rapid-account-access');
      cy.get('[data-cy="affected-accounts"]').should('contain', '3 accounts');
    });

    it('should log security events', () => {
      cy.fixture('test-users').then((users) => {
        // Perform various security-relevant actions
        cy.login(users.validUser.email, users.validUser.password, users.validUser.encryptionPassword);
        
        // Change password
        cy.visit('/settings/security');
        cy.get('button[data-cy="change-password"]').click();
        cy.get('input[data-cy="current-password"]').type(users.validUser.password);
        cy.get('input[data-cy="new-password"]').type('NewPassword123!');
        cy.get('input[data-cy="confirm-new-password"]').type('NewPassword123!');
        cy.get('button[data-cy="update-password"]').click();
        
        // View security audit log
        cy.visit('/settings/security/audit');
        
        // Should show security events
        cy.get('[data-cy="security-audit-log"]').should('be.visible');
        cy.get('[data-cy="audit-entry"]').should('contain', 'Password changed');
        cy.get('[data-cy="audit-entry"]').should('contain', 'User login');
        
        // Should show event details
        cy.get('[data-cy="audit-entry"]').first().click();
        cy.get('[data-cy="audit-details"]').should('be.visible');
        cy.get('[data-cy="event-timestamp"]').should('be.visible');
        cy.get('[data-cy="event-ip"]').should('be.visible');
        cy.get('[data-cy="event-user-agent"]').should('be.visible');
      });
    });

    it('should handle security policy violations', () => {
      // Mock security policy violation
      cy.window().then((win) => {
        (win as any).dispatchEvent(new CustomEvent('security-policy-violation', {
          detail: {
            policy: 'max-failed-attempts',
            violation: 'exceeded-threshold',
            value: 6,
            threshold: 5
          }
        }));
      });
      
      // Should show policy violation alert
      cy.get('[data-cy="policy-violation-alert"]').should('be.visible');
      cy.get('[data-cy="policy-violation-alert"]').should('contain', 'Security policy violation');
      
      // Should enforce policy action
      cy.get('[data-cy="account-locked"]').should('be.visible');
      cy.get('button[data-cy="contact-admin"]').should('be.visible');
    });
  });
});