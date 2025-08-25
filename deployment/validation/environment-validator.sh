#!/bin/bash

# 2FA Studio - Production Environment Validation Script
# This script validates the production environment before deployment

set -e

echo "✅ 2FA Studio - Production Environment Validation"
echo "================================================"

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
VERBOSE="${2:-false}"

echo -e "${BLUE}📋 Validation Configuration:${NC}"
echo "Project Root: $PROJECT_ROOT"
echo "Environment: $ENVIRONMENT"
echo "Verbose Mode: $VERBOSE"

# Validation counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# Function to log validation results
log_check() {
    local status="$1"
    local message="$2"
    local details="$3"
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    case "$status" in
        "PASS")
            PASSED_CHECKS=$((PASSED_CHECKS + 1))
            echo -e "${GREEN}✅ $message${NC}"
            ;;
        "FAIL")
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
            echo -e "${RED}❌ $message${NC}"
            if [[ -n "$details" ]]; then
                echo -e "${RED}   Details: $details${NC}"
            fi
            ;;
        "WARN")
            WARNING_CHECKS=$((WARNING_CHECKS + 1))
            echo -e "${YELLOW}⚠️  $message${NC}"
            if [[ -n "$details" ]]; then
                echo -e "${YELLOW}   Details: $details${NC}"
            fi
            ;;
    esac
    
    if [[ "$VERBOSE" == "true" && -n "$details" && "$status" == "PASS" ]]; then
        echo -e "${BLUE}   $details${NC}"
    fi
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Change to project root
cd "$PROJECT_ROOT"

echo -e "${BLUE}🏁 Starting environment validation...${NC}"
echo ""

# ===== BASIC SYSTEM CHECKS =====
echo -e "${BLUE}🔧 System Requirements${NC}"

# Check Node.js version
if command_exists node; then
    NODE_VERSION=$(node --version)
    REQUIRED_NODE_MAJOR=22
    CURRENT_NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d'.' -f1 | sed 's/v//')
    
    if [[ "$CURRENT_NODE_MAJOR" -ge "$REQUIRED_NODE_MAJOR" ]]; then
        log_check "PASS" "Node.js version" "Found $NODE_VERSION (required: v$REQUIRED_NODE_MAJOR+)"
    else
        log_check "FAIL" "Node.js version" "Found $NODE_VERSION, required v$REQUIRED_NODE_MAJOR+"
    fi
else
    log_check "FAIL" "Node.js installation" "Node.js not found"
fi

# Check Yarn
if command_exists yarn; then
    YARN_VERSION=$(yarn --version)
    log_check "PASS" "Yarn package manager" "Found version $YARN_VERSION"
else
    log_check "FAIL" "Yarn package manager" "Yarn not found"
fi

# Check Git
if command_exists git; then
    GIT_VERSION=$(git --version)
    log_check "PASS" "Git version control" "$GIT_VERSION"
else
    log_check "FAIL" "Git version control" "Git not found"
fi

# Check Firebase CLI
if command_exists firebase; then
    FIREBASE_VERSION=$(firebase --version)
    log_check "PASS" "Firebase CLI" "Found $FIREBASE_VERSION"
else
    log_check "WARN" "Firebase CLI" "Not found - required for deployment"
fi

echo ""

# ===== PROJECT STRUCTURE VALIDATION =====
echo -e "${BLUE}📁 Project Structure${NC}"

# Check essential files
essential_files=(
    "package.json"
    "firebase.json"
    "firestore.rules"
    "storage.rules"
    "src/main.tsx"
    "public/index.html"
    "vite.config.ts"
    "tsconfig.json"
)

for file in "${essential_files[@]}"; do
    if [[ -f "$file" ]]; then
        log_check "PASS" "Essential file: $file" "File exists"
    else
        log_check "FAIL" "Essential file: $file" "File missing"
    fi
done

# Check essential directories
essential_dirs=(
    "src"
    "public"
    "functions"
    "deployment"
    "chrome-extension"
)

for dir in "${essential_dirs[@]}"; do
    if [[ -d "$dir" ]]; then
        log_check "PASS" "Essential directory: $dir" "Directory exists"
    else
        log_check "FAIL" "Essential directory: $dir" "Directory missing"
    fi
