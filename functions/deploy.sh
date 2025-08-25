#!/bin/bash

# 2FA Studio Firebase Functions Deployment Script

set -e

echo "🚀 Starting deployment of 2FA Studio Firebase Functions..."

# Check if we're in the functions directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Run this script from the functions directory"
    exit 1
fi

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Error: Firebase CLI is not installed"
    echo "Install with: npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in
if ! firebase projects:list &> /dev/null; then
    echo "❌ Error: Please login to Firebase first"
    echo "Run: firebase login"
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

echo "🔨 Building TypeScript..."
npm run build

echo "✅ Build successful!"

# Check if environment variables are set
echo "🔧 Checking environment configuration..."

# List of required environment variables
required_vars=(
    "STRIPE_SECRET_KEY"
    "STRIPE_WEBHOOK_SECRET"
    "STRIPE_PRICE_PRO"
    "STRIPE_PRICE_PREMIUM"
    "STRIPE_PRICE_BUSINESS"
)

missing_vars=()

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -gt 0 ]; then
    echo "⚠️  Warning: The following environment variables are not set:"
    for var in "${missing_vars[@]}"; do
        echo "   - $var"
    done
    echo ""
    echo "You can set them using:"
    echo "firebase functions:config:set stripe.secret_key=\"your_key\""
    echo ""
    read -p "Continue deployment anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Deployment cancelled"
        exit 1
    fi
fi

# Deploy functions
echo "🚀 Deploying functions to Firebase..."

if [ "$1" == "--only-functions" ]; then
    firebase deploy --only functions
elif [ "$1" == "--production" ]; then
    echo "🏭 Deploying to production..."
    firebase use production 2>/dev/null || echo "⚠️  Production project not configured"
    firebase deploy --only functions
elif [ "$1" == "--staging" ]; then
    echo "🧪 Deploying to staging..."
    firebase use staging 2>/dev/null || echo "⚠️  Staging project not configured"
    firebase deploy --only functions
else
    # Deploy everything
    firebase deploy
fi

echo "✅ Deployment completed successfully!"

# Show next steps
echo ""
echo "📋 Next Steps:"
echo "   1. Verify functions are running: firebase functions:log"
echo "   2. Test API endpoints: https://your-project.cloudfunctions.net/api/health"
echo "   3. Monitor function performance in Firebase Console"
echo ""
echo "🔗 Useful Commands:"
echo "   - View logs: firebase functions:log"
echo "   - Monitor specific function: firebase functions:log --only functionName"
echo "   - Local development: npm run serve"