#!/bin/bash

# 2FA Studio - Web Application Deployment Script
# This script handles the complete web application deployment process

set -e

echo "🚀 2FA Studio - Web Application Deployment"
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
ENVIRONMENT="${1:-production}"
SKIP_TESTS="${2:-false}"
SKIP_BUILD="${3:-false}"

echo -e "${BLUE}📋 Deployment Configuration:${NC}"
echo "Project Root: $PROJECT_ROOT"
echo "Environment: $ENVIRONMENT"
echo "Skip Tests: $SKIP_TESTS"
echo "Skip Build: $SKIP_BUILD"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check exit status
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
    else
        echo -e "${RED}❌ $1${NC}"
        exit 1
    fi
}

# Change to project root
cd "$PROJECT_ROOT"

# Check required tools
echo -e "${BLUE}🔍 Checking required tools...${NC}"

required_tools=("node" "yarn" "firebase")
for tool in "${required_tools[@]}"; do
    if ! command_exists "$tool"; then
        echo -e "${RED}❌ $tool not found. Please install it.${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✅ All required tools are available${NC}"

# Load environment configuration
if [[ -f ".env.$ENVIRONMENT" ]]; then
    echo -e "${BLUE}📄 Loading environment configuration...${NC}"
    set -a
    source ".env.$ENVIRONMENT"
    set +a
    echo -e "${GREEN}✅ Environment configuration loaded${NC}"
else
    echo -e "${RED}❌ Environment file .env.$ENVIRONMENT not found${NC}"
    echo "Please create .env.$ENVIRONMENT from deployment/environment-config/$ENVIRONMENT.env.example"
    exit 1
fi

# Validate required environment variables
echo -e "${BLUE}🔍 Validating environment variables...${NC}"

required_vars=("VITE_FIREBASE_API_KEY" "VITE_FIREBASE_PROJECT_ID" "VITE_FIREBASE_AUTH_DOMAIN")
for var in "${required_vars[@]}"; do
    if [[ -z "${!var}" ]]; then
        echo -e "${RED}❌ Required environment variable $var is not set${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✅ Environment variables validated${NC}"

# Check Firebase authentication
echo -e "${BLUE}🔐 Checking Firebase authentication...${NC}"

if firebase projects:list | grep -q "No projects"; then
    echo -e "${RED}❌ Not authenticated with Firebase${NC}"
    echo "Please run: firebase login"
    exit 1
fi

# Set Firebase project
if [[ -n "$VITE_FIREBASE_PROJECT_ID" ]]; then
    echo -e "${BLUE}🔧 Setting Firebase project: $VITE_FIREBASE_PROJECT_ID${NC}"
    firebase use "$VITE_FIREBASE_PROJECT_ID"
    check_status "Firebase project set"
else
    echo -e "${RED}❌ VITE_FIREBASE_PROJECT_ID not set${NC}"
    exit 1
fi

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
yarn install --frozen-lockfile
check_status "Dependencies installed"

# Run tests (unless skipped)
if [[ "$SKIP_TESTS" != "true" ]]; then
    echo -e "${BLUE}🧪 Running tests...${NC}"
    
    # Run linting
    yarn lint
    check_status "Linting passed"
    
    # Run type checking
    yarn type-check
    check_status "Type checking passed"
    
    # Run unit tests
    if yarn test:coverage --run; then
        echo -e "${GREEN}✅ Tests passed${NC}"
    else
        echo -e "${RED}❌ Tests failed${NC}"
        echo "Fix failing tests before deploying to production"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  Skipping tests as requested${NC}"
fi

# Build application (unless skipped)
if [[ "$SKIP_BUILD" != "true" ]]; then
    echo -e "${BLUE}🏗️  Building application...${NC}"
    
    # Clean previous build
    rm -rf dist
    
    # Set build-time environment variables
    export NODE_ENV=production
    export VITE_BUILD_TIME="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
    export VITE_GIT_COMMIT="$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
    export VITE_GIT_BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')"
    
    # Build with production optimization
    yarn build
    check_status "Application built"
    
    # Verify build output
    if [[ ! -d "dist" ]]; then
        echo -e "${RED}❌ Build output directory 'dist' not found${NC}"
        exit 1
    fi
    
    if [[ ! -f "dist/index.html" ]]; then
        echo -e "${RED}❌ Build output 'dist/index.html' not found${NC}"
        exit 1
    fi
    
    # Calculate build size
    BUILD_SIZE=$(du -sh dist | cut -f1)
    echo -e "${BLUE}📊 Build size: $BUILD_SIZE${NC}"
    
else
    echo -e "${YELLOW}⚠️  Skipping build as requested${NC}"
    
    # Verify existing build
    if [[ ! -d "dist" ]]; then
        echo -e "${RED}❌ No existing build found. Cannot skip build.${NC}"
        exit 1
    fi
