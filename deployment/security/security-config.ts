/**
 * Production Security Configuration for 2FA Studio
 * 
 * This module provides comprehensive security configuration including
 * SSL/TLS settings, security headers, CSP policies, and security monitoring.
 */

export interface SecurityConfig {
  ssl: SSLConfig;
  headers: SecurityHeaders;
  csp: ContentSecurityPolicy;
  cors: CORSConfig;
  rateLimit: RateLimitConfig;
  authentication: AuthConfig;
  encryption: EncryptionConfig;
  monitoring: SecurityMonitoringConfig;
}

export interface SSLConfig {
  enforce: boolean;
  hsts: {
    enabled: boolean;
    maxAge: number;
    includeSubDomains: boolean;
    preload: boolean;
  };
  certificateTransparency: boolean;
  ocspStapling: boolean;
  minimumTLSVersion: '1.2' | '1.3';
  cipherSuites: string[];
}

export interface SecurityHeaders {
  'X-Content-Type-Options': string;
  'X-Frame-Options': string;
  'X-XSS-Protection': string;
  'Referrer-Policy': string;
  'Permissions-Policy': string;
  'Cross-Origin-Embedder-Policy': string;
  'Cross-Origin-Opener-Policy': string;
  'Cross-Origin-Resource-Policy': string;
}

export interface ContentSecurityPolicy {
  enabled: boolean;
  reportOnly: boolean;
  directives: Record<string, string[]>;
  reportUri?: string;
  upgradeInsecureRequests: boolean;
}

export interface CORSConfig {
  enabled: boolean;
  origins: string[];
  methods: string[];
  headers: string[];
  credentials: boolean;
  maxAge: number;
}

export interface RateLimitConfig {
  enabled: boolean;
  windowMs: number;
  maxRequests: number;
  message: string;
  skipSuccessfulRequests: boolean;
  skipFailedRequests: boolean;
}

export interface AuthConfig {
  sessionTimeout: number;
  maxLoginAttempts: number;
  lockoutDuration: number;
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSymbols: boolean;
  };
  mfa: {
    required: boolean;
    methods: string[];
  };
}

export interface EncryptionConfig {
  algorithm: string;
  keyLength: number;
  saltRounds: number;
  jwtSecret: string;
  rotationInterval: number;
}

export interface SecurityMonitoringConfig {
  logSecurityEvents: boolean;
  alertOnSuspiciousActivity: boolean;
  maxFailedAttempts: number;
  blockedIPDuration: number;
  securityScanInterval: number;
}

/**
 * Production Security Configuration
 */
export const PRODUCTION_SECURITY_CONFIG: SecurityConfig = {
  ssl: {
    enforce: true,
    hsts: {
      enabled: true,
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },
    certificateTransparency: true,
    ocspStapling: true,
    minimumTLSVersion: '1.3',
    cipherSuites: [
      'TLS_AES_256_GCM_SHA384',
      'TLS_CHACHA20_POLY1305_SHA256',
      'TLS_AES_128_GCM_SHA256',
      'ECDHE-RSA-AES256-GCM-SHA384',
      'ECDHE-RSA-AES128-GCM-SHA256'
    ]
  },

  headers: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-site'
  },

  csp: {
    enabled: true,
    reportOnly: false,
    upgradeInsecureRequests: true,
    reportUri: '/api/security/csp-report',
    directives: {
      'default-src': ["'self'"],
      'script-src': [
        "'self'",
        "'unsafe-inline'", // Required for Vite in development
        "'unsafe-eval'", // Required for some React dev tools
        'https://*.googleapis.com',
        'https://*.gstatic.com',
        'https://www.google.com',
        'https://onesignal.com',
        'https://*.onesignal.com',
        'https://js.stripe.com'
      ],
      'style-src': [
        "'self'",
        "'unsafe-inline'", // Required for styled-components
        'https://fonts.googleapis.com'
      ],
      'font-src': [
        "'self'",
        'https://fonts.gstatic.com'
      ],
      'img-src': [
        "'self'",
        'data:',
        'blob:',
        'https://*.googleapis.com',
        'https://*.gstatic.com',
        'https://onesignal.com',
        'https://*.onesignal.com',
        'https://*.stripe.com'
      ],
      'connect-src': [
        "'self'",
        'https://*.googleapis.com',
        'https://*.firebase.app',
        'https://*.firebaseio.com',
        'https://onesignal.com',
        'https://*.onesignal.com',
        'https://api.stripe.com',
        'wss://*.firebaseio.com'
      ],
      'object-src': ["'none'"],
      'media-src': ["'self'"],
      'frame-src': [
        "'self'",
        'https://accounts.google.com',
        'https://js.stripe.com'
      ],
      'worker-src': ["'self'", 'blob:'],
      'manifest-src': ["'self'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"]
    }
  },

  cors: {
    enabled: true,
    origins: [
      process.env.VITE_APP_URL || 'https://2fastudio.com',
      'https://2fa-studio.firebaseapp.com',
      'https://2fa-studio.web.app'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    headers: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Cache-Control'
    ],
    credentials: true,
    maxAge: 86400 // 24 hours
  },

  rateLimit: {
    enabled: true,
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    message: 'Too many requests from this IP, please try again later.',
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },

  authentication: {
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    passwordPolicy: {
      minLength: 12,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSymbols: true
    },
    mfa: {
      required: false, // Optional but recommended
      methods: ['totp', 'biometric']
    }
  },

  encryption: {
    algorithm: 'aes-256-gcm',
    keyLength: 256,
    saltRounds: 12,
    jwtSecret: process.env.JWT_SECRET || '',
    rotationInterval: 30 * 24 * 60 * 60 * 1000 // 30 days
  },

  monitoring: {
    logSecurityEvents: true,
    alertOnSuspiciousActivity: true,
    maxFailedAttempts: 10,
    blockedIPDuration: 60 * 60 * 1000, // 1 hour
    securityScanInterval: 24 * 60 * 60 * 1000 // 24 hours
  }
};

