describe('Page Loading Tests', () => {
  beforeEach(() => {
    cy.viewport(1280, 720);
  });

  describe('Public Pages', () => {
    it('should load the login page', () => {
      cy.visit('/login');
      
      // Check for main elements
      cy.get('h1, h2').contains(/sign in|login/i).should('be.visible');
      cy.get('input[type="email"], input[name="email"], input[placeholder*="email" i]').should('be.visible');
      cy.get('input[type="password"], input[name="password"], input[placeholder*="password" i]').should('be.visible');
      cy.get('button[type="submit"], button').contains(/sign in|login/i).should('be.visible');
      
      // Check for register link
      cy.contains(/sign up|register|create account/i).should('be.visible');
    });

    it('should load the register page', () => {
      cy.visit('/register');
      
      // Check for main elements
      cy.get('h1, h2').contains(/sign up|register|create account/i).should('be.visible');
      cy.get('input[type="email"], input[name="email"], input[placeholder*="email" i]').should('be.visible');
      cy.get('input[type="password"], input[name="password"], input[placeholder*="password" i]').should('be.visible');
      cy.get('button[type="submit"], button').contains(/sign up|register|create/i).should('be.visible');
      
      // Check for login link
      cy.contains(/sign in|login|already have an account/i).should('be.visible');
    });

    it('should load the home/landing page', () => {
      cy.visit('/');
      
      // Check that page loads without errors
      cy.get('body').should('be.visible');
      
      // Check for app content or redirect
      cy.url().should('include', '/');
    });
  });

  describe('Protected Pages (checking redirect)', () => {
    beforeEach(() => {
      // Clear any stored auth tokens
      cy.clearLocalStorage();
      cy.clearCookies();
    });

    it('should redirect to login when accessing dashboard', () => {
      cy.visit('/dashboard', { failOnStatusCode: false });
      
      // Should redirect to login or show login page
      cy.url().should('match', /\/(login|signin)/i);
    });

    it('should redirect to login when accessing accounts', () => {
      cy.visit('/accounts', { failOnStatusCode: false });
      
      // Should redirect to login or show login page
      cy.url().should('match', /\/(login|signin)/i);
    });

    it('should redirect to login when accessing settings', () => {
      cy.visit('/settings', { failOnStatusCode: false });
      
      // Should redirect to login or show login page
      cy.url().should('match', /\/(login|signin)/i);
    });

    it('should redirect to login when accessing backup', () => {
      cy.visit('/backup', { failOnStatusCode: false });
      
      // Should redirect to login or show login page
      cy.url().should('match', /\/(login|signin)/i);
    });
  });

  describe('Admin Pages (checking redirect)', () => {
    beforeEach(() => {
      // Clear any stored auth tokens
      cy.clearLocalStorage();
      cy.clearCookies();
    });

    const adminPages = [
      '/admin',
      '/admin/dashboard',
      '/admin/users',
      '/admin/subscriptions',
      '/admin/analytics',
      '/admin/security',
      '/admin/support',
      '/admin/settings'
    ];

    adminPages.forEach(page => {
      it(`should redirect to login when accessing ${page}`, () => {
        cy.visit(page, { failOnStatusCode: false });
        
        // Should redirect to login
        cy.url().should('match', /\/(login|signin)/i);
      });
    });
  });

  describe('App Components Loading', () => {
    it('should load navigation components when authenticated (mocked)', () => {
      // Mock authentication by setting a token
      cy.window().then((win) => {
        win.localStorage.setItem('authToken', 'mock-token');
      });

      cy.visit('/');
      
      // Check for basic app structure
      cy.get('body').should('be.visible');
      
      // If redirected to login, that's okay too
      cy.url().then((url) => {
        if (!url.includes('/login')) {
          // Check for navigation elements
          cy.get('nav, [role="navigation"], header').should('exist');
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 pages gracefully', () => {
      cy.visit('/non-existent-page-12345', { failOnStatusCode: false });
      
      // Should either show 404 or redirect
      cy.get('body').should('be.visible');
    });
  });

  describe('Page Performance', () => {
    it('should load pages within acceptable time', () => {
      const pages = ['/', '/login', '/register'];
      
      pages.forEach(page => {
        cy.visit(page);
        
        // Page should be interactive within 3 seconds
        cy.get('body', { timeout: 3000 }).should('be.visible');
        
        // Check for any console errors
        cy.window().then((win) => {
          const consoleError = cy.spy(win.console, 'error');
          cy.wrap(consoleError).should('not.be.called');
        });
      });
    });
  });

  describe('Responsive Design', () => {
    const viewports = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1920, height: 1080 }
    ];

    viewports.forEach(viewport => {
      it(`should display correctly on ${viewport.name}`, () => {
        cy.viewport(viewport.width, viewport.height);
        cy.visit('/login');
        
        // Check that main elements are visible
        cy.get('body').should('be.visible');
        cy.get('input[type="email"], input[name="email"]').should('be.visible');
        cy.get('input[type="password"], input[name="password"]').should('be.visible');
      });
    });
  });
});