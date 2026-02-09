# SSL Certificate Guide for Development

## Current Issue: `net::ERR_CERT_AUTHORITY_INVALID`

You're seeing this error because browsers don't trust self-signed certificates by default. Here are several solutions:

## Solution 1: Add Certificate to macOS Keychain (Recommended)

Run the installation script:
```bash
./.certs/install-cert.sh
```

This will:
- Add the certificate to your system's trusted certificates
- Make it trusted by all browsers on your Mac
- Require admin password (sudo)

## Solution 2: Browser-Specific Solutions

### Chrome/Edge
1. Visit `https://localhost:5173`
2. Click "Advanced" when you see the warning
3. Click "Proceed to localhost (unsafe)"
4. Or type `thisisunsafe` on the warning page

### Firefox
1. Visit `https://localhost:5173`
2. Click "Advanced"
3. Click "Accept the Risk and Continue"

### Safari
1. Visit `https://localhost:5173`
2. Click "Show Details"
3. Click "visit this website"
4. Click "Visit Website" in the popup

## Solution 3: Use HTTP Instead (Quick Fix)

If HTTPS isn't required for your development:

1. Edit `vite.config.ts`
2. Comment out the HTTPS configuration:
```typescript
server: {
  port: 5173,
  host: true,
  // https: {
  //   key: fs.readFileSync('.certs/key.pem'),
  //   cert: fs.readFileSync('.certs/cert.pem'),
  // },
}
```
3. Restart the dev server
4. Access via `http://localhost:5173`

## Solution 4: Browser Flags (Chrome)

Launch Chrome with certificate validation disabled:
```bash
open -a "Google Chrome" --args --ignore-certificate-errors --ignore-ssl-errors --allow-running-insecure-content
```

## Certificate Details

Your certificate includes these domains/IPs:
- `localhost`
- `*.localhost`
- `127.0.0.1`
- `::1` (IPv6 localhost)
- `192.168.3.1` (your local IP)

## Verification Commands

Check if certificate is trusted:
```bash
# View certificate details
openssl x509 -in .certs/cert.pem -text -noout | grep -A 5 "Subject Alternative Name"

# Test HTTPS connection
curl -k -I https://localhost:5173/
```

## Troubleshooting

If you still see errors after trying Solution 1:
1. Restart your browser completely
2. Clear browser cache and cookies
3. Try incognito/private mode
4. Check if antivirus/firewall is blocking
5. Try a different browser

## Why This Happens

- Self-signed certificates aren't issued by a trusted Certificate Authority
- Browsers protect users by warning about untrusted certificates
- In development, we need to explicitly trust our own certificates
- This is normal and expected behavior for local development