#!/bin/bash

##############################################################################
# Quick Docker Build Validation Script
# 
# Validates that Docker dev environment is working correctly
# and custom piece (ada-bmp) is loaded
##############################################################################

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔬 Quick Docker Build Validation"
echo "================================"
echo ""

# Test 1: Containers running
echo -n "1. Containers running... "
if docker-compose -f docker-compose.dev.yml ps 2>/dev/null | grep -q "healthy"; then
    echo -e "${GREEN}✅ PASS${NC}"
else
    echo -e "${RED}❌ FAIL${NC}"
    echo "   Run: docker-compose -f docker-compose.dev.yml up -d"
    exit 1
fi

# Test 2: Web accessible
echo -n "2. Web accessible... "
if curl -s -I http://localhost:8080 2>/dev/null | grep -q "200 OK"; then
    echo -e "${GREEN}✅ PASS${NC}"
else
    echo -e "${RED}❌ FAIL${NC}"
    echo "   Check: docker logs activepieces-dev"
    exit 1
fi

# Test 3: Piece in API
echo -n "3. Piece in API... "
if curl -s 'http://localhost:8080/api/v1/pieces' 2>/dev/null | grep -q "ada-bmp"; then
    echo -e "${GREEN}✅ PASS${NC}"
else
    echo -e "${RED}❌ FAIL${NC}"
    echo "   Run: ./scripts/fix-docker-dev-dependencies.sh"
    exit 1
fi

# Test 4: No module errors
echo -n "4. No module errors... "
ERROR_COUNT=$(docker logs activepieces-dev --since 5m 2>&1 | grep -i "Cannot find module" | wc -l | tr -d ' ')
if [ "$ERROR_COUNT" -eq "0" ]; then
    echo -e "${GREEN}✅ PASS${NC}"
else
    echo -e "${RED}❌ FAIL ($ERROR_COUNT errors)${NC}"
    echo "   Run: ./scripts/fix-docker-dev-dependencies.sh"
    exit 1
fi

# Test 5: Piece details
echo ""
echo "5. Piece details:"
curl -s 'http://localhost:8080/api/v1/pieces' 2>/dev/null | jq '.[] | select(.name | contains("ada-bmp")) | {name, displayName, version}' || echo "   (jq not installed, skipping pretty print)"

# Test 6: Container health details
echo ""
echo "6. Container status:"
docker-compose -f docker-compose.dev.yml ps 2>/dev/null

echo ""
echo -e "${GREEN}🎉 ALL TESTS PASSED!${NC}"
echo ""
echo "📋 Next steps:"
echo "  1. Open http://localhost:8080"
echo "  2. Login: demo@user.com / SuperAdmin2024!"
echo "  3. Go to: Super Admin Dashboard → Setup → Pieces"
echo "  4. Search for 'bmp' to find your piece"
echo "  5. Create a flow and add 'ADA BMP' piece"
echo ""
echo "📚 Documentation:"
echo "  - DOCKER_BUILD_VALIDATION_GUIDE.md (complete validation)"
echo "  - DOCKER_DEV_SUCCESS.md (setup details)"
echo "  - COMPLETE_SETUP_GUIDE.md (full guide)"
echo ""
