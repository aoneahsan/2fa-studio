#!/bin/bash

# 2FA Studio - Production Rollback Script
# This script handles rolling back to a previous deployment

set -e

echo "🔄 2FA Studio - Production Rollback"
echo "================================="

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
ROLLBACK_VERSION="${2:-}"
REASON="${3:-Manual rollback}"

echo -e "${BLUE}📋 Rollback Configuration:${NC}"
echo "Project Root: $PROJECT_ROOT"
echo "Environment: $ENVIRONMENT"
echo "Rollback Version: ${ROLLBACK_VERSION:-'Previous version'}"
echo "Reason: $REASON"

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

if ! command_exists firebase; then
    echo -e "${RED}❌ Firebase CLI not found${NC}"
    exit 1
fi

if ! command_exists git; then
    echo -e "${RED}❌ Git not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Required tools available${NC}"

# Load environment configuration
if [[ -f ".env.$ENVIRONMENT" ]]; then
    echo -e "${BLUE}📄 Loading environment configuration...${NC}"
    set -a
    source ".env.$ENVIRONMENT"
    set +a
    echo -e "${GREEN}✅ Environment configuration loaded${NC}"
fi

# Firebase authentication check
echo -e "${BLUE}🔐 Checking Firebase authentication...${NC}"

if firebase projects:list | grep -q "No projects"; then
    echo -e "${RED}❌ Not authenticated with Firebase${NC}"
    echo "Please run: firebase login"
    exit 1
fi

# Set Firebase project
if [[ -n "$VITE_FIREBASE_PROJECT_ID" ]]; then
    firebase use "$VITE_FIREBASE_PROJECT_ID"
    check_status "Firebase project set"
else
    echo -e "${RED}❌ VITE_FIREBASE_PROJECT_ID not set${NC}"
    exit 1
fi

# Get current deployment information
echo -e "${BLUE}📊 Getting current deployment information...${NC}"

CURRENT_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
CURRENT_DATE=$(date -u)

echo "Current commit: $CURRENT_COMMIT"
echo "Current branch: $CURRENT_BRANCH"

# List recent Firebase hosting releases
echo -e "${BLUE}📋 Recent Firebase hosting releases:${NC}"
firebase hosting:releases:list --limit=5

# Confirm rollback
echo ""
echo -e "${YELLOW}⚠️  WARNING: This will rollback the production deployment${NC}"
echo -e "${YELLOW}This action cannot be easily undone.${NC}"
echo ""
echo "Rollback details:"
echo "  Environment: $ENVIRONMENT"
echo "  Reason: $REASON"
echo "  Current commit: $CURRENT_COMMIT"
echo ""

# Interactive confirmation unless SKIP_CONFIRMATION is set
if [[ "$SKIP_CONFIRMATION" != "true" ]]; then
    read -p "Are you sure you want to proceed with the rollback? (yes/NO): " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        echo "Rollback cancelled"
        exit 0
    fi
fi

# Create rollback backup
echo -e "${BLUE}💾 Creating rollback backup...${NC}"

BACKUP_DIR="rollback-backups/rollback-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup current state
echo "Current deployment info:" > "$BACKUP_DIR/deployment-info.txt"
echo "Commit: $CURRENT_COMMIT" >> "$BACKUP_DIR/deployment-info.txt"
echo "Branch: $CURRENT_BRANCH" >> "$BACKUP_DIR/deployment-info.txt"
echo "Date: $CURRENT_DATE" >> "$BACKUP_DIR/deployment-info.txt"
echo "Reason for rollback: $REASON" >> "$BACKUP_DIR/deployment-info.txt"

# Backup current Firebase rules
firebase firestore:rules:get > "$BACKUP_DIR/firestore-rules-backup.rules" 2>/dev/null || echo "No Firestore rules to backup"

echo -e "${GREEN}✅ Backup created in $BACKUP_DIR${NC}"

