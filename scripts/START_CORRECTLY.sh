#!/bin/bash

cd /Users/rajarammohanty/Documents/POC/activepieces

# Kill existing
pkill -f "nx serve" 2>/dev/null

# Load Node v20
source ~/.zshrc
nvm use 20

# Activepieces Configuration (CORRECT enum values!)
export AP_EDITION=ce          # Not "COMMUNITY"!
export AP_ENVIRONMENT=test    # Not "testing"!  
export AP_DEV_PIECES=ada-bmp

# ADA BMP Piece Configuration
export ADA_BMP_API_URL=${ADA_BMP_API_URL:-https://api.ada-bmp.com}  # Use env var or default
export ADA_BMP_DEBUG=${ADA_BMP_DEBUG:-false}                        # Enable debug logging if needed
export ADA_BMP_TIMEOUT=${ADA_BMP_TIMEOUT:-30000}                    # 30 seconds default

echo "🚀 Starting Activepieces Development Server"
echo ""
echo "Activepieces Configuration:"
echo "   Edition: ce (Community)"
echo "   Environment: test (embedded DB)"
echo "   Custom Piece: ada-bmp"
echo ""
echo "ADA BMP Configuration:"
echo "   API URL: $ADA_BMP_API_URL"
echo "   Debug Mode: $ADA_BMP_DEBUG"
echo "   Timeout: ${ADA_BMP_TIMEOUT}ms"
echo ""
echo "Access the app at: http://localhost:4200/"
echo ""

exec npm run dev
