/**
 * Global type definitions
 * @module types
 */

// User types
export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  phoneNumber?: string;
  createdAt: Date;
  updatedAt: Date;
  subscription: Subscription;
  settings: UserSettings;
  encryptionHint?: string;
  googleDriveConnected?: boolean;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  biometricEnabled: boolean;
  autoLockTimeout: number; // in minutes
  showNotifications: boolean;
  language: string;
  backupEnabled: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  lastBackup?: Date;
}

// Subscription types
export interface Subscription {
  type: 'free' | 'premium' | 'enterprise';
  status: 'active' | 'expired' | 'cancelled';
  startDate?: Date;
  endDate?: Date;
  expiresAt?: Date;
  features?: string[];
  accountLimit?: number;
}

// Device types
export interface Device {
  id: string;
  userId: string;
  name: string;
  type: 'mobile' | 'desktop' | 'extension';
  platform: string;
  lastActive: Date;
  createdAt: Date;
  fingerprint: string;
  trusted: boolean;
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