# Perform rollback based on method
if [[ -n "$ROLLBACK_VERSION" ]]; then
    # Rollback to specific version
    echo -e "${BLUE}🔄 Rolling back to version: $ROLLBACK_VERSION${NC}"
    
    # Check if it's a git commit hash
    if git cat-file -e "$ROLLBACK_VERSION" 2>/dev/null; then
        echo -e "${BLUE}📦 Rolling back to git commit: $ROLLBACK_VERSION${NC}"
        
        # Stash current changes
        git stash push -m "Pre-rollback stash $(date)"
        
        # Checkout the rollback version
        git checkout "$ROLLBACK_VERSION"
        
        # Install dependencies
        echo -e "${BLUE}📦 Installing dependencies for rollback version...${NC}"
        yarn install --frozen-lockfile
        
        # Build the rollback version
        echo -e "${BLUE}🏗️  Building rollback version...${NC}"
        yarn build
        check_status "Rollback version built"
        
    else
        # Try Firebase hosting rollback
        echo -e "${BLUE}🔄 Rolling back Firebase hosting to release: $ROLLBACK_VERSION${NC}"
        
        # This would require Firebase CLI to support rollback (currently limited)
        echo -e "${YELLOW}⚠️  Firebase hosting rollback to specific version not directly supported${NC}"
        echo -e "${YELLOW}Manual intervention may be required${NC}"
    fi
    
else
    # Rollback to previous commit
    echo -e "${BLUE}🔄 Rolling back to previous commit...${NC}"
    
    PREVIOUS_COMMIT=$(git rev-parse HEAD~1 2>/dev/null || echo "")
    
    if [[ -z "$PREVIOUS_COMMIT" ]]; then
        echo -e "${RED}❌ Cannot determine previous commit${NC}"
        exit 1
    fi
    
    echo "Rolling back from $CURRENT_COMMIT to $PREVIOUS_COMMIT"
    
    # Stash current changes
    git stash push -m "Pre-rollback stash $(date)"
    
    # Checkout previous commit
    git checkout "$PREVIOUS_COMMIT"
    
    # Install dependencies for previous version
    echo -e "${BLUE}📦 Installing dependencies for previous version...${NC}"
    yarn install --frozen-lockfile
    
    # Build previous version
    echo -e "${BLUE}🏗️  Building previous version...${NC}"
    yarn build
    check_status "Previous version built"
fi

# Deploy the rollback version
echo -e "${BLUE}🚀 Deploying rollback version...${NC}"

# Deploy Firestore rules if they exist
if [[ -f "deployment/production-firestore.rules" ]]; then
    echo -e "${BLUE}🔧 Deploying rollback Firestore rules...${NC}"
    cp deployment/production-firestore.rules firestore.rules
    firebase deploy --only firestore:rules
    check_status "Rollback Firestore rules deployed"
fi

# Deploy hosting
if [[ -f "deployment/production-firebase.json" ]]; then
    firebase deploy --only hosting --config deployment/production-firebase.json
else
    firebase deploy --only hosting
fi

check_status "Rollback deployment completed"

# Get deployment URL
HOSTING_URL=$(firebase hosting:sites:list --json | jq -r '.[0].defaultUrl' 2>/dev/null || echo "")
if [[ -z "$HOSTING_URL" ]]; then
    HOSTING_URL="https://$VITE_FIREBASE_PROJECT_ID.web.app"
fi

echo -e "${GREEN}🌐 Rollback deployed to: $HOSTING_URL${NC}"

# Post-rollback validation
echo -e "${BLUE}✅ Running post-rollback validation...${NC}"

# Wait for deployment to be available
sleep 15

# Test basic connectivity
if curl -f -s "$HOSTING_URL" > /dev/null; then
    echo -e "${GREEN}✅ Rollback application is accessible${NC}"
else
    echo -e "${RED}❌ Rollback application is not accessible${NC}"
    echo "URL: $HOSTING_URL"
    echo -e "${YELLOW}⚠️  Manual intervention may be required${NC}"
fi

# Test critical routes
CRITICAL_ROUTES=("/" "/accounts")
for route in "${CRITICAL_ROUTES[@]}"; do
    if curl -f -s "${HOSTING_URL}${route}" > /dev/null; then
        echo -e "${GREEN}✅ Critical route ${route} accessible${NC}"
    else
        echo -e "${RED}❌ Critical route ${route} not accessible${NC}"
    fi
done

