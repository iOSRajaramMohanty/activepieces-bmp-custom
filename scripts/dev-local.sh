#!/bin/bash

################################################################################
# Local Development Script - No Docker Required!
################################################################################
#
# This script runs Activepieces locally for fast development iteration:
#   - Backend API: http://localhost:3000
#   - Frontend UI: http://localhost:4200
#   - Uses PGLITE (embedded DB, no setup needed)
#   - Uses MEMORY queue (no Redis needed)
#
# Usage:
#   ./scripts/dev-local.sh [start|stop|restart|status]
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

# Function to start all services (backend, engine, frontend)
start_all_services() {
    print_info "Starting all services (Backend API, Engine, Frontend UI)..."
    
    cd "$PROJECT_ROOT"
    
    # Check if .env exists
    if [ ! -f "packages/server/api/.env" ]; then
        print_error ".env file not found in packages/server/api/"
        exit 1
    fi
    
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
    
    # Kill processes on ports (cleanup)
    kill_port 3000  # Backend
    kill_port 3001  # Engine
    kill_port 4200  # Frontend (old)
    kill_port 4300  # Frontend (new)
    
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
    # It compiles and waits to be invoked by the backend
    if pgrep -f "nx serve engine" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Engine:      ✅ Compiled & Ready (worker, not HTTP server)${NC}"
    else
        echo -e "${YELLOW}⚠️  Engine:      ⚠️  Not compiled (building...)${NC}"
    fi
    
    # Check frontend (try both ports)
    if check_port 4300; then
        print_success "Frontend UI: ✅ Running on http://localhost:4300"
    elif check_port 4200; then
        print_success "Frontend UI: ✅ Running on http://localhost:4200"
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
    *)
        echo "Usage: $0 {start|stop|restart|status}"
        exit 1
        ;;
esac
