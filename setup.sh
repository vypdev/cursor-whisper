#!/bin/bash

# Cursor Whisper - Development Setup Script

echo "🎤 Setting up Cursor Whisper development environment..."

# Use Node 22 via nvm
source "$(dirname "$0")/scripts/ensure-node.sh"

echo "✅ Node.js version: $(node -v)"

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

if [ $? -ne 0 ]; then
  echo "❌ Failed to install dependencies"
  exit 1
fi

echo "✅ Dependencies installed"

# Compile TypeScript
echo "🔨 Compiling TypeScript..."
pnpm run compile

if [ $? -ne 0 ]; then
  echo "❌ Compilation failed"
  exit 1
fi

echo "✅ TypeScript compiled"

# Run linter
echo "🔍 Running linter..."
pnpm run lint

if [ $? -ne 0 ]; then
  echo "⚠️  Linter found issues (run 'pnpm run lint:fix' to auto-fix)"
else
  echo "✅ Linter passed"
fi

echo ""
echo "✨ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Open this folder in VSCode/Cursor"
echo "  2. Press F5 to start debugging"
echo "  3. Configure your OpenAI API key in the extension"
echo ""
echo "Development commands:"
echo "  pnpm run watch       - Watch mode for development"
echo "  pnpm run test        - Run tests"
echo "  pnpm run lint:fix    - Auto-fix linter issues"
echo "  pnpm run package     - Build .vsix package"
echo ""
