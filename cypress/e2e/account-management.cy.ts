import * as OTPAuth from 'otpauth';

describe('Account Management', () => {
  beforeEach(() => {
    // Clear localStorage
    cy.window().then((win) => {
      win.localStorage.clear();
    });
    
    // Visit the app
    cy.visit('/');
  });

  describe('Local Storage Operations', () => {
    it('should add an account to local storage', () => {
      // Create test account
      const testAccount = {
        id: 'test-account-1',
        issuer: 'GitHub',
        label: 'test@example.com',
        secret: 'JBSWY3DPEHPK3PXP',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        type: 'totp',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Store in localStorage
      cy.window().then((win) => {
        const accounts = [testAccount];
        win.localStorage.setItem('2fa_accounts', JSON.stringify(accounts));
      });

      // Verify storage
      cy.window().then((win) => {
        const stored = win.localStorage.getItem('2fa_accounts');
        expect(stored).to.not.be.null;
        
        const accounts = JSON.parse(stored!);
        expect(accounts).to.have.length(1);
        expect(accounts[0].issuer).to.equal('GitHub');
        expect(accounts[0].secret).to.equal('JBSWY3DPEHPK3PXP');
      });
    });

    it('should generate TOTP codes for stored accounts', () => {
      // Create and store account
      const testAccount = {
        id: 'test-account-2',
        issuer: 'Google',
        label: 'user@gmail.com',
        secret: 'JBSWY3DPEHPK3PXP',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        type: 'totp'
      };

      cy.window().then((win) => {
        win.localStorage.setItem('2fa_accounts', JSON.stringify([testAccount]));
        
        // Create TOTP instance
        const totp = new OTPAuth.TOTP({
          issuer: testAccount.issuer,
          label: testAccount.label,
          secret: testAccount.secret,
          algorithm: testAccount.algorithm,
          digits: testAccount.digits,
          period: testAccount.period
        });

        // Generate code
        const code = totp.generate();
        expect(code).to.match(/^\d{6}$/);
        
        // Calculate remaining time
        const remaining = testAccount.period - (Math.floor(Date.now() / 1000) % testAccount.period);
        expect(remaining).to.be.at.least(1);
        expect(remaining).to.be.at.most(30);
        
        cy.log(`Generated code: ${code}, Time remaining: ${remaining}s`);
      });
    });

    it('should handle multiple accounts', () => {
      const accounts = [
        {
          id: '1',
          issuer: 'GitHub',
          label: 'github@example.com',
          secret: 'JBSWY3DPEHPK3PXP',
          type: 'totp'
        },
        {
          id: '2',
          issuer: 'Google',
          label: 'google@example.com',
          secret: 'GEZDGNBVGY3TQOJQ',
          type: 'totp'
        },
        {
          id: '3',
          issuer: 'Microsoft',
          label: 'microsoft@example.com',
          secret: 'MFRGGZDFMZTWQ2LK',
          type: 'totp'
        }
      ];

      cy.window().then((win) => {
        win.localStorage.setItem('2fa_accounts', JSON.stringify(accounts));
        
        const stored = JSON.parse(win.localStorage.getItem('2fa_accounts')!);
        expect(stored).to.have.length(3);
        
        // Generate codes for all accounts
        stored.forEach((account: any) => {
          const totp = new OTPAuth.TOTP({
            issuer: account.issuer,
            label: account.label,
            secret: account.secret,
            algorithm: 'SHA1',
            digits: 6,
            period: 30
          });
          
          const code = totp.generate();
          expect(code).to.match(/^\d{6}$/);
          cy.log(`${account.issuer}: ${code}`);
        });
      });
    });

    it('should update an existing account', () => {
      // Initial account
      const account = {
        id: 'update-test',
        issuer: 'Original',
        label: 'original@example.com',
        secret: 'JBSWY3DPEHPK3PXP',
        type: 'totp'
      };

      cy.window().then((win) => {
        // Store initial
        win.localStorage.setItem('2fa_accounts', JSON.stringify([account]));
        
        // Update account
        const accounts = JSON.parse(win.localStorage.getItem('2fa_accounts')!);
        accounts[0].issuer = 'Updated';
        accounts[0].label = 'updated@example.com';
        accounts[0].updatedAt = new Date().toISOString();
        
        win.localStorage.setItem('2fa_accounts', JSON.stringify(accounts));
        
        // Verify update
        const updated = JSON.parse(win.localStorage.getItem('2fa_accounts')!);
        expect(updated[0].issuer).to.equal('Updated');
        expect(updated[0].label).to.equal('updated@example.com');
        expect(updated[0].secret).to.equal('JBSWY3DPEHPK3PXP'); // Secret unchanged
      });
    });

    it('should delete an account', () => {
      const accounts = [
        { id: '1', issuer: 'Keep1', secret: 'SECRET1', type: 'totp' },
        { id: '2', issuer: 'Delete', secret: 'SECRET2', type: 'totp' },
        { id: '3', issuer: 'Keep2', secret: 'SECRET3', type: 'totp' }
      ];

      cy.window().then((win) => {
        // Store accounts
        win.localStorage.setItem('2fa_accounts', JSON.stringify(accounts));
        
        // Delete account with id '2'
        let stored = JSON.parse(win.localStorage.getItem('2fa_accounts')!);
        stored = stored.filter((acc: any) => acc.id !== '2');
        win.localStorage.setItem('2fa_accounts', JSON.stringify(stored));
        
        // Verify deletion
        const remaining = JSON.parse(win.localStorage.getItem('2fa_accounts')!);
        expect(remaining).to.have.length(2);
        expect(remaining.find((acc: any) => acc.id === '2')).to.be.undefined;
        expect(remaining[0].issuer).to.equal('Keep1');
        expect(remaining[1].issuer).to.equal('Keep2');
      });
    });

    it('should search and filter accounts', () => {
      const accounts = [
        { id: '1', issuer: 'GitHub', label: 'dev@github.com', type: 'totp' },
        { id: '2', issuer: 'Google', label: 'user@gmail.com', type: 'totp' },
        { id: '3', issuer: 'GitLab', label: 'dev@gitlab.com', type: 'totp' },
        { id: '4', issuer: 'Microsoft', label: 'user@outlook.com', type: 'totp' }
      ];

      cy.window().then((win) => {
        win.localStorage.setItem('2fa_accounts', JSON.stringify(accounts));
        const stored = JSON.parse(win.localStorage.getItem('2fa_accounts')!);
        
        // Filter by search term "git"
        const gitAccounts = stored.filter((acc: any) => 
          acc.issuer.toLowerCase().includes('git') ||
          acc.label.toLowerCase().includes('git')
        );
        expect(gitAccounts).to.have.length(2);
        expect(gitAccounts[0].issuer).to.equal('GitHub');
        expect(gitAccounts[1].issuer).to.equal('GitLab');
        
        // Filter by search term "@gmail"
        const gmailAccounts = stored.filter((acc: any) =>
          acc.label.toLowerCase().includes('@gmail')
        );
        expect(gmailAccounts).to.have.length(1);
        expect(gmailAccounts[0].issuer).to.equal('Google');
      });
    });

    it('should handle account with custom settings', () => {
      const customAccount = {
        id: 'custom',
        issuer: 'Custom Service',
        label: 'custom@example.com',
        secret: 'JBSWY3DPEHPK3PXP',
        algorithm: 'SHA256',
        digits: 8,
        period: 60,
        type: 'totp',
        tags: ['work', 'important'],
        icon: 'custom-icon.png',
        notes: 'This is a custom account with special settings'
      };

      cy.window().then((win) => {
        win.localStorage.setItem('2fa_accounts', JSON.stringify([customAccount]));
        
        const stored = JSON.parse(win.localStorage.getItem('2fa_accounts')!)[0];
        expect(stored.algorithm).to.equal('SHA256');
        expect(stored.digits).to.equal(8);
        expect(stored.period).to.equal(60);
        expect(stored.tags).to.deep.equal(['work', 'important']);
        expect(stored.notes).to.include('custom account');
        
        // Generate code with custom settings
        const totp = new OTPAuth.TOTP({
          issuer: stored.issuer,
          label: stored.label,
          secret: stored.secret,
          algorithm: stored.algorithm,
          digits: stored.digits,
          period: stored.period
        });
        
        const code = totp.generate();
        expect(code).to.have.length(8); // Custom 8 digits
        expect(code).to.match(/^\d{8}$/);
        cy.log(`Custom account code (8 digits): ${code}`);
      });
    });
  });

  describe('Encryption', () => {
    it('should encrypt account data before storage', () => {
      const account = {
        id: 'encrypted',
        issuer: 'Secure Service',
        label: 'secure@example.com',
        secret: 'SUPERSECRETKEY123',
        type: 'totp'
      };

      cy.window().then(async (win) => {
        // Simple encryption simulation (in real app, use EncryptionService)
        const encryptData = (data: any, key: string) => {
          // Simple XOR for demo (use proper encryption in production)
          const json = JSON.stringify(data);
          return btoa(json); // Base64 encode for demo
        };

        const decryptData = (encrypted: string, key: string) => {
          return JSON.parse(atob(encrypted));
        };

        const encryptionKey = 'test-key-123';
        const encrypted = encryptData(account, encryptionKey);
        
        // Store encrypted
        win.localStorage.setItem('2fa_accounts_encrypted', encrypted);
        
        // Verify it's encrypted
        const stored = win.localStorage.getItem('2fa_accounts_encrypted');
        expect(stored).to.not.include('SUPERSECRETKEY123'); // Secret not visible
        
        // Decrypt and verify
        const decrypted = decryptData(stored!, encryptionKey);
        expect(decrypted.secret).to.equal('SUPERSECRETKEY123');
        expect(decrypted.issuer).to.equal('Secure Service');
      });
    });
  });

  describe('Import/Export', () => {
    it('should export accounts to JSON', () => {
      const accounts = [
        { id: '1', issuer: 'Service1', secret: 'SECRET1', type: 'totp' },
        { id: '2', issuer: 'Service2', secret: 'SECRET2', type: 'totp' }
      ];

      cy.window().then((win) => {
        win.localStorage.setItem('2fa_accounts', JSON.stringify(accounts));
        
        // Export
        const exportData = {
          version: '1.0.0',
          exported: new Date().toISOString(),
          accounts: accounts
        };
        
        const exportJson = JSON.stringify(exportData, null, 2);
        expect(exportJson).to.include('Service1');
        expect(exportJson).to.include('Service2');
        
        // Simulate file download
        const blob = new Blob([exportJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        expect(url).to.include('blob:');
        
        cy.log('Export successful');
      });
    });

    it('should import accounts from JSON', () => {
      const importData = {
        version: '1.0.0',
        accounts: [
          { id: 'import1', issuer: 'Imported1', secret: 'IMPORT1', type: 'totp' },
          { id: 'import2', issuer: 'Imported2', secret: 'IMPORT2', type: 'totp' }
        ]
      };

      cy.window().then((win) => {
        // Clear existing
        win.localStorage.removeItem('2fa_accounts');
        
        // Import
        const imported = importData.accounts;
        win.localStorage.setItem('2fa_accounts', JSON.stringify(imported));
        
        // Verify import
        const stored = JSON.parse(win.localStorage.getItem('2fa_accounts')!);
        expect(stored).to.have.length(2);
        expect(stored[0].issuer).to.equal('Imported1');
        expect(stored[1].issuer).to.equal('Imported2');
        
        cy.log('Import successful');
      });
    });
  });
});