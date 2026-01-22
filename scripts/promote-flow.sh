#!/bin/bash

# ============================================
# Flow Promotion Script
# ============================================
# Promotes a flow from one environment to another
# Usage: ./promote-flow.sh <flow-file> <source-env> <target-env>
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
FLOWS_DIR="$PROJECT_ROOT/flows"

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
${BLUE}Flow Promotion Script${NC}

Promotes a flow from one environment to another with automatic archiving.

Usage:
  $0 <flow-file> <source-env> <target-env>

Arguments:
  flow-file    Name of the flow file (e.g., flow-v1.0.0-whatsapp.json)
  source-env   Source environment (dev, staging, production)
  target-env   Target environment (dev, staging, production)

Examples:
  # Promote from dev to staging
  $0 flow-v1.0.0-whatsapp.json dev staging

  # Promote from staging to production
  $0 flow-v1.0.0-whatsapp.json staging production

Environment Structure:
  dev        → Development environment
  staging    → Pre-production testing
  production → Live production

Notes:
  - Existing file in target will be archived automatically
  - Source file remains unchanged
  - Git commit is created automatically
  - You must manually import the flow in Activepieces UI

EOF
}

# Function to validate environment
validate_env() {
    local env=$1
    case $env in
        dev|staging|production)
            return 0
            ;;
        *)
            print_error "Invalid environment: $env"
            echo "Valid environments: dev, staging, production"
            return 1
            ;;
    esac
}

# Function to archive existing file
archive_file() {
    local env=$1
    local filename=$2
    local current_path="$FLOWS_DIR/$env/current/$filename"
    local archive_path="$FLOWS_DIR/$env/archive"
    
    if [ -f "$current_path" ]; then
        local timestamp=$(date +"%Y%m%d-%H%M%S")
        local archive_name="${filename%.json}-archived-${timestamp}.json"
        
        print_info "Archiving existing file: $filename"
        cp "$current_path" "$archive_path/$archive_name"
        print_success "Archived to: $env/archive/$archive_name"
        return 0
    fi
    
    return 1
}

# Function to promote flow
promote_flow() {
    local flow_file=$1
    local source_env=$2
    local target_env=$3
    
    local source_path="$FLOWS_DIR/$source_env/current/$flow_file"
    local target_path="$FLOWS_DIR/$target_env/current/$flow_file"
    
    # Check if source file exists
    if [ ! -f "$source_path" ]; then
        print_error "Source file not found: $source_path"
        exit 1
    fi
    
    # Archive existing target file (if exists)
    archive_file "$target_env" "$flow_file"
    
    # Copy file
    print_info "Promoting $flow_file from $source_env to $target_env..."
    cp "$source_path" "$target_path"
    print_success "Flow promoted successfully"
    
    # Extract flow version for commit message
    local version=$(echo "$flow_file" | grep -oP '(?<=flow-v)[\d\.]+' || echo "unknown")
    local flow_name=$(echo "$flow_file" | sed 's/flow-v[0-9.]*-//' | sed 's/.json//')
    
    # Git operations
    print_info "Creating Git commit..."
    cd "$FLOWS_DIR"
    git add "$target_env/current/$flow_file" "$target_env/archive/" 2>/dev/null || true
    
    local commit_msg="deploy($target_env): Promote $flow_name v$version to $target_env

Source: $source_env
Target: $target_env
File: $flow_file

Next steps:
1. Import flow to $target_env project in Activepieces UI
2. Configure $target_env connections
3. Test thoroughly
4. Publish when ready"
    
    git commit -m "$commit_msg"
    print_success "Git commit created"
    
    # Show connection remapping guide
    echo ""
    print_warning "IMPORTANT: Connection Remapping Required"
    echo "After importing to $target_env project, update these connections:"
    echo ""
    case $target_env in
        staging)
            echo "  Dev connections → Staging connections"
            echo "  Example:"
            echo "    'ADA BMP - Dev' → 'ADA BMP - Staging'"
            echo "    'Slack - Dev' → 'Slack - Staging'"
            ;;
        production)
            echo "  Staging connections → Production connections"
            echo "  Example:"
            echo "    'ADA BMP - Staging' → 'ADA BMP - Production'"
            echo "    'Slack - Staging' → 'Slack - Production'"
            ;;
        dev)
            echo "  Production/Staging connections → Dev connections"
            echo "  Example:"
            echo "    'ADA BMP - Production' → 'ADA BMP - Dev'"
            echo "    'Slack - Production' → 'Slack - Dev'"
            ;;
    esac
    
    echo ""
    print_info "Next Steps:"
    echo "  1. Push Git changes: git push"
    echo "  2. Log in to Activepieces $target_env project"
    echo "  3. Go to Flows → Import"
    echo "  4. Upload: $target_path"
    echo "  5. Configure $target_env connections"
    echo "  6. Test flow thoroughly"
    echo "  7. Publish flow"
    
    if [ "$target_env" == "production" ]; then
        echo ""
        print_warning "PRODUCTION DEPLOYMENT CHECKLIST:"
        echo "  [ ] Flow tested in staging"
        echo "  [ ] Production connections configured"
        echo "  [ ] Rollback plan ready"
        echo "  [ ] Team notified"
        echo "  [ ] Monitoring enabled"
    fi
}

# Main script
main() {
    echo ""
    
    # Check if flows directory exists
    if [ ! -d "$FLOWS_DIR" ]; then
        print_error "Flows directory not found: $FLOWS_DIR"
        exit 1
    fi
    
    # Check arguments
    if [ $# -ne 3 ]; then
        show_usage
        exit 1
    fi
    
    local flow_file=$1
    local source_env=$2
    local target_env=$3
    
    # Validate environments
    if ! validate_env "$source_env" || ! validate_env "$target_env"; then
        exit 1
    fi
    
    # Check if source and target are the same
    if [ "$source_env" == "$target_env" ]; then
        print_error "Source and target environments cannot be the same"
        exit 1
    fi
    
    # Confirm production deployment
    if [ "$target_env" == "production" ]; then
        echo ""
        print_warning "⚠️  PRODUCTION DEPLOYMENT WARNING ⚠️"
        echo "You are about to deploy to PRODUCTION environment."
        echo ""
        read -p "Have you tested this flow in staging? (yes/no): " tested
        if [ "$tested" != "yes" ]; then
            print_error "Deployment cancelled. Please test in staging first."
            exit 1
        fi
        
        read -p "Type 'DEPLOY' to confirm production deployment: " confirm
        if [ "$confirm" != "DEPLOY" ]; then
            print_error "Deployment cancelled."
            exit 1
        fi
    fi
    
    # Promote the flow
    promote_flow "$flow_file" "$source_env" "$target_env"
    
    echo ""
    print_success "Flow promotion complete!"
}

# Run main function
main "$@"
