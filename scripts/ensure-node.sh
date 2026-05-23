#!/bin/bash
# Load nvm and switch to the Node version defined in .nvmrc.
set -e

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"

if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck source=/dev/null
  . "$NVM_DIR/nvm.sh"
else
  echo "❌ nvm not found. Install nvm: https://github.com/nvm-sh/nvm"
  exit 1
fi

if [ -f .nvmrc ]; then
  nvm install
  nvm use
else
  nvm use 22
fi

REQUIRED_MAJOR=22
CURRENT_MAJOR=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)

if [ "$CURRENT_MAJOR" -lt "$REQUIRED_MAJOR" ]; then
  echo "❌ Node.js ${REQUIRED_MAJOR}+ required. Current version: $(node -v)"
  exit 1
fi
