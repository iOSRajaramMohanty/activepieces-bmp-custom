#!/bin/bash

# ============================================
# Activepieces Environment Switcher
# ============================================
# This script helps you switch between different environments
# by copying the appropriate .env template to the project root
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
TEMPLATES_DIR="$PROJECT_ROOT/docs/project/env-templates"
ENV_FILE="$PROJECT_ROOT/.env"
ENV_BACKUP="$PROJECT_ROOT/.env.bak"

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ${NC}  $1"
}

print_success() {
    echo -e "${GREEN}✓${NC}  $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC}  $1"
}

print_error() {
    echo -e "${RED}✗${NC}  $1"
}

# Function to show usage
show_usage() {
    cat << EOF
${BLUE}Activepieces Environment Switcher${NC}

Usage: $0 [environment]

Available Environments:
  ${GREEN}dev1${NC}       - Development Server 1 (bmpapidev1)
  ${GREEN}dev2${NC}       - Development Server 2 (bmpapidev2)
  ${GREEN}dev3${NC}       - Development Server 3 (bmpapidev3)
  ${GREEN}dev4${NC}       - Development Server 4 (bmpapidev4)
  ${GREEN}dev5${NC}       - Development Server 5 (bmpapidev5)
  ${YELLOW}staging${NC}    - Staging Server (bmpapistg)
  ${RED}production${NC} - Production Server (bmpapiprod)

Examples:
  $0 dev1        # Switch to Dev 1
  $0 staging     # Switch to Staging
  $0 production  # Switch to Production

EOF
}

# Function to backup existing .env
backup_env() {
    if [ -f "$ENV_FILE" ]; then
        print_info "Backing up current .env to .env.bak"
        cp "$ENV_FILE" "$ENV_BACKUP"
        print_success "Backup created"
    fi
}

# Function to switch environment
switch_environment() {
    local env=$1
    local template_file="$TEMPLATES_DIR/env.$env.template"
    
    # Check if template exists
    if [ ! -f "$template_file" ]; then
        print_error "Template file not found: $template_file"
        exit 1
    fi
    
    # Backup existing .env
    backup_env
    
    # Copy template
    print_info "Switching to $env environment..."
    cp "$template_file" "$ENV_FILE"
    
    print_success "Environment switched to: $env"
    echo ""
    
    # Show environment details
    case $env in
        dev1)
            print_info "Database: activepieces_dev1 (port 5433)"
            print_info "Redis: port 6379"
            print_info "API: https://bmpapidev1.cl.bmp.ada-asia.my"
            ;;
        dev2)
            print_info "Database: activepieces_dev2 (port 5434)"
            print_info "Redis: port 6380"
            print_info "API: https://bmpapidev2.cl.bmp.ada-asia.my"
            ;;
        dev3)
            print_info "Database: activepieces_dev3 (port 5435)"
            print_info "Redis: port 6381"
            print_info "API: https://bmpapidev3.cl.bmp.ada-asia.my"
            ;;
        dev4)
            print_info "Database: activepieces_dev4 (port 5436)"
            print_info "Redis: port 6382"
            print_info "API: https://bmpapidev4.cl.bmp.ada-asia.my"
            ;;
        dev5)
            print_info "Database: activepieces_dev5 (port 5437)"
            print_info "Redis: port 6383"
            print_info "API: https://bmpapidev5.cl.bmp.ada-asia.my"
            ;;
        staging)
            print_warning "Staging environment - Review and update:"
            print_warning "  - AP_FRONTEND_URL"
            print_warning "  - Database credentials"
            print_warning "  - Security keys"
            print_info "API: https://bmpapistg.cl.bmp.ada-asia.my"
            ;;
        production)
            print_error "PRODUCTION environment - CRITICAL:"
            print_error "  - Generate new AP_ENCRYPTION_KEY: openssl rand -hex 32"
            print_error "  - Generate new AP_JWT_SECRET: openssl rand -hex 32"
            print_error "  - Update database credentials"
            print_error "  - Update AP_FRONTEND_URL"
            print_error "  - Enable SSL for database and Redis"
            print_info "API: https://bmpapiprod.cl.bmp.ada-asia.my"
            ;;
    esac
    
    echo ""
    print_info "Next steps:"
    echo "  1. Review and update .env file"
    echo "  2. Create database if needed: CREATE DATABASE activepieces_$env;"
    echo "  3. Restart the server: npm run start"
    echo ""
    print_info "Current .env backed up to: .env.bak"
}

# Main script
main() {
    echo ""
    
    # Check if templates directory exists
    if [ ! -d "$TEMPLATES_DIR" ]; then
        print_error "Templates directory not found: $TEMPLATES_DIR"
        exit 1
    fi
    
    # Check if argument provided
    if [ $# -eq 0 ]; then
        show_usage
        exit 0
    fi
    
    local env=$1
    
    # Validate environment
    case $env in
        dev1|dev2|dev3|dev4|dev5|staging|production)
            switch_environment "$env"
            ;;
        help|--help|-h)
            show_usage
            exit 0
            ;;
        *)
            print_error "Invalid environment: $env"
            echo ""
            show_usage
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
