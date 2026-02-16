#!/bin/bash

# Script to run Activepieces backend only (without frontend UI)
# Useful for development when using external frontend (e.g., bmp-fe-web)
# Starts both the API server and the Engine service

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Function to ensure sqlite3 bindings are properly set up
ensure_sqlite3_bindings() {
    local sqlite3_dir="$PROJECT_ROOT/node_modules/sqlite3"
    local binding_dir="$sqlite3_dir/lib/binding/node-v137-darwin-arm64"
    local built_binding="$sqlite3_dir/build/Release/node_sqlite3.node"
    
    # Skip if bindings already exist
    if [ -f "$binding_dir/node_sqlite3.node" ]; then
        return 0
    fi
    
    # Check if compiled binding exists
    if [ ! -f "$built_binding" ]; then
        echo "🔧 Compiling sqlite3 native bindings..."
        npm rebuild sqlite3 >/dev/null 2>&1 || true
    fi
    
    # Create symlink if built binding exists
    if [ -f "$built_binding" ]; then
        echo "🔗 Setting up sqlite3 bindings symlink..."
        mkdir -p "$binding_dir"
        ln -sf ../../../build/Release/node_sqlite3.node "$binding_dir/node_sqlite3.node"
        echo "✅ SQLite3 bindings configured"
    fi
}

echo "🚀 Starting Activepieces Backend (API + Engine)..."
echo "   Backend API will be available at: http://localhost:3000"
echo "   API docs: http://localhost:3000/v1/docs"
echo ""

# Ensure sqlite3 bindings are set up (for fast piece cache)
ensure_sqlite3_bindings

# Kill any existing processes on port 3000
if lsof -ti :3000 > /dev/null 2>&1; then
    echo "⚠️  Port 3000 is in use. Killing existing process..."
    lsof -ti :3000 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

# Run backend API and Engine concurrently in background (same as npm run dev:backend)
LOG_FILE="${PROJECT_ROOT}/backend.log"
echo "📦 Starting server-api and engine in background..."
echo "   Logs: $LOG_FILE"
echo ""
nohup npm run dev:backend >> "$LOG_FILE" 2>&1 &
BACKEND_PID=$!
echo "   PID: $BACKEND_PID"
echo "   To stop: kill $BACKEND_PID"
echo "   To follow logs: tail -f $LOG_FILE"
echo ""
echo "✅ Backend running in background."
