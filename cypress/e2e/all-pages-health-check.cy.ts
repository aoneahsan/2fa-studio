describe('All Pages Health Check', () => {
  beforeEach(() => {
    // Set up interceptors for common API calls
    cy.intercept('GET', '**/api/**', { statusCode: 200, body: {} }).as('apiCalls');
    cy.intercept('POST', '**/identitytoolkit.googleapis.com/**', { statusCode: 200, body: {} }).as('authCalls');
  });

  describe('Public Pages', () => {
    it('should load login page without errors', () => {
      cy.visit('/login', { failOnStatusCode: false });
      cy.get('body').should('be.visible');
      // Check for console errors
      cy.window().then((win) => {
        cy.spy(win.console, 'error');
      });
      cy.wait(1000); // Wait for any async operations
      cy.window().then((win) => {
        expect(win.console.error).to.not.have.been.called;;
      });
    });

    it('should load register page without errors', () => {
      cy.visit('/register', { failOnStatusCode: false });
      cy.get('body').should('be.visible');
      // Check for console errors
      cy.window().then((win) => {
        cy.spy(win.console, 'error');
      });
      cy.wait(1000);
      cy.window().then((win) => {
        expect(win.console.error).to.not.have.been.called;;
      });
    });
  });

  describe('Protected Pages (with mock auth)', () => {
    beforeEach(() => {
      // Mock authentication by setting localStorage
      cy.window().then((win) => {
        win.localStorage.setItem('authToken', 'mock-token');
        win.localStorage.setItem('user', JSON.stringify({
          uid: 'test-user-id',
          email: 'test@example.com',
          displayName: 'Test User'
        }));
      });
    });

    it('should load dashboard page without errors', () => {
      cy.visit('/dashboard', { failOnStatusCode: false });
      cy.get('body').should('be.visible');
      // Check for console errors
      cy.window().then((win) => {
        cy.spy(win.console, 'error');
      });
      cy.wait(1000);
      cy.window().then((win) => {
        expect(win.console.error).to.not.have.been.called;;
      });
    });

    it('should load accounts page without errors', () => {
      cy.visit('/accounts', { failOnStatusCode: false });
      cy.get('body').should('be.visible');
      // Check for console errors
      cy.window().then((win) => {
        cy.spy(win.console, 'error');
      });
      cy.wait(1000);
      cy.window().then((win) => {
        expect(win.console.error).to.not.have.been.called;;
      });
    });

    it('should load settings page without errors', () => {
      cy.visit('/settings', { failOnStatusCode: false });
      cy.get('body').should('be.visible');
      // Check for console errors
      cy.window().then((win) => {
        cy.spy(win.console, 'error');
      });
      cy.wait(1000);
      cy.window().then((win) => {
        expect(win.console.error).to.not.have.been.called;;
      });
    });

    it('should load backup page without errors', () => {
      cy.visit('/backup', { failOnStatusCode: false });
      cy.get('body').should('be.visible');
      // Check for console errors
      cy.window().then((win) => {
        cy.spy(win.console, 'error');
      });
      cy.wait(1000);
      cy.window().then((win) => {
        expect(win.console.error).to.not.have.been.called;;
      });
    });
  });

  describe('Admin Pages (with mock admin auth)', () => {
    beforeEach(() => {
      // Mock admin authentication
      cy.window().then((win) => {
        win.localStorage.setItem('authToken', 'mock-admin-token');
        win.localStorage.setItem('user', JSON.stringify({
          uid: 'admin-user-id',
          email: 'admin@example.com',
          displayName: 'Admin User',
          role: 'admin'
        }));
        win.localStorage.setItem('isAdmin', 'true');
      });
    });

    it('should load admin dashboard without errors', () => {
      cy.visit('/admin', { failOnStatusCode: false });
      cy.get('body').should('be.visible');
      // Check for console errors
      cy.window().then((win) => {
        cy.spy(win.console, 'error');
      });
      cy.wait(1000);
      cy.window().then((win) => {
        expect(win.console.error).to.not.have.been.called;;
      });
    });

    it('should load admin users page without errors', () => {
      cy.visit('/admin/users', { failOnStatusCode: false });
      cy.get('body').should('be.visible');
      // Check for console errors
      cy.window().then((win) => {
        cy.spy(win.console, 'error');
      });
      cy.wait(1000);
      cy.window().then((win) => {
        expect(win.console.error).to.not.have.been.called;;
      });
    });

    it('should load admin subscriptions page without errors', () => {
      cy.visit('/admin/subscriptions', { failOnStatusCode: false });
      cy.get('body').should('be.visible');
      // Check for console errors
      cy.window().then((win) => {
        cy.spy(win.console, 'error');
      });
      cy.wait(1000);
      cy.window().then((win) => {
        expect(win.console.error).to.not.have.been.called;;
      });
    });

    it('should load admin analytics page without errors', () => {
      cy.visit('/admin/analytics', { failOnStatusCode: false });
      cy.get('body').should('be.visible');
      // Check for console errors
      cy.window().then((win) => {
        cy.spy(win.console, 'error');
      });
      cy.wait(1000);
      cy.window().then((win) => {
        expect(win.console.error).to.not.have.been.called;;
      });
    });

    it('should load admin security page without errors', () => {
      cy.visit('/admin/security', { failOnStatusCode: false });
      cy.get('body').should('be.visible');
      // Check for console errors
      cy.window().then((win) => {
        cy.spy(win.console, 'error');
      });
      cy.wait(1000);
      cy.window().then((win) => {
        expect(win.console.error).to.not.have.been.called;;
      });
    });

    it('should load admin settings page without errors', () => {
      cy.visit('/admin/settings', { failOnStatusCode: false });
      cy.get('body').should('be.visible');
      // Check for console errors
      cy.window().then((win) => {
        cy.spy(win.console, 'error');
      });
      cy.wait(1000);
      cy.window().then((win) => {
        expect(win.console.error).to.not.have.been.called;;
      });
    });
  });

  describe('Redirect Behavior', () => {
    it('should redirect from root to dashboard', () => {
      cy.visit('/', { failOnStatusCode: false });
      cy.url().should('include', '/dashboard');
    });

    it('should redirect from unknown routes to dashboard', () => {
      cy.visit('/unknown-route', { failOnStatusCode: false });
      cy.url().should('include', '/dashboard');
    });
  });
});