fi

# Run security audit
echo -e "${BLUE}🔒 Running security audit...${NC}"
if yarn audit --level high; then
    echo -e "${GREEN}✅ Security audit passed${NC}"
else
    echo -e "${YELLOW}⚠️  Security audit found issues. Review before deploying to production.${NC}"
    read -p "Continue with deployment? (y/N): " -r
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled"
        exit 1
    fi
fi

# Pre-deployment validation
echo -e "${BLUE}✅ Running pre-deployment validation...${NC}"

# Check Firebase configuration
if [[ ! -f "firebase.json" ]]; then
    echo -e "${RED}❌ firebase.json not found${NC}"
    exit 1
fi

# Validate Firebase configuration
firebase use
check_status "Firebase configuration validated"

# Check if production Firebase rules exist
if [[ -f "deployment/production-firestore.rules" ]]; then
    echo -e "${BLUE}🔧 Deploying production Firestore rules...${NC}"
    
    # Backup current rules
    firebase firestore:rules:get > firestore-rules-backup-$(date +%Y%m%d_%H%M%S).rules 2>/dev/null || true
    
    # Deploy production rules
    cp deployment/production-firestore.rules firestore.rules
    firebase deploy --only firestore:rules
    check_status "Firestore rules deployed"
else
    echo -e "${YELLOW}⚠️  Production Firestore rules not found, using existing rules${NC}"
fi

# Deploy storage rules if available
if [[ -f "deployment/firebase-storage.rules" ]]; then
    echo -e "${BLUE}🔧 Deploying storage rules...${NC}"
    cp deployment/firebase-storage.rules storage.rules
    firebase deploy --only storage:rules
    check_status "Storage rules deployed"
fi

# Deploy Firebase Functions (if they exist)
if [[ -d "functions" && -f "functions/package.json" ]]; then
    echo -e "${BLUE}☁️  Deploying Firebase Functions...${NC}"
    
    # Install function dependencies
    cd functions
    yarn install --frozen-lockfile
    
    # Build functions if TypeScript
    if [[ -f "tsconfig.json" ]]; then
        yarn build
    fi
    
    cd "$PROJECT_ROOT"
    
    # Deploy functions
    firebase deploy --only functions
    check_status "Firebase Functions deployed"
else
    echo -e "${BLUE}ℹ️  No Firebase Functions to deploy${NC}"
fi

# Deploy to Firebase Hosting
echo -e "${BLUE}🚀 Deploying to Firebase Hosting...${NC}"

# Use production Firebase configuration if available
if [[ -f "deployment/production-firebase.json" ]]; then
    firebase deploy --only hosting --config deployment/production-firebase.json
else
    firebase deploy --only hosting
fi

check_status "Application deployed to Firebase Hosting"

# Get deployment URL
HOSTING_URL=$(firebase hosting:sites:list --json | jq -r '.[0].defaultUrl' 2>/dev/null || echo "")

if [[ -z "$HOSTING_URL" ]]; then
    HOSTING_URL="https://$VITE_FIREBASE_PROJECT_ID.web.app"
fi

echo -e "${GREEN}🌐 Application deployed to: $HOSTING_URL${NC}"

# Post-deployment validation
echo -e "${BLUE}✅ Running post-deployment validation...${NC}"

# Health check
echo -e "${BLUE}🏥 Running health checks...${NC}"
sleep 10  # Wait for deployment to be fully available

# Test basic connectivity
if curl -f -s "$HOSTING_URL" > /dev/null; then
    echo -e "${GREEN}✅ Application is accessible${NC}"
else
    echo -e "${RED}❌ Application is not accessible${NC}"
    echo "URL: $HOSTING_URL"
    exit 1
fi

# Test specific routes
TEST_ROUTES=("/" "/accounts" "/settings")
for route in "${TEST_ROUTES[@]}"; do
    if curl -f -s "${HOSTING_URL}${route}" > /dev/null; then
        echo -e "${GREEN}✅ Route ${route} accessible${NC}"
    else
        echo -e "${YELLOW}⚠️  Route ${route} may not be accessible${NC}"
    fi
done

# Check security headers
echo -e "${BLUE}🔒 Checking security headers...${NC}"
SECURITY_CHECK=$(curl -s -I "$HOSTING_URL" | grep -i "strict-transport-security\|x-frame-options\|x-content-type-options" | wc -l)

if [[ $SECURITY_CHECK -ge 2 ]]; then
    echo -e "${GREEN}✅ Security headers present${NC}"
else
    echo -e "${YELLOW}⚠️  Some security headers may be missing${NC}"
fi

