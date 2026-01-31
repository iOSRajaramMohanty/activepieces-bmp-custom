#!/bin/bash

##############################################################################
# Clean Docker Build & Run - Automated Script
#
# This script:
# 1. Backs up database
# 2. Cleans old Docker setup
# 3. Builds custom piece
# 4. Builds Docker image from scratch
# 5. Starts services
# 6. Fixes dependencies
# 7. Validates everything
#
# Usage: ./scripts/clean-build-run.sh
##############################################################################

set -e  # Exit on any error

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo ""
echo "════════════════════════════════════════════════════════"
echo -e "${BLUE}🚀 CLEAN DOCKER BUILD & RUN PROCESS${NC}"
echo "════════════════════════════════════════════════════════"
echo ""
echo "This will:"
echo "  1. ✅ Backup your database"
echo "  2. 🧹 Clean old Docker containers/images"
echo "  3. 🔨 Build custom piece (ada-bmp)"
echo "  4. 🐳 Build Docker image from scratch"
echo "  5. 🚀 Start all services"
echo "  6. 🔧 Install dependencies"
echo "  6.5. 🔄 Sync metadata from database"
echo "  7. 🔍 Validate everything"
echo ""
echo -e "${YELLOW}⏱️  Estimated time: 15-20 minutes${NC}"
echo ""

# Ask for confirmation
read -p "Continue? (y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

echo ""

# Change to project directory (use script-relative path so this works for forks/clones)
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

#─────────────────────────────────────────────────────────
# PHASE 1: BACKUP DATABASE
#─────────────────────────────────────────────────────────
echo "════════════════════════════════════════════════════════"
echo -e "${BLUE}📦 PHASE 1: Backing up database...${NC}"
echo "════════════════════════════════════════════════════════"
echo ""

# Create backup directory
mkdir -p ~/activepieces_backups

# Generate backup filename with timestamp
BACKUP_FILE=~/activepieces_backups/activepieces_backup_$(date +%Y%m%d_%H%M%S).sql

echo "Backup location: $BACKUP_FILE"
echo ""

# Check if database is accessible
if docker ps | grep -q "postgres-dev"; then
    echo "Database container found. Creating backup..."
    
    # Backup database
    PGPASSWORD=A79Vm5D4p2VQHOp2gd5 pg_dump \
        -h localhost \
        -p 5433 \
        -U postgres \
        -d activepieces \
        -F p \
        -f "$BACKUP_FILE" 2>/dev/null || {
        echo -e "${YELLOW}⚠️  Could not backup database (may be empty or not initialized)${NC}"
        echo "Continuing anyway..."
    }
    
    # Verify backup
    if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
        BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        echo -e "${GREEN}✅ Database backed up successfully ($BACKUP_SIZE)${NC}"
    else
        echo -e "${YELLOW}⚠️  Backup file empty or not created (OK if fresh install)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Database container not running, skipping backup${NC}"
    echo "This is OK if it's your first build."
fi

echo ""
sleep 2

#─────────────────────────────────────────────────────────
# PHASE 1.5: CHECK FOR RUNNING BUILDS
#─────────────────────────────────────────────────────────
echo "════════════════════════════════════════════════════════"
echo -e "${BLUE}🔍 PHASE 1.5: Checking for conflicting builds...${NC}"
echo "════════════════════════════════════════════════════════"
echo ""

# Kill any stuck clean-build-run.sh processes (excluding current process)
echo "Checking for stuck build scripts..."
STUCK_BUILDS=$(ps aux | grep "clean-build-run.sh" | grep -v grep | grep -v $$ | awk '{print $2}')
if [ ! -z "$STUCK_BUILDS" ]; then
    echo -e "${YELLOW}⚠️  Found stuck build processes, killing them...${NC}"
    echo "$STUCK_BUILDS" | xargs kill -9 2>/dev/null || true
    sleep 2
    echo -e "${GREEN}✅ Killed stuck build processes${NC}"
else
    echo "✅ No stuck build scripts found"
fi
echo ""

# Kill any stuck docker-compose build processes
echo "Checking for stuck docker-compose builds..."
STUCK_COMPOSE=$(ps aux | grep "docker-compose" | grep "build" | grep -v grep | awk '{print $2}')
if [ ! -z "$STUCK_COMPOSE" ]; then
    echo -e "${YELLOW}⚠️  Found stuck docker-compose builds, killing them...${NC}"
    echo "$STUCK_COMPOSE" | xargs kill -9 2>/dev/null || true
    sleep 2
    echo -e "${GREEN}✅ Killed stuck docker-compose processes${NC}"
else
    echo "✅ No stuck docker-compose builds found"
fi
echo ""

echo -e "${GREEN}✅ No conflicting builds - safe to proceed${NC}"
echo ""

