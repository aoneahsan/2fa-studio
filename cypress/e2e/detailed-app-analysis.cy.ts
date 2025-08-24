describe('Detailed App Analysis', () => {
  const findings = {
    pages: [] as any[],
    forms: [] as any[],
    buttons: [] as any[],
    errors: [] as any[],
    routing: [] as any[]
  };
  
  // Ignore Firebase errors in test environment
  Cypress.on('uncaught:exception', (err) => {
    if (err.message.includes('Firebase') || 
        err.message.includes('installations/request-failed')) {
      return false;
    }
    return true;
  });

  describe('Page Structure Analysis', () => {
    it('should analyze home page', () => {
      cy.visit('/');
      cy.wait(2000);
      
      cy.document().then(doc => {
        const pageInfo = {
          url: '/',
          title: doc.title,
          hasReactRoot: !!doc.getElementById('root'),
          bodyText: doc.body.innerText.substring(0, 200),
          buttonCount: doc.querySelectorAll('button').length,
          linkCount: doc.querySelectorAll('a').length,
          formCount: doc.querySelectorAll('form').length,
          inputCount: doc.querySelectorAll('input').length
        };
        
        findings.pages.push(pageInfo);
        cy.log('Home Page Analysis:', pageInfo);
      });
      
      // Check what's visible
      cy.get('h1, h2, h3, h4, h5, h6').then($headings => {
        const headings = Array.from($headings).map(h => ({
          tag: h.tagName,
          text: h.textContent
        }));
        cy.log('Headings found:', headings);
      });
    });
    
    it('should analyze login page', () => {
      cy.visit('/login');
      cy.wait(2000);
      
      cy.document().then(doc => {
        const loginInfo = {
          url: '/login',
          title: doc.title,
          formElements: {
            emailInputs: doc.querySelectorAll('input[type="email"]').length,
            passwordInputs: doc.querySelectorAll('input[type="password"]').length,
            textInputs: doc.querySelectorAll('input[type="text"]').length,
            submitButtons: doc.querySelectorAll('button[type="submit"]').length,
            forms: doc.querySelectorAll('form').length
          },
          pageText: doc.body.innerText.substring(0, 500)
        };
        
        findings.forms.push(loginInfo);
        cy.log('Login Page Analysis:', loginInfo);
        
        // Log the actual page content for debugging
        cy.log('Page HTML structure:', doc.body.innerHTML.substring(0, 1000));
      });
      
      // Try to interact with the page
      cy.get('input').then($inputs => {
        if ($inputs.length > 0) {
          cy.log(`Found ${$inputs.length} inputs`);
          $inputs.each((i, input) => {
            cy.log(`Input ${i}: type=${input.type}, name=${input.name}, id=${input.id}`);
          });
        } else {
          cy.log('NO INPUTS FOUND ON LOGIN PAGE - Page might not be rendering correctly');
          findings.errors.push({
            page: '/login',
            issue: 'No input elements found',
            severity: 'high'
          });
        }
      });
    });
    
    it('should analyze register page', () => {
      cy.visit('/register');
      cy.wait(2000);
      
      cy.document().then(doc => {
        const registerInfo = {
          url: '/register',
          title: doc.title,
          hasForm: doc.querySelectorAll('form').length > 0,
          inputs: Array.from(doc.querySelectorAll('input')).map(input => ({
            type: input.type,
            name: input.name,
            placeholder: input.placeholder,
            required: input.required
          })),
          pageText: doc.body.innerText.substring(0, 500)
        };
        
        findings.forms.push(registerInfo);
        cy.log('Register Page Analysis:', registerInfo);
      });
    });
    
    it('should test routing behavior', () => {
      const routes = [
        { path: '/dashboard', expectedBehavior: 'redirect to login' },
        { path: '/accounts', expectedBehavior: 'redirect to login' },
        { path: '/settings', expectedBehavior: 'redirect to login' },
        { path: '/admin', expectedBehavior: 'redirect to login' },
        { path: '/non-existent', expectedBehavior: '404 or redirect' }
      ];
      
      routes.forEach(route => {
        cy.visit(route.path, { failOnStatusCode: false });
        cy.wait(1000);
        
        cy.url().then(url => {
          cy.document().then(doc => {
            const routeInfo = {
              requested: route.path,
              expected: route.expectedBehavior,
              actual: url,
              redirected: !url.includes(route.path),
              pageTitle: doc.title,
              hasContent: doc.body.innerText.length > 0
            };
            
            findings.routing.push(routeInfo);
            cy.log(`Route ${route.path}:`, routeInfo);
          });
        });
      });
    });
  });
  
  describe('Interactive Elements Analysis', () => {
    it('should find all interactive elements', () => {
      cy.visit('/');
      cy.wait(2000);
      
      // Find all buttons
      cy.get('button').then($buttons => {
        const buttonInfo = Array.from($buttons).map(btn => ({
          text: btn.textContent?.trim(),
          disabled: btn.disabled,
          type: btn.type,
          className: btn.className
        }));
        
        findings.buttons = buttonInfo;
        cy.log('Buttons found:', buttonInfo);
        
        if (buttonInfo.length === 0) {
          findings.errors.push({
            page: '/',
            issue: 'No buttons found on home page',
            severity: 'medium'
          });
        }
      });
      
      // Find all links
      cy.get('a').then($links => {
        const linkInfo = Array.from($links).map(link => ({
          text: link.textContent?.trim(),
          href: link.href,
          target: link.target
        }));
        
        cy.log('Links found:', linkInfo);
      });
    });
    
    it('should test form submission', () => {
      cy.visit('/login');
      cy.wait(2000);
      
      // Try to submit empty form
      cy.get('form').then($forms => {
        if ($forms.length > 0) {
          cy.log('Form found, attempting submission');
          
          // Fill and submit
          cy.get('input').each(($input) => {
            const type = $input.attr('type');
            if (type === 'email') {
              cy.wrap($input).type('test@example.com');
            } else if (type === 'password') {
              cy.wrap($input).type('TestPassword123');
            } else if (type === 'text') {
              cy.wrap($input).type('TestInput');
            }
          });
          
          // Try to submit
          cy.get('button[type="submit"], button:contains("Login"), button:contains("Sign in")').first().click({ force: true });
          cy.wait(2000);
          
          // Check what happened
          cy.url().then(url => {
            cy.document().then(doc => {
              const submissionResult = {
                formSubmitted: true,
                resultUrl: url,
                pageChanged: !url.includes('/login'),
                errorMessages: Array.from(doc.querySelectorAll('.error, .alert, [role="alert"]')).map(el => el.textContent)
              };
              
              cy.log('Form submission result:', submissionResult);
              findings.forms.push(submissionResult);
            });
          });
        } else {
          cy.log('NO FORM FOUND ON LOGIN PAGE');
          findings.errors.push({
            page: '/login',
            issue: 'No form element found',
            severity: 'critical'
          });
        }
      });
    });
  });
  
  describe('Final Report', () => {
    it('should generate comprehensive report', () => {
      cy.wrap(null).then(() => {
        cy.log('=========== FINAL ANALYSIS REPORT ===========');
        
        // Pages Summary
        cy.log('📄 PAGES ANALYZED:');
        findings.pages.forEach(page => {
          cy.log(`- ${page.url}: ${page.buttonCount} buttons, ${page.linkCount} links, ${page.formCount} forms`);
        });
        
        // Forms Summary
        cy.log('📝 FORMS FOUND:');
        findings.forms.forEach(form => {
          cy.log(`- ${form.url}: ${JSON.stringify(form.formElements || form.inputs || 'No form data')}`);
        });
        
        // Routing Summary
        cy.log('🔀 ROUTING BEHAVIOR:');
        findings.routing.forEach(route => {
          cy.log(`- ${route.requested} → ${route.actual} (${route.redirected ? 'redirected' : 'stayed'})`);
        });
        
        // Errors Summary
        cy.log('❌ ISSUES FOUND:');
        if (findings.errors.length === 0) {
          cy.log('No critical issues found');
        } else {
          findings.errors.forEach(error => {
            cy.log(`- [${error.severity}] ${error.page}: ${error.issue}`);
          });
        }
        
        // Overall Assessment
        const assessment = {
          totalPages: findings.pages.length,
          totalForms: findings.forms.length,
          totalButtons: findings.buttons.length,
          totalErrors: findings.errors.length,
          criticalErrors: findings.errors.filter(e => e.severity === 'critical').length,
          recommendation: findings.errors.some(e => e.severity === 'critical') 
            ? 'Critical issues need immediate attention' 
            : 'App is functional but may need improvements'
        };
        
        cy.log('📊 OVERALL ASSESSMENT:', assessment);
        
        // Write findings to console for easy copying
        console.log('Full Findings Object:', JSON.stringify(findings, null, 2));
      });
    });
  });
});