# 2FA Studio Firebase Functions - Complete Implementation

This directory contains comprehensive Firebase Cloud Functions for the 2FA Studio application. All modules are production-ready with proper error handling, TypeScript types, and Firebase Functions best practices.

## Setup

1. Install dependencies:
```bash
cd functions
yarn install
```

2. Set up environment configuration:
```bash
firebase functions:config:set \
  stripe.secret_key="your_stripe_secret_key" \
  stripe.webhook_secret="your_stripe_webhook_secret" \
  stripe.price_pro="price_xxx" \
  stripe.price_premium="price_xxx" \
  stripe.price_business="price_xxx" \
  onesignal.webhook_secret="your_onesignal_webhook_secret" \
  app.url="https://your-app-url.com" \
  security.request_secret="your_request_secret" \
  storage.backup_bucket="your-backup-bucket"
```

3. Get the configuration (for local development):
```bash
firebase functions:config:get > .runtimeconfig.json
```

## Development

### Run locally with emulators:
```bash
firebase emulators:start --only functions
```

### Build TypeScript:
```bash
yarn build
```

### Watch for changes:
```bash
yarn build:watch
```

## Deployment

Deploy all functions:
```bash
firebase deploy --only functions
```

Deploy specific function:
```bash
firebase deploy --only functions:functionName
```

## Function Categories

### Admin Functions
- `adminGetUserStats` - Get dashboard statistics
- `adminUpdateUserSubscription` - Override user subscriptions
- `adminDeleteUser` - Delete user and all data
- `adminGetSystemStats` - Get system-wide statistics
- `adminSendNotification` - Send notifications to users
- `adminExportUsers` - Export user data

### Auth Functions
- `authOnUserCreate` - Triggered when new user signs up
- `authOnUserDelete` - Triggered when user is deleted
- `authValidateAdmin` - Check admin privileges
- `authCleanupSessions` - Clean expired sessions
- `authCreateSession` - Create new user session with device tracking
- `authRevokeSession` - Revoke specific user sessions
- `authGetUserSessions` - List all active user sessions

### Subscription Functions
- `subscriptionCreateCheckoutSession` - Create Stripe checkout
- `subscriptionCreatePortalSession` - Create billing portal session
- `subscriptionWebhook` - Handle Stripe webhooks
- `subscriptionCheckLimits` - Check account limits
- `subscriptionUpdateUsage` - Update usage statistics

### Backup Functions
- `backupScheduleAutoBackup` - Enable auto backup
- `backupCleanupOldBackups` - Remove old backups
- `backupExportUserData` - GDPR data export
- `backupValidateBackup` - Verify backup integrity

### Analytics Functions
- `analyticsAggregateDaily` - Daily stats aggregation
- `analyticsGenerateReports` - Generate analytics reports
- `analyticsTrackEvent` - Track custom events
- `analyticsCleanupOldData` - Clean old analytics

### Security Functions
- `securityMonitorSuspiciousActivity` - Monitor for threats
- `securityEnforceRateLimit` - Rate limiting
- `securityValidateRequest` - Validate signed requests
- `securityAuditLog` - Create audit logs
- `securityCheckIPReputation` - IP address reputation checking

### Webhook Functions
- `webhookOneSignal` - Handle OneSignal events
- `webhookGoogleDrive` - Handle Drive changes
- `webhookRegister` - Register new webhooks (admin only)
- `webhookList` - List all registered webhooks (admin only)

### Scheduled Functions
- `scheduledCleanup` - Daily cleanup (24 hours)
- `scheduledUsageCheck` - Usage limit check (1 hour)
- `scheduledBackup` - Auto backups (12 hours)
- `scheduledAnalytics` - Daily analytics aggregation (24 hours)

## API Endpoints

The functions expose an HTTP API at `/api` with the following routes:

- `GET /api/health` - Health check
- `GET /api/admin/users` - Get paginated users (admin only)
- `POST /api/webhook/stripe` - Stripe webhook endpoint
- `POST /api/webhook/onesignal` - OneSignal webhook
- `POST /api/webhook/googledrive` - Google Drive webhook

## Security

All admin functions require:
1. Authentication (Firebase Auth token)
2. Admin role verification in Firestore

Rate limiting is applied to prevent abuse:
- API calls: 100/minute
- Auth attempts: 5/5 minutes
- Backups: 10/hour

## Environment Variables

Required configuration:
- `stripe.secret_key` - Stripe API key
- `stripe.webhook_secret` - Stripe webhook signing secret
- `stripe.price_*` - Stripe price IDs for subscriptions
- `onesignal.webhook_secret` - OneSignal webhook secret
- `app.url` - Application URL for redirects
- `security.request_secret` - Secret for request signing
- `storage.backup_bucket` - GCS bucket for backups

## Monitoring

View function logs:
```bash
firebase functions:log
```

View specific function logs:
```bash
firebase functions:log --only functionName
```

## Testing

Run tests:
```bash
yarn test
```

## Best Practices

1. Always validate input data
2. Use proper error handling with HttpsError
3. Implement idempotency for webhooks
4. Clean up resources in scheduled functions
5. Use batch operations for Firestore
6. Monitor function execution time and memory