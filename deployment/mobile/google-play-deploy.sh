#!/bin/bash

# 2FA Studio - Google Play Store Deployment Script
# This script handles Android Google Play Store deployment including build, sign, and upload

set -e

echo "🤖 2FA Studio - Google Play Store Deployment"
echo "============================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
BUILD_TYPE="${1:-release}"
UPLOAD_TO_STORE="${2:-true}"
SKIP_TESTS="${3:-false}"
TRACK="${4:-internal}" # internal, alpha, beta, production

# Google Play Configuration
PACKAGE_NAME="com.twofastudio.app"
SERVICE_ACCOUNT_JSON="${GOOGLE_PLAY_SERVICE_ACCOUNT_JSON}"

echo -e "${BLUE}📋 Deployment Configuration:${NC}"
echo "Project Root: $PROJECT_ROOT"
echo "Build Type: $BUILD_TYPE"
echo "Upload to Store: $UPLOAD_TO_STORE"
echo "Release Track: $TRACK"
echo "Skip Tests: $SKIP_TESTS"
echo "Package Name: $PACKAGE_NAME"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check required tools
echo -e "${BLUE}🔍 Checking required tools...${NC}"

required_tools=("node" "yarn" "java" "keytool")
for tool in "${required_tools[@]}"; do
    if ! command_exists "$tool"; then
        echo -e "${RED}❌ $tool not found. Please install it.${NC}"
        exit 1
    fi
done

# Check Android SDK
if [[ -z "$ANDROID_HOME" ]]; then
    echo -e "${RED}❌ ANDROID_HOME environment variable not set${NC}"
    exit 1
fi

# Check for required Android SDK components
if [[ ! -f "$ANDROID_HOME/platform-tools/adb" ]]; then
    echo -e "${RED}❌ Android SDK platform-tools not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All required tools found${NC}"

# Change to project root
cd "$PROJECT_ROOT"

# Load environment configuration
if [[ -f ".env.production" ]]; then
    echo -e "${BLUE}📄 Loading production environment configuration...${NC}"
    set -a
    source ".env.production"
    set +a
    echo -e "${GREEN}✅ Environment configuration loaded${NC}"
else
    echo -e "${RED}❌ Production environment file not found${NC}"
    exit 1
fi

# Validate required environment variables
required_vars=("ANDROID_KEYSTORE_BASE64" "ANDROID_KEYSTORE_PASSWORD" "ANDROID_KEY_ALIAS" "ANDROID_KEY_PASSWORD")
if [[ "$UPLOAD_TO_STORE" == "true" ]]; then
    required_vars+=("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON")
fi

for var in "${required_vars[@]}"; do
    if [[ -z "${!var}" ]]; then
        echo -e "${RED}❌ Required environment variable not set: $var${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✅ All required environment variables are set${NC}"

# Pre-deployment checks
echo -e "${BLUE}🔍 Running pre-deployment checks...${NC}"

# Check Git status
if ! git diff-index --quiet HEAD --; then
    echo -e "${YELLOW}⚠️  Warning: Working directory has uncommitted changes${NC}"
    if [[ "$BUILD_TYPE" == "release" ]]; then
        read -p "Continue with release deployment? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Deployment cancelled."
            exit 1
        fi
    fi
fi

echo -e "${GREEN}✅ Pre-deployment checks passed${NC}"

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
yarn install --frozen-lockfile --production=false

echo -e "${GREEN}✅ Dependencies installed${NC}"

# Build web application
echo -e "${BLUE}🏗️  Building web application...${NC}"

# Set build environment variables
export NODE_ENV="production"
export VITE_APP_ENV="production"
export VITE_APP_VERSION="$(git describe --tags --always --dirty)"
export VITE_BUILD_TIME="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
export VITE_GIT_COMMIT="$(git rev-parse HEAD)"

# Build the web app
yarn build

# Verify build output
if [[ ! -d "dist" || ! -f "dist/index.html" ]]; then
    echo -e "${RED}❌ Web build failed - dist directory or index.html not found${NC}"
    exit 1
