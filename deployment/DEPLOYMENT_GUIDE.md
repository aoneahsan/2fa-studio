# 2FA Studio - Production Deployment Guide

## 📋 Overview

This comprehensive guide covers the complete production deployment process for 2FA Studio, including all necessary configurations, scripts, and monitoring setup.

### Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web App       │    │  Mobile Apps    │    │ Chrome Extension│
│ (Firebase Host) │    │ (iOS/Android)   │    │ (Chrome Store)  │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
         ┌─────────────────────────────────────────────┐
         │            Firebase Backend                 │
         │  ┌─────────┐ ┌─────────┐ ┌─────────────────┐│
         │  │Firestore│ │   Auth  │ │Cloud Functions  ││
         │  │Database │ │Service  │ │& Storage        ││
         │  └─────────┘ └─────────┘ └─────────────────┘│
         └─────────────────────────────────────────────┘
                                 │
         ┌─────────────────────────────────────────────┐
         │         Monitoring & Analytics              │
         │  ┌─────────┐ ┌─────────┐ ┌─────────────────┐│
         │  │ Sentry  │ │Analytics│ │  Performance    ││
         │  │         │ │  (GA4)  │ │   Monitoring    ││
         │  └─────────┘ └─────────┘ └─────────────────┘│
         └─────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

Before starting the deployment process, ensure you have:

- [x] Node.js 22+ installed
- [x] Firebase CLI installed (`npm install -g firebase-tools`)
- [x] Firebase project created
- [x] GitHub repository set up
- [x] Domain registered (for custom domains)
- [x] Google Play Console account (for Android)
- [x] Apple Developer account (for iOS)
- [x] Chrome Web Store Developer account

### 1. Environment Setup

```bash
# Clone the repository
git clone https://github.com/your-org/2fa-studio.git
cd 2fa-studio

# Install dependencies
yarn install

# Set up environment variables
cp deployment/environment-config/production.env.example .env.production
# Edit .env.production with your actual values
```

### 2. Firebase Configuration

```bash
# Login to Firebase
firebase login

# Set Firebase project
firebase use --add

# Deploy Firebase configuration
firebase deploy --only firestore:rules,storage:rules
```

### 3. Deploy Web Application

```bash
# Build and deploy
yarn build
firebase deploy --only hosting

# Or use deployment script
./deployment/scripts/deploy-web.sh production
```

## 🔧 Detailed Configuration

### Firebase Setup

#### 1. Project Configuration

Create and configure your Firebase project:

```bash
# Initialize Firebase project
firebase init

# Select services:
# - Firestore
# - Functions
# - Hosting
# - Storage
# - Emulators (for local development)
```

#### 2. Security Rules

The production security rules are configured in:
- `deployment/production-firestore.rules` - Firestore security rules
- `deployment/firebase-storage.rules` - Storage security rules

Key security features:
- User-based data isolation
- Rate limiting (5 requests per minute per user)
- Data validation and sanitization
- Audit logging for all operations

#### 3. Firebase Functions (if applicable)

```bash
# Deploy functions
cd functions
yarn install
yarn build
firebase deploy --only functions
```

### Environment Configuration

#### Production Environment Variables

Create `.env.production` with these required variables:

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123

# Application Configuration
VITE_APP_NAME="2FA Studio"
VITE_APP_VERSION=1.0.0
VITE_APP_ENVIRONMENT=production
VITE_APP_URL=https://yourdomain.com
VITE_APP_DOMAIN=yourdomain.com

# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_REPORTING=true
VITE_ENABLE_PERFORMANCE_MONITORING=true

# Stripe Configuration (for subscriptions)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Google Services
VITE_GOOGLE_CLIENT_ID=your_google_client_id

# OneSignal (for push notifications)
VITE_ONESIGNAL_APP_ID=your_onesignal_app_id

# Analytics
VITE_GA4_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_MIXPANEL_TOKEN=your_mixpanel_token

# Error Reporting
VITE_SENTRY_DSN=https://your_sentry_dsn

