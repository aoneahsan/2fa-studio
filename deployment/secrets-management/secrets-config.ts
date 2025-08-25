/**
 * Secrets Configuration Manager for 2FA Studio
 * 
 * This module provides a centralized way to manage secrets across
 * different environments (development, staging, production)
 */

interface SecretConfig {
  name: string;
  description: string;
  required: boolean;
  environments: ('development' | 'staging' | 'production')[];
  type: 'string' | 'json' | 'base64' | 'number' | 'boolean';
  validation?: (value: string) => boolean;
  defaultValue?: string;
}

export const SECRETS_CONFIG: Record<string, SecretConfig> = {
  // Firebase Configuration
  FIREBASE_API_KEY: {
    name: 'firebase-api-key',
    description: 'Firebase Web API Key',
    required: true,
    environments: ['development', 'staging', 'production'],
    type: 'string',
    validation: (value: string) => value.startsWith('AIza') && value.length > 30,
  },
  
  FIREBASE_SERVICE_ACCOUNT: {
    name: 'firebase-service-account',
    description: 'Firebase Admin SDK Service Account JSON',
    required: true,
    environments: ['staging', 'production'],
    type: 'json',
    validation: (value: string) => {
      try {
        const parsed = JSON.parse(value);
        return parsed.type === 'service_account' && parsed.project_id && parsed.private_key;
      } catch {
        return false;
      }
    },
  },

  // Third-party APIs
  GOOGLE_DRIVE_API_KEY: {
    name: 'google-drive-api-key',
    description: 'Google Drive API Key for backup functionality',
    required: false,
    environments: ['staging', 'production'],
    type: 'string',
    validation: (value: string) => value.startsWith('AIza'),
  },

  STRIPE_SECRET_KEY: {
    name: 'stripe-secret-key',
    description: 'Stripe Secret Key for payment processing',
    required: true,
    environments: ['staging', 'production'],
    type: 'string',
    validation: (value: string) => value.startsWith('sk_') && value.length > 50,
  },

  STRIPE_WEBHOOK_SECRET: {
    name: 'stripe-webhook-secret',
    description: 'Stripe Webhook Endpoint Secret',
    required: true,
    environments: ['staging', 'production'],
    type: 'string',
    validation: (value: string) => value.startsWith('whsec_'),
  },

  ONESIGNAL_REST_API_KEY: {
    name: 'onesignal-rest-api-key',
    description: 'OneSignal REST API Key for push notifications',
    required: false,
    environments: ['staging', 'production'],
    type: 'string',
    validation: (value: string) => value.length === 48,
  },

  // Security & Encryption
  ENCRYPTION_MASTER_KEY: {
    name: 'encryption-master-key',
    description: 'Master encryption key for sensitive data',
    required: true,
    environments: ['development', 'staging', 'production'],
    type: 'base64',
    validation: (value: string) => {
      try {
        const decoded = atob(value);
        return decoded.length >= 32; // At least 256 bits
      } catch {
        return false;
      }
    },
  },

  JWT_SECRET: {
    name: 'jwt-secret',
    description: 'JSON Web Token signing secret',
    required: true,
    environments: ['development', 'staging', 'production'],
    type: 'string',
    validation: (value: string) => value.length >= 64,
  },

  // Monitoring & Analytics
  SENTRY_DSN: {
    name: 'sentry-dsn',
    description: 'Sentry Data Source Name for error tracking',
    required: false,
    environments: ['staging', 'production'],
    type: 'string',
    validation: (value: string) => value.startsWith('https://') && value.includes('@sentry.io'),
  },

  MIXPANEL_TOKEN: {
    name: 'mixpanel-token',
    description: 'Mixpanel Project Token for analytics',
    required: false,
    environments: ['staging', 'production'],
    type: 'string',
    validation: (value: string) => value.length === 32,
  },

  // Social Authentication
  GOOGLE_OAUTH_CLIENT_SECRET: {
    name: 'google-oauth-client-secret',
    description: 'Google OAuth Client Secret',
    required: false,
    environments: ['staging', 'production'],
    type: 'string',
    validation: (value: string) => value.length > 20,
  },

  FACEBOOK_APP_SECRET: {
    name: 'facebook-app-secret',
    description: 'Facebook App Secret',
    required: false,
    environments: ['staging', 'production'],
    type: 'string',
    validation: (value: string) => value.length === 32,
  },

  GITHUB_CLIENT_SECRET: {
    name: 'github-client-secret',
    description: 'GitHub OAuth App Client Secret',
    required: false,
    environments: ['staging', 'production'],
    type: 'string',
    validation: (value: string) => value.length === 40,
  },

  APPLE_KEY_ID: {
    name: 'apple-key-id',
    description: 'Apple Sign In Key ID',
    required: false,
    environments: ['staging', 'production'],
    type: 'string',
    validation: (value: string) => value.length === 10,
  },

  APPLE_TEAM_ID: {
    name: 'apple-team-id',
    description: 'Apple Developer Team ID',
    required: false,
    environments: ['staging', 'production'],
    type: 'string',
    validation: (value: string) => value.length === 10,
  },

  APPLE_PRIVATE_KEY: {
    name: 'apple-private-key',
    description: 'Apple Sign In Private Key (PEM format)',
    required: false,
    environments: ['staging', 'production'],
    type: 'base64',
    validation: (value: string) => {
      try {
        const decoded = atob(value);
        return decoded.includes('BEGIN PRIVATE KEY') && decoded.includes('END PRIVATE KEY');
      } catch {
        return false;
      }
    },
  },

  // Admin & Communication
  ADMIN_EMAIL: {
    name: 'admin-email',
    description: 'Administrator email address',
    required: true,
    environments: ['development', 'staging', 'production'],
    type: 'string',
    validation: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  },

  SMTP_PASSWORD: {
    name: 'smtp-password',
    description: 'SMTP password for email sending',
    required: false,
    environments: ['staging', 'production'],
    type: 'string',
    validation: (value: string) => value.length > 8,
  },
};

