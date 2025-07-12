---
sidebar_position: 2
---

# Web Deployment

Complete guide for deploying the 2FA Studio React web application to Firebase Hosting with CloudFlare CDN.

## Prerequisites

### Required Tools

```bash
# Check versions
node --version  # v16.0.0 or higher
yarn --version  # v1.22.0 or higher
firebase --version  # v11.0.0 or higher

# Install if needed
npm install -g firebase-tools
npm install -g yarn
```

### Access Requirements

- Firebase project access (Owner or Editor role)
- Domain registrar access (for DNS)
- CloudFlare account (optional but recommended)
- GitHub repository access

## Build Configuration

### Environment Setup

1. **Create environment files**:

```bash
# .env.production
REACT_APP_FIREBASE_API_KEY=your-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
REACT_APP_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

REACT_APP_ENVIRONMENT=production
REACT_APP_VERSION=$npm_package_version
REACT_APP_BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
REACT_APP_COMMIT_SHA=$(git rev-parse --short HEAD)

# Feature flags
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_ENABLE_PERFORMANCE=true
REACT_APP_ENABLE_ERROR_REPORTING=true
```

2. **Configure build settings**:

```javascript
// craco.config.js
const webpack = require('webpack');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = {
  webpack: {
    plugins: [
      new webpack.DefinePlugin({
        'process.env.BUILD_TIME': JSON.stringify(new Date().toISOString()),
        'process.env.VERSION': JSON.stringify(process.env.npm_package_version),
      }),
      process.env.ANALYZE && new BundleAnalyzerPlugin(),
    ].filter(Boolean),
    configure: (webpackConfig) => {
      // Production optimizations
      if (process.env.NODE_ENV === 'production') {
        webpackConfig.optimization = {
          ...webpackConfig.optimization,
          splitChunks: {
            chunks: 'all',
            cacheGroups: {
              default: false,
              vendors: false,
              vendor: {
                name: 'vendor',
                chunks: 'all',
                test: /node_modules/,
                priority: 20,
              },
              common: {
                name: 'common',
                minChunks: 2,
                chunks: 'all',
                priority: 10,
                reuseExistingChunk: true,
                enforce: true,
              },
            },
          },
        };
      }
      return webpackConfig;
    },
  },
};
```

### Build Process

1. **Install dependencies**:

```bash
# Clean install
rm -rf node_modules yarn.lock
yarn install --frozen-lockfile
```

2. **Run production build**:

```bash
# Build with analysis
ANALYZE=true yarn build

# Standard build
yarn build

# Build with specific environment
REACT_APP_ENVIRONMENT=staging yarn build
```

3. **Verify build output**:

```bash
# Check bundle sizes
yarn analyze

# Expected output structure
build/
├── index.html
├── static/
│   ├── css/
│   │   ├── main.[hash].css
│   │   └── main.[hash].css.map
│   ├── js/
│   │   ├── main.[hash].js
│   │   ├── vendor.[hash].js
│   │   └── runtime-main.[hash].js
│   └── media/
│       └── [images/fonts]
├── manifest.json
├── robots.txt
└── service-worker.js
```

## Firebase Hosting Setup

### 1. Initialize Firebase

```bash
# Login to Firebase
firebase login

# Initialize project
firebase init hosting

# Configuration options:
# ? What do you want to use as your public directory? build
# ? Configure as a single-page app? Yes
# ? Set up automatic builds with GitHub? No
# ? File build/index.html already exists. Overwrite? No
```

### 2. Configure firebase.json

```json
{
  "hosting": {
    "public": "build",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(jpg|jpeg|gif|png|svg|webp|ico)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=604800, public"
          }
        ]
      },
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000, public, immutable"
          }
        ]
      },
      {
        "source": "**/*.@(json|xml|txt)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=3600, public"
          }
        ]
      },
      {
        "source": "**/*",
        "headers": [
          {
            "key": "X-Frame-Options",
            "value": "SAMEORIGIN"
          },
          {
            "key": "X-Content-Type-Options",
            "value": "nosniff"
          },
          {
            "key": "Referrer-Policy",
            "value": "strict-origin-when-cross-origin"
          },
          {
            "key": "Permissions-Policy",
            "value": "geolocation=(), microphone=(), camera=()"
          }
        ]
      }
    ],
    "redirects": [
      {
        "source": "/api/**",
        "destination": "https://api.2fastudio.app/:splat",
        "type": 301
      }
    ]
  }
}
```

### 3. Deploy to Firebase