fi

BUNDLE_SIZE=$(du -sh dist | cut -f1)
echo -e "${GREEN}✅ Web build completed - Bundle size: $BUNDLE_SIZE${NC}"

# Sync Capacitor
echo -e "${BLUE}📱 Syncing Capacitor...${NC}"
npx cap sync android
npx cap update android

# Setup Android keystore
echo -e "${BLUE}🔐 Setting up Android keystore...${NC}"

# Decode and save keystore
echo "$ANDROID_KEYSTORE_BASE64" | base64 -d > android/app/release.keystore

# Verify keystore
if ! keytool -list -keystore android/app/release.keystore -storepass "$ANDROID_KEYSTORE_PASSWORD" -alias "$ANDROID_KEY_ALIAS" > /dev/null 2>&1; then
    echo -e "${RED}❌ Keystore verification failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Android keystore configured and verified${NC}"

# Update version numbers
echo -e "${BLUE}📝 Updating version numbers...${NC}"

# Get version from package.json
APP_VERSION=$(node -p "require('./package.json').version")
VERSION_CODE=$(date +%s) # Unix timestamp as version code

# Update build.gradle with version information
cd android

# Backup original build.gradle
cp app/build.gradle app/build.gradle.backup

# Update version in build.gradle
sed -i.tmp "s/versionCode [0-9]*/versionCode $VERSION_CODE/" app/build.gradle
sed -i.tmp "s/versionName \".*\"/versionName \"$APP_VERSION\"/" app/build.gradle

echo "Updated version: $APP_VERSION ($VERSION_CODE)"

cd ..

echo -e "${GREEN}✅ Version numbers updated${NC}"

# Run tests if not skipped
if [[ "$SKIP_TESTS" != "true" ]]; then
    echo -e "${BLUE}🧪 Running Android tests...${NC}"
    
    cd android
    ./gradlew testReleaseUnitTest
    cd ..
    
    echo -e "${GREEN}✅ Tests passed${NC}"
else
    echo -e "${YELLOW}⚠️  Skipping tests${NC}"
fi

# Build Android APK and AAB
echo -e "${BLUE}🏗️  Building Android APK and AAB...${NC}"

cd android

# Clean previous builds
./gradlew clean

# Build release APK
./gradlew assembleRelease

# Build release AAB (Android App Bundle)
./gradlew bundleRelease

# Verify build outputs
if [[ ! -f "app/build/outputs/apk/release/app-release.apk" ]]; then
    echo -e "${RED}❌ APK build failed${NC}"
    exit 1
fi

if [[ ! -f "app/build/outputs/bundle/release/app-release.aab" ]]; then
    echo -e "${RED}❌ AAB build failed${NC}"
    exit 1
fi

APK_SIZE=$(du -sh app/build/outputs/apk/release/app-release.apk | cut -f1)
AAB_SIZE=$(du -sh app/build/outputs/bundle/release/app-release.aab | cut -f1)

echo -e "${GREEN}✅ Android builds completed successfully${NC}"
echo "  APK Size: $APK_SIZE"
echo "  AAB Size: $AAB_SIZE"

cd ..

# Upload to Google Play Store (if requested)
if [[ "$UPLOAD_TO_STORE" == "true" ]]; then
    echo -e "${BLUE}🚀 Uploading to Google Play Store...${NC}"
    
    # Install fastlane if not present
    if ! command_exists "fastlane"; then
        echo "Installing fastlane..."
        gem install fastlane
    fi
    
    # Create fastlane directory and files
    mkdir -p fastlane
    
    # Create service account JSON file
    echo "$SERVICE_ACCOUNT_JSON" | base64 -d > fastlane/service_account.json
    
    # Create Fastfile
    cat > fastlane/Fastfile << EOF
default_platform(:android)

