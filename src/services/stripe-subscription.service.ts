/**
 * Stripe Subscription Service
 * Handles payment processing and subscription management
 */

import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db, functions } from '../config/firebase';
import { httpsCallable } from 'firebase/functions';

export enum SubscriptionTier {
  FREE = 'free',
  PREMIUM = 'premium',
  FAMILY = 'family',
  BUSINESS = 'business'
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELED = 'canceled',
  PAST_DUE = 'past_due',
  TRIALING = 'trialing',
  INCOMPLETE = 'incomplete',
  INCOMPLETE_EXPIRED = 'incomplete_expired'
}

export interface SubscriptionPlan {
  id: string;
  tier: SubscriptionTier;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  limits: {
    accounts: number | null;
    devices: number;
    backups: boolean;
    sync: boolean;
    support: 'community' | 'email' | 'priority';
    ads: boolean;
  };
  stripePriceId: string;
}

export interface UserSubscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialEnd: Date | null;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account';
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  isDefault: boolean;
}

export class StripeSubscriptionService {
  private static instance: StripeSubscriptionService;
  private static stripe: Stripe | null = null;
  private static elements: StripeElements | null = null;
  private static isInitialized = false;

  // Subscription Plans
  private static readonly PLANS: SubscriptionPlan[] = [
    {
      id: 'free',
      tier: SubscriptionTier.FREE,
      name: 'Free',
      description: 'Basic 2FA protection',
      price: 0,
      currency: 'usd',
      interval: 'month',
      features: [
        'Up to 10 accounts',
        'Local backup only',
        'Basic support',
        'Contains ads'
      ],
      limits: {
        accounts: 10,
        devices: 1,
        backups: false,
        sync: false,
        support: 'community',
        ads: true
      },
      stripePriceId: ''
    },
    {
      id: 'premium_monthly',
      tier: SubscriptionTier.PREMIUM,
      name: 'Premium',
      description: 'Advanced features for power users',
      price: 2.99,
      currency: 'usd',
      interval: 'month',
      features: [
        'Unlimited accounts',
        'Cloud backup',
        'Multi-device sync',
        'No ads',
        'Email support',
        'Biometric unlock',
        'Custom categories'
      ],
      limits: {
        accounts: null,
        devices: 5,
        backups: true,
        sync: true,
        support: 'email',
        ads: false
      },
      stripePriceId: import.meta.env.VITE_STRIPE_PRICE_PREMIUM_MONTHLY || ''
    },
    {
      id: 'premium_yearly',
      tier: SubscriptionTier.PREMIUM,
      name: 'Premium (Annual)',
      description: 'Save 20% with annual billing',
      price: 28.99,
      currency: 'usd',
      interval: 'year',
      features: [
        'All Premium features',
        'Save $7 per year',
        '2 months free'
      ],
      limits: {
        accounts: null,
        devices: 5,
        backups: true,
        sync: true,
        support: 'email',
        ads: false
      },
      stripePriceId: import.meta.env.VITE_STRIPE_PRICE_PREMIUM_YEARLY || ''
    },
    {
      id: 'family_monthly',
      tier: SubscriptionTier.FAMILY,
      name: 'Family',
      description: 'Share with up to 5 family members',
      price: 4.99,
      currency: 'usd',
      interval: 'month',
      features: [
        'All Premium features',
        'Up to 5 users',
        'Family sharing',
        'Shared vault',
        'Priority support',
        'Advanced analytics'
      ],
      limits: {
        accounts: null,
        devices: 25,
        backups: true,
        sync: true,
        support: 'priority',
        ads: false
      },
      stripePriceId: import.meta.env.VITE_STRIPE_PRICE_FAMILY_MONTHLY || ''
    },
    {
      id: 'family_yearly',
      tier: SubscriptionTier.FAMILY,
      name: 'Family (Annual)',
      description: 'Best value for families',
      price: 47.99,
      currency: 'usd',
      interval: 'year',
      features: [
        'All Family features',
        'Save $12 per year',
        '2 months free'
      ],
      limits: {
        accounts: null,
        devices: 25,
        backups: true,
        sync: true,
        support: 'priority',
        ads: false
      },
      stripePriceId: import.meta.env.VITE_STRIPE_PRICE_FAMILY_YEARLY || ''
    }
  ];

  private constructor() {}

  public static getInstance(): StripeSubscriptionService {
    if (!StripeSubscriptionService.instance) {
      StripeSubscriptionService.instance = new StripeSubscriptionService();
    }
    return StripeSubscriptionService.instance;
  }

  /**
   * Initialize Stripe
   */
  public async initialize(): Promise<void> {
    if (StripeSubscriptionService.isInitialized) return;

    try {
      const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
      
      if (!publishableKey || publishableKey === 'your_stripe_publishable_key_here') {
        console.warn('Stripe publishable key not configured');
        return;
      }

      StripeSubscriptionService.stripe = await loadStripe(publishableKey);
      
      if (StripeSubscriptionService.stripe) {
        StripeSubscriptionService.elements = StripeSubscriptionService.stripe.elements();
        StripeSubscriptionService.isInitialized = true;
        console.log('Stripe initialized successfully');
      }
    } catch (error) {
      console.error('Failed to initialize Stripe:', error);
      throw error;
    }
  }

