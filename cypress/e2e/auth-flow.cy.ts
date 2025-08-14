/**
 * Authentication Flow Tests
 * Tests user registration, login, and auth state management
 */

describe('Authentication Flow', () => {
  beforeEach(() => {
    // Clear localStorage and cookies
    cy.window().then((win) => {
      win.localStorage.clear();
      win.sessionStorage.clear();
    });
    cy.clearCookies();
    
    // Visit the app
    cy.visit('/');
  });

  describe('User Registration', () => {
    it('should navigate to register page and show registration form', () => {
      // Should redirect to login by default (no auth)
      cy.url().should('include', '/login');
      
      // Click register link
      cy.contains('Create an account').click();
      cy.url().should('include', '/register');
      
      // Check form elements exist
      cy.get('input[type="email"]').should('exist');
      cy.get('input[type="password"]').should('exist');
      cy.get('button[type="submit"]').should('contain', 'Create Account');
    });

    it('should validate email format', () => {
      cy.visit('/register');
      
      // Enter invalid email
      cy.get('input[type="email"]').type('invalid-email');
      cy.get('input[type="password"]').type('password123');
      cy.get('button[type="submit"]').click();
      
      // Should show validation error (form won't submit)
      cy.url().should('include', '/register'); // Still on register page
    });

    it('should validate password strength', () => {
      cy.visit('/register');
      
      cy.get('input[type="email"]').type('test@example.com');
      cy.get('input[type="password"]').type('123');
      
      // Should show password strength indicator
      cy.get('[data-testid="password-strength"]').should('exist');
    });
  });

  describe('User Login', () => {
    it('should show login form by default', () => {
      cy.visit('/');
      cy.url().should('include', '/login');
      
      // Check form elements
      cy.get('input[type="email"]').should('exist');
      cy.get('input[type="password"]').should('exist');
      cy.get('button[type="submit"]').should('contain', 'Sign In');
    });

    it('should handle login form submission', () => {
      cy.visit('/login');
      
      cy.get('input[type="email"]').type('test@example.com');
      cy.get('input[type="password"]').type('password123');
      cy.get('button[type="submit"]').click();
      
      // Should attempt login (may show error for invalid credentials)
      cy.get('button[type="submit"]').should('not.be.disabled');
    });

    it('should show forgot password option', () => {
      cy.visit('/login');
      cy.contains('Forgot password?').should('exist');
    });
  });

  describe('Authentication State', () => {
    it('should redirect unauthenticated users to login', () => {
      cy.visit('/accounts');
      cy.url().should('include', '/login');
      
      cy.visit('/settings');
      cy.url().should('include', '/login');
      
      cy.visit('/backup');
      cy.url().should('include', '/login');
    });

    it('should allow access to public pages without auth', () => {
      // These pages should be accessible without authentication
      cy.visit('/login');
      cy.url().should('include', '/login');
      
      cy.visit('/register');
      cy.url().should('include', '/register');
    });
  });

  describe('Social Login', () => {
    it('should show social login buttons', () => {
      cy.visit('/login');
      
      // Check for social login buttons (if implemented)
      cy.get('[data-testid="social-login"]').should('exist');
    });
  });

  describe('Navigation', () => {
    it('should navigate between login and register', () => {
      cy.visit('/login');
      
      // Go to register
      cy.contains('Create an account').click();
      cy.url().should('include', '/register');
      
      // Go back to login
      cy.contains('Already have an account?').click();
      cy.url().should('include', '/login');
    });
  });

  describe('Form Validation', () => {
    it('should prevent submission with empty fields', () => {
      cy.visit('/login');
      
      // Try to submit empty form
      cy.get('button[type="submit"]').click();
      
      // Should still be on login page
      cy.url().should('include', '/login');
    });

    it('should show loading state during submission', () => {
      cy.visit('/login');
      
      cy.get('input[type="email"]').type('test@example.com');
      cy.get('input[type="password"]').type('password123');
      
      // Intercept the auth request to control timing
      cy.intercept('POST', '**/auth/**', { delay: 1000 }).as('authRequest');
      
      cy.get('button[type="submit"]').click();
      
      // Check loading state
      cy.get('button[type="submit"]').should('contain', 'Signing in...');
    });
  });
});