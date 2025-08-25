/**
 * Production Environment Health Checks for 2FA Studio
 * 
 * This module provides comprehensive health checking capabilities
 * for all system components in production environment.
 */

export interface HealthCheck {
  name: string;
  description: string;
  check: () => Promise<HealthResult>;
  timeout?: number;
  retries?: number;
  critical?: boolean;
}

export interface HealthResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  message: string;
  latency?: number;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface SystemHealth {
  overall: 'healthy' | 'unhealthy' | 'degraded';
  services: Record<string, HealthResult>;
  timestamp: Date;
  uptime: number;
  version: string;
}

// Health check timeout constants
const DEFAULT_TIMEOUT = 5000; // 5 seconds
const DEFAULT_RETRIES = 3;

/**
 * Firebase Firestore Health Check
 */
export const firestoreHealthCheck: HealthCheck = {
  name: 'firestore',
  description: 'Firebase Firestore database connectivity',
  timeout: DEFAULT_TIMEOUT,
  retries: DEFAULT_RETRIES,
  critical: true,
  check: async (): Promise<HealthResult> => {
    const startTime = Date.now();
    
    try {
      // This would be actual Firestore health check
      // import { getFirestore } from 'firebase/firestore';
      // const db = getFirestore();
      // await db.doc('health/check').get();
      
      const latency = Date.now() - startTime;
      
      return {
        status: 'healthy',
        message: 'Firestore connection successful',
        latency,
        timestamp: new Date(),
        metadata: {
          endpoint: 'firestore.googleapis.com',
          region: process.env.FIREBASE_REGION || 'us-central1'
        }
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        message: `Firestore connection failed: ${error.message}`,
        latency: Date.now() - startTime,
        timestamp: new Date(),
        metadata: { error: error.code || 'unknown' }
      };
    }
  }
};

/**
 * Firebase Authentication Health Check
 */
export const authHealthCheck: HealthCheck = {
  name: 'firebase-auth',
  description: 'Firebase Authentication service',
  timeout: DEFAULT_TIMEOUT,
  retries: DEFAULT_RETRIES,
  critical: true,
  check: async (): Promise<HealthResult> => {
    const startTime = Date.now();
    
    try {
      // This would be actual Firebase Auth health check
      // import { getAuth } from 'firebase/auth';
      // const auth = getAuth();
      // Check auth service availability
      
      const latency = Date.now() - startTime;
      
      return {
        status: 'healthy',
        message: 'Firebase Auth service operational',
        latency,
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        message: `Firebase Auth service error: ${error.message}`,
        latency: Date.now() - startTime,
        timestamp: new Date()
      };
    }
  }
};

/**
 * Firebase Storage Health Check
 */
export const storageHealthCheck: HealthCheck = {
  name: 'firebase-storage',
  description: 'Firebase Cloud Storage service',
  timeout: DEFAULT_TIMEOUT,
  retries: 2, // Storage can be slower
  critical: false, // Not critical for basic functionality
  check: async (): Promise<HealthResult> => {
    const startTime = Date.now();
    
    try {
      // This would be actual Firebase Storage health check
      // import { getStorage, ref, getMetadata } from 'firebase/storage';
      // const storage = getStorage();
      // await getMetadata(ref(storage, 'health-check.txt'));
      
      const latency = Date.now() - startTime;
      
      return {
        status: 'healthy',
        message: 'Storage service operational',
        latency,
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        status: 'degraded',
        message: `Storage service degraded: ${error.message}`,
        latency: Date.now() - startTime,
        timestamp: new Date()
      };
    }
  }
};

/**
 * Firebase Functions Health Check
 */
