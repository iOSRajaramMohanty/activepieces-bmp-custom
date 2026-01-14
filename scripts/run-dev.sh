#!/bin/bash

# Kill any existing servers
pkill -f "nx serve" 2>/dev/null

# Load nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Use Node v20
nvm use 20

cd /Users/rajarammohanty/Documents/POC/activepieces

# ============================================
# LOAD ENVIRONMENT VARIABLES FROM .env FILE
# ============================================
# Load environment variables from .env file if it exists
if [ -f .env ]; then
    echo "📋 Loading environment variables from .env file..."
    # Export variables from .env file
    # This handles comments, empty lines, and quoted values
    set -a
    source .env
    set +a
    echo "✅ Environment variables loaded"
    
    # FORCE PostgreSQL database type (override any defaults)
    # Unset any previous value first
    unset AP_DB_TYPE
    export AP_DB_TYPE="POSTGRES"
    echo "🔧 Forced AP_DB_TYPE=POSTGRES"
    echo "🔍 Verification: AP_DB_TYPE=$AP_DB_TYPE"
    
    # Also ensure PostgreSQL credentials are set
    echo "🔍 PostgreSQL config: $AP_POSTGRES_HOST:$AP_POSTGRES_PORT/$AP_POSTGRES_DATABASE"
else
    echo "⚠️  Warning: .env file not found!"
    echo "   Please create .env file from .env.example"
    echo "   cp .env.example .env"
    exit 1
fi


echo "🚀 Starting Activepieces with Custom + Official Pieces..."
echo "Environment: $AP_EDITION, DB: $AP_DB_TYPE"
echo ""
echo "📊 Multi-Tenancy: $AP_MULTI_TENANT_MODE"
if [ "$AP_MULTI_TENANT_MODE" = "true" ]; then
    echo "   └─ Mode: Each signup creates isolated platform (SaaS)"
else
    echo "   └─ Mode: Single platform, team collaboration"
fi
echo ""
echo "Custom Pieces: $AP_DEV_PIECES | Sync Mode: $AP_PIECES_SYNC_MODE"
echo "ADA BMP API: $ADA_BMP_API_URL (Debug: $ADA_BMP_DEBUG)"
echo ""

# Optional: Build community pieces before starting
# Uncomment ONE of the following lines to auto-build pieces on startup:
# ./scripts/build-pieces.sh common    # Build commonly used pieces (recommended)
# ./scripts/build-pieces.sh all       # Build ALL community pieces (slow!)
./scripts/build-pieces.sh slack     # Build specific piece only

# Start dev server
exec npm run dev
