declare module 'unified-tracking' {
  export interface TrackingConfig {
    apiKey?: string;
    environment?: string;
  }

  export interface TrackingEvent {
    name: string;
    properties?: Record<string, any>;
  }

  export class UnifiedTracking {
    constructor(config?: TrackingConfig);
    track(event: string, properties?: Record<string, any>): void;
    identify(userId: string, traits?: Record<string, any>): void;
  }

  export default UnifiedTracking;
}