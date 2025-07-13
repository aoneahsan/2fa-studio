/**
 * Admin subscription management service
 * @module services/admin-subscription-management
 */

import { UserSubscription, SubscriptionTier, SubscriptionStatus } from '@src/types/subscription';
import { FirestoreService } from './firestore.service';
import { StripeService } from './stripe.service';

export interface SubscriptionManagementAction {
  subscriptionId: string;
  action: 'cancel' | 'reactivate' | 'change_plan' | 'extend' | 'refund';
  adminId: string;
  reason: string;
  metadata?: Record<string, unknown>;
}

export class AdminSubscriptionManagementService {
  
  static async getSubscriptions(filters?: {
    status?: SubscriptionStatus;
    tier?: SubscriptionTier;
    provider?: string;
  }): Promise<UserSubscription[]> {
    const queryFilters: unknown[] = [];
    
    if (filters?.status) {
      queryFilters.push({ field: 'status', operator: '==', value: filters.status });
    }
    
    const result = await FirestoreService.getCollection('subscriptions', queryFilters);
    return result.success ? result.data as UserSubscription[] : [];
  }

  static async cancelSubscription(action: SubscriptionManagementAction): Promise<void> {
    const subscription = await this.getSubscription(action.subscriptionId);
    
    if (subscription?.provider === 'stripe') {
      await StripeService.cancelSubscription(subscription.providerSubscriptionId);
    }
    
    await FirestoreService.updateDocument('subscriptions', action.subscriptionId, {
      status: 'canceled',
      canceledAt: new Date(),
      adminCanceledBy: action.adminId,
      adminCancelReason: action.reason,
    });
  }

  static async changeSubscriptionPlan(
    subscriptionId: string,
    newTier: SubscriptionTier,
    adminId: string,
    reason: string
  ): Promise<void> {
    await FirestoreService.updateDocument('subscriptions', subscriptionId, {
      tier: newTier,
      planChangedAt: new Date(),
      planChangedBy: adminId,
      planChangeReason: reason,
    });
  }

  private static async getSubscription(id: string): Promise<UserSubscription | null> {
    const result = await FirestoreService.getDocument('subscriptions', id);
    return result.success ? result.data as UserSubscription : null;
  }
}