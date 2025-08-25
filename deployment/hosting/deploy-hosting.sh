#!/bin/bash

# 2FA Studio - Firebase Hosting Deployment Script
# This script handles production deployment with CDN optimization

set -e

echo "🚀 2FA Studio - Firebase Hosting Deployment"
echo "============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
DEPLOYMENT_ENV="${1:-production}"
SKIP_BUILD="${2:-false}"
SKIP_TESTS="${3:-false}"

echo -e "${BLUE}📋 Deployment Configuration:${NC}"
echo "Environment: $DEPLOYMENT_ENV"
echo "Project Root: $PROJECT_ROOT"
echo "Skip Build: $SKIP_BUILD"
echo "Skip Tests: $SKIP_TESTS"

# Validate environment
if [[ ! "$DEPLOYMENT_ENV" =~ ^(staging|production)$ ]]; then
    echo -e "${RED}❌ Invalid environment. Use 'staging' or 'production'${NC}"
    exit 1
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check required tools
echo -e "${BLUE}🔍 Checking required tools...${NC}"

required_tools=("node" "yarn" "firebase")
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
if [[ -f ".env.$DEPLOYMENT_ENV" ]]; then
    echo -e "${BLUE}📄 Loading environment configuration...${NC}"
    set -a
    source ".env.$DEPLOYMENT_ENV"
    set +a
    echo -e "${GREEN}✅ Environment configuration loaded${NC}"
else
    echo -e "${YELLOW}⚠️  No environment file found: .env.$DEPLOYMENT_ENV${NC}"
fi

# Set Firebase project
if [[ -n "$FIREBASE_PROJECT_ID" ]]; then
    echo -e "${BLUE}🔧 Setting Firebase project: $FIREBASE_PROJECT_ID${NC}"
    firebase use "$FIREBASE_PROJECT_ID"
else
    echo -e "${RED}❌ FIREBASE_PROJECT_ID not set${NC}"
    exit 1
fi

# Pre-deployment checks
echo -e "${BLUE}🔍 Running pre-deployment checks...${NC}"

# Check if Firebase project is accessible
if ! firebase projects:list | grep -q "$FIREBASE_PROJECT_ID"; then
    echo -e "${RED}❌ Cannot access Firebase project: $FIREBASE_PROJECT_ID${NC}"
    exit 1
fi

# Check Git status
if [[ "$DEPLOYMENT_ENV" == "production" ]]; then
    if ! git diff-index --quiet HEAD --; then
        echo -e "${YELLOW}⚠️  Warning: Working directory has uncommitted changes${NC}"
        read -p "Continue with deployment? (y/N): " -n 1 -r
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

# Run tests
if [[ "$SKIP_TESTS" != "true" ]]; then
    echo -e "${BLUE}🧪 Running tests...${NC}"
    
    # Unit tests
    echo "Running unit tests..."
    yarn test --run --reporter=verbose
    
    # E2E tests for staging
    if [[ "$DEPLOYMENT_ENV" == "staging" ]]; then
        echo "Running E2E tests..."
        yarn cypress:run --env environment=staging
    fi
    
    echo -e "${GREEN}✅ Tests passed${NC}"
else
    echo -e "${YELLOW}⚠️  Skipping tests${NC}"
fi

# Build application
if [[ "$SKIP_BUILD" != "true" ]]; then
    echo -e "${BLUE}🏗️  Building application...${NC}"
    
    # Clean previous build
    rm -rf dist
    
    # Set build environment
    export NODE_ENV="production"
    export VITE_APP_ENV="$DEPLOYMENT_ENV"
    export VITE_APP_VERSION="$(git rev-parse --short HEAD)"
    export VITE_BUILD_TIME="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
    
    # Build with optimizations
    yarn build
    
    # Verify build output
    if [[ ! -d "dist" || ! -f "dist/index.html" ]]; then
        echo -e "${RED}❌ Build failed - dist directory or index.html not found${NC}"
        exit 1
    fi
    
    # Check bundle size
    BUNDLE_SIZE=$(du -sh dist | cut -f1)
    echo -e "${GREEN}✅ Build completed - Bundle size: $BUNDLE_SIZE${NC}"
    
    # Analyze bundle if in production
    if [[ "$DEPLOYMENT_ENV" == "production" ]]; then
        echo -e "${BLUE}📊 Analyzing bundle...${NC}"
        npx vite-bundle-analyzer dist --mode static --report dist/bundle-report.html || true
    fi
