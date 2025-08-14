describe('Debug Console Errors', () => {
  let consoleErrors: string[] = [];

  beforeEach(() => {
    consoleErrors = [];
    
    // Capture console errors
    cy.on('window:before:load', (win) => {
      const originalError = win.console.error;
      win.console.error = (...args) => {
        consoleErrors.push(args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' '));
        originalError.apply(win.console, args);
      };
    });
  });

  it('should show console errors on login page', () => {
    cy.visit('/login', { failOnStatusCode: false });
    cy.wait(2000); // Wait for page to fully load
    
    cy.then(() => {
      if (consoleErrors.length > 0) {
        cy.log('Console Errors Found:');
        consoleErrors.forEach(error => {
          cy.log(error);
        });
        console.log('Login Page Errors:', consoleErrors);
      } else {
        cy.log('No console errors found');
      }
    });
  });

  it('should show console errors on register page', () => {
    cy.visit('/register', { failOnStatusCode: false });
    cy.wait(2000);
    
    cy.then(() => {
      if (consoleErrors.length > 0) {
        cy.log('Console Errors Found:');
        consoleErrors.forEach(error => {
          cy.log(error);
        });
        console.log('Register Page Errors:', consoleErrors);
      } else {
        cy.log('No console errors found');
      }
    });
  });

  it('should show console errors on root page', () => {
    cy.visit('/', { failOnStatusCode: false });
    cy.wait(2000);
    
    cy.then(() => {
      if (consoleErrors.length > 0) {
        cy.log('Console Errors Found:');
        consoleErrors.forEach(error => {
          cy.log(error);
        });
        console.log('Root Page Errors:', consoleErrors);
      } else {
        cy.log('No console errors found');
      }
    });
  });
});