/**
 * Comprehensive Backup and Restore E2E Tests
 * Tests all backup/restore functionality including local, cloud, encrypted backups, and data migration
 */

describe('Comprehensive Backup and Restore Tests', () => {
  beforeEach(() => {
    cy.cleanup();
    cy.setupEmulator();
    cy.setupTestUser('premium'); // Use premium for full backup features
  });

  describe('Local Backup Creation', () => {
    beforeEach(() => {
      cy.fixture('test-accounts').then((accounts) => {
        cy.visit('/accounts');
        // Add test accounts for backup
        accounts.validAccounts.slice(0, 3).forEach(account => {
          cy.addAccount(account);
        });
      });
    });

    it('should create encrypted local backup', () => {
      cy.visit('/backup');
      
      // Create backup
      cy.get('button[data-cy="create-backup"], button:contains("Create Backup")').click();
      
      // Enter backup password
      const backupPassword = 'BackupPassword123!';
      cy.get('input[data-cy="backup-password"]').type(backupPassword);
      cy.get('input[data-cy="confirm-backup-password"]').type(backupPassword);
      
      // Add backup description
      cy.get('input[data-cy="backup-description"]').type('Test backup created by Cypress');
      
      // Select what to backup
      cy.get('input[data-cy="backup-accounts"]').check();
      cy.get('input[data-cy="backup-settings"]').check();
      cy.get('input[data-cy="backup-folders"]').check();
      
      cy.get('button[data-cy="start-backup"]').click();
      
      // Should show progress
      cy.get('[data-cy="backup-progress"]').should('be.visible');
      cy.get('[data-cy="progress-bar"]').should('be.visible');
      
      // Should complete successfully
      cy.get('[data-cy="backup-complete"]', { timeout: 30000 }).should('be.visible');
      cy.get('[data-cy="backup-download-link"]').should('be.visible');
      
      // Should show backup file info
      cy.get('[data-cy="backup-file-size"]').should('contain', 'KB');
      cy.contains('3 accounts backed up').should('be.visible');
    });

    it('should create unencrypted backup for testing', () => {
      cy.visit('/backup');
      cy.get('button[data-cy="create-backup"]').click();
      
      // Skip encryption
      cy.get('input[data-cy="encrypt-backup"]').uncheck();
      
      // Confirm unencrypted backup warning
      cy.get('[data-cy="unencrypted-warning"]').should('be.visible');
      cy.get('button[data-cy="confirm-unencrypted"]').click();
      
      cy.get('button[data-cy="start-backup"]').click();
      
      // Should complete
      cy.get('[data-cy="backup-complete"]', { timeout: 30000 }).should('be.visible');
      cy.get('[data-cy="backup-download-link"]').should('be.visible');
    });

    it('should validate backup password strength', () => {
      cy.visit('/backup');
      cy.get('button[data-cy="create-backup"]').click();
      
      // Try weak password
      cy.get('input[data-cy="backup-password"]').type('weak');
      cy.get('input[data-cy="confirm-backup-password"]').type('weak');
      cy.get('button[data-cy="start-backup"]').click();
      
      cy.contains('Password must be at least 8 characters', { matchCase: false }).should('be.visible');
      
      // Try mismatched passwords
      cy.get('input[data-cy="backup-password"]').clear().type('StrongPassword123!');
      cy.get('input[data-cy="confirm-backup-password"]').clear().type('DifferentPassword123!');
      cy.get('button[data-cy="start-backup"]').click();
      
      cy.contains('Passwords do not match', { matchCase: false }).should('be.visible');
    });

    it('should show backup size estimate before creation', () => {
      cy.visit('/backup');
      cy.get('button[data-cy="create-backup"]').click();
      
      // Should show estimated size
      cy.get('[data-cy="estimated-backup-size"]').should('be.visible');
      cy.get('[data-cy="estimated-backup-size"]').should('contain', 'KB');
      cy.get('[data-cy="accounts-count"]').should('contain', '3 accounts');
      
      // Adding more data should increase estimate
      cy.get('input[data-cy="backup-icons"]').check();
      cy.get('[data-cy="estimated-backup-size"]').should('be.visible');
    });
  });

  describe('Cloud Backup (Google Drive)', () => {
    beforeEach(() => {
      // Mock Google Drive API
      cy.window().then((win) => {
        (win as any).gapi = {
          load: (api: string, callback: () => void) => callback(),
          auth2: {
            getAuthInstance: () => ({
              isSignedIn: { get: () => true },
              currentUser: { get: () => ({ getBasicProfile: () => ({ getEmail: () => 'test@gmail.com' }) }) }
            })
          },
          client: {
            drive: {
              files: {
                create: () => Promise.resolve({ result: { id: 'backup-file-id-123' } }),
                list: () => Promise.resolve({
                  result: {
                    files: [
                      { id: '1', name: '2FA-Studio-Backup-2024-01-15.json', createdTime: '2024-01-15T10:30:00Z' }
                    ]
                  }
                }),
                get: () => Promise.resolve({ body: '{"version":"1.0.0","accounts":[]}' })
              }
            }
          }
        };
      });

      cy.fixture('test-accounts').then((accounts) => {
        cy.visit('/accounts');
        accounts.validAccounts.slice(0, 2).forEach(account => {
          cy.addAccount(account);
        });
      });
    });

    it('should connect to Google Drive and create backup', () => {
      cy.visit('/backup');
      
      // Connect to Google Drive
      cy.get('button[data-cy="connect-google-drive"]').click();
      
      // Mock successful connection
      cy.window().then((win) => {
        (win as any).dispatchEvent(new CustomEvent('google-drive-connected', {
          detail: { email: 'test@gmail.com' }
        }));
      });
      
      // Should show connected status
      cy.get('[data-cy="google-drive-status"]').should('contain', 'Connected');
      cy.get('[data-cy="google-drive-email"]').should('contain', 'test@gmail.com');
      
      // Create cloud backup
      cy.get('button[data-cy="backup-to-drive"]').click();
      cy.get('input[data-cy="backup-password"]').type('CloudBackup123!');
      cy.get('input[data-cy="confirm-backup-password"]').type('CloudBackup123!');
      cy.get('button[data-cy="start-cloud-backup"]').click();
      
      // Should show upload progress
      cy.get('[data-cy="upload-progress"]').should('be.visible');
      cy.get('[data-cy="backup-complete"]', { timeout: 30000 }).should('be.visible');
      cy.contains('Backup uploaded to Google Drive').should('be.visible');
    });

    it('should list existing Google Drive backups', () => {
      cy.visit('/backup');
      cy.get('button[data-cy="connect-google-drive"]').click();
      
      // Mock connection and list backups
      cy.window().then((win) => {
        (win as any).dispatchEvent(new CustomEvent('google-drive-connected'));
      });
      
      cy.get('button[data-cy="list-drive-backups"]').click();
      
      // Should show backup list
      cy.get('[data-cy="drive-backup-list"]').should('be.visible');
      cy.get('[data-cy="backup-item"]').should('have.length.at.least', 1);
      cy.get('[data-cy="backup-item"]').should('contain', '2FA-Studio-Backup');
      cy.get('[data-cy="backup-item"]').should('contain', '2024-01-15');
    });

    it('should handle Google Drive connection errors', () => {
      cy.visit('/backup');
      
      // Mock connection error
      cy.window().then((win) => {
        (win as any).gapi = {
          load: () => { throw new Error('Failed to load Google API'); }
        };
      });
      
      cy.get('button[data-cy="connect-google-drive"]').click();
      
      // Should show error
      cy.get('[data-cy="drive-error"]').should('be.visible');
      cy.contains('Failed to connect to Google Drive').should('be.visible');
    });

    it('should manage Google Drive storage quota', () => {
      cy.visit('/backup');
      cy.get('button[data-cy="connect-google-drive"]').click();
      
      // Mock quota info
      cy.window().then((win) => {
        (win as any).dispatchEvent(new CustomEvent('google-drive-quota', {
          detail: {
            used: '500MB',
            total: '15GB',
            available: '14.5GB'
          }
        }));
      });
      
      // Should show storage info
      cy.get('[data-cy="storage-usage"]').should('contain', '500MB');
      cy.get('[data-cy="storage-total"]').should('contain', '15GB');
      cy.get('[data-cy="storage-available"]').should('contain', '14.5GB');
    });
  });

  describe('Backup Restoration', () => {
    beforeEach(() => {
      // Create some accounts first
      cy.fixture('test-accounts').then((accounts) => {
        cy.visit('/accounts');
        accounts.validAccounts.slice(0, 2).forEach(account => {
          cy.addAccount(account);
        });
      });
    });

    it('should restore from encrypted local backup', () => {
      cy.fixture('backup-data').then((backupData) => {
        cy.visit('/backup');
        
        // Go to restore section
        cy.get('[data-cy="restore-tab"], button:contains("Restore")').click();
        
        // Upload backup file
        cy.get('input[type="file"], input[data-cy="restore-file"]').selectFile({
          contents: JSON.stringify(backupData.validBackup),
          fileName: 'test-restore.json',
          mimeType: 'application/json'
        });
        
        // Enter restore password
        cy.get('input[data-cy="restore-password"]').type('BackupPassword123!');
        
        // Preview backup contents
        cy.get('button[data-cy="preview-backup"]').click();
        
        // Should show backup preview
        cy.get('[data-cy="backup-preview"]').should('be.visible');
        cy.get('[data-cy="preview-accounts"]').should('contain', '2 accounts');
        cy.get('[data-cy="preview-accounts"]').should('contain', 'Google');
        cy.get('[data-cy="preview-accounts"]').should('contain', 'GitHub');
        
        // Confirm restore
        cy.get('button[data-cy="confirm-restore"]').click();
        
        // Should show progress
        cy.get('[data-cy="restore-progress"]').should('be.visible');
        
        // Should complete successfully
        cy.get('[data-cy="restore-complete"]', { timeout: 30000 }).should('be.visible');
        cy.contains('2 accounts restored').should('be.visible');
        
        // Verify accounts were restored
        cy.visit('/accounts');
        cy.get('[data-cy="account-card"]').should('contain', 'backup.test@gmail.com');
        cy.get('[data-cy="account-card"]').should('contain', 'backupuser');
      });
    });

    it('should handle selective restore options', () => {
      cy.fixture('backup-data').then((backupData) => {
        cy.visit('/backup');
        cy.get('[data-cy="restore-tab"]').click();
        
        cy.get('input[type="file"]').selectFile({
          contents: JSON.stringify(backupData.validBackup),
          fileName: 'selective-restore.json',
          mimeType: 'application/json'
        });
        
        cy.get('input[data-cy="restore-password"]').type('BackupPassword123!');
        cy.get('button[data-cy="preview-backup"]').click();
        
        // Select what to restore
        cy.get('input[data-cy="restore-accounts"]').check();
        cy.get('input[data-cy="restore-folders"]').uncheck(); // Don't restore folders
        cy.get('input[data-cy="restore-settings"]').uncheck(); // Don't restore settings
        
        // Select specific accounts
        cy.get('input[data-account-id="acc-001"]').check(); // Google
        cy.get('input[data-account-id="acc-002"]').uncheck(); // Skip GitHub
        
        cy.get('button[data-cy="confirm-restore"]').click();
        
        // Should only restore selected items
        cy.get('[data-cy="restore-complete"]', { timeout: 30000 }).should('be.visible');
        cy.contains('1 account restored').should('be.visible');
        
        cy.visit('/accounts');
        cy.get('[data-cy="account-card"]').should('contain', 'Google');
        cy.get('[data-cy="account-card"]').should('not.contain', 'GitHub');
      });
    });

    it('should handle restore conflicts', () => {
      cy.fixture('backup-data').then((backupData) => {
        // Add account that will conflict with backup
        cy.visit('/accounts');
        cy.addAccount({
          issuer: 'Google',
          label: 'existing@gmail.com',
          secret: 'DIFFERENTKEY123'
        });
        
        // Try to restore backup with same issuer
        cy.visit('/backup');
        cy.get('[data-cy="restore-tab"]').click();
        
        cy.get('input[type="file"]').selectFile({
          contents: JSON.stringify(backupData.validBackup),
          fileName: 'conflict-restore.json',
          mimeType: 'application/json'
        });
        
        cy.get('input[data-cy="restore-password"]').type('BackupPassword123!');
        cy.get('button[data-cy="confirm-restore"]').click();
        
        // Should show conflict resolution dialog
        cy.get('[data-cy="conflict-resolution"]').should('be.visible');
        cy.get('[data-cy="conflict-list"]').should('contain', 'Google');
        
        // Choose resolution strategy
        cy.get('select[data-cy="conflict-strategy"]').select('rename'); // Rename conflicting accounts
        cy.get('button[data-cy="resolve-conflicts"]').click();
        
        cy.get('[data-cy="restore-complete"]', { timeout: 30000 }).should('be.visible');
        
        // Should have both accounts with different names
        cy.visit('/accounts');
        cy.get('[data-cy="account-card"]').should('contain', 'Google');
        cy.get('[data-cy="account-card"]').should('contain', 'Google (Restored)');
      });
    });

    it('should validate backup file integrity', () => {
      cy.visit('/backup');
      cy.get('[data-cy="restore-tab"]').click();
      
      // Upload corrupted backup
      cy.get('input[type="file"]').selectFile({
        contents: '{"corrupted": "data", "version": "invalid"}',
        fileName: 'corrupted.json',
        mimeType: 'application/json'
      });
      
      cy.get('button[data-cy="preview-backup"]').click();
      
      // Should show validation error
      cy.get('[data-cy="backup-validation-error"]').should('be.visible');
      cy.contains('Invalid backup format').should('be.visible');
    });

    it('should handle wrong restore password', () => {
      cy.fixture('backup-data').then((backupData) => {
        cy.visit('/backup');
        cy.get('[data-cy="restore-tab"]').click();
        
        cy.get('input[type="file"]').selectFile({
          contents: JSON.stringify(backupData.validBackup),
          fileName: 'wrong-password.json',
          mimeType: 'application/json'
        });
        
        // Enter wrong password
        cy.get('input[data-cy="restore-password"]').type('WrongPassword123!');
        cy.get('button[data-cy="preview-backup"]').click();
        
        // Should show decryption error
        cy.get('[data-cy="decryption-error"]').should('be.visible');
        cy.contains('Invalid backup password').should('be.visible');
        
        // Try correct password
        cy.get('input[data-cy="restore-password"]').clear().type('BackupPassword123!');
        cy.get('button[data-cy="preview-backup"]').click();
        
        // Should work now
        cy.get('[data-cy="backup-preview"]').should('be.visible');
      });
    });
  });

  describe('Automated Backup Scheduling', () => {
    beforeEach(() => {
      cy.setupTestUser('premium'); // Premium feature
      cy.fixture('test-accounts').then((accounts) => {
        cy.visit('/accounts');
        accounts.validAccounts.slice(0, 2).forEach(account => {
          cy.addAccount(account);
        });
      });
    });

    it('should setup automatic backup schedule', () => {
      cy.visit('/settings/backup');
      
      // Enable automatic backups
      cy.get('input[data-cy="enable-auto-backup"]').check();
      
      // Configure schedule
      cy.get('select[data-cy="backup-frequency"]').select('weekly');
      cy.get('select[data-cy="backup-day"]').select('sunday');
      cy.get('select[data-cy="backup-time"]').select('02:00');
      
      // Set backup location
      cy.get('select[data-cy="backup-destination"]').select('google-drive');
      
      // Set encryption
      cy.get('input[data-cy="auto-backup-password"]').type('AutoBackup123!');
      cy.get('input[data-cy="confirm-auto-backup-password"]').type('AutoBackup123!');
      
      // Save settings
      cy.get('button[data-cy="save-backup-settings"]').click();
      
      cy.get('[data-cy="toast-success"]').should('contain', 'Backup schedule saved');
      
      // Verify schedule is displayed
      cy.get('[data-cy="next-backup"]').should('contain', 'Sunday at 2:00 AM');
    });

    it('should show backup history and status', () => {
      cy.visit('/settings/backup');
      
      // Mock backup history
      cy.window().then((win) => {
        (win as any).mockBackupHistory = [
          { id: '1', date: '2024-01-15T02:00:00Z', status: 'success', size: '2.5MB' },
          { id: '2', date: '2024-01-08T02:00:00Z', status: 'success', size: '2.3MB' },
          { id: '3', date: '2024-01-01T02:00:00Z', status: 'failed', error: 'Network timeout' }
        ];
      });
      
      cy.get('[data-cy="backup-history-tab"]').click();
      
      // Should show backup history
      cy.get('[data-cy="backup-history"]').should('be.visible');
      cy.get('[data-cy="backup-entry"]').should('have.length', 3);
      
      // Check successful backup
      cy.get('[data-cy="backup-entry"]').first().within(() => {
        cy.get('[data-cy="backup-status"]').should('contain', 'Success');
        cy.get('[data-cy="backup-size"]').should('contain', '2.5MB');
        cy.get('[data-cy="backup-date"]').should('contain', '2024-01-15');
      });
      
      // Check failed backup
      cy.get('[data-cy="backup-entry"]').last().within(() => {
        cy.get('[data-cy="backup-status"]').should('contain', 'Failed');
        cy.get('[data-cy="backup-error"]').should('contain', 'Network timeout');
      });
    });

    it('should handle backup failure notifications', () => {
      // Mock backup failure
      cy.window().then((win) => {
        (win as any).dispatchEvent(new CustomEvent('backup-failed', {
          detail: {
            error: 'Storage quota exceeded',
            timestamp: Date.now()
          }
        }));
      });
      
      // Should show notification
      cy.get('[data-cy="backup-failure-notification"]').should('be.visible');
      cy.get('[data-cy="backup-failure-notification"]').should('contain', 'Backup failed');
      cy.get('[data-cy="backup-failure-notification"]').should('contain', 'Storage quota exceeded');
      
      // Should offer retry option
      cy.get('button[data-cy="retry-backup"]').should('be.visible');
    });

    it('should test backup schedule immediately', () => {
      cy.visit('/settings/backup');
      
      // Setup schedule
      cy.get('input[data-cy="enable-auto-backup"]').check();
      cy.get('select[data-cy="backup-frequency"]').select('daily');
      cy.get('button[data-cy="save-backup-settings"]').click();
      
      // Test backup now
      cy.get('button[data-cy="test-backup-now"]').click();
      
      // Should show backup progress
      cy.get('[data-cy="test-backup-progress"]').should('be.visible');
      cy.get('[data-cy="backup-complete"]', { timeout: 30000 }).should('be.visible');
      cy.contains('Test backup completed successfully').should('be.visible');
    });
  });

  describe('Legacy Format Migration', () => {
    it('should migrate from Aegis Authenticator format', () => {
      cy.fixture('backup-data').then((backupData) => {
        cy.visit('/backup');
        cy.get('[data-cy="restore-tab"]').click();
        
        // Select Aegis format
        cy.get('select[data-cy="backup-format"]').select('aegis');
        
        cy.get('input[type="file"]').selectFile({
          contents: JSON.stringify(backupData.legacyFormats.aegisBackup),
          fileName: 'aegis-export.json',
          mimeType: 'application/json'
        });
        
        cy.get('button[data-cy="preview-backup"]').click();
        
        // Should show migration preview
        cy.get('[data-cy="migration-preview"]').should('be.visible');
        cy.get('[data-cy="migration-preview"]').should('contain', 'Aegis Authenticator');
        cy.get('[data-cy="preview-accounts"]').should('contain', 'Legacy Service');
        
        cy.get('button[data-cy="start-migration"]').click();
        
        // Should complete migration
        cy.get('[data-cy="migration-complete"]', { timeout: 30000 }).should('be.visible');
        cy.contains('Successfully migrated from Aegis').should('be.visible');
        
        // Verify migrated account
        cy.visit('/accounts');
        cy.get('[data-cy="account-card"]').should('contain', 'Legacy Service');
      });
    });

    it('should migrate from Authy format', () => {
      cy.fixture('backup-data').then((backupData) => {
        cy.visit('/backup');
        cy.get('[data-cy="restore-tab"]').click();
        
        cy.get('select[data-cy="backup-format"]').select('authy');
        
        cy.get('input[type="file"]').selectFile({
          contents: JSON.stringify(backupData.legacyFormats.authyBackup),
          fileName: 'authy-backup.json',
          mimeType: 'application/json'
        });
        
        cy.get('button[data-cy="start-migration"]').click();
        
        cy.get('[data-cy="migration-complete"]', { timeout: 30000 }).should('be.visible');
        cy.contains('Successfully migrated from Authy').should('be.visible');
      });
    });

    it('should migrate from Google Authenticator QR export', () => {
      cy.fixture('backup-data').then((backupData) => {
        cy.visit('/backup');
        cy.get('[data-cy="restore-tab"]').click();
        
        cy.get('select[data-cy="backup-format"]').select('google-authenticator');
        
        // Paste migration URL
        cy.get('textarea[data-cy="migration-url"]')
          .type(backupData.legacyFormats.googleAuthenticatorBackup['otpauth-migration://offline?data=...']);
        
        cy.get('button[data-cy="parse-migration-url"]').click();
        
        // Should show parsed accounts
        cy.get('[data-cy="migration-preview"]').should('be.visible');
        cy.get('button[data-cy="start-migration"]').click();
        
        cy.get('[data-cy="migration-complete"]', { timeout: 30000 }).should('be.visible');
      });
    });
  });

  describe('Backup Security and Compliance', () => {
    beforeEach(() => {
      cy.setupTestUser('premium');
    });

    it('should create audit trail for backup operations', () => {
      cy.visit('/backup');
      cy.createBackup('AuditTest123!');
      
      // Check audit log
      cy.visit('/settings/security/audit');
      
      cy.get('[data-cy="audit-log"]').should('contain', 'Backup created');
      cy.get('[data-cy="audit-log"]').should('contain', 'Local backup');
      cy.get('[data-cy="audit-entry"]').first().within(() => {
        cy.get('[data-cy="audit-timestamp"]').should('be.visible');
        cy.get('[data-cy="audit-user"]').should('be.visible');
        cy.get('[data-cy="audit-action"]').should('contain', 'BACKUP_CREATED');
      });
    });

    it('should handle GDPR compliance for backups', () => {
      cy.visit('/settings/privacy/gdpr');
      
      // Request data export (includes backups)
      cy.get('button[data-cy="request-data-export"]').click();
      
      // Should include backup data
      cy.get('[data-cy="export-includes"]').should('contain', 'Account backups');
      cy.get('[data-cy="export-includes"]').should('contain', 'Backup history');
      
      cy.get('button[data-cy="confirm-export-request"]').click();
      
      // Should show export status
      cy.get('[data-cy="export-status"]').should('contain', 'Processing');
      
      // Request account deletion
      cy.get('button[data-cy="delete-account-data"]').click();
      cy.get('input[data-cy="delete-confirmation"]').type('DELETE');
      cy.get('button[data-cy="confirm-deletion"]').click();
      
      // Should warn about backup deletion
      cy.get('[data-cy="backup-deletion-warning"]').should('be.visible');
      cy.get('[data-cy="backup-deletion-warning"]').should('contain', 'All backups will be permanently deleted');
    });

    it('should encrypt backups with strong encryption', () => {
      cy.visit('/backup');
      cy.get('button[data-cy="create-backup"]').click();
      
      // Check encryption settings
      cy.get('[data-cy="encryption-settings"]').click();
      
      // Should show strong encryption options
      cy.get('select[data-cy="encryption-algorithm"]').should('contain', 'AES-256-GCM');
      cy.get('select[data-cy="key-derivation"]').should('contain', 'PBKDF2');
      cy.get('input[data-cy="pbkdf2-iterations"]').should('have.value', '100000');
      
      // Should validate password entropy
      cy.get('input[data-cy="backup-password"]').type('weak123');
      cy.get('[data-cy="password-strength"]').should('contain', 'Weak');
      
      cy.get('input[data-cy="backup-password"]').clear().type('VeryStrongBackupPassword123!@#');
      cy.get('[data-cy="password-strength"]').should('contain', 'Strong');
    });
  });
});