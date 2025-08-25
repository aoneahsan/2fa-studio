# 2FA Studio - Deployment Configuration

## 📁 Directory Structure

This directory contains all the configuration files, scripts, and documentation needed for production deployment of 2FA Studio.

```
deployment/
├── README.md                          # This file - deployment overview
├── DEPLOYMENT_GUIDE.md               # Comprehensive deployment guide
├── production-firebase.json          # Production Firebase configuration
├── production-firestore.rules        # Production Firestore security rules
├── firebase-storage.rules           # Firebase Storage security rules
├── environment-config/               # Environment configurations
│   ├── production.env.example       # Production environment template
│   ├── staging.env.example         # Staging environment template
│   ├── environment-config.ts       # Environment configuration module
│   └── secrets-manager.ts          # Secrets management utilities
├── monitoring/                      # Monitoring and analytics
│   ├── monitoring-config.ts        # Monitoring configuration
│   ├── analytics-config.ts         # Analytics setup
│   ├── error-tracking.ts          # Error tracking configuration
│   └── performance-monitoring.ts   # Performance monitoring setup
├── mobile/                         # Mobile app deployment
│   ├── app-store-deploy.sh        # iOS App Store deployment
│   ├── play-store-deploy.sh       # Google Play Store deployment
│   ├── ios/                       # iOS-specific configuration
│   └── android/                   # Android-specific configuration
├── chrome-extension/               # Chrome Extension deployment
│   ├── chrome-store-deploy.sh     # Chrome Web Store deployment
│   ├── manifest.json              # Extension manifest
│   └── extension-config.ts        # Extension configuration
├── validation/                     # Deployment validation
│   ├── health-checks.ts           # Health check system
│   ├── smoke-tests.ts            # Production smoke tests
│   └── health-check.sh           # Health check script
├── security/                      # Security configuration
│   ├── security-config.ts         # Security settings
│   ├── ssl-setup.sh              # SSL/TLS certificate setup
│   ├── ssl-monitor.sh            # SSL monitoring script
│   └── firewall-rules.ts         # Firewall configuration
├── performance/                   # Performance optimization
│   ├── performance-config.ts      # Performance settings
│   ├── performance-optimization.sh # Performance setup script
│   └── monitor-performance.sh    # Performance monitoring
└── scripts/                      # Deployment scripts
    ├── deploy-web.sh             # Web application deployment
    ├── deploy-mobile.sh          # Mobile deployment orchestration
    ├── backup-database.sh        # Database backup script
    └── rollback.sh              # Rollback procedures
```

## 🚀 Quick Deployment

### 1. Web Application
```bash
# Deploy web application to Firebase Hosting
./deployment/scripts/deploy-web.sh production
```

### 2. Mobile Applications
```bash
# Deploy iOS to App Store
./deployment/mobile/app-store-deploy.sh

# Deploy Android to Play Store
./deployment/mobile/play-store-deploy.sh
```

### 3. Chrome Extension
```bash
# Deploy to Chrome Web Store
./deployment/chrome-extension/chrome-store-deploy.sh
```

## 📋 Configuration Files

### Core Configuration

| File | Purpose | Required |
|------|---------|----------|
| `production-firebase.json` | Firebase hosting configuration with security headers | Yes |
| `production-firestore.rules` | Database security rules with rate limiting | Yes |
| `firebase-storage.rules` | File storage security rules | Yes |

### Environment Configuration

| File | Purpose | Required |
|------|---------|----------|
| `production.env.example` | Production environment variables template | Yes |
| `environment-config.ts` | Environment configuration module | Yes |
| `secrets-manager.ts` | Secrets management utilities | Yes |

### Security Configuration

| File | Purpose | Required |
|------|---------|----------|
| `security-config.ts` | Comprehensive security settings | Yes |
| `ssl-setup.sh` | SSL certificate setup and monitoring | Yes |
| `firewall-rules.ts` | Network security configuration | Optional |

### Performance Configuration

| File | Purpose | Required |
|------|---------|----------|
| `performance-config.ts` | Performance optimization settings | Yes |
| `performance-optimization.sh` | Performance setup script | Yes |
| `monitor-performance.sh` | Performance monitoring script | Yes |

## 🔧 Setup Instructions

### Prerequisites

1. **Node.js & Package Manager**
   ```bash
   node --version  # Should be 22+
   yarn --version  # Or npm
   ```

2. **Firebase CLI**
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

3. **Environment Variables**
   ```bash
   cp deployment/environment-config/production.env.example .env.production
   # Edit .env.production with your actual values
   ```

### Initial Setup

