#!/bin/bash

################################################################################
# Local Development Script
################################################################################
#
# This script runs Activepieces locally for fast development iteration:
#   - Backend API: http://localhost:3000
#   - Frontend UI: http://localhost:4300
#   - PostgreSQL: localhost:5433 (starts via Docker if not running - uses existing data)
#   - Redis: localhost:6379 (starts via Docker if not running)
#
# If Postgres/Redis aren't running, they are auto-started via docker-compose.local-db.yml
# Backs up database to ~/activepieces_backups/ before start/restart (when Postgres is running)
#
# Usage:
#   ./scripts/dev-local.sh [start|stop|restart|status|db-start|db-stop]
#
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Function to print colored messages
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

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
        print_info "Compiling sqlite3 native bindings..."
        npm rebuild sqlite3 >/dev/null 2>&1 || true
    fi
    
    # Create symlink if built binding exists
    if [ -f "$built_binding" ]; then
        print_info "Setting up sqlite3 bindings symlink..."
        mkdir -p "$binding_dir"
        ln -sf ../../../build/Release/node_sqlite3.node "$binding_dir/node_sqlite3.node"
        print_success "SQLite3 bindings configured"
    fi
}

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill process on port
kill_port() {
    local port=$1
    print_info "Killing process on port $port..."
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
    sleep 1
}

# Backup database before start/restart (when Postgres is accessible)
backup_db() {
    if [ ! -f ".env" ]; then
        return 0
    fi
    set -a
    source .env
    set +a
    
    if ! check_port 5433; then
        print_info "PostgreSQL not running, skipping backup"
        return 0
    fi
    
    mkdir -p ~/activepieces_backups
    BACKUP_FILE=~/activepieces_backups/activepieces_backup_$(date +%Y%m%d_%H%M%S).sql
    print_info "Backing up database to $BACKUP_FILE ..."
    
    if PGPASSWORD="${AP_POSTGRES_PASSWORD}" pg_dump \
        -h "${AP_POSTGRES_HOST:-localhost}" \
        -p "${AP_POSTGRES_PORT:-5433}" \
        -U "${AP_POSTGRES_USERNAME:-postgres}" \
        -d "${AP_POSTGRES_DATABASE:-activepieces}" \
        -F p \
        -f "$BACKUP_FILE" 2>/dev/null; then
        if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
            BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
            print_success "Database backed up ($BACKUP_SIZE)"
            # Delete old backup files (keep only the current one)
            BACKUP_DIR=~/activepieces_backups
            BACKUP_BASENAME=$(basename "$BACKUP_FILE")
            for f in "$BACKUP_DIR"/activepieces_backup_*.sql; do
                [ -f "$f" ] || continue
                [ "$(basename "$f")" = "$BACKUP_BASENAME" ] && continue
                rm -f "$f"
            done
        else
            print_warning "Backup file empty (OK if fresh install)"
        fi
    else
        print_warning "Could not backup database (may be empty or not initialized)"
    fi
}

# Ensure Postgres (5433) and Redis (6379) are running - start via Docker if not
ensure_local_db() {
    if check_port 5433 && check_port 6379; then
        print_success "PostgreSQL (5433) and Redis (6379) already running"
        return 0
    fi
    
    print_info "PostgreSQL or Redis not running. Starting via docker-compose.local-db.yml..."
    
    # Ensure volume exists (for existing data)
    if ! docker volume inspect activepieces-bmp-custom_postgres_data_dev >/dev/null 2>&1; then
        print_info "Creating volume for existing data..."
        docker volume create activepieces-bmp-custom_postgres_data_dev 2>/dev/null || true
    fi
    
    docker compose -f docker-compose.local-db.yml up -d
    print_info "Waiting for PostgreSQL and Redis to be ready..."
    sleep 5
    
    local retries=30
    while [ $retries -gt 0 ]; do
        if check_port 5433 && check_port 6379; then
            print_success "PostgreSQL (5433) and Redis (6379) ready"
            return 0
        fi
        sleep 2
        retries=$((retries - 1))
    done
    
    print_error "PostgreSQL or Redis failed to start. Check: docker compose -f docker-compose.local-db.yml logs"
    exit 1
}

