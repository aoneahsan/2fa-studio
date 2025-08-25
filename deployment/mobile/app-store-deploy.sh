#!/bin/bash

# 2FA Studio - App Store Deployment Script
# This script handles iOS App Store deployment including build, sign, and upload

set -e

echo "🍎 2FA Studio - iOS App Store Deployment"
echo "========================================"

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

# App Store Connect Configuration
BUNDLE_ID="com.twofastudio.app"
TEAM_ID="${APPLE_TEAM_ID}"
APP_ID="${APPLE_APP_ID}"

echo -e "${BLUE}📋 Deployment Configuration:${NC}"
echo "Project Root: $PROJECT_ROOT"
echo "Build Type: $BUILD_TYPE"
echo "Upload to Store: $UPLOAD_TO_STORE"
echo "Skip Tests: $SKIP_TESTS"
echo "Bundle ID: $BUNDLE_ID"
echo "Team ID: $TEAM_ID"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check required tools
echo -e "${BLUE}🔍 Checking required tools...${NC}"

required_tools=("node" "yarn" "xcodebuild" "xcrun" "security")
for tool in "${required_tools[@]}"; do
    if ! command_exists "$tool"; then
        echo -e "${RED}❌ $tool not found. Please install it.${NC}"
        exit 1
    fi
done

# Check for Xcode
if ! xcode-select -p &> /dev/null; then
    echo -e "${RED}❌ Xcode command line tools not found. Please install Xcode.${NC}"
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
required_vars=("APPLE_CERTIFICATE_P12" "APPLE_CERTIFICATE_PASSWORD" "APPLE_PROVISIONING_PROFILE" "APPLE_KEY_ID" "APPLE_ISSUER_ID" "APPLE_PRIVATE_KEY")
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

# Install iOS dependencies
echo -e "${BLUE}📱 Installing iOS dependencies...${NC}"
cd ios
pod install --repo-update
cd ..

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
npx cap sync ios
npx cap update ios

# Setup iOS certificates and provisioning profiles
echo -e "${BLUE}🔐 Setting up iOS certificates and provisioning profiles...${NC}"

# Create temporary keychain
KEYCHAIN_NAME="ios-build.keychain"
KEYCHAIN_PASSWORD="temp-build-password"

# Delete keychain if it exists
security delete-keychain "$KEYCHAIN_NAME" 2>/dev/null || true

# Create new keychain
security create-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_NAME"
security default-keychain -s "$KEYCHAIN_NAME"
security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_NAME"
security set-keychain-settings -t 3600 -u "$KEYCHAIN_NAME"

# Import certificate
echo "$APPLE_CERTIFICATE_P12" | base64 -d > certificate.p12
security import certificate.p12 -k "$KEYCHAIN_NAME" -P "$APPLE_CERTIFICATE_PASSWORD" -T /usr/bin/codesign
security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$KEYCHAIN_PASSWORD" "$KEYCHAIN_NAME"

# Install provisioning profile
echo "$APPLE_PROVISIONING_PROFILE" | base64 -d > profile.mobileprovision
mkdir -p ~/Library/MobileDevice/Provisioning\ Profiles
cp profile.mobileprovision ~/Library/MobileDevice/Provisioning\ Profiles/

# Get provisioning profile UUID
PROFILE_UUID=$(security cms -D -i profile.mobileprovision | plutil -p - | grep -A1 UUID | tail -1 | sed 's/.*"\(.*\)".*/\1/')
echo "Provisioning Profile UUID: $PROFILE_UUID"

echo -e "${GREEN}✅ iOS certificates and provisioning profiles configured${NC}"

# Run tests if not skipped
if [[ "$SKIP_TESTS" != "true" ]]; then
    echo -e "${BLUE}🧪 Running iOS tests...${NC}"
    
    cd ios
    xcodebuild test \
        -workspace App/App.xcworkspace \
        -scheme App \
        -destination 'platform=iOS Simulator,name=iPhone 14' \
        -configuration Debug
    cd ..
    
    echo -e "${GREEN}✅ Tests passed${NC}"
else
    echo -e "${YELLOW}⚠️  Skipping tests${NC}"
fi

# Build iOS archive
echo -e "${BLUE}🏗️  Building iOS archive...${NC}"

cd ios

# Clean build folder
xcodebuild clean \
    -workspace App/App.xcworkspace \
    -scheme App \
    -configuration Release