else
    echo -e "${YELLOW}⚠️  Skipping build${NC}"
    
    # Verify existing build
    if [[ ! -d "dist" ]]; then
        echo -e "${RED}❌ No existing build found. Cannot skip build.${NC}"
        exit 1
    fi
fi

# Security scan
if [[ "$DEPLOYMENT_ENV" == "production" ]]; then
    echo -e "${BLUE}🔒 Running security scan...${NC}"
    
    # Audit dependencies
    yarn audit --level moderate || {
        echo -e "${YELLOW}⚠️  Security vulnerabilities found. Review before production deployment.${NC}"
        read -p "Continue with deployment? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Deployment cancelled."
            exit 1
        fi
    }
    
    # Scan build output
    if command_exists "snyk"; then
        snyk test --severity-threshold=high || true
    fi
    
    echo -e "${GREEN}✅ Security scan completed${NC}"
fi

# Generate deployment metadata
echo -e "${BLUE}📄 Generating deployment metadata...${NC}"

DEPLOYMENT_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
GIT_COMMIT=$(git rev-parse HEAD)
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
DEPLOYER=$(git config user.email 2>/dev/null || echo "unknown")

cat > dist/deployment-info.json << EOF
{
  "environment": "$DEPLOYMENT_ENV",
  "version": "$(node -p "require('./package.json').version")",
  "buildTime": "$VITE_BUILD_TIME",
  "deploymentTime": "$DEPLOYMENT_TIME",
  "git": {
    "commit": "$GIT_COMMIT",
    "branch": "$GIT_BRANCH"
  },
  "deployer": "$DEPLOYER",
  "nodeVersion": "$(node --version)",
  "yarnVersion": "$(yarn --version)"
}
EOF

echo -e "${GREEN}✅ Deployment metadata generated${NC}"

# Deploy to Firebase Hosting
echo -e "${BLUE}🚀 Deploying to Firebase Hosting...${NC}"

# Use environment-specific hosting configuration
HOSTING_CONFIG="deployment/hosting/firebase-hosting-config.json"
if [[ -f "$HOSTING_CONFIG" ]]; then
    cp "$HOSTING_CONFIG" firebase-hosting-temp.json
    
    # Deploy with custom configuration
    firebase deploy --only hosting --config firebase-hosting-temp.json
    
    # Cleanup
    rm firebase-hosting-temp.json
else
    # Deploy with default configuration
    firebase deploy --only hosting
fi

# Get deployment URL
HOSTING_URL="https://$FIREBASE_PROJECT_ID.firebaseapp.com"
if [[ "$DEPLOYMENT_ENV" == "staging" ]]; then
    HOSTING_URL="https://$FIREBASE_PROJECT_ID--staging.firebaseapp.com"
fi

echo -e "${GREEN}✅ Deployment completed${NC}"
echo -e "${GREEN}🌐 URL: $HOSTING_URL${NC}"

# Post-deployment verification
echo -e "${BLUE}🔍 Running post-deployment verification...${NC}"

# Health check
echo "Checking deployment health..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HOSTING_URL" || echo "000")

if [[ "$HTTP_STATUS" == "200" ]]; then
    echo -e "${GREEN}✅ Health check passed${NC}"
else
    echo -e "${RED}❌ Health check failed (HTTP $HTTP_STATUS)${NC}"
    exit 1
fi

# Verify critical resources
echo "Verifying critical resources..."
CRITICAL_RESOURCES=(
    "/manifest.json"
    "/sw.js"
    "/favicon.ico"
)

for resource in "${CRITICAL_RESOURCES[@]}"; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HOSTING_URL$resource")
    if [[ "$STATUS" == "200" ]]; then
        echo "  ✅ $resource"
    else
        echo "  ❌ $resource (HTTP $STATUS)"
    fi
done