# Performance Monitoring
VITE_PERFORMANCE_API_ENDPOINT=/api/performance/metrics
```

### Security Configuration

#### SSL/TLS Setup

Run the SSL setup script:

```bash
./deployment/security/ssl-setup.sh production yourdomain.com
```

This configures:
- HTTPS enforcement
- HSTS headers
- Security headers (CSP, X-Frame-Options, etc.)
- SSL certificate monitoring

#### Content Security Policy

The CSP is configured to allow:
- Firebase services
- Google Fonts
- Stripe integration
- OneSignal push notifications
- Analytics services

View the full CSP configuration in `deployment/security/security-config.ts`.

### Performance Optimization

#### Build Optimization

Run performance optimization:

```bash
./deployment/performance/performance-optimization.sh production
```

This applies:
- Code splitting and tree shaking
- Asset optimization
- Service Worker configuration
- PWA setup
- Caching strategies

#### Performance Monitoring

Performance is monitored through:
- Core Web Vitals tracking
- Resource timing monitoring
- Custom performance metrics
- Lighthouse CI integration

## 📱 Mobile App Deployment

### Android Deployment

#### Prerequisites
- Android Studio installed
- Keystore file created
- Google Play Console access

#### Deployment Process

```bash
# Add Android platform (if not already added)
npx cap add android

# Build and sync
yarn build
npx cap sync android

# Deploy to Play Store
./deployment/mobile/play-store-deploy.sh
```

#### Environment Setup

Configure `deployment/mobile/android/release.keystore.properties`:
```properties
storeFile=../release.keystore
storePassword=your_store_password
keyAlias=your_key_alias
keyPassword=your_key_password
```

### iOS Deployment

#### Prerequisites
- Xcode installed
- Apple Developer account
- App Store Connect access
- Distribution certificates

#### Deployment Process

```bash
# Add iOS platform (if not already added)
npx cap add ios

# Build and sync
yarn build
npx cap sync ios

# Deploy to App Store
./deployment/mobile/app-store-deploy.sh
```

## 🌐 Chrome Extension Deployment

### Build Extension

```bash
# Build extension
yarn build:extension

# Deploy to Chrome Web Store
./deployment/chrome-extension/chrome-store-deploy.sh
```

### Extension Configuration

The extension is configured with:
- Manifest V3 compliance
- Host permissions for Firebase
- Content script for QR code detection
- Background service worker

## 🔄 CI/CD Pipeline

### GitHub Actions Setup

The CI/CD pipeline is configured in `.github/workflows/`:

- `ci-cd-production.yml` - Main production deployment pipeline
- `ci-cd-mobile.yml` - Mobile app deployment pipeline
- `security-monitoring.yml` - Security scanning and monitoring

### Pipeline Stages

1. **Code Quality** - ESLint, TypeScript checks, tests
2. **Security** - Dependency scanning, SAST analysis
3. **Build** - Application build and optimization
4. **Test** - Unit tests, integration tests, smoke tests
5. **Deploy** - Multi-environment deployment
6. **Post-Deploy** - Health checks, performance tests

### Secrets Configuration

Configure these secrets in GitHub:

```bash
# Firebase
FIREBASE_SERVICE_ACCOUNT_KEY
FIREBASE_PROJECT_ID

# Mobile
ANDROID_KEYSTORE_BASE64
ANDROID_KEYSTORE_PASSWORD
ANDROID_KEY_ALIAS
ANDROID_KEY_PASSWORD
GOOGLE_PLAY_SERVICE_ACCOUNT_KEY

IOS_CERTIFICATE_BASE64
IOS_CERTIFICATE_PASSWORD
IOS_PROVISIONING_PROFILE_BASE64
APP_STORE_CONNECT_API_KEY

# Chrome Extension
CHROME_EXTENSION_CLIENT_ID
CHROME_EXTENSION_CLIENT_SECRET
CHROME_EXTENSION_REFRESH_TOKEN

