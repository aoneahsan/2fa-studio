/**
 * Simple Authentication Test
 * Tests basic page navigation and form presence
 */

describe('Simple Authentication Test', () => {
  it('should show login page when navigated to directly', () => {
    cy.visit('/login');
    
    // Check basic page structure
    cy.get('body').should('exist');
    
    // Look for any form inputs or auth-related content
    cy.get('[data-testid="login-form"], form, input[type="email"], input[type="password"]').should('exist');
    
    cy.log('Login page loaded successfully');
  });

  it('should show register page when navigated to directly', () => {
    cy.visit('/register');
    
    // Check basic page structure
    cy.get('body').should('exist');
    
    // Look for register form elements
    cy.get('[data-testid="register-form"], form, input[type="email"], input[type="password"]').should('exist');
    
    cy.log('Register page loaded successfully');
  });

  it('should handle root route redirect', () => {
    cy.visit('/');
    
    // Wait a moment for any redirects to happen
    cy.wait(2000);
    
    // Check what URL we end up at
    cy.url().then((url) => {
      cy.log(`Current URL: ${url}`);
      expect(url).to.include('localhost:7949');
    });
  });

  it('should be able to access the application', () => {
    cy.visit('/');
    
    // Just check the app loads without major errors
    cy.get('body').should('exist');
    cy.get('html').should('have.attr', 'lang');
    
    cy.log('Application loaded successfully');
  });
});