done

echo ""

# ===== ENVIRONMENT CONFIGURATION =====
echo -e "${BLUE}⚙️  Environment Configuration${NC}"

# Check environment file
ENV_FILE=".env.$ENVIRONMENT"
if [[ -f "$ENV_FILE" ]]; then
    log_check "PASS" "Environment file" "Found $ENV_FILE"
    
    # Load environment variables
    set -a
    source "$ENV_FILE"
    set +a
    
    # Check critical environment variables
    critical_vars=(
        "VITE_FIREBASE_API_KEY"
        "VITE_FIREBASE_AUTH_DOMAIN"
        "VITE_FIREBASE_PROJECT_ID"
        "VITE_FIREBASE_STORAGE_BUCKET"
        "VITE_FIREBASE_MESSAGING_SENDER_ID"
        "VITE_FIREBASE_APP_ID"
    )
    
    for var in "${critical_vars[@]}"; do
        if [[ -n "${!var}" ]]; then
            # Mask sensitive values for display
            if [[ "$var" == *"API_KEY"* || "$var" == *"SECRET"* ]]; then
                masked_value="${!var:0:8}..."
                log_check "PASS" "Environment variable: $var" "Set (masked: $masked_value)"
            else
                log_check "PASS" "Environment variable: $var" "Set: ${!var}"
            fi
        else
            log_check "FAIL" "Environment variable: $var" "Not set or empty"
        fi
    done
    
    # Check optional but recommended variables
    optional_vars=(
        "VITE_GOOGLE_ANALYTICS_ID"
        "VITE_SENTRY_DSN"
        "VITE_STRIPE_PUBLISHABLE_KEY"
        "VITE_ONESIGNAL_APP_ID"
    )
    
    for var in "${optional_vars[@]}"; do
        if [[ -n "${!var}" ]]; then
            log_check "PASS" "Optional variable: $var" "Set"
        else
            log_check "WARN" "Optional variable: $var" "Not set - some features may not work"
        fi
    done
    
else
    log_check "FAIL" "Environment file" "$ENV_FILE not found"
fi

echo ""

# ===== DEPENDENCIES VALIDATION =====
echo -e "${BLUE}📦 Dependencies${NC}"

# Check if node_modules exists
if [[ -d "node_modules" ]]; then
    log_check "PASS" "Dependencies installed" "node_modules directory exists"
    
    # Check package.json vs yarn.lock consistency
    if [[ -f "yarn.lock" ]]; then
        log_check "PASS" "Yarn lock file" "yarn.lock exists"
    else
        log_check "WARN" "Yarn lock file" "yarn.lock missing - dependencies may not be deterministic"
    fi
    
    # Check for critical packages
    critical_packages=(
        "react"
        "typescript"
        "vite"
        "firebase"
        "@capacitor/core"
    )
    
    for package in "${critical_packages[@]}"; do
        if [[ -d "node_modules/$package" ]]; then
            PACKAGE_VERSION=$(node -p "require('./node_modules/$package/package.json').version" 2>/dev/null || echo "unknown")
            log_check "PASS" "Critical package: $package" "Version $PACKAGE_VERSION"
        else
            log_check "FAIL" "Critical package: $package" "Package not installed"
        fi
    done
    
else
    log_check "FAIL" "Dependencies installed" "node_modules directory missing - run 'yarn install'"
fi

# Check functions dependencies if functions exist
if [[ -d "functions" && -f "functions/package.json" ]]; then
    cd functions
    if [[ -d "node_modules" ]]; then
        log_check "PASS" "Functions dependencies" "Functions dependencies installed"
    else
        log_check "FAIL" "Functions dependencies" "Functions dependencies missing"
    fi
    cd ..
fi

echo ""

# ===== SECURITY VALIDATION =====
echo -e "${BLUE}🔒 Security Configuration${NC}"

# Check for .gitignore
if [[ -f ".gitignore" ]]; then
    log_check "PASS" "Git ignore file" ".gitignore exists"
    
    # Check if critical files are ignored
    critical_ignores=("node_modules" ".env" "*.log" "dist" "build")
    for ignore in "${critical_ignores[@]}"; do
        if grep -q "$ignore" .gitignore; then
            log_check "PASS" "Git ignore rule: $ignore" "Rule exists"
        else
            log_check "WARN" "Git ignore rule: $ignore" "Rule missing"
        fi
    done
