#!/bin/bash

# 2FA Studio Release Build Script
# This script builds production-ready versions for iOS and Android
# 
# Usage:
#   ./scripts/build-release.sh [platform] [environment]
#   
# Platforms: ios, android, both (default)
# Environments: staging, production (default)

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="2FA Studio"
APP_ID="com.aoneahsan.twofastudio"
PLATFORMS=("ios" "android")
DEFAULT_PLATFORM="both"
DEFAULT_ENV="production"

# Parse arguments
PLATFORM="${1:-$DEFAULT_PLATFORM}"
ENVIRONMENT="${2:-$DEFAULT_ENV}"

echo -e "${BLUE}🚀 Starting $PROJECT_NAME Release Build${NC}"
echo -e "${BLUE}Platform: $PLATFORM${NC}"
echo -e "${BLUE}Environment: $ENVIRONMENT${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found. Please run this script from the project root.${NC}"
    exit 1
fi

# Check if required tools are installed
check_requirements() {
    echo -e "${YELLOW}🔍 Checking build requirements...${NC}"
    
    # Node.js and yarn
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js is required but not installed.${NC}"
        exit 1
    fi
    
    if ! command -v yarn &> /dev/null; then
        echo -e "${RED}❌ Yarn is required but not installed.${NC}"
        exit 1
    fi
    
    # Capacitor CLI
    if ! yarn capacitor --version &> /dev/null; then
        echo -e "${RED}❌ Capacitor CLI is not available.${NC}"
        exit 1
    fi
    
    # Platform-specific requirements
    if [ "$PLATFORM" = "ios" ] || [ "$PLATFORM" = "both" ]; then
        if ! command -v xcodebuild &> /dev/null; then
            echo -e "${RED}❌ Xcode is required for iOS builds but not found.${NC}"
            exit 1
        fi
    fi
    
    if [ "$PLATFORM" = "android" ] || [ "$PLATFORM" = "both" ]; then
        if [ -z "$ANDROID_HOME" ]; then
            echo -e "${RED}❌ ANDROID_HOME environment variable is not set.${NC}"
            exit 1
        fi
        
        if ! command -v gradle &> /dev/null; then
            echo -e "${RED}❌ Gradle is required for Android builds but not found.${NC}"
            exit 1
        fi
    fi
    
    echo -e "${GREEN}✅ All requirements satisfied${NC}"
}

# Clean build artifacts
clean_build() {
    echo -e "${YELLOW}🧹 Cleaning previous builds...${NC}"
    
    # Clean web build
    rm -rf dist/
    rm -rf build/
    
    # Clean iOS build
    if [ -d "ios/App/build" ]; then
        rm -rf ios/App/build/
    fi
    
    # Clean Android build
    if [ -d "android/app/build" ]; then
        rm -rf android/app/build/
    fi
    
    # Clean node_modules if requested
    if [ "$3" = "--clean-deps" ]; then
        echo -e "${YELLOW}🧹 Cleaning dependencies...${NC}"
        rm -rf node_modules/
        yarn install --frozen-lockfile
    fi
    
    echo -e "${GREEN}✅ Build artifacts cleaned${NC}"
}

# Update version based on environment
update_version() {
    echo -e "${YELLOW}📝 Updating version for $ENVIRONMENT environment...${NC}"
    
    # Get current version from package.json
    CURRENT_VERSION=$(node -p "require('./package.json').version")
    
    if [ "$ENVIRONMENT" = "staging" ]; then
        # Add staging suffix
        NEW_VERSION="$CURRENT_VERSION-staging.$(date +%Y%m%d%H%M)"
    else
        NEW_VERSION="$CURRENT_VERSION"
    fi
    
    echo -e "${BLUE}Version: $NEW_VERSION${NC}"
    
    # Update package.json
    node -e "
        const fs = require('fs');
        const pkg = require('./package.json');
        pkg.version = '$NEW_VERSION';
        fs.writeFileSync('./package.json', JSON.stringify(pkg, null, 2) + '\n');
    "
    
    echo -e "${GREEN}✅ Version updated to $NEW_VERSION${NC}"
}

# Generate icons and splash screens
generate_assets() {
    echo -e "${YELLOW}🎨 Generating app icons and splash screens...${NC}"
    
    # Generate icons
    if [ -f "scripts/generate-icons.js" ]; then
        node scripts/generate-icons.js
    else
        echo -e "${YELLOW}⚠️  Icon generation script not found, skipping...${NC}"
    fi
    
    # Generate splash screens
    if [ -f "scripts/generate-splash.js" ]; then
        node scripts/generate-splash.js
    else
        echo -e "${YELLOW}⚠️  Splash screen generation script not found, skipping...${NC}"
    fi
    
    echo -e "${GREEN}✅ Assets generated${NC}"
}

