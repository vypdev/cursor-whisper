#!/bin/bash
set -e

source "$(dirname "$0")/ensure-node.sh"

echo "Installing all platform-specific binaries..."

# --force reinstalls deps and installs all optionalDependencies (all platforms)
CI=true pnpm install --force

echo "Verifying platform binaries..."
echo ""
echo "@kstonekuan/audio-capture:"
ls -lh node_modules/@kstonekuan/ || echo "  ⚠️  Not found"

echo ""
echo "@cursor/sdk platform packages:"
ls -d node_modules/@cursor/sdk-* 2>/dev/null || echo "  ⚠️  Not found"

echo ""
echo "✓ Ready to package!"
