---
sidebar_position: 4
---

# Extension Deployment

Complete guide for building and publishing the 2FA Studio Chrome extension to the Chrome Web Store.

## Prerequisites

### Development Setup

```bash
# Required tools
node --version  # v16.0.0 or higher
yarn --version  # v1.22.0 or higher

# Chrome/Chromium browser for testing
google-chrome --version  # 88 or higher
```

### Developer Accounts

- Chrome Web Store Developer account ($5 one-time fee)
- Google Cloud Platform account (for OAuth if needed)
- Privacy policy hosted online
- Terms of service (optional but recommended)

## Extension Architecture

### Project Structure

```
extension/
├── manifest.json          # Extension configuration
├── background/           # Service worker scripts
│   ├── service-worker.js
│   └── sync.js
├── content/             # Content scripts
│   ├── detector.js
│   └── injector.js
├── popup/               # Extension popup
│   ├── index.html
│   ├── popup.js
│   └── popup.css
├── options/             # Options page
│   ├── index.html
│   ├── options.js
│   └── options.css
├── assets/              # Icons and images
│   ├── icon-16.png
│   ├── icon-32.png
│   ├── icon-48.png
│   ├── icon-128.png
│   └── icon-512.png
├── lib/                 # Shared libraries
│   ├── crypto.js
│   ├── storage.js
│   └── communication.js
└── _locales/           # Internationalization
    └── en/
        └── messages.json
```

## Building the Extension

### 1. Configure Manifest V3

```json
{
  "manifest_version": 3,
  "name": "2FA Studio",
  "version": "1.0.0",
  "description": "Secure 2FA authenticator with cloud sync",
  "author": "2FA Studio Team",
  "homepage_url": "https://2fastudio.app",
  
  "permissions": [
    "storage",
    "alarms",
    "notifications",
    "clipboardWrite"
  ],
  
  "host_permissions": [
    "https://*/*",
    "http://localhost/*"
  ],
  
  "background": {
    "service_worker": "background/service-worker.js",
    "type": "module"
  },
  
  "content_scripts": [
    {
      "matches": ["https://*/*"],
      "js": ["content/detector.js"],
      "css": ["content/styles.css"],
      "run_at": "document_idle",
      "all_frames": true
    }
  ],
  
  "action": {
    "default_popup": "popup/index.html",
    "default_icon": {
      "16": "assets/icon-16.png",
      "32": "assets/icon-32.png",
      "48": "assets/icon-48.png",
      "128": "assets/icon-128.png"
    },
    "default_title": "2FA Studio"
  },
  
  "options_page": "options/index.html",
  
  "icons": {
    "16": "assets/icon-16.png",
    "32": "assets/icon-32.png",
    "48": "assets/icon-48.png",
    "128": "assets/icon-128.png",
    "512": "assets/icon-512.png"
  },
  
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  },
  
  "web_accessible_resources": [
    {
      "resources": ["assets/*", "lib/injected.js"],
      "matches": ["https://*/*"]
    }
  ],
  
  "commands": {
    "quick-search": {
      "suggested_key": {
        "default": "Ctrl+Shift+F",
        "mac": "Command+Shift+F"
      },
      "description": "Quick search for 2FA codes"
    },
    "_execute_action": {
      "suggested_key": {
        "default": "Ctrl+Shift+Y",
        "mac": "Command+Shift+Y"
      }
    }
  },
  
  "minimum_chrome_version": "88"
}
```

### 2. Build Scripts

```json
// package.json
{
  "name": "2fa-studio-extension",
  "version": "1.0.0",
  "scripts": {
    "dev": "webpack --mode development --watch",
    "build": "webpack --mode production",
    "test": "jest",
    "lint": "eslint src/**/*.js",
    "package": "yarn build && node scripts/package.js",
    "analyze": "webpack-bundle-analyzer dist/stats.json"
  },
  "devDependencies": {
    "@babel/core": "^7.20.0",
    "@babel/preset-env": "^7.20.0",
    "babel-loader": "^9.0.0",
    "copy-webpack-plugin": "^11.0.0",
    "css-loader": "^6.7.0",
    "eslint": "^8.0.0",
    "html-webpack-plugin": "^5.5.0",
    "mini-css-extract-plugin": "^2.7.0",
    "terser-webpack-plugin": "^5.3.0",
    "webpack": "^5.75.0",
    "webpack-cli": "^5.0.0",
    "zip-webpack-plugin": "^4.0.1"
  }
}
```

### 3. Webpack Configuration

