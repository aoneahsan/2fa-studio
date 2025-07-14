/**
 * Universal receipt validation service for all payment platforms
 * @module services/receipt-validation
 */

import { 
  UserSubscription, 
  PaymentProvider,
  SubscriptionStatus,
  SubscriptionTier 
} from '@src/types/subscription';
import { FirestoreService } from './firestore.service';
import { StripeService } from './stripe.service';
import { GooglePlayBillingService } from './google-play-billing.service';
import { ApplePayService } from './apple-pay.service';

export interface ValidationRequest {
  provider: PaymentProvider;
  userId: string;
  receiptData: string;
  productId?: string;
  additionalData?: Record<string, unknown>;
}

export interface ValidationResult {
  valid: boolean;
  subscription?: UserSubscription;
  fraudRisk: 'low' | 'medium' | 'high';
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface FraudDetectionResult {
  score: number; // 0-100, higher means more suspicious
  factors: string[];
  recommendation: 'approve' | 'review' | 'reject';
  details: Record<string, unknown>;
}

export interface ValidationCache {
  receiptHash: string;
  result: ValidationResult;
  timestamp: Date;
  ttl: number; // Time to live in seconds
}

export class ReceiptValidationService {
  private static cache: Map<string, ValidationCache> = new Map();
  private static readonly CACHE_TTL = 300; // 5 minutes
  private static readonly FRAUD_THRESHOLD_HIGH = 70;
  private static readonly FRAUD_THRESHOLD_MEDIUM = 40;