# Function to start all services (backend, engine, frontend)
start_all_services() {
    print_info "Starting all services (Backend API, Engine, Frontend UI)..."
    
    cd "$PROJECT_ROOT"
    
    # Ensure sqlite3 bindings are set up (for fast piece cache)
    ensure_sqlite3_bindings
    
    # Ensure Postgres and Redis are running on 5433 and 6379
    ensure_local_db
    
    # Check if .env exists (used for existing PostgreSQL + Redis config)
    if [ ! -f ".env" ]; then
        print_error ".env file not found in project root"
        print_error "Create from .env.example: cp .env.example .env"
        exit 1
    fi
    
    # Load .env for existing PostgreSQL and Redis (dev-local uses host services, not Docker)
    set -a
    source .env
    set +a
    print_info "Using existing DB: $AP_POSTGRES_HOST:$AP_POSTGRES_PORT, Redis: $AP_REDIS_HOST:$AP_REDIS_PORT"
    
    # Start all services in background
    npm run dev > "$PROJECT_ROOT/dev-local.log" 2>&1 &
    echo $! > "$PROJECT_ROOT/.dev-pid"
    
    print_success "Services starting... (logs: dev-local.log)"
}

# Function to stop services
stop_services() {
    print_info "Stopping local development services..."
    
    # Kill dev process
    if [ -f "$PROJECT_ROOT/.dev-pid" ]; then
        PID=$(cat "$PROJECT_ROOT/.dev-pid")
        # Kill the process group (parent and all children)
        pkill -P $PID 2>/dev/null || true
        kill $PID 2>/dev/null || true
        rm "$PROJECT_ROOT/.dev-pid"
    fi
    
    # Explicitly kill Engine worker (nx serve engine) - it may not bind to a port
    pkill -f "nx serve engine" 2>/dev/null || true
    
    # Kill processes on ports (cleanup)
    kill_port 3000  # Backend
    kill_port 3001  # Engine (if it binds)
    kill_port 4300  # Frontend
    
    print_success "Services stopped"
}

# Function to show status
show_status() {
    echo ""
    echo "════════════════════════════════════════"
    echo -e "${BLUE}📊 Local Development Status${NC}"
    echo "════════════════════════════════════════"
    echo ""
    
    # Check backend
    if check_port 3000; then
        print_success "Backend API: ✅ Running on http://localhost:3000"
    else
        print_error "Backend API: ❌ Not running"
    fi
    
    # Check engine (Engine is a worker, not an HTTP server)
    if pgrep -f "nx serve engine" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Engine:      ✅ Running (worker, not HTTP server)${NC}"
    else
        print_error "Engine: ❌ Not running"
    fi
    
    # Check frontend (port 4300)
    if check_port 4300; then
        print_success "Frontend UI: ✅ Running on http://localhost:4300"
    else
        print_error "Frontend UI: ❌ Not running"
    fi
    
    echo ""
    echo "📝 Logs:"
    echo "   All services: tail -f dev-local.log"
    echo ""
}

# Function to start all services
start_all() {
    echo ""
    echo "════════════════════════════════════════"
    echo -e "${BLUE}🚀 Starting Local Development${NC}"
    echo "════════════════════════════════════════"
    echo ""
    
    # Backup DB before restart/start (when accessible)
    backup_db
    
    # Stop any existing services
    stop_services
    
    # Start services
    start_all_services
    
    echo ""
    print_info "Waiting for services to be ready... (this takes ~30-60 seconds)"
    sleep 10
    
    show_status
    
    echo ""
    print_success "Development environment starting!"
    echo ""
    echo "🌐 Frontend: http://localhost:4300"
    echo "📊 Backend:  http://localhost:3000"
    echo "⚙️  Engine:   http://localhost:3001"
    echo ""
    print_info "Services are still starting up. Wait 30-60 seconds then check status:"
    echo "   ./scripts/dev-local.sh status"
    echo ""
    print_info "View logs: tail -f dev-local.log"
    print_info "To stop:   ./scripts/dev-local.sh stop"
    echo ""
}

# Start/stop local DB only
db_start() {
    ensure_local_db
    echo ""
    print_success "Local DB running: Postgres localhost:5433, Redis localhost:6379"
}

db_stop() {
    print_info "Stopping local Postgres and Redis..."
    docker compose -f docker-compose.local-db.yml down 2>/dev/null || true
    print_success "Local DB stopped"
}

# Main script
case "${1:-start}" in
    start)
        start_all
        ;;
    stop)
        stop_services
        ;;
    restart)
        stop_services
        sleep 2
        start_all
        ;;
    status)
        show_status
        ;;
    db-start)
        db_start
        ;;
    db-stop)
        db_stop
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|db-start|db-stop}"
        exit 1
        ;;
esac
