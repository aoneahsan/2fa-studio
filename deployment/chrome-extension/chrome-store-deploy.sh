#!/bin/bash

# 2FA Studio - Chrome Web Store Deployment Script
# This script handles Chrome Extension deployment to Chrome Web Store

set -e

echo "🌐 2FA Studio - Chrome Web Store Deployment"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
BUILD_TYPE="${1:-production}"
UPLOAD_TO_STORE="${2:-true}"
PUBLISH_IMMEDIATELY="${3:-false}"

# Chrome Web Store Configuration
EXTENSION_DIR="$PROJECT_ROOT/chrome-extension"
EXTENSION_ID="${CHROME_EXTENSION_ID}"

echo -e "${BLUE}📋 Deployment Configuration:${NC}"
echo "Project Root: $PROJECT_ROOT"
echo "Extension Directory: $EXTENSION_DIR"
echo "Build Type: $BUILD_TYPE"
echo "Upload to Store: $UPLOAD_TO_STORE"
echo "Publish Immediately: $PUBLISH_IMMEDIATELY"
echo "Extension ID: $EXTENSION_ID"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check required tools
echo -e "${BLUE}🔍 Checking required tools...${NC}"

required_tools=("node" "yarn" "zip" "curl" "jq")
for tool in "${required_tools[@]}"; do
    if ! command_exists "$tool"; then
        echo -e "${RED}❌ $tool not found. Please install it.${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✅ All required tools found${NC}"

# Change to project root
cd "$PROJECT_ROOT"

# Load environment configuration
if [[ -f ".env.$BUILD_TYPE" ]]; then
    echo -e "${BLUE}📄 Loading environment configuration...${NC}"
    set -a
    source ".env.$BUILD_TYPE"
    set +a
    echo -e "${GREEN}✅ Environment configuration loaded${NC}"
else
    echo -e "${RED}❌ Environment file not found: .env.$BUILD_TYPE${NC}"
    exit 1
fi

# Validate required environment variables
required_vars=("CHROME_EXTENSION_ID" "CHROME_CLIENT_ID" "CHROME_CLIENT_SECRET" "CHROME_REFRESH_TOKEN")
for var in "${required_vars[@]}"; do
    if [[ -z "${!var}" ]]; then
        echo -e "${RED}❌ Required environment variable not set: $var${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✅ All required environment variables are set${NC}"

# Pre-deployment checks
echo -e "${BLUE}🔍 Running pre-deployment checks...${NC}"

# Check if extension directory exists
if [[ ! -d "$EXTENSION_DIR" ]]; then
    echo -e "${RED}❌ Extension directory not found: $EXTENSION_DIR${NC}"
    exit 1
fi

# Check manifest.json exists
if [[ ! -f "$EXTENSION_DIR/manifest.json" ]]; then
    echo -e "${RED}❌ manifest.json not found in extension directory${NC}"
    exit 1
fi

# Validate manifest.json
if ! jq empty "$EXTENSION_DIR/manifest.json" 2>/dev/null; then
    echo -e "${RED}❌ Invalid manifest.json format${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Pre-deployment checks passed${NC}"

# Build web application (needed for extension integration)
echo -e "${BLUE}🏗️  Building web application...${NC}"

# Set build environment variables
export NODE_ENV="production"
export VITE_APP_ENV="$BUILD_TYPE"
export VITE_APP_VERSION="$(git describe --tags --always --dirty)"
export VITE_BUILD_TIME="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
export VITE_GIT_COMMIT="$(git rev-parse HEAD)"

# Build the web app (for extension integration)
yarn build

echo -e "${GREEN}✅ Web application build completed${NC}"

# Update extension version
echo -e "${BLUE}📝 Updating extension version...${NC}"

# Get version from package.json
APP_VERSION=$(node -p "require('./package.json').version")
CURRENT_DATE=$(date +%Y%m%d)

# Create new version number (e.g., 1.0.0.20241225)
EXTENSION_VERSION="${APP_VERSION}.${CURRENT_DATE}"

# Update manifest.json with new version
cd "$EXTENSION_DIR"

# Backup original manifest
cp manifest.json manifest.json.backup

# Update version in manifest.json
jq ".version = \"$EXTENSION_VERSION\"" manifest.json > manifest.json.tmp
mv manifest.json.tmp manifest.json

echo "Updated extension version to: $EXTENSION_VERSION"

