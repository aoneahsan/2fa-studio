/**
 * Mock for unified-tracking package
 */
import { vi } from 'vitest';

export interface TrackingConfig {
  appName: string;
  appVersion: string;
  environment: string;
  platform: string;
  providers?: any;
  getUserId?: () => Promise<string | undefined>;
  sessionTimeout?: number;
  respectDoNotTrack?: boolean;
  anonymizeIp?: boolean;
  customProvider?: any;
}

export interface EventProperties {
  [key: string]: any;
}

export class UnifiedTracking {
  constructor(private config: TrackingConfig) {}

  async init(): Promise<void> {
    // Mock implementation
  }

  async track(event: string, properties?: EventProperties): Promise<void> {
    console.log('Mock tracking:', event, properties);
  }

  async identify(userId: string, traits?: any): Promise<void> {
    console.log('Mock identify:', userId, traits);
  }

  async page(name: string, properties?: any): Promise<void> {
    console.log('Mock page:', name, properties);
  }
}

export class UnifiedTracker {
  constructor(config: any) {}
  
  async initialize(): Promise<void> {}
  async trackEvent(name: string, properties?: any): Promise<void> {}
  async trackPageView(page: string, properties?: any): Promise<void> {}
  async setUserProperty(name: string, value: any): Promise<void> {}
  async setUserId(userId: string): Promise<void> {}
  async clearUserId(): Promise<void> {}
  async trackPurchase(purchaseData: any): Promise<void> {}
  async trackError(error: Error, properties?: any): Promise<void> {}
  async flush(): Promise<void> {}
  async getSessionId(): Promise<string> {
    return 'mock-session-id';
  }
}

export const EventType = {
  SCREEN_VIEW: 'screen_view',
  USER_ACTION: 'user_action',
  SYSTEM_EVENT: 'system_event',
  ERROR: 'error',
  PERFORMANCE: 'performance',
};

export type TrackerConfig = any;
export type TrackingEvent = any;