#!/bin/bash

# Fix White Screen Issue with YARN (Correct Package Manager)
# This script fixes the createContext error using Yarn

echo "🚨 Fixing white screen issue with YARN..."

cd /var/www/agribbee/itrucksea-trace-link

echo "🔧 Step 1: Enabling Corepack for Yarn 3..."
corepack enable

echo "📦 Step 2: Installing dependencies with Yarn..."
yarn install

echo "🔧 Step 3: Downgrading to React 18 (fixes createContext error)..."
yarn add react@^18.3.1 react-dom@^18.3.1 @types/react@^18.3.12 @types/react-dom@^18.3.1

echo "🔨 Step 4: Building production version with React 18..."
yarn run build:prod

echo "📁 Step 5: Verifying build..."
if [ -d "dist" ]; then
    echo "✅ Build successful!"
    echo "📊 Dist folder size:"
    du -sh dist/
    
    echo "🔍 Checking vendor files:"
    ls -la dist/assets/ | grep vendor | head -3
else
    echo "❌ Build failed! Dist folder not found."
    exit 1
fi

echo "🔐 Step 6: Fixing file permissions..."
chown -R www-data:www-data /var/www/agribbee/itrucksea-trace-link/dist
chmod -R 755 /var/www/agribbee/itrucksea-trace-link/dist

echo "🔄 Step 7: Reloading Nginx..."
systemctl reload nginx

echo "🎉 Yarn fix completed!"
echo ""
echo "📋 What was fixed:"
echo "- ✅ Used Yarn (correct package manager)"
echo "- ✅ Enabled Corepack for Yarn 3"
echo "- ✅ Downgraded React from 19 to 18"
echo "- ✅ Rebuilt production files with React 18"
echo "- ✅ Fixed file permissions"
echo ""
echo "🎯 React version check:"
echo "React: $(yarn list react --depth=0)"
echo "React-DOM: $(yarn list react-dom --depth=0)"
echo ""
echo "🌐 Test your site now:"
echo "curl -I https://itrucksea.com"