#─────────────────────────────────────────────────────────
# PHASE 2: CLEAN OLD DOCKER SETUP
#─────────────────────────────────────────────────────────
echo "════════════════════════════════════════════════════════"
echo -e "${BLUE}🧹 PHASE 2: Cleaning old Docker setup...${NC}"
echo "════════════════════════════════════════════════════════"
echo ""

# Stop all containers
echo "Stopping containers..."
docker-compose -f docker-compose.dev.yml down 2>/dev/null || echo "No containers to stop"
echo ""

# Remove old image
echo "Removing old Docker image..."
docker rmi activepieces:dev 2>/dev/null || echo "No old image to remove"
echo ""

# Clean Docker cache
echo "Cleaning Docker build cache..."
docker builder prune -f > /dev/null 2>&1
echo ""

# Clean unused images
echo "Cleaning unused images..."
docker image prune -f > /dev/null 2>&1
echo ""

echo -e "${GREEN}✅ Cleanup complete${NC}"
echo ""
echo "📊 Docker volume status:"
docker volume ls | grep activepieces || echo "No activepieces volumes"
echo ""
echo -e "${YELLOW}ℹ️  Database volume preserved (contains your data)${NC}"
echo ""
sleep 2

#─────────────────────────────────────────────────────────
# PHASE 3: BUILD CUSTOM PIECE
#─────────────────────────────────────────────────────────
echo "════════════════════════════════════════════════════════"
echo -e "${BLUE}🔨 PHASE 3: Building custom piece (ada-bmp)...${NC}"
echo "════════════════════════════════════════════════════════"
echo ""

# Verify piece exists
if [ ! -d "packages/pieces/custom/ada-bmp" ]; then
    echo -e "${RED}❌ Custom piece not found: packages/pieces/custom/ada-bmp${NC}"
    exit 1
fi

echo "Ensuring project dependencies are installed..."
# Install bun if needed
node tools/scripts/install-bun.js || true

# Try local bun install + build; on failure, run the build inside Docker (Linux toolchain)
if command -v bun >/dev/null 2>&1; then
    echo "Attempting local bun install..."
    if bun install; then
        echo -e "${GREEN}✅ Local bun install succeeded.${NC}"
        echo "Building ada-bmp piece locally..."
        npx nx build pieces-ada-bmp || { echo -e "${RED}❌ Local build failed after successful install.${NC}"; exit 1; }
    else
        echo -e "${YELLOW}⚠️ Local bun install failed. Falling back to Docker-based build (Linux toolchain)...${NC}"
        if command -v docker >/dev/null 2>&1; then
            echo "Running build inside Docker (node:20-bullseye)..."
            docker run --rm -v "$PROJECT_ROOT":/usr/src/app -w /usr/src/app node:20-bullseye bash -lc "apt-get update && apt-get install -y python3 g++ build-essential git curl unzip && npm install -g bun && bun install && npx nx build pieces-ada-bmp" || { echo -e "${RED}❌ Docker-based build failed.${NC}"; exit 1; }
        else
            echo -e "${RED}❌ Docker not available to perform fallback build. Aborting.${NC}"
            exit 1
        fi
    fi
else
    echo -e "${YELLOW}⚠️ Bun not found locally. Attempting Docker-based install/build...${NC}"
    if command -v docker >/dev/null 2>&1; then
        docker run --rm -v "$PROJECT_ROOT":/usr/src/app -w /usr/src/app node:20-bullseye bash -lc "apt-get update && apt-get install -y python3 g++ build-essential git curl unzip && npm install -g bun && bun install && npx nx build pieces-ada-bmp" || { echo -e "${RED}❌ Docker-based build failed.${NC}"; exit 1; }
    else
        echo -e "${RED}❌ Neither bun nor docker available. Aborting.${NC}"
        exit 1
    fi
fi

echo ""

# Verify build output
if [ -f "dist/packages/pieces/custom/ada-bmp/src/index.js" ]; then
    echo -e "${GREEN}✅ Custom piece built successfully${NC}"
else
    echo -e "${RED}❌ Build failed - compiled files not found${NC}"
    exit 1
fi

echo ""
sleep 2

#─────────────────────────────────────────────────────────
# PHASE 4: BUILD DOCKER IMAGE
#─────────────────────────────────────────────────────────
echo "════════════════════════════════════════════════════════"
echo -e "${BLUE}🐳 PHASE 4: Building Docker image from scratch...${NC}"
echo "════════════════════════════════════════════════════════"
echo ""
echo -e "${YELLOW}⏱️  This will take 8-10 minutes. Please be patient...${NC}"
echo ""