  /**
   * Validate receipt from any payment provider
   */
  static async validateReceipt(request: ValidationRequest): Promise<ValidationResult> {
    try {
      // Check cache first
      const cached = this.getCachedValidation(request.receiptData);
      if (cached) {
        return cached.result;
      }

      let result: ValidationResult;

      switch (request.provider) {
        case 'stripe':
          result = await this.validateStripeReceipt(request);
          break;
        case 'google_play':
          result = await this.validateGooglePlayReceipt(request);
          break;
        case 'app_store':
          result = await this.validateAppStoreReceipt(request);
          break;
        default:
          return {
            valid: false,
            fraudRisk: 'high',
            error: `Unsupported payment provider: ${request.provider}`,
          };
      }

      // Perform fraud detection
      if (result.valid) {
        const fraudResult = await this.performFraudDetection(request, result);
        result.fraudRisk = fraudResult.recommendation === 'approve' ? 'low' :
                          fraudResult.recommendation === 'review' ? 'medium' : 'high';
        result.metadata = {
          ...result.metadata,
          fraudScore: fraudResult.score,
          fraudFactors: fraudResult.factors,
        };
      }

      // Cache the result
      this.cacheValidation(request.receiptData, result);

      // Store validation record
      await this.storeValidationRecord(request, result);

      return result;
    } catch (error) {
      console.error('Error validating receipt:', error);
      return {
        valid: false,
        fraudRisk: 'high',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Validate Stripe receipt/payment intent
   */
  private static async validateStripeReceipt(request: ValidationRequest): Promise<ValidationResult> {
    try {
      // For Stripe, receiptData would be a payment intent ID or subscription ID
      const response = await fetch('/api/stripe/validate-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentIntentId: request.receiptData,
          userId: request.userId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          valid: false,
          fraudRisk: 'high',
          error: data.error || 'Stripe validation failed',
        };
      }

      return {
        valid: true,
        subscription: data.subscription,
        fraudRisk: 'low',
        metadata: {
          provider: 'stripe',
          paymentIntentId: request.receiptData,
          stripeCustomerId: data.customerId,
        },
      };
    } catch (error) {
      return {
        valid: false,
        fraudRisk: 'high',
        error: error instanceof Error ? error.message : 'Stripe validation error',
      };
    }
  }

  /**
   * Validate Google Play receipt
   */
  private static async validateGooglePlayReceipt(request: ValidationRequest): Promise<ValidationResult> {
    try {
      if (!request.productId) {
        return {
          valid: false,
          fraudRisk: 'high',
          error: 'Product ID required for Google Play validation',
        };
      }

      const validation = await GooglePlayBillingService.validateReceipt(
        'com.fa2s.app', // Package name
        request.productId,
        request.receiptData // Purchase token
      );

      if (!validation.valid) {
        return {
          valid: false,
          fraudRisk: 'high',
          error: validation.error || 'Google Play validation failed',
        };
      }

      // Convert to UserSubscription format
      const subscription: UserSubscription = {
        id: `gp_${validation.subscription?.orderId}`,
        userId: request.userId,
        planId: request.productId,
        tier: this.getTierFromProductId(request.productId),
        status: this.mapGooglePlayStatus(validation.subscription?.purchaseState || 0),
        provider: 'google_play',
        providerSubscriptionId: request.receiptData,
        currentPeriodStart: new Date(validation.subscription?.startTimeMillis || Date.now()),
        currentPeriodEnd: new Date(validation.subscription?.expiryTimeMillis || Date.now()),
        cancelAtPeriodEnd: !validation.subscription?.autoRenewing,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          orderId: validation.subscription?.orderId,
          packageName: validation.subscription?.packageName,
          countryCode: validation.subscription?.countryCode,
        },
      };

      return {
        valid: true,
        subscription,
        fraudRisk: validation.fraudRisk || 'low',
        metadata: {
          provider: 'google_play',
          purchaseToken: request.receiptData,
          productId: request.productId,
        },
      };
    } catch (error) {
      return {
        valid: false,
        fraudRisk: 'high',
        error: error instanceof Error ? error.message : 'Google Play validation error',
      };
    }
  }

  /**
   * Validate App Store receipt
   */
  private static async validateAppStoreReceipt(request: ValidationRequest): Promise<ValidationResult> {
    try {
      const validation = await ApplePayService.validateReceipt(
        request.receiptData,
        request.additionalData?.sharedSecret as string
      );

      if (!validation.valid) {
        return {
          valid: false,
          fraudRisk: 'high',
          error: validation.error || 'App Store validation failed',
        };
      }

      if (!validation.purchase) {
        return {
          valid: false,
          fraudRisk: 'high',
          error: 'No purchase data in receipt',
        };
      }

      // Convert to UserSubscription format
      const subscription: UserSubscription = {
        id: `ap_${validation.purchase.transactionIdentifier}`,
        userId: request.userId,
        planId: (validation as any).purchase.productIdentifier,
        tier: this.getTierFromProductId((validation as any).purchase.productIdentifier),
        status: this.mapAppStoreStatus(validation.purchase),
        provider: 'app_store',
        providerSubscriptionId: (validation as any).purchase.transactionIdentifier,
        currentPeriodStart: new Date((validation as any).purchase.transactionDate),
        currentPeriodEnd: new Date(validation.purchase.subscriptionExpirationDate || Date.now()),
        cancelAtPeriodEnd: !(validation as any).purchase.subscriptionAutoRenewStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
        trialStart: validation.purchase.isTrialPeriod ? new Date((validation as any).purchase.transactionDate) : undefined,
        trialEnd: validation.purchase.isTrialPeriod ? 
          new Date(validation.purchase.transactionDate + (7 * 24 * 60 * 60 * 1000)) : undefined,
        metadata: {
          transactionIdentifier: (validation as any).purchase.transactionIdentifier,
          originalTransactionIdentifier: (validation as any).purchase.originalTransactionIdentifier,
          environment: validation.environment,
          isTrialPeriod: (validation as any).purchase.isTrialPeriod,
        },
      };

      return {
        valid: true,
        subscription,
        fraudRisk: validation.fraudRisk || 'low',
        metadata: {
          provider: 'app_store',
          transactionId: (validation as any).purchase.transactionIdentifier,
          environment: validation.environment,
        },
      };
    } catch (error) {
      return {
        valid: false,
        fraudRisk: 'high',
        error: error instanceof Error ? error.message : 'App Store validation error',
      };
    }
  }

  /**
   * Perform fraud detection analysis
   */
  private static async performFraudDetection(
    request: ValidationRequest,
    validationResult: ValidationResult
  ): Promise<FraudDetectionResult> {
    let score = 0;
    const factors: string[] = [];
    const details: Record<string, unknown> = {};

    try {
      // Check for rapid successive purchases
      const recentValidations = await this.getRecentValidations(request.userId, 3600); // Last hour
      if (recentValidations.length > 5) {
        score += 30;
        factors.push('excessive_validation_frequency');
        details.recentValidations = recentValidations.length;
      }

      // Check for multiple different payment methods
      const userSubscriptions = await FirestoreService.getCollection(
        `users/${request.userId}/subscriptions`,
        [
          { field: 'createdAt', operator: '>', value: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        ]
      );

      if (userSubscriptions.success) {
        const providers = new Set(((userSubscriptions.data) || []).map((sub: any) => sub.provider));
        if (providers.size > 2) {
          score += 20;
          factors.push('multiple_payment_providers');
          details.providerCount = providers.size;
        }
      }

      // Check for mismatched user location (if available)
      const subscription = validationResult.subscription;
      if (subscription?.metadata?.countryCode) {
        // This would be compared with user's registered country
        // For now, we'll skip this check
      }

      // Check for trial abuse patterns
      if (subscription?.trialStart) {
        const userTrials = await FirestoreService.getCollection(
          `users/${request.userId}/subscriptions`,
          [
            { field: 'trialStart', operator: '!=', value: null }
          ]
        );

        if (userTrials.success && userTrials.data.length > 3) {
          score += 40;
          factors.push('excessive_trial_usage');
          details.trialCount = (userTrials as any).data.length;
        }
      }

      // Check for high-value transactions from new users
      if (subscription) {
        const userProfile = await FirestoreService.getDocument('users', request.userId);
        if (userProfile.success && userProfile.data) {
          const accountAge = Date.now() - userProfile.data.createdAt.getTime();
          const isDailyUser = accountAge < 24 * 60 * 60 * 1000; // Less than 1 day old
          
          if (isDailyUser && subscription.tier === 'business') {
            score += 25;
            factors.push('new_user_high_value_purchase');
            details.accountAgeHours = accountAge / (60 * 60 * 1000);
          }
        }
      }

      // Check for refund history
      const refundHistory = await this.getRefundHistory(request.userId);
      if (refundHistory.length > 2) {
        score += 35;
        factors.push('excessive_refund_history');
        details.refundCount = refundHistory.length;
      }

      // Determine recommendation based on score
      let recommendation: 'approve' | 'review' | 'reject';
      if (score >= this.FRAUD_THRESHOLD_HIGH) {
        recommendation = 'reject';
      } else if (score >= this.FRAUD_THRESHOLD_MEDIUM) {
        recommendation = 'review';
      } else {
        recommendation = 'approve';
      }

      return {
        score,
        factors,
        recommendation,
        details,
      };
    } catch (error) {
      console.error('Error in fraud detection:', error);
      return {
        score: 50, // Medium risk if we can't analyze
        factors: ['fraud_detection_error'],
        recommendation: 'review',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  }

  /**
   * Get recent validations for a user
   */
  private static async getRecentValidations(userId: string, timeWindowSeconds: number): Promise<any[]> {
    const cutoff = new Date(Date.now() - (timeWindowSeconds * 1000));
    
    const result = await FirestoreService.getCollection(
      'validation_records',
      [
        { field: 'userId', operator: '==', value: userId },
        { field: 'timestamp', operator: '>', value: cutoff }
      ]
    );

    return result.success ? result.data : [];
  }

  /**
   * Get refund history for a user
   */
  private static async getRefundHistory(userId: string): Promise<any[]> {
    const result = await FirestoreService.getCollection(
      `users/${userId}/subscriptions`,
      [
        { field: 'metadata.refunded', operator: '==', value: true }
      ]
    );

    return result.success ? result.data : [];
  }

  /**
   * Store validation record for audit and fraud detection
   */
  private static async storeValidationRecord(
    request: ValidationRequest,
    result: ValidationResult
  ): Promise<void> {
    try {
      await FirestoreService.addDocument('validation_records', {
        userId: request.userId,
        provider: request.provider,
        productId: request.productId,
        valid: result.valid,
        fraudRisk: result.fraudRisk,
        fraudScore: result.metadata?.fraudScore || 0,
        fraudFactors: result.metadata?.fraudFactors || [],
        timestamp: new Date(),
        metadata: {
          receiptHash: this.hashReceipt(request.receiptData),
          ...result.metadata,
        },
      });
    } catch (error) {
      console.error('Error storing validation record:', error);
    }
  }

  /**
   * Cache validation result
   */
  private static cacheValidation(receiptData: string, result: ValidationResult): void {
    const hash = this.hashReceipt(receiptData);
    this.cache.set(hash, {
      receiptHash: hash,
      result,
      timestamp: new Date(),
      ttl: this.CACHE_TTL,
    });

    // Clean up expired cache entries
    this.cleanupCache();
  }

  /**
   * Get cached validation result
   */
  private static getCachedValidation(receiptData: string): ValidationCache | null {
    const hash = this.hashReceipt(receiptData);
    const cached = this.cache.get(hash);

    if (!cached) return null;

    // Check if cache is expired
    const age = (Date.now() - cached.timestamp.getTime()) / 1000;
    if (age > cached.ttl) {
      this.cache.delete(hash);
      return null;
    }

    return cached;
  }

  /**
   * Hash receipt data for caching
   */
  private static hashReceipt(receiptData: string): string {
    // Simple hash function - in production, use a proper crypto hash
    let hash = 0;
    for (let i = 0; i < receiptData.length; i++) {
      const char = receiptData.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Clean up expired cache entries
   */
  private static cleanupCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      const age = (now - cached.timestamp.getTime()) / 1000;
      if (age > cached.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Map Google Play purchase state to subscription status
   */
  private static mapGooglePlayStatus(purchaseState: number): SubscriptionStatus {
    switch (purchaseState) {
      case 0: return 'active'; // Purchased
      case 1: return 'canceled'; // Canceled
      case 2: return 'past_due'; // Pending
      default: return 'incomplete';
    }
  }

  /**
   * Map App Store purchase to subscription status
   */
  private static mapAppStoreStatus(purchase: unknown): SubscriptionStatus {
    if (purchase.cancellationDate) {
      return 'canceled';
    }
    if (purchase.subscriptionExpirationDate && purchase.subscriptionExpirationDate < Date.now()) {
      return 'canceled';
    }
    if (purchase.subscriptionInGracePeriod) {
      return 'past_due';
    }
    return 'active';
  }

  /**
   * Get subscription tier from product ID
   */
  private static getTierFromProductId(productId: string): SubscriptionTier {
    if (productId.includes('premium')) return 'premium';
    if (productId.includes('family')) return 'family';
    if (productId.includes('business')) return 'business';
    return 'free';
  }

  /**
   * Clear validation cache
   */
  static clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): { size: number; hitRate: number } {
    return {
      size: (this as any).cache.size,
      hitRate: 0, // Would need to track hits/misses for accurate calculation
    };
  }
}