# Build web application
build_web() {
    echo -e "${YELLOW}🌐 Building web application...${NC}"
    
    # Set environment variables
    if [ "$ENVIRONMENT" = "staging" ]; then
        export NODE_ENV=staging
        export VITE_APP_ENV=staging
        export VITE_FIREBASE_PROJECT_ID=2fa-studio-staging
    else
        export NODE_ENV=production
        export VITE_APP_ENV=production
        export VITE_FIREBASE_PROJECT_ID=2fa-studio-prod
    fi
    
    # Build the application
    yarn build
    
    if [ ! -d "dist" ]; then
        echo -e "${RED}❌ Web build failed - dist directory not found${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Web application built successfully${NC}"
}

# Sync with Capacitor
sync_capacitor() {
    echo -e "${YELLOW}⚡ Syncing with Capacitor...${NC}"
    
    yarn cap sync
    
    if [ "$?" -ne 0 ]; then
        echo -e "${RED}❌ Capacitor sync failed${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Capacitor sync completed${NC}"
}

# Build iOS application
build_ios() {
    echo -e "${YELLOW}🍎 Building iOS application...${NC}"
    
    cd ios/App
    
    # Clean Xcode build
    xcodebuild clean -workspace App.xcworkspace -scheme App -configuration Release
    
    # Archive the application
    if [ "$ENVIRONMENT" = "staging" ]; then
        PROVISIONING_PROFILE="2FA Studio Staging"
        EXPORT_METHOD="ad-hoc"
    else
        PROVISIONING_PROFILE="2FA Studio Production"
        EXPORT_METHOD="app-store"
    fi
    
    # Build archive
    xcodebuild archive \
        -workspace App.xcworkspace \
        -scheme App \
        -configuration Release \
        -archivePath "build/App.xcarchive" \
        -destination "generic/platform=iOS" \
        CODE_SIGN_STYLE=Manual \
        PROVISIONING_PROFILE_SPECIFIER="$PROVISIONING_PROFILE" \
        CODE_SIGN_IDENTITY="iPhone Distribution"
    
    if [ "$?" -ne 0 ]; then
        echo -e "${RED}❌ iOS build failed${NC}"
        cd ../..
        exit 1
    fi
    
    # Export IPA
    xcodebuild -exportArchive \
        -archivePath "build/App.xcarchive" \
        -exportPath "build/" \
        -exportOptionsPlist "ExportOptions.plist"
    
    if [ "$?" -ne 0 ]; then
        echo -e "${RED}❌ iOS export failed${NC}"
        cd ../..
        exit 1
    fi
    
    cd ../..
    
    echo -e "${GREEN}✅ iOS build completed successfully${NC}"
    echo -e "${BLUE}📱 iOS build location: ios/App/build/App.ipa${NC}"
}

# Build Android application
build_android() {
    echo -e "${YELLOW}🤖 Building Android application...${NC}"
    
    cd android
    
    # Clean Gradle build
    ./gradlew clean
    
    # Set environment-specific variables
    if [ "$ENVIRONMENT" = "staging" ]; then
        BUILD_TYPE="release"
        APK_NAME="2fa-studio-staging.apk"
        AAB_NAME="2fa-studio-staging.aab"
    else
        BUILD_TYPE="release"
        APK_NAME="2fa-studio-production.apk"
        AAB_NAME="2fa-studio-production.aab"
    fi
    
    # Build APK
    ./gradlew assembleRelease
    
    if [ "$?" -ne 0 ]; then
        echo -e "${RED}❌ Android APK build failed${NC}"
        cd ..
        exit 1
    fi
    
    # Build AAB (Android App Bundle) for Play Store
    ./gradlew bundleRelease
    
    if [ "$?" -ne 0 ]; then
        echo -e "${RED}❌ Android AAB build failed${NC}"
        cd ..
        exit 1
    fi
    
    # Copy builds to more accessible location
    mkdir -p build/outputs/
    cp app/build/outputs/apk/release/app-release.apk "build/outputs/$APK_NAME"
    cp app/build/outputs/bundle/release/app-release.aab "build/outputs/$AAB_NAME"
    
    cd ..
    
    echo -e "${GREEN}✅ Android build completed successfully${NC}"
    echo -e "${BLUE}📱 Android APK: android/build/outputs/$APK_NAME${NC}"
    echo -e "${BLUE}📱 Android AAB: android/build/outputs/$AAB_NAME${NC}"
}

