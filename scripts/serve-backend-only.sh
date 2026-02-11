#!/bin/bash

# Script to run Activepieces backend only (without frontend UI)
# Useful for development when using external frontend (e.g., bmp-fe-web)
# Starts both the API server and the Engine service

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo "🚀 Starting Activepieces Backend (API + Engine)..."
echo "   Backend API will be available at: http://localhost:3000"
echo "   API docs: http://localhost:3000/v1/docs"
echo ""

# Kill any existing processes on port 3000
if lsof -ti :3000 > /dev/null 2>&1; then
    echo "⚠️  Port 3000 is in use. Killing existing process..."
    lsof -ti :3000 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

# Run backend API and Engine concurrently (same as npm run dev:backend)
echo "📦 Starting server-api and engine..."
npm run dev:backend
