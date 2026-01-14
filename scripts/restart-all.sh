#!/bin/bash

echo "════════════════════════════════════════════════════════"
echo "🔄 RESTARTING ACTIVEPIECES SERVICES"
echo "════════════════════════════════════════════════════════"
echo ""

# Stop services
echo "🛑 Stopping Backend (Port 3000)..."
lsof -ti :3000 | xargs kill -9 2>/dev/null
sleep 1

echo "🛑 Stopping Frontend (Port 4201)..."
lsof -ti :4201 | xargs kill -9 2>/dev/null
sleep 2

echo "✅ Services stopped"
echo ""

# Start Backend
echo "🚀 Starting Backend API..."
cd /Users/rajarammohanty/Documents/POC/activepieces
nohup ./scripts/run-dev.sh > backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"
sleep 5

# Check if backend started
if lsof -i :3000 > /dev/null 2>&1; then
    echo "   ✅ Backend running on http://localhost:3000"
else
    echo "   ❌ Backend failed to start. Check backend.log"
fi

echo ""

# Start Frontend
echo "🚀 Starting Frontend UI..."
cd /Users/rajarammohanty/Documents/POC/activepieces/activepieces-admin-ui
nohup npm start > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"
echo "   ⏳ Waiting for frontend to compile..."
sleep 10

# Check if frontend started
if lsof -i :4201 > /dev/null 2>&1; then
    echo "   ✅ Frontend running on http://localhost:4201"
else
    echo "   ⏳ Frontend still starting... Check frontend.log"
fi

echo ""
echo "════════════════════════════════════════════════════════"
echo "✅ RESTART COMPLETE"
echo "════════════════════════════════════════════════════════"
echo ""
echo "📊 Service Status:"
echo "   Backend:  http://localhost:3000"
echo "   Frontend: http://localhost:4201"
echo ""
echo "📝 View Logs:"
echo "   Backend:  tail -f backend.log"
echo "   Frontend: tail -f activepieces-admin-ui/frontend.log"
echo ""
echo "🛑 Stop Services:"
echo "   ./scripts/stop-all.sh"
echo ""
echo "════════════════════════════════════════════════════════"
