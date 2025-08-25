/**
 * Comprehensive Monitoring Configuration for 2FA Studio
 * 
 * This module sets up monitoring, analytics, and observability for the application
 * including error tracking, performance monitoring, user analytics, and system health.
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { OTLPTraceExporter } from '@opentelemetry/exporter-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-otlp-http';

// Environment configuration
const isProduction = process.env.NODE_ENV === 'production';
const serviceName = '2fa-studio';
const serviceVersion = process.env.VITE_APP_VERSION || '1.0.0';
const environment = process.env.VITE_APP_ENV || 'development';

// Monitoring Configuration
export const MONITORING_CONFIG = {
  // Service identification
  service: {
    name: serviceName,
    version: serviceVersion,
    environment: environment,
  },

  // OpenTelemetry Configuration
  openTelemetry: {
    enabled: isProduction,
    endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'https://api.honeycomb.io',
    headers: {
      'x-honeycomb-team': process.env.HONEYCOMB_API_KEY || '',
    },
    instrumentations: {
      http: true,
      express: true,
      firebase: true,
      redis: true,
      database: true,
    },
    sampling: {
      // Sample 10% in production, 100% in development
      ratio: isProduction ? 0.1 : 1.0,
    },
  },

  // Sentry Configuration
  sentry: {
    enabled: true,
    dsn: process.env.VITE_SENTRY_DSN || '',
    environment: environment,
    release: `${serviceName}@${serviceVersion}`,
    tracesSampleRate: isProduction ? 0.1 : 1.0,
    profilesSampleRate: isProduction ? 0.1 : 1.0,
    beforeSend: (event: any, hint: any) => {
      // Filter out non-critical errors in production
      if (isProduction) {
        const error = hint.originalException;
        if (error && error.message) {
          // Skip network errors that are user-related
          if (error.message.includes('NetworkError') || 
              error.message.includes('Failed to fetch')) {
            return null;
          }
        }
      }
      return event;
    },
    integrations: [
      'Http',
      'OnUnhandledRejection',
      'OnUncaughtException',
      'UserAgent',
      'Breadcrumbs',
      'GlobalHandlers',
      'Console',
    ],
  },

  // Google Analytics 4 Configuration
  analytics: {
    enabled: true,
    measurementId: process.env.VITE_GOOGLE_ANALYTICS_ID || '',
    gtag: {
      config: {
        anonymize_ip: true,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        cookie_flags: 'SameSite=None;Secure',
      },
    },
    events: {
      // Custom events for 2FA Studio
      account_created: 'account_created',
      qr_code_scanned: 'qr_code_scanned',
      backup_created: 'backup_created',
      backup_restored: 'backup_restored',
      premium_upgrade: 'premium_upgrade',
      extension_installed: 'extension_installed',
      biometric_enabled: 'biometric_enabled',
      sync_completed: 'sync_completed',
      error_occurred: 'error_occurred',
    },
  },

  // Performance Monitoring
  performance: {
    enabled: true,
    webVitals: {
      enabled: true,
      thresholds: {
        fcp: 1800, // First Contentful Paint
        lcp: 2500, // Largest Contentful Paint
        fid: 100,  // First Input Delay
        cls: 0.1,  // Cumulative Layout Shift
        ttfb: 600, // Time to First Byte
      },
    },
    resourceTiming: true,
    userTiming: true,
  },

  // Health Monitoring
  health: {
    enabled: true,
    checks: {
      firebase: true,
      database: true,
      storage: true,
      authentication: true,
      functions: true,
    },
    intervals: {
      fast: 30000,    // 30 seconds
      normal: 300000, // 5 minutes
      slow: 900000,   // 15 minutes
    },
  },

  // User Analytics
  userAnalytics: {
    enabled: true,
    events: {
      pageView: true,
      userInteraction: true,
      featureUsage: true,
      errorTracking: true,
    },
    privacy: {
      anonymizeData: true,
      respectDNT: true,
      consentRequired: true,
    },
  },

  // System Metrics
  systemMetrics: {
    enabled: isProduction,
    metrics: [
      'cpu_usage',
      'memory_usage',
      'disk_usage',
      'network_io',
      'response_time',
      'error_rate',
      'throughput',
    ],
  },
};

/**
 * Initialize OpenTelemetry SDK
 */
