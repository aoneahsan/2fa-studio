# 2FA Studio - Production Deployment Checklist

**Last Updated**: August 14, 2025  
**Version**: 1.0.0  

## 🔐 Pre-Deployment Security Checklist

### Environment Variables
- [ ] Remove all `.env` files from version control
- [ ] Set up production environment variables
- [ ] Rotate all API keys and secrets
- [ ] Verify no hardcoded credentials
- [ ] Configure CORS origins for production
- [ ] Set secure cookie flags
- [ ] Enable HTTPS only
- [ ] Configure CSP headers

### Firebase Security
- [ ] Deploy production security rules
- [ ] Enable App Check
- [ ] Configure authorized domains
- [ ] Set up backup policies
- [ ] Enable audit logging
- [ ] Configure rate limiting
- [ ] Set up monitoring alerts
- [ ] Test security rules

### API Security
- [ ] Enable API rate limiting
- [ ] Configure request validation
- [ ] Set up API monitoring
- [ ] Enable request logging
- [ ] Configure webhook security
- [ ] Validate SSL certificates
- [ ] Set up DDoS protection
- [ ] Configure WAF rules

## 💳 Stripe Configuration

### Account Setup
- [ ] Create Stripe production account
- [ ] Complete business verification
- [ ] Set up bank account
- [ ] Configure tax settings
- [ ] Enable required payment methods
- [ ] Set up billing portal
- [ ] Configure webhook endpoints
- [ ] Test payment flows

### Product Configuration
```bash
# Create products and prices in Stripe Dashboard
- [ ] Free Tier (ID: free)
- [ ] Premium Monthly (ID: premium_monthly) - $2.99
- [ ] Premium Yearly (ID: premium_yearly) - $28.99
- [ ] Family Monthly (ID: family_monthly) - $4.99
- [ ] Family Yearly (ID: family_yearly) - $47.99
```

### Webhook Setup
```bash
# Configure webhook endpoint
https://api.2fastudio.app/webhooks/stripe

# Events to listen for:
- [ ] customer.subscription.created
- [ ] customer.subscription.updated
- [ ] customer.subscription.deleted
- [ ] invoice.payment_succeeded
- [ ] invoice.payment_failed
- [ ] customer.updated
```

## 🔥 Firebase Production Setup

### Project Creation
```bash
# Create new Firebase project
firebase projects:create 2fa-studio-prod --display-name "2FA Studio Production"

# Set as active project
firebase use 2fa-studio-prod

# Initialize services
firebase init
```

### Service Configuration
- [ ] Enable Authentication
  - [ ] Email/Password
  - [ ] Google OAuth
  - [ ] Apple Sign-In
  - [ ] Microsoft OAuth
- [ ] Configure Firestore
  - [ ] Choose multi-region
  - [ ] Enable offline persistence
  - [ ] Set up composite indexes
- [ ] Set up Cloud Storage
  - [ ] Configure CORS
  - [ ] Set up lifecycle rules
  - [ ] Enable CDN
- [ ] Deploy Cloud Functions
  - [ ] Set environment variables
  - [ ] Configure memory/timeout
  - [ ] Enable error reporting

### Deployment Commands
```bash
# Deploy security rules
firebase deploy --only firestore:rules,storage:rules

# Deploy Cloud Functions
firebase deploy --only functions

# Deploy hosting (if using)
firebase deploy --only hosting

# Deploy everything
firebase deploy
```

## 📱 Mobile App Deployment

### iOS App Store
- [ ] Apple Developer Account ($99/year)
- [ ] Create App ID in Apple Developer Portal
- [ ] Generate provisioning profiles
- [ ] Create App Store Connect listing
- [ ] Upload screenshots (6.5", 5.5", iPad)
- [ ] Write app description
- [ ] Set up TestFlight
- [ ] Submit for review

### Android Google Play
- [ ] Google Play Developer Account ($25)
- [ ] Create app in Play Console
- [ ] Upload APK/AAB bundle
- [ ] Complete store listing
- [ ] Upload screenshots (phone, tablet)
- [ ] Set content rating
- [ ] Configure pricing
- [ ] Submit for review

### Build Commands
```bash
# iOS Build
npm run build
npx cap sync ios
npx cap open ios
# Archive and upload via Xcode

# Android Build
npm run build
npx cap sync android
npx cap open android
# Generate signed APK/AAB
```

## 🌐 Web Deployment

### Domain & Hosting
- [ ] Register domain (2fastudio.app)
- [ ] Set up DNS records
- [ ] Configure SSL certificate
- [ ] Set up CDN (CloudFlare)
- [ ] Configure subdomains
  - [ ] app.2fastudio.app (main app)
  - [ ] api.2fastudio.app (backend)
  - [ ] admin.2fastudio.app (admin panel)

### Deployment Options

#### Option 1: Firebase Hosting
```bash
firebase init hosting
firebase deploy --only hosting
```

#### Option 2: Vercel
```bash
npm i -g vercel
vercel --prod
```

#### Option 3: Netlify
```bash
npm i -g netlify-cli
netlify deploy --prod
```

### Environment Configuration
```bash
# Production .env
VITE_ENV=production
VITE_FIREBASE_API_KEY=prod_key_here
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
VITE_ONESIGNAL_APP_ID=prod_onesignal_id
```

## 🔔 OneSignal Setup

### Configuration
- [ ] Create OneSignal account
- [ ] Add new app
- [ ] Configure platforms
  - [ ] Web Push
  - [ ] iOS (APNs certificates)
  - [ ] Android (FCM)
