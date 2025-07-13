/**
 * License management and feature enforcement service
 * @module services/license-management
 */

import { 
  UserSubscription, 
  SubscriptionTier,
  SubscriptionFeatures,
  Usage,
  FeatureFlag 
} from '@src/types/subscription';
import { SUBSCRIPTION_FEATURES, getFeatures, canUseFeature, getUsageLimit, isUsageLimitReached } from '@src/config/subscription-plans';
import { FirestoreService } from './firestore.service';
import { User } from '@src/types';

export interface LicenseInfo {
  userId: string;
  tier: SubscriptionTier;
  status: 'active' | 'expired' | 'suspended' | 'canceled';
  features: SubscriptionFeatures;
  usage: Usage;
  limits: {
    accounts: number;
    backups: number;
    devices: number;
    familyMembers?: number;
    businessUsers?: number;
  };
  expiresAt?: Date;
  gracePeriodEnds?: Date;
  isInGracePeriod: boolean;
  violations: string[];
}

export interface FeatureCheck {
  allowed: boolean;
  reason?: string;
  upgradeRequired?: boolean;
  suggestedTier?: SubscriptionTier;
  remainingUsage?: number;
}

export interface UsageReport {
  period: string; // YYYY-MM
  accounts: number;
  backups: number;
  apiCalls: number;
  storageUsed: number;
  familyMembers?: number;
  businessUsers?: number;
  overage: {
    accounts: number;
    backups: number;
    apiCalls: number;
    storage: number;
  };
  cost: number;
}

export interface LicenseViolation {
  id: string;
  userId: string;
  type: 'usage_exceeded' | 'feature_abuse' | 'suspicious_activity' | 'payment_failed';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: Date;
  resolvedAt?: Date;
  actions: string[];
  metadata: Record<string, unknown>;
}

export class LicenseManagementService {
  private static readonly GRACE_PERIOD_DAYS = 7;
  private static readonly USAGE_CACHE_TTL = 300000; // 5 minutes
  private static usageCache: Map<string, { usage: Usage; timestamp: number }> = new Map();