# Create build report
create_build_report() {
    echo -e "${YELLOW}📊 Creating build report...${NC}"
    
    BUILD_DATE=$(date '+%Y-%m-%d %H:%M:%S')
    BUILD_ID=$(date +%Y%m%d%H%M%S)
    
    cat > build-report.json << EOF
{
  "buildId": "$BUILD_ID",
  "buildDate": "$BUILD_DATE",
  "environment": "$ENVIRONMENT",
  "platform": "$PLATFORM",
  "version": "$(node -p "require('./package.json').version")",
  "nodeVersion": "$(node --version)",
  "yarnVersion": "$(yarn --version)",
  "capacitorVersion": "$(yarn capacitor --version 2>/dev/null || echo 'unknown')",
  "buildArtifacts": {
EOF

    if [ "$PLATFORM" = "ios" ] || [ "$PLATFORM" = "both" ]; then
        if [ -f "ios/App/build/App.ipa" ]; then
            IOS_SIZE=$(du -h ios/App/build/App.ipa | cut -f1)
            echo "    \"ios\": {" >> build-report.json
            echo "      \"path\": \"ios/App/build/App.ipa\"," >> build-report.json
            echo "      \"size\": \"$IOS_SIZE\"" >> build-report.json
            echo "    }," >> build-report.json
        fi
    fi

    if [ "$PLATFORM" = "android" ] || [ "$PLATFORM" = "both" ]; then
        if [ -f "android/build/outputs/2fa-studio-$ENVIRONMENT.apk" ]; then
            APK_SIZE=$(du -h android/build/outputs/2fa-studio-$ENVIRONMENT.apk | cut -f1)
            echo "    \"androidApk\": {" >> build-report.json
            echo "      \"path\": \"android/build/outputs/2fa-studio-$ENVIRONMENT.apk\"," >> build-report.json
            echo "      \"size\": \"$APK_SIZE\"" >> build-report.json
            echo "    }," >> build-report.json
        fi
        
        if [ -f "android/build/outputs/2fa-studio-$ENVIRONMENT.aab" ]; then
            AAB_SIZE=$(du -h android/build/outputs/2fa-studio-$ENVIRONMENT.aab | cut -f1)
            echo "    \"androidAab\": {" >> build-report.json
            echo "      \"path\": \"android/build/outputs/2fa-studio-$ENVIRONMENT.aab\"," >> build-report.json
            echo "      \"size\": \"$AAB_SIZE\"" >> build-report.json
            echo "    }" >> build-report.json
        fi
    fi

    echo "  }" >> build-report.json
    echo "}" >> build-report.json
    
    echo -e "${GREEN}✅ Build report created: build-report.json${NC}"
}

# Main build process
main() {
    echo -e "${BLUE}🔧 Starting build process...${NC}"
    echo ""
    
    # Check requirements
    check_requirements
    
    # Clean build artifacts
    clean_build
    
    # Update version
    update_version
    
    # Generate assets
    generate_assets
    
    # Install dependencies
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    yarn install --frozen-lockfile
    
    # Build web application
    build_web
    
    # Sync with Capacitor
    sync_capacitor
    
    # Build platforms
    if [ "$PLATFORM" = "ios" ] || [ "$PLATFORM" = "both" ]; then
        build_ios
    fi
    
    if [ "$PLATFORM" = "android" ] || [ "$PLATFORM" = "both" ]; then
        build_android
    fi
    
    # Create build report
    create_build_report
    
    # Success message
    echo ""
    echo -e "${GREEN}🎉 Build completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}Build Summary:${NC}"
    echo -e "${BLUE}- Platform: $PLATFORM${NC}"
    echo -e "${BLUE}- Environment: $ENVIRONMENT${NC}"
    echo -e "${BLUE}- Version: $(node -p "require('./package.json').version")${NC}"
    echo ""
    
    if [ "$PLATFORM" = "ios" ] || [ "$PLATFORM" = "both" ]; then
        if [ -f "ios/App/build/App.ipa" ]; then
            echo -e "${GREEN}📱 iOS build ready for distribution${NC}"
        fi
    fi
    
    if [ "$PLATFORM" = "android" ] || [ "$PLATFORM" = "both" ]; then
        if [ -f "android/build/outputs/2fa-studio-$ENVIRONMENT.apk" ]; then
            echo -e "${GREEN}🤖 Android APK ready for distribution${NC}"
        fi
        if [ -f "android/build/outputs/2fa-studio-$ENVIRONMENT.aab" ]; then
            echo -e "${GREEN}🤖 Android AAB ready for Play Store${NC}"
        fi
    fi
    
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo -e "${BLUE}1. Test the built applications thoroughly${NC}"
    echo -e "${BLUE}2. Upload to respective app stores or distribution platforms${NC}"
    echo -e "${BLUE}3. Monitor deployment and user feedback${NC}"
}

# Run main function
main "$@"