platform :android do
  desc "Upload to Google Play Store"
  lane :upload_to_play_store do
    upload_to_play_store(
      track: "$TRACK",
      aab: "android/app/build/outputs/bundle/release/app-release.aab",
      json_key: "fastlane/service_account.json",
      package_name: "$PACKAGE_NAME",
      release_status: "draft", # or "completed" to publish immediately
      skip_upload_metadata: true,
      skip_upload_images: true,
      skip_upload_screenshots: true
    )
  end
  
  desc "Upload APK to Google Play Store"
  lane :upload_apk_to_play_store do
    upload_to_play_store(
      track: "$TRACK",
      apk: "android/app/build/outputs/apk/release/app-release.apk",
      json_key: "fastlane/service_account.json",
      package_name: "$PACKAGE_NAME",
      release_status: "draft",
      skip_upload_metadata: true,
      skip_upload_images: true,
      skip_upload_screenshots: true
    )
  end
end
EOF
    
    # Upload AAB to Play Store
    if fastlane android upload_to_play_store; then
        echo -e "${GREEN}✅ Successfully uploaded to Google Play Store ($TRACK track)${NC}"
    else
        echo -e "${RED}❌ Upload to Google Play Store failed${NC}"
        exit 1
    fi
    
    # Clean up service account file
    rm -f fastlane/service_account.json
    
else
    echo -e "${YELLOW}⚠️  Skipping upload to Google Play Store${NC}"
fi

# Generate app metadata
echo -e "${BLUE}📄 Generating app metadata...${NC}"

DEPLOYMENT_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

cat > android_deployment_metadata.json << EOF
{
  "platform": "android",
  "appVersion": "$APP_VERSION",
  "versionCode": $VERSION_CODE,
  "packageName": "$PACKAGE_NAME",
  "buildType": "$BUILD_TYPE",
  "track": "$TRACK",
  "uploadedToStore": $UPLOAD_TO_STORE,
  "deploymentTime": "$DEPLOYMENT_TIME",
  "gitCommit": "$(git rev-parse HEAD)",
  "gitBranch": "$(git rev-parse --abbrev-ref HEAD)",
  "apkSize": "$APK_SIZE",
  "aabSize": "$AAB_SIZE",
  "webBundleSize": "$BUNDLE_SIZE",
  "buildMachine": "$(uname -n)",
  "gradleVersion": "$(cd android && ./gradlew --version | grep Gradle | head -1)",
  "javaVersion": "$(java -version 2>&1 | head -1)"
}
EOF

echo -e "${GREEN}✅ App metadata generated${NC}"

# Security scan of APK (optional)
if command_exists "aapt" && [[ "$BUILD_TYPE" == "release" ]]; then
    echo -e "${BLUE}🔒 Running basic security scan...${NC}"
    
    # Check for permissions in APK
    aapt dump permissions android/app/build/outputs/apk/release/app-release.apk > apk_permissions.txt
    
    # Check for potentially dangerous permissions
    if grep -q "android.permission.SYSTEM_ALERT_WINDOW\|android.permission.WRITE_EXTERNAL_STORAGE\|android.permission.ACCESS_FINE_LOCATION" apk_permissions.txt; then
        echo -e "${YELLOW}⚠️  APK contains potentially sensitive permissions${NC}"
        echo "Review permissions in apk_permissions.txt"
    fi
    
    echo -e "${GREEN}✅ Basic security scan completed${NC}"
fi

# Cleanup
echo -e "${BLUE}🧹 Cleaning up...${NC}"

# Remove keystore
rm -f android/app/release.keystore

# Restore original build.gradle
if [[ -f "android/app/build.gradle.backup" ]]; then
    mv android/app/build.gradle.backup android/app/build.gradle
fi

# Clean up temporary files
rm -f android/app/build.gradle.tmp
rm -f apk_permissions.txt

echo -e "${GREEN}✅ Cleanup completed${NC}"