- [ ] Get App ID and API keys
- [ ] Set up segments
- [ ] Create notification templates
- [ ] Test delivery

### Implementation
```javascript
// Update environment variables
VITE_ONESIGNAL_APP_ID=your_prod_app_id
VITE_ONESIGNAL_REST_API_KEY=your_api_key
VITE_ONESIGNAL_SAFARI_WEB_ID=web.onesignal.auto.xxx
```

## 📊 Analytics & Monitoring

### Google Analytics
- [ ] Create GA4 property
- [ ] Get Measurement ID
- [ ] Configure events
- [ ] Set up conversions
- [ ] Create audiences
- [ ] Set up reports

### Error Monitoring
- [ ] Set up Sentry account
- [ ] Configure error reporting
- [ ] Set up alerts
- [ ] Configure source maps
- [ ] Test error capture

### Performance Monitoring
- [ ] Enable Firebase Performance
- [ ] Set up custom traces
- [ ] Configure alerts
- [ ] Set up dashboards

## 🧪 Pre-Launch Testing

### Functional Testing
- [ ] Test all user flows
- [ ] Test payment processing
- [ ] Test account creation/deletion
- [ ] Test backup/restore
- [ ] Test sync across devices
- [ ] Test push notifications
- [ ] Test offline mode
- [ ] Test error scenarios

### Performance Testing
- [ ] Load testing (100+ concurrent users)
- [ ] Stress testing
- [ ] Database query optimization
- [ ] API response times
- [ ] Mobile app performance
- [ ] Battery usage testing

### Security Testing
- [ ] Penetration testing
- [ ] OWASP Top 10 scan
- [ ] SSL/TLS verification
- [ ] Authentication testing
- [ ] Authorization testing
- [ ] Data encryption verification
- [ ] API security testing

## 🚀 Launch Checklist

### Day Before Launch
- [ ] Final backup of all systems
- [ ] Verify all services are running
- [ ] Check domain propagation
- [ ] Test payment processing
- [ ] Verify email delivery
- [ ] Check monitoring systems
- [ ] Prepare status page
- [ ] Brief support team

### Launch Day
- [ ] Deploy to production
- [ ] Enable production mode
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Verify analytics tracking
- [ ] Test critical paths
- [ ] Monitor user signups
- [ ] Check payment processing

### Post-Launch (Day 1)
- [ ] Monitor error logs
- [ ] Check user feedback
- [ ] Analyze performance data
- [ ] Review security alerts
- [ ] Check conversion rates
- [ ] Address critical issues
- [ ] Send launch announcement
- [ ] Update social media

## 📈 Marketing Launch

### App Store Optimization
- [ ] Optimize app title
- [ ] Write keyword-rich description
- [ ] Create compelling screenshots
- [ ] Design app preview video
- [ ] Localize for key markets
- [ ] Set up A/B tests

### Launch Campaign
- [ ] Press release
- [ ] Product Hunt launch
- [ ] Social media campaign
- [ ] Email announcement
- [ ] Blog post
- [ ] Influencer outreach
- [ ] Paid advertising setup

## 🔄 Rollback Plan

### Preparation
- [ ] Document rollback procedures
- [ ] Test rollback process
- [ ] Prepare previous version
- [ ] Set up monitoring triggers
- [ ] Define rollback criteria

### Rollback Steps
```bash
# 1. Switch to previous version
git checkout v0.9.0
npm run build
firebase deploy

# 2. Restore database backup
firebase firestore:backups:restore backup_id

# 3. Notify users
# Send push notification about maintenance

# 4. Investigate issues
# Check logs and metrics
```

## 📋 Legal & Compliance

### Documentation
- [ ] Privacy Policy published
- [ ] Terms of Service published
- [ ] Cookie Policy published
- [ ] GDPR compliance verified
- [ ] CCPA compliance verified
- [ ] Age verification implemented
- [ ] Data retention policies set

### App Store Compliance
- [ ] Export compliance (encryption)
- [ ] Content rating appropriate
- [ ] Screenshot compliance
- [ ] Description accuracy
- [ ] In-app purchase disclosure
- [ ] Privacy labels complete

## 🎯 Success Metrics

### Launch Day Targets
- [ ] 100+ signups
- [ ] <1% error rate
- [ ] <3s page load time
- [ ] 99.9% uptime
- [ ] 5+ premium subscriptions

### Week 1 Targets
- [ ] 1,000+ downloads
- [ ] 4.5+ app store rating
- [ ] <2% crash rate
- [ ] 10% premium conversion
- [ ] 80% D1 retention

## 📞 Support Preparation

### Documentation
- [ ] FAQ published
- [ ] User guide complete
- [ ] Video tutorials created
- [ ] Troubleshooting guide
- [ ] API documentation

### Support Channels
- [ ] Email support configured
- [ ] In-app support chat
- [ ] Social media monitoring
- [ ] Community forum setup
- [ ] Status page live

## ✅ Final Launch Approval

### Stakeholder Signoff
- [ ] Technical review complete
- [ ] Security audit passed
- [ ] Legal review complete
- [ ] Business approval received
- [ ] Marketing ready

### Go/No-Go Decision
- [ ] All critical items complete
- [ ] Rollback plan tested
- [ ] Team briefed
- [ ] Launch time confirmed
- [ ] **APPROVED FOR LAUNCH** ⬜

---

## 🚀 Launch Command

```bash
# When all checks are complete, execute:
npm run deploy:production
```

**Launch Date**: _____________  
**Launch Time**: _____________  
**Responsible**: _____________  
**Approved By**: _____________  

---

*This checklist must be completed before production deployment. Each item should be verified and checked off by the responsible team member.*