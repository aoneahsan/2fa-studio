// ***********************************************
// Custom commands for 2FA Studio E2E tests
// ***********************************************

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to login to the application
       * @example cy.login('test@example.com', 'password123')
       */
      login(email: string, password: string): Chainable<void>;
      
      /**
       * Custom command to register a new user
       * @example cy.register('test@example.com', 'password123', 'Test User')
       */
      register(email: string, password: string, name: string): Chainable<void>;
      
      /**
       * Custom command to add a 2FA account manually
       * @example cy.addAccount({ issuer: 'Google', label: 'john@gmail.com', secret: 'JBSWY3DPEHPK3PXP' })
       */
      addAccount(account: { issuer: string; label: string; secret: string; type?: 'totp' | 'hotp' }): Chainable<void>;
      
      /**
       * Custom command to verify TOTP code is displayed
       * @example cy.verifyTOTPCode('Google')
       */
      verifyTOTPCode(issuer: string): Chainable<void>;
      
      /**
       * Custom command to cleanup test data
       * @example cy.cleanup()
       */
      cleanup(): Chainable<void>;
      
      /**
       * Mock biometric authentication
       */
      mockBiometric(success?: boolean): Chainable<void>;
      
      /**
       * Setup Firebase emulator
       */
      setupEmulator(): Chainable<void>;
    }
  }
}

// Login command
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/login');
  cy.get('[data-cy=login-email]').type(email);
  cy.get('[data-cy=login-password]').type(password);
  cy.get('[data-cy=login-submit]').click();
  
  // Wait for redirect to dashboard
  cy.url().should('include', '/dashboard');
  cy.get('[data-cy=loading]').should('not.exist');
});

// Register command
Cypress.Commands.add('register', (email: string, password: string, name: string) => {
  cy.visit('/register');
  cy.get('[data-cy=register-email]').type(email);
  cy.get('[data-cy=register-password]').type(password);
  cy.get('[data-cy=register-name]').type(name);
  cy.get('[data-cy=register-submit]').click();
  
  // Wait for redirect to dashboard
  cy.url().should('include', '/dashboard');
  cy.get('[data-cy=loading]').should('not.exist');
});

// Add account command
Cypress.Commands.add('addAccount', (account) => {
  cy.get('[data-cy=add-account-btn]').click();
  cy.get('[data-cy=manual-entry-tab]').click();
  
  cy.get('[data-cy=account-issuer]').type(account.issuer);
  cy.get('[data-cy=account-label]').type(account.label);
  cy.get('[data-cy=account-secret]').type(account.secret);
  
  if (account.type === 'hotp') {
    cy.get('[data-cy=account-type]').select('hotp');
    cy.get('[data-cy=account-counter]').type('0');
  }
  
  cy.get('[data-cy=save-account-btn]').click();
  cy.get('[data-cy=toast-success]').should('contain', 'Account added');
  cy.get('[data-cy=account-card]').should('exist');
});

// Verify TOTP code command
Cypress.Commands.add('verifyTOTPCode', (issuer: string) => {
  cy.get('[data-cy=account-card]').contains(issuer).parent().within(() => {
    // Check that a 6-digit code is displayed
    cy.get('[data-cy=account-code]').should('match', /^\d{6}$/);
    
    // Check that countdown is visible for TOTP
    cy.get('[data-cy=countdown-timer]').should('be.visible');
  });
});

// Cleanup command
Cypress.Commands.add('cleanup', () => {
  cy.clearLocalStorage();
  cy.clearCookies();
  
  // Clear IndexedDB if available
  cy.window().then((win) => {
    if (win.indexedDB) {
      win.indexedDB.deleteDatabase('firebaseLocalStorageDb');
    }
  });
});

// Mock biometric authentication
Cypress.Commands.add('mockBiometric', (success = true) => {
  cy.window().then((win) => {
    (win as unknown).BiometricAuth = {
      isAvailable: () => Promise.resolve({ isAvailable: true }),
      verify: () => Promise.resolve({ isVerified: success })
    };
  });
});

// Setup Firebase emulator
Cypress.Commands.add('setupEmulator', () => {
  cy.window().then((win) => {
    // Initialize Firebase with emulator settings
    if ((win as unknown).firebase) {
      (win as unknown).firebase.auth().useEmulator('http://localhost:9099');
      (win as unknown).firebase.firestore().useEmulator('localhost', 8080);
      (win as unknown).firebase.storage().useEmulator('localhost', 9199);
      (win as unknown).firebase.functions().useEmulator('localhost', 5001);
    }
  });
});

// Additional helper functions can be added here

export {};