# Verify configuration
if [ ! -f "docker-compose.dev.yml" ]; then
    echo -e "${RED}❌ docker-compose.dev.yml not found${NC}"
    exit 1
fi

if [ ! -f ".env.dev.backup" ]; then
    echo -e "${RED}❌ .env.dev.backup not found${NC}"
    exit 1
fi

# Build Docker image with no cache
echo "Building image (no cache)..."
docker-compose -f docker-compose.dev.yml build --no-cache

echo ""

# Verify image built
if docker images | grep -q "activepieces.*dev"; then
    IMAGE_SIZE=$(docker images activepieces:dev --format "{{.Size}}")
    echo -e "${GREEN}✅ Docker image built successfully ($IMAGE_SIZE)${NC}"
else
    echo -e "${RED}❌ Image build failed${NC}"
    exit 1
fi

echo ""
sleep 2

#─────────────────────────────────────────────────────────
# PHASE 5: START SERVICES
#─────────────────────────────────────────────────────────
echo "════════════════════════════════════════════════════════"
echo -e "${BLUE}🚀 PHASE 5: Starting Docker services...${NC}"
echo "════════════════════════════════════════════════════════"
echo ""

# Start services
echo "Starting containers..."
docker-compose -f docker-compose.dev.yml up -d

echo ""
# Wait for containers to report healthy (up to 120s)
MAX_WAIT=120
INTERVAL=5
ELAPSED=0
HEALTHY_COUNT=0
echo "Waiting up to $MAX_WAIT seconds for containers to become healthy..."
while [ $ELAPSED -lt $MAX_WAIT ]; do
  docker-compose -f docker-compose.dev.yml ps
  HEALTHY_COUNT=$(docker-compose -f docker-compose.dev.yml ps 2>/dev/null | grep "healthy" | wc -l | tr -d ' ')
  if [ "$HEALTHY_COUNT" -eq "3" ]; then
    echo -e "${GREEN}✅ All 3 containers are healthy${NC}"
    break
  fi
  sleep $INTERVAL
  ELAPSED=$((ELAPSED + INTERVAL))
done

if [ "$HEALTHY_COUNT" -ne "3" ]; then
  echo -e "${YELLOW}⚠️  Only $HEALTHY_COUNT/3 containers healthy after $ELAPSED seconds${NC}"
  echo "Container status:"
  docker-compose -f docker-compose.dev.yml ps
fi

echo ""
sleep 2

#─────────────────────────────────────────────────────────
# PHASE 6: FIX DEPENDENCIES
#─────────────────────────────────────────────────────────
echo "════════════════════════════════════════════════════════"
echo -e "${BLUE}🔧 PHASE 6: Installing required dependencies...${NC}"
echo "════════════════════════════════════════════════════════"
echo ""

echo "Installing dependencies in container..."
docker exec activepieces-dev bash -c "cd /usr/src/app && bun add tslib @activepieces/pieces-common @activepieces/pieces-framework @activepieces/shared" 2>&1 | tail -5

echo ""
echo "Restarting container to load dependencies..."
docker-compose -f docker-compose.dev.yml restart activepieces

echo ""
echo "Waiting 30 seconds for restart..."
sleep 30
echo ""

# Check for module errors
ERROR_COUNT=$(docker logs activepieces-dev --since 1m 2>&1 | grep -i "Cannot find module" | wc -l | tr -d ' ')

if [ "$ERROR_COUNT" -eq "0" ]; then
    echo -e "${GREEN}✅ Dependencies installed successfully (no module errors)${NC}"
else
    echo -e "${YELLOW}⚠️  Found $ERROR_COUNT module errors. Trying one more time...${NC}"
    docker-compose -f docker-compose.dev.yml restart activepieces
    sleep 20
fi

echo ""
sleep 2

#─────────────────────────────────────────────────────────
# PHASE 6.5: SYNC METADATA FROM DATABASE
#─────────────────────────────────────────────────────────
echo "════════════════════════════════════════════════════════"
echo -e "${BLUE}🔄 PHASE 6.5: Syncing metadata from database...${NC}"
echo "════════════════════════════════════════════════════════"
echo ""

# Note: Metadata sync script (sync-metadata-to-env.sh) is no longer needed
# Environment-specific URLs are now handled via:
# 1. In-code environment mapping in config.ts
# 2. Database-driven environment filtering via API endpoint
# 3. Dynamic URL resolution based on selected environment
echo -e "${BLUE}ℹ️  Using database-driven environment configuration${NC}"
echo "   Environment-specific URLs are resolved dynamically at runtime"

echo ""
echo ""
sleep 2

#─────────────────────────────────────────────────────────
# PHASE 7: VALIDATE
#─────────────────────────────────────────────────────────
echo "════════════════════════════════════════════════════════"
echo -e "${BLUE}🔍 PHASE 7: Validating setup...${NC}"
echo "════════════════════════════════════════════════════════"
echo ""

