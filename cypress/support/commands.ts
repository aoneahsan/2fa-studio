/// <reference types="cypress" />

// ***********************************************
// Custom commands for 2FA Studio E2E tests
// ***********************************************

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to login to the application
       * @example cy.login('test@example.com', 'password123', 'encryptionPassword')
       */
      login(email: string, password: string, encryptionPassword: string): Chainable<void>;
      
      /**
       * Custom command to register a new user
       * @example cy.register('test@example.com', 'password123', 'encryptionPassword')
       */
      register(email: string, password: string, encryptionPassword: string): Chainable<void>;
      
      /**
       * Custom command to add a 2FA account manually
       * @example cy.addAccount('Google', 'john@gmail.com', 'JBSWY3DPEHPK3PXP')
       */
      addAccount(issuer: string, label: string, secret: string): Chainable<void>;
      
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
    }
  }
}

// Login command
Cypress.Commands.add('login', (email: string, password: string, encryptionPassword: string) => {
  cy.visit('/login');
  cy.get('input[type="email"]').type(email);
  cy.get('input[type="password"]').type(password);
  cy.get('button[type="submit"]').click();
  
  // Handle encryption password
  cy.get('input[placeholder*="encryption password"]', { timeout: 10000 }).should('be.visible');
  cy.get('input[placeholder*="encryption password"]').type(encryptionPassword);
  cy.get('button[type="submit"]').click();
  
  // Wait for redirect to dashboard
  cy.url().should('include', '/dashboard');
});

// Register command
Cypress.Commands.add('register', (email: string, password: string, encryptionPassword: string) => {
  cy.visit('/register');
  cy.get('input[type="email"]').type(email);
  cy.get('input[type="password"]').first().type(password);
  cy.get('input[type="password"]').eq(1).type(password); // Confirm password
  cy.get('input[placeholder*="encryption password"]').first().type(encryptionPassword);
  cy.get('input[placeholder*="encryption password"]').eq(1).type(encryptionPassword); // Confirm
  cy.get('button[type="submit"]').click();
  
  // Wait for redirect to dashboard
  cy.url().should('include', '/dashboard');
});

// Add account command
Cypress.Commands.add('addAccount', (issuer: string, label: string, secret: string) => {
  cy.visit('/accounts');
  cy.get('button').contains('Add Account').click();
  cy.get('button').contains('Enter Manually').click();
  
  cy.get('input[name="issuer"]').type(issuer);
  cy.get('input[name="label"]').type(label);
  cy.get('input[name="secret"]').type(secret);
  cy.get('button').contains('Add Account').click();
  
  // Verify account was added
  cy.contains(issuer).should('be.visible');
});

// Verify TOTP code command
Cypress.Commands.add('verifyTOTPCode', (issuer: string) => {
  cy.contains(issuer).parent().parent().within(() => {
    // Check that a 6-digit code is displayed
    cy.get('[data-testid="totp-code"]').should('match', /^\d{6}$/);
    
    // Check that countdown is visible
    cy.get('[data-testid="countdown"]').should('be.visible');
  });
});

// Cleanup command
Cypress.Commands.add('cleanup', () => {
  // This would typically call an API to clean up test data
  // For now, we'll just clear local storage
  cy.clearLocalStorage();
  cy.clearCookies();
});

export {};