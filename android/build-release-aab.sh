#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOCAL_JAVA_HOME="$PROJECT_ROOT/.android-toolchain/jdk/Contents/Home"
LOCAL_ANDROID_SDK="$PROJECT_ROOT/.android-toolchain/android-sdk"

if [ -x "$LOCAL_JAVA_HOME/bin/java" ]; then
  export JAVA_HOME="$LOCAL_JAVA_HOME"
  export PATH="$JAVA_HOME/bin:$PATH"
fi
if [ -d "$LOCAL_ANDROID_SDK" ]; then
  export ANDROID_HOME="$LOCAL_ANDROID_SDK"
  export ANDROID_SDK_ROOT="$LOCAL_ANDROID_SDK"
fi

if ! java -version >/dev/null 2>&1; then
  echo "ERROR: Java is required. Install Android Studio (recommended) or JDK 21."
  exit 1
fi

if [ ! -f "$SCRIPT_DIR/keystore.properties" ]; then
  echo "ERROR: android/keystore.properties is required for a signed Play Store bundle."
  echo "Copy android/keystore.properties.example and add your release keystore details."
  exit 1
fi

echo ">> Syncing Capacitor Android..."
cd "$PROJECT_ROOT"
npx cap sync android

echo ">> Building signed release bundle..."
cd "$SCRIPT_DIR"
./gradlew bundleRelease

echo ""
echo ">> BUILD SUCCEEDED <<"
echo "AAB: $SCRIPT_DIR/app/build/outputs/bundle/release/app-release.aab"