  /**
   * Get comprehensive license information for a user
   */
  static async getLicenseInfo(userId: string): Promise<LicenseInfo> {
    try {
      // Get user's current subscription
      const subscription = await this.getCurrentSubscription(userId);
      const tier = subscription?.tier || 'free';
      const features = getFeatures(tier);
      
      // Get current usage
      const usage = await this.getCurrentUsage(userId);
      
      // Calculate limits
      const limits = {
        accounts: getUsageLimit(tier, 'accounts'),
        backups: getUsageLimit(tier, 'backups'),
        devices: getUsageLimit(tier, 'devices'),
        familyMembers: tier === 'family' || tier === 'business' ? 5 : undefined,
        businessUsers: tier === 'business' ? -1 : undefined,
      };

      // Check for violations
      const violations = await this.checkViolations(userId, usage, limits);

      // Determine status and grace period
      let status: 'active' | 'expired' | 'suspended' | 'canceled' = 'active';
      let isInGracePeriod = false;
      let gracePeriodEnds: Date | undefined;

      if (subscription) {
        switch (subscription.status) {
          case 'canceled':
            status = 'canceled';
            break;
          case 'past_due':
            status = 'expired';
            isInGracePeriod = true;
            gracePeriodEnds = new Date(subscription.currentPeriodEnd.getTime() + (this.GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000));
            break;
          case 'unpaid':
          case 'incomplete':
            status = 'suspended';
            break;
          default:
            status = 'active';
        }
      }

      return {
        userId,
        tier,
        status,
        features,
        usage,
        limits,
        expiresAt: subscription?.currentPeriodEnd,
        gracePeriodEnds,
        isInGracePeriod,
        violations,
      };
    } catch (_error) {
      console.error('Error getting license info:', error);
      
      // Return default free license on error
      return {
        userId,
        tier: 'free',
        status: 'active',
        features: SUBSCRIPTION_FEATURES.free,
        usage: {
          userId,
          period: new Date().toISOString().slice(0, 7),
          accounts: 0,
          backups: 0,
          apiCalls: 0,
          storageUsed: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        limits: {
          accounts: 10,
          backups: 1,
          devices: 1,
        },
        isInGracePeriod: false,
        violations: [],
      };
    }
  }

  /**
   * Check if user can access a specific feature
   */
  static async checkFeatureAccess(
    userId: string, 
    feature: keyof SubscriptionFeatures,
    requestedUsage?: number
  ): Promise<FeatureCheck> {
    try {
      const license = await this.getLicenseInfo(userId);

      // Check if account is suspended or canceled
      if (license.status === 'suspended') {
        return {
          allowed: false,
          reason: 'Account suspended due to payment issues',
          upgradeRequired: false,
        };
      }

      if (license.status === 'canceled') {
        return {
          allowed: false,
          reason: 'Subscription canceled',
          upgradeRequired: true,
          suggestedTier: 'premium',
        };
      }

      // Check if feature is available in current tier
      const featureEnabled = license.features[feature];
      if (typeof featureEnabled === 'boolean' && !featureEnabled) {
        return {
          allowed: false,
          reason: `Feature not available in ${license.tier} tier`,
          upgradeRequired: true,
          suggestedTier: this.getMinimumTierForFeature(feature),
        };
      }

      // Check usage limits for quantified features
      if (feature === 'maxAccounts' && requestedUsage) {
        const currentUsage = license.usage.accounts;
        const limit = license.limits.accounts;
        
        if (limit !== -1 && (currentUsage + requestedUsage) > limit) {
          return {
            allowed: false,
            reason: `Account limit reached (${currentUsage}/${limit})`,
            upgradeRequired: true,
            suggestedTier: 'premium',
            remainingUsage: Math.max(0, limit - currentUsage),
          };
        }
      }

      if (feature === 'maxBackups' && requestedUsage) {
        const currentUsage = license.usage.backups;
        const limit = license.limits.backups;
        
        if (limit !== -1 && (currentUsage + requestedUsage) > limit) {
          return {
            allowed: false,
            reason: `Backup limit reached (${currentUsage}/${limit})`,
            upgradeRequired: true,
            suggestedTier: 'premium',
            remainingUsage: Math.max(0, limit - currentUsage),
          };
        }
      }

      // Check if in grace period
      if (license.isInGracePeriod) {
        return {
          allowed: true,
          reason: `Access granted during grace period until ${license.gracePeriodEnds?.toLocaleDateString()}`,
        };
      }

      return {
        allowed: true,
      };
    } catch (_error) {
      console.error('Error checking feature access:', error);
      return {
        allowed: false,
        reason: 'Unable to verify license',
      };
    }
  }

  /**
   * Enforce feature access with automatic tracking
   */
  static async enforceFeatureAccess(
    userId: string,
    feature: keyof SubscriptionFeatures,
    usageIncrement: number = 1
  ): Promise<FeatureCheck> {
    const check = await this.checkFeatureAccess(userId, feature, usageIncrement);

    if (check.allowed) {
      // Track usage
      await this.trackUsage(userId, feature, usageIncrement);
    } else {
      // Log violation
      await this.logViolation(userId, {
        type: 'usage_exceeded',
        description: `Attempted to use ${feature} but ${check.reason}`,
        severity: 'medium',
        metadata: {
          feature,
          requestedUsage: usageIncrement,
          reason: check.reason,
        },
      });
    }

    return check;
  }

  /**
   * Track feature usage
   */
  static async trackUsage(
    userId: string,
    feature: keyof SubscriptionFeatures,
    increment: number = 1
  ): Promise<void> {
    try {
      const currentPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM
      
      // Get or create usage record for current period
      const usageResult = await FirestoreService.getCollection(
        'usage',
        [
          { field: 'userId', operator: '==', value: userId },
          { field: 'period', operator: '==', value: currentPeriod },
        ]
      );

      let usageRecord: Usage;
      let isNew = false;

      if (usageResult.success && usageResult.data.length > 0) {
        usageRecord = usageResult.data[0] as Usage;
      } else {
        isNew = true;
        usageRecord = {
          userId,
          period: currentPeriod,
          accounts: 0,
          backups: 0,
          apiCalls: 0,
          storageUsed: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }

      // Update usage based on feature
      switch (feature) {
        case 'maxAccounts':
          usageRecord.accounts += increment;
          break;
        case 'maxBackups':
          usageRecord.backups += increment;
          break;
        case 'apiAccess':
          usageRecord.apiCalls += increment;
          break;
        default:
          // For boolean features, just increment API calls as a general metric
          usageRecord.apiCalls += increment;
      }

      usageRecord.updatedAt = new Date();

      // Save usage record
      if (isNew) {
        await FirestoreService.addDocument('usage', usageRecord);
      } else {
        await FirestoreService.updateDocument('usage', usageResult.data[0].id, usageRecord);
      }

      // Update cache
      this.usageCache.set(userId, {
        usage: usageRecord,
        timestamp: Date.now(),
      });
    } catch (_error) {
      console.error('Error tracking usage:', error);
    }
  }

  /**
   * Get current usage for a user
   */
  static async getCurrentUsage(userId: string): Promise<Usage> {
    try {
      // Check cache first
      const cached = this.usageCache.get(userId);
      if (cached && (Date.now() - cached.timestamp) < this.USAGE_CACHE_TTL) {
        return cached.usage;
      }

      const currentPeriod = new Date().toISOString().slice(0, 7);
      
      const usageResult = await FirestoreService.getCollection(
        'usage',
        [
          { field: 'userId', operator: '==', value: userId },
          { field: 'period', operator: '==', value: currentPeriod },
        ]
      );

      let usage: Usage;

      if (usageResult.success && usageResult.data.length > 0) {
        usage = usageResult.data[0] as Usage;
      } else {
        // Create default usage record
        usage = {
          userId,
          period: currentPeriod,
          accounts: 0,
          backups: 0,
          apiCalls: 0,
          storageUsed: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }

      // Update cache
      this.usageCache.set(userId, {
        usage,
        timestamp: Date.now(),
      });

      return usage;
    } catch (_error) {
      console.error('Error getting current usage:', error);
      return {
        userId,
        period: new Date().toISOString().slice(0, 7),
        accounts: 0,
        backups: 0,
        apiCalls: 0,
        storageUsed: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  }

  /**
   * Generate usage report for a period
   */
  static async generateUsageReport(userId: string, period?: string): Promise<UsageReport> {
    try {
      const reportPeriod = period || new Date().toISOString().slice(0, 7);
      
      const usageResult = await FirestoreService.getCollection(
        'usage',
        [
          { field: 'userId', operator: '==', value: userId },
          { field: 'period', operator: '==', value: reportPeriod },
        ]
      );

      const usage: Usage = usageResult.success && usageResult.data.length > 0 
        ? usageResult.data[0] as Usage
        : {
            userId,
            period: reportPeriod,
            accounts: 0,
            backups: 0,
            apiCalls: 0,
            storageUsed: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

      // Get user's license info to calculate overages
      const license = await this.getLicenseInfo(userId);
      
      const overage = {
        accounts: Math.max(0, usage.accounts - (license.limits.accounts === -1 ? 0 : license.limits.accounts)),
        backups: Math.max(0, usage.backups - (license.limits.backups === -1 ? 0 : license.limits.backups)),
        apiCalls: Math.max(0, usage.apiCalls - 10000), // Assume 10k API calls included
        storage: Math.max(0, usage.storageUsed - (1024 * 1024 * 1024)), // 1GB included
      };

      // Calculate overage costs (example rates)
      const cost = 
        (overage.accounts * 0.10) + // $0.10 per extra account
        (overage.backups * 0.05) + // $0.05 per extra backup
        (overage.apiCalls * 0.001) + // $0.001 per extra API call
        (overage.storage / (1024 * 1024) * 0.02); // $0.02 per MB over limit

      return {
        period: reportPeriod,
        accounts: usage.accounts,
        backups: usage.backups,
        apiCalls: usage.apiCalls,
        storageUsed: usage.storageUsed,
        familyMembers: usage.familyMembers,
        businessUsers: usage.businessUsers,
        overage,
        cost,
      };
    } catch (_error) {
      console.error('Error generating usage report:', error);
      throw error;
    }
  }

  /**
   * Check for license violations
   */
  private static async checkViolations(userId: string, usage: Usage, limits: unknown): Promise<string[]> {
    const violations: string[] = [];

    // Check account limit
    if (limits.accounts !== -1 && usage.accounts > limits.accounts) {
      violations.push(`Account limit exceeded: ${usage.accounts}/${limits.accounts}`);
    }

    // Check backup limit
    if (limits.backups !== -1 && usage.backups > limits.backups) {
      violations.push(`Backup limit exceeded: ${usage.backups}/${limits.backups}`);
    }

    // Check for suspicious API usage
    if (usage.apiCalls > 100000) { // Arbitrary high threshold
      violations.push(`Unusually high API usage: ${usage.apiCalls} calls`);
    }

    return violations;
  }

  /**
   * Log a license violation
   */
  private static async logViolation(
    userId: string,
    violation: Omit<LicenseViolation, 'id' | 'userId' | 'detectedAt' | 'actions'>
  ): Promise<void> {
    try {
      const violationRecord: LicenseViolation = {
        id: `violation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        detectedAt: new Date(),
        actions: this.getViolationActions(violation.type, violation.severity),
        ...violation,
      };

      await FirestoreService.addDocument('license_violations', violationRecord);

      // Take immediate actions based on severity
      if (violation.severity === 'critical') {
        // Could trigger account suspension
        console.warn(`Critical license violation for user ${userId}:`, violation);
      }
    } catch (_error) {
      console.error('Error logging violation:', error);
    }
  }

  /**
   * Get recommended actions for a violation
   */
  private static getViolationActions(type: string, severity: string): string[] {
    const actions: string[] = [];

    switch (type) {
      case 'usage_exceeded':
        actions.push('Display upgrade prompt');
        if (severity === 'high' || severity === 'critical') {
          actions.push('Restrict further usage');
        }
        break;
      case 'feature_abuse':
        actions.push('Log incident');
        actions.push('Send warning email');
        if (severity === 'critical') {
          actions.push('Temporary account suspension');
        }
        break;
      case 'suspicious_activity':
        actions.push('Enhanced monitoring');
        actions.push('Require additional verification');
        break;
      case 'payment_failed':
        actions.push('Send payment reminder');
        actions.push('Start grace period');
        if (severity === 'high') {
          actions.push('Restrict premium features');
        }
        break;
    }

    return actions;
  }

  /**
   * Get current subscription for a user
   */
  private static async getCurrentSubscription(userId: string): Promise<UserSubscription | null> {
    try {
      const subscriptionsResult = await FirestoreService.getCollection(
        `users/${userId}/subscriptions`,
        [
          { field: 'status', operator: 'in', value: ['active', 'trialing', 'past_due'] }
        ]
      );

      if (subscriptionsResult.success && subscriptionsResult.data.length > 0) {
        // Return the most recent active subscription
        const subscriptions = subscriptionsResult.data.sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
        );
        return subscriptions[0] as UserSubscription;
      }

      return null;
    } catch (_error) {
      console.error('Error getting current subscription:', error);
      return null;
    }
  }

  /**
   * Get minimum tier required for a feature
   */
  private static getMinimumTierForFeature(feature: keyof SubscriptionFeatures): SubscriptionTier {
    const tiers: SubscriptionTier[] = ['free', 'premium', 'family', 'business'];
    
    for (const tier of tiers) {
      const features = getFeatures(tier);
      if (features[feature]) {
        return tier;
      }
    }
    
    return 'business'; // Default to highest tier
  }

  /**
   * Clear usage cache
   */
  static clearCache(): void {
    this.usageCache.clear();
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.usageCache.size,
      entries: Array.from(this.usageCache.keys()),
    };
  }
}