/**
 * Comprehensive Settings Management E2E Tests
 * Tests all settings functionality including security, appearance, preferences, and configuration
 */

describe('Comprehensive Settings Tests', () => {
  beforeEach(() => {
    cy.cleanup();
    cy.setupEmulator();
    cy.setupTestUser('premium'); // Use premium for full settings access
  });

  describe('Security Settings', () => {
    it('should configure auto-lock settings', () => {
      cy.visit('/settings/security');
      
      // Enable auto-lock
      cy.get('input[data-cy="enable-auto-lock"]').check();
      
      // Set timeout
      cy.get('select[data-cy="lock-timeout"]').select('300'); // 5 minutes
      
      // Enable lock on background
      cy.get('input[data-cy="lock-on-background"]').check();
      
      // Save settings
      cy.get('button[data-cy="save-security-settings"]').click();
      cy.get('[data-cy="toast-success"]').should('contain', 'Security settings saved');
      
      // Verify settings persist after refresh
      cy.reload();
      cy.get('input[data-cy="enable-auto-lock"]').should('be.checked');
      cy.get('select[data-cy="lock-timeout"]').should('have.value', '300');
      cy.get('input[data-cy="lock-on-background"]').should('be.checked');
    });

    it('should configure biometric authentication', () => {
      cy.mockBiometric(true);
      cy.visit('/settings/security');
      
      // Check biometric availability
      cy.get('[data-cy="biometric-status"]').should('contain', 'Available');
      
      // Enable biometric auth
      cy.get('input[data-cy="enable-biometric"]').check();
      
      // Should prompt for biometric verification
      cy.get('[data-cy="biometric-setup-modal"]').should('be.visible');
      cy.get('button[data-cy="verify-biometric"]').click();
      
      // Mock successful verification
      cy.window().then((win) => {
        (win as any).dispatchEvent(new CustomEvent('biometric-verified', {
          detail: { success: true }
        }));
      });
      
      // Should enable biometric auth
      cy.get('[data-cy="biometric-enabled"]').should('be.visible');
      cy.contains('Biometric authentication enabled').should('be.visible');
      
      // Configure biometric settings
      cy.get('input[data-cy="biometric-for-unlock"]').check();
      cy.get('input[data-cy="biometric-for-code-copy"]').check();
      cy.get('input[data-cy="fallback-to-password"]').check();
      
      cy.get('button[data-cy="save-security-settings"]').click();
    });

    it('should manage encryption password', () => {
      cy.visit('/settings/security');
      
      cy.get('button[data-cy="change-encryption-password"]').click();
      
      // Enter current password
      cy.get('input[data-cy="current-encryption-password"]').type('TestEncryption123!');
      
      // Enter new password
      cy.get('input[data-cy="new-encryption-password"]').type('NewEncryption456!');
      cy.get('input[data-cy="confirm-new-encryption-password"]').type('NewEncryption456!');
      
      // Update hint
      cy.get('input[data-cy="new-encryption-hint"]').type('New encryption hint for testing');
      
      // Confirm change
      cy.get('button[data-cy="update-encryption-password"]').click();
      
      // Should show progress
      cy.get('[data-cy="encryption-update-progress"]').should('be.visible');
      cy.get('[data-cy="progress-text"]').should('contain', 'Re-encrypting accounts');
      
      // Should complete successfully
      cy.get('[data-cy="encryption-updated"]', { timeout: 30000 }).should('be.visible');
      cy.contains('Encryption password updated').should('be.visible');
    });

    it('should configure privacy settings', () => {
      cy.visit('/settings/security/privacy');
      
      // Enable privacy mode
      cy.get('input[data-cy="privacy-mode"]').check();
      
      // Configure privacy options
      cy.get('input[data-cy="hide-codes-by-default"]').check();
      cy.get('input[data-cy="prevent-screenshots"]').check();
      cy.get('input[data-cy="secure-clipboard"]').check();
      
      // Set code reveal timeout
      cy.get('input[data-cy="code-reveal-timeout"]').clear().type('10');
      
      // Configure sensitive data handling
      cy.get('input[data-cy="blur-on-app-switch"]').check();
      cy.get('input[data-cy="disable-text-selection"]').check();
      
      cy.get('button[data-cy="save-privacy-settings"]').click();
      cy.get('[data-cy="toast-success"]').should('be.visible');
      
      // Test privacy mode in action
      cy.visit('/accounts');
      
      // Codes should be hidden by default
      cy.get('[data-cy="account-code"]').should('contain', '••••••');
      
      // Reveal should work
      cy.get('[data-cy="account-card"]').first().find('button[data-cy="reveal-code"]').click();
      cy.get('[data-cy="account-code"]').should('match', /^\d{6}$/);
      
      // Should auto-hide after timeout
      cy.wait(11000); // Wait for timeout + buffer
      cy.get('[data-cy="account-code"]').should('contain', '••••••');
    });

    it('should manage trusted devices', () => {
      cy.visit('/settings/security/devices');
      
      // Should show current device
      cy.get('[data-cy="current-device"]').should('be.visible');
      cy.get('[data-cy="device-name"]').should('contain', 'Chrome');
      cy.get('[data-cy="device-os"]').should('contain', 'Linux');
      
      // Mock additional devices
      cy.window().then((win) => {
        (win as any).mockTrustedDevices = [
          { id: '1', name: 'iPhone 15 Pro', os: 'iOS 17.0', lastSeen: '2024-01-15T10:30:00Z', trusted: true },
          { id: '2', name: 'MacBook Pro', os: 'macOS 14.0', lastSeen: '2024-01-14T08:00:00Z', trusted: true },
          { id: '3', name: 'Unknown Device', os: 'Android 13', lastSeen: '2024-01-10T15:20:00Z', trusted: false }
        ];
      });
      
      cy.reload(); // Trigger device list update
      
      // Should show all devices
      cy.get('[data-cy="device-list"]').should('be.visible');
      cy.get('[data-cy="trusted-device"]').should('have.length', 2);
      cy.get('[data-cy="untrusted-device"]').should('have.length', 1);
      
      // Revoke access from untrusted device
      cy.get('[data-cy="untrusted-device"]').find('button[data-cy="revoke-access"]').click();
      cy.get('[data-cy="revoke-confirmation-modal"]').should('be.visible');
      cy.get('button[data-cy="confirm-revoke"]').click();
      
      cy.get('[data-cy="toast-success"]').should('contain', 'Device access revoked');
      
      // Configure device trust settings
      cy.get('input[data-cy="require-device-approval"]').check();
      cy.get('input[data-cy="auto-trust-after-days"]').clear().type('30');
      cy.get('input[data-cy="notify-new-devices"]').check();
      
      cy.get('button[data-cy="save-device-settings"]').click();
    });

    it('should configure two-factor authentication for account', () => {
      cy.visit('/settings/security/2fa');
      
      // Setup 2FA for the account itself
      cy.get('button[data-cy="setup-account-2fa"]').click();
      
      // Should show QR code and secret
      cy.get('[data-cy="2fa-qr-code"]').should('be.visible');
      cy.get('[data-cy="2fa-secret"]').should('be.visible');
      cy.get('[data-cy="backup-codes"]').should('be.visible');
      
      // Save backup codes
      cy.get('button[data-cy="download-backup-codes"]').click();
      
      // Enter verification code
      cy.get('input[data-cy="2fa-verification-code"]').type('123456');
      cy.get('button[data-cy="verify-2fa-setup"]').click();
      
      // Should enable 2FA
      cy.get('[data-cy="2fa-enabled"]').should('be.visible');
      cy.contains('Two-factor authentication enabled').should('be.visible');
      
      // Should show recovery options
      cy.get('[data-cy="2fa-recovery"]').should('be.visible');
      cy.get('button[data-cy="generate-new-backup-codes"]').should('be.visible');
      cy.get('button[data-cy="disable-2fa"]').should('be.visible');
    });
  });

  describe('Appearance and Theme Settings', () => {
    it('should change application theme', () => {
      cy.visit('/settings/appearance');
      
      // Should show theme options
      cy.get('[data-cy="theme-selector"]').should('be.visible');
      cy.get('input[data-cy="theme-light"]').should('be.visible');
      cy.get('input[data-cy="theme-dark"]').should('be.visible');
      cy.get('input[data-cy="theme-auto"]').should('be.visible');
      
      // Select dark theme
      cy.get('input[data-cy="theme-dark"]').check();
      
      // Should apply theme immediately
      cy.get('body').should('have.class', 'dark-theme');
      
      // Select light theme
      cy.get('input[data-cy="theme-light"]').check();
      cy.get('body').should('have.class', 'light-theme');
      
      // Select auto theme
      cy.get('input[data-cy="theme-auto"]').check();
      
      // Should follow system preference
      cy.window().then((win) => {
        // Mock system dark mode
        Object.defineProperty(win, 'matchMedia', {
          writable: true,
          value: cy.stub().returns({ matches: true, addListener: cy.stub(), removeListener: cy.stub() })
        });
      });
      
      cy.reload();
      cy.get('body').should('have.class', 'dark-theme');
    });

    it('should customize UI colors and branding', () => {
      cy.visit('/settings/appearance');
      
      // Primary color customization
      cy.get('[data-cy="primary-color-picker"]').click();
      cy.get('[data-cy="color-palette"]').find('[data-color="#10B981"]').click(); // Green
      
      // Should update primary color immediately
      cy.get('[data-cy="color-preview"]').should('have.css', 'background-color', 'rgb(16, 185, 129)');
      
      // Accent color
      cy.get('[data-cy="accent-color-picker"]').click();
      cy.get('[data-cy="color-palette"]').find('[data-color="#F59E0B"]').click(); // Amber
      
      // Background customization
      cy.get('select[data-cy="background-pattern"]').select('dots');
      cy.get('input[data-cy="background-opacity"]').invoke('val', 0.1).trigger('input');
      
      // Font size
      cy.get('select[data-cy="font-size"]').select('large');
      
      // Icon style
      cy.get('select[data-cy="icon-style"]').select('filled');
      
      // Save appearance settings
      cy.get('button[data-cy="save-appearance"]').click();
      cy.get('[data-cy="toast-success"]').should('contain', 'Appearance settings saved');
      
      // Verify changes persist
      cy.reload();
      cy.get('[data-cy="color-preview"]').should('have.css', 'background-color', 'rgb(16, 185, 129)');
      cy.get('select[data-cy="font-size"]').should('have.value', 'large');
    });

    it('should customize account card display', () => {
      cy.visit('/settings/appearance/accounts');
      
      // Card layout options
      cy.get('input[data-cy="card-layout-compact"]').check();
      
      // Show/hide elements
      cy.get('input[data-cy="show-account-icons"]').check();
      cy.get('input[data-cy="show-issuer-labels"]').check();
      cy.get('input[data-cy="show-progress-rings"]').check();
      cy.get('input[data-cy="show-copy-buttons"]').check();
      
      // Code display options
      cy.get('input[data-cy="monospace-codes"]').check();
      cy.get('select[data-cy="code-size"]').select('large');
      cy.get('input[data-cy="highlight-expiring-codes"]').check();
      
      // Animation preferences
      cy.get('input[data-cy="enable-animations"]').check();
      cy.get('select[data-cy="animation-speed"]').select('fast');
      cy.get('input[data-cy="reduce-motion"]').uncheck();
      
      cy.get('button[data-cy="save-display-settings"]').click();
      
      // Test changes on accounts page
      cy.visit('/accounts');
      
      // Should use compact layout
      cy.get('[data-cy="account-card"]').should('have.class', 'compact-layout');
      
      // Should show all enabled elements
      cy.get('[data-cy="account-icon"]').should('be.visible');
      cy.get('[data-cy="progress-ring"]').should('be.visible');
      cy.get('[data-cy="copy-button"]').should('be.visible');
      
      // Codes should use monospace font
      cy.get('[data-cy="account-code"]').should('have.css', 'font-family').and('include', 'monospace');
    });

    it('should configure dashboard layout', () => {
      cy.visit('/settings/appearance/dashboard');
      
      // Widget configuration
      cy.get('input[data-cy="show-usage-stats"]').check();
      cy.get('input[data-cy="show-recent-activity"]').check();
      cy.get('input[data-cy="show-security-alerts"]').check();
      cy.get('input[data-cy="show-quick-actions"]').check();
      
      // Layout preferences
      cy.get('select[data-cy="dashboard-columns"]').select('3');
      cy.get('input[data-cy="enable-widget-dragging"]').check();
      
      // Quick stats
      cy.get('input[data-cy="show-account-count"]').check();
      cy.get('input[data-cy="show-backup-status"]').check();
      cy.get('input[data-cy="show-sync-status"]').check();
      
      cy.get('button[data-cy="save-dashboard-settings"]').click();
      
      // Verify dashboard layout
      cy.visit('/dashboard');
      
      cy.get('[data-cy="dashboard-grid"]').should('have.class', 'columns-3');
      cy.get('[data-cy="usage-stats-widget"]').should('be.visible');
      cy.get('[data-cy="recent-activity-widget"]').should('be.visible');
      cy.get('[data-cy="security-alerts-widget"]').should('be.visible');
      cy.get('[data-cy="quick-actions-widget"]').should('be.visible');
    });
  });

  describe('General Preferences', () => {
    it('should configure notification preferences', () => {
      cy.visit('/settings/notifications');
      
      // Email notifications
      cy.get('input[data-cy="email-security-alerts"]').check();
      cy.get('input[data-cy="email-backup-reports"]').check();
      cy.get('input[data-cy="email-account-changes"]').check();
      cy.get('input[data-cy="email-marketing"]').uncheck();
      
      // Push notifications (if supported)
      cy.get('input[data-cy="push-new-device"]').check();
      cy.get('input[data-cy="push-failed-login"]').check();
      cy.get('input[data-cy="push-backup-completed"]').check();
      
      // In-app notifications
      cy.get('input[data-cy="inapp-tips"]').check();
      cy.get('input[data-cy="inapp-updates"]').check();
      cy.get('input[data-cy="inapp-achievements"]').uncheck();
      
      // Notification timing
      cy.get('select[data-cy="quiet-hours-start"]').select('22:00');
      cy.get('select[data-cy="quiet-hours-end"]').select('08:00');
      cy.get('input[data-cy="weekend-notifications"]').uncheck();
      
      cy.get('button[data-cy="save-notification-settings"]').click();
      cy.get('[data-cy="toast-success"]').should('contain', 'Notification preferences saved');
      
      // Test notification
      cy.get('button[data-cy="test-notifications"]').click();
      cy.get('[data-cy="test-notification"]').should('be.visible');
    });

    it('should configure language and localization', () => {
      cy.visit('/settings/language');
      
      // Language selection
      cy.get('select[data-cy="app-language"]').select('es'); // Spanish
      
      // Should show language change confirmation
      cy.get('[data-cy="language-change-modal"]').should('be.visible');
      cy.get('[data-cy="language-preview"]').should('contain', 'Configuración'); // Settings in Spanish
      cy.get('button[data-cy="apply-language-change"]').click();
      
      // Should reload with new language
      cy.get('h1, h2').should('contain', 'Configuración');
      
      // Region and formatting
      cy.get('select[data-cy="region"]').select('ES'); // Spain
      cy.get('select[data-cy="timezone"]').select('Europe/Madrid');
      cy.get('select[data-cy="date-format"]').select('DD/MM/YYYY');
      cy.get('select[data-cy="time-format"]').select('24');
      
      // Number formatting
      cy.get('select[data-cy="number-format"]').select('1.234,56');
      
      cy.get('button[data-cy="save-localization"]').click();
      
      // Switch back to English for rest of tests
      cy.get('select[data-cy="app-language"]').select('en');
      cy.get('button[data-cy="apply-language-change"]').click();
    });

    it('should configure import/export preferences', () => {
      cy.visit('/settings/import-export');
      
      // Default export format
      cy.get('select[data-cy="default-export-format"]').select('2fa-studio');
      
      // Export options
      cy.get('input[data-cy="include-icons"]').check();
      cy.get('input[data-cy="include-categories"]').check();
      cy.get('input[data-cy="include-usage-stats"]').uncheck();
      
      // Encryption preferences
      cy.get('input[data-cy="always-encrypt-exports"]').check();
      cy.get('select[data-cy="encryption-strength"]').select('aes-256');
      
      // Import preferences
      cy.get('input[data-cy="auto-detect-format"]').check();
      cy.get('input[data-cy="skip-duplicates"]').check();
      cy.get('select[data-cy="duplicate-strategy"]').select('rename');
      
      // Backup preferences
      cy.get('input[data-cy="backup-before-import"]').check();
      cy.get('input[data-cy="verify-imports"]').check();
      
      cy.get('button[data-cy="save-import-export-settings"]').click();
      
      // Test export with preferences
      cy.visit('/accounts');
      cy.get('button[data-cy="export-accounts"]').click();
      
      // Should use preferred settings
      cy.get('select[data-cy="export-format"]').should('have.value', '2fa-studio');
      cy.get('input[data-cy="include-icons"]').should('be.checked');
      cy.get('input[data-cy="encrypt-export"]').should('be.checked');
    });

    it('should manage keyboard shortcuts', () => {
      cy.visit('/settings/shortcuts');
      
      // Should show current shortcuts
      cy.get('[data-cy="shortcuts-list"]').should('be.visible');
      cy.get('[data-shortcut="copy-code"]').should('contain', 'Ctrl+C');
      cy.get('[data-shortcut="add-account"]').should('contain', 'Ctrl+N');
      cy.get('[data-shortcut="search"]').should('contain', 'Ctrl+F');
      
      // Customize shortcut
      cy.get('[data-shortcut="copy-code"]').find('button[data-cy="edit-shortcut"]').click();
      
      cy.get('[data-cy="shortcut-recorder"]').should('be.visible');
      cy.get('[data-cy="shortcut-input"]').type('{ctrl+shift+c}');
      cy.get('button[data-cy="save-shortcut"]').click();
      
      // Should update shortcut
      cy.get('[data-shortcut="copy-code"]').should('contain', 'Ctrl+Shift+C');
      
      // Test shortcut conflict detection
      cy.get('[data-shortcut="add-account"]').find('button[data-cy="edit-shortcut"]').click();
      cy.get('[data-cy="shortcut-input"]').type('{ctrl+shift+c}'); // Same as copy-code
      
      cy.get('[data-cy="shortcut-conflict"]').should('be.visible');
      cy.get('[data-cy="shortcut-conflict"]').should('contain', 'already assigned');
      
      // Reset to defaults
      cy.get('button[data-cy="reset-shortcuts"]').click();
      cy.get('[data-cy="reset-confirmation"]').should('be.visible');
      cy.get('button[data-cy="confirm-reset"]').click();
      
      cy.get('[data-shortcut="copy-code"]').should('contain', 'Ctrl+C');
    });
  });

  describe('Advanced Configuration', () => {
    it('should configure sync settings', () => {
      cy.visit('/settings/sync');
      
      // Enable real-time sync
      cy.get('input[data-cy="enable-realtime-sync"]').check();
      
      // Sync frequency
      cy.get('select[data-cy="sync-frequency"]').select('immediate');
      
      // Conflict resolution
      cy.get('select[data-cy="conflict-resolution"]').select('newest-wins');
      
      // Sync scope
      cy.get('input[data-cy="sync-accounts"]').check();
      cy.get('input[data-cy="sync-settings"]').check();
      cy.get('input[data-cy="sync-folders"]').check();
      cy.get('input[data-cy="sync-usage-stats"]').uncheck();
      
      // Network preferences
      cy.get('input[data-cy="sync-on-cellular"]').uncheck();
      cy.get('input[data-cy="sync-on-battery"]').check();
      
      cy.get('button[data-cy="save-sync-settings"]').click();
      
      // Test sync manually
      cy.get('button[data-cy="sync-now"]').click();
      cy.get('[data-cy="sync-status"]').should('contain', 'Syncing');
      cy.get('[data-cy="sync-complete"]', { timeout: 10000 }).should('be.visible');
    });

    it('should manage application data and cache', () => {
      cy.visit('/settings/storage');
      
      // Should show storage usage
      cy.get('[data-cy="storage-usage"]').should('be.visible');
      cy.get('[data-cy="accounts-data-size"]').should('contain', 'KB');
      cy.get('[data-cy="images-cache-size"]').should('contain', 'KB');
      cy.get('[data-cy="backups-size"]').should('contain', 'KB');
      
      // Clear caches
      cy.get('button[data-cy="clear-image-cache"]').click();
      cy.get('[data-cy="clear-cache-confirmation"]').should('be.visible');
      cy.get('button[data-cy="confirm-clear-cache"]').click();
      
      cy.get('[data-cy="cache-cleared"]').should('be.visible');
      
      // Optimize database
      cy.get('button[data-cy="optimize-database"]').click();
      cy.get('[data-cy="optimization-progress"]').should('be.visible');
      cy.get('[data-cy="optimization-complete"]', { timeout: 30000 }).should('be.visible');
      
      // Export all data
      cy.get('button[data-cy="export-all-data"]').click();
      cy.get('input[data-cy="export-password"]').type('DataExport123!');
      cy.get('button[data-cy="start-data-export"]').click();
      
      cy.get('[data-cy="export-progress"]').should('be.visible');
      cy.get('[data-cy="export-complete"]', { timeout: 30000 }).should('be.visible');
    });

    it('should configure debugging and diagnostics', () => {
      cy.visit('/settings/advanced/debug');
      
      // Enable debug mode
      cy.get('input[data-cy="enable-debug-mode"]').check();
      
      // Logging level
      cy.get('select[data-cy="log-level"]').select('debug');
      
      // Enable console logging
      cy.get('input[data-cy="console-logging"]').check();
      
      // Performance monitoring
      cy.get('input[data-cy="performance-monitoring"]').check();
      
      // Error reporting
      cy.get('input[data-cy="crash-reporting"]').check();
      cy.get('input[data-cy="anonymous-analytics"]').uncheck();
      
      cy.get('button[data-cy="save-debug-settings"]').click();
      
      // Generate diagnostic report
      cy.get('button[data-cy="generate-diagnostic-report"]').click();
      cy.get('[data-cy="diagnostic-progress"]').should('be.visible');
      cy.get('[data-cy="diagnostic-complete"]', { timeout: 30000 }).should('be.visible');
      cy.get('[data-cy="download-diagnostic-report"]').should('be.visible');
      
      // View logs
      cy.get('button[data-cy="view-logs"]').click();
      cy.get('[data-cy="logs-modal"]').should('be.visible');
      cy.get('[data-cy="log-entries"]').should('be.visible');
      
      // Filter logs
      cy.get('select[data-cy="log-filter"]').select('error');
      cy.get('[data-cy="log-entries"]').find('.log-error').should('exist');
      
      // Clear logs
      cy.get('button[data-cy="clear-logs"]').click();
      cy.get('[data-cy="logs-cleared"]').should('be.visible');
    });

    it('should handle settings import/export', () => {
      // First, configure some settings
      cy.visit('/settings/appearance');
      cy.get('input[data-cy="theme-dark"]').check();
      cy.get('button[data-cy="save-appearance"]').click();
      
      cy.visit('/settings/security');
      cy.get('input[data-cy="enable-auto-lock"]').check();
      cy.get('button[data-cy="save-security-settings"]').click();
      
      // Export settings
      cy.visit('/settings/advanced/backup-settings');
      cy.get('button[data-cy="export-settings"]').click();
      
      // Choose what to export
      cy.get('input[data-cy="export-appearance"]').check();
      cy.get('input[data-cy="export-security"]').check();
      cy.get('input[data-cy="export-notifications"]').check();
      
      cy.get('button[data-cy="download-settings"]').click();
      cy.get('[data-cy="settings-exported"]').should('be.visible');
      
      // Reset some settings
      cy.visit('/settings/appearance');
      cy.get('input[data-cy="theme-light"]').check();
      cy.get('button[data-cy="save-appearance"]').click();
      
      // Import settings back
      cy.visit('/settings/advanced/backup-settings');
      cy.get('input[data-cy="settings-file"]').selectFile({
        contents: JSON.stringify({
          appearance: { theme: 'dark' },
          security: { autoLock: true },
          notifications: { emailAlerts: true }
        }),
        fileName: 'settings-backup.json'
      });
      
      cy.get('button[data-cy="import-settings"]').click();
      
      // Should show import preview
      cy.get('[data-cy="import-preview"]').should('be.visible');
      cy.get('[data-cy="settings-changes"]').should('contain', 'theme: light → dark');
      
      cy.get('button[data-cy="apply-imported-settings"]').click();
      
      // Verify settings were applied
      cy.visit('/settings/appearance');
      cy.get('input[data-cy="theme-dark"]').should('be.checked');
    });
  });

  describe('Settings Search and Navigation', () => {
    it('should search settings', () => {
      cy.visit('/settings');
      
      // Search for security settings
      cy.get('input[data-cy="settings-search"]').type('biometric');
      
      // Should show filtered results
      cy.get('[data-cy="search-results"]').should('be.visible');
      cy.get('[data-cy="search-results"]').should('contain', 'Biometric Authentication');
      cy.get('[data-cy="search-results"]').should('contain', 'Security Settings');
      
      // Click on search result
      cy.get('[data-cy="search-result"]').first().click();
      
      // Should navigate to relevant settings page
      cy.url().should('include', '/settings/security');
      cy.get('input[data-cy="enable-biometric"]').should('be.visible');
      
      // Search for appearance settings
      cy.visit('/settings');
      cy.get('input[data-cy="settings-search"]').clear().type('theme');
      
      cy.get('[data-cy="search-results"]').should('contain', 'Theme');
      cy.get('[data-cy="search-results"]').should('contain', 'Appearance');
    });

    it('should provide quick settings shortcuts', () => {
      cy.visit('/settings');
      
      // Should show quick actions
      cy.get('[data-cy="quick-actions"]').should('be.visible');
      cy.get('button[data-cy="quick-lock-toggle"]').should('be.visible');
      cy.get('button[data-cy="quick-theme-toggle"]').should('be.visible');
      cy.get('button[data-cy="quick-backup"]').should('be.visible');
      
      // Test theme toggle
      cy.get('button[data-cy="quick-theme-toggle"]').click();
      cy.get('body').should('have.class', 'dark-theme');
      
      cy.get('button[data-cy="quick-theme-toggle"]').click();
      cy.get('body').should('have.class', 'light-theme');
      
      // Test backup shortcut
      cy.get('button[data-cy="quick-backup"]').click();
      cy.url().should('include', '/backup');
    });

    it('should show settings categories and breadcrumbs', () => {
      cy.visit('/settings');
      
      // Should show main categories
      cy.get('[data-cy="settings-categories"]').should('be.visible');
      cy.get('[data-cy="category-security"]').should('be.visible');
      cy.get('[data-cy="category-appearance"]').should('be.visible');
      cy.get('[data-cy="category-notifications"]').should('be.visible');
      cy.get('[data-cy="category-advanced"]').should('be.visible');
      
      // Navigate to subcategory
      cy.get('[data-cy="category-security"]').click();
      cy.get('[data-cy="subcategory-2fa"]').click();
      
      // Should show breadcrumbs
      cy.get('[data-cy="breadcrumbs"]').should('be.visible');
      cy.get('[data-cy="breadcrumbs"]').should('contain', 'Settings');
      cy.get('[data-cy="breadcrumbs"]').should('contain', 'Security');
      cy.get('[data-cy="breadcrumbs"]').should('contain', '2FA');
      
      // Click breadcrumb to navigate back
      cy.get('[data-cy="breadcrumbs"]').contains('Security').click();
      cy.url().should('include', '/settings/security');
    });
  });
});