# HTTPS Setup for Development

This guide explains how to enable HTTPS for development to solve location access issues when using IP addresses.

## Problem

When accessing your app via IP address (e.g., `http://192.168.1.103:5173`), browsers block geolocation API access for security reasons. This prevents location features from working.

## Solution: Enable HTTPS

### Option 1: Use Vite's Built-in HTTPS (Recommended)

1. **Start the development server with HTTPS:**

   ```bash
   npm run dev:https
   ```

2. **Access your app via:**

   - `https://localhost:5173`
   - `https://192.168.1.103:5173` (or your IP address)

3. **Accept the security warning:**
   - Your browser will show a security warning because it's a self-signed certificate
   - Click "Advanced" → "Proceed to localhost (unsafe)" or similar
   - This is normal for development certificates

### Option 2: Generate Custom Certificates (Optional)

If you want to use custom certificates:

1. **Generate certificates:**

   ```bash
   chmod +x generate-dev-cert.sh
   ./generate-dev-cert.sh
   ```

2. **Update vite.config.ts** to use the custom certificates (see the commented code in the config)

## Benefits

✅ **Location API works on IP addresses**  
✅ **Secure context for all browser APIs**  
✅ **Better testing environment**  
✅ **No code changes needed**

## Usage

- **Development with HTTP:** `npm run dev` → `http://localhost:5173`
- **Development with HTTPS:** `npm run dev:https` → `https://localhost:5173` or `https://192.168.1.103:5173`

## Troubleshooting

- **Certificate warnings:** This is normal for development. Accept the warning to proceed.
- **Port conflicts:** Make sure port 5173 is available
- **Network access:** Ensure your firewall allows connections on port 5173

## Production

For production, use proper SSL certificates from a certificate authority (Let's Encrypt, etc.).
