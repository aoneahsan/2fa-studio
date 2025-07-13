/**
 * Subscription plans configuration
 * @module config/subscription-plans
 */

import { SubscriptionPlan, SubscriptionFeatures } from '@src/types/subscription';

export const SUBSCRIPTION_FEATURES: Record<string, SubscriptionFeatures> = {
  free: {
    maxAccounts: 10,
    maxBackups: 1,
    autoBackup: false,
    familySharing: false,
    businessFeatures: false,
    prioritySupport: false,
    customBranding: false,
    apiAccess: false,
    advancedSecurity: false,
    exportFeatures: true,
    cloudSync: true,
    offlineAccess: true,
    biometricAuth: true,
    multiDevice: false,
    customCategories: false,
    bulkOperations: false,
    auditLogs: false,
    ssoIntegration: false,
    complianceReports: false,
    dedicatedSupport: false,
  },
  premium: {
    maxAccounts: -1, // Unlimited
    maxBackups: -1, // Unlimited
    autoBackup: true,
    familySharing: false,
    businessFeatures: false,
    prioritySupport: true,
    customBranding: false,
    apiAccess: false,
    advancedSecurity: true,
    exportFeatures: true,
    cloudSync: true,
    offlineAccess: true,
    biometricAuth: true,
    multiDevice: true,
    customCategories: true,
    bulkOperations: true,
    auditLogs: false,
    ssoIntegration: false,
    complianceReports: false,
    dedicatedSupport: false,
  },
  family: {
    maxAccounts: -1, // Unlimited
    maxBackups: -1, // Unlimited
    autoBackup: true,
    familySharing: true,
    businessFeatures: false,
    prioritySupport: true,
    customBranding: false,
    apiAccess: false,
    advancedSecurity: true,
    exportFeatures: true,
    cloudSync: true,
    offlineAccess: true,
    biometricAuth: true,
    multiDevice: true,
    customCategories: true,
    bulkOperations: true,
    auditLogs: false,
    ssoIntegration: false,
    complianceReports: false,
    dedicatedSupport: false,
  },
  business: {
    maxAccounts: -1, // Unlimited
    maxBackups: -1, // Unlimited
    autoBackup: true,
    familySharing: true,
    businessFeatures: true,
    prioritySupport: true,
    customBranding: true,
    apiAccess: true,
    advancedSecurity: true,
    exportFeatures: true,
    cloudSync: true,
    offlineAccess: true,
    biometricAuth: true,
    multiDevice: true,
    customCategories: true,
    bulkOperations: true,
    auditLogs: true,
    ssoIntegration: true,
    complianceReports: true,
    dedicatedSupport: true,
  },
};

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    tier: 'free',
    name: 'Free',
    description: 'Perfect for personal use with essential 2FA features',
    features: [
      'Up to 10 accounts',
      'Manual backup',
      'Basic support',
      'Cloud sync',
      'Biometric authentication',
      'Offline access'
    ],
    limitations: {
      accounts: 10,
      backups: 1,
      devices: 1
    },
    pricing: {
      monthly: 0,
      yearly: 0,
      currency: 'USD'
    },
    stripePriceIds: {
      monthly: '',
      yearly: ''
    },
    googlePlayProductIds: {
      monthly: '',
      yearly: ''
    },
    appStoreProductIds: {
      monthly: '',
      yearly: ''
    }
  },
  {
    id: 'premium',
    tier: 'premium',
    name: 'Premium',
    description: 'Advanced features for power users',
    features: [
      'Unlimited accounts',
      'Automatic backup',
      'Priority support',
      'Advanced security',
      'Multi-device sync',
      'Custom categories',
      'Bulk operations',
      'Export features'
    ],
    limitations: {
      accounts: -1,
      backups: -1,
      devices: -1
    },
    pricing: {
      monthly: 2.99,
      yearly: 29.99,
      currency: 'USD'
    },
    stripePriceIds: {
      monthly: 'price_premium_monthly',
      yearly: 'price_premium_yearly'
    },
    googlePlayProductIds: {
      monthly: 'premium_monthly',
      yearly: 'premium_yearly'
    },
    appStoreProductIds: {
      monthly: 'premium_monthly',
      yearly: 'premium_yearly'
    },
    isPopular: true
  },
  {
    id: 'family',
    tier: 'family',
    name: 'Family',
    description: 'Share with up to 5 family members',
    features: [
      'Everything in Premium',
      'Family sharing (5 users)',
      'Shared vault',
      'Family management',
      'Individual privacy controls',
      'Usage analytics'
    ],
    limitations: {
      accounts: -1,
      backups: -1,
      devices: -1,
      familyMembers: 5
    },
    pricing: {
      monthly: 4.99,
      yearly: 49.99,
      currency: 'USD'
    },
    stripePriceIds: {
      monthly: 'price_family_monthly',
      yearly: 'price_family_yearly'
    },
    googlePlayProductIds: {
      monthly: 'family_monthly',
      yearly: 'family_yearly'
    },
    appStoreProductIds: {
      monthly: 'family_monthly',
      yearly: 'family_yearly'
    }
  },
  {
    id: 'business',
    tier: 'business',
    name: 'Business',
    description: 'Enterprise-grade features for teams',
    features: [
      'Everything in Family',
      'Centralized management',
      'SSO integration',
      'Compliance features',
      'API access',
      'Audit logs',
      'Custom branding',
      'Dedicated support',
      'SLA guarantee'
    ],
    limitations: {
      accounts: -1,
      backups: -1,
      devices: -1,
      businessUsers: -1
    },
    pricing: {
      monthly: 9.99,
      yearly: 99.99,
      currency: 'USD'
    },
    stripePriceIds: {
      monthly: 'price_business_monthly',
      yearly: 'price_business_yearly'
    },
    googlePlayProductIds: {
      monthly: 'business_monthly',
      yearly: 'business_yearly'
    },
    appStoreProductIds: {
      monthly: 'business_monthly',
      yearly: 'business_yearly'
    },
    isEnterprise: true
  }
];

export const getFeatures = (tier: string): SubscriptionFeatures => {
  return SUBSCRIPTION_FEATURES[tier] || SUBSCRIPTION_FEATURES.free;
};

export const getPlan = (planId: string): SubscriptionPlan | undefined => {
  return SUBSCRIPTION_PLANS.find(plan => plan.id === planId);
};

export const getPlanByTier = (tier: string): SubscriptionPlan | undefined => {
  return SUBSCRIPTION_PLANS.find(plan => plan.tier === tier);
};

export const canUseFeature = (userTier: string, feature: keyof SubscriptionFeatures): boolean => {
  const features = getFeatures(userTier);
  return features[feature] as boolean;
};

export const getUsageLimit = (userTier: string, type: 'accounts' | 'backups' | 'devices'): number => {
  const plan = getPlanByTier(userTier);
  if (!plan) return 0;
  
  const limit = plan.limitations[type];
  return limit === -1 ? Infinity : limit;
};

export const isUsageLimitReached = (
  userTier: string, 
  type: 'accounts' | 'backups' | 'devices', 
  currentUsage: number
): boolean => {
  const limit = getUsageLimit(userTier, type);
  return currentUsage >= limit;
};