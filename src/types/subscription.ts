/**
 * Subscription and monetization types
 * @module types/subscription
 */

export type SubscriptionTier = 'free' | 'premium' | 'family' | 'business';

export type PaymentProvider = 'stripe' | 'google_play' | 'app_store';

export type SubscriptionStatus = 
  | 'active' 
  | 'canceled' 
  | 'past_due' 
  | 'unpaid' 
  | 'paused' 
  | 'trialing' 
  | 'incomplete' 
  | 'incomplete_expired';

export interface SubscriptionPlan {
  id: string;
  tier: SubscriptionTier;
  name: string;
  description: string;
  features: string[];
  limitations: Record<string, number>;
  pricing: {
    monthly: number;
    yearly: number;
    currency: string;
  };
  stripePriceIds: {
    monthly: string;
    yearly: string;
  };
  googlePlayProductIds: {
    monthly: string;
    yearly: string;
  };
  appStoreProductIds: {
    monthly: string;
    yearly: string;
  };
  isPopular?: boolean;
  isEnterprise?: boolean;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  provider: PaymentProvider;
  providerSubscriptionId: string;
  providerCustomerId?: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  trialStart?: Date;
  trialEnd?: Date;
  metadata?: Record<string, unknown>;
}

export interface PaymentMethod {
  id: string;
  userId: string;
  provider: PaymentProvider;
  providerPaymentMethodId: string;
  type: 'card' | 'paypal' | 'google_pay' | 'apple_pay';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Invoice {
  id: string;
  userId: string;
  subscriptionId: string;
  provider: PaymentProvider;
  providerInvoiceId: string;
  amount: number;
  currency: string;
  status: 'paid' | 'open' | 'void' | 'draft' | 'uncollectible';
  periodStart: Date;
  periodEnd: Date;
  dueDate?: Date;
  paidAt?: Date;
  hostedInvoiceUrl?: string;
  invoicePdf?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Usage {
  userId: string;
  period: string; // YYYY-MM format
  accounts: number;
  backups: number;
  apiCalls: number;
  storageUsed: number; // in bytes
  familyMembers?: number;
  businessUsers?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeatureFlag {
  name: string;
  enabled: boolean;
  tierRestrictions?: SubscriptionTier[];
  usageLimit?: number;
  description?: string;
}

export interface SubscriptionFeatures {
  maxAccounts: number;
  maxBackups: number;
  autoBackup: boolean;
  familySharing: boolean;
  businessFeatures: boolean;
  prioritySupport: boolean;
  customBranding: boolean;
  apiAccess: boolean;
  advancedSecurity: boolean;
  exportFeatures: boolean;
  cloudSync: boolean;
  offlineAccess: boolean;
  biometricAuth: boolean;
  multiDevice: boolean;
  customCategories: boolean;
  bulkOperations: boolean;
  auditLogs: boolean;
  ssoIntegration: boolean;
  complianceReports: boolean;
  dedicatedSupport: boolean;
}

export interface BillingAddress {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

export interface Customer {
  id: string;
  userId: string;
  provider: PaymentProvider;
  providerCustomerId: string;
  email: string;
  name?: string;
  phone?: string;
  billingAddress?: BillingAddress;
  taxId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionAnalytics {
  totalRevenue: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  activeSubscriptions: number;
  churnRate: number;
  averageRevenuePerUser: number;
  conversionRate: number;
  trialConversionRate: number;
  customerLifetimeValue: number;
  subscriptionsByTier: Record<SubscriptionTier, number>;
  revenueByTier: Record<SubscriptionTier, number>;
  period: {
    start: Date;
    end: Date;
  };
}