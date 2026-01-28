#!/bin/bash

##############################################################################
# Complete Docker Build Validation Script
# 
# Comprehensive validation of Docker dev environment
# Checks infrastructure, custom piece, performance, and functionality
##############################################################################

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "════════════════════════════════════════════════════════"
echo "🔬 COMPLETE DOCKER BUILD VALIDATION"
echo "════════════════════════════════════════════════════════"
echo ""

FAILED_TESTS=0

# Test 1: Container Health
echo -e "${BLUE}═══ 1. Container Health ═══${NC}"
docker-compose -f docker-compose.dev.yml ps
echo ""

HEALTHY_COUNT=$(docker-compose -f docker-compose.dev.yml ps 2>/dev/null | grep "healthy" | wc -l | tr -d ' ')
if [ "$HEALTHY_COUNT" -eq "3" ]; then
    echo -e "${GREEN}✅ All 3 containers healthy${NC}"
else
    echo -e "${RED}❌ Only $HEALTHY_COUNT/3 containers healthy${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo ""

# Test 2: Custom Piece in API
echo -e "${BLUE}═══ 2. Custom Piece in API ═══${NC}"
if curl -s 'http://localhost:8080/api/v1/pieces' 2>/dev/null | grep -q "ada-bmp"; then
    echo -e "${GREEN}✅ ada-bmp FOUND in API${NC}"
else
    echo -e "${RED}❌ ada-bmp NOT FOUND in API${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo ""

# Test 3: Module Errors
echo -e "${BLUE}═══ 3. Dependency Errors Check ═══${NC}"
ERROR_COUNT=$(docker logs activepieces-dev --since 5m 2>&1 | grep -i "Cannot find module" | wc -l | tr -d ' ')
if [ "$ERROR_COUNT" -eq "0" ]; then
    echo -e "${GREEN}✅ NO module errors (last 5 minutes)${NC}"
else
    echo -e "${RED}❌ FOUND $ERROR_COUNT module errors${NC}"
    echo ""
    echo "Recent errors:"
    docker logs activepieces-dev --since 5m 2>&1 | grep -i "Cannot find module" | tail -3
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo ""

# Test 4: Piece Details
echo -e "${BLUE}═══ 4. Piece Details ═══${NC}"
curl -s 'http://localhost:8080/api/v1/pieces' 2>/dev/null | jq '.[] | select(.name | contains("ada-bmp")) | {name, displayName, version, pieceType: .pieceType, categories}' 2>/dev/null || {
    echo "Piece data (jq not available):"
    curl -s 'http://localhost:8080/api/v1/pieces' 2>/dev/null | grep -A 5 "ada-bmp"
}
echo ""

# Test 5: Total Pieces Count
echo -e "${BLUE}═══ 5. Total Pieces Count ═══${NC}"
PIECE_COUNT=$(curl -s 'http://localhost:8080/api/v1/pieces' 2>/dev/null | jq 'length' 2>/dev/null || echo "unknown")
echo "Total pieces: $PIECE_COUNT"
if [ "$PIECE_COUNT" -gt "600" ] 2>/dev/null; then
    echo -e "${GREEN}✅ Expected piece count (600+)${NC}"
else
    echo -e "${YELLOW}⚠️  Lower than expected (may be normal in dev mode)${NC}"
fi
echo ""

# Test 6: Web Access
echo -e "${BLUE}═══ 6. Web Interface Access ═══${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 2>/dev/null)
echo "HTTP Status Code: $HTTP_CODE"
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Web interface accessible${NC}"
else
    echo -e "${RED}❌ Web interface not responding correctly${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo ""

# Test 7: API Response Time
echo -e "${BLUE}═══ 7. API Performance ═══${NC}"
echo -n "Testing API response time... "
START_TIME=$(date +%s)
curl -s 'http://localhost:8080/api/v1/pieces' > /dev/null 2>&1
END_TIME=$(date +%s)
RESPONSE_TIME=$((END_TIME - START_TIME))
echo "${RESPONSE_TIME}s"
if [ "$RESPONSE_TIME" -lt "10" ]; then
    echo -e "${GREEN}✅ Response time acceptable (<10s)${NC}"
else
    echo -e "${YELLOW}⚠️  Response time slow (${RESPONSE_TIME}s)${NC}"
fi
echo ""

# Test 8: Environment Variables
echo -e "${BLUE}═══ 8. Environment Variables ═══${NC}"
docker exec activepieces-dev env 2>/dev/null | grep -E "AP_DEV_PIECES|AP_ENVIRONMENT|AP_POSTGRES_HOST|AP_REDIS_HOST" || echo "Could not retrieve environment variables"
echo ""

