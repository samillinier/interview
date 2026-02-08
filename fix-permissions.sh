#!/bin/bash
cd "$(dirname "$0")"
find node_modules/next/dist -type f -name "*.js" -exec chmod 644 {} \;
find node_modules/next/dist -type d -exec chmod 755 {} \;
find node_modules/next/dist -type f -exec xattr -c {} \; 2>/dev/null
echo "Permissions fixed"