```javascript
// webpack.config.js
const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const ZipPlugin = require('zip-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    entry: {
      'background/service-worker': './src/background/service-worker.js',
      'content/detector': './src/content/detector.js',
      'popup/popup': './src/popup/popup.js',
      'options/options': './src/options/options.js',
    },
    
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      clean: true,
    },
    
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env'],
            },
          },
        },
        {
          test: /\.css$/,
          use: [
            MiniCssExtractPlugin.loader,
            'css-loader',
          ],
        },
        {
          test: /\.(png|jpg|gif|svg)$/,
          type: 'asset/resource',
          generator: {
            filename: 'assets/[name][ext]',
          },
        },
      ],
    },
    
    plugins: [
      new CopyWebpackPlugin({
        patterns: [
          { from: 'src/manifest.json' },
          { from: 'src/assets', to: 'assets' },
          { from: 'src/_locales', to: '_locales' },
        ],
      }),
      
      new HtmlWebpackPlugin({
        template: 'src/popup/index.html',
        filename: 'popup/index.html',
        chunks: ['popup/popup'],
      }),
      
      new HtmlWebpackPlugin({
        template: 'src/options/index.html',
        filename: 'options/index.html',
        chunks: ['options/options'],
      }),
      
      new MiniCssExtractPlugin({
        filename: '[name].css',
      }),
      
      ...(isProduction ? [
        new ZipPlugin({
          filename: `2fa-studio-${process.env.npm_package_version}.zip`,
          path: '../releases',
        }),
      ] : []),
    ],
    
    optimization: {
      minimize: isProduction,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: true,
              drop_debugger: true,
            },
          },
        }),
      ],
    },
    
    devtool: isProduction ? false : 'cheap-module-source-map',
  };
};
```

### 4. Build Process

```bash
# Development build with hot reload
yarn dev

# Production build
yarn build

# Create release package
yarn package

# Output structure
dist/
├── manifest.json
├── background/
│   └── service-worker.js
├── content/
│   ├── detector.js
│   └── styles.css
├── popup/
│   ├── index.html
│   ├── popup.js
│   └── popup.css
├── options/
│   ├── index.html
│   ├── options.js
│   └── options.css
├── assets/
│   └── icons...
└── _locales/
    └── en/
        └── messages.json

releases/
└── 2fa-studio-1.0.0.zip
```

## Chrome Web Store Submission

### 1. Create Developer Account

1. Visit [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/developer/dashboard)
2. Pay one-time $5 registration fee
3. Complete account verification
4. Accept developer agreement

### 2. Prepare Store Listing

#### Required Assets

```yaml
images:
  - store_icon: 128x128px PNG
  - screenshots:
    - 1280x800px or 640x400px
    - Minimum 1, maximum 5
    - Show key features
  - promotional_images:
    - small_tile: 440x280px (optional)
    - large_tile: 920x680px (optional)
    - marquee: 1400x560px (optional)

videos:
  - youtube_url: Optional promotional video
  - duration: 30 seconds to 2 minutes
```

#### Store Listing Content

```yaml
name: "2FA Studio - Authenticator"
summary: "Secure 2FA codes with cloud sync and autofill"
description: |
  2FA Studio is a secure two-factor authentication extension that:
  
  ✓ Syncs with your mobile app
  ✓ Auto-fills 2FA codes
  ✓ Encrypted cloud backup
  ✓ Works offline
  ✓ Privacy-focused
  
  Features:
  - Quick search (Ctrl+Shift+F)
  - Domain auto-detection
  - Biometric security
  - Multiple account support
  - Dark mode
  
  Security:
  - End-to-end encryption
  - Zero-knowledge architecture
  - Local code generation
  - No tracking

category: "Productivity"
language: "English"
```

### 3. Privacy Policy

```markdown
# Privacy Policy for 2FA Studio Extension

Last updated: [Date]

## Data Collection
- We collect minimal data necessary for functionality
- All data is encrypted before storage
- No personal information is shared with third parties

## Permissions Used
- **Storage**: Save encrypted 2FA accounts locally
- **Alarms**: Schedule code refresh
- **Notifications**: Alert for auto-fill availability
- **Clipboard**: Copy codes (auto-clear after 30 seconds)

## Data Security
- AES-256-GCM encryption
- Keys never leave your device
- Optional cloud sync with end-to-end encryption

## Contact
privacy@2fastudio.app
```

### 4. Submit for Review

```bash
# Package extension
cd extension
yarn package

# Upload via dashboard
1. Go to Chrome Web Store Developer Dashboard
2. Click "New Item"
3. Upload 2fa-studio-1.0.0.zip
4. Fill in store listing details
5. Upload screenshots and promotional images
6. Set visibility (Public/Unlisted)
7. Submit for review
```

## Automated Deployment

### GitHub Actions Workflow