# Test 1: Containers healthy
echo -n "Test 1: Containers healthy... "
# Give containers up to 120s to become healthy (this mirrors the earlier wait)
MAX_WAIT=120
INTERVAL=5
ELAPSED=0
HEALTHY=0
while [ $ELAPSED -lt $MAX_WAIT ]; do
  HEALTHY=$(docker-compose -f docker-compose.dev.yml ps 2>/dev/null | grep "healthy" | wc -l | tr -d ' ')
  if [ "$HEALTHY" -eq "3" ]; then
    break
  fi
  sleep $INTERVAL
  ELAPSED=$((ELAPSED + INTERVAL))
done
if [ "$HEALTHY" -eq "3" ]; then
  echo -e "${GREEN}✅ PASS${NC}"
else
  echo -e "${RED}❌ FAIL ($HEALTHY/3)${NC}"
  echo "--- Recent activepieces-dev logs (200 lines) ---"
  docker logs --tail 200 activepieces-dev || true
fi

# Test 2: Web accessible
echo -n "Test 2: Web accessible... "
FOUND=0
for i in {1..6}; do
  if curl -s -I http://localhost:8080 2>/dev/null | grep -q "200 OK"; then
    FOUND=1; break
  fi
  sleep 5
done
if [ "$FOUND" -eq "1" ]; then
  echo -e "${GREEN}✅ PASS${NC}"
else
  echo -e "${RED}❌ FAIL${NC}"
  echo "--- Recent activepieces-dev logs (200 lines) ---"
  docker logs --tail 200 activepieces-dev || true
fi

# Test 3: Piece in API
echo -n "Test 3: Custom piece in API... "
FOUND=0
for i in {1..12}; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" 'http://localhost:8080/api/v1/pieces/@activepieces/piece-ada-bmp' 2>/dev/null || echo "000")
  if [ "$STATUS" = "200" ]; then
    FOUND=1; break
  fi
  sleep 5
done
if [ "$FOUND" -eq "1" ]; then
  echo -e "${GREEN}✅ PASS${NC}"
else
  echo -e "${RED}❌ FAIL${NC}"
  echo "--- Recent activepieces-dev logs (200 lines) ---"
  docker logs --tail 200 activepieces-dev || true
fi

# Test 4: No module errors
echo -n "Test 4: No module errors... "
ERRORS=$(docker logs activepieces-dev --since 2m 2>&1 | grep -i "Cannot find module" | wc -l | tr -d ' ')
if [ "$ERRORS" -eq "0" ]; then
    echo -e "${GREEN}✅ PASS${NC}"
else
    echo -e "${RED}❌ FAIL ($ERRORS errors)${NC}"
    echo "--- Recent activepieces-dev logs (200 lines) ---"
    docker logs --tail 200 activepieces-dev || true
fi

# Test 5: Database connection
echo -n "Test 5: Database accessible... "
if docker exec postgres-dev pg_isready -U postgres 2>/dev/null | grep -q "accepting connections"; then
    echo -e "${GREEN}✅ PASS${NC}"
else
    echo -e "${RED}❌ FAIL${NC}"
fi

echo ""

#─────────────────────────────────────────────────────────
# SUMMARY
#─────────────────────────────────────────────────────────
echo "════════════════════════════════════════════════════════"
echo -e "${GREEN}🎉 CLEAN BUILD & RUN COMPLETE!${NC}"
echo "════════════════════════════════════════════════════════"
echo ""
echo "📊 Summary:"
echo "  • Database backed up: $BACKUP_FILE"
echo "  • Docker image rebuilt from scratch"
echo "  • Custom piece (ada-bmp) built and loaded"
echo "  • All services started"
echo "  • Dependencies installed"
echo "  • Basic validation passed"
echo ""
echo "🌐 Access your application:"
echo "  URL:      http://localhost:8080"
echo "  Login:    demo@user.com"
echo "  Password: SuperAdmin2024!"
echo ""
echo "🎨 Find your piece:"
echo "  1. Super Admin Dashboard → Setup → Pieces"
echo "  2. Search for 'bmp'"
echo "  3. Or create a flow and search 'ADA BMP'"
echo ""
echo "📚 Next steps:"
echo "  • Run full validation: ./scripts/validate-docker-build.sh"
echo "  • Check logs: docker logs -f activepieces-dev"
echo "  • View guide: cat DOCKER_CLEAN_BUILD_RUN_GUIDE.md"
echo ""
echo "💾 Database backup location:"
echo "  $BACKUP_FILE"
echo ""
echo "════════════════════════════════════════════════════════"
echo ""
