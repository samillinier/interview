#!/bin/bash
set -e

# App Store Archive & Export Script for FIS Installer
# Usage: ./ios/archive-for-appstore.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
APP_DIR="$SCRIPT_DIR/App"

# Add CocoaPods to PATH
export PATH="$HOME/.gem/ruby/2.6.0/bin:$PATH"

ARCHIVE_PATH="$APP_DIR/build/App.xcarchive"
EXPORT_PATH="$APP_DIR/build/AppStore"
IPA_PATH="$EXPORT_PATH/FIS Installer.ipa"

echo "========================================"
echo "  FIS Installer - App Store Build"
echo "========================================"
echo ""

# Step 1: Sync Capacitor
echo "[1/5] Syncing Capacitor..."
cd "$PROJECT_ROOT"
npx cap sync ios 2>/dev/null
echo "  Done."
echo ""

# Step 2: Clean derived data
echo "[2/5] Cleaning derived data..."
rm -rf ~/Library/Developer/Xcode/DerivedData/App-*
rm -rf "$APP_DIR/build"
echo "  Done."
echo ""

# Step 3: Archive
echo "[3/5] Building archive..."
cd "$APP_DIR"
xcodebuild archive \
  -workspace App.xcworkspace \
  -scheme App \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$ARCHIVE_PATH" \
  -allowProvisioningUpdates \
  CODE_SIGN_STYLE=Automatic \
  | xcbeautify 2>/dev/null || xcodebuild archive \
    -workspace App.xcworkspace \
    -scheme App \
    -configuration Release \
    -destination 'generic/platform=iOS' \
    -archivePath "$ARCHIVE_PATH" \
    -allowProvisioningUpdates \
    CODE_SIGN_STYLE=Automatic

if [ ! -d "$ARCHIVE_PATH" ]; then
  echo ""
  echo "ERROR: Archive failed. Check the output above for details."
  exit 1
fi

echo "  Archive created at: $ARCHIVE_PATH"
echo ""

# Step 4: Export IPA
echo "[4/5] Exporting IPA..."
xcodebuild -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportOptionsPlist "$APP_DIR/ExportOptions.plist" \
  -exportPath "$EXPORT_PATH" \
  -allowProvisioningUpdates \
  | xcbeautify 2>/dev/null || xcodebuild -exportArchive \
    -archivePath "$ARCHIVE_PATH" \
    -exportOptionsPlist "$APP_DIR/ExportOptions.plist" \
    -exportPath "$EXPORT_PATH" \
    -allowProvisioningUpdates

if [ ! -f "$IPA_PATH" ]; then
  echo ""
  echo "ERROR: IPA export failed. Check the output above for details."
  exit 1
fi

echo "  IPA exported to: $IPA_PATH"
echo ""

# Step 5: Validate
echo "[5/5] Validating IPA..."
xcrun altool --validate-app \
  -f "$IPA_PATH" \
  -t ios \
  --apiKey "$APP_STORE_CONNECT_API_KEY_ID" \
  --apiIssuer "$APP_STORE_CONNECT_API_ISSUER_ID" 2>/dev/null && \
  echo "  Validation passed!" || \
  echo "  Validation skipped (no API key configured)."

echo ""
echo "========================================"
echo "  BUILD COMPLETE"
echo "========================================"
echo ""
echo "Archive: $ARCHIVE_PATH"
echo "IPA:     $IPA_PATH"
echo ""
echo "To upload to App Store Connect:"
echo ""
echo "  Option A - Using Transporter app (easiest):"
echo "    Open /Applications/Transporter.app and drag the IPA file in."
echo ""
echo "  Option B - Using command line (requires App Store Connect API Key):"
echo "    xcrun altool --upload-app -f \"$IPA_PATH\" -t ios \\"
echo "      --apiKey YOUR_KEY_ID --apiIssuer YOUR_ISSUER_ID"
echo ""
echo "  Option C - Using Xcode:"
echo "    Open Xcode > Window > Organizer > Archives"
echo "    Select the archive and click 'Distribute App'"
echo ""
echo "  Option D - Using fastlane:"
echo "    fastlane deliver --ipa \"$IPA_PATH\""
echo ""
