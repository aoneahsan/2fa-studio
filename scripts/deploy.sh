#!/bin/bash

# Deploy script for 2FA Studio

echo "🚀 Deploying 2FA Studio to Firebase..."
echo ""

# Build the project
echo "📦 Building project..."
yarn build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build successful!"
echo ""

# Deploy to Firebase
echo "☁️  Deploying to Firebase Hosting..."
firebase deploy --only hosting

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed!"
    exit 1
fi

echo ""
echo "✅ Deployment successful!"
echo ""
echo "🌐 Your app is now live at:"
echo "   https://your-project-id.web.app"
echo "   https://your-project-id.firebaseapp.com"
echo ""
echo "📊 View deployment details at:"
echo "   https://console.firebase.google.com/project/your-project-id/hosting"