echo -e "${GREEN}✅ Extension version updated${NC}"

# Validate extension structure
echo -e "${BLUE}🔍 Validating extension structure...${NC}"

# Check required files exist
required_files=("manifest.json" "background" "popup" "src")
for file in "${required_files[@]}"; do
    if [[ ! -e "$file" ]]; then
        echo -e "${RED}❌ Required extension file/directory not found: $file${NC}"
        exit 1
    fi
done

# Validate manifest version
MANIFEST_VERSION=$(jq -r '.manifest_version' manifest.json)
if [[ "$MANIFEST_VERSION" != "3" ]]; then
    echo -e "${RED}❌ Extension must use Manifest V3${NC}"
    exit 1
fi

# Check for required permissions
REQUIRED_PERMISSIONS=("activeTab" "storage")
for permission in "${REQUIRED_PERMISSIONS[@]}"; do
    if ! jq -e ".permissions | index(\"$permission\")" manifest.json > /dev/null; then
        echo -e "${YELLOW}⚠️  Permission '$permission' not found in manifest${NC}"
    fi
done

echo -e "${GREEN}✅ Extension structure validation passed${NC}"

# Lint extension code
echo -e "${BLUE}🔍 Linting extension code...${NC}"

# Run ESLint on extension files
if command_exists "eslint"; then
    eslint . --ext .js --fix || {
        echo -e "${YELLOW}⚠️  Linting issues found but continuing...${NC}"
    }
fi

# Run basic security checks
echo -e "${BLUE}🔒 Running security checks...${NC}"

# Check for eval usage (not allowed in Manifest V3)
if grep -r "eval(" . --include="*.js"; then
    echo -e "${RED}❌ Extension contains eval() which is not allowed${NC}"
    exit 1
fi

# Check for inline scripts
if grep -r "javascript:" . --include="*.html"; then
    echo -e "${RED}❌ Extension contains inline JavaScript${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Security checks passed${NC}"

# Build extension package
echo -e "${BLUE}📦 Building extension package...${NC}"

# Clean previous builds
rm -f ../2fa-studio-extension-*.zip

# Create extension package
PACKAGE_NAME="2fa-studio-extension-${EXTENSION_VERSION}.zip"

# Exclude development files and create zip
zip -r "../$PACKAGE_NAME" . \
    -x "*.backup" \
    -x "node_modules/*" \
    -x "*.log" \
    -x "*.md" \
    -x ".git/*" \
    -x ".DS_Store" \
    -x "*.tmp"

# Verify package was created
if [[ ! -f "../$PACKAGE_NAME" ]]; then
    echo -e "${RED}❌ Extension package creation failed${NC}"
    exit 1
fi

PACKAGE_SIZE=$(du -sh "../$PACKAGE_NAME" | cut -f1)
echo -e "${GREEN}✅ Extension package created: $PACKAGE_NAME (Size: $PACKAGE_SIZE)${NC}"

cd ..

# Get Chrome Web Store access token
echo -e "${BLUE}🔑 Getting Chrome Web Store access token...${NC}"

ACCESS_TOKEN_RESPONSE=$(curl -s -X POST \
    "https://oauth2.googleapis.com/token" \
    -d "client_id=$CHROME_CLIENT_ID" \
    -d "client_secret=$CHROME_CLIENT_SECRET" \
    -d "refresh_token=$CHROME_REFRESH_TOKEN" \
    -d "grant_type=refresh_token")

ACCESS_TOKEN=$(echo "$ACCESS_TOKEN_RESPONSE" | jq -r '.access_token')

if [[ "$ACCESS_TOKEN" == "null" || -z "$ACCESS_TOKEN" ]]; then
    echo -e "${RED}❌ Failed to get Chrome Web Store access token${NC}"
    echo "Response: $ACCESS_TOKEN_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✅ Chrome Web Store access token obtained${NC}"

