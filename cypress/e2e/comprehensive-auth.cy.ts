/**
 * Comprehensive Authentication E2E Tests
 * Tests all authentication flows including registration, login, logout, social auth, and security features
 */

describe('Comprehensive Authentication Tests', () => {
  beforeEach(() => {
    cy.cleanup();
    cy.setupEmulator();
  });

  describe('User Registration', () => {
    it('should register a new user with valid data', () => {
      cy.fixture('test-users').then((users) => {
        const user = users.validUser;
        
        cy.visit('/register');
        
        // Verify registration form is visible
        cy.get('h1, h2').should('contain.text', 'Register');
        
        // Fill registration form
        cy.get('input[type="email"]').type(user.email);
        cy.get('input[name="password"]').type(user.password);
        cy.get('input[name="confirmPassword"]').type(user.password);
        cy.get('input[name="encryptionPassword"]').type(user.encryptionPassword);
        cy.get('input[name="confirmEncryptionPassword"]').type(user.encryptionPassword);
        cy.get('input[name="encryptionHint"]').type(user.encryptionHint);
        cy.get('input[name="name"]').type(user.name);
        
        // Accept terms and conditions
        cy.get('input[type="checkbox"]').check();
        
        // Submit form
        cy.get('button[type="submit"]').click();
        
        // Should redirect to dashboard
        cy.url().should('include', '/dashboard');
        cy.contains('Welcome').should('be.visible');
        
        // Verify user is logged in
        cy.get('[data-cy="user-menu"], [data-testid="user-menu"]').should('be.visible');
      });
    });

    it('should show validation errors for invalid data', () => {
      cy.visit('/register');
      
      // Test empty form submission
      cy.get('button[type="submit"]').click();
      cy.get('.error, [role="alert"], .text-red-500').should('have.length.at.least', 1);
      
      // Test invalid email
      cy.get('input[type="email"]').type('invalid-email');
      cy.get('button[type="submit"]').click();
      cy.contains('valid email', { matchCase: false }).should('be.visible');
      
      // Test weak password
      cy.get('input[type="email"]').clear().type('test@example.com');
      cy.get('input[name="password"]').type('weak');
      cy.get('button[type="submit"]').click();
      cy.contains('Password must be at least', { matchCase: false }).should('be.visible');
      
      // Test password mismatch
      cy.get('input[name="password"]').clear().type('StrongPassword123!');
      cy.get('input[name="confirmPassword"]').type('DifferentPassword123!');
      cy.get('button[type="submit"]').click();
      cy.contains('Passwords do not match', { matchCase: false }).should('be.visible');
      
      // Test encryption password mismatch
      cy.get('input[name="confirmPassword"]').clear().type('StrongPassword123!');
      cy.get('input[name="encryptionPassword"]').type('EncryptionPass123!');
      cy.get('input[name="confirmEncryptionPassword"]').type('DifferentEncryption123!');
      cy.get('button[type="submit"]').click();
      cy.contains('Encryption passwords do not match', { matchCase: false }).should('be.visible');
    });

    it('should prevent duplicate email registration', () => {
      cy.fixture('test-users').then((users) => {
        const user = users.validUser;
        
        // Register user first time
        cy.register(user);
        cy.visit('/login');
        
        // Try to register again with same email
        cy.visit('/register');
        cy.get('input[type="email"]').type(user.email);
        cy.get('input[name="password"]').type(user.password);
        cy.get('input[name="confirmPassword"]').type(user.password);
        cy.get('input[name="encryptionPassword"]').type(user.encryptionPassword);
        cy.get('input[name="confirmEncryptionPassword"]').type(user.encryptionPassword);
        cy.get('input[name="name"]').type(user.name);
        cy.get('input[type="checkbox"]').check();
        cy.get('button[type="submit"]').click();
        
        // Should show error
        cy.contains('email already exists', { matchCase: false }).should('be.visible');
      });
    });

    it('should handle network errors gracefully', () => {
      cy.intercept('POST', '**/auth/register', { forceNetworkError: true }).as('registerError');
      
      cy.fixture('test-users').then((users) => {
        const user = users.validUser;
        
        cy.visit('/register');
        cy.get('input[type="email"]').type(user.email);
        cy.get('input[name="password"]').type(user.password);
        cy.get('input[name="confirmPassword"]').type(user.password);
        cy.get('input[name="encryptionPassword"]').type(user.encryptionPassword);
        cy.get('input[name="confirmEncryptionPassword"]').type(user.encryptionPassword);
        cy.get('input[name="name"]').type(user.name);
        cy.get('input[type="checkbox"]').check();
        cy.get('button[type="submit"]').click();
        
        cy.wait('@registerError');
        cy.contains('network error', { matchCase: false }).should('be.visible');
      });
    });
  });

  describe('User Login', () => {
    beforeEach(() => {
      cy.fixture('test-users').then((users) => {
        cy.register(users.validUser);
        cy.visit('/login');
      });
    });

    it('should login with valid credentials', () => {
      cy.fixture('test-users').then((users) => {
        const user = users.validUser;
        
        cy.get('input[type="email"]').type(user.email);
        cy.get('input[type="password"]').type(user.password);
        cy.get('button[type="submit"]').click();
        
        // Should show encryption password prompt
        cy.contains('encryption password', { matchCase: false }).should('be.visible');
        cy.get('input[type="password"]').type(user.encryptionPassword);
        cy.get('button[type="submit"], button:contains("Unlock")').click();
        
        // Should redirect to dashboard
        cy.url().should('include', '/dashboard');
        cy.get('[data-cy="user-menu"], [data-testid="user-menu"]').should('be.visible');
      });
    });

    it('should show error for invalid credentials', () => {
      cy.fixture('test-users').then((users) => {
        const user = users.validUser;
        
        cy.get('input[type="email"]').type(user.email);
        cy.get('input[type="password"]').type('WrongPassword123!');
        cy.get('button[type="submit"]').click();
        
        cy.contains('Invalid', { matchCase: false }).should('be.visible');
      });
    });

    it('should show error for wrong encryption password', () => {
      cy.fixture('test-users').then((users) => {
        const user = users.validUser;
        
        cy.get('input[type="email"]').type(user.email);
        cy.get('input[type="password"]').type(user.password);
        cy.get('button[type="submit"]').click();
        
        cy.get('input[type="password"]').type('WrongEncryption123!');
        cy.get('button[type="submit"], button:contains("Unlock")').click();
        
        cy.contains('Invalid encryption password', { matchCase: false }).should('be.visible');
      });
    });

    it('should remember login state after refresh', () => {
      cy.fixture('test-users').then((users) => {
        const user = users.validUser;
        
        cy.login(user.email, user.password, user.encryptionPassword);
        
        // Refresh page
        cy.reload();
        
        // Should still be logged in
        cy.url().should('include', '/dashboard');
        cy.get('[data-cy="user-menu"], [data-testid="user-menu"]').should('be.visible');
      });
    });

    it('should handle "Remember Me" functionality', () => {
      cy.fixture('test-users').then((users) => {
        const user = users.validUser;
        
        cy.get('input[type="email"]').type(user.email);
        cy.get('input[type="password"]').type(user.password);
        cy.get('input[type="checkbox"], [data-cy="remember-me"]').check();
        cy.get('button[type="submit"]').click();
        
        cy.get('input[type="password"]').type(user.encryptionPassword);
        cy.get('button[type="submit"], button:contains("Unlock")').click();
        
        // Logout and visit login again
        cy.get('[data-cy="user-menu"], [data-testid="user-menu"]').click();
        cy.contains('Logout').click();
        cy.visit('/login');
        
        // Email should be pre-filled
        cy.get('input[type="email"]').should('have.value', user.email);
      });
    });
  });

  describe('Social Login', () => {
    beforeEach(() => {
      // Mock social login providers
      cy.window().then((win) => {
        (win as any).mockSocialAuth = {
          google: () => Promise.resolve({
            user: {
              email: 'socialuser@gmail.com',
              displayName: 'Social User',
              photoURL: 'https://example.com/photo.jpg'
            }
          }),
          github: () => Promise.resolve({
            user: {
              email: 'socialuser@github.com',
              displayName: 'GitHub User'
            }
          }),
          apple: () => Promise.resolve({
            user: {
              email: 'socialuser@icloud.com',
              displayName: 'Apple User'
            }
          })
        };
      });
    });

    it('should login with Google', () => {
      cy.visit('/login');
      
      cy.get('button[data-provider="google"], button:contains("Google")').click();
      
      // Mock successful Google auth
      cy.window().then((win) => {
        (win as any).dispatchEvent(new CustomEvent('social-auth-success', {
          detail: { provider: 'google', email: 'socialuser@gmail.com' }
        }));
      });
      
      cy.url().should('include', '/dashboard');
      cy.get('[data-cy="user-menu"], [data-testid="user-menu"]').should('be.visible');
    });

    it('should login with GitHub', () => {
      cy.visit('/login');
      
      cy.get('button[data-provider="github"], button:contains("GitHub")').click();
      
      cy.window().then((win) => {
        (win as any).dispatchEvent(new CustomEvent('social-auth-success', {
          detail: { provider: 'github', email: 'socialuser@github.com' }
        }));
      });
      
      cy.url().should('include', '/dashboard');
    });

    it('should handle social login errors', () => {
      cy.visit('/login');
      
      cy.get('button[data-provider="google"], button:contains("Google")').click();
      
      cy.window().then((win) => {
        (win as any).dispatchEvent(new CustomEvent('social-auth-error', {
          detail: { error: 'popup_closed_by_user' }
        }));
      });
      
      cy.contains('authentication was cancelled', { matchCase: false }).should('be.visible');
    });

    it('should link social accounts to existing user', () => {
      cy.fixture('test-users').then((users) => {
        const user = users.validUser;
        
        // Login with regular account first
        cy.register(user);
        cy.visit('/settings/account');
        
        // Link Google account
        cy.get('button[data-provider="google"], button:contains("Link Google")').click();
        
        cy.window().then((win) => {
          (win as any).dispatchEvent(new CustomEvent('social-auth-success', {
            detail: { provider: 'google', email: 'socialuser@gmail.com', link: true }
          }));
        });
        
        cy.contains('Google account linked', { matchCase: false }).should('be.visible');
      });
    });
  });

  describe('Password Reset', () => {
    beforeEach(() => {
      cy.fixture('test-users').then((users) => {
        cy.register(users.validUser);
        cy.visit('/login');
      });
    });

    it('should send password reset email', () => {
      cy.intercept('POST', '**/auth/password-reset', { statusCode: 200 }).as('passwordReset');
      
      cy.get('a:contains("Forgot"), button:contains("Forgot")').click();
      
      cy.fixture('test-users').then((users) => {
        cy.get('input[type="email"]').type(users.validUser.email);
        cy.get('button[type="submit"]').click();
        
        cy.wait('@passwordReset');
        cy.contains('reset link sent', { matchCase: false }).should('be.visible');
      });
    });

    it('should reset password with valid token', () => {
      const resetToken = 'mock-reset-token-123';
      
      cy.visit(`/reset-password?token=${resetToken}`);
      
      cy.get('input[name="newPassword"]').type('NewPassword123!');
      cy.get('input[name="confirmPassword"]').type('NewPassword123!');
      cy.get('button[type="submit"]').click();
      
      cy.contains('password reset successful', { matchCase: false }).should('be.visible');
      cy.url().should('include', '/login');
    });

    it('should show error for expired token', () => {
      cy.intercept('POST', '**/auth/reset-password', {
        statusCode: 400,
        body: { error: 'Token expired' }
      }).as('expiredToken');
      
      cy.visit('/reset-password?token=expired-token');
      
      cy.get('input[name="newPassword"]').type('NewPassword123!');
      cy.get('input[name="confirmPassword"]').type('NewPassword123!');
      cy.get('button[type="submit"]').click();
      
      cy.wait('@expiredToken');
      cy.contains('token expired', { matchCase: false }).should('be.visible');
    });
  });

  describe('Session Management', () => {
    beforeEach(() => {
      cy.fixture('test-users').then((users) => {
        cy.register(users.validUser);
      });
    });

    it('should logout successfully', () => {
      cy.fixture('test-users').then((users) => {
        cy.login(users.validUser.email, users.validUser.password, users.validUser.encryptionPassword);
        
        // Click user menu
        cy.get('[data-cy="user-menu"], [data-testid="user-menu"]').click();
        cy.contains('Logout').click();
        
        // Should redirect to login
        cy.url().should('include', '/login');
        
        // Should clear user data
        cy.visit('/dashboard');
        cy.url().should('include', '/login');
      });
    });

    it('should handle session timeout', () => {
      cy.fixture('test-users').then((users) => {
        cy.login(users.validUser.email, users.validUser.password, users.validUser.encryptionPassword);
        
        // Mock expired session
        cy.window().then((win) => {
          (win as any).dispatchEvent(new CustomEvent('session-expired'));
        });
        
        // Should show timeout warning
        cy.contains('session expired', { matchCase: false }).should('be.visible');
        
        // Should redirect to login after timeout
        cy.url().should('include', '/login');
      });
    });

    it('should handle concurrent sessions', () => {
      cy.fixture('test-users').then((users) => {
        cy.login(users.validUser.email, users.validUser.password, users.validUser.encryptionPassword);
        
        // Simulate login from another device
        cy.window().then((win) => {
          (win as any).dispatchEvent(new CustomEvent('concurrent-session-detected', {
            detail: { deviceInfo: 'Chrome on Windows' }
          }));
        });
        
        // Should show concurrent session warning
        cy.contains('logged in from another device', { matchCase: false }).should('be.visible');
        
        // User should be able to continue or logout
        cy.get('button:contains("Continue"), button:contains("Keep Session")').should('be.visible');
        cy.get('button:contains("Logout"), button:contains("End Session")').should('be.visible');
      });
    });
  });

  describe('Account Lockout Protection', () => {
    it('should lockout account after failed login attempts', () => {
      cy.fixture('test-users').then((users) => {
        cy.register(users.validUser);
        cy.visit('/login');
        
        // Attempt login 5 times with wrong password
        for (let i = 0; i < 5; i++) {
          cy.get('input[type="email"]').clear().type(users.validUser.email);
          cy.get('input[type="password"]').clear().type('WrongPassword123!');
          cy.get('button[type="submit"]').click();
          
          if (i < 4) {
            cy.contains('Invalid', { matchCase: false }).should('be.visible');
          }
        }
        
        // Should show lockout message
        cy.contains('account locked', { matchCase: false }).should('be.visible');
        cy.contains('try again in', { matchCase: false }).should('be.visible');
        
        // Login button should be disabled
        cy.get('button[type="submit"]').should('be.disabled');
      });
    });

    it('should show lockout countdown', () => {
      cy.fixture('test-users').then((users) => {
        cy.register(users.validUser);
        cy.visit('/login');
        
        // Mock account lockout state
        cy.window().then((win) => {
          (win as any).dispatchEvent(new CustomEvent('account-locked', {
            detail: { unlockTime: Date.now() + 300000 } // 5 minutes
          }));
        });
        
        cy.contains('locked for', { matchCase: false }).should('be.visible');
        cy.get('[data-cy="lockout-timer"], .lockout-countdown').should('be.visible');
      });
    });
  });

  describe('Two-Factor Authentication Setup', () => {
    beforeEach(() => {
      cy.fixture('test-users').then((users) => {
        cy.register(users.validUser);
        cy.login(users.validUser.email, users.validUser.password, users.validUser.encryptionPassword);
      });
    });

    it('should enable 2FA for account security', () => {
      cy.visit('/settings/security');
      
      cy.get('button:contains("Enable 2FA"), [data-cy="enable-2fa"]').click();
      
      // Should show QR code and backup codes
      cy.get('[data-cy="2fa-qr-code"], .qr-code-container').should('be.visible');
      cy.get('[data-cy="backup-codes"], .backup-codes').should('be.visible');
      
      // Enter verification code
      cy.get('input[data-cy="2fa-verification"], input[name="verificationCode"]').type('123456');
      cy.get('button:contains("Verify"), button[type="submit"]').click();
      
      cy.contains('2FA enabled', { matchCase: false }).should('be.visible');
    });

    it('should require 2FA code on login when enabled', () => {
      // Enable 2FA first
      cy.visit('/settings/security');
      cy.get('button:contains("Enable 2FA")').click();
      cy.get('input[data-cy="2fa-verification"]').type('123456');
      cy.get('button:contains("Verify")').click();
      
      // Logout and login again
      cy.get('[data-cy="user-menu"]').click();
      cy.contains('Logout').click();
      
      cy.fixture('test-users').then((users) => {
        cy.get('input[type="email"]').type(users.validUser.email);
        cy.get('input[type="password"]').type(users.validUser.password);
        cy.get('button[type="submit"]').click();
        
        // Should prompt for 2FA code
        cy.contains('Enter your 2FA code', { matchCase: false }).should('be.visible');
        cy.get('input[data-cy="2fa-code"]').type('123456');
        cy.get('button[type="submit"]').click();
        
        // Should then prompt for encryption password
        cy.get('input[type="password"]').type(users.validUser.encryptionPassword);
        cy.get('button[type="submit"]').click();
        
        cy.url().should('include', '/dashboard');
      });
    });
  });

  describe('Device Management', () => {
    beforeEach(() => {
      cy.fixture('test-users').then((users) => {
        cy.register(users.validUser);
        cy.login(users.validUser.email, users.validUser.password, users.validUser.encryptionPassword);
      });
    });

    it('should register new device', () => {
      cy.visit('/settings/devices');
      
      // Current device should be listed
      cy.get('[data-cy="device-list"], .device-list').should('contain', 'Current Device');
      cy.get('[data-cy="device-list"], .device-list').should('contain', 'Chrome');
      
      // Device should have trust status
      cy.get('.device-trusted, [data-cy="trusted-device"]').should('be.visible');
    });

    it('should handle device verification', () => {
      // Mock new device login
      cy.window().then((win) => {
        (win as any).dispatchEvent(new CustomEvent('new-device-detected', {
          detail: { deviceInfo: 'Firefox on Windows' }
        }));
      });
      
      cy.contains('new device detected', { matchCase: false }).should('be.visible');
      cy.get('button:contains("Trust Device"), button:contains("Verify")').click();
      
      // Should send verification email
      cy.contains('verification email sent', { matchCase: false }).should('be.visible');
    });

    it('should revoke device access', () => {
      // Mock multiple devices
      cy.window().then((win) => {
        (win as any).mockDevices = [
          { id: '1', name: 'Chrome on Windows', trusted: true, lastSeen: new Date() },
          { id: '2', name: 'Safari on iPhone', trusted: true, lastSeen: new Date() }
        ];
      });
      
      cy.visit('/settings/devices');
      cy.reload(); // Trigger device list update
      
      // Revoke access to iPhone
      cy.get('[data-device-id="2"], [data-cy="device-2"]')
        .find('button:contains("Revoke"), button:contains("Remove")')
        .click();
      
      cy.get('button:contains("Confirm"), button:contains("Yes")').click();
      cy.contains('device access revoked', { matchCase: false }).should('be.visible');
    });
  });
});