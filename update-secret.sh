#!/bin/bash

# Script to update Azure AD Client Secret in .env.local

echo "🔐 Azure AD Client Secret Updater"
echo "=================================="
echo ""
echo "From your Azure Portal screenshot, I can see the secret value starts with:"
echo "rXh8Q~MMTJMuyWsGuUEMeGxciDIjWs..."
echo ""
echo "Please copy the COMPLETE secret value from Azure Portal:"
echo "1. Go to Azure Portal → Your App → Certificates & secrets"
echo "2. Find the secret with Description 'new'"
echo "3. Click the copy icon next to the Value"
echo "4. Paste the complete value below (it's longer than shown)"
echo ""
read -p "Paste the complete secret value here: " SECRET_VALUE

if [ -z "$SECRET_VALUE" ]; then
    echo "❌ No value provided. Exiting."
    exit 1
fi

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ .env.local file not found!"
    exit 1
fi

# Update the secret in .env.local
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s|AZURE_AD_CLIENT_SECRET=.*|AZURE_AD_CLIENT_SECRET=$SECRET_VALUE|" .env.local
else
    # Linux
    sed -i "s|AZURE_AD_CLIENT_SECRET=.*|AZURE_AD_CLIENT_SECRET=$SECRET_VALUE|" .env.local
fi

echo ""
echo "✅ Updated AZURE_AD_CLIENT_SECRET in .env.local"
echo ""
echo "⚠️  Next steps:"
echo "1. Restart your dev server: npm run dev"
echo "2. Clear browser cookies"
echo "3. Try signing in again"
echo ""