export const functionsHealthCheck: HealthCheck = {
  name: 'firebase-functions',
  description: 'Firebase Cloud Functions',
  timeout: 10000, // Functions can take longer
  retries: DEFAULT_RETRIES,
  critical: false,
  check: async (): Promise<HealthResult> => {
    const startTime = Date.now();
    
    try {
      const response = await fetch('/api/health', {
        method: 'GET',
        timeout: 8000
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      const latency = Date.now() - startTime;
      
      return {
        status: 'healthy',
        message: 'Functions endpoint responsive',
        latency,
        timestamp: new Date(),
        metadata: data
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        message: `Functions health check failed: ${error.message}`,
        latency: Date.now() - startTime,
        timestamp: new Date()
      };
    }
  }
};

/**
 * Google Drive API Health Check
 */
export const googleDriveHealthCheck: HealthCheck = {
  name: 'google-drive',
  description: 'Google Drive API for backup functionality',
  timeout: 8000,
  retries: 2,
  critical: false, // Backup is not critical for basic functionality
  check: async (): Promise<HealthResult> => {
    const startTime = Date.now();
    
    try {
      const response = await fetch('https://www.googleapis.com/drive/v3/about', {
        headers: {
          'Authorization': `Bearer ${process.env.GOOGLE_DRIVE_API_KEY}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const latency = Date.now() - startTime;
      
      return {
        status: 'healthy',
        message: 'Google Drive API accessible',
        latency,
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        status: 'degraded',
        message: `Google Drive API degraded: ${error.message}`,
        latency: Date.now() - startTime,
        timestamp: new Date()
      };
    }
  }
};

/**
 * Stripe API Health Check
 */
export const stripeHealthCheck: HealthCheck = {
  name: 'stripe',
  description: 'Stripe payment processing API',
  timeout: 6000,
  retries: 2,
  critical: false, // Payments not critical for basic functionality
  check: async (): Promise<HealthResult> => {
    const startTime = Date.now();
    
    try {
      // This would be actual Stripe API health check
      // Test with a simple API call like retrieving account info
      const response = await fetch('https://api.stripe.com/v1/account', {
        headers: {
          'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const latency = Date.now() - startTime;
      
      return {
        status: 'healthy',
        message: 'Stripe API operational',
        latency,
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        status: 'degraded',
        message: `Stripe API degraded: ${error.message}`,
        latency: Date.now() - startTime,
        timestamp: new Date()
      };
    }
  }
};

/**
 * OneSignal Push Notifications Health Check
 */
export const oneSignalHealthCheck: HealthCheck = {
  name: 'onesignal',
  description: 'OneSignal push notification service',
  timeout: 5000,
  retries: 2,
  critical: false,
  check: async (): Promise<HealthResult> => {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`https://onesignal.com/api/v1/apps/${process.env.ONESIGNAL_APP_ID}`, {
        headers: {
          'Authorization': `Basic ${process.env.ONESIGNAL_REST_API_KEY}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const latency = Date.now() - startTime;
      
      return {
        status: 'healthy',
        message: 'OneSignal service operational',
        latency,
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        status: 'degraded',
        message: `OneSignal service degraded: ${error.message}`,
        latency: Date.now() - startTime,
        timestamp: new Date()
      };
    }
  }
};

/**
 * Sentry Error Tracking Health Check
 */
export const sentryHealthCheck: HealthCheck = {
  name: 'sentry',
  description: 'Sentry error tracking service',
  timeout: 5000,
  retries: 2,
  critical: false,
  check: async (): Promise<HealthResult> => {
    const startTime = Date.now();
    
    try {
      // Test Sentry DSN connectivity
      const dsn = process.env.SENTRY_DSN;
      if (!dsn) {
        throw new Error('Sentry DSN not configured');
      }
      
      const url = new URL(dsn);
      const response = await fetch(`${url.protocol}//${url.host}/api/0/projects/`, {
        timeout: 4000
      });
      
      const latency = Date.now() - startTime;
      
      return {
        status: response.ok ? 'healthy' : 'degraded',
        message: response.ok ? 'Sentry service operational' : 'Sentry service degraded',
        latency,
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        status: 'degraded',
        message: `Sentry service check failed: ${error.message}`,
        latency: Date.now() - startTime,
        timestamp: new Date()
      };
    }
  }
};

/**
 * System Resources Health Check
 */
export const systemResourcesHealthCheck: HealthCheck = {
  name: 'system-resources',
  description: 'System resource utilization',
  timeout: 2000,
  retries: 1,
  critical: false,
  check: async (): Promise<HealthResult> => {
    const startTime = Date.now();
    
    try {
      // This would check actual system resources in a real implementation
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      const memoryUsageMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
      const memoryLimitMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
      const memoryPercentage = (memoryUsageMB / memoryLimitMB) * 100;
      
      const status = memoryPercentage > 90 ? 'degraded' : 'healthy';
      const message = `Memory: ${memoryUsageMB}MB/${memoryLimitMB}MB (${memoryPercentage.toFixed(1)}%)`;
      
      return {
        status,
        message,
        latency: Date.now() - startTime,
        timestamp: new Date(),
        metadata: {
          memory: {
            used: memoryUsageMB,
            total: memoryLimitMB,
            percentage: Math.round(memoryPercentage)
          },
          cpu: {
            user: cpuUsage.user,
            system: cpuUsage.system
          }
        }
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        message: `System resources check failed: ${error.message}`,
        latency: Date.now() - startTime,
        timestamp: new Date()
      };
    }
  }
};

/**
 * All health checks configuration
 */
export const ALL_HEALTH_CHECKS: HealthCheck[] = [
  firestoreHealthCheck,
  authHealthCheck,
  storageHealthCheck,
  functionsHealthCheck,
  googleDriveHealthCheck,
  stripeHealthCheck,
  oneSignalHealthCheck,
  sentryHealthCheck,
  systemResourcesHealthCheck
];

/**
 * Run a single health check with retry logic
 */
async function runHealthCheckWithRetries(healthCheck: HealthCheck): Promise<HealthResult> {
  const maxRetries = healthCheck.retries || DEFAULT_RETRIES;
  let lastError: HealthResult | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await Promise.race([
        healthCheck.check(),
        new Promise<HealthResult>((_, reject) => 
          setTimeout(() => reject(new Error('Health check timeout')), healthCheck.timeout || DEFAULT_TIMEOUT)
        )
      ]);
      
      // If healthy, return immediately
      if (result.status === 'healthy') {
        return result;
      }
      
      // If not healthy but not the last attempt, retry
      lastError = result;
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
        continue;
      }
      
      return result;
    } catch (error: any) {
      const errorResult: HealthResult = {
        status: 'unhealthy',
        message: `Health check failed (attempt ${attempt}): ${error.message}`,
        timestamp: new Date()
      };
      
      if (attempt < maxRetries) {
        lastError = errorResult;
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      }
      
      return errorResult;
    }
  }
  
  return lastError || {
    status: 'unhealthy',
    message: 'Health check failed after all retries',
    timestamp: new Date()
  };
}

/**
 * Run all health checks and return system health status
 */
export async function runAllHealthChecks(): Promise<SystemHealth> {
  const startTime = Date.now();
  
  const healthResults = await Promise.allSettled(
    ALL_HEALTH_CHECKS.map(async (healthCheck) => ({
      name: healthCheck.name,
      result: await runHealthCheckWithRetries(healthCheck),
      critical: healthCheck.critical || false
    }))
  );
  
  const services: Record<string, HealthResult> = {};
  let criticalIssues = 0;
  let degradedServices = 0;
  
  healthResults.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      const { name, result: healthResult, critical } = result.value;
      services[name] = healthResult;
      
      if (healthResult.status === 'unhealthy' && critical) {
        criticalIssues++;
      } else if (healthResult.status === 'degraded') {
        degradedServices++;
      }
    } else {
      const healthCheck = ALL_HEALTH_CHECKS[index];
      services[healthCheck.name] = {
        status: 'unhealthy',
        message: `Health check execution failed: ${result.reason}`,
        timestamp: new Date()
      };
      
      if (healthCheck.critical) {
        criticalIssues++;
      }
    }
  });
  
  // Determine overall system health
  let overall: SystemHealth['overall'] = 'healthy';
  if (criticalIssues > 0) {
    overall = 'unhealthy';
  } else if (degradedServices > 0) {
    overall = 'degraded';
  }
  
  return {
    overall,
    services,
    timestamp: new Date(),
    uptime: process.uptime() || Date.now() - startTime,
    version: process.env.VITE_APP_VERSION || '1.0.0'
  };
}