/**
 * Generate Content Security Policy header value
 */
export function generateCSPHeader(config: ContentSecurityPolicy): string {
  const directives = Object.entries(config.directives)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
  
  let csp = directives;
  
  if (config.upgradeInsecureRequests) {
    csp += '; upgrade-insecure-requests';
  }
  
  if (config.reportUri) {
    csp += `; report-uri ${config.reportUri}`;
  }
  
  return csp;
}

/**
 * Generate all security headers
 */
export function generateSecurityHeaders(config: SecurityConfig): Record<string, string> {
  const headers: Record<string, string> = {
    ...config.headers
  };
  
  // Add HSTS header if SSL is enforced
  if (config.ssl.enforce && config.ssl.hsts.enabled) {
    let hstsValue = `max-age=${config.ssl.hsts.maxAge}`;
    if (config.ssl.hsts.includeSubDomains) {
      hstsValue += '; includeSubDomains';
    }
    if (config.ssl.hsts.preload) {
      hstsValue += '; preload';
    }
    headers['Strict-Transport-Security'] = hstsValue;
  }
  
  // Add CSP header if enabled
  if (config.csp.enabled) {
    const headerName = config.csp.reportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy';
    headers[headerName] = generateCSPHeader(config.csp);
  }
  
  return headers;
}

/**
 * Validate security configuration
 */
export function validateSecurityConfig(config: SecurityConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Validate SSL configuration
  if (config.ssl.enforce) {
    if (config.ssl.hsts.maxAge < 31536000) {
      errors.push('HSTS max-age should be at least 1 year (31536000 seconds)');
    }
  }
  
  // Validate CSP configuration
  if (config.csp.enabled) {
    if (!config.csp.directives['default-src']) {
      errors.push('CSP must include default-src directive');
    }
    
    if (config.csp.directives['script-src']?.includes("'unsafe-eval'")) {
      errors.push('CSP should avoid unsafe-eval in production');
    }
  }
  
  // Validate rate limiting
  if (config.rateLimit.enabled) {
    if (config.rateLimit.maxRequests > 1000) {
      errors.push('Rate limit max requests should be reasonable (< 1000 per window)');
    }
  }
  
  // Validate encryption
  if (!config.encryption.jwtSecret || config.encryption.jwtSecret.length < 32) {
    errors.push('JWT secret must be at least 32 characters long');
  }
  
  // Validate password policy
  if (config.authentication.passwordPolicy.minLength < 8) {
    errors.push('Minimum password length should be at least 8 characters');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Security middleware for Express.js
 */
export function createSecurityMiddleware(config: SecurityConfig = PRODUCTION_SECURITY_CONFIG) {
  const headers = generateSecurityHeaders(config);
  
  return (req: any, res: any, next: any) => {
    // Apply security headers
    Object.entries(headers).forEach(([name, value]) => {
      res.setHeader(name, value);
    });
    
    // Enforce HTTPS in production
    if (config.ssl.enforce && req.headers['x-forwarded-proto'] !== 'https' && req.hostname !== 'localhost') {
      return res.redirect(301, `https://${req.hostname}${req.url}`);
    }
    
    // Apply CORS headers
    if (config.cors.enabled) {
      const origin = req.headers.origin;
      if (config.cors.origins.includes('*') || config.cors.origins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
      }
      
      res.setHeader('Access-Control-Allow-Methods', config.cors.methods.join(', '));
      res.setHeader('Access-Control-Allow-Headers', config.cors.headers.join(', '));
      res.setHeader('Access-Control-Allow-Credentials', config.cors.credentials.toString());
      res.setHeader('Access-Control-Max-Age', config.cors.maxAge.toString());
      
      if (req.method === 'OPTIONS') {
        return res.status(204).end();
      }
    }
    
    next();
  };
}

/**
 * Rate limiting middleware
 */
export function createRateLimitMiddleware(config: RateLimitConfig) {
  if (!config.enabled) {
    return (req: any, res: any, next: any) => next();
  }
  
  const requests = new Map<string, { count: number; resetTime: number }>();
  
  return (req: any, res: any, next: any) => {
    const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
    const now = Date.now();
    
    // Clean up old entries
    for (const [ip, data] of requests.entries()) {
      if (now > data.resetTime) {
        requests.delete(ip);
      }
    }
    
    // Get or create entry for this IP
    let entry = requests.get(clientIp);
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + config.windowMs
      };
      requests.set(clientIp, entry);
    }
    
    // Check rate limit
    entry.count++;
    
    if (entry.count > config.maxRequests) {
      res.status(429).json({
        error: 'Too Many Requests',
        message: config.message,
        retryAfter: Math.ceil((entry.resetTime - now) / 1000)
      });
      return;
    }
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', config.maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, config.maxRequests - entry.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000));
    
    next();
  };
}