  /**
   * Get available subscription plans
   */
  public getPlans(): SubscriptionPlan[] {
    return StripeSubscriptionService.PLANS;
  }

  /**
   * Get plan by ID
   */
  public getPlan(planId: string): SubscriptionPlan | undefined {
    return StripeSubscriptionService.PLANS.find(p => p.id === planId);
  }

  /**
   * Get user's current subscription
   */
  public async getCurrentSubscription(userId: string): Promise<UserSubscription | null> {
    try {
      const subDoc = await getDoc(doc(db, 'subscriptions', userId));
      
      if (!subDoc.exists()) {
        return null;
      }

      return subDoc.data() as UserSubscription;
    } catch (error) {
      console.error('Failed to get subscription:', error);
      return null;
    }
  }

  /**
   * Create checkout session for new subscription
   */
  public async createCheckoutSession(
    userId: string,
    planId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<{ sessionId: string } | null> {
    try {
      if (!StripeSubscriptionService.stripe) {
        throw new Error('Stripe not initialized');
      }

      const plan = this.getPlan(planId);
      if (!plan) {
        throw new Error('Invalid plan');
      }

      // Call Cloud Function to create checkout session
      if (functions) {
        const createCheckout = httpsCallable(functions, 'createCheckoutSession');
        const result = await createCheckout({
          userId,
          priceId: plan.stripePriceId,
          successUrl,
          cancelUrl,
          metadata: {
            planId,
            tier: plan.tier
          }
        });

        return result.data as { sessionId: string };
      }

      // Fallback for demo
      return { sessionId: 'demo_session_' + Date.now() };
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      return null;
    }
  }

  /**
   * Redirect to Stripe Checkout
   */
  public async redirectToCheckout(sessionId: string): Promise<void> {
    if (!StripeSubscriptionService.stripe) {
      throw new Error('Stripe not initialized');
    }

    const { error } = await StripeSubscriptionService.stripe.redirectToCheckout({
      sessionId
    });

    if (error) {
      throw error;
    }
  }

  /**
   * Create billing portal session
   */
  public async createBillingPortalSession(
    userId: string,
    returnUrl: string
  ): Promise<{ url: string } | null> {
    try {
      // Call Cloud Function to create portal session
      if (functions) {
        const createPortal = httpsCallable(functions, 'createBillingPortalSession');
        const result = await createPortal({
          userId,
          returnUrl
        });

        return result.data as { url: string };
      }

      // Fallback for demo
      return { url: '/settings/billing' };
    } catch (error) {
      console.error('Failed to create billing portal session:', error);
      return null;
    }
  }

  /**
   * Update subscription
   */
  public async updateSubscription(
    userId: string,
    newPlanId: string
  ): Promise<boolean> {
    try {
      const plan = this.getPlan(newPlanId);
      if (!plan) {
        throw new Error('Invalid plan');
      }

      // Call Cloud Function to update subscription
      if (functions) {
        const updateSub = httpsCallable(functions, 'updateSubscription');
        const result = await updateSub({
          userId,
          priceId: plan.stripePriceId
        });

        return (result.data as any).success;
      }

      // Fallback: update local subscription
      await updateDoc(doc(db, 'subscriptions', userId), {
        tier: plan.tier,
        updatedAt: serverTimestamp()
      });

      return true;
    } catch (error) {
      console.error('Failed to update subscription:', error);
      return false;
    }
  }

  /**
   * Cancel subscription
   */
  public async cancelSubscription(
    userId: string,
    immediately = false
  ): Promise<boolean> {
    try {
      // Call Cloud Function to cancel subscription
      if (functions) {
        const cancelSub = httpsCallable(functions, 'cancelSubscription');
        const result = await cancelSub({
          userId,
          immediately
        });

        return (result.data as any).success;
      }

      // Fallback: update local subscription
      await updateDoc(doc(db, 'subscriptions', userId), {
        cancelAtPeriodEnd: !immediately,
        status: immediately ? SubscriptionStatus.CANCELED : SubscriptionStatus.ACTIVE,
        updatedAt: serverTimestamp()
      });

      return true;
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      return false;
    }
  }

  /**
   * Resume canceled subscription
   */
  public async resumeSubscription(userId: string): Promise<boolean> {
    try {
      // Call Cloud Function to resume subscription
      if (functions) {
        const resumeSub = httpsCallable(functions, 'resumeSubscription');
        const result = await resumeSub({ userId });

        return (result.data as any).success;
      }

      // Fallback: update local subscription
      await updateDoc(doc(db, 'subscriptions', userId), {
        cancelAtPeriodEnd: false,
        updatedAt: serverTimestamp()
      });

      return true;
    } catch (error) {
      console.error('Failed to resume subscription:', error);
      return false;
    }
  }

  /**
   * Get payment methods
   */
  public async getPaymentMethods(userId: string): Promise<PaymentMethod[]> {
    try {
      // Call Cloud Function to get payment methods
      if (functions) {
        const getMethods = httpsCallable(functions, 'getPaymentMethods');
        const result = await getMethods({ userId });

        return (result.data as any).paymentMethods || [];
      }

      // Fallback for demo
      return [];
    } catch (error) {
      console.error('Failed to get payment methods:', error);
      return [];
    }
  }

  /**
   * Add payment method
   */
  public async addPaymentMethod(
    userId: string,
    paymentMethodId: string
  ): Promise<boolean> {
    try {
      // Call Cloud Function to add payment method
      if (functions) {
        const addMethod = httpsCallable(functions, 'addPaymentMethod');
        const result = await addMethod({
          userId,
          paymentMethodId
        });

        return (result.data as any).success;
      }

      return false;
    } catch (error) {
      console.error('Failed to add payment method:', error);
      return false;
    }
  }

  /**
   * Remove payment method
   */
  public async removePaymentMethod(
    userId: string,
    paymentMethodId: string
  ): Promise<boolean> {
    try {
      // Call Cloud Function to remove payment method
      if (functions) {
        const removeMethod = httpsCallable(functions, 'removePaymentMethod');
        const result = await removeMethod({
          userId,
          paymentMethodId
        });

        return (result.data as any).success;
      }

      return false;
    } catch (error) {
      console.error('Failed to remove payment method:', error);
      return false;
    }
  }

  /**
   * Set default payment method
   */
  public async setDefaultPaymentMethod(
    userId: string,
    paymentMethodId: string
  ): Promise<boolean> {
    try {
      // Call Cloud Function to set default payment method
      if (functions) {
        const setDefault = httpsCallable(functions, 'setDefaultPaymentMethod');
        const result = await setDefault({
          userId,
          paymentMethodId
        });

        return (result.data as any).success;
      }

      return false;
    } catch (error) {
      console.error('Failed to set default payment method:', error);
      return false;
    }
  }

  /**
   * Get subscription invoices
   */
  public async getInvoices(userId: string, limit = 10): Promise<any[]> {
    try {
      // Call Cloud Function to get invoices
      if (functions) {
        const getInvoices = httpsCallable(functions, 'getInvoices');
        const result = await getInvoices({
          userId,
          limit
        });

        return (result.data as any).invoices || [];
      }

      return [];
    } catch (error) {
      console.error('Failed to get invoices:', error);
      return [];
    }
  }

  /**
   * Apply promo code
   */
  public async applyPromoCode(
    userId: string,
    promoCode: string
  ): Promise<{ success: boolean; discount?: number }> {
    try {
      // Call Cloud Function to apply promo code
      if (functions) {
        const applyPromo = httpsCallable(functions, 'applyPromoCode');
        const result = await applyPromo({
          userId,
          promoCode
        });

        return result.data as any;
      }

      return { success: false };
    } catch (error) {
      console.error('Failed to apply promo code:', error);
      return { success: false };
    }
  }

  /**
   * Check if user has active subscription
   */
  public async hasActiveSubscription(userId: string): Promise<boolean> {
    const subscription = await this.getCurrentSubscription(userId);
    
    if (!subscription) return false;
    
    return subscription.status === SubscriptionStatus.ACTIVE ||
           subscription.status === SubscriptionStatus.TRIALING;
  }

  /**
   * Check if feature is available for user's tier
   */
  public async isFeatureAvailable(
    userId: string,
    feature: keyof SubscriptionPlan['limits']
  ): Promise<boolean> {
    const subscription = await this.getCurrentSubscription(userId);
    
    if (!subscription) {
      // Check free tier limits
      const freePlan = this.getPlan('free');
      return freePlan ? !!freePlan.limits[feature] : false;
    }

    const plan = StripeSubscriptionService.PLANS.find(p => p.tier === subscription.tier);
    
    if (!plan) return false;
    
    const limit = plan.limits[feature];
    
    // For boolean features
    if (typeof limit === 'boolean') return limit;
    
    // For numeric limits (null means unlimited)
    if (typeof limit === 'number' || limit === null) return true;
    
    // For string features (like support level)
    return !!limit;
  }

  /**
   * Get user's account limit
   */
  public async getAccountLimit(userId: string): Promise<number | null> {
    const subscription = await this.getCurrentSubscription(userId);
    
    const tier = subscription?.tier || SubscriptionTier.FREE;
    const plan = StripeSubscriptionService.PLANS.find(p => p.tier === tier);
    
    return plan?.limits.accounts || 10; // Default to free tier limit
  }

  /**
   * Handle webhook events
   */
  public async handleWebhook(
    rawBody: string,
    signature: string
  ): Promise<void> {
    // This would typically be handled by a Cloud Function
    // Just placeholder for client-side awareness
    console.log('Webhook handling should be done server-side');
  }
}