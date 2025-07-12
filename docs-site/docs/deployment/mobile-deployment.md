---
sidebar_position: 3
---

# Mobile Deployment

Complete guide for building and deploying 2FA Studio mobile apps for Android and iOS using Capacitor.

## Prerequisites

### Development Environment

```bash
# Required tools
node --version      # v16.0.0 or higher
yarn --version      # v1.22.0 or higher
java --version      # JDK 11 or higher (Android)
xcodebuild -version # Xcode 14+ (iOS)

# Install Capacitor CLI
npm install -g @capacitor/cli
```

### Platform Requirements

#### Android
- Android Studio Arctic Fox or newer
- Android SDK 31+
- Gradle 7.0+
- Google Play Console account

#### iOS
- macOS 12.0+
- Xcode 14+
- CocoaPods 1.11+
- Apple Developer account ($99/year)

## Initial Setup

### 1. Initialize Capacitor

```bash
# Add Capacitor to existing React project
yarn add @capacitor/core
yarn add -D @capacitor/cli

# Initialize Capacitor
npx cap init "2FA Studio" com.twofastudio.app --web-dir build

# Add platforms
npx cap add android
npx cap add ios
```

### 2. Install Native Plugins

```bash
# Core plugins
yarn add @capacitor/app
yarn add @capacitor/haptics
yarn add @capacitor/keyboard
yarn add @capacitor/splash-screen
yarn add @capacitor/status-bar

# Developer's custom plugins
yarn add capacitor-auth-manager
yarn add capacitor-biometric-auth
yarn add capacitor-firebase-kit
yarn add capacitor-native-update

# Additional required plugins
yarn add @capacitor/camera
yarn add @capacitor/filesystem
yarn add @capacitor/preferences
yarn add @capacitor/share
```

