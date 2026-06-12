#!/bin/bash
set -e

cd "$(dirname "$0")/App"

echo ">> Syncing Capacitor..."
cd ../..
npx cap sync ios 2>/dev/null

cd ios/App

echo ">> Cleaning..."
rm -rf ~/Library/Developer/Xcode/DerivedData/App-*

echo ">> Building for device..."
xcodebuild \
  -workspace App.xcworkspace \
  -scheme App \
  -destination 'generic/platform=iOS' \
  -configuration Debug \
  -allowProvisioningUpdates \
  build

echo ""
echo ">> BUILD SUCCEEDED <<"
echo ""
echo "Now open App.xcworkspace in Xcode, wait for indexing, select your iPhone, and press Cmd+R to run."
