/**
 * Feature flags management service
 * @module services/feature-flags
 */

import { FeatureFlag, SubscriptionTier } from '@src/types/subscription';
import { FirestoreService } from './firestore.service';

export interface FeatureFlagRule {
  name: string;
  enabled: boolean;
  tierRestrictions?: SubscriptionTier[];
  userSegments?: string[];
  rolloutPercentage?: number;
  conditions?: Record<string, unknown>;
  description?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class FeatureFlagsService {
  private static cache: Map<string, FeatureFlagRule> = new Map();
  private static lastCacheUpdate = 0;
  private static readonly CACHE_TTL = 60000; // 1 minute

  static async getFeatureFlag(flagName: string): Promise<FeatureFlagRule | null> {
    await this.refreshCacheIfNeeded();
    return this.cache.get(flagName) || null;
  }

  static async isFeatureEnabled(
    flagName: string,
    userId?: string,
    userTier?: SubscriptionTier
  ): Promise<boolean> {
    const flag = await this.getFeatureFlag(flagName);
    
    if (!flag || !flag.enabled) {
      return false;
    }

    // Check tier restrictions
    if (flag.tierRestrictions && userTier) {
      if (!flag.tierRestrictions.includes(userTier)) {
        return false;
      }
    }

    // Check rollout percentage
    if (flag.rolloutPercentage !== undefined && flag.rolloutPercentage < 100) {
      const userHash = userId ? this.hashUserId(userId) : Math.random();
      return (userHash * 100) < flag.rolloutPercentage;
    }

    return true;
  }

  static async createFeatureFlag(flag: Omit<FeatureFlagRule, 'createdAt' | 'updatedAt'>): Promise<void> {
    const newFlag = {
      ...flag,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await FirestoreService.addDocument('feature_flags', newFlag);
    this.cache.set(flag.name, newFlag);
  }

  static async updateFeatureFlag(flagName: string, updates: Partial<FeatureFlagRule>): Promise<void> {
    const existing = await this.getFeatureFlag(flagName);
    if (!existing) {
      throw new Error('Feature flag not found');
    }

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };

    await FirestoreService.updateDocument('feature_flags', flagName, updated);
    this.cache.set(flagName, updated);
  }

  static async getAllFeatureFlags(): Promise<FeatureFlagRule[]> {
    const result = await FirestoreService.getCollection('feature_flags');
    return result.success ? result.data as FeatureFlagRule[] : [];
  }

  private static async refreshCacheIfNeeded(): Promise<void> {
    const now = Date.now();
    if (now - this.lastCacheUpdate > this.CACHE_TTL) {
      const flags = await this.getAllFeatureFlags();
      this.cache.clear();
      
      flags.forEach(flag => {
        this.cache.set(flag.name, flag);
      });
      
      this.lastCacheUpdate = now;
    }
  }

  private static hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash) / 2147483647; // Normalize to 0-1
  }
}