### 3. Configure capacitor.config.ts

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.twofastudio.app',
  appName: '2FA Studio',
  webDir: 'build',
  bundledWebRuntime: false,
  backgroundColor: '#ffffff',
  android: {
    backgroundColor: '#ffffff',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  ios: {
    backgroundColor: '#ffffff',
    contentInset: 'automatic',
    limitsNavigationsToAppBoundDomains: true,
    preferredContentMode: 'mobile',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      backgroundColor: '#ffffff',
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
```

## Android Deployment

### 1. Configure Android Project

#### Update android/app/build.gradle

```gradle
android {
    compileSdkVersion 33
    
    defaultConfig {
        applicationId "com.twofastudio.app"
        minSdkVersion 24
        targetSdkVersion 33
        versionCode 1
        versionName "1.0.0"
        
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    }
    
    signingConfigs {
        release {
            storeFile file(System.getenv("ANDROID_KEYSTORE_PATH") ?: "keystore.jks")
            storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")
            keyAlias System.getenv("ANDROID_KEY_ALIAS")
            keyPassword System.getenv("ANDROID_KEY_PASSWORD")
        }
    }
    
    buildTypes {
        release {
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
            signingConfig signingConfigs.release
        }
    }
    
    bundle {
        language {
            enableSplit = true
        }
        density {
            enableSplit = true
        }
        abi {
            enableSplit = true
        }
    }
}

dependencies {
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'androidx.core:core-ktx:1.10.1'
    implementation 'com.google.android.material:material:1.9.0'
    
    // Firebase
    implementation platform('com.google.firebase:firebase-bom:32.0.0')
    implementation 'com.google.firebase:firebase-analytics'
    implementation 'com.google.firebase:firebase-crashlytics'
    implementation 'com.google.firebase:firebase-perf'
}
```

#### Configure AndroidManifest.xml

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.twofastudio.app">

    <!-- Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.USE_BIOMETRIC" />
    <uses-permission android:name="android.permission.VIBRATE" />
    
    <!-- Features -->
    <uses-feature android:name="android.hardware.camera" android:required="false" />
    <uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />

    <application
        android:allowBackup="false"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme"
        android:usesCleartextTraffic="false">

        <activity
            android:name=".MainActivity"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:exported="true"
            android:label="@string/title_activity_main"
            android:launchMode="singleTask"
            android:theme="@style/AppTheme.NoActionBarLaunch">

            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- Firebase -->
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_icon"
            android:resource="@drawable/ic_notification" />
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_color"
            android:resource="@color/primary" />
    </application>
</manifest>
```

### 2. Generate Signing Key

```bash
# Generate release keystore
keytool -genkey -v -keystore android/app/2fastudio-release.keystore \
  -alias 2fastudio -keyalg RSA -keysize 2048 -validity 10000

# Verify keystore
keytool -list -v -keystore android/app/2fastudio-release.keystore
```

### 3. Build Release APK/AAB

```bash
# Sync web assets
yarn build
npx cap sync android

# Build AAB (recommended for Play Store)
cd android
./gradlew bundleRelease

# Build APK (for testing)
./gradlew assembleRelease

# Output locations:
# AAB: android/app/build/outputs/bundle/release/app-release.aab
# APK: android/app/build/outputs/apk/release/app-release.apk
```

### 4. Play Store Deployment

#### Prepare Store Listing

Required assets:
- App icon: 512x512 PNG
- Feature graphic: 1024x500 PNG
- Screenshots: Min 2, Max 8 (per device type)
- Short description: Max 80 characters
- Full description: Max 4000 characters

#### Upload Process

```bash
# Using fastlane (recommended)
cd android
bundle install
bundle exec fastlane supply init
bundle exec fastlane supply --aab app/build/outputs/bundle/release/app-release.aab
```

#### Play Console Configuration

1. **App Content**:
   - Privacy policy URL
   - App category: Productivity
   - Content rating: Everyone

2. **Release Management**:
   - Internal testing: QA team
   - Closed testing: Beta users
   - Open testing: Public beta
   - Production: Phased rollout (20% → 50% → 100%)

## iOS Deployment

### 1. Configure iOS Project

#### Update ios/App/App/Info.plist

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>en</string>
    <key>CFBundleDisplayName</key>
    <string>2FA Studio</string>
    <key>CFBundleExecutable</key>
    <string>$(EXECUTABLE_NAME)</string>
    <key>CFBundleIdentifier</key>
    <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>$(PRODUCT_NAME)</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>LSRequiresIPhoneOS</key>
    <true/>
    <key>NSCameraUsageDescription</key>
    <string>2FA Studio needs camera access to scan QR codes</string>
    <key>NSFaceIDUsageDescription</key>
    <string>2FA Studio uses Face ID to secure your accounts</string>
    <key>UILaunchStoryboardName</key>
    <string>LaunchScreen</string>
    <key>UIRequiredDeviceCapabilities</key>
    <array>
        <string>armv7</string>
    </array>
    <key>UISupportedInterfaceOrientations</key>
    <array>
        <string>UIInterfaceOrientationPortrait</string>
        <string>UIInterfaceOrientationLandscapeLeft</string>
        <string>UIInterfaceOrientationLandscapeRight</string>
    </array>
    <key>UISupportedInterfaceOrientations~ipad</key>
    <array>
        <string>UIInterfaceOrientationPortrait</string>
        <string>UIInterfaceOrientationPortraitUpsideDown</string>
        <string>UIInterfaceOrientationLandscapeLeft</string>
        <string>UIInterfaceOrientationLandscapeRight</string>
    </array>
    <key>UIViewControllerBasedStatusBarAppearance</key>
    <true/>
    <key>ITSAppUsesNonExemptEncryption</key>
    <false/>
</dict>
</plist>
```

#### Configure Podfile

```ruby
platform :ios, '13.0'
use_frameworks!

# Workaround for Flipper-Folly on M1
# https://github.com/CocoaPods/CocoaPods/issues/10287
pod 'OpenSSL-Universal', :modular_headers => true

target 'App' do
  capacitor_pods
  
  # Add your Pods here
  pod 'Firebase/Analytics'
  pod 'Firebase/Crashlytics'
  pod 'Firebase/Performance'
end

post_install do |installer|
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '13.0'
    end
  end
end
```

### 2. Code Signing Setup

```bash
# Install certificates via fastlane
cd ios
bundle install
bundle exec fastlane match development
bundle exec fastlane match appstore

# Manual setup in Xcode
# 1. Open ios/App/App.xcworkspace
# 2. Select project > Signing & Capabilities
# 3. Enable "Automatically manage signing"
# 4. Select team
```

### 3. Build and Archive

```bash
# Sync web assets
yarn build
npx cap sync ios

# Open in Xcode
npx cap open ios

# Or build via command line
cd ios/App
xcodebuild -workspace App.xcworkspace \
  -scheme App \
  -sdk iphoneos \
  -configuration Release \
  -archivePath $PWD/build/App.xcarchive \
  archive

# Export IPA
xcodebuild -exportArchive \
  -archivePath $PWD/build/App.xcarchive \
  -exportOptionsPlist exportOptions.plist \
  -exportPath $PWD/build
```

### 4. App Store Deployment

#### App Store Connect Setup

1. **Create App**:
   - Bundle ID: com.twofastudio.app
   - SKU: 2FASTUDIO001
   - Primary language: English (U.S.)

2. **App Information**:
   - Category: Productivity
   - Subtitle: Secure 2FA Management
   - Privacy Policy URL
   - Age Rating: 4+

#### TestFlight Distribution

```bash
# Upload to TestFlight
cd ios
bundle exec fastlane pilot upload

# Or use Transporter app
# 1. Export IPA from Xcode
# 2. Open Transporter
# 3. Sign in with Apple ID
# 4. Drag IPA to upload
```

## Build Automation

### GitHub Actions Workflow

```yaml
# .github/workflows/mobile-deploy.yml
name: Mobile Deployment

on:
  push:
    tags:
      - 'v*'

jobs:
  build-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'yarn'
      
      - name: Setup Java
        uses: actions/setup-java@v3
        with:
          java-version: '11'
          distribution: 'temurin'
      
      - name: Install dependencies
        run: |
          yarn install --frozen-lockfile
          yarn build
          npx cap sync android
      
      - name: Build Android release
        run: |
          cd android
          ./gradlew bundleRelease
        env:
          ANDROID_KEYSTORE_PATH: ${{ secrets.ANDROID_KEYSTORE_PATH }}
          ANDROID_KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
          ANDROID_KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS }}
          ANDROID_KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}
      
      - name: Upload to Play Store
        uses: r0adkll/upload-google-play@v1
        with:
          serviceAccountJsonPlainText: ${{ secrets.PLAY_STORE_SERVICE_ACCOUNT }}
          packageName: com.twofastudio.app
          releaseFiles: android/app/build/outputs/bundle/release/app-release.aab
          track: internal
          status: draft

  build-ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'yarn'
      
      - name: Install dependencies
        run: |
          yarn install --frozen-lockfile
          yarn build
          npx cap sync ios
      
      - name: Setup Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.0'
          bundler-cache: true
      
      - name: Install certificates
        run: |
          cd ios
          bundle exec fastlane match appstore --readonly
        env:
          MATCH_PASSWORD: ${{ secrets.MATCH_PASSWORD }}
          MATCH_GIT_BASIC_AUTHORIZATION: ${{ secrets.MATCH_GIT_BASIC_AUTHORIZATION }}
      
      - name: Build and upload to TestFlight
        run: |
          cd ios
          bundle exec fastlane beta
        env:
          FASTLANE_USER: ${{ secrets.APPLE_ID }}
          FASTLANE_PASSWORD: ${{ secrets.APPLE_PASSWORD }}
          FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD: ${{ secrets.APP_SPECIFIC_PASSWORD }}