```yaml
# .github/workflows/extension-deploy.yml
name: Extension Deployment

on:
  push:
    tags:
      - 'ext-v*'

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
        run: |
          cd extension
          yarn install --frozen-lockfile
      
      - name: Run tests
        run: |
          cd extension
          yarn test
          yarn lint
      
      - name: Build extension
        run: |
          cd extension
          yarn build
        env:
          NODE_ENV: production
          VERSION: ${{ github.ref_name }}
      
      - name: Package extension
        run: |
          cd extension
          yarn package
      
      - name: Upload to Chrome Web Store
        uses: mnao305/chrome-extension-upload@v4.0.1
        with:
          file-path: extension/releases/2fa-studio-*.zip
          extension-id: ${{ secrets.EXTENSION_ID }}
          client-id: ${{ secrets.CHROME_CLIENT_ID }}
          client-secret: ${{ secrets.CHROME_CLIENT_SECRET }}
          refresh-token: ${{ secrets.CHROME_REFRESH_TOKEN }}
      
      - name: Create Release
        uses: actions/create-release@v1
        with:
          tag_name: ${{ github.ref }}
          release_name: Extension Release ${{ github.ref }}
          body: |
            Chrome Extension release
            See [Chrome Web Store](https://chrome.google.com/webstore/detail/${{ secrets.EXTENSION_ID }})
          draft: false
          prerelease: false
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Chrome Web Store API Setup

```javascript
// scripts/deploy.js
const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');

async function uploadExtension() {
  const auth = new google.auth.OAuth2(
    process.env.CHROME_CLIENT_ID,
    process.env.CHROME_CLIENT_SECRET,
    'urn:ietf:wg:oauth:2.0:oob'
  );
  
  auth.setCredentials({
    refresh_token: process.env.CHROME_REFRESH_TOKEN
  });
  
  const webstore = google.chromewebstore({
    version: 'v1.1',
    auth: auth
  });
  
  // Read extension package
  const packagePath = path.join(__dirname, '../releases/2fa-studio.zip');
  const packageData = await fs.readFile(packagePath);
  
  // Upload new version
  const uploadResponse = await webstore.items.update({
    itemId: process.env.EXTENSION_ID,
    media: {
      mimeType: 'application/zip',
      body: packageData
    }
  });
  
  console.log('Upload response:', uploadResponse.data);
  
  // Publish the uploaded version
  const publishResponse = await webstore.items.publish({
    itemId: process.env.EXTENSION_ID
  });
  
  console.log('Publish response:', publishResponse.data);
}

uploadExtension().catch(console.error);
```

## Testing Strategy

### 1. Local Testing

```bash
# Load unpacked extension
1. Open chrome://extensions/
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select extension/dist folder

# Test scenarios
- Install/uninstall
- Popup functionality
- Content script injection
- Auto-fill detection
- Keyboard shortcuts
- Options page
- Cross-origin requests
```

### 2. Automated Testing

```javascript
// tests/popup.test.js
const puppeteer = require('puppeteer');
const path = require('path');

describe('Extension Popup', () => {
  let browser;
  let page;
  
  beforeAll(async () => {
    const extensionPath = path.join(__dirname, '../dist');
    browser = await puppeteer.launch({
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`
      ]
    });
  });
  
  afterAll(async () => {
    await browser.close();
  });
  
  test('should open popup', async () => {
    const extensionId = 'your-extension-id';
    page = await browser.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup/index.html`);
    
    const title = await page.$eval('h1', el => el.textContent);
    expect(title).toBe('2FA Studio');
  });
  
  test('should search accounts', async () => {
    await page.type('#search', 'google');
    await page.waitForSelector('.account-item');
    
    const results = await page.$$('.account-item');
    expect(results.length).toBeGreaterThan(0);
  });
});
```

### 3. Beta Testing

```json
// manifest.json for beta channel
{
  "version": "1.0.0",
  "version_name": "1.0.0-beta.1",
  "name": "2FA Studio (Beta)",
  "update_url": "https://2fastudio.app/extension/beta/updates.xml"
}
```

## Update Strategy

### 1. Version Management

```javascript
// scripts/version.js
const fs = require('fs');
const path = require('path');

function bumpVersion(type = 'patch') {
  const manifestPath = path.join(__dirname, '../src/manifest.json');
  const packagePath = path.join(__dirname, '../package.json');
  
  const manifest = JSON.parse(fs.readFileSync(manifestPath));
  const package = JSON.parse(fs.readFileSync(packagePath));
  
  const [major, minor, patch] = manifest.version.split('.').map(Number);
  
  let newVersion;
  switch (type) {
    case 'major':
      newVersion = `${major + 1}.0.0`;
      break;
    case 'minor':
      newVersion = `${major}.${minor + 1}.0`;
      break;
    case 'patch':
      newVersion = `${major}.${minor}.${patch + 1}`;
      break;
  }
  
  manifest.version = newVersion;
  package.version = newVersion;
  
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  fs.writeFileSync(packagePath, JSON.stringify(package, null, 2));
  
  console.log(`Version bumped to ${newVersion}`);
}
```

### 2. Update Notifications

```javascript
// background/update-handler.js
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'update') {
    const previousVersion = details.previousVersion;
    const currentVersion = chrome.runtime.getManifest().version;
    
    // Show update notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'assets/icon-128.png',
      title: '2FA Studio Updated',
      message: `Updated from v${previousVersion} to v${currentVersion}`,
      buttons: [
        { title: 'View Changes' }
      ]
    });
    
    // Open changelog on button click
    chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
      if (buttonIndex === 0) {
        chrome.tabs.create({
          url: `https://2fastudio.app/changelog#v${currentVersion}`
        });
      }
    });
  }
});
```

## Security Considerations

### 1. Content Security Policy

```javascript
// Strict CSP for extension pages
const csp = {
  "script-src": ["'self'"],
  "style-src": ["'self'", "'unsafe-inline'"],
  "img-src": ["'self'", "data:", "https:"],
  "font-src": ["'self'"],
  "connect-src": ["'self'", "https://api.2fastudio.app"],
  "frame-ancestors": ["'none'"],
  "form-action": ["'none'"],
  "base-uri": ["'self'"]
};
```

### 2. Permissions Justification

```markdown
## Permission Justifications

