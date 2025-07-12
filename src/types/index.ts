/**
 * Global type definitions
 * @module types
 */

export * from './account';

// User types
export interface User {
  id: string;
  uid?: string; // For backward compatibility
  email: string;
  displayName: string;
  photoURL: string;
  phoneNumber?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  subscription: Subscription;
  settings: UserSettings;
  encryptionHint?: string;
  googleDriveConnected?: boolean;
  lastBackup: Date | null;
  backupEnabled: boolean;
  deviceCount: number;
  accountCount?: number;
  storageUsed?: number;
  role?: UserRole;
  disabled?: boolean;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  autoLock: boolean;
  autoLockTimeout: number; // in seconds
  biometricAuth: boolean;
  biometricEnabled?: boolean; // For backward compatibility
  showAccountIcons: boolean;
  copyOnTap: boolean;
  sortOrder: 'manual' | 'alphabetical' | 'issuer';
  groupByIssuer: boolean;
  hideTokens: boolean;
  fontSize: 'small' | 'medium' | 'large';
  showNotifications?: boolean; // For backward compatibility
  backupEnabled?: boolean; // For backward compatibility
  backupFrequency?: 'daily' | 'weekly' | 'monthly'; // For backward compatibility
  lastBackup?: Date; // For backward compatibility
}

// Subscription types
export type SubscriptionTier = 'free' | 'premium' | 'enterprise' | 'family';
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'past_due' | 'trialing';

export interface Subscription {
  tier: SubscriptionTier;
  type?: 'free' | 'premium' | 'enterprise'; // For backward compatibility
  status: SubscriptionStatus;
  startDate: Date;
  endDate: Date | null;
  expiresAt?: Date; // For backward compatibility
  accountLimit: number | null; // null means unlimited
  features: {
    cloudBackup: boolean;
    browserExtension: boolean;
    prioritySupport: boolean;
    advancedSecurity: boolean;
    noAds: boolean;
    familySharing?: boolean;
  };
  // Stripe data
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
}

// Device types
export interface Device {
  id: string;
  name: string;
  platform: string;
  type?: 'mobile' | 'desktop' | 'extension'; // For backward compatibility
  lastSeen: Date;
  lastActive?: Date; // For backward compatibility
  trusted: boolean;
  userId?: string; // For backward compatibility
  createdAt?: Date; // For backward compatibility
  fingerprint?: string; // For backward compatibility
}

// Session types
export interface Session {
  id: string;
  userId: string;
  deviceId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

// Backup types
export interface Backup {
  id: string;
  userId: string;
  encryptedData: string;
  version: string;
  createdAt: Date;
  size: number;
  provider: 'google_drive' | 'local';
  checksum: string;
}

// Feature flags
export interface FeatureFlag {
  id: string;
  name: string;
  enabled: boolean;
  description: string;
  targetPlans: ('free' | 'premium' | 'family')[];
  rolloutPercentage: number;
}

// Admin types
export interface AdminUser extends User {
  role: 'admin' | 'super_admin';
  permissions: string[];
}

// Audit log types
export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  timestamp: Date;
  details?: Record<string, any>;
  ipAddress?: string;
  deviceId?: string;
}

// Import/Export types
export interface ExportData {
  version: string;
  exportDate: Date;
  accounts: any[]; // Encrypted account data
  settings: UserSettings;
  checksum: string;
}

// Error types
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

// Navigation types
export interface Route {
  path: string;
  title: string;
  icon?: string;
  requiresAuth: boolean;
  requiredPlan?: ('free' | 'premium' | 'family')[];
}

// Admin types
export type UserRole = 'user' | 'admin' | 'super_admin';

export interface AdminUser extends User {
  role: UserRole;
  permissions?: string[];
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalAccounts: number;
  subscriptions: {
    free: number;
    premium: number;
    family: number;
  };
  revenue: {
    daily: number;
    monthly: number;
    yearly: number;
  };
  churnRate: number;
  conversionRate: number;
}

export interface AdminAction {
  id: string;
  adminId: string;
  action: string;
  targetUserId?: string;
  metadata: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
}