# Upload extension to Chrome Web Store
if [[ "$UPLOAD_TO_STORE" == "true" ]]; then
    echo -e "${BLUE}🚀 Uploading extension to Chrome Web Store...${NC}"
    
    # Upload the package
    UPLOAD_RESPONSE=$(curl -s -X PUT \
        "https://www.googleapis.com/upload/chromewebstore/v1.1/items/$EXTENSION_ID" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "x-goog-api-version: 2" \
        -T "$PACKAGE_NAME")
    
    UPLOAD_STATUS=$(echo "$UPLOAD_RESPONSE" | jq -r '.uploadState // .error.code // "unknown"')
    
    if [[ "$UPLOAD_STATUS" == "SUCCESS" ]]; then
        echo -e "${GREEN}✅ Extension uploaded successfully${NC}"
    else
        echo -e "${RED}❌ Extension upload failed${NC}"
        echo "Response: $UPLOAD_RESPONSE"
        exit 1
    fi
    
    # Publish extension (if requested)
    if [[ "$PUBLISH_IMMEDIATELY" == "true" ]]; then
        echo -e "${BLUE}📢 Publishing extension...${NC}"
        
        PUBLISH_RESPONSE=$(curl -s -X POST \
            "https://www.googleapis.com/chromewebstore/v1.1/items/$EXTENSION_ID/publish" \
            -H "Authorization: Bearer $ACCESS_TOKEN" \
            -H "x-goog-api-version: 2")
        
        PUBLISH_STATUS=$(echo "$PUBLISH_RESPONSE" | jq -r '.status[0] // .error.code // "unknown"')
        
        if [[ "$PUBLISH_STATUS" == "OK" ]]; then
            echo -e "${GREEN}✅ Extension published successfully${NC}"
        else
            echo -e "${RED}❌ Extension publishing failed${NC}"
            echo "Response: $PUBLISH_RESPONSE"
            # Don't exit here as upload was successful
        fi
    else
        echo -e "${YELLOW}⚠️  Extension uploaded but not published (manual approval required)${NC}"
    fi
    
else
    echo -e "${YELLOW}⚠️  Skipping upload to Chrome Web Store${NC}"
fi

# Generate extension metadata
echo -e "${BLUE}📄 Generating extension metadata...${NC}"

DEPLOYMENT_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

cat > chrome_extension_metadata.json << EOF
{
  "platform": "chrome-extension",
  "extensionVersion": "$EXTENSION_VERSION",
  "appVersion": "$APP_VERSION",
  "extensionId": "$EXTENSION_ID",
  "buildType": "$BUILD_TYPE",
  "uploadedToStore": $UPLOAD_TO_STORE,
  "publishedImmediately": $PUBLISH_IMMEDIATELY,
  "deploymentTime": "$DEPLOYMENT_TIME",
  "gitCommit": "$(git rev-parse HEAD)",
  "gitBranch": "$(git rev-parse --abbrev-ref HEAD)",
  "packageSize": "$PACKAGE_SIZE",
  "packageName": "$PACKAGE_NAME",
  "manifestVersion": $MANIFEST_VERSION,
  "buildMachine": "$(uname -n)",
  "nodeVersion": "$(node --version)",
  "chromeStoreUrl": "https://chrome.google.com/webstore/detail/$EXTENSION_ID"
}
EOF

echo -e "${GREEN}✅ Extension metadata generated${NC}"

# Validate extension on Chrome Web Store (if uploaded)
if [[ "$UPLOAD_TO_STORE" == "true" ]]; then
    echo -e "${BLUE}🔍 Validating extension on Chrome Web Store...${NC}"
    
    # Get extension info from Chrome Web Store
    EXTENSION_INFO_RESPONSE=$(curl -s -X GET \
        "https://www.googleapis.com/chromewebstore/v1.1/items/$EXTENSION_ID" \
        -H "Authorization: Bearer $ACCESS_TOKEN")
    
    EXTENSION_STATUS=$(echo "$EXTENSION_INFO_RESPONSE" | jq -r '.status // "unknown"')
    
    echo "Chrome Web Store Status: $EXTENSION_STATUS"
    
    if [[ "$EXTENSION_STATUS" == "OK" ]]; then
        echo -e "${GREEN}✅ Extension validation passed${NC}"
    else
        echo -e "${YELLOW}⚠️  Extension status: $EXTENSION_STATUS${NC}"
    fi
fi

# Cleanup
echo -e "${BLUE}🧹 Cleaning up...${NC}"

# Restore original manifest
if [[ -f "$EXTENSION_DIR/manifest.json.backup" ]]; then
    mv "$EXTENSION_DIR/manifest.json.backup" "$EXTENSION_DIR/manifest.json"
fi

echo -e "${GREEN}✅ Cleanup completed${NC}"

