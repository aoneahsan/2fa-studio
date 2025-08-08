/**
 * Subscription Service
 * Handles subscription management and in-app purchases
 * @module services/subscription
 */

import { UnifiedErrorHandling } from 'unified-error-handling';
import { FirebaseService } from './firebase.service';

export interface SubscriptionTier {
  id: string;
  name: string;
  price: number;
  currency: string;
  features: string[];
  limits: {
    maxAccounts: number;
    maxDevices: number;
    backupEnabled: boolean;
    browserExtension: boolean;
    apiAccess: boolean;
  };
}

export interface UserSubscription {
  userId: string;
  tierId: string;
  status: 'active' | 'canceled' | 'expired' | 'trial';
  startDate: Date;
  endDate?: Date;
  trialEndDate?: Date;
  paymentMethod?: string;
  receiptData?: any;
}

export class SubscriptionService {
  static readonly TIERS: SubscriptionTier[] = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      currency: 'USD',
      features: [
        'Up to 10 accounts',
        '1 device',
        'Local backups only',
        'Basic support'
      ],
      limits: {
        maxAccounts: 10,
        maxDevices: 1,
        backupEnabled: false,
        browserExtension: false,
        apiAccess: false
      }
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 4.99,
      currency: 'USD',
      features: [
        'Unlimited accounts',
        'Up to 5 devices',
        'Cloud backups',
        'Browser extension',
        'Priority support'
      ],
      limits: {
        maxAccounts: -1,
        maxDevices: 5,
        backupEnabled: true,
        browserExtension: true,
        apiAccess: false
      }
    },
    {
      id: 'business',
      name: 'Business',
      price: 9.99,
      currency: 'USD',
      features: [
        'Unlimited accounts',
        'Unlimited devices',
        'Cloud backups',
        'Browser extension',
        'API access',
        'Premium support'
      ],
      limits: {
        maxAccounts: -1,
        maxDevices: -1,
        backupEnabled: true,
        browserExtension: true,
        apiAccess: true
      }
    }
  ];

  /**
   * Get user's current subscription
   */
  static async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    return UnifiedErrorHandling.withTryCatch(
      async () => {
        const doc = await FirebaseService.firestore
          .collection('subscriptions')
          .doc(userId)
          .get();

        if (!doc.exists) {
          return null;
        }

        return doc.data() as UserSubscription;
      },
      {
        operation: 'SubscriptionService.getUserSubscription',
        metadata: { userId }
      }
    );
  }

  /**
   * Check if user has access to feature
   */
  static async checkFeatureAccess(
    userId: string,
    feature: keyof SubscriptionTier['limits']
  ): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId);
    
    if (!subscription || subscription.status !== 'active') {
      // Check free tier
      const freeTier = this.TIERS.find(t => t.id === 'free');
      return freeTier?.limits[feature] === true;
    }

    const tier = this.TIERS.find(t => t.id === subscription.tierId);
    return tier?.limits[feature] === true;
  }

  /**
   * Check account limit
   */
  static async checkAccountLimit(userId: string, currentCount: number): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId);
    const tierId = subscription?.tierId || 'free';
    const tier = this.TIERS.find(t => t.id === tierId);
    
    if (!tier) return false;
    
    return tier.limits.maxAccounts === -1 || currentCount < tier.limits.maxAccounts;
  }

  /**
   * Start trial
   */
  static async startTrial(userId: string, tierId: string): Promise<void> {
    return UnifiedErrorHandling.withTryCatch(
      async () => {
        const trialDays = 7;
        const now = new Date();
        const trialEndDate = new Date(now);
        trialEndDate.setDate(trialEndDate.getDate() + trialDays);

        const subscription: UserSubscription = {
          userId,
          tierId,
          status: 'trial',
          startDate: now,
          trialEndDate
        };

        await FirebaseService.firestore
          .collection('subscriptions')
          .doc(userId)
          .set(subscription);
      },
      {
        operation: 'SubscriptionService.startTrial',
        metadata: { userId, tierId }
      }
    );
  }

  /**
   * Process purchase
   */
  static async processPurchase(
    userId: string,
    tierId: string,
    receiptData: any
  ): Promise<void> {
    return UnifiedErrorHandling.withTryCatch(
      async () => {
        // Validate receipt (platform-specific)
        const isValid = await this.validateReceipt(receiptData);
        
        if (!isValid) {
          throw new Error('Invalid receipt');
        }

        const subscription: UserSubscription = {
          userId,
          tierId,
          status: 'active',
          startDate: new Date(),
          receiptData
        };

        await FirebaseService.firestore
          .collection('subscriptions')
          .doc(userId)
          .set(subscription);
      },
      {
        operation: 'SubscriptionService.processPurchase',
        metadata: { userId, tierId }
      }
    );
  }

  /**
   * Validate receipt
   */
  private static async validateReceipt(receiptData: any): Promise<boolean> {
    // This would validate with Apple/Google servers
    // For now, return true
    return true;
  }
}