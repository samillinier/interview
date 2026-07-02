#!/bin/bash

# Script to help set up Vercel environment variables
# This script helps you copy POSTGRES_URL to DATABASE_URL

echo "🔧 Vercel Environment Setup Helper"
echo ""
echo "This script helps you set up your Vercel environment variables."
echo ""
echo "After creating Vercel Postgres, you need to:"
echo ""
echo "1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables"
echo "2. Find POSTGRES_URL (automatically created by Vercel Postgres)"
echo "3. Add a new variable:"
echo "   - Name: DATABASE_URL"
echo "   - Value: (copy the value from POSTGRES_URL)"
echo "   - Environment: Production, Preview, Development (select all)"
echo ""
echo "Required Environment Variables:"
echo "  ✓ DATABASE_URL (copy from POSTGRES_URL)"
echo "  ✓ OPENAI_API_KEY"
echo "  ✓ NEXTAUTH_URL"
echo "  ✓ NEXTAUTH_SECRET (generate with: openssl rand -base64 32)"
echo "  ✓ NEXT_PUBLIC_APP_URL"
echo ""
echo "Optional (if using Azure AD):"
echo "  - AZURE_AD_CLIENT_ID"
echo "  - AZURE_AD_CLIENT_SECRET"
echo "  - AZURE_AD_TENANT_ID"
echo ""

