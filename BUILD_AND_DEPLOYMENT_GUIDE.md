# 2FA Studio - Complete Build and Deployment Guide

This comprehensive guide covers all aspects of building and deploying the 2FA Studio Capacitor app for iOS and Android platforms.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Development Setup](#development-setup)
- [Build Configuration](#build-configuration)
- [Icon and Splash Screen Generation](#icon-and-splash-screen-generation)
- [iOS Build Process](#ios-build-process)
- [Android Build Process](#android-build-process)
- [Testing](#testing)
- [App Store Deployment](#app-store-deployment)
- [Google Play Store Deployment](#google-play-store-deployment)
- [CI/CD Pipeline](#cicd-pipeline)
- [Troubleshooting](#troubleshooting)
- [Security Considerations](#security-considerations)

## Prerequisites

### Development Environment

#### Required Software
- **Node.js**: Version 22.17.0+ (use .nvmrc file)
- **Yarn**: Latest version
- **Capacitor CLI**: Latest version
- **Git**: For version control

#### iOS Development (macOS only)
- **Xcode**: Version 15.0+
- **iOS Simulator**: For testing
- **Apple Developer Account**: For app signing and distribution
- **CocoaPods**: For iOS dependencies

#### Android Development
- **Android Studio**: Latest version
- **Android SDK**: API level 21+ (minimum), API level 34+ (target)
- **Java Development Kit**: Version 17+
- **Gradle**: Version 8.0+
- **Android NDK**: For native code compilation

### Development Tools
```bash
# Install Node.js using nvm
nvm install 22.17.0
nvm use 22.17.0

# Install Yarn
npm install -g yarn

# Install Capacitor CLI
yarn global add @capacitor/cli

# Verify installations
node --version  # Should be 22.17.0+
yarn --version
npx cap --version
```

## Project Structure

```
2fa-studio/
├── src/                          # React source code
├── public/                       # Public assets
├── dist/                         # Built web app (generated)
├── android/                      # Android platform
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml
│   │   │   └── res/             # Android resources
│   │   └── build.gradle
│   └── gradle.properties
├── ios/                          # iOS platform
│   └── App/
│       ├── App/
│       │   ├── Info.plist
│       │   ├── App.entitlements
│       │   └── Assets.xcassets/
│       ├── App.xcworkspace
│       └── ExportOptions.plist
├── scripts/                      # Build and deployment scripts
│   ├── build-release.sh
│   ├── generate-icons.js
│   └── generate-splash.js
├── store-config/                 # App store metadata
│   ├── app-store-metadata.json
│   └── play-store-metadata.json
├── capacitor.config.ts           # Capacitor configuration
└── package.json                  # Project dependencies
```

## Development Setup

### 1. Clone and Initialize
```bash
# Clone the repository
git clone <repository-url>
cd 2fa-studio

# Install dependencies
yarn install

# Add Capacitor platforms (if not already added)
npx cap add ios
npx cap add android
```

### 2. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
# VITE_FIREBASE_API_KEY=your_api_key
# VITE_FIREBASE_PROJECT_ID=your_project_id
# VITE_APP_ENV=development
```

### 3. Development Server
```bash
# Start development server
yarn dev

# In another terminal, run on device/simulator
yarn cap run ios      # iOS
yarn cap run android  # Android
```

## Build Configuration

### Capacitor Configuration
The main configuration is in `capacitor.config.ts`:

```typescript
export default {
  appId: 'com.aoneahsan.twofastudio',
  appName: '2FA Studio',
  webDir: 'dist',
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    // ... other plugin configurations
  }
}
```

### iOS Configuration Files

#### Info.plist (`ios/App/App/Info.plist`)
- App identity and metadata
- Permission usage descriptions
- URL schemes and deep links
- Background modes and capabilities
- Security and privacy settings

#### Entitlements (`ios/App/App/App.entitlements`)
- App groups for data sharing
- Keychain access groups
- Push notifications
- CloudKit and iCloud
- Associated domains
- Background processing

#### Export Options (`ios/App/ExportOptions.plist`)
- Distribution method configuration
- Code signing settings
- App thinning and bitcode settings

### Android Configuration Files

#### AndroidManifest.xml
- Permissions and hardware features
- Activities and intent filters
- Services and receivers
- Deep links and file associations
- Backup and security configuration

#### Gradle Configuration
- Build types and flavors
- Dependencies and repositories
- Signing configuration
- ProGuard/R8 settings

## Icon and Splash Screen Generation

### Automated Generation
```bash
# Generate all icons for all platforms
node scripts/generate-icons.js

# Generate all splash screens
node scripts/generate-splash.js
```

### Manual Icon Requirements

#### iOS Icons
- **App Store**: 1024×1024 (PNG, no alpha)
- **iPhone App**: 180×180, 120×120
- **iPad App**: 167×167, 152×152
- **Settings**: 87×87, 58×58
- **Spotlight**: 120×120, 80×80
- **Notifications**: 60×60, 40×40

#### Android Icons
- **Launcher**: 48dp, 72dp, 96dp, 144dp, 192dp
- **Adaptive**: Background + Foreground (108dp each)
- **Notification**: 24dp, 36dp, 48dp, 72dp, 96dp (white silhouette)
- **Play Store**: 512×512

### Splash Screen Requirements

#### iOS
- Universal: 2732×2732 (for all devices)
- Device-specific sizes for older iOS versions

#### Android
- Portrait: 320×480 to 1280×1920
- Landscape: 480×320 to 1920×1280
- Multiple densities (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi)

## iOS Build Process

### 1. Development Build
```bash
# Build web app
yarn build

# Sync with Capacitor
npx cap sync ios

# Open in Xcode
npx cap open ios
```

### 2. Release Build (Automated)
```bash
# Build for App Store
./scripts/build-release.sh ios production

# Build for TestFlight/Ad-hoc
./scripts/build-release.sh ios staging
```

### 3. Manual Release Build
```bash
cd ios/App

# Clean build
xcodebuild clean -workspace App.xcworkspace -scheme App -configuration Release

# Archive
xcodebuild archive \
  -workspace App.xcworkspace \
  -scheme App \
  -configuration Release \
  -archivePath "build/App.xcarchive" \
  -destination "generic/platform=iOS"

# Export IPA
xcodebuild -exportArchive \
  -archivePath "build/App.xcarchive" \
  -exportPath "build/" \
  -exportOptionsPlist "ExportOptions.plist"
```

### Code Signing Requirements
1. **Apple Developer Account**: Team ID and certificates
2. **Distribution Certificate**: For app signing
3. **Provisioning Profiles**:
   - Development: For testing on devices
   - Ad-hoc: For beta distribution
   - App Store: For App Store submission

### Xcode Project Settings
- **Bundle Identifier**: `com.aoneahsan.twofastudio`
- **Team**: Your Apple Developer Team
- **Code Signing Identity**: iPhone Distribution
- **Provisioning Profile**: Match your distribution method
- **Deployment Target**: iOS 14.0+

## Android Build Process

### 1. Development Build
```bash
# Build web app
yarn build

# Sync with Capacitor
npx cap sync android

# Open in Android Studio
npx cap open android
```

### 2. Release Build (Automated)
```bash
# Build APK and AAB
./scripts/build-release.sh android production

# Build staging version
./scripts/build-release.sh android staging
```

### 3. Manual Release Build
```bash
cd android

# Clean build
./gradlew clean

# Build APK
./gradlew assembleRelease

# Build AAB (for Play Store)
./gradlew bundleRelease
```

### Code Signing Setup

#### 1. Create Keystore
```bash
keytool -genkey -v -keystore 2fa-studio-release.keystore \
  -alias 2fa-studio-key \
  -keyalg RSA \
  -keysize 2048 \
  -validity 25000
```

#### 2. Configure Gradle
Create `android/keystore.properties`:
```properties
storeFile=path/to/2fa-studio-release.keystore
storePassword=YOUR_STORE_PASSWORD
keyAlias=2fa-studio-key
keyPassword=YOUR_KEY_PASSWORD
```

Update `android/app/build.gradle`:
```gradle
signingConfigs {
    release {
        def keystoreProperties = new Properties()
        keystoreProperties.load(new FileInputStream(rootProject.file("keystore.properties")))
        
        keyAlias keystoreProperties['keyAlias']
        keyPassword keystoreProperties['keyPassword']
        storeFile file(keystoreProperties['storeFile'])
        storePassword keystoreProperties['storePassword']
    }
}

buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled true
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

## Testing

### Unit Testing
```bash
# Run unit tests
yarn test

# Run tests with coverage
yarn test:coverage

# Run tests in watch mode
yarn test:watch
```

### E2E Testing
```bash
# Run Cypress tests
yarn cypress:run

# Open Cypress UI
yarn cypress:open
```

### Device Testing

#### iOS Testing
```bash
# Run on iOS simulator
yarn cap run ios

# Run on physical device (requires provisioning)
yarn cap run ios --target="Your iPhone"
```

#### Android Testing
```bash
# Run on Android emulator
yarn cap run android

# Run on physical device
yarn cap run android --target="Your Android Device"
```

### Testing Checklist
- [ ] App launches without crashes
- [ ] All permissions work correctly
- [ ] Camera QR scanning functions
- [ ] Biometric authentication works
- [ ] Push notifications are received
- [ ] Backup and sync functionality
- [ ] Deep links and URL schemes
- [ ] Offline functionality
- [ ] Performance on low-end devices

## App Store Deployment

### 1. Prepare App Store Connect

#### App Information
- **App Name**: 2FA Studio
- **Bundle ID**: com.aoneahsan.twofastudio
- **Category**: Utilities
- **Content Rating**: 4+

#### App Privacy
Configure data collection practices based on app functionality:
- Email addresses (for account management)
- Usage data (for analytics)
- No sensitive 2FA data collection

### 2. Upload Build
```bash
# Using build script
./scripts/build-release.sh ios production

# Upload to App Store Connect (requires Xcode or Transporter)
xcrun altool --upload-app \
  --type ios \
  --file "ios/App/build/App.ipa" \
  --username "your-apple-id" \
  --password "app-specific-password"
```

### 3. App Store Review

#### Review Information
- **Demo Account**: Provide test credentials
- **Review Notes**: Explain 2FA functionality
- **Screenshots**: All required device sizes
- **App Preview**: Optional promotional video

#### Common Review Issues
- **Permission Usage**: Clearly explain why permissions are needed
- **In-App Purchases**: Properly implement subscription management
- **Content Guidelines**: Ensure compliance with App Store guidelines

### 4. Release Management
- **Phased Release**: Gradually roll out to users
- **Version Updates**: Plan for regular security updates
- **Crash Monitoring**: Monitor app performance post-release

## Google Play Store Deployment

### 1. Google Play Console Setup

#### App Details
- **App Name**: 2FA Studio - Secure Authenticator
- **Package Name**: com.aoneahsan.twofastudio
- **Category**: Tools
- **Content Rating**: Everyone

#### Store Listing
- **Screenshots**: Phone, Tablet, Wear OS
- **Feature Graphic**: 1024×500 promotional image
- **Privacy Policy**: Required for all apps

### 2. Upload Build
```bash
# Build AAB (recommended for Play Store)
./scripts/build-release.sh android production

# Upload using Google Play Console or Play Console API
```

### 3. Release Management

#### Release Tracks
- **Internal**: For internal testing
- **Alpha**: For small group testing
- **Beta**: For larger beta testing
- **Production**: For public release

#### Gradual Rollout
```bash
# Start with 1% of users
# Gradually increase to 5%, 10%, 20%, 50%, 100%
# Monitor crash rates and user feedback
```

### 4. Post-Release Monitoring
- **Crash Reports**: Monitor via Play Console
- **User Reviews**: Respond to user feedback
- **Performance**: Monitor app performance metrics
- **Security**: Regular security updates

## CI/CD Pipeline

### GitHub Actions Example

Create `.github/workflows/build.yml`:

```yaml
name: Build and Deploy

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '22.17.0'
          cache: 'yarn'
      
      - run: yarn install --frozen-lockfile
      - run: yarn test
      - run: yarn build

  build-android:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '22.17.0'
          cache: 'yarn'
      
      - uses: actions/setup-java@v3
        with:
          distribution: 'temurin'
          java-version: '17'
      
      - run: yarn install --frozen-lockfile
      - run: yarn build
      - run: npx cap sync android
      
      - name: Build Android
        run: |
          cd android
          ./gradlew assembleRelease bundleRelease
      
      - name: Upload APK
        uses: actions/upload-artifact@v3
        with:
          name: app-release.apk
          path: android/app/build/outputs/apk/release/app-release.apk
      
      - name: Upload AAB
        uses: actions/upload-artifact@v3
        with:
          name: app-release.aab
          path: android/app/build/outputs/bundle/release/app-release.aab

  build-ios:
    needs: test
    runs-on: macos-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '22.17.0'
          cache: 'yarn'
      
      - run: yarn install --frozen-lockfile
      - run: yarn build
      - run: npx cap sync ios
      
      - name: Build iOS
        run: |
          cd ios/App
          xcodebuild -workspace App.xcworkspace \
                     -scheme App \
                     -configuration Release \
                     -destination generic/platform=iOS \
                     -archivePath App.xcarchive \
                     archive
      
      - name: Export IPA
        run: |
          cd ios/App
          xcodebuild -exportArchive \
                     -archivePath App.xcarchive \
                     -exportPath . \
                     -exportOptionsPlist ExportOptions.plist
      
      - name: Upload IPA
        uses: actions/upload-artifact@v3
        with:
          name: App.ipa
          path: ios/App/App.ipa
```

### Automated Deployment

#### App Store Connect API
```bash
# Upload to App Store using API
xcrun altool --upload-app \
  --type ios \
  --file "App.ipa" \
  --apiKey "$API_KEY_ID" \
  --apiIssuer "$API_ISSUER_ID"
```

#### Google Play Console API
```bash
# Upload to Play Store using API
curl -X POST \
  "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/$PACKAGE_NAME/edits/$EDIT_ID/bundles" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/octet-stream" \
  --data-binary @app-release.aab
```

## Troubleshooting

### Common Build Issues

#### iOS Issues
- **Code Signing**: Verify certificates and provisioning profiles
- **Archive Validation**: Check for missing frameworks or resources
- **App Store Upload**: Ensure proper export options
- **Capability Mismatch**: Match entitlements with App ID capabilities

```bash
# Check code signing
security find-identity -v -p codesigning

# Verify provisioning profile
security cms -D -i YourProfile.mobileprovision
```

#### Android Issues
- **Gradle Build**: Check dependencies and versions
- **Signing Issues**: Verify keystore and signing configuration
- **Permission Errors**: Ensure all required permissions are declared
- **ProGuard Issues**: Update ProGuard rules for code obfuscation

```bash
# Check Gradle dependencies
cd android && ./gradlew dependencies

# Verify signing configuration
./gradlew signingReport
```

### Performance Issues
- **Bundle Size**: Use bundle analyzer to identify large dependencies
- **Memory Usage**: Profile app memory usage on devices
- **Startup Time**: Optimize app initialization
- **Battery Usage**: Review background processes

### Platform-Specific Issues

#### iOS
- **TestFlight Issues**: Check for crash logs in App Store Connect
- **App Store Rejection**: Review App Store Guidelines
- **Device Compatibility**: Test on various iOS versions and devices

#### Android
- **Play Store Policy**: Ensure compliance with Play Store policies
- **Target SDK**: Keep target SDK version up to date
- **Device Fragmentation**: Test on various Android versions and manufacturers

## Security Considerations

### Code Security
- **Obfuscation**: Enable ProGuard/R8 for Android
- **Certificate Pinning**: Implement SSL certificate pinning
- **Root/Jailbreak Detection**: Detect compromised devices
- **Debug Detection**: Prevent debugging in production builds

### Data Protection
- **Encryption**: All sensitive data must be encrypted
- **Keychain/Keystore**: Use secure system storage
- **Network Security**: HTTPS only, certificate validation
- **Backup Exclusion**: Exclude sensitive data from backups

### App Store Security
- **Code Signing**: Properly sign all releases
- **Distribution**: Use official app stores only
- **Update Mechanism**: Implement secure update process
- **Vulnerability Response**: Have incident response plan

### Best Practices
- **Regular Updates**: Keep dependencies updated
- **Security Audits**: Regular security assessments
- **Compliance**: Follow industry security standards
- **Monitoring**: Implement security monitoring and alerting

## Conclusion

This guide provides comprehensive instructions for building and deploying the 2FA Studio app. Follow these steps carefully, and always test thoroughly before releasing to production.

For additional support or questions, contact the development team or refer to the project documentation.

---

**Important Notes:**
- Always test builds on physical devices before release
- Keep certificates and signing keys secure
- Monitor app performance and user feedback post-release
- Regularly update dependencies for security patches
- Follow platform-specific guidelines and policies