# Test 9: Piece Directory in Container
echo -e "${BLUE}═══ 9. Piece Directory in Container ═══${NC}"
if docker exec activepieces-dev ls -la /usr/src/app/dist/packages/pieces/custom/ada-bmp 2>/dev/null | grep -q "index.js"; then
    echo -e "${GREEN}✅ Piece files exist in container${NC}"
else
    echo -e "${RED}❌ Piece files missing in container${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo ""

# Test 10: Database Connection
echo -e "${BLUE}═══ 10. Database Connection ═══${NC}"
if docker exec postgres-dev pg_isready -U postgres 2>/dev/null | grep -q "accepting connections"; then
    echo -e "${GREEN}✅ PostgreSQL accepting connections${NC}"
    
    # Check user count
    USER_COUNT=$(PGPASSWORD=A79Vm5D4p2VQHOp2gd5 psql -h localhost -p 5433 -U postgres -d activepieces -t -c 'SELECT COUNT(*) FROM "user";' 2>/dev/null | tr -d ' ')
    echo "Users in database: $USER_COUNT"
    if [ "$USER_COUNT" -gt "0" ] 2>/dev/null; then
        echo -e "${GREEN}✅ Users exist in database${NC}"
    else
        echo -e "${YELLOW}⚠️  No users found (fresh database?)${NC}"
    fi
else
    echo -e "${RED}❌ PostgreSQL not responding${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo ""

# Test 11: Resource Usage
echo -e "${BLUE}═══ 11. Container Resources ═══${NC}"
docker stats --no-stream activepieces-dev postgres-dev redis-dev 2>/dev/null
echo ""

# Summary
echo "════════════════════════════════════════════════════════"
echo -e "${BLUE}📊 VALIDATION SUMMARY${NC}"
echo "════════════════════════════════════════════════════════"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✅✅✅ ALL TESTS PASSED! ✅✅✅${NC}"
    echo ""
    echo "Your Docker dev environment is fully validated!"
    echo ""
    echo "🎯 Next Steps:"
    echo "  1. Open http://localhost:8080"
    echo "  2. Login: demo@user.com / SuperAdmin2024!"
    echo "  3. Navigate to: Super Admin Dashboard → Setup → Pieces"
    echo "  4. Search for 'bmp' to find your ADA BMP piece"
    echo "  5. Create a new flow"
    echo "  6. Add ADA BMP piece to the flow"
    echo "  7. Configure and test your piece"
    echo ""
    echo "📚 Documentation:"
    echo "  - DOCKER_BUILD_VALIDATION_GUIDE.md (complete guide)"
    echo "  - DOCKER_DEV_SUCCESS.md (success story)"
    echo "  - COMPLETE_SETUP_GUIDE.md (full setup)"
    echo ""
    exit 0
else
    echo -e "${RED}❌ VALIDATION FAILED: $FAILED_TESTS test(s) failed${NC}"
    echo ""
    echo "🔧 Troubleshooting Steps:"
    echo ""
    
    if [ "$HEALTHY_COUNT" -lt "3" ]; then
        echo "Container Issues:"
        echo "  1. Check logs: docker logs activepieces-dev --tail 50"
        echo "  2. Restart: docker-compose -f docker-compose.dev.yml restart activepieces"
        echo ""
    fi
    
    if ! curl -s 'http://localhost:8080/api/v1/pieces' 2>/dev/null | grep -q "ada-bmp"; then
        echo "Piece Not Found:"
        echo "  1. Check environment: docker exec activepieces-dev env | grep AP_DEV_PIECES"
        echo "  2. Rebuild piece: npx nx build pieces-ada-bmp"
        echo "  3. Restart container: docker-compose -f docker-compose.dev.yml restart activepieces"
        echo ""
    fi
    
    if [ "$ERROR_COUNT" -gt "0" ]; then
        echo "Module Errors:"
        echo "  1. Run: ./scripts/fix-docker-dev-dependencies.sh"
        echo "  2. Or manually:"
        echo "     docker exec activepieces-dev bash -c \"cd /usr/src/app && bun add tslib @activepieces/pieces-common @activepieces/pieces-framework @activepieces/shared\""
        echo "     docker-compose -f docker-compose.dev.yml restart activepieces"
        echo ""
    fi
    
    echo "📚 Full Troubleshooting Guide:"
    echo "  See: DOCKER_BUILD_VALIDATION_GUIDE.md → Phase 10"
    echo ""
    exit 1
fi
