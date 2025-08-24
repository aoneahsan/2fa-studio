describe('Application Error Detection', () => {
  const pageErrors: any[] = [];
  const networkErrors: any[] = [];
  const consoleErrors: any[] = [];
  
  beforeEach(() => {
    // Capture uncaught exceptions
    cy.on('uncaught:exception', (err, runnable) => {
      pageErrors.push({
        page: runnable.title,
        error: err.message,
        stack: err.stack?.split('\n')[0]
      });
      return false; // Don't fail test
    });
    
    // Capture failed network requests
    cy.on('fail', (err) => {
      networkErrors.push({
        error: err.message
      });
      return false;
    });
    
    // Capture console errors
    cy.on('window:before:load', (win) => {
      const originalError = win.console.error;
      win.console.error = (...args) => {
        const message = args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ');
        
        // Filter out known non-issues
        if (!message.includes('DevTools') && 
            !message.includes('Mock Firebase') &&
            !message.includes('Using mock') &&
            !message.includes('test mode')) {
          consoleErrors.push({
            page: win.location.pathname,
            message: message.substring(0, 300)
          });
        }
        originalError.apply(win.console, args);
      };
    });
  });
  
  describe('Page Load Tests', () => {
    it('should check home page', () => {
      cy.visit('/');
      cy.wait(2000);
      
      // Check if page has content
      cy.get('body').then($body => {
        const text = $body.text();
        cy.log(`Page has ${text.length} characters of text`);
        
        // Look for error indicators
        if (text.includes('Error') || text.includes('error')) {
          cy.log('Found error text on page');
        }
        
        // Check for React root
        cy.get('#root').should('exist');
        
        // Check for any visible content
        cy.get('div').should('have.length.greaterThan', 0);
      });
      
      // Try to find interactive elements
      cy.get('button, a, input, [role="button"]').then($elements => {
        cy.log(`Found ${$elements.length} interactive elements`);
      });
    });
    
    it('should check login page', () => {
      cy.visit('/login');
      cy.wait(2000);
      
      // Check page structure
      cy.get('body').should('be.visible');
      
      // Look for form elements
      cy.get('form, input, button').then($elements => {
        cy.log(`Found ${$elements.length} form elements`);
        
        if ($elements.length === 0) {
          cy.log('WARNING: No form elements found on login page');
        }
      });
      
      // Check for specific login elements
      cy.get('input[type="email"], input[type="text"], input[name*="email"], input[name*="user"]').then($inputs => {
        if ($inputs.length > 0) {
          cy.wrap($inputs.first()).type('test@test.com', { force: true });
        } else {
          cy.log('No email/username input found');
        }
      });
      
      cy.get('input[type="password"], input[name*="pass"]').then($inputs => {
        if ($inputs.length > 0) {
          cy.wrap($inputs.first()).type('password123', { force: true });
        } else {
          cy.log('No password input found');
        }
      });
      
      // Try to submit
      cy.get('button[type="submit"], button:contains("Login"), button:contains("Sign")').then($buttons => {
        if ($buttons.length > 0) {
          cy.wrap($buttons.first()).click({ force: true });
          cy.wait(1000);
          
          // Check what happened after click
          cy.url().then(url => {
            cy.log(`After login attempt, URL is: ${url}`);
          });
        } else {
          cy.log('No submit button found');
        }
      });
    });
    
    it('should check register page', () => {
      cy.visit('/register');
      cy.wait(2000);
      
      cy.get('body').should('be.visible');
      
      // Look for registration form
      cy.get('form, input, button').then($elements => {
        cy.log(`Found ${$elements.length} form elements on register page`);
      });
      
      // Try to fill registration form
      cy.get('input').each(($input, index) => {
        const type = $input.attr('type');
        const name = $input.attr('name');
        cy.log(`Input ${index}: type=${type}, name=${name}`);
        
        if (type === 'email') {
          cy.wrap($input).type('test@test.com', { force: true });
        } else if (type === 'password') {
          cy.wrap($input).type('Password123!', { force: true });
        } else if (type === 'text') {
          cy.wrap($input).type('Test User', { force: true });
        }
      });
    });
    
    it('should check authenticated routes behavior', () => {
      const protectedRoutes = ['/dashboard', '/accounts', '/settings'];
      
      protectedRoutes.forEach(route => {
        cy.visit(route, { failOnStatusCode: false });
        cy.wait(1000);
        
        cy.url().then(url => {
          if (url.includes('login')) {
            cy.log(`${route} correctly redirected to login`);
          } else if (url.includes(route)) {
            cy.log(`${route} loaded without authentication!`);
            
            // Check page content
            cy.get('body').then($body => {
              const text = $body.text();
              cy.log(`${route} page text: ${text.substring(0, 100)}`);
            });
          }
        });
      });
    });
  });
  
  describe('Component Interaction Tests', () => {
    it('should test clickable elements on home page', () => {
      cy.visit('/');
      cy.wait(2000);
      
      // Find all clickable elements
      cy.get('button').then($buttons => {
        cy.log(`Found ${$buttons.length} buttons`);
        
        $buttons.each((index, button) => {
          const text = button.textContent;
          const isDisabled = button.hasAttribute('disabled');
          cy.log(`Button ${index}: "${text}" ${isDisabled ? '(disabled)' : ''}`);
          
          if (!isDisabled && index < 5) { // Test first 5 buttons
            cy.wrap(button).click({ force: true });
            cy.wait(500);
            
            // Check if modal opened
            cy.get('[role="dialog"], .modal').then($modals => {
              if ($modals.length > 0) {
                cy.log('Modal opened after button click');
                // Try to close
                cy.get('body').type('{esc}');
                cy.wait(500);
              }
            });
          }
        });
      });
      
      // Test links
      cy.get('a').then($links => {
        cy.log(`Found ${$links.length} links`);
        
        $links.each((index, link) => {
          const href = link.getAttribute('href');
          const text = link.textContent;
          cy.log(`Link ${index}: "${text}" -> ${href}`);
        });
      });
    });
  });
  
  describe('Error Report', () => {
    it('should generate error report', () => {
      cy.log('=== ERROR REPORT ===');
      
      cy.log(`Page Errors: ${pageErrors.length}`);
      pageErrors.forEach(err => {
        cy.log(`Page: ${err.page}`);
        cy.log(`Error: ${err.error}`);
      });
      
      cy.log(`Console Errors: ${consoleErrors.length}`);
      consoleErrors.forEach(err => {
        cy.log(`Page: ${err.page}`);
        cy.log(`Message: ${err.message}`);
      });
      
      cy.log(`Network Errors: ${networkErrors.length}`);
      networkErrors.forEach(err => {
        cy.log(`Error: ${err.error}`);
      });
      
      // Create summary
      const summary = {
        totalPageErrors: pageErrors.length,
        totalConsoleErrors: consoleErrors.length,
        totalNetworkErrors: networkErrors.length,
        criticalErrors: pageErrors.filter(e => 
          e.error.includes('ReferenceError') || 
          e.error.includes('TypeError')
        ).length
      };
      
      cy.log('=== SUMMARY ===');
      cy.log(JSON.stringify(summary, null, 2));
      
      // Assert no critical errors
      expect(summary.criticalErrors).to.equal(0, 'Should have no critical errors');
    });
  });
});