/**
 * Authentication E2E Tests
 */

describe('Authentication', () => {
  beforeEach(() => {
    cy.cleanup();
  });

  describe('Registration', () => {
    it('should allow new user registration', () => {
      const timestamp = Date.now();
      const email = `test${timestamp}@2fastudio.app`;
      const password = 'TestPassword123!';
      const encryptionPassword = 'Encryption123!';

      cy.visit('/register');
      
      // Fill registration form
      cy.get('input[type="email"]').type(email);
      cy.get('input[name="password"]').type(password);
      cy.get('input[name="confirmPassword"]').type(password);
      cy.get('input[name="encryptionPassword"]').type(encryptionPassword);
      cy.get('input[name="confirmEncryptionPassword"]').type(encryptionPassword);
      cy.get('input[name="encryptionHint"]').type('Test hint');
      
      // Submit form
      cy.get('button[type="submit"]').click();
      
      // Should redirect to dashboard
      cy.url().should('include', '/dashboard');
      cy.contains('Welcome to 2FA Studio').should('be.visible');
    });

    it('should show validation errors for weak passwords', () => {
      cy.visit('/register');
      
      cy.get('input[type="email"]').type('test@example.com');
      cy.get('input[name="password"]').type('weak');
      cy.get('input[name="confirmPassword"]').type('weak');
      
      cy.get('button[type="submit"]').click();
      
      cy.contains('Password must be at least 8 characters').should('be.visible');
    });

    it('should show error for mismatched passwords', () => {
      cy.visit('/register');
      
      cy.get('input[type="email"]').type('test@example.com');
      cy.get('input[name="password"]').type('Password123!');
      cy.get('input[name="confirmPassword"]').type('Different123!');
      
      cy.get('input[name="encryptionPassword"]').type('Encryption123!');
      cy.get('input[name="confirmEncryptionPassword"]').type('Encryption123!');
      
      cy.get('button[type="submit"]').click();
      
      cy.contains('Passwords do not match').should('be.visible');
    });
  });

  describe('Login', () => {
    const email = 'test@2fastudio.app';
    const password = 'TestPassword123!';
    const encryptionPassword = 'Encryption123!';

    beforeEach(() => {
      // Create test user (in real app, this would be done via API)
      cy.visit('/register');
      cy.get('input[type="email"]').type(email);
      cy.get('input[name="password"]').type(password);
      cy.get('input[name="confirmPassword"]').type(password);
      cy.get('input[name="encryptionPassword"]').type(encryptionPassword);
      cy.get('input[name="confirmEncryptionPassword"]').type(encryptionPassword);
      cy.get('button[type="submit"]').click();
      cy.wait(2000);
      cy.visit('/login');
    });

    it('should login with valid credentials', () => {
      cy.get('input[type="email"]').type(email);
      cy.get('input[type="password"]').type(password);
      cy.get('button[type="submit"]').click();
      
      // Should show encryption password prompt
      cy.contains('Enter Encryption Password').should('be.visible');
      cy.get('input[type="password"]').type(encryptionPassword);
      cy.get('button').contains('Unlock').click();
      
      // Should redirect to dashboard
      cy.url().should('include', '/dashboard');
    });

    it('should show error for invalid credentials', () => {
      cy.get('input[type="email"]').type(email);
      cy.get('input[type="password"]').type('WrongPassword123!');
      cy.get('button[type="submit"]').click();
      
      cy.contains('Invalid email or password').should('be.visible');
    });

    it('should show error for wrong encryption password', () => {
      cy.get('input[type="email"]').type(email);
      cy.get('input[type="password"]').type(password);
      cy.get('button[type="submit"]').click();
      
      cy.get('input[type="password"]').type('WrongEncryption123!');
      cy.get('button').contains('Unlock').click();
      
      cy.contains('Invalid encryption password').should('be.visible');
    });
  });

  describe('Logout', () => {
    it('should logout successfully', () => {
      // Login first
      cy.login(
        Cypress.env('TEST_EMAIL'),
        Cypress.env('TEST_PASSWORD'),
        Cypress.env('TEST_ENCRYPTION_PASSWORD')
      );
      
      // Click user menu
      cy.get('[data-testid="user-menu"]').click();
      cy.contains('Logout').click();
      
      // Should redirect to login
      cy.url().should('include', '/login');
    });
  });

  describe('Protected Routes', () => {
    it('should redirect to login when accessing protected route', () => {
      cy.visit('/dashboard');
      cy.url().should('include', '/login');
      
      cy.visit('/accounts');
      cy.url().should('include', '/login');
      
      cy.visit('/settings');
      cy.url().should('include', '/login');
    });
  });
});