# Performance check
echo "Running basic performance check..."
if command_exists "lighthouse"; then
    lighthouse "$HOSTING_URL" --only-categories=performance --chrome-flags="--headless" --output=json --output-path=./lighthouse-report.json || true
    
    if [[ -f "./lighthouse-report.json" ]]; then
        PERFORMANCE_SCORE=$(node -p "Math.round(JSON.parse(require('fs').readFileSync('./lighthouse-report.json', 'utf8')).categories.performance.score * 100)")
        echo -e "${GREEN}📊 Performance Score: $PERFORMANCE_SCORE/100${NC}"
        rm ./lighthouse-report.json
    fi
fi

# CDN optimization (if using CloudFlare)
if [[ -n "$CLOUDFLARE_API_TOKEN" && -n "$CLOUDFLARE_ZONE_ID" ]]; then
    echo -e "${BLUE}🌐 Purging CDN cache...${NC}"
    
    curl -X POST "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/purge_cache" \
        -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
        -H "Content-Type: application/json" \
        --data '{"purge_everything":true}' || {
        echo -e "${YELLOW}⚠️  Failed to purge CDN cache${NC}"
    }
    
    echo -e "${GREEN}✅ CDN cache purged${NC}"
fi

# Send deployment notification
if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
    echo -e "${BLUE}📢 Sending deployment notification...${NC}"
    
    curl -X POST "$SLACK_WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d "{
            \"text\": \"🚀 2FA Studio deployed to $DEPLOYMENT_ENV\",
            \"attachments\": [{
                \"color\": \"good\",
                \"fields\": [
                    {\"title\": \"Environment\", \"value\": \"$DEPLOYMENT_ENV\", \"short\": true},
                    {\"title\": \"Version\", \"value\": \"$(node -p "require('./package.json').version")\", \"short\": true},
                    {\"title\": \"URL\", \"value\": \"$HOSTING_URL\", \"short\": false},
                    {\"title\": \"Commit\", \"value\": \"$GIT_COMMIT\", \"short\": true},
                    {\"title\": \"Branch\", \"value\": \"$GIT_BRANCH\", \"short\": true}
                ]
            }]
        }" || {
        echo -e "${YELLOW}⚠️  Failed to send Slack notification${NC}"
    }
fi

# Generate deployment report
echo -e "${BLUE}📊 Generating deployment report...${NC}"

cat > "deployment-report-$(date +%Y%m%d-%H%M%S).md" << EOF
# 2FA Studio Deployment Report

## Summary
- **Environment**: $DEPLOYMENT_ENV
- **Status**: ✅ Success
- **URL**: $HOSTING_URL
- **Deployment Time**: $DEPLOYMENT_TIME

## Build Information
- **Version**: $(node -p "require('./package.json').version")
- **Git Commit**: $GIT_COMMIT
- **Git Branch**: $GIT_BRANCH
- **Bundle Size**: $BUNDLE_SIZE

## Verification Results
- **Health Check**: ✅ Passed (HTTP $HTTP_STATUS)
- **Critical Resources**: See verification output above
$(if [[ -n "$PERFORMANCE_SCORE" ]]; then echo "- **Performance Score**: $PERFORMANCE_SCORE/100"; fi)

## Deployer Information
- **Deployer**: $DEPLOYER
- **Node Version**: $(node --version)
- **Yarn Version**: $(yarn --version)

## Next Steps
1. Monitor application performance
2. Watch for error reports
3. Validate user functionality
4. Update documentation if needed

---
Generated automatically by deployment script
EOF

echo -e "${GREEN}✅ Deployment report generated${NC}"

# Final success message
echo ""
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${BLUE}📊 Summary:${NC}"
echo "  Environment: $DEPLOYMENT_ENV"
echo "  URL: $HOSTING_URL"
echo "  Status: Deployed and verified"
echo "  Bundle Size: $BUNDLE_SIZE"
echo ""
echo -e "${BLUE}🔗 Useful Links:${NC}"
echo "  Application: $HOSTING_URL"
echo "  Firebase Console: https://console.firebase.google.com/project/$FIREBASE_PROJECT_ID"
echo "  GitHub Actions: https://github.com/$(git config remote.origin.url | sed 's/.*github.com[:/]\(.*\)\.git/\1/')/actions"
echo ""
echo -e "${GREEN}✅ Deployment process completed!${NC}"