else
    log_check "FAIL" "Git ignore file" ".gitignore missing"
fi

# Check for secrets in environment file
if [[ -f "$ENV_FILE" ]]; then
    # Check for potential secrets that shouldn't be in production env file
    if grep -q "localhost\|127.0.0.1\|development" "$ENV_FILE"; then
        log_check "WARN" "Environment secrets" "Development values found in $ENV_FILE"
    else
        log_check "PASS" "Environment secrets" "No development values found"
    fi
fi

# Check Firebase security rules
if [[ -f "firestore.rules" ]]; then
    log_check "PASS" "Firestore security rules" "Rules file exists"
    
    # Check for basic security patterns
    if grep -q "request.auth != null" firestore.rules; then
        log_check "PASS" "Firestore auth check" "Authentication checks found"
    else
        log_check "WARN" "Firestore auth check" "No authentication checks found"
    fi
else
    log_check "FAIL" "Firestore security rules" "firestore.rules missing"
fi

if [[ -f "storage.rules" ]]; then
    log_check "PASS" "Storage security rules" "Rules file exists"
else
    log_check "FAIL" "Storage security rules" "storage.rules missing"
fi

echo ""

# ===== BUILD VALIDATION =====
echo -e "${BLUE}🏗️  Build Configuration${NC}"

# Check if build script exists
if grep -q '"build"' package.json; then
    log_check "PASS" "Build script" "Build script defined in package.json"
else
    log_check "FAIL" "Build script" "No build script found in package.json"
fi

# Check TypeScript configuration
if [[ -f "tsconfig.json" ]]; then
    log_check "PASS" "TypeScript config" "tsconfig.json exists"
    
    # Validate tsconfig.json
    if node -p "JSON.parse(require('fs').readFileSync('tsconfig.json', 'utf8'))" >/dev/null 2>&1; then
        log_check "PASS" "TypeScript config syntax" "Valid JSON"
    else
        log_check "FAIL" "TypeScript config syntax" "Invalid JSON"
    fi
else
    log_check "FAIL" "TypeScript config" "tsconfig.json missing"
fi

# Check Vite configuration
if [[ -f "vite.config.ts" ]]; then
    log_check "PASS" "Vite config" "vite.config.ts exists"
else
    log_check "WARN" "Vite config" "vite.config.ts missing - using defaults"
fi

# Try a test build (if requested)
if [[ "$ENVIRONMENT" == "production" && "$VERBOSE" == "true" ]]; then
    echo -e "${BLUE}🧪 Testing build process...${NC}"
    
    if yarn build >/dev/null 2>&1; then
        log_check "PASS" "Build test" "Build completed successfully"
        
        if [[ -d "dist" ]]; then
            BUILD_SIZE=$(du -sh dist | cut -f1)
            log_check "PASS" "Build output" "Built to dist/ (Size: $BUILD_SIZE)"
        fi
    else
        log_check "FAIL" "Build test" "Build failed"
    fi
fi

echo ""

# ===== DEPLOYMENT VALIDATION =====
echo -e "${BLUE}🚀 Deployment Configuration${NC}"

# Check Firebase configuration
if [[ -f "firebase.json" ]]; then
    log_check "PASS" "Firebase config" "firebase.json exists"
    
    # Validate firebase.json
    if node -p "JSON.parse(require('fs').readFileSync('firebase.json', 'utf8'))" >/dev/null 2>&1; then
        log_check "PASS" "Firebase config syntax" "Valid JSON"
        
        # Check for required sections
        firebase_sections=("hosting" "firestore" "storage" "functions")
        for section in "${firebase_sections[@]}"; do
            if jq -e ".$section" firebase.json >/dev/null 2>&1; then
                log_check "PASS" "Firebase $section config" "Section exists"
            else
                log_check "WARN" "Firebase $section config" "Section missing"
            fi
        done
    else
        log_check "FAIL" "Firebase config syntax" "Invalid JSON"
    fi
