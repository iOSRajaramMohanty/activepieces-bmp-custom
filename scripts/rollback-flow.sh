#!/bin/bash

# ============================================
# Flow Rollback Script
# ============================================
# Rolls back a flow to a previous version from archive
# Usage: ./rollback-flow.sh <environment> <archived-file>
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
${BLUE}Flow Rollback Script${NC}

Rolls back a flow to a previous version from the archive.

Usage:
  $0 <environment> <archived-file>

  Or list available archived versions:
  $0 <environment> --list

Arguments:
  environment    Target environment (dev, staging, production)
  archived-file  Name of the archived file to restore

Examples:
  # List available archived versions in production
  $0 production --list

  # Rollback to a specific version
  $0 production flow-v1.0.0-whatsapp.json

Notes:
  - Current version will be archived before rollback
  - Git commit is created automatically
  - You must manually import the rolled-back flow in Activepieces UI
  - Rollback doesn't affect connections - you'll need to verify them

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

# Function to list archived files
list_archived_files() {
    local env=$1
    local archive_dir="$FLOWS_DIR/$env/archive"
    
    if [ ! -d "$archive_dir" ]; then
        print_error "Archive directory not found: $archive_dir"
        exit 1
    fi
    
    local files=$(ls -t "$archive_dir"/*.json 2>/dev/null || true)
    
    if [ -z "$files" ]; then
        print_warning "No archived files found in $env environment"
        exit 0
    fi
    
    echo ""
    print_info "Available archived versions in $env:"
    echo ""
    
    local count=1
    for file in $files; do
        local filename=$(basename "$file")
        local filedate=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M" "$file" 2>/dev/null || stat -c "%y" "$file" 2>/dev/null | cut -d' ' -f1-2)
        printf "  %2d. %-50s  %s\n" "$count" "$filename" "$filedate"
        ((count++))
    done
    
    echo ""
    print_info "To rollback to a version, run:"
    echo "  $0 $env <filename>"
    echo ""
}

# Function to archive current file before rollback
archive_current() {
    local env=$1
    local current_file=$2
    local current_path="$FLOWS_DIR/$env/current/$current_file"
    local archive_path="$FLOWS_DIR/$env/archive"
    
    if [ -f "$current_path" ]; then
        local timestamp=$(date +"%Y%m%d-%H%M%S")
        local archive_name="${current_file%.json}-before-rollback-${timestamp}.json"
        
        print_info "Archiving current version before rollback..."
        cp "$current_path" "$archive_path/$archive_name"
        print_success "Current version archived: $archive_name"
        return 0
    fi
    
    print_warning "No current version found to archive"
    return 1
}

# Function to rollback flow
rollback_flow() {
    local env=$1
    local archived_file=$2
    
    local archive_path="$FLOWS_DIR/$env/archive/$archived_file"
    local current_dir="$FLOWS_DIR/$env/current"
    
    # Extract base filename (remove archived timestamp suffix if present)
    local base_name=$(echo "$archived_file" | sed 's/-archived-[0-9]*-[0-9]*\.json/.json/' | sed 's/-before-rollback-[0-9]*-[0-9]*\.json/.json/')
    local current_path="$current_dir/$base_name"
    
    # Check if archived file exists
    if [ ! -f "$archive_path" ]; then
        print_error "Archived file not found: $archive_path"
        exit 1
    fi
    
    # Archive current version
    archive_current "$env" "$base_name"
    
    # Restore from archive
    print_info "Rolling back to: $archived_file"
    cp "$archive_path" "$current_path"
    print_success "Flow rolled back successfully"
    
    # Extract version info
    local version=$(echo "$base_name" | grep -oP '(?<=flow-v)[\d\.]+' || echo "unknown")
    local flow_name=$(echo "$base_name" | sed 's/flow-v[0-9.]*-//' | sed 's/.json//')
    
    # Git operations
    print_info "Creating Git commit..."
    cd "$FLOWS_DIR"
    git add "$env/current/$base_name" "$env/archive/" 2>/dev/null || true
    
    local commit_msg="rollback($env): Rollback $flow_name to v$version in $env

Rolled back from: Current version
Rolled back to: $archived_file
Environment: $env

Reason: [Add reason for rollback]

Next steps:
1. Import rolled-back flow to $env project in Activepieces UI
2. Verify connections are correct
3. Test thoroughly
4. Publish when ready"
    
    git commit -m "$commit_msg"
    print_success "Git commit created"
    
    # Show next steps
    echo ""
    print_success "Rollback Complete!"
    echo ""
    print_info "Next Steps:"
    echo "  1. Review the reason for rollback in commit message"
    echo "  2. Push Git changes: git push"
    echo "  3. Log in to Activepieces $env project"
    echo "  4. Go to Flows → Import"
    echo "  5. Upload: $current_path"
    echo "  6. Verify connections (they might need updating)"
    echo "  7. Test flow thoroughly"
    echo "  8. Publish when ready"
    
    if [ "$env" == "production" ]; then
        echo ""
        print_warning "PRODUCTION ROLLBACK - IMMEDIATE ACTIONS:"
        echo "  [ ] Notify team about rollback"
        echo "  [ ] Monitor flow execution closely"
        echo "  [ ] Document root cause"
        echo "  [ ] Plan fix for next deployment"
    fi
    
    echo ""
    print_info "Rolled back file location:"
    echo "  $current_path"
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
    if [ $# -lt 1 ]; then
        show_usage
        exit 1
    fi
    
    local env=$1
    
    # Validate environment
    if ! validate_env "$env"; then
        exit 1
    fi
    
    # Check for --list flag
    if [ $# -eq 2 ] && [ "$2" == "--list" ]; then
        list_archived_files "$env"
        exit 0
    fi
    
    # Check for archived file argument
    if [ $# -ne 2 ]; then
        show_usage
        exit 1
    fi
    
    local archived_file=$2
    
    # Confirm rollback
    echo ""
    print_warning "⚠️  ROLLBACK WARNING ⚠️"
    echo "You are about to rollback a flow in $env environment."
    echo "Archived file: $archived_file"
    echo ""
    read -p "Why are you rolling back? (brief reason): " reason
    
    if [ -z "$reason" ]; then
        print_error "Rollback cancelled. Please provide a reason."
        exit 1
    fi
    
    if [ "$env" == "production" ]; then
        read -p "Type 'ROLLBACK' to confirm production rollback: " confirm
        if [ "$confirm" != "ROLLBACK" ]; then
            print_error "Rollback cancelled."
            exit 1
        fi
    fi
    
    # Perform rollback
    rollback_flow "$env" "$archived_file"
    
    # Update Git commit message with reason
    cd "$FLOWS_DIR"
    git commit --amend -m "$(git log -1 --pretty=%B | sed "s/Reason: \[Add reason for rollback\]/Reason: $reason/")"
    
    echo ""
    print_success "Rollback complete with reason documented!"
}

# Run main function
main "$@"
