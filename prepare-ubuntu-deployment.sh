#!/bin/bash

# Ubuntu Deployment Preparation Script
# This script prepares all files for direct upload to Ubuntu server

echo "🚀 Preparing Ubuntu Deployment Package..."

# Create deployment directory
DEPLOY_DIR="ubuntu-deployment-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$DEPLOY_DIR"

echo "📁 Creating deployment directory: $DEPLOY_DIR"

# Copy built application files
echo "📦 Copying built application files..."
cp -r dist/ "$DEPLOY_DIR/"

# Copy server files
echo "🔧 Copying server configuration files..."
cp server.ts "$DEPLOY_DIR/"
cp server-dev.js "$DEPLOY_DIR/"

# Copy production configuration files
echo "⚙️ Copying production configuration files..."
cp package.json "$DEPLOY_DIR/"
cp yarn.lock "$DEPLOY_DIR/"

# Copy environment configuration (if exists)
if [ -f ".env.production" ]; then
    cp .env.production "$DEPLOY_DIR/.env"
    echo "✅ Copied production environment file"
elif [ -f ".env" ]; then
    cp .env "$DEPLOY_DIR/"
    echo "✅ Copied environment file"
fi

# Copy Nginx configuration
echo "🌐 Copying Nginx configuration files..."
cp nginx.conf "$DEPLOY_DIR/" 2>/dev/null || echo "⚠️ nginx.conf not found"
cp nginx-production.conf "$DEPLOY_DIR/" 2>/dev/null || echo "⚠️ nginx-production.conf not found"
cp nginx-optimized.conf "$DEPLOY_DIR/" 2>/dev/null || echo "⚠️ nginx-optimized.conf not found"

# Copy SSL certificates (if they exist)
echo "🔐 Copying SSL certificates..."
if [ -d "ssl" ]; then
    cp -r ssl/ "$DEPLOY_DIR/"
    echo "✅ Copied SSL certificates"
fi

# Copy deployment scripts
echo "📜 Copying deployment scripts..."
cp ecosystem.config.cjs "$DEPLOY_DIR/" 2>/dev/null || echo "⚠️ ecosystem.config.cjs not found"
cp deploy-production.sh "$DEPLOY_DIR/" 2>/dev/null || echo "⚠️ deploy-production.sh not found"

# Create Ubuntu-specific package.json (without dev dependencies)
echo "📋 Creating Ubuntu-optimized package.json..."
cat > "$DEPLOY_DIR/package-ubuntu.json" << 'EOF'
{
  "name": "vite_react_shadcn_ts",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "start": "concurrently \"vite preview --port 5173 --mode production\" \"tsx server.ts\"",
    "start:prod": "concurrently \"vite preview --port 5173 --mode production\" \"tsx server.ts\"",
    "server": "tsx server.ts",
    "server:prod": "tsx server.ts"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.49.4",
    "@types/cors": "^2.8.19",
    "@types/express": "^5.0.3",
    "body-parser": "^2.2.0",
    "cookie-parser": "^1.4.7",
    "cors": "^2.8.5",
    "dotenv": "^16.5.0",
    "express": "^5.1.0",
    "formidable": "^3.5.1",
    "multer": "^2.0.1",
    "tsx": "^4.19.4",
    "typescript": "^5.5.3"
  },
  "packageManager": "yarn@3.2.3+sha512.f26f951f67de0c6a33ee381e5ff364709c87e70eb5e65c694e4facde3512f1fa80b8679e6ba31ce7d340fbb46f08dd683af9457e240f25a204be7427940d767e"
}
EOF

# Create deployment instructions
echo "📖 Creating deployment instructions..."
cat > "$DEPLOY_DIR/UBUNTU_DEPLOYMENT_INSTRUCTIONS.md" << 'EOF'
# Ubuntu Deployment Instructions

## Quick Setup (No Build Required)

1. **Upload Files to Ubuntu Server:**
   ```bash
   # Upload the entire deployment folder to your Ubuntu server
   scp -r ubuntu-deployment-* user@your-server:/var/www/your-app/
   ```

2. **On Ubuntu Server:**
   ```bash
   cd /var/www/your-app/ubuntu-deployment-*
   
   # Install only production dependencies
   yarn install --production
   
   # Set proper permissions
   sudo chown -R www-data:www-data .
   sudo chmod -R 755 .
   
   # Start the application
   yarn start
   ```

3. **Nginx Configuration:**
   - Use `nginx-production.conf` for production setup
   - Update server paths in nginx config
   - Reload nginx: `sudo systemctl reload nginx`

4. **Process Management:**
   - Use `ecosystem.config.cjs` with PM2: `pm2 start ecosystem.config.cjs`
   - Or run directly: `yarn start`

## Files Included:
- ✅ Built application (`dist/` folder)
- ✅ Server files (`server.ts`, `server-dev.js`)
- ✅ Production dependencies only
- ✅ Nginx configuration
- ✅ SSL certificates (if available)
- ✅ Deployment scripts
- ✅ Environment configuration

## No Build Required on Ubuntu!
This package contains everything pre-built and ready to run.
EOF

# Create a simple start script for Ubuntu
echo "🎯 Creating Ubuntu start script..."
cat > "$DEPLOY_DIR/start-ubuntu.sh" << 'EOF'
#!/bin/bash

# Ubuntu Start Script
echo "🚀 Starting iTruckSea Trace Link on Ubuntu..."

# Set proper permissions
sudo chown -R www-data:www-data .
sudo chmod -R 755 .

# Install production dependencies only
echo "📦 Installing production dependencies..."
yarn install --production

# Start the application (HTTP only, no HTTPS)
echo "🎯 Starting application on HTTP (port 5173)..."
echo "✅ Application will run on: http://localhost:5173"
echo "✅ Use nginx with SSL for HTTPS domain access"
yarn start
EOF

chmod +x "$DEPLOY_DIR/start-ubuntu.sh"

# Create archive
echo "📦 Creating deployment archive..."
tar -czf "${DEPLOY_DIR}.tar.gz" "$DEPLOY_DIR"

echo ""
echo "✅ Ubuntu Deployment Package Ready!"
echo ""
echo "📁 Deployment Directory: $DEPLOY_DIR"
echo "📦 Archive File: ${DEPLOY_DIR}.tar.gz"
echo ""
echo "🚀 Next Steps:"
echo "1. Upload ${DEPLOY_DIR}.tar.gz to your Ubuntu server"
echo "2. Extract: tar -xzf ${DEPLOY_DIR}.tar.gz"
echo "3. Follow instructions in UBUNTU_DEPLOYMENT_INSTRUCTIONS.md"
echo ""
echo "📊 Package Size:"
du -sh "$DEPLOY_DIR"
du -sh "${DEPLOY_DIR}.tar.gz"
