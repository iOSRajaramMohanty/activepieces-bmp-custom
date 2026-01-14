#!/bin/bash

cd /Users/rajarammohanty/Documents/POC/activepieces

# Kill existing servers
pkill -f "nx serve" 2>/dev/null

# Load Node v20
source ~/.zshrc
nvm use 20

# Use TESTING environment (allows embedded database for CE!)
export AP_EDITION=COMMUNITY
export AP_ENVIRONMENT=testing
export AP_DEV_PIECES=ada-bmp

echo "🚀 Starting with TESTING environment (embedded database)"
echo "Your ADA BMP piece will be available!"

exec npm run dev
