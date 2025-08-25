/**
 * Comprehensive Subscription and Billing E2E Tests
 * Tests all subscription flows, billing, upgrades, downgrades, and payment processing
 */

describe('Comprehensive Subscription Tests', () => {
  beforeEach(() => {
    cy.cleanup();
    cy.setupEmulator();
    // Start with free user for upgrade tests
    cy.setupTestUser('free');
  });

  describe('Subscription Plans and Pricing', () => {
    it('should display available subscription plans', () => {
      cy.visit('/settings/subscription');
      
      cy.fixture('subscription-plans').then((plans) => {
        // Should show all plans
        cy.get('[data-cy="plan-free"]').should('be.visible');
        cy.get('[data-cy="plan-premium"]').should('be.visible');
        cy.get('[data-cy="plan-pro"]').should('be.visible');
        
        // Check free plan details
        cy.get('[data-cy="plan-free"]').within(() => {
          cy.contains('Free').should('be.visible');
          cy.contains('$0').should('be.visible');
          cy.contains('10 accounts').should('be.visible');
          cy.contains('Current Plan').should('be.visible');
        });
        
        // Check premium plan details
        cy.get('[data-cy="plan-premium"]').within(() => {
          cy.contains('Premium').should('be.visible');
          cy.contains('$4.99').should('be.visible');
          cy.contains('Unlimited accounts').should('be.visible');
          cy.contains('Cloud backup').should('be.visible');
          cy.contains('No ads').should('be.visible');
          cy.get('button:contains("Upgrade")').should('be.visible');
        });
        
        // Check pro plan details
        cy.get('[data-cy="plan-pro"]').within(() => {
          cy.contains('Pro').should('be.visible');
          cy.contains('$9.99').should('be.visible');
          cy.contains('Team features').should('be.visible');
          cy.contains('Priority support').should('be.visible');
        });
      });
    });

    it('should show feature comparison table', () => {
      cy.visit('/settings/subscription');
      
      cy.get('button[data-cy="compare-plans"], button:contains("Compare")').click();
      
      // Should show comparison modal
      cy.get('[data-cy="plans-comparison-modal"]').should('be.visible');
      
      // Check features table
      cy.get('[data-cy="comparison-table"]').should('be.visible');
      cy.get('[data-cy="feature-accounts"]').should('contain', 'Number of accounts');
      cy.get('[data-cy="feature-backup"]').should('contain', 'Cloud backup');
      cy.get('[data-cy="feature-sync"]').should('contain', 'Multi-device sync');
      cy.get('[data-cy="feature-ads"]').should('contain', 'Advertisements');
      
      // Check checkmarks and crosses
      cy.get('[data-cy="free-accounts"]').should('contain', '10');
      cy.get('[data-cy="premium-accounts"]').should('contain', 'Unlimited');
      cy.get('[data-cy="free-backup"]').find('.feature-disabled').should('exist');
      cy.get('[data-cy="premium-backup"]').find('.feature-enabled').should('exist');
    });

    it('should show pricing for different billing cycles', () => {
      cy.visit('/settings/subscription');
      
      // Toggle billing cycle
      cy.get('[data-cy="billing-toggle"], button:contains("Annual")').click();
      
      // Should show annual pricing
      cy.get('[data-cy="plan-premium"]').within(() => {
        cy.contains('$49.99').should('be.visible');
        cy.contains('/year').should('be.visible');
        cy.contains('Save 17%').should('be.visible');
      });
      
      // Toggle back to monthly
      cy.get('[data-cy="billing-toggle"], button:contains("Monthly")').click();
      
      // Should show monthly pricing
      cy.get('[data-cy="plan-premium"]').within(() => {
        cy.contains('$4.99').should('be.visible');
        cy.contains('/month').should('be.visible');
      });
    });

    it('should show trial information', () => {
      cy.visit('/settings/subscription');
      
      cy.get('[data-cy="plan-premium"]').within(() => {
        cy.contains('14-day free trial').should('be.visible');
        cy.get('button:contains("Start Trial")').should('be.visible');
      });
      
      cy.get('[data-cy="plan-pro"]').within(() => {
        cy.contains('30-day free trial').should('be.visible');
      });
    });
  });

  describe('Subscription Upgrade Flow', () => {
    it('should upgrade from free to premium', () => {
      cy.visit('/settings/subscription');
      
      // Start upgrade
      cy.get('[data-cy="plan-premium"]').find('button:contains("Upgrade")').click();
      
      // Should show payment form
      cy.get('[data-cy="payment-modal"]').should('be.visible');
      cy.get('[data-cy="plan-summary"]').should('contain', 'Premium Plan');
      cy.get('[data-cy="plan-price"]').should('contain', '$4.99/month');
      
      // Fill payment details
      cy.fixture('subscription-plans').then((plans) => {
        const card = plans.paymentMethods.validCard;
        
        cy.get('input[data-cy="card-number"]').type(card.number);
        cy.get('input[data-cy="card-expiry"]').type(`${card.expiryMonth}${card.expiryYear}`);
        cy.get('input[data-cy="card-cvc"]').type(card.cvc);
        cy.get('input[data-cy="cardholder-name"]').type(card.name);
        cy.get('input[data-cy="billing-zip"]').type(card.zipCode);
      });
      
      // Apply trial if available
      cy.get('[data-cy="trial-checkbox"]').check();
      
      // Submit payment
      cy.get('button[data-cy="complete-payment"]').click();
      
      // Should show processing
      cy.get('[data-cy="payment-processing"]').should('be.visible');
      
      // Should complete successfully
      cy.get('[data-cy="payment-success"]', { timeout: 30000 }).should('be.visible');
      cy.contains('Welcome to Premium!').should('be.visible');
      
      // Verify subscription status
      cy.get('[data-cy="current-plan"]').should('contain', 'Premium');
      cy.get('[data-cy="trial-status"]').should('contain', '14 days remaining');
    });

    it('should handle payment failures gracefully', () => {
      cy.visit('/settings/subscription');
      cy.get('[data-cy="plan-premium"]').find('button:contains("Upgrade")').click();
      
      // Use declined card
      cy.fixture('subscription-plans').then((plans) => {
        const card = plans.paymentMethods.declinedCard;
        
        cy.get('input[data-cy="card-number"]').type(card.number);
        cy.get('input[data-cy="card-expiry"]').type(`${card.expiryMonth}${card.expiryYear}`);
        cy.get('input[data-cy="card-cvc"]').type(card.cvc);
        cy.get('input[data-cy="cardholder-name"]').type(card.name);
        cy.get('input[data-cy="billing-zip"]').type(card.zipCode);
      });
      
      cy.get('button[data-cy="complete-payment"]').click();
      
      // Should show payment error
      cy.get('[data-cy="payment-error"]').should('be.visible');
      cy.contains('Your card was declined').should('be.visible');
      
      // Should offer to try different payment method
      cy.get('button[data-cy="try-different-card"]').should('be.visible');
      cy.get('button[data-cy="contact-support"]').should('be.visible');
    });

    it('should apply coupon codes during upgrade', () => {
      cy.visit('/settings/subscription');
      cy.get('[data-cy="plan-premium"]').find('button:contains("Upgrade")').click();
      
      // Apply coupon
      cy.get('button[data-cy="add-coupon"], [data-cy="coupon-toggle"]').click();
      cy.get('input[data-cy="coupon-code"]').type('TEST50');
      cy.get('button[data-cy="apply-coupon"]').click();
      
      // Should show discount
      cy.get('[data-cy="discount-applied"]').should('be.visible');
      cy.get('[data-cy="original-price"]').should('contain', '$4.99');
      cy.get('[data-cy="discount-amount"]').should('contain', '-$2.50');
      cy.get('[data-cy="final-price"]').should('contain', '$2.49');
      
      // Test invalid coupon
      cy.get('input[data-cy="coupon-code"]').clear().type('INVALID123');
      cy.get('button[data-cy="apply-coupon"]').click();
      
      cy.get('[data-cy="coupon-error"]').should('contain', 'Invalid coupon code');
    });

    it('should handle upgrade with existing trial', () => {
      // Mock user already on trial
      cy.window().then((win) => {
        (win as any).mockUser = {
          subscription: {
            plan: 'premium',
            status: 'trialing',
            trialEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
          }
        };
      });
      
      cy.visit('/settings/subscription');
      
      // Should show trial status
      cy.get('[data-cy="trial-banner"]').should('be.visible');
      cy.get('[data-cy="trial-banner"]').should('contain', '7 days remaining');
      
      // Should show option to end trial and pay now
      cy.get('button[data-cy="end-trial-pay-now"]').should('be.visible');
      
      // Try to upgrade to Pro
      cy.get('[data-cy="plan-pro"]').find('button:contains("Upgrade")').click();
      
      // Should calculate prorated amount
      cy.get('[data-cy="proration-info"]').should('be.visible');
      cy.get('[data-cy="proration-info"]').should('contain', 'You will be charged');
    });
  });

  describe('Subscription Management', () => {
    beforeEach(() => {
      cy.setupTestUser('premium'); // Start with premium user
    });

    it('should view current subscription details', () => {
      cy.visit('/settings/subscription');
      
      // Should show current plan info
      cy.get('[data-cy="current-plan-card"]').should('be.visible');
      cy.get('[data-cy="current-plan-name"]').should('contain', 'Premium');
      cy.get('[data-cy="plan-price"]').should('contain', '$4.99');
      cy.get('[data-cy="billing-cycle"]').should('contain', 'monthly');
      cy.get('[data-cy="next-billing"]').should('be.visible');
      
      // Should show subscription features
      cy.get('[data-cy="active-features"]').within(() => {
        cy.contains('Unlimited accounts').should('be.visible');
        cy.contains('Cloud backup').should('be.visible');
        cy.contains('No advertisements').should('be.visible');
        cy.contains('Priority support').should('be.visible');
      });
      
      // Should show usage statistics
      cy.get('[data-cy="usage-stats"]').should('be.visible');
      cy.get('[data-cy="accounts-count"]').should('contain', 'accounts');
      cy.get('[data-cy="storage-used"]').should('contain', 'storage');
    });

    it('should change billing cycle', () => {
      cy.visit('/settings/subscription');
      
      cy.get('button[data-cy="change-billing"]').click();
      
      // Should show billing options
      cy.get('[data-cy="billing-modal"]').should('be.visible');
      cy.get('input[data-cy="annual-billing"]').check();
      
      // Should show savings calculation
      cy.get('[data-cy="savings-info"]').should('contain', 'Save $10.89 per year');
      cy.get('[data-cy="new-price"]').should('contain', '$49.99/year');
      
      cy.get('button[data-cy="confirm-billing-change"]').click();
      
      // Should show success
      cy.get('[data-cy="billing-changed"]').should('be.visible');
      cy.get('[data-cy="current-plan-card"]').should('contain', 'annual');
    });

    it('should update payment method', () => {
      cy.visit('/settings/subscription');
      
      cy.get('button[data-cy="update-payment-method"]').click();
      
      // Should show current payment method
      cy.get('[data-cy="current-card"]').should('contain', '****');
      
      // Add new card
      cy.get('button[data-cy="add-new-card"]').click();
      
      cy.fixture('subscription-plans').then((plans) => {
        const newCard = plans.paymentMethods.validCard;
        
        cy.get('input[data-cy="new-card-number"]').type(newCard.number);
        cy.get('input[data-cy="new-card-expiry"]').type(`${newCard.expiryMonth}${newCard.expiryYear}`);
        cy.get('input[data-cy="new-card-cvc"]').type(newCard.cvc);
        cy.get('input[data-cy="new-cardholder-name"]').type(newCard.name);
      });
      
      cy.get('button[data-cy="save-payment-method"]').click();
      
      // Should update successfully
      cy.get('[data-cy="payment-updated"]').should('be.visible');
      cy.contains('Payment method updated').should('be.visible');
    });

    it('should view billing history', () => {
      cy.visit('/settings/subscription');
      
      cy.get('[data-cy="billing-history-tab"]').click();
      
      // Mock billing history
      cy.window().then((win) => {
        (win as any).mockBillingHistory = [
          { id: 'inv_001', date: '2024-01-15', amount: '$4.99', status: 'paid' },
          { id: 'inv_002', date: '2023-12-15', amount: '$4.99', status: 'paid' },
          { id: 'inv_003', date: '2023-11-15', amount: '$4.99', status: 'failed' }
        ];
      });
      
      // Should show billing history
      cy.get('[data-cy="billing-history"]').should('be.visible');
      cy.get('[data-cy="invoice-item"]').should('have.length', 3);
      
      // Check invoice details
      cy.get('[data-cy="invoice-item"]').first().within(() => {
        cy.get('[data-cy="invoice-date"]').should('contain', '2024-01-15');
        cy.get('[data-cy="invoice-amount"]').should('contain', '$4.99');
        cy.get('[data-cy="invoice-status"]').should('contain', 'Paid');
        cy.get('button[data-cy="download-invoice"]').should('be.visible');
      });
      
      // Check failed payment
      cy.get('[data-cy="invoice-item"]').last().within(() => {
        cy.get('[data-cy="invoice-status"]').should('contain', 'Failed');
        cy.get('button[data-cy="retry-payment"]').should('be.visible');
      });
    });

    it('should handle failed payment retry', () => {
      cy.visit('/settings/subscription');
      cy.get('[data-cy="billing-history-tab"]').click();
      
      // Retry failed payment
      cy.get('[data-cy="invoice-item"]').last().find('button[data-cy="retry-payment"]').click();
      
      // Should show payment retry modal
      cy.get('[data-cy="retry-payment-modal"]').should('be.visible');
      cy.get('[data-cy="retry-amount"]').should('contain', '$4.99');
      
      // Choose payment method
      cy.get('select[data-cy="payment-method-select"]').select('card-ending-1234');
      
      cy.get('button[data-cy="retry-now"]').click();
      
      // Should process retry
      cy.get('[data-cy="retry-processing"]').should('be.visible');
      cy.get('[data-cy="retry-success"]', { timeout: 30000 }).should('be.visible');
      cy.contains('Payment successful').should('be.visible');
    });
  });

  describe('Subscription Downgrade and Cancellation', () => {
    beforeEach(() => {
      cy.setupTestUser('premium'); // Start with premium user
    });

    it('should downgrade from premium to free', () => {
      cy.visit('/settings/subscription');
      
      cy.get('button[data-cy="downgrade-plan"]').click();
      
      // Should show downgrade confirmation
      cy.get('[data-cy="downgrade-modal"]').should('be.visible');
      cy.get('[data-cy="downgrade-warning"]').should('contain', 'You will lose access to');
      cy.get('[data-cy="feature-loss-list"]').should('contain', 'Cloud backup');
      cy.get('[data-cy="feature-loss-list"]').should('contain', 'Unlimited accounts');
      
      // Should show what happens to existing data
      cy.get('[data-cy="data-impact"]').should('contain', 'Your first 10 accounts will be kept');
      cy.get('[data-cy="data-impact"]').should('contain', 'Cloud backups will be deleted');
      
      // Confirm downgrade
      cy.get('input[data-cy="downgrade-confirmation"]').type('DOWNGRADE');
      cy.get('button[data-cy="confirm-downgrade"]').click();
      
      // Should process downgrade
      cy.get('[data-cy="downgrade-processing"]').should('be.visible');
      cy.get('[data-cy="downgrade-complete"]', { timeout: 30000 }).should('be.visible');
      
      // Should show free plan active
      cy.get('[data-cy="current-plan-name"]').should('contain', 'Free');
      cy.get('[data-cy="account-limit-warning"]').should('be.visible');
    });

    it('should cancel subscription', () => {
      cy.visit('/settings/subscription');
      
      cy.get('button[data-cy="cancel-subscription"]').click();
      
      // Should show cancellation flow
      cy.get('[data-cy="cancellation-modal"]').should('be.visible');
      
      // Ask reason for cancellation
      cy.get('select[data-cy="cancellation-reason"]').select('too-expensive');
      cy.get('textarea[data-cy="cancellation-feedback"]').type('The subscription is too expensive for my needs.');
      
      // Should offer retention discount
      cy.get('[data-cy="retention-offer"]').should('be.visible');
      cy.get('[data-cy="discount-offer"]').should('contain', '50% off');
      
      // Decline retention offer
      cy.get('button[data-cy="decline-offer"]').click();
      
      // Final cancellation confirmation
      cy.get('[data-cy="final-cancellation"]').should('be.visible');
      cy.get('input[data-cy="cancel-confirmation"]').type('CANCEL');
      cy.get('button[data-cy="confirm-cancellation"]').click();
      
      // Should show cancellation success
      cy.get('[data-cy="cancellation-success"]').should('be.visible');
      cy.contains('Subscription cancelled').should('be.visible');
      cy.get('[data-cy="access-until"]').should('contain', 'access until');
    });

    it('should reactivate cancelled subscription', () => {
      // Mock cancelled subscription
      cy.window().then((win) => {
        (win as any).mockUser = {
          subscription: {
            plan: 'premium',
            status: 'cancelled',
            cancelAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          }
        };
      });
      
      cy.visit('/settings/subscription');
      
      // Should show cancelled status
      cy.get('[data-cy="cancelled-banner"]').should('be.visible');
      cy.get('[data-cy="cancelled-banner"]').should('contain', 'Your subscription will end');
      
      // Should show reactivation option
      cy.get('button[data-cy="reactivate-subscription"]').should('be.visible');
      cy.get('button[data-cy="reactivate-subscription"]').click();
      
      // Should confirm reactivation
      cy.get('[data-cy="reactivation-modal"]').should('be.visible');
      cy.get('[data-cy="reactivation-details"]').should('contain', 'Your subscription will continue');
      
      cy.get('button[data-cy="confirm-reactivation"]').click();
      
      // Should reactivate successfully
      cy.get('[data-cy="reactivation-success"]').should('be.visible');
      cy.contains('Subscription reactivated').should('be.visible');
      cy.get('[data-cy="subscription-status"]').should('contain', 'Active');
    });
  });

  describe('Team and Enterprise Features', () => {
    beforeEach(() => {
      cy.setupTestUser('pro'); // Use pro user for team features
    });

    it('should create team workspace', () => {
      cy.visit('/settings/team');
      
      cy.get('button[data-cy="create-team"]').click();
      
      // Setup team
      cy.get('input[data-cy="team-name"]').type('Cypress Test Team');
      cy.get('input[data-cy="team-domain"]').type('cypress-test');
      cy.get('textarea[data-cy="team-description"]').type('Team created for E2E testing');
      
      cy.get('button[data-cy="create-team-workspace"]').click();
      
      // Should create team successfully
      cy.get('[data-cy="team-created"]').should('be.visible');
      cy.get('[data-cy="team-name"]').should('contain', 'Cypress Test Team');
      cy.get('[data-cy="team-members-count"]').should('contain', '1 member');
    });

    it('should invite team members', () => {
      cy.visit('/settings/team');
      
      cy.get('button[data-cy="invite-members"]').click();
      
      // Add multiple email addresses
      cy.get('textarea[data-cy="invite-emails"]').type('user1@example.com\nuser2@example.com\nuser3@example.com');
      
      // Set role
      cy.get('select[data-cy="default-role"]').select('member');
      
      // Add invitation message
      cy.get('textarea[data-cy="invitation-message"]').type('Welcome to our 2FA team workspace!');
      
      cy.get('button[data-cy="send-invitations"]').click();
      
      // Should send invitations
      cy.get('[data-cy="invitations-sent"]').should('be.visible');
      cy.contains('3 invitations sent').should('be.visible');
      
      // Should show pending invitations
      cy.get('[data-cy="pending-invites"]').should('contain', 'user1@example.com');
      cy.get('[data-cy="pending-invites"]').should('contain', 'user2@example.com');
      cy.get('[data-cy="pending-invites"]').should('contain', 'user3@example.com');
    });

    it('should manage team permissions', () => {
      cy.visit('/settings/team/permissions');
      
      // Should show permission matrix
      cy.get('[data-cy="permissions-matrix"]').should('be.visible');
      
      // Configure admin permissions
      cy.get('[data-role="admin"]').within(() => {
        cy.get('input[data-permission="manage-accounts"]').should('be.checked');
        cy.get('input[data-permission="manage-users"]').should('be.checked');
        cy.get('input[data-permission="view-audit-logs"]').should('be.checked');
      });
      
      // Configure member permissions
      cy.get('[data-role="member"]').within(() => {
        cy.get('input[data-permission="manage-accounts"]').check();
        cy.get('input[data-permission="create-backups"]').check();
        cy.get('input[data-permission="manage-users"]').should('not.be.checked');
      });
      
      // Save permissions
      cy.get('button[data-cy="save-permissions"]').click();
      cy.get('[data-cy="permissions-saved"]').should('be.visible');
    });

    it('should configure team billing', () => {
      cy.visit('/settings/team/billing');
      
      // Should show team billing info
      cy.get('[data-cy="team-plan"]').should('contain', 'Team Pro');
      cy.get('[data-cy="price-per-user"]').should('contain', '$9.99 per user');
      cy.get('[data-cy="current-users"]').should('contain', '1 user');
      cy.get('[data-cy="monthly-total"]').should('contain', '$9.99');
      
      // Add more users
      cy.get('button[data-cy="add-users"]').click();
      cy.get('input[data-cy="additional-users"]').clear().type('5');
      cy.get('button[data-cy="update-user-count"]').click();
      
      // Should update billing
      cy.get('[data-cy="current-users"]').should('contain', '6 users');
      cy.get('[data-cy="monthly-total"]').should('contain', '$59.94');
      
      // Show proration info
      cy.get('[data-cy="proration-info"]').should('be.visible');
      cy.get('[data-cy="proration-info"]').should('contain', 'prorated');
    });
  });

  describe('Subscription Analytics and Reports', () => {
    beforeEach(() => {
      cy.setupTestUser('premium');
    });

    it('should view subscription usage analytics', () => {
      cy.visit('/settings/subscription/analytics');
      
      // Should show usage charts
      cy.get('[data-cy="usage-chart"]').should('be.visible');
      cy.get('[data-cy="accounts-over-time"]').should('be.visible');
      cy.get('[data-cy="backup-usage"]').should('be.visible');
      cy.get('[data-cy="sync-activity"]').should('be.visible');
      
      // Should show key metrics
      cy.get('[data-cy="total-accounts"]').should('be.visible');
      cy.get('[data-cy="backup-size"]').should('contain', 'MB');
      cy.get('[data-cy="sync-frequency"]').should('be.visible');
      
      // Filter by date range
      cy.get('input[data-cy="date-from"]').type('2024-01-01');
      cy.get('input[data-cy="date-to"]').type('2024-01-31');
      cy.get('button[data-cy="apply-filter"]').click();
      
      // Should update charts
      cy.get('[data-cy="usage-chart"]').should('be.visible');
    });

    it('should export usage reports', () => {
      cy.visit('/settings/subscription/analytics');
      
      cy.get('button[data-cy="export-report"]').click();
      
      // Select report type
      cy.get('select[data-cy="report-type"]').select('detailed');
      cy.get('select[data-cy="report-format"]').select('csv');
      
      // Set date range
      cy.get('input[data-cy="report-start-date"]').type('2024-01-01');
      cy.get('input[data-cy="report-end-date"]').type('2024-01-31');
      
      cy.get('button[data-cy="generate-report"]').click();
      
      // Should generate report
      cy.get('[data-cy="report-generating"]').should('be.visible');
      cy.get('[data-cy="report-ready"]', { timeout: 30000 }).should('be.visible');
      cy.get('[data-cy="download-report"]').should('be.visible');
    });

    it('should show cost analysis', () => {
      cy.visit('/settings/subscription/analytics');
      
      cy.get('[data-cy="cost-analysis-tab"]').click();
      
      // Should show cost breakdown
      cy.get('[data-cy="monthly-cost"]').should('be.visible');
      cy.get('[data-cy="annual-cost"]').should('be.visible');
      cy.get('[data-cy="cost-per-account"]').should('be.visible');
      
      // Show savings potential
      cy.get('[data-cy="savings-calculator"]').should('be.visible');
      cy.get('[data-cy="annual-savings"]').should('contain', 'Save');
      
      // Compare with competitors
      cy.get('[data-cy="competitor-comparison"]').should('be.visible');
      cy.get('[data-cy="value-proposition"]').should('contain', 'value');
    });
  });
});