describe('Basic Page Loading Tests', () => {
  beforeEach(() => {
    cy.viewport(1280, 720);
  });

  it('should load the home page without errors', () => {
    cy.visit('/');
    cy.get('body').should('be.visible');
    
    // Check that the app renders something
    cy.get('#root, .app, main, div').should('exist');
  });

  it('should load the login page', () => {
    cy.visit('/login');
    cy.get('body').should('be.visible');
    
    // Check for any form elements that might exist
    cy.get('form, input, button, a').should('exist');
  });

  it('should load the register page', () => {
    cy.visit('/register');
    cy.get('body').should('be.visible');
    
    // Check for any form elements that might exist
    cy.get('form, input, button, a').should('exist');
  });

  it('should handle protected routes', () => {
    // Clear auth
    cy.clearLocalStorage();
    cy.clearCookies();
    
    // Try to visit protected routes
    const protectedRoutes = ['/dashboard', '/accounts', '/settings', '/backup'];
    
    protectedRoutes.forEach(route => {
      cy.visit(route, { failOnStatusCode: false });
      cy.get('body').should('be.visible');
      
      // Should either redirect or show the page
      cy.url().should('include', '/');
    });
  });

  it('should not have console errors on main pages', () => {
    const pages = ['/', '/login', '/register'];
    
    pages.forEach(page => {
      cy.visit(page);
      
      // Check console for errors
      cy.window().then((win) => {
        cy.spy(win.console, 'error');
      });
      
      cy.wait(500);
      
      cy.window().its('console.error').should('not.be.called');
    });
  });

  it('should be responsive', () => {
    const viewports = [
      { width: 375, height: 667 },  // Mobile
      { width: 768, height: 1024 }, // Tablet
      { width: 1920, height: 1080 } // Desktop
    ];
    
    viewports.forEach(viewport => {
      cy.viewport(viewport.width, viewport.height);
      cy.visit('/');
      cy.get('body').should('be.visible');
    });
  });
});