1. **Firebase Project Setup**
   ```bash
   firebase use --add  # Select your project
   firebase deploy --only firestore:rules,storage:rules
   ```

2. **SSL Certificate Setup**
   ```bash
   ./deployment/security/ssl-setup.sh production yourdomain.com
   ```

3. **Performance Optimization**
   ```bash
   ./deployment/performance/performance-optimization.sh production
   ```

4. **Health Checks**
   ```bash
   ./deployment/validation/health-check.sh
   ```

## 🔍 Validation & Testing

### Health Checks

The health check system monitors:
- Application availability
- Firebase services connectivity
- API endpoints response time
- Database performance
- Security configurations

Run health checks:
```bash
./deployment/validation/health-check.sh
```

### Smoke Tests

Production smoke tests validate:
- Core application functionality
- Firebase integration
- Security headers
- Performance metrics
- PWA features

Run smoke tests (in browser):
```javascript
import('./deployment/validation/smoke-tests.js')
  .then(tests => tests.runSmokeTestsWithReporting())
```

## 📊 Monitoring

### Monitoring Services

- **Health Monitoring**: Custom health check system
- **Error Tracking**: Sentry integration
- **Analytics**: Google Analytics 4 + Mixpanel
- **Performance**: Core Web Vitals + custom metrics
- **Security**: Security event logging

### Monitoring Endpoints

- Health: `/api/health`
- Metrics: `/api/metrics`
- Security Events: `/api/security/events`

## 🛡️ Security Features

### Authentication & Authorization
- Firebase Authentication with MFA support
- Role-based access control
- Session management with secure tokens

### Data Protection
- AES-256-GCM encryption for sensitive data
- End-to-end encryption for backups
- Data validation and sanitization

### Network Security
- HTTPS enforcement with HSTS
- Content Security Policy (CSP)
- CORS configuration
- Rate limiting

### Monitoring & Alerting
- Failed login attempt tracking
- Suspicious activity detection
- Security event logging
- Automated incident response

## ⚡ Performance Features

### Optimization Techniques
- Code splitting and tree shaking
- Lazy loading (routes, components, images)
- Service Worker with offline support
- PWA with installability

### Caching Strategy
- Static assets: 1 year cache
- API responses: 5 minutes cache
- Database queries: 1 hour cache
- Images: 30 days cache

### Performance Monitoring
- Core Web Vitals tracking
- Resource timing monitoring
- Custom performance metrics
- Performance budgets enforcement

## 🚨 Troubleshooting

### Common Issues

1. **Firebase Deployment Fails**
   - Check Firebase CLI authentication: `firebase login`
   - Verify project selection: `firebase use`
   - Review Firebase quotas and limits

2. **SSL Certificate Issues**
   - Verify DNS configuration
   - Wait for DNS propagation (24-48 hours)
   - Check Firebase Console hosting settings

3. **Performance Issues**
   - Run performance optimization script
   - Check bundle size analysis
   - Review caching configuration

4. **Mobile Build Failures**
   - Clean and rebuild: `npx cap clean && npx cap sync`
   - Check platform-specific dependencies
   - Verify signing certificates

### Debug Commands

```bash
# Check Firebase status
firebase projects:list
firebase use

# Validate environment
env | grep VITE

# Test connectivity
curl -I https://yourdomain.com

# Check build output
ls -la dist/
du -sh dist/
```

## 📞 Support & Documentation

### Primary Documentation
- [Complete Deployment Guide](./DEPLOYMENT_GUIDE.md) - Comprehensive deployment instructions
- [Firebase Documentation](https://firebase.google.com/docs)
- [Capacitor Documentation](https://capacitorjs.com/docs)

### Monitoring Dashboards
- Firebase Console: Project monitoring and logs
- Sentry: Error tracking and performance
- Analytics: User behavior and conversions

### Emergency Procedures
1. Check monitoring dashboards for alerts
2. Review recent deployments in CI/CD pipeline
3. Check error tracking for critical issues
4. Follow incident response procedures in main guide

## 📈 Deployment Metrics

Track these key metrics:
- **Deployment Success Rate**: Target > 95%
- **Deployment Time**: Target < 10 minutes
- **Time to Recovery**: Target < 30 minutes
- **Error Rate Post-Deploy**: Target < 0.1%

## 🎯 Next Steps

After successful deployment:

1. **Monitor**: Watch dashboards for 24-48 hours
2. **Optimize**: Review performance and adjust configurations
3. **Scale**: Adjust quotas based on actual usage
4. **Document**: Update configurations and procedures
5. **Train**: Ensure team familiarity with deployment process

---

For detailed deployment instructions, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md).