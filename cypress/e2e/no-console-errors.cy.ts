describe('Console Error Check', () => {
  beforeEach(() => {
    // Ignore Firebase test errors
    cy.on('uncaught:exception', (err) => {
      if (err.message.includes('Firebase') || 
          err.message.includes('installations/request-failed') ||
          err.message.includes('API key not valid')) {
        return false; // Ignore Firebase errors in test environment
      }
      return true;
    });
  });
  
  it('should load without critical console errors', () => {
    // Track console errors
    const consoleErrors: string[] = [];
    
    cy.on('window:before:load', (win) => {
      const originalError = win.console.error;
      win.console.error = (...args) => {
        const message = args.join(' ');
        // Ignore known non-critical errors
        if (!message.includes('DevTools') && 
            !message.includes('React DevTools') &&
            !message.includes('Mock Firebase') &&
            !message.includes('test mode')) {
          consoleErrors.push(message);
        }
        originalError.apply(win.console, args);
      };
    });
    
    // Visit the home page
    cy.visit('/');
    
    // Wait for the page to load
    cy.get('body').should('be.visible');
    
    // Check that there are no critical errors
    cy.wait(2000).then(() => {
      const criticalErrors = consoleErrors.filter(error => 
        error.includes('ReferenceError') || 
        error.includes('TypeError') || 
        error.includes('SyntaxError') ||
        error.includes('process is not defined')
      );
      
      expect(criticalErrors).to.have.length(0);
    });
  });
  
  it('should load login page without errors', () => {
    cy.visit('/login');
    cy.get('body').should('be.visible');
  });
  
  it('should load register page without errors', () => {
    cy.visit('/register');
    cy.get('body').should('be.visible');
  });
});