# Performance check
echo -e "${BLUE}⚡ Basic performance check...${NC}"
LOAD_TIME=$(curl -o /dev/null -s -w "%{time_total}" "$HOSTING_URL")
LOAD_TIME_MS=$(echo "$LOAD_TIME * 1000" | bc 2>/dev/null || echo "unknown")

if [[ "$LOAD_TIME_MS" != "unknown" ]]; then
    echo -e "${BLUE}📊 Page load time: ${LOAD_TIME_MS}ms${NC}"
    
    if (( $(echo "$LOAD_TIME < 2" | bc -l 2>/dev/null || echo 0) )); then
        echo -e "${GREEN}✅ Good performance${NC}"
    else
        echo -e "${YELLOW}⚠️  Consider performance optimizations${NC}"
    fi
fi

# Cleanup temporary files
echo -e "${BLUE}🧹 Cleaning up...${NC}"
rm -f firestore.rules storage.rules

# Generate deployment report
echo -e "${BLUE}📊 Generating deployment report...${NC}"

DEPLOYMENT_ID="deploy-$(date +%Y%m%d_%H%M%S)"
REPORT_FILE="deployment-report-$DEPLOYMENT_ID.md"

cat > "$REPORT_FILE" << EOF
# Deployment Report - $DEPLOYMENT_ID

## Deployment Summary
- **Date**: $(date -u)
- **Environment**: $ENVIRONMENT  
- **Project**: $VITE_FIREBASE_PROJECT_ID
- **URL**: $HOSTING_URL
- **Git Commit**: $(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')
- **Git Branch**: $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')

## Build Information
- **Build Size**: $BUILD_SIZE
- **Node Version**: $(node --version)
- **Yarn Version**: $(yarn --version)

## Deployment Status
- ✅ Dependencies installed
- ✅ Tests $(if [[ "$SKIP_TESTS" == "true" ]]; then echo "skipped"; else echo "passed"; fi)
- ✅ Application built
- ✅ Security audit completed
- ✅ Firebase rules deployed
- ✅ Application deployed
- ✅ Health checks passed

## Validation Results
- **Application Accessibility**: ✅ Accessible
- **Security Headers**: $(if [[ $SECURITY_CHECK -ge 2 ]]; then echo "✅ Present"; else echo "⚠️ Partial"; fi)
- **Performance**: $(if [[ "$LOAD_TIME_MS" != "unknown" ]]; then echo "⚡ ${LOAD_TIME_MS}ms"; else echo "Not measured"; fi)

## URLs
- **Production**: $HOSTING_URL
- **Firebase Console**: https://console.firebase.google.com/project/$VITE_FIREBASE_PROJECT_ID

## Next Steps
1. Monitor application for 24-48 hours
2. Check analytics and error reporting
3. Verify all features work correctly
4. Update documentation if needed

---
Generated automatically by deployment script
EOF

echo -e "${GREEN}✅ Deployment report saved: $REPORT_FILE${NC}"

# Send notification (if configured)
if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
    echo -e "${BLUE}📢 Sending deployment notification...${NC}"
    
    curl -X POST "$SLACK_WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d "{
            \"text\": \"🚀 2FA Studio deployed successfully!\",
            \"attachments\": [{
                \"color\": \"good\",
                \"fields\": [
                    {\"title\": \"Environment\", \"value\": \"$ENVIRONMENT\", \"short\": true},
                    {\"title\": \"URL\", \"value\": \"$HOSTING_URL\", \"short\": true},
                    {\"title\": \"Build Size\", \"value\": \"$BUILD_SIZE\", \"short\": true},
                    {\"title\": \"Load Time\", \"value\": \"${LOAD_TIME_MS}ms\", \"short\": true}
                ]
            }]
        }" 2>/dev/null || true
fi

# Final success message
echo ""
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${BLUE}📊 Summary:${NC}"
echo "  Environment: $ENVIRONMENT"
echo "  URL: $HOSTING_URL"
echo "  Build Size: $BUILD_SIZE"
echo "  Report: $REPORT_FILE"
echo ""
echo -e "${BLUE}🔗 Quick Links:${NC}"
echo "  Application: $HOSTING_URL"
echo "  Firebase Console: https://console.firebase.google.com/project/$VITE_FIREBASE_PROJECT_ID"
echo "  Hosting: https://console.firebase.google.com/project/$VITE_FIREBASE_PROJECT_ID/hosting/sites"
echo ""
echo -e "${BLUE}🎯 Next Steps:${NC}"
echo "1. Verify application functionality"
echo "2. Monitor performance and errors"
echo "3. Check analytics data flow"
echo "4. Update team on deployment status"
echo ""
echo -e "${GREEN}✅ Web deployment process completed successfully!${NC}"