```bash
# Deploy to production
firebase deploy --only hosting

# Deploy to staging
firebase use staging
firebase deploy --only hosting

# Deploy with custom message
firebase deploy --only hosting -m "Version 1.2.3 release"

# Preview before deploying
firebase hosting:channel:deploy preview
```

## Custom Domain Setup

### 1. Add Custom Domain in Firebase

```bash
# Via CLI
firebase hosting:sites:create 2fastudio-app
firebase target:apply hosting production 2fastudio-app

# Or via Console
# 1. Go to Firebase Console > Hosting
# 2. Click "Add custom domain"
# 3. Enter: app.2fastudio.com
# 4. Follow verification steps
```

### 2. DNS Configuration

Add these records to your DNS:

```
Type    Name    Value                   TTL
A       app     151.101.1.195          300
A       app     151.101.65.195         300
TXT     app     firebase=2fastudio-app  300
```

### 3. SSL Certificate

Firebase automatically provisions SSL certificates via Let's Encrypt:
- Automatic renewal
- No configuration needed
- Wildcard support

## CloudFlare Integration

### 1. CloudFlare Setup

```yaml
# CloudFlare Page Rules
URL: app.2fastudio.com/*
Settings:
  - Cache Level: Standard
  - Edge Cache TTL: 1 month
  - Browser Cache TTL: 1 year
  - Always Use HTTPS: On
  - Automatic HTTPS Rewrites: On
  - Rocket Loader: Off
```

### 2. CloudFlare Workers (Optional)

```javascript
// workers/security-headers.js
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const response = await fetch(request)
  const newHeaders = new Headers(response.headers)
  
  // Security headers
  newHeaders.set('X-Frame-Options', 'SAMEORIGIN')
  newHeaders.set('X-Content-Type-Options', 'nosniff')
  newHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  newHeaders.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
  
  // CSP Header
  newHeaders.set('Content-Security-Policy', `
    default-src 'self';
    script-src 'self' 'unsafe-inline' https://www.googletagmanager.com;
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https:;
    font-src 'self' data:;
    connect-src 'self' https://*.firebaseio.com wss://*.firebaseio.com https://*.googleapis.com;
    frame-ancestors 'none';
  `.replace(/\s+/g, ' ').trim())
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  })
}
```

## Performance Optimization

### 1. Build Optimization

```javascript
// webpack.config.js additions
module.exports = {
  optimization: {
    usedExports: true,
    sideEffects: false,
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
          reuseExistingChunk: true,
        },
        common: {
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true,
        },
      },
    },
  },
  performance: {
    maxEntrypointSize: 300000,
    maxAssetSize: 250000,
    hints: 'warning',
  },
};
```

### 2. Service Worker Configuration

```javascript
// src/serviceWorkerRegistration.js
const config = {
  onSuccess: (registration) => {
    console.log('Service Worker registered');
    // Check for updates every hour
    setInterval(() => {
      registration.update();
    }, 3600000);
  },
  onUpdate: (registration) => {
    const waitingServiceWorker = registration.waiting;
    if (waitingServiceWorker) {
      waitingServiceWorker.addEventListener('statechange', (event) => {
        if (event.target.state === 'activated') {
          window.location.reload();
        }
      });
      waitingServiceWorker.postMessage({ type: 'SKIP_WAITING' });
    }
  },
};

serviceWorkerRegistration.register(config);
```

### 3. Lazy Loading

```javascript
// src/App.js
import React, { lazy, Suspense } from 'react';
import LoadingSpinner from './components/LoadingSpinner';

// Lazy load routes
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));
const Backup = lazy(() => import('./pages/Backup'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/backup" element={<Backup />} />
      </Routes>
    </Suspense>
  );
}
```

## Monitoring Setup

### 1. Firebase Performance Monitoring

```javascript
// src/firebase/performance.js
import { getPerformance } from 'firebase/performance';
import { app } from './config';

const performance = getPerformance(app);

// Custom traces
export const trace = (name) => performance.trace(name);

// Automatic monitoring includes:
// - Page load performance
// - Network request latency
// - JavaScript errors
// - Custom traces
```

### 2. Google Analytics 4

```javascript
// src/analytics/config.js
import { gtag } from './gtag';

export const Analytics = {
  pageView: (path) => {
    gtag('config', process.env.REACT_APP_GA_MEASUREMENT_ID, {
      page_path: path,
    });
  },
  
  event: (action, parameters) => {
    gtag('event', action, parameters);
  },
  
  timing: (name, value) => {
    gtag('event', 'timing_complete', {
      name,
      value,
      event_category: 'Performance',
    });
  },
};
```

### 3. Error Tracking with Sentry

