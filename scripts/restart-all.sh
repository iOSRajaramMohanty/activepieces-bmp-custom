#!/bin/bash

echo "════════════════════════════════════════════════════════"
echo "🔄 RESTARTING ACTIVEPIECES SERVICES"
echo "════════════════════════════════════════════════════════"
echo ""

# Stop services
echo "🛑 Stopping Backend (Port 3000)..."
lsof -ti :3000 | xargs kill -9 2>/dev/null
sleep 1

echo "🛑 Stopping Frontend (Port 4200)..."
lsof -ti :4200 | xargs kill -9 2>/dev/null
sleep 2

echo "✅ Services stopped"
echo ""

# Reset Nx cache to prevent watch errors (especially after merges)
echo "🔄 Resetting Nx cache..."
npx nx reset > /dev/null 2>&1

# Ensure Nx cache directory structure exists to prevent ENOENT errors
echo "🔧 Ensuring Nx cache directory structure exists..."
mkdir -p .nx/cache/terminalOutputs
chmod -R 755 .nx/cache 2>/dev/null || true
echo "✅ Nx cache reset and directory structure ready"
echo ""

# Start all services (Backend + Frontend + Engine)
echo "🚀 Starting Activepieces Services..."
echo "   (This starts Backend API, Frontend UI, and Engine together)"
cd /Users/rajarammohanty/Documents/POC/activepieces
nohup ./scripts/run-dev.sh > backend.log 2>&1 &
SERVICES_PID=$!
echo "   Services PID: $SERVICES_PID"
echo "   ⏳ Waiting for services to start..."
sleep 10

# Check if backend started
if lsof -i :3000 > /dev/null 2>&1; then
    echo "   ✅ Backend running on http://localhost:3000"
else
    echo "   ⏳ Backend still starting... (may take 30-60 seconds)"
fi

# Check if frontend started
if lsof -i :4200 > /dev/null 2>&1; then
    echo "   ✅ Frontend running on http://localhost:4200"
else
    echo "   ⏳ Frontend still starting... (may take 30-60 seconds)"
fi

echo ""
echo "════════════════════════════════════════════════════════"
echo "✅ RESTART COMPLETE"
echo "════════════════════════════════════════════════════════"
echo ""
echo "📊 Service Status:"
echo "   Backend:  http://localhost:3000"
echo "   Frontend: http://localhost:4200"
echo ""
echo "📝 View Logs:"
echo "   All Services: tail -f backend.log"
echo ""
echo "🛑 Stop Services:"
echo "   ./scripts/stop-all.sh"
echo ""
echo "════════════════════════════════════════════════════════"
