# HTTPS/HTTP Configuration Guide

## Overview

This document explains how the HTTPS/HTTP configuration works for development and production environments.

## Configuration Summary

### Development (macOS)

- **HTTPS Enabled**: Uses SSL certificates from `.certs/` folder
- **URL**: `https://localhost:5173/`
- **Purpose**: For local development with HTTPS features

### Production (Ubuntu)

- **HTTP Only**: No SSL certificates, runs on plain HTTP
- **URL**: `http://localhost:5173/`
- **Purpose**: Application runs internally on HTTP, nginx handles HTTPS

## How It Works

### Vite Configuration (`vite.config.ts`)

```typescript
https: mode === "development" ? (() => {
  // Only enable HTTPS in development mode
  try {
    const keyPath = path.resolve(__dirname, ".certs/key.pem");
    const certPath = path.resolve(__dirname, ".certs/cert.pem");
    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
      return {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      };
    }
  } catch (_) {
    // ignore and fall back to HTTP
  }
  return undefined;
})() : false,  // Explicitly disable HTTPS in production
```

### Package.json Scripts

```json
{
  "scripts": {
    "start": "concurrently \"vite --port 5173\" \"tsx watch server.ts\"",
    "start:prod": "concurrently \"vite preview --port 5173 --mode production\" \"tsx server.ts\"",
    "dev": "concurrently \"vite --port 5173\" \"tsx watch server.ts\"",
    "dev:https": "concurrently \"vite --port 5173 --https\" \"tsx watch server.ts\""
  }
}
```

## Deployment Architecture

### Production Setup

```
Internet (HTTPS) → Nginx (SSL Termination) → Application (HTTP)
    ↓                    ↓                        ↓
https://itrucksea.com → nginx:443 → http://localhost:5173
```

### Benefits

1. **Security**: Nginx handles SSL termination with proper certificates
2. **Performance**: Application doesn't need to handle SSL overhead
3. **Flexibility**: Easy to change SSL certificates without rebuilding app
4. **Standard Practice**: Common pattern for production deployments

## Files Modified

### 1. `vite.config.ts`

- Modified HTTPS configuration to only enable in development mode
- Production mode explicitly disables HTTPS

### 2. `package.json`

- Added `start:prod` script for production mode
- Added `server:prod` script for production server

### 3. Ubuntu Deployment Scripts

- Updated to use production mode commands
- Configured for HTTP-only operation

## Testing the Configuration

### Local Development (HTTPS)

```bash
yarn dev
# Runs on https://localhost:5173
```

### Local Production Preview (HTTP)

```bash
yarn start:prod
# Runs on http://localhost:5173
```

### Ubuntu Production (HTTP)

```bash
./start-ubuntu.sh
# Runs on http://localhost:5173
# Nginx serves it on https://itrucksea.com
```

## Nginx Configuration

Your nginx should be configured to:

1. Listen on port 443 (HTTPS)
2. Proxy requests to `http://localhost:5173`
3. Handle SSL certificates
4. Redirect HTTP to HTTPS

Example nginx config:

```nginx
server {
    listen 443 ssl;
    server_name itrucksea.com www.itrucksea.com;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    location / {
        proxy_pass http://localhost:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name itrucksea.com www.itrucksea.com;
    return 301 https://$server_name$request_uri;
}
```

## Summary

✅ **Development**: HTTPS enabled for testing SSL features  
✅ **Production**: HTTP only, nginx handles HTTPS  
✅ **Security**: SSL termination at nginx level  
✅ **Performance**: No SSL overhead on application  
✅ **Flexibility**: Easy certificate management

Your application will now run on `http://localhost:5173` in production, and nginx will serve it securely over HTTPS to your domain.