```

## Over-the-Air Updates

### Configure capacitor-native-update

```typescript
// src/services/update.service.ts
import { NativeUpdate } from 'capacitor-native-update';
import { Dialog } from '@capacitor/dialog';

export class UpdateService {
  async checkForUpdates() {
    try {
      const update = await NativeUpdate.checkForUpdate();
      
      if (update.available) {
        const { value } = await Dialog.confirm({
          title: 'Update Available',
          message: `Version ${update.version} is available. Download now?`,
          okButtonTitle: 'Update',
          cancelButtonTitle: 'Later'
        });
        
        if (value) {
          await this.downloadUpdate(update);
        }
      }
    } catch (error) {
      console.error('Update check failed:', error);
    }
  }
  
  private async downloadUpdate(update: any) {
    const progress = await NativeUpdate.downloadUpdate({
      url: update.url,
      version: update.version
    });
    
    progress.subscribe({
      next: (percentage) => {
        console.log(`Download progress: ${percentage}%`);
      },
      complete: async () => {
        await NativeUpdate.installUpdate();
      }
    });
  }
}
```

## App Store Optimization

### Android (Play Store)

```json
// android/fastlane/metadata/android/en-US/
{
  "title": "2FA Studio - Authenticator App",
  "short_description": "Secure 2FA codes with cloud backup",
  "full_description": "2FA Studio is a secure two-factor authentication app...",
  "keywords": "2fa, authenticator, totp, security, backup",
  "category": "PRODUCTIVITY",
  "content_rating": "Everyone",
  "website": "https://2fastudio.app",
  "email": "support@2fastudio.app",
  "privacy_policy": "https://2fastudio.app/privacy"
}
```

### iOS (App Store)

```json
// ios/fastlane/metadata/en-US/
{
  "name": "2FA Studio",
  "subtitle": "Secure Authentication",
  "keywords": "2fa,authenticator,totp,security,backup,passwords",
  "promotional_text": "New: Browser extension support!",
  "description": "2FA Studio provides secure two-factor authentication...",
  "release_notes": "- Bug fixes and improvements\n- Enhanced security",
  "support_url": "https://help.2fastudio.app",
  "marketing_url": "https://2fastudio.app"
}
```

## Performance Optimization

### Android Optimization

```gradle
// android/app/build.gradle
android {
    buildTypes {
        release {
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
            
            ndk {
                debugSymbolLevel 'FULL'
            }
        }
    }
    
    packagingOptions {
        // Exclude unnecessary files
        exclude 'META-INF/DEPENDENCIES'
        exclude 'META-INF/LICENSE'
        exclude 'META-INF/LICENSE.txt'
        exclude 'META-INF/NOTICE'
        exclude 'META-INF/NOTICE.txt'
    }
}
```

### iOS Optimization

```swift
// ios/App/App/AppDelegate.swift
import UIKit
import Capacitor
import Firebase

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {
    
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Configure Firebase
        FirebaseApp.configure()
        
        // Performance optimizations
        if #available(iOS 13.0, *) {
            // Optimize for iOS 13+
            UITextView.appearance().backgroundColor = .clear
        }
        
        return true
    }
}
```

## Monitoring and Analytics

### Firebase Setup

```typescript
// src/services/analytics.service.ts
import { FirebaseAnalytics } from 'capacitor-firebase-kit';
import { Device } from '@capacitor/device';

