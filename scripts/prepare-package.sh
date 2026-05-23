#!/bin/bash
set -e

echo "Installing all platform-specific binaries for @kstonekuan/audio-capture..."

# Install all optional dependencies regardless of current platform
npm install --no-save --force \
  @kstonekuan/audio-capture-darwin-arm64@0.0.3 \
  @kstonekuan/audio-capture-darwin-x64@0.0.3 \
  @kstonekuan/audio-capture-linux-x64-gnu@0.0.3 \
  @kstonekuan/audio-capture-win32-x64-msvc@0.0.3

echo "All platform binaries installed"
echo "Verifying installation..."
ls -lh node_modules/@kstonekuan/

echo "Ready to package!"
