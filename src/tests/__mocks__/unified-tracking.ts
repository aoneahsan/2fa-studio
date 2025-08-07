/**
 * Mock for unified-tracking package
 */

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