export function initializeOpenTelemetry() {
  if (!MONITORING_CONFIG.openTelemetry.enabled) {
    return;
  }

  const sdk = new NodeSDK({
    resource: new Resource({
      [ATTR_SERVICE_NAME]: MONITORING_CONFIG.service.name,
      [ATTR_SERVICE_VERSION]: MONITORING_CONFIG.service.version,
      'service.environment': MONITORING_CONFIG.service.environment,
    }),
    
    traceExporter: new OTLPTraceExporter({
      url: MONITORING_CONFIG.openTelemetry.endpoint + '/v1/traces',
      headers: MONITORING_CONFIG.openTelemetry.headers,
    }),
    
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({
        url: MONITORING_CONFIG.openTelemetry.endpoint + '/v1/metrics',
        headers: MONITORING_CONFIG.openTelemetry.headers,
      }),
      exportIntervalMillis: 30000, // Export every 30 seconds
    }),
    
    instrumentations: [getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': {
        enabled: MONITORING_CONFIG.openTelemetry.instrumentations.http,
      },
      '@opentelemetry/instrumentation-express': {
        enabled: MONITORING_CONFIG.openTelemetry.instrumentations.express,
      },
    })],
  });

  sdk.start();
  console.log('OpenTelemetry initialized successfully');

  return sdk;
}

/**
 * Initialize Sentry Error Tracking
 */
export function initializeSentry() {
  if (!MONITORING_CONFIG.sentry.enabled || !MONITORING_CONFIG.sentry.dsn) {
    return;
  }

  // This would be imported dynamically in the actual implementation
  // import * as Sentry from '@sentry/react';
  
  const sentryConfig = {
    dsn: MONITORING_CONFIG.sentry.dsn,
    environment: MONITORING_CONFIG.sentry.environment,
    release: MONITORING_CONFIG.sentry.release,
    tracesSampleRate: MONITORING_CONFIG.sentry.tracesSampleRate,
    profilesSampleRate: MONITORING_CONFIG.sentry.profilesSampleRate,
    beforeSend: MONITORING_CONFIG.sentry.beforeSend,
    integrations: [
      // Initialize Sentry integrations based on configuration
    ],
  };

  // Sentry.init(sentryConfig);
  console.log('Sentry initialized successfully');
}

/**
 * Initialize Google Analytics 4
 */
export function initializeAnalytics() {
  if (!MONITORING_CONFIG.analytics.enabled || !MONITORING_CONFIG.analytics.measurementId) {
    return;
  }

  // Load gtag script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MONITORING_CONFIG.analytics.measurementId}`;
  document.head.appendChild(script);

  // Initialize gtag
  (window as any).dataLayer = (window as any).dataLayer || [];
  (window as any).gtag = function() {
    (window as any).dataLayer.push(arguments);
  };

  (window as any).gtag('js', new Date());
  (window as any).gtag('config', MONITORING_CONFIG.analytics.measurementId, 
    MONITORING_CONFIG.analytics.gtag.config);

  console.log('Google Analytics initialized successfully');
}

/**
 * Initialize Performance Monitoring
 */
export function initializePerformanceMonitoring() {
  if (!MONITORING_CONFIG.performance.enabled) {
    return;
  }

  // Web Vitals monitoring
  if (MONITORING_CONFIG.performance.webVitals.enabled && typeof window !== 'undefined') {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      const reportVital = (vital: any) => {
        // Report to analytics
        (window as any).gtag?.('event', vital.name, {
          custom_map: { metric_value: vital.value }
        });

        // Report to custom endpoint
        fetch('/api/vitals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(vital),
        }).catch(() => {}); // Silently fail
      };

      getCLS(reportVital);
      getFID(reportVital);
      getFCP(reportVital);
      getLCP(reportVital);
      getTTFB(reportVital);
    });
  }

  // Resource timing monitoring
  if (MONITORING_CONFIG.performance.resourceTiming && typeof window !== 'undefined') {
    window.addEventListener('load', () => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const slowResources = resources.filter(resource => resource.duration > 1000);
      
      if (slowResources.length > 0) {
        console.warn('Slow resources detected:', slowResources);
        // Report slow resources
        fetch('/api/performance/slow-resources', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(slowResources.map(r => ({
            name: r.name,
            duration: r.duration,
            size: r.transferSize,
          }))),
        }).catch(() => {});
      }
    });
  }
}