# Monitoring
SENTRY_AUTH_TOKEN
SENTRY_ORG
SENTRY_PROJECT
```

## 📊 Monitoring & Analytics

### Health Checks

Health checks run automatically and monitor:
- Application availability
- Firebase services connectivity
- API endpoints response time
- Database query performance
- Storage service health

Run manual health checks:
```bash
./deployment/validation/health-check.sh
```

### Smoke Tests

Smoke tests validate:
- Application loading
- Core functionality
- Firebase integration
- Security headers
- Performance metrics

Run smoke tests:
```bash
# In browser console
import('./deployment/validation/smoke-tests.js').then(tests => tests.runSmokeTestsWithReporting())
```

### Performance Monitoring

Performance is tracked through:
- **Core Web Vitals**: FCP, LCP, FID, CLS, TTFB
- **Custom Metrics**: Page load time, API response time
- **Resource Timing**: Asset loading performance
- **Error Tracking**: JavaScript errors, network failures

### Analytics Integration

Analytics are collected via:
- **Google Analytics 4**: User behavior, conversions
- **Mixpanel**: Event tracking, user journeys
- **Firebase Analytics**: App usage, retention

## 🛡️ Security

### Security Features

- **Authentication**: Firebase Auth with MFA support
- **Encryption**: AES-256-GCM for sensitive data
- **HTTPS**: Enforced SSL/TLS with HSTS
- **CSP**: Comprehensive Content Security Policy
- **Rate Limiting**: API and authentication rate limits
- **Audit Logging**: All security events logged

### Security Monitoring

Security events are monitored and logged:
- Failed authentication attempts
- Suspicious user behavior
- Security header violations
- Rate limit violations

### Incident Response

For security incidents:
1. Review security event logs
2. Check monitoring dashboards
3. Follow incident response procedures
4. Update security configurations if needed

## 📈 Performance Optimization

### Optimization Features

- **Code Splitting**: Vendor and feature-based chunks
- **Lazy Loading**: Route and component-level
- **Caching**: Multi-level caching strategy
- **CDN**: Firebase CDN with global distribution
- **Service Worker**: Offline functionality and caching
- **Image Optimization**: WebP/AVIF with responsive images

### Performance Budgets

Target performance metrics:
- **First Contentful Paint**: < 1.8s
- **Largest Contentful Paint**: < 2.5s
- **First Input Delay**: < 100ms
- **Cumulative Layout Shift**: < 0.1
- **Time to First Byte**: < 600ms

### Performance Testing

Run performance tests:
```bash
./scripts/performance-test.sh
./deployment/performance/monitor-performance.sh yourdomain.com
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Firebase Deployment Failures

**Symptom**: `firebase deploy` fails with permission errors
**Solution**:
```bash
# Re-authenticate
firebase logout
firebase login

# Check project configuration
firebase use --add
firebase projects:list
```

#### 2. SSL Certificate Issues

**Symptom**: SSL certificate not provisioned
**Solution**:
- Verify DNS configuration
- Wait 24-48 hours for propagation
- Check Firebase Console hosting settings
- Run SSL setup script again

#### 3. Mobile Build Failures

**Symptom**: Capacitor build fails on mobile platforms
**Solution**:
```bash
# Clean and rebuild
npx cap clean ios android
yarn build
npx cap sync
```

#### 4. Performance Issues

**Symptom**: Poor Core Web Vitals scores
**Solution**:
- Run performance optimization script
- Check bundle size analysis
- Review lazy loading configuration
- Optimize images and assets

### Debug Commands

```bash
# Check Firebase configuration
firebase use
firebase projects:list

# Validate environment
node -e "console.log(process.env)" | grep VITE

# Test Firebase connection
firebase database:get / --project your_project_id

# Check build output
ls -la dist/
du -sh dist/
```

### Log Analysis

Check logs in:
- Firebase Console > Functions > Logs
- GitHub Actions workflow logs
- Browser DevTools Console
- Mobile device logs (Xcode/Android Studio)

## 📞 Support

### Documentation

- [Firebase Documentation](https://firebase.google.com/docs)
- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

### Monitoring Dashboards

- Firebase Console: `https://console.firebase.google.com/project/your_project_id`
- Sentry Dashboard: Your Sentry organization dashboard
- Analytics: Google Analytics 4 and Mixpanel dashboards
- Performance: Core Web Vitals monitoring

### Emergency Contacts

In case of critical issues:
1. Check monitoring dashboards
2. Review recent deployments
3. Check error tracking (Sentry)
4. Follow incident response procedures

## 📝 Deployment Checklist

### Pre-Deployment

- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Firebase project configured
- [ ] SSL certificates ready
- [ ] Monitoring setup
- [ ] Performance optimizations applied
- [ ] Security headers configured
- [ ] Backup procedures in place

### Deployment

- [ ] Build successful
- [ ] Deploy to staging first
- [ ] Run smoke tests
- [ ] Check health endpoints
- [ ] Verify SSL/security headers
- [ ] Performance validation
- [ ] Monitor error rates

### Post-Deployment

- [ ] Health checks passing
- [ ] Performance metrics acceptable
- [ ] No critical errors in logs
- [ ] Analytics tracking working
- [ ] Monitoring alerts configured
- [ ] Documentation updated
- [ ] Team notified of deployment

---

## 🎯 Next Steps After Deployment

1. **Monitor**: Keep an eye on dashboards for the first 24-48 hours
2. **Optimize**: Review performance metrics and optimize as needed
3. **Scale**: Adjust Firebase quotas and limits based on usage
4. **Update**: Keep dependencies and security patches current
5. **Document**: Update any configuration changes made post-deployment

This deployment guide ensures a comprehensive, secure, and performant production deployment of 2FA Studio across all platforms.