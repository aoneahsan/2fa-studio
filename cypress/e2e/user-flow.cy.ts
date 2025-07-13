describe('Complete User Flow', () => {
  const testUser = {
    email: 'e2e-test@2fastudio.app',
    password: 'TestPassword123!',
    name: 'E2E Test User'
  }

  const testAccount = {
    issuer: 'Test Service',
    label: 'test@example.com',
    secret: 'JBSWY3DPEHPK3PXP'
  }

  beforeEach(() => {
    cy.visit('/')
  })

  it('should complete full user journey', () => {
    // Register new user
    cy.get('[data-cy=auth-toggle]').click()
    cy.get('[data-cy=register-email]').type(testUser.email)
    cy.get('[data-cy=register-password]').type(testUser.password)
    cy.get('[data-cy=register-name]').type(testUser.name)
    cy.get('[data-cy=register-submit]').click()

    // Verify successful registration and redirect to dashboard
    cy.url().should('include', '/dashboard')
    cy.get('[data-cy=welcome-message]').should('contain', testUser.name)

    // Add first 2FA account
    cy.get('[data-cy=add-account-btn]').click()
    cy.get('[data-cy=manual-entry-tab]').click()
    cy.get('[data-cy=account-issuer]').type(testAccount.issuer)
    cy.get('[data-cy=account-label]').type(testAccount.label)
    cy.get('[data-cy=account-secret]').type(testAccount.secret)
    cy.get('[data-cy=save-account-btn]').click()

    // Verify account was added
    cy.get('[data-cy=account-card]').should('exist')
    cy.get('[data-cy=account-issuer]').should('contain', testAccount.issuer)
    cy.get('[data-cy=account-label]').should('contain', testAccount.label)

    // Test code generation
    cy.get('[data-cy=account-code]').should('match', /^\d{6}$/)
    cy.get('[data-cy=copy-code-btn]').click()
    cy.get('[data-cy=toast-success]').should('contain', 'Code copied')

    // Navigate to settings
    cy.get('[data-cy=settings-nav]').click()
    cy.url().should('include', '/settings')

    // Test profile settings
    cy.get('[data-cy=profile-tab]').click()
    cy.get('[data-cy=display-name]').clear().type('Updated Name')
    cy.get('[data-cy=save-profile-btn]').click()
    cy.get('[data-cy=toast-success]').should('contain', 'Profile updated')

    // Test security settings
    cy.get('[data-cy=security-tab]').click()
    cy.get('[data-cy=enable-biometric]').click()
    cy.get('[data-cy=save-security-btn]').click()

    // Test backup settings
    cy.get('[data-cy=backup-tab]').click()
    cy.get('[data-cy=create-backup-btn]').click()
    cy.get('[data-cy=backup-password]').type('BackupPassword123!')
    cy.get('[data-cy=confirm-backup-btn]').click()
    cy.get('[data-cy=toast-success]').should('contain', 'Backup created')

    // Test export functionality
    cy.get('[data-cy=accounts-nav]').click()
    cy.get('[data-cy=export-btn]').click()
    cy.get('[data-cy=export-json]').click()
    cy.get('[data-cy=export-password]').type('ExportPassword123!')
    cy.get('[data-cy=confirm-export-btn]').click()

    // Test account management
    cy.get('[data-cy=account-menu]').first().click()
    cy.get('[data-cy=edit-account]').click()
    cy.get('[data-cy=account-label]').clear().type('updated@example.com')
    cy.get('[data-cy=save-account-btn]').click()
    cy.get('[data-cy=toast-success]').should('contain', 'Account updated')

    // Test search functionality
    cy.get('[data-cy=search-accounts]').type('Test Service')
    cy.get('[data-cy=account-card]').should('have.length', 1)
    cy.get('[data-cy=search-accounts]').clear()

    // Test account deletion
    cy.get('[data-cy=account-menu]').first().click()
    cy.get('[data-cy=delete-account]').click()
    cy.get('[data-cy=confirm-delete]').click()
    cy.get('[data-cy=toast-success]').should('contain', 'Account deleted')
    cy.get('[data-cy=empty-state]').should('be.visible')

    // Test logout
    cy.get('[data-cy=user-menu]').click()
    cy.get('[data-cy=logout-btn]').click()
    cy.url().should('include', '/login')
    cy.get('[data-cy=login-form]').should('be.visible')
  })

  it('should handle errors gracefully', () => {
    // Test login with invalid credentials
    cy.get('[data-cy=login-email]').type('invalid@example.com')
    cy.get('[data-cy=login-password]').type('wrongpassword')
    cy.get('[data-cy=login-submit]').click()
    cy.get('[data-cy=error-message]').should('contain', 'Invalid credentials')

    // Test registration with weak password
    cy.get('[data-cy=auth-toggle]').click()
    cy.get('[data-cy=register-email]').type('test@example.com')
    cy.get('[data-cy=register-password]').type('weak')
    cy.get('[data-cy=password-strength]').should('contain', 'Weak')
    cy.get('[data-cy=register-submit]').should('be.disabled')

    // Test adding account with invalid secret
    cy.login(testUser.email, testUser.password)
    cy.get('[data-cy=add-account-btn]').click()
    cy.get('[data-cy=manual-entry-tab]').click()
    cy.get('[data-cy=account-issuer]').type('Test')
    cy.get('[data-cy=account-label]').type('test@example.com')
    cy.get('[data-cy=account-secret]').type('INVALID_SECRET')
    cy.get('[data-cy=save-account-btn]').click()
    cy.get('[data-cy=error-message]').should('contain', 'Invalid secret')
  })

  it('should work offline', () => {
    // Login first
    cy.login(testUser.email, testUser.password)
    
    // Add an account
    cy.addAccount(testAccount)

    // Go offline
    cy.window().then((win) => {
      win.navigator.serviceWorker.ready.then((_registration) => {
        // Simulate offline mode
        cy.wrap(Cypress.automation('remote:debugger:protocol', {
          command: 'Network.enable'
        }))
        cy.wrap(Cypress.automation('remote:debugger:protocol', {
          command: 'Network.emulateNetworkConditions',
          params: {
            offline: true,
            latency: 0,
            downloadThroughput: 0,
            uploadThroughput: 0
          }
        }))
      })
    })

    // Verify app still works offline
    cy.get('[data-cy=offline-indicator]').should('be.visible')
    cy.get('[data-cy=account-code]').should('match', /^\d{6}$/)
    cy.get('[data-cy=copy-code-btn]').click()

    // Verify cached data is available
    cy.reload()
    cy.get('[data-cy=account-card]').should('exist')
  })

  it('should handle subscription upgrade flow', () => {
    cy.login(testUser.email, testUser.password)

    // Navigate to subscription settings
    cy.get('[data-cy=settings-nav]').click()
    cy.get('[data-cy=subscription-tab]').click()

    // Check current plan
    cy.get('[data-cy=current-plan]').should('contain', 'Free')
    cy.get('[data-cy=account-limit]').should('contain', '10 accounts')

    // Try to add more than 10 accounts to trigger upgrade prompt
    for (let i = 0; i < 11; i++) {
      cy.addAccount({
        issuer: `Service ${i}`,
        label: `user${i}@example.com`,
        secret: 'JBSWY3DPEHPK3PXP'
      })
    }

    // Should show upgrade prompt
    cy.get('[data-cy=upgrade-prompt]').should('be.visible')
    cy.get('[data-cy=upgrade-to-pro]').click()

    // Mock payment flow (since we can't do real payments in E2E)
    cy.window().then((win) => {
      win.postMessage({ type: 'PAYMENT_SUCCESS' }, '*')
    })

    // Verify upgrade
    cy.get('[data-cy=current-plan]').should('contain', 'Pro')
    cy.get('[data-cy=account-limit]').should('contain', '50 accounts')
  })

  after(() => {
    // Cleanup: Delete test user data
    cy.task('cleanupTestUser', testUser.email)
  })
})