else
    log_check "FAIL" "Firebase config" "firebase.json missing"
fi

# Check deployment scripts
deployment_scripts=(
    "deployment/hosting/deploy-hosting.sh"
    "deployment/mobile/app-store-deploy.sh"
    "deployment/mobile/google-play-deploy.sh"
    "deployment/chrome-extension/chrome-store-deploy.sh"
)

for script in "${deployment_scripts[@]}"; do
    if [[ -x "$script" ]]; then
        log_check "PASS" "Deployment script: $(basename "$script")" "Script exists and is executable"
    elif [[ -f "$script" ]]; then
        log_check "WARN" "Deployment script: $(basename "$script")" "Script exists but not executable"
    else
        log_check "WARN" "Deployment script: $(basename "$script")" "Script missing"
    fi
done

echo ""

# ===== MONITORING VALIDATION =====
echo -e "${BLUE}📊 Monitoring Configuration${NC}"

# Check monitoring configuration files
monitoring_configs=(
    "deployment/monitoring/monitoring-config.ts"
    "deployment/validation/health-checks.ts"
)

for config in "${monitoring_configs[@]}"; do
    if [[ -f "$config" ]]; then
        log_check "PASS" "Monitoring config: $(basename "$config")" "Configuration exists"
    else
        log_check "WARN" "Monitoring config: $(basename "$config")" "Configuration missing"
    fi
done

# Check if health check endpoint would be available
if grep -r "health" src/ --include="*.ts" --include="*.tsx" >/dev/null 2>&1; then
    log_check "PASS" "Health check integration" "Health check code found"
else
    log_check "WARN" "Health check integration" "No health check integration found"
fi

echo ""

# ===== PERFORMANCE VALIDATION =====
echo -e "${BLUE}⚡ Performance Configuration${NC}"

# Check for service worker
if [[ -f "public/sw.js" ]]; then
    log_check "PASS" "Service Worker" "Service worker exists"
else
    log_check "WARN" "Service Worker" "No service worker found - PWA features unavailable"
fi

# Check for PWA manifest
if [[ -f "public/manifest.json" ]]; then
    log_check "PASS" "PWA Manifest" "Manifest exists"
    
    if node -p "JSON.parse(require('fs').readFileSync('public/manifest.json', 'utf8'))" >/dev/null 2>&1; then
        log_check "PASS" "PWA Manifest syntax" "Valid JSON"
    else
        log_check "FAIL" "PWA Manifest syntax" "Invalid JSON"
    fi
else
    log_check "WARN" "PWA Manifest" "No PWA manifest found"
fi

# Check bundle analyzer configuration
if grep -q "bundle.*analyz" package.json; then
    log_check "PASS" "Bundle analyzer" "Bundle analysis tools configured"
else
    log_check "WARN" "Bundle analyzer" "No bundle analysis tools found"
fi

echo ""

# ===== FINAL VALIDATION SUMMARY =====
echo -e "${BLUE}📋 Validation Summary${NC}"
echo "=================================="
echo "Total Checks: $TOTAL_CHECKS"
echo -e "${GREEN}Passed: $PASSED_CHECKS${NC}"
echo -e "${RED}Failed: $FAILED_CHECKS${NC}"
echo -e "${YELLOW}Warnings: $WARNING_CHECKS${NC}"
echo ""

# Determine overall validation result
if [[ $FAILED_CHECKS -eq 0 ]]; then
    if [[ $WARNING_CHECKS -eq 0 ]]; then
        echo -e "${GREEN}✅ VALIDATION PASSED - Environment is ready for $ENVIRONMENT deployment${NC}"
        exit 0
    else
        echo -e "${YELLOW}⚠️  VALIDATION PASSED WITH WARNINGS - Environment has $WARNING_CHECKS warnings${NC}"
        echo -e "${YELLOW}Review warnings before deploying to $ENVIRONMENT${NC}"
        exit 0
    fi
else
    echo -e "${RED}❌ VALIDATION FAILED - Environment has $FAILED_CHECKS critical issues${NC}"
    echo -e "${RED}Fix all failed checks before deploying to $ENVIRONMENT${NC}"
    exit 1
fi