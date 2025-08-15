#!/bin/bash

# Deploy Firebase Functions with correct Node version
# This script handles Node version mismatch for Firebase Functions

echo "🚀 2FA Studio - Firebase Functions Deployment"
echo "============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if nvm is installed
if ! command -v nvm &> /dev/null; then
    echo -e "${YELLOW}NVM not found. Installing NVM...${NC}"
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
fi

# Check current Node version
CURRENT_NODE=$(node --version)
echo -e "Current Node version: ${YELLOW}$CURRENT_NODE${NC}"

# Check if Node 22 is installed
if ! nvm list | grep -q "v22"; then
    echo -e "${YELLOW}Node 22 not found. Installing...${NC}"
    nvm install 22
fi

# Switch to Node 22
echo -e "${GREEN}Switching to Node 22 for Firebase Functions...${NC}"
nvm use 22

# Navigate to functions directory
cd functions || exit 1

# Install dependencies
echo -e "${GREEN}Installing dependencies...${NC}"
npm install

# Build functions
echo -e "${GREEN}Building functions...${NC}"
npm run build

# Deploy functions
echo -e "${GREEN}Deploying functions to Firebase...${NC}"
firebase deploy --only functions

# Check deployment status
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Functions deployed successfully!${NC}"
else
    echo -e "${RED}❌ Functions deployment failed!${NC}"
    exit 1
fi

# Switch back to original Node version (optional)
echo -e "${YELLOW}Switching back to original Node version...${NC}"
nvm use default

echo -e "${GREEN}🎉 Deployment complete!${NC}"