```javascript
// src/index.js
import * as Sentry from '@sentry/react';
import { Integrations } from '@sentry/tracing';

Sentry.init({
  dsn: process.env.REACT_APP_SENTRY_DSN,
  environment: process.env.REACT_APP_ENVIRONMENT,
  integrations: [
    new Integrations.BrowserTracing(),
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

## Deployment Automation

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy-web.yml
name: Deploy Web App

on:
  push:
    branches: [main]
    paths:
      - 'src/**'
      - 'public/**'
      - 'package.json'
      - 'yarn.lock'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'yarn'
      
      - name: Install dependencies
        run: yarn install --frozen-lockfile
      
      - name: Run tests
        run: yarn test:ci
      
      - name: Build application
        run: yarn build
        env:
          REACT_APP_FIREBASE_API_KEY: ${{ secrets.FIREBASE_API_KEY }}
          REACT_APP_FIREBASE_AUTH_DOMAIN: ${{ secrets.FIREBASE_AUTH_DOMAIN }}
          REACT_APP_FIREBASE_PROJECT_ID: ${{ secrets.FIREBASE_PROJECT_ID }}
          REACT_APP_FIREBASE_STORAGE_BUCKET: ${{ secrets.FIREBASE_STORAGE_BUCKET }}
          REACT_APP_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.FIREBASE_MESSAGING_SENDER_ID }}
          REACT_APP_FIREBASE_APP_ID: ${{ secrets.FIREBASE_APP_ID }}
      
      - name: Deploy to Firebase
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: live
          projectId: ${{ secrets.FIREBASE_PROJECT_ID }}
```

## Rollback Procedures

### 1. Quick Rollback

```bash
# List recent deployments
firebase hosting:releases:list

# Rollback to previous version
firebase hosting:rollback

# Rollback to specific version
firebase hosting:clone SOURCE_VERSION_ID TARGET_SITE_ID
```

### 2. Manual Rollback

```bash
# Checkout previous version
git checkout tags/v1.2.2

# Rebuild and deploy
yarn install
yarn build
firebase deploy --only hosting
```

### 3. Emergency Procedures

```javascript
// emergency-maintenance.html
<!DOCTYPE html>
<html>
<head>
  <title>Maintenance - 2FA Studio</title>
  <style>
    body {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      font-family: system-ui;
      background: #f5f5f5;
    }
    .maintenance {
      text-align: center;
      padding: 2rem;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
  </style>
</head>
<body>
  <div class="maintenance">
    <h1>Scheduled Maintenance</h1>
    <p>We'll be back shortly. Thank you for your patience.</p>
    <p>Expected completion: <span id="time">30 minutes</span></p>
  </div>
</body>
</html>
```

## Post-Deployment Verification

### 1. Automated Tests

```javascript
// e2e/deployment-smoke-test.js
describe('Deployment Smoke Tests', () => {
  it('should load the application', async () => {
    await page.goto('https://app.2fastudio.com');
    await expect(page).toHaveTitle('2FA Studio');
  });
  
  it('should have correct security headers', async () => {
    const response = await page.goto('https://app.2fastudio.com');
    const headers = response.headers();
    
    expect(headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(headers['x-content-type-options']).toBe('nosniff');
  });
  
  it('should load critical resources', async () => {
    const resources = await page.evaluate(() => 
      performance.getEntriesByType('resource')
        .filter(r => r.initiatorType === 'script' || r.initiatorType === 'css')
        .map(r => ({ name: r.name, status: r.transferSize > 0 }))
    );
    
    resources.forEach(resource => {
      expect(resource.status).toBe(true);
    });
  });
});
```

### 2. Manual Checklist

- [ ] Application loads without errors
- [ ] Authentication works
- [ ] Core features functional
- [ ] PWA installable
- [ ] Performance metrics acceptable
- [ ] Analytics tracking
- [ ] Error reporting active
- [ ] SSL certificate valid

## Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Clear cache and rebuild
   rm -rf node_modules build
   yarn cache clean
   yarn install
   yarn build
   ```

2. **Deployment Failures**
   ```bash
   # Check Firebase status
   firebase projects:list
   firebase use PROJECT_ID
   firebase deploy --debug
   ```

3. **Domain Issues**
   - Verify DNS propagation
   - Check SSL certificate status
   - Clear CloudFlare cache
   - Verify Firebase hosting config

### Support Resources

- Firebase Status: status.firebase.google.com
- CloudFlare Status: cloudflarestatus.com
- Build Logs: GitHub Actions tab
- Error Logs: Firebase Console > Functions > Logs