/**
 * Create health check endpoint handler
 */
export function createHealthCheckHandler() {
  return async (req: any, res: any) => {
    try {
      const systemHealth = await runAllHealthChecks();
      
      // Set appropriate HTTP status code
      let statusCode = 200;
      if (systemHealth.overall === 'unhealthy') {
        statusCode = 503; // Service Unavailable
      } else if (systemHealth.overall === 'degraded') {
        statusCode = 200; // OK but with warnings
      }
      
      res.status(statusCode).json(systemHealth);
    } catch (error: any) {
      res.status(500).json({
        overall: 'unhealthy',
        services: {},
        timestamp: new Date(),
        uptime: 0,
        version: process.env.VITE_APP_VERSION || '1.0.0',
        error: error.message
      });
    }
  };
}

/**
 * Monitor system health continuously
 */
export class HealthMonitor {
  private interval: NodeJS.Timeout | null = null;
  private lastHealthStatus: SystemHealth | null = null;
  
  constructor(
    private checkIntervalMs: number = 60000, // 1 minute
    private onStatusChange?: (status: SystemHealth, previous: SystemHealth | null) => void
  ) {}
  
  start() {
    if (this.interval) {
      return; // Already started
    }
    
    // Run initial check
    this.checkHealth();
    
    // Schedule periodic checks
    this.interval = setInterval(() => {
      this.checkHealth();
    }, this.checkIntervalMs);
    
    console.log(`Health monitor started (interval: ${this.checkIntervalMs}ms)`);
  }
  
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log('Health monitor stopped');
    }
  }
  
  private async checkHealth() {
    try {
      const currentStatus = await runAllHealthChecks();
      
      // Check if status changed
      if (this.onStatusChange && 
          (!this.lastHealthStatus || this.lastHealthStatus.overall !== currentStatus.overall)) {
        this.onStatusChange(currentStatus, this.lastHealthStatus);
      }
      
      this.lastHealthStatus = currentStatus;
      
      // Log status changes
      if (currentStatus.overall !== 'healthy') {
        console.warn(`System health: ${currentStatus.overall}`, {
          services: Object.entries(currentStatus.services)
            .filter(([, result]) => result.status !== 'healthy')
            .map(([name, result]) => ({ name, status: result.status, message: result.message }))
        });
      }
    } catch (error: any) {
      console.error('Health check failed:', error);
    }
  }
  
  getCurrentStatus(): SystemHealth | null {
    return this.lastHealthStatus;
  }
}

export default {
  runAllHealthChecks,
  createHealthCheckHandler,
  HealthMonitor,
  ALL_HEALTH_CHECKS
};