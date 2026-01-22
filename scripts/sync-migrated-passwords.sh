#!/bin/bash

# ============================================
# Sync Migrated Passwords Script
# ============================================
# Copies password hash from original admin to the 3 new environment admins
# Run AFTER accepting all invitations
#
# Usage: ./sync-migrated-passwords.sh <original-admin-email>
# Example: ./sync-migrated-passwords.sh abc_admin@demo.com
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
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

execute_sql() {
    local query=$1
    PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "$query" 2>/dev/null || echo ""
}

extract_group_name() {
    local email=$1
    echo "$email" | cut -d'@' -f1 | sed 's/_admin$//'
}

main() {
    echo ""
    print_info "Sync Migrated Passwords Script"
    echo ""
    
    if [ $# -lt 1 ]; then
        echo "Usage: $0 <original-admin-email>"
        exit 1
    fi
    
    local original_email=$1
    local domain="${original_email#*@}"
    local group_name=$(extract_group_name "$original_email")
    
    local dev_email="${group_name}-dev@${domain}"
    local staging_email="${group_name}-staging@${domain}"
    local production_email="${group_name}-production@${domain}"
    
    # Check database password
    if [ -z "$DB_PASS" ]; then
        print_error "Database password required"
        print_info "Run: source .env"
        exit 1
    fi
    
    print_info "Original admin: $original_email"
    print_info "Target admins:"
    echo "  - $dev_email"
    echo "  - $staging_email"
    echo "  - $production_email"
    echo ""
    
    # Get original password hash
    print_info "Fetching password hash..."
    password_hash=$(execute_sql "
        SELECT ui.password
        FROM \"user\" u
        JOIN user_identity ui ON u.\"identityId\" = ui.id
        WHERE ui.email = '$original_email' AND u.\"platformRole\" = 'ADMIN'
        LIMIT 1;
    " | tr -d ' ')
    
    if [ -z "$password_hash" ]; then
        print_error "Could not fetch password hash for: $original_email"
        exit 1
    fi
    
    print_success "Password hash retrieved"
    echo ""
    
    # Update each new admin's password
    local updated=0
    
    for email in "$dev_email" "$staging_email" "$production_email"; do
        print_info "Updating password for: $email"
        
        result=$(execute_sql "
            UPDATE user_identity
            SET password = '$password_hash'
            WHERE id IN (
                SELECT u.\"identityId\"
                FROM \"user\" u
                JOIN user_identity ui ON u.\"identityId\" = ui.id
                WHERE ui.email = '$email' AND u.\"platformRole\" = 'ADMIN'
            );
        ")
        
        print_success "Updated: $email"
        ((updated++))
    done
    
    echo ""
    print_success "Password sync complete! $updated accounts updated"
    print_info "All environment admins now have the SAME password as: $original_email"
    echo ""
}

main "$@"
