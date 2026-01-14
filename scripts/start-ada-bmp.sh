#!/bin/bash

# ADA BMP Piece Development Server Startup Script

echo "🚀 Starting Activepieces with ADA BMP piece..."
echo ""

# Load nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Switch to Node v20
echo "📦 Switching to Node.js v20..."
nvm use 20

# Verify Node version
echo "✅ Node version: $(node --version)"
echo ""

# Check if PostgreSQL and Redis are running
echo "🔍 Checking database services..."
if ! docker ps | grep -q postgres; then
    echo "⚠️  PostgreSQL is not running!"
    echo "📦 Starting PostgreSQL and Redis with Docker..."
    docker-compose -f docker-compose.dev.yml up -d
    echo "⏳ Waiting for database to be ready..."
    sleep 5
else
    echo "✅ PostgreSQL is already running"
fi

if ! docker ps | grep -q redis; then
    echo "⚠️  Redis is not running!"
    echo "📦 Starting Redis with Docker..."
    docker-compose -f docker-compose.dev.yml up -d redis
    sleep 2
else
    echo "✅ Redis is already running"
fi

echo ""

# Set environment variables for Community Edition with PostgreSQL
export AP_EDITION=COMMUNITY
export AP_ENVIRONMENT=dev
export AP_DEV_PIECES=ada-bmp

# Database configuration (matching docker-compose.dev.yml)
export AP_DB_TYPE=POSTGRES
export AP_POSTGRES_DATABASE=activepieces
export AP_POSTGRES_HOST=localhost
export AP_POSTGRES_PORT=5432
export AP_POSTGRES_USERNAME=postgres
export AP_POSTGRES_PASSWORD=A79Vm5D4p2VQHOp2gd5
export AP_POSTGRES_USE_SSL=false

# Redis configuration
export AP_REDIS_HOST=localhost
export AP_REDIS_PORT=6379

# Other required settings
export AP_ENCRYPTION_KEY=$(openssl rand -hex 16)
export AP_JWT_SECRET=$(openssl rand -hex 16)

echo "🔧 Environment configured:"
echo "   - AP_EDITION=$AP_EDITION"
echo "   - AP_ENVIRONMENT=$AP_ENVIRONMENT"
echo "   - AP_DEV_PIECES=$AP_DEV_PIECES"
echo "   - AP_DB_TYPE=$AP_DB_TYPE"
echo "   - Database: PostgreSQL (localhost:5432)"
echo "   - Redis: localhost:6379"
echo ""

echo "🏃 Starting development servers..."
echo "   - Frontend will be at: http://localhost:4200"
echo "   - API will be at: http://localhost:3000"
echo ""
echo "⏳ This may take 30-60 seconds on first startup..."
echo ""

# Start the dev server
npm run dev