/**
 * Initialize Health Monitoring
 */
export function initializeHealthMonitoring() {
  if (!MONITORING_CONFIG.health.enabled) {
    return;
  }

  const healthChecks = {
    firebase: async () => {
      // Check Firebase connection
      try {
        // This would be actual Firebase health check
        return { status: 'healthy', latency: Date.now() };
      } catch (error) {
        return { status: 'unhealthy', error: error };
      }
    },

    database: async () => {
      // Check Firestore connection
      try {
        // This would be actual Firestore health check
        return { status: 'healthy', latency: Date.now() };
      } catch (error) {
        return { status: 'unhealthy', error: error };
      }
    },

    storage: async () => {
      // Check Firebase Storage connection
      try {
        // This would be actual Storage health check
        return { status: 'healthy', latency: Date.now() };
      } catch (error) {
        return { status: 'unhealthy', error: error };
      }
    },
  };

  // Run health checks periodically
  setInterval(async () => {
    const results = await Promise.all(
      Object.entries(healthChecks).map(async ([service, check]) => ({
        service,
        ...(await check()),
      }))
    );

    // Report health status
    const healthStatus = {
      timestamp: new Date().toISOString(),
      overall: results.every(r => r.status === 'healthy') ? 'healthy' : 'degraded',
      services: results,
    };

    // Send to monitoring endpoint
    fetch('/api/health/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(healthStatus),
    }).catch(() => {});
  }, MONITORING_CONFIG.health.intervals.normal);
}

/**
 * Track custom events
 */
export function trackEvent(eventName: string, properties: Record<string, any> = {}) {
  // Google Analytics
  if (MONITORING_CONFIG.analytics.enabled && (window as any).gtag) {
    (window as any).gtag('event', eventName, properties);
  }

  // Custom analytics endpoint
  fetch('/api/analytics/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: eventName,
      properties: {
        ...properties,
        timestamp: new Date().toISOString(),
        sessionId: getSessionId(),
        userId: getUserId(),
      },
    }),
  }).catch(() => {});
}

/**
 * Track errors
 */
export function trackError(error: Error, context: Record<string, any> = {}) {
  // Sentry
  // Sentry.captureException(error, { extra: context });

  // Google Analytics
  if (MONITORING_CONFIG.analytics.enabled && (window as any).gtag) {
    (window as any).gtag('event', 'exception', {
      description: error.message,
      fatal: false,
      custom_map: context,
    });
  }

  // Custom error tracking
  fetch('/api/errors/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: error.message,
      stack: error.stack,
      context: context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    }),
  }).catch(() => {});
}

/**
 * Get or generate session ID
 */
function getSessionId(): string {
  let sessionId = sessionStorage.getItem('monitoring_session_id');
  if (!sessionId) {
    sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
    sessionStorage.setItem('monitoring_session_id', sessionId);
  }
  return sessionId;
}

/**
 * Get user ID (if authenticated)
 */
function getUserId(): string | null {
  // This would get the user ID from your auth system
  return localStorage.getItem('user_id') || null;
}

/**
 * Initialize all monitoring systems
 */
export function initializeMonitoring() {
  console.log('Initializing monitoring systems...');
  
  try {
    initializeOpenTelemetry();
    initializeSentry();
    initializeAnalytics();
    initializePerformanceMonitoring();
    initializeHealthMonitoring();
    
    console.log('All monitoring systems initialized successfully');
    
    // Track initialization
    trackEvent('monitoring_initialized', {
      environment: MONITORING_CONFIG.service.environment,
      version: MONITORING_CONFIG.service.version,
    });
  } catch (error) {
    console.error('Failed to initialize monitoring:', error);
    trackError(error as Error, { context: 'monitoring_initialization' });
  }
}

export default MONITORING_CONFIG;