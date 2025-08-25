/**
 * Comprehensive Browser Extension Integration E2E Tests
 * Tests browser extension functionality, auto-fill, sync, and integration with main app
 */

describe('Comprehensive Browser Extension Tests', () => {
  beforeEach(() => {
    cy.cleanup();
    cy.setupEmulator();
    cy.mockExtensionAPI();
    cy.setupTestUser('premium'); // Use premium for full extension features
  });

  describe('Extension Installation and Setup', () => {
    it('should detect extension installation', () => {
      cy.visit('/');
      
      // Mock extension detection
      cy.window().then((win) => {
        (win as any).dispatchEvent(new CustomEvent('extension-detected', {
          detail: { version: '1.0.0', permissions: ['activeTab', 'storage'] }
        }));
      });
      
      // Should show extension detected banner
      cy.get('[data-cy="extension-detected-banner"]').should('be.visible');
      cy.get('[data-cy="extension-detected-banner"]').should('contain', 'Browser extension detected');
      
      // Should show setup button
      cy.get('button[data-cy="setup-extension"]').should('be.visible');
    });

    it('should setup extension sync', () => {
      cy.visit('/settings/extension');
      
      // Connect to extension
      cy.get('button[data-cy="connect-extension"]').click();
      
      // Mock extension connection
      cy.sendExtensionMessage({
        type: 'CONNECT_REQUEST',
        data: { appVersion: '1.0.0' }
      });
      
      // Should show connection success
      cy.get('[data-cy="extension-connected"]').should('be.visible');
      cy.contains('Extension connected successfully').should('be.visible');
      
      // Configure sync settings
      cy.get('input[data-cy="sync-accounts"]').check();
      cy.get('input[data-cy="sync-settings"]').check();
      cy.get('input[data-cy="auto-sync"]').check();
      
      // Set sync frequency
      cy.get('select[data-cy="sync-frequency"]').select('realtime');
      
      cy.get('button[data-cy="save-extension-settings"]').click();
      
      // Should sync accounts to extension
      cy.get('[data-cy="sync-status"]').should('contain', 'Syncing');
      cy.get('[data-cy="sync-complete"]', { timeout: 10000 }).should('be.visible');
      cy.get('[data-cy="synced-accounts-count"]').should('contain', 'accounts synced');
    });

    it('should configure extension permissions', () => {
      cy.visit('/settings/extension');
      
      // Should show required permissions
      cy.get('[data-cy="permissions-list"]').should('be.visible');
      cy.get('[data-cy="permission-activeTab"]').should('contain', 'Access to active tab');
      cy.get('[data-cy="permission-storage"]').should('contain', 'Local storage');
      
      // Should show optional permissions
      cy.get('[data-cy="optional-permissions"]').should('be.visible');
      cy.get('[data-cy="permission-notifications"]').should('contain', 'Show notifications');
      cy.get('[data-cy="permission-contextMenus"]').should('contain', 'Context menu');
      
      // Grant optional permissions
      cy.get('button[data-cy="grant-notifications"]').click();
      
      // Mock permission grant
      cy.window().then((win) => {
        (win as any).dispatchEvent(new CustomEvent('permission-granted', {
          detail: { permission: 'notifications' }
        }));
      });
      
      cy.get('[data-cy="permission-notifications"]').should('contain', 'Granted');
    });
  });

  describe('Extension Auto-fill Functionality', () => {
    beforeEach(() => {
      // Add test accounts
      cy.fixture('test-accounts').then((accounts) => {
        cy.visit('/accounts');
        accounts.validAccounts.slice(0, 3).forEach(account => {
          cy.addAccount(account);
        });
      });
    });

    it('should detect 2FA input fields', () => {
      // Visit mock Google login page
      cy.visit('/test-pages/google-2fa');
      
      // Mock extension content script detection
      cy.window().then((win) => {
        (win as any).dispatchEvent(new CustomEvent('2fa-field-detected', {
          detail: {
            domain: 'accounts.google.com',
            selector: 'input[name="totpPin"]',
            type: 'totp'
          }
        }));
      });
      
      // Should show extension overlay
      cy.get('[data-cy="extension-overlay"]').should('be.visible');
      cy.get('[data-cy="detected-field"]').should('be.visible');
      cy.get('[data-cy="field-type"]').should('contain', 'TOTP');
    });

    it('should auto-fill 2FA codes', () => {
      cy.visit('/test-pages/google-2fa');
      
      // Mock 2FA input field
      cy.get('body').then($body => {
        $body.append('<input name="totpPin" id="totpPin" placeholder="Enter 6-digit code">');
      });
      
      // Trigger extension auto-fill
      cy.sendExtensionMessage({
        type: 'AUTO_FILL_REQUEST',
        data: {
          domain: 'accounts.google.com',
          selector: 'input[name="totpPin"]'
        }
      });
      
      // Mock extension response with code
      cy.window().then((win) => {
        (win as any).dispatchEvent(new CustomEvent('auto-fill-complete', {
          detail: {
            code: '123456',
            issuer: 'Google',
            success: true
          }
        }));
      });
      
      // Should fill the input
      cy.get('input[name="totpPin"]').should('have.value', '123456');
      
      // Should show success notification
      cy.get('[data-cy="auto-fill-success"]').should('be.visible');
      cy.get('[data-cy="auto-fill-success"]').should('contain', 'Code filled for Google');
    });

    it('should handle multiple account matches', () => {
      // Add multiple Google accounts
      cy.fixture('test-accounts').then((accounts) => {
        cy.visit('/accounts');
        cy.addAccount({
          issuer: 'Google',
          label: 'personal@gmail.com',
          secret: 'PERSONAL_SECRET_123'
        });
        cy.addAccount({
          issuer: 'Google',
          label: 'work@gmail.com',
          secret: 'WORK_SECRET_456'
        });
      });
      
      cy.visit('/test-pages/google-2fa');
      
      // Trigger auto-fill
      cy.sendExtensionMessage({
        type: 'AUTO_FILL_REQUEST',
        data: { domain: 'accounts.google.com' }
      });
      
      // Should show account selector
      cy.get('[data-cy="account-selector-modal"]').should('be.visible');
      cy.get('[data-cy="account-option"]').should('have.length', 3); // Original + 2 new
      
      // Select specific account
      cy.get('[data-cy="account-option"]').contains('personal@gmail.com').click();
      
      // Should auto-fill with selected account
      cy.get('input[name="totpPin"]').should('have.value').and('match', /^\d{6}$/);
    });

    it('should handle auto-fill failures', () => {
      cy.visit('/test-pages/google-2fa');
      
      // Mock extension error
      cy.sendExtensionMessage({
        type: 'AUTO_FILL_ERROR',
        data: {
          error: 'No matching accounts found',
          domain: 'unknown-site.com'
        }
      });
      
      // Should show error notification
      cy.get('[data-cy="auto-fill-error"]').should('be.visible');
      cy.get('[data-cy="auto-fill-error"]').should('contain', 'No matching accounts');
      
      // Should offer manual selection
      cy.get('button[data-cy="manual-select"]').should('be.visible');
      cy.get('button[data-cy="manual-select"]').click();
      
      cy.get('[data-cy="manual-account-selector"]').should('be.visible');
    });

    it('should respect auto-fill preferences', () => {
      // Configure auto-fill settings
      cy.visit('/settings/extension');
      cy.get('input[data-cy="enable-auto-fill"]').check();
      cy.get('input[data-cy="require-confirmation"]').check();
      cy.get('select[data-cy="auto-fill-delay"]').select('2'); // 2 second delay
      cy.get('button[data-cy="save-extension-settings"]').click();
      
      cy.visit('/test-pages/google-2fa');
      
      // Trigger auto-fill
      cy.sendExtensionMessage({
        type: 'AUTO_FILL_REQUEST',
        data: { domain: 'accounts.google.com' }
      });
      
      // Should show confirmation dialog first
      cy.get('[data-cy="auto-fill-confirmation"]').should('be.visible');
      cy.get('[data-cy="auto-fill-confirmation"]').should('contain', 'Fill code for Google?');
      
      cy.get('button[data-cy="confirm-auto-fill"]').click();
      
      // Should wait for delay then fill
      cy.wait(2000);
      cy.get('input[name="totpPin"]').should('have.value').and('match', /^\d{6}$/);
    });
  });

  describe('Extension Context Menu Integration', () => {
    it('should show context menu options', () => {
      cy.visit('/accounts');
      
      // Mock context menu activation
      cy.get('[data-cy="account-card"]').first().rightclick();
      
      // Mock extension context menu
      cy.window().then((win) => {
        (win as any).dispatchEvent(new CustomEvent('context-menu-shown', {
          detail: {
            options: [
              { id: 'copy-code', label: 'Copy 2FA Code' },
              { id: 'copy-next-code', label: 'Copy Next Code' },
              { id: 'open-website', label: 'Open Website' }
            ]
          }
        }));
      });
      
      // Should show extension context menu
      cy.get('[data-cy="extension-context-menu"]').should('be.visible');
      cy.get('[data-cy="context-option-copy-code"]').should('be.visible');
      cy.get('[data-cy="context-option-open-website"]').should('be.visible');
    });

    it('should handle context menu actions', () => {
      cy.visit('/accounts');
      
      // Click context menu option
      cy.sendExtensionMessage({
        type: 'CONTEXT_MENU_CLICK',
        data: {
          action: 'copy-code',
          accountId: 'google-account-123'
        }
      });
      
      // Should copy code to clipboard
      cy.get('[data-cy="toast-success"]').should('contain', 'Code copied');
      
      // Test open website action
      cy.sendExtensionMessage({
        type: 'CONTEXT_MENU_CLICK',
        data: {
          action: 'open-website',
          accountId: 'google-account-123'
        }
      });
      
      // Mock opening new tab
      cy.window().then((win) => {
        (win as any).dispatchEvent(new CustomEvent('tab-opened', {
          detail: { url: 'https://accounts.google.com' }
        }));
      });
    });
  });

  describe('Extension Sync and Communication', () => {
    beforeEach(() => {
      // Setup some test accounts
      cy.fixture('test-accounts').then((accounts) => {
        cy.visit('/accounts');
        accounts.validAccounts.slice(0, 2).forEach(account => {
          cy.addAccount(account);
        });
      });
    });

    it('should sync accounts to extension', () => {
      cy.visit('/settings/extension');
      
      // Trigger manual sync
      cy.get('button[data-cy="sync-now"]').click();
      
      // Should show sync progress
      cy.get('[data-cy="sync-progress"]').should('be.visible');
      
      // Mock extension sync response
      cy.window().then((win) => {
        (win as any).dispatchEvent(new CustomEvent('sync-complete', {
          detail: {
            accountsSynced: 2,
            settingsSynced: true,
            lastSync: new Date().toISOString()
          }
        }));
      });
      
      // Should show sync success
      cy.get('[data-cy="sync-success"]').should('be.visible');
      cy.get('[data-cy="sync-success"]').should('contain', '2 accounts synced');
      
      // Should update last sync time
      cy.get('[data-cy="last-sync-time"]').should('contain', 'Just now');
    });

    it('should handle sync conflicts', () => {
      // Mock sync conflict
      cy.sendExtensionMessage({
        type: 'SYNC_CONFLICT',
        data: {
          conflicts: [
            {
              id: 'google-account',
              localLabel: 'user@gmail.com',
              extensionLabel: 'updated.user@gmail.com',
              localUpdated: '2024-01-15T10:00:00Z',
              extensionUpdated: '2024-01-15T11:00:00Z'
            }
          ]
        }
      });
      
      // Should show conflict resolution dialog
      cy.get('[data-cy="sync-conflict-modal"]').should('be.visible');
      cy.get('[data-cy="conflict-item"]').should('contain', 'Google');
      
      // Show conflict details
      cy.get('[data-cy="local-version"]').should('contain', 'user@gmail.com');
      cy.get('[data-cy="extension-version"]').should('contain', 'updated.user@gmail.com');
      
      // Choose resolution
      cy.get('select[data-cy="conflict-resolution"]').select('use-extension');
      cy.get('button[data-cy="resolve-conflict"]').click();
      
      // Should resolve conflict
      cy.get('[data-cy="conflict-resolved"]').should('be.visible');
    });

    it('should handle bidirectional sync', () => {
      cy.visit('/accounts');
      
      // Add account in main app
      cy.fixture('test-accounts').then((accounts) => {
        const newAccount = accounts.validAccounts[2]; // Microsoft
        cy.addAccount(newAccount);
      });
      
      // Should automatically sync to extension
      cy.get('[data-cy="sync-notification"]').should('be.visible');
      cy.get('[data-cy="sync-notification"]').should('contain', 'Synced to extension');
      
      // Mock account addition from extension
      cy.sendExtensionMessage({
        type: 'ACCOUNT_ADDED',
        data: {
          issuer: 'Dropbox',
          label: 'extension@dropbox.com',
          secret: 'EXTENSION_SECRET_123'
        }
      });
      
      // Should show new account from extension
      cy.get('[data-cy="extension-sync-notification"]').should('be.visible');
      cy.reload();
      cy.get('[data-cy="account-card"]').should('contain', 'Dropbox');
    });

    it('should sync settings changes', () => {
      // Change theme in main app
      cy.visit('/settings/appearance');
      cy.get('input[data-cy="theme-dark"]').check();
      cy.get('button[data-cy="save-appearance"]').click();
      
      // Should sync theme to extension
      cy.sendExtensionMessage({
        type: 'SETTINGS_SYNC_REQUEST',
        data: { setting: 'theme' }
      });
      
      // Mock extension applying theme
      cy.window().then((win) => {
        (win as any).dispatchEvent(new CustomEvent('extension-theme-applied', {
          detail: { theme: 'dark' }
        }));
      });
      
      cy.get('[data-cy="extension-theme-synced"]').should('be.visible');
    });
  });

  describe('Extension Security Features', () => {
    it('should verify extension authenticity', () => {
      cy.visit('/settings/extension');
      
      // Mock extension verification
      cy.sendExtensionMessage({
        type: 'VERIFY_EXTENSION',
        data: {
          extensionId: 'abcdefghijklmnopqrstuvwxyz123456',
          signature: 'valid-signature-hash'
        }
      });
      
      // Should verify extension
      cy.get('[data-cy="extension-verification"]').should('be.visible');
      cy.get('[data-cy="verification-status"]').should('contain', 'Verified');
      cy.get('[data-cy="extension-id"]').should('contain', 'abcdefg...');
      
      // Test invalid extension
      cy.sendExtensionMessage({
        type: 'VERIFY_EXTENSION',
        data: {
          extensionId: 'invalid-extension-id',
          signature: 'invalid-signature'
        }
      });
      
      cy.get('[data-cy="verification-warning"]').should('be.visible');
      cy.get('[data-cy="verification-warning"]').should('contain', 'Unverified extension');
    });

    it('should handle secure communication', () => {
      cy.visit('/settings/extension');
      
      // Enable secure communication
      cy.get('input[data-cy="require-encryption"]').check();
      cy.get('input[data-cy="verify-messages"]').check();
      
      // Generate communication key
      cy.get('button[data-cy="generate-comm-key"]').click();
      
      // Should show key exchange
      cy.get('[data-cy="key-exchange-modal"]').should('be.visible');
      cy.get('[data-cy="public-key"]').should('be.visible');
      
      // Mock extension key exchange
      cy.sendExtensionMessage({
        type: 'KEY_EXCHANGE',
        data: {
          publicKey: 'extension-public-key-123',
          encrypted: true
        }
      });
      
      cy.get('[data-cy="secure-connection-established"]').should('be.visible');
    });

    it('should handle extension permissions changes', () => {
      cy.visit('/settings/extension');
      
      // Mock permission revocation
      cy.sendExtensionMessage({
        type: 'PERMISSION_CHANGED',
        data: {
          permission: 'activeTab',
          granted: false
        }
      });
      
      // Should show permission warning
      cy.get('[data-cy="permission-warning"]').should('be.visible');
      cy.get('[data-cy="permission-warning"]').should('contain', 'activeTab permission revoked');
      
      // Should disable affected features
      cy.get('[data-cy="auto-fill-disabled"]').should('be.visible');
      cy.get('button[data-cy="restore-permissions"]').should('be.visible');
    });
  });

  describe('Extension Troubleshooting and Diagnostics', () => {
    it('should diagnose connection issues', () => {
      cy.visit('/settings/extension');
      
      // Simulate connection failure
      cy.sendExtensionMessage({
        type: 'CONNECTION_ERROR',
        data: {
          error: 'Extension not responding',
          code: 'TIMEOUT'
        }
      });
      
      // Should show diagnostic tools
      cy.get('[data-cy="connection-error"]').should('be.visible');
      cy.get('button[data-cy="diagnose-connection"]').should('be.visible');
      
      cy.get('button[data-cy="diagnose-connection"]').click();
      
      // Should run diagnostics
      cy.get('[data-cy="diagnostic-progress"]').should('be.visible');
      
      // Mock diagnostic results
      cy.window().then((win) => {
        (win as any).dispatchEvent(new CustomEvent('diagnostic-complete', {
          detail: {
            extensionDetected: false,
            permissionsGranted: true,
            communicationWorking: false,
            suggestions: ['Reload extension', 'Check permissions']
          }
        }));
      });
      
      // Should show diagnostic results
      cy.get('[data-cy="diagnostic-results"]').should('be.visible');
      cy.get('[data-cy="diagnostic-suggestions"]').should('contain', 'Reload extension');
    });

    it('should provide extension logs', () => {
      cy.visit('/settings/extension/debug');
      
      // View extension logs
      cy.get('button[data-cy="view-extension-logs"]').click();
      
      // Mock extension logs
      cy.sendExtensionMessage({
        type: 'LOGS_REQUEST_RESPONSE',
        data: {
          logs: [
            { level: 'info', message: 'Extension initialized', timestamp: Date.now() - 60000 },
            { level: 'warn', message: 'Auto-fill field not found', timestamp: Date.now() - 30000 },
            { level: 'error', message: 'Sync failed: Network error', timestamp: Date.now() - 10000 }
          ]
        }
      });
      
      // Should show logs
      cy.get('[data-cy="extension-logs"]').should('be.visible');
      cy.get('[data-cy="log-entry"]').should('have.length', 3);
      
      // Filter logs by level
      cy.get('select[data-cy="log-level-filter"]').select('error');
      cy.get('[data-cy="log-entry"]').should('have.length', 1);
      cy.get('[data-cy="log-entry"]').should('contain', 'Sync failed');
    });

    it('should test extension functionality', () => {
      cy.visit('/settings/extension/test');
      
      // Test sync functionality
      cy.get('button[data-cy="test-sync"]').click();
      
      cy.get('[data-cy="test-progress"]').should('be.visible');
      cy.get('[data-cy="test-sync-result"]', { timeout: 10000 }).should('contain', 'Sync test passed');
      
      // Test auto-fill functionality
      cy.get('button[data-cy="test-auto-fill"]').click();
      
      cy.get('[data-cy="test-auto-fill-result"]', { timeout: 10000 }).should('contain', 'Auto-fill test passed');
      
      // Test communication
      cy.get('button[data-cy="test-communication"]').click();
      
      cy.get('[data-cy="test-communication-result"]', { timeout: 10000 }).should('contain', 'Communication test passed');
      
      // Generate test report
      cy.get('button[data-cy="generate-test-report"]').click();
      
      cy.get('[data-cy="test-report"]').should('be.visible');
      cy.get('[data-cy="test-summary"]').should('contain', 'All tests passed');
    });
  });

  describe('Extension Analytics and Usage', () => {
    it('should track extension usage', () => {
      cy.visit('/settings/extension/analytics');
      
      // Mock usage statistics
      cy.window().then((win) => {
        (win as any).mockExtensionStats = {
          autoFillsToday: 15,
          autoFillsThisWeek: 87,
          mostUsedSites: ['google.com', 'github.com', 'microsoft.com'],
          successRate: 94.5,
          averageResponseTime: 120
        };
      });
      
      // Should show usage stats
      cy.get('[data-cy="extension-stats"]').should('be.visible');
      cy.get('[data-cy="auto-fills-today"]').should('contain', '15');
      cy.get('[data-cy="auto-fills-week"]').should('contain', '87');
      cy.get('[data-cy="success-rate"]').should('contain', '94.5%');
      
      // Should show top sites
      cy.get('[data-cy="top-sites"]').should('contain', 'google.com');
      cy.get('[data-cy="top-sites"]').should('contain', 'github.com');
      
      // View detailed analytics
      cy.get('button[data-cy="view-detailed-analytics"]').click();
      
      cy.get('[data-cy="analytics-chart"]').should('be.visible');
      cy.get('[data-cy="usage-timeline"]').should('be.visible');
    });

    it('should export extension data', () => {
      cy.visit('/settings/extension/export');
      
      // Export extension settings and data
      cy.get('button[data-cy="export-extension-data"]').click();
      
      // Choose what to export
      cy.get('input[data-cy="export-settings"]').check();
      cy.get('input[data-cy="export-usage-stats"]').check();
      cy.get('input[data-cy="export-site-mappings"]').check();
      
      cy.get('button[data-cy="generate-export"]').click();
      
      // Should generate export
      cy.get('[data-cy="export-progress"]').should('be.visible');
      cy.get('[data-cy="export-complete"]', { timeout: 30000 }).should('be.visible');
      cy.get('[data-cy="download-export"]').should('be.visible');
    });
  });
});