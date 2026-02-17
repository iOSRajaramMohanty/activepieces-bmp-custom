#!/bin/bash

echo "════════════════════════════════════════════════════════"
echo "🛑 STOPPING ACTIVEPIECES SERVICES"
echo "════════════════════════════════════════════════════════"
echo ""

# Stop Backend
echo "🛑 Stopping Backend (Port 3000)..."
if lsof -i :3000 > /dev/null 2>&1; then
    lsof -ti :3000 | xargs kill -9 2>/dev/null
    echo "   ✅ Backend stopped"
else
    echo "   ℹ️  Backend not running"
fi

# Stop Frontend
echo "🛑 Stopping Frontend (Port 4300)..."
if lsof -i :4300 > /dev/null 2>&1; then
    lsof -ti :4300 | xargs kill -9 2>/dev/null
    echo "   ✅ Frontend stopped"
else
    echo "   ℹ️  Frontend not running"
fi

echo ""
echo "════════════════════════════════════════════════════════"
echo "✅ ALL SERVICES STOPPED"
echo "════════════════════════════════════════════════════════"
echo ""
echo "🚀 To restart:"
echo "   ./scripts/restart-all.sh"
echo ""
echo "   Or start individually:"
echo "   Backend + Frontend:  ./scripts/run-dev.sh"
echo "   (React UI runs on port 4300 as part of run-dev.sh)"
echo ""
echo "════════════════════════════════════════════════════════"
