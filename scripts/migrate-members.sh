#!/bin/bash

# ============================================
# Migrate Members Script
# ============================================
# Migrates operators/members from original admin's project to new dev project
#
# Usage: ./migrate-members.sh <original-admin-email> <target-admin-email>
# Example: ./migrate-members.sh abc_admin@demo.com abc-dev@demo.com
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
API_URL="${ACTIVEPIECES_URL:-http://localhost:4200}"
TARGET_ADMIN_TOKEN="${TARGET_ADMIN_TOKEN:-}"
DB_HOST="${AP_POSTGRES_HOST:-localhost}"
DB_PORT="${AP_POSTGRES_PORT:-5433}"
DB_NAME="${AP_POSTGRES_DATABASE:-activepieces}"
DB_USER="${AP_POSTGRES_USERNAME:-postgres}"
DB_PASS="${AP_POSTGRES_PASSWORD:-}"

print_info() {
    echo -e "${BLUE}ℹ${NC}  $1"
}

print_success() {
    echo -e "${GREEN}✓${NC}  $1"
}

print_error() {
    echo -e "${RED}✗${NC}  $1"
}

print_step() {
    echo -e "${CYAN}▶${NC}  $1"
}

execute_sql() {
    local query=$1
    PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "$query" 2>/dev/null || echo ""
}

get_project_id() {
    local admin_email=$1
    execute_sql "
        SELECT p.id
        FROM project p
        JOIN \"user\" u ON p.\"ownerId\" = u.id
        JOIN user_identity ui ON u.\"identityId\" = ui.id
        WHERE ui.email = '$admin_email' AND u.\"platformRole\" = 'ADMIN'
        LIMIT 1;
    " | tr -d ' '
}

get_members() {
    local project_id=$1
    execute_sql "
        SELECT 
            ui.email,
            u.\"platformRole\",
            pr.name as role_name
        FROM project_member pm
        JOIN \"user\" u ON pm.\"userId\" = u.id
        JOIN user_identity ui ON u.\"identityId\" = ui.id
        JOIN project_role pr ON pm.\"projectRoleId\" = pr.id
        WHERE pm.\"projectId\" = '$project_id'
          AND u.\"platformRole\" IN ('MEMBER', 'OPERATOR')
        ORDER BY u.\"platformRole\", ui.email;
    "
}

main() {
    echo ""
    print_info "Migrate Members Script"
    echo ""
    
    if [ $# -lt 2 ]; then
        echo "Usage: $0 <original-admin-email> <target-admin-email>"
        echo ""
        echo "Example:"
        echo "  $0 abc_admin@demo.com abc-dev@demo.com"
        exit 1
    fi
    
    local original_email=$1
    local target_email=$2
    
    # Check database password
    if [ -z "$DB_PASS" ]; then
        print_error "Database password required"
        print_info "Run: source .env"
        exit 1
    fi
    
    print_step "Getting project IDs..."
    
    original_project=$(get_project_id "$original_email")
    target_project=$(get_project_id "$target_email")
    
    if [ -z "$original_project" ]; then
        print_error "Could not find project for: $original_email"
        exit 1
    fi
    
    if [ -z "$target_project" ]; then
        print_error "Could not find project for: $target_email"
        exit 1
    fi
    
    print_success "Original project: $original_project"
    print_success "Target project: $target_project"
    echo ""
    
    print_step "Fetching members..."
    members=$(get_members "$original_project")
    
    if [ -z "$members" ]; then
        print_warning "No members found in original project"
        exit 0
    fi
    
    member_count=$(echo "$members" | wc -l | tr -d ' ')
    print_success "Found $member_count member(s)"
    echo "$members" | while read -r line; do
        email=$(echo "$line" | awk '{print $1}' | tr -d ' ')
        role=$(echo "$line" | awk '{print $2}' | tr -d ' ')
        print_info "  - $email ($role)"
    done
    echo ""
    
    print_step "Migrating members to target project..."
    echo ""
    
    # Update project_member records
    result=$(execute_sql "
        UPDATE project_member
        SET \"projectId\" = '$target_project'
        WHERE \"projectId\" = '$original_project'
          AND \"userId\" IN (
              SELECT u.id
              FROM \"user\" u
              WHERE u.\"platformRole\" IN ('MEMBER', 'OPERATOR')
          );
    ")
    
    print_success "Migration complete!"
    print_info "$member_count member(s) moved to: $target_email's project"
    echo ""
    
    print_info "Verify:"
    echo "  1. Log in as: $target_email"
    echo "  2. Go to Platform → Users"
    echo "  3. You should see all migrated members"
    echo ""
}

main "$@"