### storage
Required to save encrypted 2FA accounts and user preferences locally.

### alarms
Used to schedule periodic tasks like refreshing TOTP codes every 30 seconds.

### notifications
Shows alerts when 2FA codes are auto-filled or when updates are available.

### clipboardWrite
Allows users to copy 2FA codes to clipboard with automatic clearing after 30 seconds.

### host_permissions
Needed to detect 2FA input fields on websites and enable auto-fill functionality.
```

## Monitoring and Analytics

### 1. Error Tracking

```javascript
// lib/error-tracker.js
class ErrorTracker {
  static async report(error, context = {}) {
    if (process.env.NODE_ENV === 'production') {
      try {
        await fetch('https://api.2fastudio.app/errors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: error.message,
            stack: error.stack,
            version: chrome.runtime.getManifest().version,
            browser: navigator.userAgent,
            context
          })
        });
      } catch (e) {
        console.error('Failed to report error:', e);
      }
    }
  }
}

// Global error handler
self.addEventListener('error', (event) => {
  ErrorTracker.report(event.error, {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
});
```

### 2. Usage Analytics

```javascript
// lib/analytics.js
class Analytics {
  static async track(event, properties = {}) {
    // Privacy-respecting analytics
    const payload = {
      event,
      properties: {
        ...properties,
        version: chrome.runtime.getManifest().version,
        timestamp: Date.now()
      }
    };
    
    // Store locally first
    await chrome.storage.local.set({
      [`analytics_${Date.now()}`]: payload
    });
    
    // Batch send when online
    if (navigator.onLine) {
      await this.sendBatch();
    }
  }
  
  static async sendBatch() {
    const items = await chrome.storage.local.get();
    const analytics = Object.entries(items)
      .filter(([key]) => key.startsWith('analytics_'))
      .map(([, value]) => value);
    
    if (analytics.length > 0) {
      await fetch('https://api.2fastudio.app/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analytics)
      });
      
      // Clear sent analytics
      const keys = Object.keys(items)
        .filter(key => key.startsWith('analytics_'));
      await chrome.storage.local.remove(keys);
    }
  }
}
```

## Troubleshooting

### Common Issues

1. **Extension not loading**
   - Check manifest.json syntax
   - Verify all file paths
   - Check console for errors

2. **Permissions errors**
   - Ensure all required permissions declared
   - Check host_permissions patterns
   - Verify CSP configuration

3. **Update failures**
   - Increment version number
   - Clear browser extension cache
   - Check for manifest errors

### Debug Tools

```javascript
// Enable verbose logging in development
if (process.env.NODE_ENV === 'development') {
  chrome.storage.local.set({ debug: true });
  
  // Log all Chrome API calls
  const apis = ['storage', 'alarms', 'notifications'];
  apis.forEach(api => {
    if (chrome[api]) {
      Object.keys(chrome[api]).forEach(method => {
        if (typeof chrome[api][method] === 'function') {
          const original = chrome[api][method];
          chrome[api][method] = function(...args) {
            console.log(`chrome.${api}.${method}`, args);
            return original.apply(this, args);
          };
        }
      });
    }
  });
}
```

## Best Practices

1. **Security**
   - Never inject scripts from external sources
   - Validate all user inputs
   - Use strict CSP policies
   - Encrypt sensitive data

2. **Performance**
   - Lazy load non-critical resources
   - Use Chrome storage efficiently
   - Minimize content script impact
   - Optimize bundle size

3. **User Experience**
   - Provide clear onboarding
   - Handle errors gracefully
   - Respect user privacy
   - Fast and responsive UI

4. **Maintenance**
   - Regular security audits
   - Dependency updates
   - User feedback integration
   - Performance monitoring