/**
 * CSP violation reporting endpoint
 */
export function createCSPReportHandler() {
  return (req: any, res: any) => {
    try {
      const report = req.body;
      
      console.warn('CSP Violation Report:', {
        documentUri: report['document-uri'],
        violatedDirective: report['violated-directive'],
        blockedUri: report['blocked-uri'],
        sourceFile: report['source-file'],
        lineNumber: report['line-number'],
        columnNumber: report['column-number'],
        timestamp: new Date().toISOString()
      });
      
      // Send to monitoring service
      // This would integrate with your monitoring system
      
      res.status(204).end();
    } catch (error) {
      console.error('Error processing CSP report:', error);
      res.status(500).end();
    }
  };
}

/**
 * Security event logger
 */
export class SecurityEventLogger {
  private events: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    details: Record<string, any>;
    timestamp: Date;
    ip?: string;
    userAgent?: string;
  }> = [];
  
  constructor(
    private maxEvents: number = 1000,
    private alertCallback?: (event: any) => void
  ) {}
  
  log(
    type: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details: Record<string, any>,
    request?: any
  ) {
    const event = {
      type,
      severity,
      details,
      timestamp: new Date(),
      ip: request?.ip || request?.connection?.remoteAddress,
      userAgent: request?.headers?.['user-agent']
    };
    
    // Add to events array
    this.events.push(event);
    
    // Keep only recent events
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }
    
    // Log to console
    const logLevel = severity === 'critical' || severity === 'high' ? 'error' : 'warn';
    console[logLevel]('Security Event:', {
      type,
      severity,
      details,
      ip: event.ip,
      timestamp: event.timestamp.toISOString()
    });
    
    // Trigger alert for high/critical events
    if ((severity === 'high' || severity === 'critical') && this.alertCallback) {
      this.alertCallback(event);
    }
  }
  
  getEvents(limit?: number): typeof this.events {
    const events = [...this.events].reverse(); // Most recent first
    return limit ? events.slice(0, limit) : events;
  }
  
  getEventsByType(type: string, limit?: number): typeof this.events {
    const filtered = this.events.filter(e => e.type === type).reverse();
    return limit ? filtered.slice(0, limit) : filtered;
  }
  
  clearEvents() {
    this.events = [];
  }
}

/**
 * Initialize security monitoring
 */
export function initializeSecurityMonitoring(config: SecurityMonitoringConfig) {
  const eventLogger = new SecurityEventLogger(1000, (event) => {
    // Send critical security events to monitoring service
    console.error('CRITICAL SECURITY EVENT:', event);
    
    // This would integrate with your alerting system
    // sendAlert(event);
  });
  
  // Track failed login attempts
  const failedLogins = new Map<string, { count: number; lastAttempt: number }>();
  
  // Clean up old failed login records
  setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of failedLogins.entries()) {
      if (now - data.lastAttempt > config.blockedIPDuration) {
        failedLogins.delete(ip);
      }
    }
  }, 60000); // Clean up every minute
  
  return {
    eventLogger,
    
    logFailedLogin: (ip: string, details: Record<string, any>) => {
      const entry = failedLogins.get(ip) || { count: 0, lastAttempt: 0 };
      entry.count++;
      entry.lastAttempt = Date.now();
      failedLogins.set(ip, entry);
      
      const severity = entry.count > config.maxFailedAttempts ? 'critical' : 'medium';
      eventLogger.log('failed_login', severity, { ...details, attemptCount: entry.count });
      
      return entry.count > config.maxFailedAttempts;
    },
    
    isIPBlocked: (ip: string): boolean => {
      const entry = failedLogins.get(ip);
      return entry ? entry.count > config.maxFailedAttempts : false;
    },
    
    clearFailedLogins: (ip: string) => {
      failedLogins.delete(ip);
    }
  };
}

export default {
  PRODUCTION_SECURITY_CONFIG,
  generateSecurityHeaders,
  generateCSPHeader,
  validateSecurityConfig,
  createSecurityMiddleware,
  createRateLimitMiddleware,
  createCSPReportHandler,
  SecurityEventLogger,
  initializeSecurityMonitoring
};