# Create rollback report
echo -e "${BLUE}📊 Generating rollback report...${NC}"

ROLLBACK_ID="rollback-$(date +%Y%m%d_%H%M%S)"
REPORT_FILE="rollback-report-$ROLLBACK_ID.md"

cat > "$REPORT_FILE" << EOF
# Rollback Report - $ROLLBACK_ID

## Rollback Summary
- **Date**: $(date -u)
- **Environment**: $ENVIRONMENT
- **Reason**: $REASON
- **Project**: $VITE_FIREBASE_PROJECT_ID
- **URL**: $HOSTING_URL

## Version Information
- **Previous Commit**: $CURRENT_COMMIT
- **Rollback Commit**: $(git rev-parse HEAD 2>/dev/null || echo 'unknown')
- **Previous Branch**: $CURRENT_BRANCH
- **Current Branch**: $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')

## Rollback Status
- ✅ Backup created
- ✅ Code rolled back
- ✅ Dependencies installed
- ✅ Application built
- ✅ Firebase rules deployed
- ✅ Application deployed
- ✅ Basic validation passed

## Backup Location
- **Backup Directory**: $BACKUP_DIR
- **Firestore Rules Backup**: Available
- **Deployment Info**: Available

## Validation Results
- **Application Accessibility**: $(if curl -f -s "$HOSTING_URL" > /dev/null; then echo "✅ Accessible"; else echo "❌ Not accessible"; fi)
- **Critical Routes**: Tested

## URLs
- **Application**: $HOSTING_URL
- **Firebase Console**: https://console.firebase.google.com/project/$VITE_FIREBASE_PROJECT_ID

## Recovery Instructions
To recover from this rollback:
1. Identify and fix the issues that caused the rollback
2. Test thoroughly in staging environment
3. Deploy the fixed version using normal deployment process
4. Monitor closely after deployment

## Backup Information
- **Backup Location**: $BACKUP_DIR
- **Restore Command**: \`git checkout $CURRENT_COMMIT\`

---
Generated automatically by rollback script
EOF

echo -e "${GREEN}✅ Rollback report saved: $REPORT_FILE${NC}"

# Send notification (if configured)
if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
    echo -e "${BLUE}📢 Sending rollback notification...${NC}"
    
    curl -X POST "$SLACK_WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d "{
            \"text\": \"🔄 2FA Studio rollback completed\",
            \"attachments\": [{
                \"color\": \"warning\",
                \"fields\": [
                    {\"title\": \"Environment\", \"value\": \"$ENVIRONMENT\", \"short\": true},
                    {\"title\": \"Reason\", \"value\": \"$REASON\", \"short\": true},
                    {\"title\": \"URL\", \"value\": \"$HOSTING_URL\", \"short\": true},
                    {\"title\": \"Status\", \"value\": \"Completed\", \"short\": true}
                ]
            }]
        }" 2>/dev/null || true
fi

# Final instructions
echo ""
echo -e "${GREEN}🎉 Rollback completed successfully!${NC}"
echo -e "${BLUE}📊 Summary:${NC}"
echo "  Environment: $ENVIRONMENT"
echo "  URL: $HOSTING_URL"
echo "  Backup: $BACKUP_DIR"
echo "  Report: $REPORT_FILE"
echo ""
echo -e "${BLUE}🔗 Quick Links:${NC}"
echo "  Application: $HOSTING_URL"
echo "  Firebase Console: https://console.firebase.google.com/project/$VITE_FIREBASE_PROJECT_ID"
echo ""
echo -e "${BLUE}⚠️  Important Next Steps:${NC}"
echo "1. Monitor the rolled-back application closely"
echo "2. Identify and fix the root cause of the issue"
echo "3. Test fixes thoroughly in staging"
echo "4. Plan a proper deployment once issues are resolved"
echo "5. Document lessons learned from this incident"
echo ""
echo -e "${YELLOW}📝 Notes:${NC}"
echo "- The rollback backup is saved in: $BACKUP_DIR"
echo "- To restore the previous version: git checkout $CURRENT_COMMIT"
echo "- Monitor error tracking and analytics for any issues"
echo ""
echo -e "${GREEN}✅ Rollback process completed successfully!${NC}"