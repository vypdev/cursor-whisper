#!/bin/bash
set -e

echo "Installing all platform-specific binaries for @kstonekuan/audio-capture..."

# Install all optional dependencies regardless of current platform
pnpm install --force

echo "All platform binaries installed"
echo "Verifying installation..."
ls -lh node_modules/@kstonekuan/

echo "Ready to package!"
