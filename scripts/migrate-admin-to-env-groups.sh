#!/bin/bash

# ============================================
# Migrate Admin to Environment Groups Script
# ============================================
# Migrates existing ADMIN (sub-owner) accounts to environment-based structure
# Creates 3 new ADMIN accounts (dev, staging, production) with SAME password
# Migrates existing operators/members to their admin's new environment structure
#
# Usage: ./migrate-admin-to-env-groups.sh <existing-admin-email>
# Example: ./migrate-admin-to-env-groups.sh abc_admin@demo.com
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
API_URL="${ACTIVEPIECES_URL:-http://localhost:4200}"
PLATFORM_OWNER_TOKEN="${PLATFORM_OWNER_TOKEN:-}"
DB_HOST="${AP_POSTGRES_HOST:-localhost}"
DB_PORT="${AP_POSTGRES_PORT:-5433}"
DB_NAME="${AP_POSTGRES_DATABASE:-activepieces}"
DB_USER="${AP_POSTGRES_USERNAME:-postgres}"
DB_PASS="${AP_POSTGRES_PASSWORD:-}"

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

print_step() {
    echo -e "${CYAN}▶${NC}  $1"
}

# Function to show usage
show_usage() {
    cat << EOF
${BLUE}Migrate Admin to Environment Groups Script${NC}

Migrates existing ADMIN (sub-owner) account to environment-based structure.
Creates 3 new ADMIN accounts (Dev, Staging, Production) with the SAME password.
Migrates existing operators/members to stay under their admin.

Usage:
  $0 <existing-admin-email>

Arguments:
  existing-admin-email   Email of the existing ADMIN to migrate

Examples:
  # Migrate abc_admin
  $0 abc_admin@demo.com
  
  # Creates:
  # - abc-dev@demo.com → Development Project
  # - abc-staging@demo.com → Staging Project
  # - abc-production@demo.com → Production Project
  # 
  # Migrates:
  # - abc_op@demo.com → Stays under abc-dev project

Environment Variables:
  ACTIVEPIECES_URL          API URL (default: http://localhost:4200)
  PLATFORM_OWNER_TOKEN      Platform Owner JWT token (required)
  AP_POSTGRES_HOST          Database host (default: localhost)
  AP_POSTGRES_PORT          Database port (default: 5433)
  AP_POSTGRES_DATABASE      Database name (default: activepieces)
  AP_POSTGRES_USERNAME      Database username (default: postgres)
  AP_POSTGRES_PASSWORD      Database password (required)

Setup:
  # Load environment variables
  source .env
  export PLATFORM_OWNER_TOKEN="your_jwt_token_here"
  
  # Run migration
  $0 abc_admin@demo.com

EOF
}

# Function to execute SQL query
execute_sql() {
    local query=$1
    PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "$query" 2>/dev/null || echo ""
}

# Function to get admin details
get_admin_details() {
    local admin_email=$1
    
    # Get user ID, password hash, and project details
    local result=$(execute_sql "
        SELECT 
            u.id,
            ui.password,
            p.id as project_id,
            p.\"displayName\" as project_name,
            u.\"platformId\"
        FROM \"user\" u
        JOIN user_identity ui ON u.\"identityId\" = ui.id
        LEFT JOIN project p ON p.\"ownerId\" = u.id
        WHERE ui.email = '$admin_email' AND u.\"platformRole\" = 'ADMIN'
        LIMIT 1;
    ")
    
    echo "$result"
}

# Function to get operators/members under admin
get_admin_members() {
    local project_id=$1
    
    local result=$(execute_sql "
        SELECT 
            ui.email,
            u.\"platformRole\",
            pm.\"projectRoleId\"
        FROM project_member pm
        JOIN \"user\" u ON pm.\"userId\" = u.id
        JOIN user_identity ui ON u.\"identityId\" = ui.id
        WHERE pm.\"projectId\" = '$project_id'
          AND u.\"platformRole\" IN ('MEMBER', 'OPERATOR')
        ORDER BY u.\"platformRole\", ui.email;
    ")
    
    echo "$result"
}

# Function to create admin user with specific password
create_admin_with_password() {
    local email=$1
    local password_hash=$2
    local group_name=$3
    local env_name=$4
    local platform_id=$5
    
    print_step "Creating ADMIN: $email ($env_name)"
    
    # Create invitation first
    local response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/v1/user-invitations" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $PLATFORM_OWNER_TOKEN" \
        -d "{
            \"email\": \"$email\",
            \"type\": \"PLATFORM\",
            \"platformRole\": \"ADMIN\"
        }")
    
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" == "201" ] || [ "$http_code" == "200" ]; then
        print_success "Invitation created for: $email"
        
        # Extract invitation token
        local invitation_link=$(echo "$body" | grep -o '"link":"[^"]*"' | head -1 | cut -d'"' -f4)
        
        # Save invitation for manual acceptance
        echo "$invitation_link" >> "/tmp/migration_invitations_$$.txt"
        
        # After user accepts invitation, we'll update password hash
        # Store the mapping for later
        echo "$email|$password_hash|$env_name" >> "/tmp/migration_password_map_$$.txt"
        
        return 0
    else
        print_error "Failed to create invitation for: $email"
        print_error "Response: $body"
        return 1
    fi
}

# Function to extract group name from email
extract_group_name() {
    local email=$1
    # Remove @domain and _admin suffix
    local name=$(echo "$email" | cut -d'@' -f1 | sed 's/_admin$//')
    echo "$name"
}

# Function to generate new admin emails
generate_admin_emails() {
    local original_email=$1
    local group_name=$2
    
    local domain="${original_email#*@}"
    
    DEV_EMAIL="${group_name}-dev@${domain}"
    STAGING_EMAIL="${group_name}-staging@${domain}"
    PRODUCTION_EMAIL="${group_name}-production@${domain}"
}

# Main migration function
main() {
    echo ""
    print_info "Admin to Environment Groups Migration Script"
    echo ""
    
    # Check arguments
    if [ $# -lt 1 ]; then
        show_usage
        exit 1
    fi
    
    local admin_email=$1
    
    # Validate email format
    if ! [[ "$admin_email" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
        print_error "Invalid email format: $admin_email"
        exit 1
    fi
    
    # Check for Platform Owner token
    if [ -z "$PLATFORM_OWNER_TOKEN" ]; then
        print_error "PLATFORM_OWNER_TOKEN environment variable is required"
        echo ""
        print_info "Run: export PLATFORM_OWNER_TOKEN=\"your_token_here\""
        exit 1
    fi
    
    # Check for database password
    if [ -z "$DB_PASS" ]; then
        print_error "Database password is required"
        print_info "Load from .env: source .env"
        print_info "Or set: export AP_POSTGRES_PASSWORD=\"your_password\""
        exit 1
    fi
    
    # Get admin details from database
    print_step "Fetching admin details from database..."
    admin_details=$(get_admin_details "$admin_email")
    
    if [ -z "$admin_details" ]; then
        print_error "Admin not found: $admin_email"
        print_info "Make sure the email is correct and user has ADMIN role"
        exit 1
    fi
    
    # Parse admin details
    ADMIN_ID=$(echo "$admin_details" | awk '{print $1}' | tr -d ' ')
    PASSWORD_HASH=$(echo "$admin_details" | awk '{print $2}' | tr -d ' ')
    PROJECT_ID=$(echo "$admin_details" | awk '{print $3}' | tr -d ' ')
    PROJECT_NAME=$(echo "$admin_details" | awk '{print $4}' | tr -d ' ')
    PLATFORM_ID=$(echo "$admin_details" | awk '{print $5}' | tr -d ' ')
    
    print_success "Found admin: $admin_email"
    print_info "User ID: $ADMIN_ID"
    print_info "Project: $PROJECT_NAME"
    print_info "Project ID: $PROJECT_ID"
    
    # Get operators/members
    print_step "Fetching operators/members..."
    members=$(get_admin_members "$PROJECT_ID")
    
    if [ -z "$members" ]; then
        print_warning "No operators/members found for this admin"
        member_count=0
    else
        member_count=$(echo "$members" | wc -l | tr -d ' ')
        print_success "Found $member_count operator(s)/member(s)"
        echo "$members" | while read -r line; do
            member_email=$(echo "$line" | awk '{print $1}' | tr -d ' ')
            member_role=$(echo "$line" | awk '{print $2}' | tr -d ' ')
            print_info "  - $member_email ($member_role)"
        done
    fi
    
    # Extract group name
    GROUP_NAME=$(extract_group_name "$admin_email")
    print_info "Group name: $GROUP_NAME"
    
    # Generate new admin emails
    generate_admin_emails "$admin_email" "$GROUP_NAME"
    
    echo ""
    print_info "Migration Plan:"
    echo ""
    print_info "Original Admin: $admin_email"
    print_info "Group Name: $GROUP_NAME"
    echo ""
    print_info "Will create 3 new ADMIN accounts:"
    echo "  1. $DEV_EMAIL → Development Project"
    echo "  2. $STAGING_EMAIL → Staging Project"
    echo "  3. $PRODUCTION_EMAIL → Production Project"
    echo ""
    print_info "Password: ${CYAN}SAME as original admin${NC} (auto-copied)"
    echo ""
    
    if [ $member_count -gt 0 ]; then
        print_info "Will migrate $member_count operator(s)/member(s) to Development project"
        echo "$members" | while read -r line; do
            member_email=$(echo "$line" | awk '{print $1}' | tr -d ' ')
            echo "  - $member_email"
        done
        echo ""
    fi
    
    print_warning "Original admin account will remain unchanged (you can delete it later)"
    echo ""
    
    # Confirm
    read -p "Continue with migration? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        print_warning "Migration cancelled"
        exit 0
    fi
    
    echo ""
    print_step "Starting migration..."
    echo ""
    
    # Create temporary files
    rm -f "/tmp/migration_invitations_$$.txt"
    rm -f "/tmp/migration_password_map_$$.txt"
    rm -f "/tmp/migration_members_$$.txt"
    touch "/tmp/migration_invitations_$$.txt"
    touch "/tmp/migration_password_map_$$.txt"
    
    # Save member details for later migration
    echo "$members" > "/tmp/migration_members_$$.txt"
    
    # Create 3 new admin accounts
    local success_count=0
    
    if create_admin_with_password "$DEV_EMAIL" "$PASSWORD_HASH" "$GROUP_NAME" "Development" "$PLATFORM_ID"; then
        ((success_count++))
    fi
    echo ""
    
    if create_admin_with_password "$STAGING_EMAIL" "$PASSWORD_HASH" "$GROUP_NAME" "Staging" "$PLATFORM_ID"; then
        ((success_count++))
    fi
    echo ""
    
    if create_admin_with_password "$PRODUCTION_EMAIL" "$PASSWORD_HASH" "$GROUP_NAME" "Production" "$PLATFORM_ID"; then
        ((success_count++))
    fi
    echo ""
    
    # Summary
    if [ $success_count -eq 3 ]; then
        print_success "All 3 environment ADMIN accounts created!"
        echo ""
        print_info "==================== IMPORTANT NEXT STEPS ===================="
        echo ""
        print_info "Step 1: Accept Invitations"
        echo "  The following invitation links were created:"
        echo ""
        cat "/tmp/migration_invitations_$$.txt"
        echo ""
        print_info "  Open each link and complete the signup process"
        print_info "  You can use ANY password (will be updated in Step 2)"
        echo ""
        
        print_info "Step 2: Update Passwords (AFTER accepting invitations)"
        echo "  Run this SQL script to sync passwords:"
        echo ""
        echo "  ${CYAN}./scripts/sync-migrated-passwords.sh $admin_email${NC}"
        echo ""
        print_info "  This will copy the original admin's password to all 3 new accounts"
        echo ""
        
        if [ $member_count -gt 0 ]; then
            print_info "Step 3: Migrate Operators/Members"
            echo "  Run this script to move operators/members:"
            echo ""
            echo "  ${CYAN}./scripts/migrate-members.sh $admin_email $DEV_EMAIL${NC}"
            echo ""
            print_info "  This will move all operators/members to the Development project"
            echo ""
        fi
        
        print_info "Step 4: Verify"
        echo "  1. Log in as Platform Owner"
        echo "  2. Check Owner Dashboard"
        echo "  3. You should see 3 new projects:"
        echo "     - $DEV_EMAIL's Project"
        echo "     - $STAGING_EMAIL's Project"
        echo "     - $PRODUCTION_EMAIL's Project"
        echo ""
        
        print_info "Step 5: Configure Connections"
        echo "  For each project, create environment-specific connections:"
        echo "  - Development: ADA BMP - Dev, Slack - Dev, etc."
        echo "  - Staging: ADA BMP - Staging, Slack - Staging, etc."
        echo "  - Production: ADA BMP - Production, Slack - Production, etc."
        echo ""
        
        print_warning "Original admin ($admin_email) is still active"
        print_info "You can delete it manually after verifying the migration"
        echo ""
        print_info "============================================================="
        echo ""
        
        # Save migration summary
        local summary_file="migration_summary_${GROUP_NAME}_$(date +%Y%m%d_%H%M%S).txt"
        cat > "$summary_file" << SUMMARY
Migration Summary: $GROUP_NAME
Date: $(date)
================================================================================

Original Admin: $admin_email
Group Name: $GROUP_NAME

New Environment Admins:
1. Development: $DEV_EMAIL
2. Staging: $STAGING_EMAIL
3. Production: $PRODUCTION_EMAIL

Password: Same as original admin (will be synced after acceptance)

Operators/Members to Migrate ($member_count):
$members

Next Steps:
1. Accept invitations (links above)
2. Run: ./scripts/sync-migrated-passwords.sh $admin_email
3. Run: ./scripts/migrate-members.sh $admin_email $DEV_EMAIL
4. Verify in Owner Dashboard
5. Configure environment-specific connections

Invitation Links:
$(cat "/tmp/migration_invitations_$$.txt")

================================================================================
SUMMARY
        
        print_success "Migration summary saved to: $summary_file"
        
    else
        print_error "Only $success_count out of 3 admins were created"
        print_warning "Check errors above and try again"
        exit 1
    fi
    
    # Cleanup temp files
    rm -f "/tmp/migration_invitations_$$.txt"
    # Keep password map and members for helper scripts
}

# Run main function
main "$@"
