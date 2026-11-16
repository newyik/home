#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
app="${1:-$PWD/build/小家控.app}"
mkdir -p "$app/Contents/MacOS" "$app/Contents/Resources"
xcrun swiftc -Osize -parse-as-library -target arm64-apple-macosx13.0 \
    Sources/Main.swift -o "$app/Contents/MacOS/LittleHomeDesktop"
cp Resources/AppIcon.icns "$app/Contents/Resources/"
cp Info.plist "$app/Contents/Info.plist"
codesign --force --sign - "$app"
