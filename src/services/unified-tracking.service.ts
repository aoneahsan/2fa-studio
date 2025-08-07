/**
 * Unified Tracking Service using unified-tracking v3.0.0
 * @module services/unified-tracking
 */

import { UnifiedTracking, TrackingConfig, EventProperties } from 'unified-tracking';
import { Capacitor } from '@capacitor/core';
import { StorageService } from './storage.service';

export class UnifiedTrackingService {
  private static tracker: UnifiedTracking;
  private static isInitialized = false;

  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const config: TrackingConfig = {
      appName: '2FA Studio',
      appVersion: process.env.REACT_APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'production',
      platform: Capacitor.getPlatform(),
      
      // Enable providers
      providers: {
        firebase: true,
        console: process.env.NODE_ENV === 'development',
        custom: true
      },
      
      // User identification
      getUserId: async () => {
        return await StorageService.get<string>('userId') || undefined;
      },
      
      // Session management
      sessionTimeout: 30 * 60 * 1000, // 30 minutes
      
      // Privacy settings
      respectDoNotTrack: true,
      anonymizeIp: true,
      
      // Custom provider for Firestore
      customProvider: {
        name: 'firestore',
        track: async (event, properties) => {
          // Store in Firestore
          const { FirestoreService } = await import('./firestore.service');
          await FirestoreService.createDocument('analytics_events', {
            event,
            properties,
            timestamp: new Date(),
            sessionId: properties.sessionId,
            userId: properties.userId
          });
        }
      }
    };

    this.tracker = new UnifiedTracking(config);
    await this.tracker.init();
    this.isInitialized = true;
  }

  // Account events
  static async trackAccountView(accountId: string, issuer: string): Promise<void> {
    await this.track('account_viewed', { accountId, issuer });
  }

  static async trackAccountCopy(accountId: string, issuer: string): Promise<void> {
    await this.track('account_copied', { accountId, issuer });
  }

  static async trackAccountGenerate(accountId: string, issuer: string): Promise<void> {
    await this.track('account_generated', { accountId, issuer });
  }

  // Feature events
  static async trackFeatureUsed(feature: string, metadata?: any): Promise<void> {
    await this.track('feature_used', { feature, ...metadata });
  }

  // Generic track method
  private static async track(event: string, properties?: EventProperties): Promise<void> {
    if (!this.isInitialized) await this.initialize();
    await this.tracker.track(event, properties);
  }

  static async identify(userId: string, traits?: any): Promise<void> {
    if (!this.isInitialized) await this.initialize();
    await this.tracker.identify(userId, traits);
  }

  static async page(name: string, properties?: any): Promise<void> {
    if (!this.isInitialized) await this.initialize();
    await this.tracker.page(name, properties);
  }
}