#!/bin/bash

echo "🔐 Adding SSL certificate to macOS keychain..."
echo "This will make your localhost certificate trusted by the system."
echo ""

# Add certificate to system keychain
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain .certs/cert.pem

if [ $? -eq 0 ]; then
    echo "✅ Certificate added successfully to macOS keychain!"
    echo ""
    echo "📝 Next steps:"
    echo "1. Restart your browser completely"
    echo "2. Clear browser cache if needed"
    echo "3. Visit https://localhost:5173"
    echo ""
    echo "🔍 If you still see certificate warnings:"
    echo "- Try using Chrome/Safari instead of other browsers"
    echo "- Check that the certificate includes your IP address in SAN"
else
    echo "❌ Failed to add certificate. Please check your permissions."
fi