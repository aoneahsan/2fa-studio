#!/bin/bash

echo "🔧 Starting lint fixes..."

# Fix all auto-fixable issues
echo "Running ESLint with auto-fix..."
yarn eslint . --fix

# Fix specific patterns
echo "Fixing require imports in cypress..."
find cypress -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/require(/import(/g'

echo "Fixing any types..."
# Replace common any patterns
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/: any/: unknown/g'
find functions/src -name "*.ts" | xargs sed -i '' 's/: any/: unknown/g'

echo "✅ Lint fixes completed!"
echo "Running lint check again..."
yarn lint