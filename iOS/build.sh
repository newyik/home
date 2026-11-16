#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p build/Payload/HomeControl.app build/cache
IOS_SDK_PATH="$(xcrun --sdk iphoneos --show-sdk-path)"
xcrun --sdk iphoneos swiftc -parse-as-library -module-name HomeControl App.swift -sdk "$IOS_SDK_PATH" -target arm64-apple-ios16.0 -framework UIKit -framework WebKit -module-cache-path build/cache -o build/Payload/HomeControl.app/HomeControl
cp Info.plist Icon*.png build/Payload/HomeControl.app/
cd build
ditto -c -k --keepParent Payload ../小家控-iPhone-待签名.ipa
