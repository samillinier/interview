#!/bin/bash

# Script to set up Vercel Blob Storage
echo "Setting up Vercel Blob Storage..."

# Clean up corrupted node_modules directories
echo "Cleaning up node_modules..."
rm -rf "node_modules/jose 2" 2>/dev/null
rm -rf "node_modules/.jose 2-"* 2>/dev/null
rm -rf "node_modules/openai 2" 2>/dev/null
rm -rf "node_modules/.openai 2-"* 2>/dev/null

# Install @vercel/blob package
echo "Installing @vercel/blob package..."
npm install @vercel/blob@latest

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
    echo "Creating .env.local file..."
    echo "BLOB_READ_WRITE_TOKEN=vercel_blob_rw_kysUQ7sC3rZLJsyu_Yl7L75MCRzvbPkEEoRUHx11QXJnB8n" > .env.local
    echo "✓ Created .env.local file"
else
    echo "✓ .env.local already exists"
fi

echo ""
echo "✓ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Add BLOB_READ_WRITE_TOKEN to Vercel Dashboard → Settings → Environment Variables"
echo "2. Redeploy your application"
echo ""
echo "See UPLOAD_SETUP.md for detailed instructions."