/**
 * Environment-specific secret requirements
 */
export const ENVIRONMENT_SECRETS = {
  development: Object.keys(SECRETS_CONFIG).filter(
    key => SECRETS_CONFIG[key].environments.includes('development')
  ),
  staging: Object.keys(SECRETS_CONFIG).filter(
    key => SECRETS_CONFIG[key].environments.includes('staging')
  ),
  production: Object.keys(SECRETS_CONFIG).filter(
    key => SECRETS_CONFIG[key].environments.includes('production')
  ),
};

/**
 * Validates all secrets for a given environment
 */
export function validateEnvironmentSecrets(
  environment: 'development' | 'staging' | 'production',
  secrets: Record<string, string>
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const requiredSecrets = ENVIRONMENT_SECRETS[environment];

  for (const secretKey of requiredSecrets) {
    const config = SECRETS_CONFIG[secretKey];
    const value = secrets[secretKey];

    // Check if required secret is missing
    if (config.required && (!value || value.trim() === '')) {
      errors.push(`Missing required secret: ${secretKey}`);
      continue;
    }

    // Skip validation if secret is not provided and not required
    if (!value || value.trim() === '') {
      if (!config.required) {
        warnings.push(`Optional secret not provided: ${secretKey}`);
      }
      continue;
    }

    // Validate secret format
    if (config.validation && !config.validation(value)) {
      errors.push(`Invalid format for secret: ${secretKey}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Gets the Google Secret Manager secret name for an environment
 */
export function getSecretManagerName(
  secretKey: string,
  environment: 'development' | 'staging' | 'production'
): string {
  const config = SECRETS_CONFIG[secretKey];
  if (!config) {
    throw new Error(`Unknown secret: ${secretKey}`);
  }

  const prefix = environment === 'production' ? '2fa-studio-prod' : `2fa-studio-${environment}`;
  return `${prefix}-${config.name}`;
}

/**
 * Creates environment variable name from secret key
 */
export function getEnvironmentVariableName(secretKey: string): string {
  return secretKey.toUpperCase().replace(/-/g, '_');
}

/**
 * Default values for development environment
 */
export const DEVELOPMENT_DEFAULTS: Record<string, string> = {
  ENCRYPTION_MASTER_KEY: btoa('development-key-not-for-production-use-32-chars'),
  JWT_SECRET: 'development-jwt-secret-not-for-production-use-minimum-64-characters',
  ADMIN_EMAIL: 'admin@localhost',
};

/**
 * Security recommendations for each secret
 */
export const SECURITY_RECOMMENDATIONS: Record<string, string[]> = {
  ENCRYPTION_MASTER_KEY: [
    'Use a cryptographically secure random generator',
    'Minimum 256 bits (32 bytes)',
    'Rotate every 90 days',
    'Never log or expose in error messages',
  ],
  JWT_SECRET: [
    'Use a strong random string (minimum 64 characters)',
    'Rotate regularly',
    'Different secret for each environment',
  ],
  STRIPE_SECRET_KEY: [
    'Use live keys only in production',
    'Monitor for unauthorized usage',
    'Rotate if compromised',
  ],
  FIREBASE_SERVICE_ACCOUNT: [
    'Limit permissions to minimum required',
    'Monitor service account usage',
    'Rotate keys annually',
  ],
};

export default SECRETS_CONFIG;