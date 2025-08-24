describe('Full Application E2E Test', () => {
  // Track all errors found
  const errors: { page: string; action: string; error: string }[] = [];
  
  beforeEach(() => {
    // Capture all uncaught exceptions
    cy.on('uncaught:exception', (err, runnable) => {
      // Log the error but don't fail the test
      errors.push({
        page: runnable.title || 'Unknown',
        action: 'Page Load',
        error: err.message
      });
      
      // Continue running tests
      return false;
    });
    
    // Capture console errors
    cy.on('window:before:load', (win) => {
      const originalError = win.console.error;
      win.console.error = (...args) => {
        const message = args.join(' ');
        if (!message.includes('DevTools') && !message.includes('Mock Firebase')) {
          errors.push({
            page: win.location.pathname,
            action: 'Console Error',
            error: message.substring(0, 200)
          });
        }
        originalError.apply(win.console, args);
      };
    });
  });
  
  after(() => {
    // Report all errors found
    console.log('=== ERRORS FOUND DURING TESTING ===');
    console.table(errors);
  });

  describe('Public Pages', () => {
    it('should test home/landing page', () => {
      cy.visit('/');
      cy.wait(1000);
      
      // Check page loaded
      cy.get('body').should('be.visible');
      
      // Try to find and click all buttons
      cy.get('button').each(($btn, index) => {
        // Skip if button is disabled
        if (!$btn.prop('disabled')) {
          cy.wrap($btn).click({ force: true }).then(() => {
            errors.push({
              page: '/',
              action: `Clicked button ${index}`,
              error: 'No error'
            });
          });
          cy.wait(500);
        }
      });
      
      // Try to find and click all links
      cy.get('a').each(($link, index) => {
        const href = $link.attr('href');
        if (href && !href.startsWith('http') && href !== '#') {
          cy.wrap($link).click({ force: true });
          cy.wait(500);
          cy.go('back');
        }
      });
    });
    
    it('should test login page', () => {
      cy.visit('/login');
      cy.wait(1000);
      
      // Check for form elements
      cy.get('input').then($inputs => {
        cy.log(`Found ${$inputs.length} input fields`);
        
        // Try typing in each input
        $inputs.each((index, input) => {
          cy.wrap(input).type('test@example.com', { force: true });
          cy.wait(200);
        });
      });
      
      // Try submitting empty form
      cy.get('form').then($forms => {
        if ($forms.length > 0) {
          cy.wrap($forms[0]).submit();
          cy.wait(1000);
        }
      });
      
      // Click all buttons
      cy.get('button').each(($btn, index) => {
        if (!$btn.prop('disabled')) {
          cy.wrap($btn).click({ force: true });
          cy.wait(500);
        }
      });
    });
    
    it('should test register page', () => {
      cy.visit('/register');
      cy.wait(1000);
      
      // Check for form elements
      cy.get('input').then($inputs => {
        cy.log(`Found ${$inputs.length} input fields`);
        
        // Try typing in each input
        $inputs.each((index, input) => {
          const type = input.getAttribute('type');
          if (type === 'email') {
            cy.wrap(input).clear().type('test@example.com', { force: true });
          } else if (type === 'password') {
            cy.wrap(input).clear().type('TestPassword123!', { force: true });
          } else {
            cy.wrap(input).clear().type('Test Input', { force: true });
          }
          cy.wait(200);
        });
      });
      
      // Try to submit form
      cy.get('form').then($forms => {
        if ($forms.length > 0) {
          cy.wrap($forms[0]).submit();
          cy.wait(1000);
        }
      });
      
      // Click all buttons
      cy.get('button').each(($btn) => {
        if (!$btn.prop('disabled')) {
          cy.wrap($btn).click({ force: true });
          cy.wait(500);
        }
      });
    });
  });
  
  describe('Protected Routes', () => {
    const protectedRoutes = [
      '/dashboard',
      '/accounts', 
      '/settings',
      '/backup',
      '/profile',
      '/subscription',
      '/security'
    ];
    
    protectedRoutes.forEach(route => {
      it(`should test ${route} page`, () => {
        cy.visit(route, { failOnStatusCode: false });
        cy.wait(1000);
        
        // Check if redirected to login
        cy.url().then(url => {
          if (url.includes('login')) {
            cy.log(`${route} redirected to login (expected for protected route)`);
          } else {
            // Page loaded, try to interact
            cy.get('button').each(($btn) => {
              if (!$btn.prop('disabled')) {
                cy.wrap($btn).click({ force: true });
                cy.wait(300);
              }
            });
            
            // Try to click navigation items
            cy.get('nav a, [role="navigation"] a').each(($link) => {
              const href = $link.attr('href');
              if (href && !href.startsWith('http')) {
                cy.wrap($link).click({ force: true });
                cy.wait(500);
                cy.go('back');
              }
            });
          }
        });
      });
    });
  });
  
  describe('Admin Routes', () => {
    const adminRoutes = [
      '/admin',
      '/admin/dashboard',
      '/admin/users',
      '/admin/subscriptions',
      '/admin/analytics',
      '/admin/security',
      '/admin/support',
      '/admin/settings'
    ];
    
    adminRoutes.forEach(route => {
      it(`should test ${route} page`, () => {
        cy.visit(route, { failOnStatusCode: false });
        cy.wait(1000);
        
        cy.url().then(url => {
          if (url.includes('login')) {
            cy.log(`${route} redirected to login (expected for admin route)`);
          } else {
            // Try to interact with admin interface
            cy.get('button, .clickable, [role="button"]').each(($elem) => {
              cy.wrap($elem).click({ force: true });
              cy.wait(300);
            });
          }
        });
      });
    });
  });
  
  describe('Component Interactions', () => {
    it('should test modals and dialogs', () => {
      cy.visit('/');
      cy.wait(1000);
      
      // Look for modal triggers
      cy.get('[data-modal], [aria-haspopup="dialog"], button:contains("Add"), button:contains("Create"), button:contains("New")').each(($trigger) => {
        cy.wrap($trigger).click({ force: true });
        cy.wait(500);
        
        // Check if modal opened
        cy.get('[role="dialog"], .modal, [data-modal-content]').then($modals => {
          if ($modals.length > 0) {
            cy.log('Modal opened');
            
            // Try to close modal
            cy.get('[aria-label*="close" i], button:contains("Cancel"), button:contains("Close"), .modal-close').first().click({ force: true });
            cy.wait(500);
          }
        });
      });
    });
    
    it('should test dropdowns and menus', () => {
      cy.visit('/');
      cy.wait(1000);
      
      // Look for dropdown triggers
      cy.get('[aria-haspopup="menu"], [data-dropdown], select, [role="combobox"]').each(($dropdown) => {
        cy.wrap($dropdown).click({ force: true });
        cy.wait(500);
        
        // Check if menu opened
        cy.get('[role="menu"], [role="listbox"], option').then($menus => {
          if ($menus.length > 0) {
            cy.log('Dropdown opened');
            // Close by clicking outside
            cy.get('body').click(0, 0);
            cy.wait(300);
          }
        });
      });
    });
    
    it('should test form inputs', () => {
      cy.visit('/login');
      cy.wait(1000);
      
      // Test different input types
      cy.get('input[type="text"], input[type="email"], input[type="password"], textarea').each(($input) => {
        cy.wrap($input)
          .clear({ force: true })
          .type('Test input content', { force: true })
          .blur();
        cy.wait(200);
      });
      
      // Test checkboxes
      cy.get('input[type="checkbox"]').each(($checkbox) => {
        cy.wrap($checkbox).check({ force: true });
        cy.wait(200);
        cy.wrap($checkbox).uncheck({ force: true });
        cy.wait(200);
      });
      
      // Test radio buttons
      cy.get('input[type="radio"]').each(($radio) => {
        cy.wrap($radio).check({ force: true });
        cy.wait(200);
      });
    });
  });
  
  describe('Navigation Testing', () => {
    it('should test all navigation links', () => {
      cy.visit('/');
      cy.wait(1000);
      
      // Find all navigation elements
      cy.get('nav a, header a, footer a, [role="navigation"] a').each(($link) => {
        const href = $link.attr('href');
        const text = $link.text();
        
        if (href && !href.startsWith('http') && href !== '#') {
          cy.log(`Testing navigation to: ${href} (${text})`);
          cy.wrap($link).click({ force: true });
          cy.wait(1000);
          
          // Check if page loaded
          cy.get('body').should('be.visible');
          
          // Go back
          cy.go('back');
          cy.wait(500);
        }
      });
    });
    
    it('should test browser back/forward', () => {
      const pages = ['/', '/login', '/register'];
      
      // Navigate through pages
      pages.forEach(page => {
        cy.visit(page);
        cy.wait(500);
      });
      
      // Test back button
      cy.go('back');
      cy.wait(500);
      cy.url().should('include', '/login');
      
      cy.go('back');
      cy.wait(500);
      cy.url().should('include', '/');
      
      // Test forward button
      cy.go('forward');
      cy.wait(500);
      cy.url().should('include', '/login');
    });
  });
  
  describe('Error Summary', () => {
    it('should display error summary', () => {
      // This test runs last and displays all errors found
      cy.wrap(null).then(() => {
        if (errors.length > 0) {
          cy.log('=== ERRORS FOUND ===');
          errors.forEach(error => {
            cy.log(`Page: ${error.page}, Action: ${error.action}, Error: ${error.error}`);
          });
        } else {
          cy.log('No errors found during testing!');
        }
      });
    });
  });
});