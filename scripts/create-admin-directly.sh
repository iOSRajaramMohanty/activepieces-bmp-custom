#!/bin/bash

# Direct admin creation script (bypasses invitation system)
# Creates admin users directly in database with proper setup

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

DB_HOST="${AP_POSTGRES_HOST:-localhost}"
DB_PORT="${AP_POSTGRES_PORT:-5433}"
DB_NAME="${AP_POSTGRES_DATABASE:-activepieces}"
DB_USER="${AP_POSTGRES_USERNAME:-postgres}"
DB_PASS="${AP_POSTGRES_PASSWORD:-}"

print_info() { echo -e "${BLUE}ℹ${NC}  $1"; }
print_success() { echo -e "${GREEN}✓${NC}  $1"; }
print_error() { echo -e "${RED}✗${NC}  $1"; }

if [ -z "$DB_PASS" ]; then
    print_error "Database password required. Run: source .env"
    exit 1
fi

# Get original admin's password hash
ORIGINAL_EMAIL="abc_admin@demo.com"
print_info "Getting password hash from $ORIGINAL_EMAIL..."

PASSWORD_HASH=$(PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "
    SELECT ui.password
    FROM \"user\" u
    JOIN user_identity ui ON u.\"identityId\" = ui.id
    WHERE ui.email = '$ORIGINAL_EMAIL'
    LIMIT 1;
" | tr -d ' ' | tr -d '\n')

if [ -z "$PASSWORD_HASH" ]; then
    print_error "Could not get password hash"
    exit 1
fi

print_success "Password hash retrieved"

# Get platform ID
PLATFORM_ID=$(PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "
    SELECT \"platformId\"
    FROM \"user\"
    WHERE \"identityId\" IN (
        SELECT id FROM user_identity WHERE email = '$ORIGINAL_EMAIL'
    )
    LIMIT 1;
" | tr -d ' ' | tr -d '\n')

print_info "Platform ID: $PLATFORM_ID"

# Function to create admin user directly
create_admin_direct() {
    local email=$1
    local env_name=$2
    
    print_info "Creating $email ($env_name)..."
    
    # Generate IDs
    local user_id=$(cat /dev/urandom | LC_ALL=C tr -dc 'a-zA-Z0-9' | fold -w 21 | head -n 1)
    local identity_id=$(cat /dev/urandom | LC_ALL=C tr -dc 'a-zA-Z0-9' | fold -w 21 | head -n 1)
    local project_id=$(cat /dev/urandom | LC_ALL=C tr -dc 'a-zA-Z0-9' | fold -w 21 | head -n 1)
    local token_version=$(cat /dev/urandom | LC_ALL=C tr -dc 'a-zA-Z0-9' | fold -w 21 | head -n 1)
    
    # Create user_identity
    PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
        INSERT INTO user_identity (id, email, password, \"emailVerified\")
        VALUES ('$identity_id', '$email', '$PASSWORD_HASH', true);
    " > /dev/null 2>&1
    
    # Create user
    PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
        INSERT INTO \"user\" (id, status, \"platformId\", \"platformRole\", \"identityId\", \"tokenVersion\")
        VALUES ('$user_id', 'ACTIVE', '$PLATFORM_ID', 'ADMIN', '$identity_id', '$token_version');
    " > /dev/null 2>&1
    
    # Create personal project
    PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
        INSERT INTO project (id, \"ownerId\", \"displayName\", \"platformId\", type)
        VALUES ('$project_id', '$user_id', '$email''s Project', '$PLATFORM_ID', 'PERSONAL');
    " > /dev/null 2>&1
    
    print_success "Created $email"
    echo "  User ID: $user_id"
    echo "  Project ID: $project_id"
    echo "  Password: Same as $ORIGINAL_EMAIL"
}

# Create all 3 admins
echo ""
create_admin_direct "abc-dev@demo.com" "Development"
echo ""
create_admin_direct "abc-staging@demo.com" "Staging"
echo ""
create_admin_direct "abc-production@demo.com" "Production"
echo ""

print_success "All 3 environment admins created!"
print_info "You can now log in with:"
echo "  - abc-dev@demo.com (password: same as abc_admin@demo.com)"
echo "  - abc-staging@demo.com (password: same as abc_admin@demo.com)"
echo "  - abc-production@demo.com (password: same as abc_admin@demo.com)"
