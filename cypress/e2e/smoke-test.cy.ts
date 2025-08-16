describe('Smoke Tests', () => {
  it('should load the application', () => {
    cy.visit('/');
    cy.get('body').should('be.visible');
    cy.title().should('contain', '2FA Studio');
  });

  it('should navigate to login page', () => {
    cy.visit('/login');
    cy.get('body').should('be.visible');
    cy.url().should('include', '/login');
  });

  it('should navigate to register page', () => {
    cy.visit('/register');
    cy.get('body').should('be.visible');
    cy.url().should('include', '/register');
  });
});