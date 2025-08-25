/**
 * Comprehensive Mobile App and Native Features E2E Tests
 * Tests mobile-specific functionality including biometric auth, native features, and mobile UX
 */

describe('Comprehensive Mobile and Native Features Tests', () => {
  beforeEach(() => {
    cy.cleanup();
    cy.setupEmulator();
    cy.mockMobileFeatures(); // Mock Capacitor native features
    cy.setupTestUser('premium');
  });

  describe('Biometric Authentication', () => {
    it('should check biometric availability', () => {
      cy.visit('/settings/security/biometric');
      
      // Should detect available biometric methods
      cy.get('[data-cy="biometric-status"]').should('be.visible');
      cy.get('[data-cy="available-methods"]').should('contain', 'Fingerprint');
      cy.get('[data-cy="device-support"]').should('contain', 'Supported');
    });

    it('should setup biometric authentication', () => {
      cy.mockBiometric(true);
      cy.visit('/settings/security/biometric');
      
      // Enable biometric auth
      cy.get('button[data-cy="setup-biometric"]').click();
      
      // Should show setup process
      cy.get('[data-cy="biometric-setup-modal"]').should('be.visible');
      cy.get('[data-cy="setup-instructions"]').should('contain', 'Place your finger');
      
      // Start enrollment
      cy.get('button[data-cy="start-enrollment"]').click();
      
      // Mock biometric enrollment
      cy.window().then((win) => {
        (win as any).dispatchEvent(new CustomEvent('biometric-enrollment-success', {
          detail: { type: 'fingerprint' }
        }));
      });
      
      // Should complete setup
      cy.get('[data-cy="enrollment-success"]').should('be.visible');
      cy.contains('Biometric authentication enabled').should('be.visible');
      
      // Configure biometric settings
      cy.get('input[data-cy="unlock-with-biometric"]').should('be.checked');
      cy.get('input[data-cy="require-biometric-for-sensitive"]').check();
      cy.get('input[data-cy="fallback-to-password"]').check();
      
      cy.get('button[data-cy="save-biometric-settings"]').click();
    });

    it('should authenticate with biometrics', () => {
      cy.mockBiometric(true);
      
      // Setup biometric first
      cy.visit('/settings/security/biometric');
      cy.get('button[data-cy="setup-biometric"]').click();
      cy.get('button[data-cy="start-enrollment"]').click();
      
      cy.window().then((win) => {
        (win as any).dispatchEvent(new CustomEvent('biometric-enrollment-success'));
      });
      
      // Lock the app
      cy.get('[data-cy="lock-app"], button[data-cy="lock-now"]').click();
      
      // Should show lock screen with biometric option
      cy.get('[data-cy="lock-screen"]').should('be.visible');
      cy.get('button[data-cy="unlock-with-biometric"]').should('be.visible');
      
      // Use biometric unlock
      cy.get('button[data-cy="unlock-with-biometric"]').click();
      
      // Mock successful biometric verification
      cy.window().then((win) => {
        (win as any).dispatchEvent(new CustomEvent('biometric-verification-success'));
      });
      
      // Should unlock app
      cy.get('[data-cy="lock-screen"]').should('not.exist');
      cy.url().should('include', '/dashboard');
    });

    it('should handle biometric authentication failures', () => {
      cy.mockBiometric(false); // Mock failed biometric
      
      cy.visit('/settings/security/biometric');
      cy.get('button[data-cy="setup-biometric"]').click();
      cy.get('button[data-cy="start-enrollment"]').click();
      
      // Mock enrollment failure
      cy.window().then((win) => {
        (win as any).dispatchEvent(new CustomEvent('biometric-enrollment-failed', {
          detail: { error: 'No fingerprint detected' }
        }));
      });
      
      // Should show error and retry option
      cy.get('[data-cy="enrollment-error"]').should('be.visible');
      cy.get('[data-cy="enrollment-error"]').should('contain', 'No fingerprint detected');
      cy.get('button[data-cy="retry-enrollment"]').should('be.visible');
      cy.get('button[data-cy="skip-biometric"]').should('be.visible');
    });

    it('should fallback to password when biometric fails', () => {
      cy.mockBiometric(true);
      
      // Setup and lock app
      cy.visit('/settings/security/biometric');
      cy.get('button[data-cy="setup-biometric"]').click();
      cy.get('button[data-cy="start-enrollment"]').click();
      
      cy.window().then((win) => {
        (win as any).dispatchEvent(new CustomEvent('biometric-enrollment-success'));
      });
      
      cy.get('[data-cy="lock-app"]').click();
      
      // Try biometric but simulate failure
      cy.get('button[data-cy="unlock-with-biometric"]').click();
      
      cy.window().then((win) => {
        (win as any).dispatchEvent(new CustomEvent('biometric-verification-failed', {
          detail: { error: 'Authentication failed' }
        }));
      });
      
      // Should show fallback option
      cy.get('[data-cy="biometric-fallback"]').should('be.visible');
      cy.get('button[data-cy="use-password"]').should('be.visible');
      
      // Use password fallback
      cy.get('button[data-cy="use-password"]').click();
      cy.get('input[data-cy="unlock-password"]').should('be.visible');
      
      cy.fixture('test-users').then((users) => {
        cy.get('input[data-cy="unlock-password"]').type(users.validUser.encryptionPassword);
        cy.get('button[data-cy="unlock-with-password"]').click();
      });
      
      cy.get('[data-cy="lock-screen"]').should('not.exist');
    });
  });

  describe('Native Camera and QR Code Scanning', () => {
    it('should access device camera for QR scanning', () => {
      cy.visit('/accounts');
      
      // Add account via QR code
      cy.get('button[data-cy="add-account-btn"]').click();
      cy.get('[data-cy="qr-scanner-tab"]').click();
      
      // Should show camera interface
      cy.get('[data-cy="camera-preview"]').should('be.visible');
      cy.get('button[data-cy="capture-qr"]').should('be.visible');
      cy.get('button[data-cy="upload-image"]').should('be.visible');
      
      // Mock camera permission granted
      cy.window().then((win) => {
        (win as any).dispatchEvent(new CustomEvent('camera-permission-granted'));
      });
      
      cy.get('[data-cy="camera-status"]').should('contain', 'Camera ready');
    });

    it('should scan QR code from camera', () => {
      cy.visit('/accounts');
      cy.get('button[data-cy="add-account-btn"]').click();
      cy.get('[data-cy="qr-scanner-tab"]').click();
      
      // Mock QR code detection
      cy.window().then((win) => {
        (win as any).dispatchEvent(new CustomEvent('qr-code-detected', {
          detail: {
            data: 'otpauth://totp/TestService:user@test.com?secret=JBSWY3DPEHPK3PXP&issuer=TestService'
          }
        }));
      });
      
      // Should parse QR code and show preview
      cy.get('[data-cy="qr-preview"]').should('be.visible');
      cy.get('[data-cy="detected-issuer"]').should('contain', 'TestService');
      cy.get('[data-cy="detected-label"]').should('contain', 'user@test.com');
      
      // Confirm account addition
      cy.get('button[data-cy="add-scanned-account"]').click();
      
      cy.get('[data-cy="toast-success"]').should('contain', 'Account added');
      cy.get('[data-cy="account-card"]').should('contain', 'TestService');
    });

    it('should handle camera permission denial', () => {
      cy.visit('/accounts');
      cy.get('button[data-cy="add-account-btn"]').click();
      cy.get('[data-cy="qr-scanner-tab"]').click();
      
      // Mock camera permission denied
      cy.window().then((win) => {
        (win as any).dispatchEvent(new CustomEvent('camera-permission-denied'));
      });
      
      // Should show permission error and alternatives
      cy.get('[data-cy="camera-permission-error"]').should('be.visible');
      cy.get('[data-cy="camera-permission-error"]').should('contain', 'Camera access denied');
      
      // Should offer alternatives
      cy.get('button[data-cy="upload-qr-image"]').should('be.visible');
      cy.get('button[data-cy="manual-entry"]').should('be.visible');
      cy.get('button[data-cy="grant-permission"]').should('be.visible');
    });

    it('should upload and scan QR image', () => {
      cy.visit('/accounts');
      cy.get('button[data-cy="add-account-btn"]').click();
      cy.get('[data-cy="qr-scanner-tab"]').click();
      
      // Upload QR code image
      const qrImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      
      cy.get('input[data-cy="qr-image-upload"]').selectFile({
        contents: Cypress.Buffer.from(qrImageData.split(',')[1], 'base64'),
        fileName: 'qr-code.png',
        mimeType: 'image/png'
      });
      
      // Mock successful QR decode from image
      cy.window().then((win) => {
        (win as any).dispatchEvent(new CustomEvent('qr-image-decoded', {
          detail: {
            data: 'otpauth://totp/ImageService:image@test.com?secret=HXDMVJECJJWSRB3H&issuer=ImageService'
          }
        }));
      });
      
      // Should show decoded account info
      cy.get('[data-cy="decoded-account"]').should('be.visible');
      cy.get('[data-cy="decoded-issuer"]').should('contain', 'ImageService');
      
      cy.get('button[data-cy="add-decoded-account"]').click();
      cy.get('[data-cy="account-card"]').should('contain', 'ImageService');
    });
  });

  describe('Native Notifications', () => {
    it('should setup local notifications', () => {
      cy.visit('/settings/notifications');
      
      // Enable local notifications
      cy.get('input[data-cy="enable-local-notifications"]').check();
      
      // Configure notification types
      cy.get('input[data-cy="notify-code-expiry"]').check();
      cy.get('input[data-cy="notify-backup-reminder"]').check();
      cy.get('input[data-cy="notify-security-alerts"]').check();
      
      // Set notification timing
      cy.get('select[data-cy="expiry-warning-time"]').select('30'); // 30 seconds before expiry
      
      cy.get('button[data-cy="save-notification-settings"]').click();
      
      // Should request notification permission
      cy.window().then((win) => {
        (win as any).dispatchEvent(new CustomEvent('notification-permission-requested'));
      });
      
      // Mock permission granted
      cy.window().then((win) => {
        (win as any).dispatchEvent(new CustomEvent('notification-permission-granted'));
      });
      
      cy.get('[data-cy="notification-permission-status"]').should('contain', 'Granted');
    });

    it('should send code expiry notifications', () => {
      // Setup notifications first
      cy.visit('/settings/notifications');
      cy.get('input[data-cy="enable-local-notifications"]').check();
      cy.get('input[data-cy="notify-code-expiry"]').check();
      cy.get('button[data-cy="save-notification-settings"]').click();
      
      // Go to accounts page and wait for code expiry
      cy.fixture('test-accounts').then((accounts) => {
        cy.visit('/accounts');
        cy.addAccount(accounts.validAccounts[0]);
      });
      
      // Mock code about to expire
      cy.window().then((win) => {
        (win as any).dispatchEvent(new CustomEvent('code-expiry-warning', {
          detail: {
            issuer: 'Google',
            secondsRemaining: 30
          }
        }));
      });
      
      // Should show notification
      cy.get('[data-cy="notification-toast"]').should('be.visible');
      cy.get('[data-cy="notification-toast"]').should('contain', 'Google code expires in 30 seconds');
    });

    it('should handle backup reminder notifications', () => {
      cy.visit('/settings/notifications');
      cy.get('input[data-cy="notify-backup-reminder"]').check();
      cy.get('select[data-cy="backup-reminder-frequency"]').select('weekly');
      cy.get('button[data-cy="save-notification-settings"]').click();
      
      // Mock backup reminder trigger
      cy.window().then((win) => {
        (win as any).dispatchEvent(new CustomEvent('backup-reminder-due', {
          detail: {
            lastBackup: '2024-01-08',
            daysSince: 7
          }
        }));
      });
      
      // Should show backup reminder
      cy.get('[data-cy="backup-reminder-notification"]').should('be.visible');
      cy.get('[data-cy="backup-reminder-notification"]').should('contain', 'Time to create a backup');
      
      // Should have action buttons
      cy.get('button[data-cy="backup-now"]').should('be.visible');
      cy.get('button[data-cy="remind-later"]').should('be.visible');
    });
  });

  describe('Device Status and System Integration', () => {
    it('should detect device orientation changes', () => {
      cy.visit('/accounts');
      
      // Mock orientation change to landscape
      cy.viewport(800, 600);
      cy.window().then((win) => {
        (win as any).dispatchEvent(new CustomEvent('orientation-changed', {
          detail: { orientation: 'landscape' }
        }));
      });
      
      // Should adapt layout
      cy.get('[data-cy="accounts-grid"]').should('have.class', 'landscape-layout');
      
      // Mock back to portrait
      cy.viewport(375, 812);
      cy.window().then((win) => {
        (win as any).dispatchEvent(new CustomEvent('orientation-changed', {
          detail: { orientation: 'portrait' }
        }));
      });
      
      cy.get('[data-cy="accounts-grid"]').should('have.class', 'portrait-layout');
    });

    it('should handle app lifecycle events', () => {
      cy.visit('/dashboard');
      
      // Mock app going to background
      cy.window().then((win) => {
        (win as any).dispatchEvent(new CustomEvent('app-state-changed', {
          detail: { state: 'background' }
        }));
      });
      
      // Should trigger security measures if enabled
      cy.get('[data-cy="app-backgrounded"]').should('be.visible');
      
      // Mock app returning to foreground
      cy.window().then((win) => {
        (win as any).dispatchEvent(new CustomEvent('app-state-changed', {
          detail: { state: 'active' }
        }));
      });
      
      // Should check if re-authentication needed
      cy.get('[data-cy="auth-check-modal"]').should('be.visible');
    });

    it('should monitor network connectivity', () => {
      cy.visit('/dashboard');
      
      // Mock network disconnection
      cy.window().then((win) => {
        (win as any).dispatchEvent(new CustomEvent('network-changed', {
          detail: { connected: false }
        }));
      });
      
      // Should show offline indicator
      cy.get('[data-cy="offline-indicator"]').should('be.visible');
      cy.get('[data-cy="offline-indicator"]').should('contain', 'You are offline');
      
      // Should disable sync-dependent features
      cy.get('[data-cy="sync-disabled-notice"]').should('be.visible');
      
      // Mock network reconnection
      cy.window().then((win) => {
        (win as any).dispatchEvent(new CustomEvent('network-changed', {
          detail: { 
            connected: true,
            connectionType: 'wifi'
          }
        }));
      });
      
      // Should show online indicator and sync
      cy.get('[data-cy="online-indicator"]').should('be.visible');
      cy.get('[data-cy="syncing-indicator"]').should('be.visible');
    });

    it('should handle battery optimization warnings', () => {
      // Mock battery optimization warning
      cy.window().then((win) => {
        (win as any).dispatchEvent(new CustomEvent('battery-optimization-warning', {
          detail: {
            appOptimized: true,
            canDisable: true
          }
        }));
      });
      
      cy.visit('/dashboard');
      
      // Should show battery optimization notice
      cy.get('[data-cy="battery-optimization-notice"]').should('be.visible');
      cy.get('[data-cy="battery-optimization-notice"]').should('contain', 'Battery optimization may affect');
      
      // Should offer to disable optimization
      cy.get('button[data-cy="disable-battery-optimization"]').should('be.visible');
      
      cy.get('button[data-cy="disable-battery-optimization"]').click();
      
      // Mock opening system settings
      cy.window().then((win) => {
        (win as any).dispatchEvent(new CustomEvent('system-settings-opened', {
          detail: { setting: 'battery-optimization' }
        }));
      });
    });
  });

  describe('Mobile UX and Gestures', () => {
    it('should support swipe gestures', () => {
      cy.fixture('test-accounts').then((accounts) => {
        cy.visit('/accounts');
        accounts.validAccounts.slice(0, 3).forEach(account => {
          cy.addAccount(account);
        });
      });
      
      // Mock swipe left on account card (delete)
      cy.get('[data-cy="account-card"]').first().trigger('touchstart', { touches: [{ clientX: 200, clientY: 100 }] });
      cy.get('[data-cy="account-card"]').first().trigger('touchmove', { touches: [{ clientX: 50, clientY: 100 }] });
      cy.get('[data-cy="account-card"]').first().trigger('touchend');
      
      // Should show swipe actions
      cy.get('[data-cy="swipe-actions"]').should('be.visible');
      cy.get('button[data-cy="swipe-delete"]').should('be.visible');
      cy.get('button[data-cy="swipe-edit"]').should('be.visible');
      
      // Mock swipe right (copy code)
      cy.get('[data-cy="account-card"]').first().trigger('touchstart', { touches: [{ clientX: 50, clientY: 100 }] });
      cy.get('[data-cy="account-card"]').first().trigger('touchmove', { touches: [{ clientX: 200, clientY: 100 }] });
      cy.get('[data-cy="account-card"]').first().trigger('touchend');
      
      // Should copy code
      cy.get('[data-cy="code-copied-feedback"]').should('be.visible');
    });

    it('should support pull to refresh', () => {
      cy.visit('/accounts');
      
      // Mock pull to refresh gesture
      cy.get('[data-cy="accounts-container"]').trigger('touchstart', { touches: [{ clientX: 100, clientY: 50 }] });
      cy.get('[data-cy="accounts-container"]').trigger('touchmove', { touches: [{ clientX: 100, clientY: 150 }] });
      
      // Should show refresh indicator
      cy.get('[data-cy="pull-refresh-indicator"]').should('be.visible');
      
      // Complete the gesture
      cy.get('[data-cy="accounts-container"]').trigger('touchend');
      
      // Should trigger refresh
      cy.get('[data-cy="refreshing-indicator"]').should('be.visible');
      cy.get('[data-cy="refresh-complete"]', { timeout: 5000 }).should('be.visible');
    });

    it('should provide haptic feedback', () => {
      cy.visit('/settings/accessibility');
      
      // Enable haptic feedback
      cy.get('input[data-cy="enable-haptic-feedback"]').check();
      cy.get('button[data-cy="save-accessibility-settings"]').click();
      
      cy.visit('/accounts');
      
      // Mock haptic feedback on actions
      cy.get('[data-cy="account-card"]').first().find('button[data-cy="copy-code"]').click();
      
      // Mock haptic feedback event
      cy.window().then((win) => {
        (win as any).dispatchEvent(new CustomEvent('haptic-feedback', {
          detail: { type: 'selection' }
        }));
      });
      
      cy.get('[data-cy="haptic-feedback-indicator"]').should('be.visible');
    });

    it('should adapt for large text accessibility', () => {
      // Mock large text system setting
      cy.window().then((win) => {
        (win as any).dispatchEvent(new CustomEvent('accessibility-changed', {
          detail: {
            largeFonts: true,
            fontScale: 1.5
          }
        }));
      });
      
      cy.visit('/accounts');
      
      // Should adapt font sizes
      cy.get('[data-cy="account-card"]').should('have.class', 'large-fonts');
      cy.get('[data-cy="account-code"]').should('have.css', 'font-size').and('not.equal', '16px');
    });
  });

  describe('Mobile Performance and Optimization', () => {
    it('should handle low memory warnings', () => {
      // Mock low memory warning
      cy.window().then((win) => {
        (win as any).dispatchEvent(new CustomEvent('memory-warning', {
          detail: { level: 'critical' }
        }));
      });
      
      cy.visit('/dashboard');
      
      // Should show memory warning and optimization actions
      cy.get('[data-cy="low-memory-warning"]').should('be.visible');
      cy.get('button[data-cy="clear-cache"]').should('be.visible');
      cy.get('button[data-cy="minimize-memory"]').should('be.visible');
      
      cy.get('button[data-cy="clear-cache"]').click();
      
      // Should clear non-essential data
      cy.get('[data-cy="cache-cleared"]').should('be.visible');
      cy.contains('Memory optimized').should('be.visible');
    });

    it('should lazy load components for performance', () => {
      cy.visit('/accounts');
      
      // Should only load visible account cards initially
      cy.get('[data-cy="account-card"]').should('have.length.at.most', 10);
      
      // Mock scroll to load more
      cy.get('[data-cy="accounts-container"]').scrollTo('bottom');
      
      // Should load more cards
      cy.get('[data-cy="loading-more"]').should('be.visible');
      cy.get('[data-cy="account-card"]', { timeout: 5000 }).should('have.length.at.least', 15);
    });

    it('should optimize for different screen densities', () => {
      // Mock high DPI display
      cy.window().then((win) => {
        Object.defineProperty(win, 'devicePixelRatio', { value: 3 });
      });
      
      cy.visit('/accounts');
      
      // Should load appropriate image assets
      cy.get('[data-cy="account-icon"]').first().should('have.attr', 'src').and('include', '@3x');
    });

    it('should monitor and report performance metrics', () => {
      cy.visit('/settings/advanced/performance');
      
      // Enable performance monitoring
      cy.get('input[data-cy="enable-performance-monitoring"]').check();
      cy.get('button[data-cy="save-performance-settings"]').click();
      
      // Should show performance metrics
      cy.get('[data-cy="performance-metrics"]').should('be.visible');
      cy.get('[data-cy="render-time"]').should('contain', 'ms');
      cy.get('[data-cy="memory-usage"]').should('contain', 'MB');
      cy.get('[data-cy="battery-usage"]').should('contain', '%');
      
      // Should offer performance optimization suggestions
      cy.get('[data-cy="optimization-suggestions"]').should('be.visible');
    });
  });
});