export class AnalyticsService {
  async initialize() {
    const info = await Device.getInfo();
    
    await FirebaseAnalytics.setUserId({
      userId: await this.getAnonymousId()
    });
    
    await FirebaseAnalytics.setUserProperty({
      name: 'platform',
      value: info.platform
    });
    
    await FirebaseAnalytics.setUserProperty({
      name: 'app_version',
      value: info.appVersion
    });
  }
  
  async logEvent(name: string, params?: any) {
    await FirebaseAnalytics.logEvent({ name, params });
  }
}
```

## Release Management

### Version Strategy

```javascript
// version.config.js
module.exports = {
  android: {
    versionCode: (major, minor, patch) => major * 10000 + minor * 100 + patch,
    versionName: (version) => version
  },
  ios: {
    CFBundleVersion: (major, minor, patch) => `${major}.${minor}.${patch}`,
    CFBundleShortVersionString: (version) => version
  }
};
```

### Release Notes Template

```markdown
## Version X.Y.Z

### What's New
- Feature 1
- Feature 2

### Improvements
- Performance enhancement
- UI improvements

### Bug Fixes
- Fixed issue with...
- Resolved problem where...

### Technical
- Updated dependencies
- Security improvements
```

## Troubleshooting

### Common Build Issues

1. **Android Build Fails**
   ```bash
   # Clean and rebuild
   cd android
   ./gradlew clean
   ./gradlew build
   ```

2. **iOS Build Fails**
   ```bash
   # Update pods
   cd ios/App
   pod deintegrate
   pod install
   ```

3. **Capacitor Sync Issues**
   ```bash
   # Full reset
   rm -rf node_modules
   rm -rf android/app/src/main/assets/public
   rm -rf ios/App/App/public
   yarn install
   yarn build
   npx cap sync
   ```

### Debugging Tips

- Enable web debugging: `capacitor.config.ts` → `webContentsDebuggingEnabled: true`
- Use Chrome DevTools for Android
- Use Safari Web Inspector for iOS
- Check native logs: Android Studio / Xcode console