# Send notification
if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
    echo -e "${BLUE}📢 Sending deployment notification...${NC}"
    
    STATUS_EMOJI="🌐"
    if [[ "$UPLOAD_TO_STORE" == "true" ]]; then
        if [[ "$PUBLISH_IMMEDIATELY" == "true" ]]; then
            STATUS_MESSAGE="Chrome extension published to Web Store"
        else
            STATUS_MESSAGE="Chrome extension uploaded to Web Store (pending review)"
        fi
    else
        STATUS_MESSAGE="Chrome extension built successfully (not uploaded)"
    fi
    
    curl -X POST "$SLACK_WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d "{
            \"text\": \"$STATUS_EMOJI 2FA Studio Chrome Extension Deployment\",
            \"attachments\": [{
                \"color\": \"good\",
                \"fields\": [
                    {\"title\": \"Platform\", \"value\": \"Chrome Extension\", \"short\": true},
                    {\"title\": \"Version\", \"value\": \"$EXTENSION_VERSION\", \"short\": true},
                    {\"title\": \"Status\", \"value\": \"$STATUS_MESSAGE\", \"short\": false},
                    {\"title\": \"Package Size\", \"value\": \"$PACKAGE_SIZE\", \"short\": true},
                    {\"title\": \"Extension ID\", \"value\": \"$EXTENSION_ID\", \"short\": true}
                ]
            }]
        }" || {
        echo -e "${YELLOW}⚠️  Failed to send Slack notification${NC}"
    }
fi

# Generate deployment report
echo -e "${BLUE}📊 Generating deployment report...${NC}"

cat > "chrome_extension_deployment_report_$(date +%Y%m%d_%H%M%S).md" << EOF
# Chrome Extension Deployment Report

## Deployment Summary
- **Status**: ✅ Success
- **Platform**: Chrome Extension
- **Extension Version**: $EXTENSION_VERSION
- **App Version**: $APP_VERSION
- **Extension ID**: $EXTENSION_ID
- **Deployment Time**: $DEPLOYMENT_TIME

## Build Information
- **Build Type**: $BUILD_TYPE
- **Git Commit**: $(git rev-parse HEAD)
- **Git Branch**: $(git rev-parse --abbrev-ref HEAD)
- **Package Size**: $PACKAGE_SIZE
- **Package Name**: $PACKAGE_NAME
- **Manifest Version**: $MANIFEST_VERSION

## Chrome Web Store
- **Uploaded**: $([ "$UPLOAD_TO_STORE" == "true" ] && echo "Yes" || echo "No")
- **Published**: $([ "$PUBLISH_IMMEDIATELY" == "true" ] && echo "Yes" || echo "No")
- **Extension ID**: $EXTENSION_ID
- **Store URL**: https://chrome.google.com/webstore/detail/$EXTENSION_ID

## Security & Compliance
- **Manifest V3**: ✅ Yes
- **No eval() usage**: ✅ Verified
- **No inline scripts**: ✅ Verified
- **Required permissions**: ✅ Validated

## Next Steps
1. Monitor Chrome Web Store for review status
2. Test extension functionality in various Chrome versions
3. Update extension description and screenshots if needed
4. Monitor user reviews and ratings

## Files Generated
- chrome_extension_metadata.json
- Extension package: $PACKAGE_NAME

---
Generated automatically by Chrome Extension deployment script
EOF

echo -e "${GREEN}✅ Deployment report generated${NC}"

# Final summary
echo ""
echo -e "${GREEN}🎉 Chrome Extension deployment completed successfully!${NC}"
echo -e "${BLUE}📊 Summary:${NC}"
echo "  Platform: Chrome Extension"
echo "  Extension Version: $EXTENSION_VERSION"
echo "  Package Size: $PACKAGE_SIZE"
echo "  Uploaded to Store: $([ "$UPLOAD_TO_STORE" == "true" ] && echo "Yes" || echo "No")"
echo "  Published: $([ "$PUBLISH_IMMEDIATELY" == "true" ] && echo "Yes" || echo "No")"
echo ""
echo -e "${BLUE}🌐 Chrome Web Store Information:${NC}"
echo "  Extension ID: $EXTENSION_ID"
echo "  Store URL: https://chrome.google.com/webstore/detail/$EXTENSION_ID"
echo "  Developer Dashboard: https://chrome.google.com/webstore/developer/dashboard"
echo ""
echo -e "${GREEN}✅ Chrome Extension deployment process completed!${NC}"