# Build archive
xcodebuild archive \
    -workspace App/App.xcworkspace \
    -scheme App \
    -configuration Release \
    -destination 'generic/platform=iOS' \
    -archivePath App.xcarchive \
    CODE_SIGN_STYLE=Manual \
    PROVISIONING_PROFILE="$PROFILE_UUID" \
    CODE_SIGN_IDENTITY="iPhone Distribution" \
    DEVELOPMENT_TEAM="$TEAM_ID"

if [[ ! -d "App.xcarchive" ]]; then
    echo -e "${RED}❌ Archive build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ iOS archive built successfully${NC}"

# Export IPA
echo -e "${BLUE}📦 Exporting IPA...${NC}"

# Create export options plist
cat > ExportOptions.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store</string>
    <key>teamID</key>
    <string>$TEAM_ID</string>
    <key>uploadBitcode</key>
    <false/>
    <key>compileBitcode</key>
    <false/>
    <key>uploadSymbols</key>
    <true/>
    <key>provisioningProfiles</key>
    <dict>
        <key>$BUNDLE_ID</key>
        <string>$PROFILE_UUID</string>
    </dict>
    <key>signingStyle</key>
    <string>manual</string>
    <key>stripSwiftSymbols</key>
    <true/>
    <key>thinning</key>
    <string>&lt;none&gt;</string>
</dict>
</plist>
EOF

# Export archive to IPA
xcodebuild -exportArchive \
    -archivePath App.xcarchive \
    -exportPath export \
    -exportOptionsPlist ExportOptions.plist

if [[ ! -f "export/App.ipa" ]]; then
    echo -e "${RED}❌ IPA export failed${NC}"
    exit 1
fi

IPA_SIZE=$(du -sh export/App.ipa | cut -f1)
echo -e "${GREEN}✅ IPA exported successfully - Size: $IPA_SIZE${NC}"

cd ..

# Upload to App Store Connect (if requested)
if [[ "$UPLOAD_TO_STORE" == "true" ]]; then
    echo -e "${BLUE}🚀 Uploading to App Store Connect...${NC}"
    
    # Create App Store Connect API key
    echo "$APPLE_PRIVATE_KEY" | base64 -d > AuthKey_${APPLE_KEY_ID}.p8
    
    # Upload using altool
    xcrun altool --upload-app \
        --type ios \
        --file ios/export/App.ipa \
        --apiKey "$APPLE_KEY_ID" \
        --apiIssuer "$APPLE_ISSUER_ID"
    
    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}✅ Successfully uploaded to App Store Connect${NC}"
    else
        echo -e "${RED}❌ Upload to App Store Connect failed${NC}"
        exit 1
    fi
    
    # Clean up API key
    rm -f AuthKey_${APPLE_KEY_ID}.p8
    
    # Submit for review (optional)
    if [[ "$AUTO_SUBMIT_FOR_REVIEW" == "true" ]]; then
        echo -e "${BLUE}📝 Submitting for App Store review...${NC}"
        
        # This would use App Store Connect API to submit for review
        # Implementation depends on your specific requirements
        echo -e "${YELLOW}⚠️  Auto-submit for review not yet implemented${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Skipping upload to App Store Connect${NC}"
fi

# Generate app metadata
echo -e "${BLUE}📄 Generating app metadata...${NC}"

APP_VERSION=$(xcrun agvtool what-marketing-version -terse1)
BUILD_NUMBER=$(xcrun agvtool what-version -terse)
DEPLOYMENT_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

cat > ios_deployment_metadata.json << EOF
{
  "platform": "ios",
  "appVersion": "$APP_VERSION",
  "buildNumber": "$BUILD_NUMBER",
  "bundleId": "$BUNDLE_ID",
  "teamId": "$TEAM_ID",
  "buildType": "$BUILD_TYPE",
  "uploadedToStore": $UPLOAD_TO_STORE,
  "deploymentTime": "$DEPLOYMENT_TIME",
  "gitCommit": "$(git rev-parse HEAD)",
  "gitBranch": "$(git rev-parse --abbrev-ref HEAD)",
  "ipaSize": "$IPA_SIZE",
  "webBundleSize": "$BUNDLE_SIZE",
  "buildMachine": "$(uname -n)",
  "xcodeVersion": "$(xcodebuild -version | head -1)",
  "swiftVersion": "$(xcrun swift --version | head -1)"
}
EOF

