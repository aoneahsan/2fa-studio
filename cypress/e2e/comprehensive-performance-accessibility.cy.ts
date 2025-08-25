/**
 * Comprehensive Performance and Accessibility E2E Tests
 * Tests application performance, load times, accessibility compliance, and user experience
 */

describe('Comprehensive Performance and Accessibility Tests', () => {
  beforeEach(() => {
    cy.cleanup();
    cy.setupEmulator();
    cy.setupTestUser('premium');
  });

  describe('Performance Testing', () => {
    it('should load the main application within performance budget', () => {
      const startTime = Date.now();
      
      cy.visit('/');
      
      // Wait for critical content to load
      cy.get('[data-cy="main-content"], main').should('be.visible');
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 3 seconds
      expect(loadTime).to.be.lessThan(3000);
      
      // Check for performance metrics
      cy.window().then((win) => {
        if ('performance' in win && 'getEntriesByType' in win.performance) {
          const navigationTiming = win.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          
          // Check various timing metrics
          const domContentLoaded = navigationTiming.domContentLoadedEventEnd - navigationTiming.domContentLoadedEventStart;
          const firstPaint = win.performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint');
          
          expect(domContentLoaded).to.be.lessThan(2000);
          
          if (firstPaint) {
            expect(firstPaint.startTime).to.be.lessThan(1500);
          }
        }
      });
    });

    it('should handle large datasets efficiently', () => {
      // Create large dataset
      const largeDataset = Array.from({ length: 500 }, (_, i) => ({
        issuer: `Service ${i}`,
        label: `user${i}@example.com`,
        secret: 'JBSWY3DPEHPK3PXP',
        type: 'totp'
      }));
      
      // Mock API to return large dataset
      cy.intercept('GET', '/api/accounts', {
        statusCode: 200,
        body: { accounts: largeDataset }
      }).as('largeDataset');
      
      const startTime = Date.now();
      cy.visit('/accounts');
      cy.wait('@largeDataset');
      
      // Should render initial viewport quickly
      cy.get('[data-cy="account-card"]').should('have.length.at.least', 1);
      
      const renderTime = Date.now() - startTime;
      
      // Should render within 2 seconds even with large dataset
      expect(renderTime).to.be.lessThan(2000);
      
      // Test scrolling performance
      const scrollStartTime = Date.now();
      cy.get('[data-cy="accounts-container"]').scrollTo('bottom');
      
      // Should handle scrolling smoothly
      cy.get('[data-cy="account-card"]', { timeout: 1000 }).should('have.length.at.most', 100); // Virtualized
      
      const scrollTime = Date.now() - scrollStartTime;
      expect(scrollTime).to.be.lessThan(500);
    });

    it('should optimize image loading and rendering', () => {
      cy.fixture('test-accounts').then((accounts) => {
        cy.visit('/accounts');
        
        // Add multiple accounts to test icon loading
        accounts.validAccounts.forEach(account => {
          cy.addAccount(account);
        });
        
        // Check that images are optimized
        cy.get('[data-cy="account-icon"]').each(($img) => {
          // Should use appropriate image format
          cy.wrap($img).should('have.attr', 'src');
          cy.wrap($img).should('have.attr', 'loading', 'lazy'); // Lazy loading
          cy.wrap($img).should('have.attr', 'alt'); // Accessibility
          
          // Check image dimensions for performance
          cy.wrap($img).then(($el) => {
            const img = $el[0] as HTMLImageElement;
            expect(img.naturalWidth).to.be.lessThan(200);
            expect(img.naturalHeight).to.be.lessThan(200);
          });
        });
      });
    });

    it('should efficiently update TOTP codes', () => {
      cy.fixture('test-accounts').then((accounts) => {
        cy.visit('/accounts');
        
        // Add multiple TOTP accounts
        accounts.validAccounts.slice(0, 10).forEach(account => {
          cy.addAccount(account);
        });
        
        // Measure code update performance
        const updateStartTime = Date.now();
        
        // Wait for code update cycle
        cy.get('[data-cy="countdown-timer"]').should('contain', '29'); // Near refresh
        cy.wait(2000); // Wait for refresh
        cy.get('[data-cy="countdown-timer"]').should('contain', '29'); // Should refresh
        
        const updateTime = Date.now() - updateStartTime;
        
        // All codes should update quickly
        expect(updateTime).to.be.lessThan(1000);
        
        // Verify all codes updated
        cy.get('[data-cy="account-code"]').each(($code) => {
          cy.wrap($code).should('match', /^\d{6}$/);
        });
      });
    });

    it('should maintain responsive performance under load', () => {
      cy.visit('/accounts');
      
      // Simulate rapid user interactions
      for (let i = 0; i < 20; i++) {
        cy.get('input[data-cy="search-input"]').clear().type(`search${i}`);
        cy.wait(50);
      }
      
      // Should remain responsive
      cy.get('input[data-cy="search-input"]').should('have.value', 'search19');
      
      // Test rapid navigation
      const pages = ['/dashboard', '/accounts', '/settings', '/backup'];
      
      pages.forEach((page, index) => {
        const navStartTime = Date.now();
        cy.visit(page);
        cy.get('main, [data-cy="main-content"]').should('be.visible');
        
        const navTime = Date.now() - navStartTime;
        expect(navTime).to.be.lessThan(1000); // Each navigation under 1s
      });
    });

    it('should optimize bundle size and loading', () => {
      cy.visit('/');
      
      // Check that bundles are reasonably sized
      cy.window().then((win) => {
        if ('performance' in win && 'getEntriesByType' in win.performance) {
          const resources = win.performance.getEntriesByType('resource') as PerformanceResourceTiming[];
          
          resources.forEach((resource) => {
            if (resource.name.includes('.js') && !resource.name.includes('node_modules')) {
              // Main bundle should be under 1MB
              expect(resource.transferSize).to.be.lessThan(1024 * 1024);
            }
            
            if (resource.name.includes('.css')) {
              // CSS should be under 100KB
              expect(resource.transferSize).to.be.lessThan(100 * 1024);
            }
          });
        }
      });
      
      // Check for code splitting
      cy.visit('/settings');
      
      // Settings page should load additional chunks
      cy.window().then((win) => {
        const scripts = Array.from(win.document.querySelectorAll('script[src]'));
        const hasLazyChunks = scripts.some(script => 
          script.getAttribute('src')?.includes('chunk') || 
          script.getAttribute('src')?.includes('settings')
        );
        
        expect(hasLazyChunks).to.be.true;
      });
    });

    it('should handle memory usage efficiently', () => {
      cy.visit('/accounts');
      
      // Monitor memory usage during operations
      cy.window().then((win) => {
        if ('performance' in win && 'memory' in win.performance) {
          const memory = (win.performance as any).memory;
          const initialMemory = memory.usedJSHeapSize;
          
          // Perform memory-intensive operations
          cy.fixture('test-accounts').then((accounts) => {
            // Add many accounts
            for (let i = 0; i < 50; i++) {
              cy.addAccount({
                issuer: `Memory Test ${i}`,
                label: `test${i}@example.com`,
                secret: 'JBSWY3DPEHPK3PXP'
              });
            }
            
            // Navigate between pages
            cy.visit('/settings');
            cy.visit('/backup');
            cy.visit('/accounts');
            
            // Check memory hasn't grown excessively
            cy.window().then((finalWin) => {
              const finalMemory = (finalWin.performance as any).memory.usedJSHeapSize;
              const memoryGrowth = finalMemory - initialMemory;
              
              // Memory growth should be reasonable (under 50MB)
              expect(memoryGrowth).to.be.lessThan(50 * 1024 * 1024);
            });
          });
        }
      });
    });
  });

  describe('Accessibility Testing', () => {
    it('should have proper heading hierarchy', () => {
      cy.visit('/');
      
      // Check heading hierarchy
      cy.get('h1').should('have.length', 1); // Only one h1 per page
      
      // Check logical heading order
      cy.get('h1, h2, h3, h4, h5, h6').then($headings => {
        const headingLevels = Array.from($headings).map(heading => 
          parseInt(heading.tagName.substring(1))
        );
        
        // First heading should be h1
        expect(headingLevels[0]).to.equal(1);
        
        // No heading should skip more than one level
        for (let i = 1; i < headingLevels.length; i++) {
          const diff = headingLevels[i] - headingLevels[i - 1];
          expect(Math.abs(diff)).to.be.lessThan(3);
        }
      });
    });

    it('should have proper form labels and ARIA attributes', () => {
      cy.visit('/login');
      
      // Check all form inputs have labels
      cy.get('input, textarea, select').each($input => {
        const id = $input.attr('id');
        const ariaLabel = $input.attr('aria-label');
        const ariaLabelledBy = $input.attr('aria-labelledby');
        
        if (id) {
          // Should have corresponding label
          cy.get(`label[for="${id}"]`).should('exist');
        } else {
          // Should have aria-label or aria-labelledby
          expect(ariaLabel || ariaLabelledBy).to.exist;
        }
        
        // Required fields should be marked
        if ($input.prop('required')) {
          expect($input.attr('aria-required')).to.equal('true');
        }
      });
    });

    it('should be keyboard navigable', () => {
      cy.visit('/accounts');
      
      // Should be able to navigate with Tab key
      cy.get('body').tab();
      
      // Check that focus moves to interactive elements
      cy.focused().should('be.visible');
      cy.focused().should('match', 'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
      
      // Continue tabbing through elements
      for (let i = 0; i < 10; i++) {
        cy.focused().tab();
        cy.focused().should('be.visible');
      }
      
      // Should be able to activate focused elements with Enter/Space
      cy.focused().then($focused => {
        if ($focused.is('button, a, [role="button"]')) {
          cy.focused().type('{enter}');
          // Should trigger some action (check context)
        }
      });
    });

    it('should provide proper focus indicators', () => {
      cy.visit('/accounts');
      
      // Check that focused elements have visible focus indicators
      cy.get('button, a, input').each($element => {
        cy.wrap($element).focus();
        
        cy.wrap($element).should($el => {
          const focusOutline = getComputedStyle($el[0]).outline;
          const boxShadow = getComputedStyle($el[0]).boxShadow;
          
          // Should have either outline or box-shadow for focus
          expect(focusOutline !== 'none' || boxShadow !== 'none').to.be.true;
        });
      });
    });

    it('should have proper color contrast', () => {
      cy.visit('/');
      
      // Check text elements for sufficient contrast
      cy.get('p, span, div, h1, h2, h3, h4, h5, h6, button, a').each($element => {
        cy.wrap($element).should($el => {
          const element = $el[0];
          const style = getComputedStyle(element);
          
          if (style.color && style.backgroundColor) {
            // This is a simplified check - in real implementation,
            // you'd use a proper contrast calculation library
            const color = style.color;
            const bgColor = style.backgroundColor;
            
            // Basic check that they're not the same
            expect(color).to.not.equal(bgColor);
          }
        });
      });
    });

    it('should support screen readers with proper ARIA attributes', () => {
      cy.visit('/accounts');
      
      // Check for proper ARIA landmarks
      cy.get('[role="main"], main').should('exist');
      cy.get('[role="navigation"], nav').should('exist');
      
      // Check interactive elements have proper roles
      cy.get('[data-cy="add-account-btn"]').should('have.attr', 'role').or('match', 'button');
      
      // Check for ARIA live regions for dynamic content
      cy.get('[aria-live], [role="status"], [role="alert"]').should('exist');
      
      // Check that images have alt text
      cy.get('img').each($img => {
        cy.wrap($img).should('have.attr', 'alt');
      });
      
      // Check that interactive lists have proper ARIA
      cy.get('[data-cy="account-card"]').first().parent().should($container => {
        const role = $container.attr('role');
        expect(role).to.be.oneOf(['list', 'grid', undefined]);
      });
    });

    it('should handle reduced motion preferences', () => {
      // Mock reduced motion preference
      cy.window().then((win) => {
        Object.defineProperty(win, 'matchMedia', {
          writable: true,
          value: cy.stub().returns({
            matches: true,
            addListener: cy.stub(),
            removeListener: cy.stub()
          })
        });
      });
      
      cy.visit('/accounts');
      
      // Should disable or reduce animations
      cy.get('body').should('have.class', 'reduced-motion');
      
      // Check that animations are disabled/reduced
      cy.get('[data-cy="account-card"]').should($cards => {
        $cards.each((_, card) => {
          const style = getComputedStyle(card);
          const animationDuration = style.animationDuration;
          const transitionDuration = style.transitionDuration;
          
          // Animations should be disabled or very short
          expect(animationDuration === '0s' || transitionDuration === '0s').to.be.true;
        });
      });
    });

    it('should support high contrast mode', () => {
      // Mock high contrast mode
      cy.window().then((win) => {
        Object.defineProperty(win, 'matchMedia', {
          writable: true,
          value: (query: string) => ({
            matches: query.includes('high-contrast'),
            addListener: cy.stub(),
            removeListener: cy.stub()
          })
        });
      });
      
      cy.visit('/');
      
      // Should adapt for high contrast
      cy.get('body').should('have.class', 'high-contrast');
      
      // Check that elements have sufficient contrast borders/backgrounds
      cy.get('button, input, select').each($element => {
        cy.wrap($element).should($el => {
          const style = getComputedStyle($el[0]);
          
          // Should have visible borders or backgrounds
          expect(style.border !== 'none' || style.backgroundColor !== 'transparent').to.be.true;
        });
      });
    });

    it('should be usable with screen magnification', () => {
      // Test at 200% zoom level
      cy.viewport(1920, 1080);
      cy.visit('/accounts');
      
      // Mock browser zoom
      cy.window().then((win) => {
        // Simulate 200% zoom by adjusting viewport
        win.document.documentElement.style.zoom = '2';
      });
      
      // Content should remain usable and not overflow
      cy.get('[data-cy="main-content"]').should('be.visible');
      cy.get('[data-cy="account-card"]').should('be.visible');
      
      // Horizontal scrolling should not be required for main content
      cy.get('body').should($body => {
        const body = $body[0];
        expect(body.scrollWidth).to.be.lessThan(body.clientWidth + 50);
      });
      
      // Interactive elements should still be accessible
      cy.get('button[data-cy="add-account-btn"]').should('be.visible').click();
      cy.get('[data-cy="add-account-modal"]').should('be.visible');
    });

    it('should support voice control and speech recognition', () => {
      cy.visit('/accounts');
      
      // Check that interactive elements have accessible names
      cy.get('button, a, input').each($element => {
        cy.wrap($element).should($el => {
          const element = $el[0];
          const accessibleName = element.getAttribute('aria-label') || 
                                 element.getAttribute('title') || 
                                 element.textContent?.trim() ||
                                 element.getAttribute('alt');
          
          expect(accessibleName).to.exist;
          expect(accessibleName).to.have.length.greaterThan(0);
        });
      });
      
      // Check for data attributes that can be used by voice control
      cy.get('[data-cy]').should('have.length.greaterThan', 0);
    });

    it('should handle touch accessibility', () => {
      // Mock touch device
      cy.window().then((win) => {
        Object.defineProperty(win.navigator, 'maxTouchPoints', { value: 5 });
      });
      
      cy.visit('/accounts');
      
      // Check touch target sizes
      cy.get('button, a, input[type="checkbox"], input[type="radio"]').each($element => {
        cy.wrap($element).should($el => {
          const rect = $el[0].getBoundingClientRect();
          const size = Math.min(rect.width, rect.height);
          
          // Touch targets should be at least 44px (iOS) or 48px (Android)
          expect(size).to.be.at.least(44);
        });
      });
      
      // Check spacing between touch targets
      cy.get('button').then($buttons => {
        for (let i = 0; i < $buttons.length - 1; i++) {
          const rect1 = $buttons[i].getBoundingClientRect();
          const rect2 = $buttons[i + 1].getBoundingClientRect();
          
          const horizontalGap = Math.abs(rect2.left - rect1.right);
          const verticalGap = Math.abs(rect2.top - rect1.bottom);
          
          if (horizontalGap < 100 && verticalGap < 100) {
            // Adjacent buttons should have adequate spacing
            expect(Math.min(horizontalGap, verticalGap)).to.be.at.least(8);
          }
        }
      });
    });
  });

  describe('User Experience and Usability', () => {
    it('should provide clear loading states', () => {
      cy.intercept('GET', '/api/accounts', (req) => {
        req.reply((res) => {
          res.delay(2000); // 2 second delay
          res.send({ accounts: [] });
        });
      }).as('slowAccounts');
      
      cy.visit('/accounts');
      
      // Should show loading indicator
      cy.get('[data-cy="loading-accounts"], .loading, [aria-label*="loading" i]').should('be.visible');
      
      // Loading indicator should be accessible
      cy.get('[data-cy="loading-accounts"]').should('have.attr', 'role', 'status');
      cy.get('[data-cy="loading-accounts"]').should('have.attr', 'aria-label').and('contain', 'Loading');
      
      cy.wait('@slowAccounts');
      
      // Loading should disappear when complete
      cy.get('[data-cy="loading-accounts"]').should('not.exist');
    });

    it('should provide helpful error messages', () => {
      cy.visit('/accounts');
      
      // Try to add account with invalid data
      cy.get('button[data-cy="add-account-btn"]').click();
      cy.get('[data-cy="manual-entry-tab"]').click();
      cy.get('button[data-cy="save-account-btn"]').click();
      
      // Should show specific, helpful error messages
      cy.get('[data-cy="validation-errors"]').should('be.visible');
      cy.get('[data-cy="issuer-error"]').should('contain', 'required');
      cy.get('[data-cy="secret-error"]').should('contain', 'required');
      
      // Error messages should be associated with form fields
      cy.get('input[data-cy="account-issuer"]').should('have.attr', 'aria-describedby');
      cy.get('input[data-cy="account-secret"]').should('have.attr', 'aria-describedby');
    });

    it('should maintain context and navigation clarity', () => {
      cy.visit('/settings/security');
      
      // Should show current location in navigation
      cy.get('[data-cy="breadcrumbs"], .breadcrumbs').should('be.visible');
      cy.get('[data-cy="breadcrumbs"]').should('contain', 'Settings');
      cy.get('[data-cy="breadcrumbs"]').should('contain', 'Security');
      
      // Active navigation items should be clearly marked
      cy.get('[data-cy="nav-security"], nav a[href*="security"]').should('have.class', 'active');
      
      // Page title should reflect current location
      cy.title().should('contain', 'Security');
    });

    it('should provide consistent interaction patterns', () => {
      cy.visit('/accounts');
      
      // All similar actions should work consistently
      cy.fixture('test-accounts').then((accounts) => {
        // Add multiple accounts
        accounts.validAccounts.slice(0, 3).forEach(account => {
          cy.addAccount(account);
        });
        
        // Test consistent interaction patterns
        cy.get('[data-cy="account-card"]').each($card => {
          // Each card should have consistent action buttons
          cy.wrap($card).find('button[data-cy="copy-code"]').should('exist');
          cy.wrap($card).find('button[data-cy="edit-account"]').should('exist');
          
          // Hover states should be consistent
          cy.wrap($card).trigger('mouseenter');
          cy.wrap($card).should('have.class', 'hover');
        });
      });
    });

    it('should handle offline functionality gracefully', () => {
      cy.visit('/accounts');
      
      // Mock offline state
      cy.window().then((win) => {
        Object.defineProperty(win.navigator, 'onLine', { value: false });
        win.dispatchEvent(new Event('offline'));
      });
      
      // Should show offline indicator
      cy.get('[data-cy="offline-indicator"]').should('be.visible');
      cy.get('[data-cy="offline-indicator"]').should('contain', 'offline');
      
      // Core functionality should still work
      cy.get('[data-cy="account-code"]').should('be.visible'); // TOTP still generates
      
      // Sync-dependent features should be disabled with explanation
      cy.get('button[data-cy="sync-now"]').should('be.disabled');
      cy.get('[data-cy="sync-disabled-notice"]').should('contain', 'offline');
      
      // Mock coming back online
      cy.window().then((win) => {
        Object.defineProperty(win.navigator, 'onLine', { value: true });
        win.dispatchEvent(new Event('online'));
      });
      
      cy.get('[data-cy="online-indicator"]').should('be.visible');
      cy.get('button[data-cy="sync-now"]').should('not.be.disabled');
    });

    it('should provide progressive enhancement', () => {
      // Disable JavaScript to test base functionality
      cy.window().then((win) => {
        // Mock JavaScript disabled environment
        (win as any).javascriptDisabled = true;
      });
      
      cy.visit('/');
      
      // Basic content should still be accessible
      cy.get('main, [data-cy="main-content"]').should('be.visible');
      cy.get('h1, h2').should('exist');
      
      // Forms should work with basic HTML functionality
      cy.visit('/login');
      cy.get('form').should('exist');
      cy.get('input[type="email"]').should('exist');
      cy.get('input[type="password"]').should('exist');
      cy.get('button[type="submit"], input[type="submit"]').should('exist');
      
      // Navigation should work
      cy.get('nav a, [data-cy="nav-link"]').should('exist');
    });
  });
});