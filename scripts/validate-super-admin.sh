#!/bin/bash

# Super Admin Dashboard Validation Script
# This script helps you validate the implementation

echo "════════════════════════════════════════════════════════"
echo "🛡️  SUPER ADMIN DASHBOARD VALIDATION"
echo "════════════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check 1: Files exist
echo "📁 Checking if files exist..."
FILES=(
    "packages/react-ui/src/lib/super-admin-api.ts"
    "packages/react-ui/src/hooks/super-admin-hooks.ts"
    "packages/react-ui/src/app/routes/super-admin/index.tsx"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "  ${GREEN}✓${NC} $file"
    else
        echo -e "  ${RED}✗${NC} $file (MISSING!)"
    fi
done
echo ""

# Check 2: Services running
echo "🔍 Checking services..."
if lsof -i :3000 -sTCP:LISTEN > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} Backend API (Port 3000) is running"
else
    echo -e "  ${RED}✗${NC} Backend API (Port 3000) is NOT running"
    echo "     Run: ./scripts/restart-all.sh"
fi

if lsof -i :4200 -sTCP:LISTEN > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} React UI (Port 4200) is running"
else
    echo -e "  ${RED}✗${NC} React UI (Port 4200) is NOT running"
    echo "     Run: ./scripts/restart-all.sh"
fi
echo ""

# Check 3: Backend API endpoints
echo "🌐 Checking backend API..."
BACKEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/v1/flags 2>/dev/null)
if [ "$BACKEND_RESPONSE" = "200" ]; then
    echo -e "  ${GREEN}✓${NC} Backend API is responding"
else
    echo -e "  ${RED}✗${NC} Backend API is not responding (HTTP $BACKEND_RESPONSE)"
fi
echo ""

# Check 4: React UI is accessible
echo "🖥️  Checking React UI..."
UI_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4200 2>/dev/null)
if [ "$UI_RESPONSE" = "200" ]; then
    echo -e "  ${GREEN}✓${NC} React UI is accessible"
else
    echo -e "  ${RED}✗${NC} React UI is not accessible (HTTP $UI_RESPONSE)"
fi
echo ""

# Check 5: Route configuration
echo "📋 Checking route configuration..."
if grep -q "super-admin" packages/react-ui/src/app/guards/index.tsx 2>/dev/null; then
    echo -e "  ${GREEN}✓${NC} Super admin route is configured"
else
    echo -e "  ${RED}✗${NC} Super admin route is NOT configured"
fi
echo ""

# Check 6: Sidebar integration
echo "🎨 Checking sidebar integration..."
if grep -q "Super Admin Dashboard" packages/react-ui/src/app/components/sidebar/platform/index.tsx 2>/dev/null; then
    echo -e "  ${GREEN}✓${NC} Sidebar link is added"
else
    echo -e "  ${RED}✗${NC} Sidebar link is NOT added"
fi
echo ""

# Instructions
echo "════════════════════════════════════════════════════════"
echo "📝 MANUAL VALIDATION STEPS"
echo "════════════════════════════════════════════════════════"
echo ""
echo "1. Open your browser and go to:"
echo -e "   ${YELLOW}http://localhost:4200/sign-in${NC}"
echo ""
echo "2. Login with super admin credentials:"
echo -e "   Email:    ${YELLOW}demo@user.com${NC}"
echo -e "   Password: ${YELLOW}Test@123${NC}"
echo ""
echo "3. After login, look for:"
echo "   • Platform Admin section in the sidebar"
echo "   • 'Super Admin Dashboard' link with Shield icon (🛡️)"
echo "   • Should be at the top of the 'General' section"
echo ""
echo "4. Click on 'Super Admin Dashboard' and verify:"
echo "   • Statistics cards at the top"
echo "   • Three tabs: Platforms, Users, Projects"
echo "   • Data tables with information"
echo ""
echo "5. Alternative: Navigate directly to:"
echo -e "   ${YELLOW}http://localhost:4200/super-admin${NC}"
echo ""
echo "════════════════════════════════════════════════════════"
echo "🧪 TEST API DIRECTLY (After Login)"
echo "════════════════════════════════════════════════════════"
echo ""
echo "Open browser console and run:"
echo ""
echo "fetch('/api/v1/super-admin/stats', {"
echo "  headers: {"
echo "    'Authorization': \`Bearer \${localStorage.getItem('token')}\`"
echo "  }"
echo "})"
echo ".then(r => r.json())"
echo ".then(data => console.log('Stats:', data));"
echo ""
echo "════════════════════════════════════════════════════════"
echo "🐛 TROUBLESHOOTING"
echo "════════════════════════════════════════════════════════"
echo ""
echo "If you don't see the dashboard:"
echo ""
echo "1. Hard refresh browser: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)"
echo "2. Clear browser cache and reload"
echo "3. Check browser console for errors (F12 → Console)"
echo "4. Verify you're logged in as demo@user.com"
echo "5. Check that user has platformRole: 'SUPER_ADMIN'"
echo ""
echo "If sidebar link is not visible:"
echo "   • Only super admins can see this link"
echo "   • Ensure you're logged in as demo@user.com"
echo "   • Try logging out and logging back in"
echo ""
echo "════════════════════════════════════════════════════════"
echo ""