echo -e "${GREEN}✅ App metadata generated${NC}"

# Cleanup
echo -e "${BLUE}🧹 Cleaning up...${NC}"

# Remove temporary files
rm -f certificate.p12
rm -f profile.mobileprovision
rm -f ios/ExportOptions.plist

# Remove temporary keychain
security delete-keychain "$KEYCHAIN_NAME" 2>/dev/null || true

echo -e "${GREEN}✅ Cleanup completed${NC}"

# Send notification
if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
    echo -e "${BLUE}📢 Sending deployment notification...${NC}"
    
    STATUS_EMOJI="🍎"
    if [[ "$UPLOAD_TO_STORE" == "true" ]]; then
        STATUS_MESSAGE="iOS app uploaded to App Store Connect"
    else
        STATUS_MESSAGE="iOS app built successfully (not uploaded)"
    fi
    
    curl -X POST "$SLACK_WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d "{
            \"text\": \"$STATUS_EMOJI 2FA Studio iOS Deployment\",
            \"attachments\": [{
                \"color\": \"good\",
                \"fields\": [
                    {\"title\": \"Platform\", \"value\": \"iOS\", \"short\": true},
                    {\"title\": \"Version\", \"value\": \"$APP_VERSION ($BUILD_NUMBER)\", \"short\": true},
                    {\"title\": \"Status\", \"value\": \"$STATUS_MESSAGE\", \"short\": false},
                    {\"title\": \"IPA Size\", \"value\": \"$IPA_SIZE\", \"short\": true},
                    {\"title\": \"Build Type\", \"value\": \"$BUILD_TYPE\", \"short\": true}
                ]
            }]
        }" || {
        echo -e "${YELLOW}⚠️  Failed to send Slack notification${NC}"
    }
fi

# Generate deployment report
echo -e "${BLUE}📊 Generating deployment report...${NC}"

cat > "ios_deployment_report_$(date +%Y%m%d_%H%M%S).md" << EOF
# iOS App Store Deployment Report

## Deployment Summary
- **Status**: ✅ Success
- **Platform**: iOS
- **App Version**: $APP_VERSION
- **Build Number**: $BUILD_NUMBER
- **Bundle ID**: $BUNDLE_ID
- **Deployment Time**: $DEPLOYMENT_TIME

## Build Information
- **Build Type**: $BUILD_TYPE
- **Git Commit**: $(git rev-parse HEAD)
- **Git Branch**: $(git rev-parse --abbrev-ref HEAD)
- **IPA Size**: $IPA_SIZE
- **Web Bundle Size**: $BUNDLE_SIZE

## Environment
- **Xcode Version**: $(xcodebuild -version | head -1)
- **Swift Version**: $(xcrun swift --version | head -1)
- **Build Machine**: $(uname -n)
- **macOS Version**: $(sw_vers -productVersion)

## App Store Connect
- **Uploaded**: $([ "$UPLOAD_TO_STORE" == "true" ] && echo "Yes" || echo "No")
- **Team ID**: $TEAM_ID
- **Bundle ID**: $BUNDLE_ID

## Next Steps
1. Monitor App Store Connect for processing status
2. Check for any metadata requirements
3. Prepare for app review submission
4. Update app store screenshots and descriptions if needed

## Files Generated
- ios_deployment_metadata.json
- iOS archive (App.xcarchive)
- Exported IPA (export/App.ipa)

---
Generated automatically by iOS deployment script
EOF

echo -e "${GREEN}✅ Deployment report generated${NC}"

# Final summary
echo ""
echo -e "${GREEN}🎉 iOS deployment completed successfully!${NC}"
echo -e "${BLUE}📊 Summary:${NC}"
echo "  Platform: iOS"
echo "  App Version: $APP_VERSION ($BUILD_NUMBER)"
echo "  IPA Size: $IPA_SIZE"
echo "  Uploaded to Store: $([ "$UPLOAD_TO_STORE" == "true" ] && echo "Yes" || echo "No")"
echo ""
echo -e "${BLUE}📱 App Store Information:${NC}"
echo "  Bundle ID: $BUNDLE_ID"
echo "  Team ID: $TEAM_ID"
if [[ "$UPLOAD_TO_STORE" == "true" ]]; then
    echo "  App Store Connect: https://appstoreconnect.apple.com/apps/$APP_ID"
fi
echo ""
echo -e "${GREEN}✅ iOS deployment process completed!${NC}"