# Send notification
if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
    echo -e "${BLUE}📢 Sending deployment notification...${NC}"
    
    STATUS_EMOJI="🤖"
    if [[ "$UPLOAD_TO_STORE" == "true" ]]; then
        STATUS_MESSAGE="Android app uploaded to Google Play Store ($TRACK track)"
    else
        STATUS_MESSAGE="Android app built successfully (not uploaded)"
    fi
    
    curl -X POST "$SLACK_WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d "{
            \"text\": \"$STATUS_EMOJI 2FA Studio Android Deployment\",
            \"attachments\": [{
                \"color\": \"good\",
                \"fields\": [
                    {\"title\": \"Platform\", \"value\": \"Android\", \"short\": true},
                    {\"title\": \"Version\", \"value\": \"$APP_VERSION ($VERSION_CODE)\", \"short\": true},
                    {\"title\": \"Status\", \"value\": \"$STATUS_MESSAGE\", \"short\": false},
                    {\"title\": \"APK Size\", \"value\": \"$APK_SIZE\", \"short\": true},
                    {\"title\": \"AAB Size\", \"value\": \"$AAB_SIZE\", \"short\": true},
                    {\"title\": \"Track\", \"value\": \"$TRACK\", \"short\": true}
                ]
            }]
        }" || {
        echo -e "${YELLOW}⚠️  Failed to send Slack notification${NC}"
    }
fi

# Generate deployment report
echo -e "${BLUE}📊 Generating deployment report...${NC}"

cat > "android_deployment_report_$(date +%Y%m%d_%H%M%S).md" << EOF
# Android Google Play Store Deployment Report

## Deployment Summary
- **Status**: ✅ Success
- **Platform**: Android
- **App Version**: $APP_VERSION
- **Version Code**: $VERSION_CODE
- **Package Name**: $PACKAGE_NAME
- **Deployment Time**: $DEPLOYMENT_TIME

## Build Information
- **Build Type**: $BUILD_TYPE
- **Release Track**: $TRACK
- **Git Commit**: $(git rev-parse HEAD)
- **Git Branch**: $(git rev-parse --abbrev-ref HEAD)
- **APK Size**: $APK_SIZE
- **AAB Size**: $AAB_SIZE
- **Web Bundle Size**: $BUNDLE_SIZE

## Environment
- **Java Version**: $(java -version 2>&1 | head -1)
- **Gradle Version**: $(cd android && ./gradlew --version | grep Gradle | head -1)
- **Android SDK**: $ANDROID_HOME
- **Build Machine**: $(uname -n)

## Google Play Store
- **Uploaded**: $([ "$UPLOAD_TO_STORE" == "true" ] && echo "Yes" || echo "No")
- **Release Track**: $TRACK
- **Package Name**: $PACKAGE_NAME

## Build Outputs
- **APK**: android/app/build/outputs/apk/release/app-release.apk
- **AAB**: android/app/build/outputs/bundle/release/app-release.aab

## Next Steps
1. Monitor Google Play Console for processing status
2. Check for any policy violations or issues
3. Prepare release notes and store listing updates
4. Test the release on various Android devices

## Files Generated
- android_deployment_metadata.json
- Android APK and AAB files

---
Generated automatically by Android deployment script
EOF

echo -e "${GREEN}✅ Deployment report generated${NC}"

# Final summary
echo ""
echo -e "${GREEN}🎉 Android deployment completed successfully!${NC}"
echo -e "${BLUE}📊 Summary:${NC}"
echo "  Platform: Android"
echo "  App Version: $APP_VERSION ($VERSION_CODE)"
echo "  APK Size: $APK_SIZE"
echo "  AAB Size: $AAB_SIZE"
echo "  Track: $TRACK"
echo "  Uploaded to Store: $([ "$UPLOAD_TO_STORE" == "true" ] && echo "Yes" || echo "No")"
echo ""
echo -e "${BLUE}📱 Google Play Information:${NC}"
echo "  Package Name: $PACKAGE_NAME"
if [[ "$UPLOAD_TO_STORE" == "true" ]]; then
    echo "  Play Console: https://play.google.com/console/u/0/developers/$(echo $GOOGLE_PLAY_SERVICE_ACCOUNT_JSON | base64 -d | jq -r .project_id)/app-list"
fi
echo ""
echo -e "${GREEN}✅ Android deployment process completed!${NC}"