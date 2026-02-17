#!/bin/bash

echo "════════════════════════════════════════════════════════"
echo "📊 ACTIVEPIECES SERVICE STATUS"
echo "════════════════════════════════════════════════════════"
echo ""

# Check Backend
echo "🔍 Backend API (Port 3000):"
if lsof -i :3000 > /dev/null 2>&1; then
    PID=$(lsof -ti :3000)
    echo "   Status: ✅ RUNNING"
    echo "   PID: $PID"
    echo "   URL: http://localhost:3000"
    
    # Test if responding
    if curl -s http://localhost:3000/v1/flags > /dev/null 2>&1; then
        echo "   Health: ✅ RESPONDING"
    else
        echo "   Health: ⚠️  NOT RESPONDING"
    fi
else
    echo "   Status: ❌ NOT RUNNING"
fi

echo ""

# Check Frontend
echo "🔍 Frontend UI (Port 4300):"
if lsof -i :4300 > /dev/null 2>&1; then
    PID=$(lsof -ti :4300)
    echo "   Status: ✅ RUNNING"
    echo "   PID: $PID"
    echo "   URL: http://localhost:4300"
    
    # Test if responding
    if curl -s http://localhost:4300 > /dev/null 2>&1; then
        echo "   Health: ✅ RESPONDING"
    else
        echo "   Health: ⚠️  NOT RESPONDING (may be starting)"
    fi
else
    echo "   Status: ❌ NOT RUNNING"
fi

echo ""
echo "════════════════════════════════════════════════════════"
echo "💡 QUICK ACTIONS"
echo "════════════════════════════════════════════════════════"
echo ""
echo "Start Services:   ./scripts/restart-all.sh"
echo "Stop Services:    ./scripts/stop-all.sh"
echo "View Backend Log: tail -f backend.log"
echo "View Frontend Log: Check backend.log for React UI output"
echo ""
echo "════════════════════════════════════════════════════════"
