#!/bin/bash

# ============================================
# Create Admin Group Script
# ============================================
# Creates 3 ADMIN users (Dev, Staging, Production) for a sub-owner
# Each ADMIN automatically gets a PERSONAL project
# Usage: ./create-admin-group.sh <admin-name> <base-email>
# Example: ./create-admin-group.sh "john-doe" "john.doe@company.com"
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_URL="${ACTIVEPIECES_URL:-http://localhost:4200}"
PLATFORM_OWNER_TOKEN="${PLATFORM_OWNER_TOKEN:-}"

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
${BLUE}Create Admin Group Script${NC}

Creates 3 ADMIN users (Development, Staging, Production) for a sub-owner.
Each ADMIN automatically gets a PERSONAL project.

Usage:
  $0 <admin-name> <base-email>

Arguments:
  admin-name   Name identifier for the admin group (e.g., "john-doe", "team-a")
  base-email   Base email address (will create 3 variations)

Examples:
  # Create for John Doe
  $0 john-doe john.doe@company.com
  
  # Creates:
  # - john-doe-dev@company.com → Development Project
  # - john-doe-staging@company.com → Staging Project
  # - john-doe-production@company.com → Production Project

  # Create for Team A
  $0 team-a team-a@company.com
  
  # Creates:
  # - team-a-dev@company.com → Development Project
  # - team-a-staging@company.com → Staging Project
  # - team-a-production@company.com → Production Project

Environment Variables:
  ACTIVEPIECES_URL          API URL (default: http://localhost:4200)
  PLATFORM_OWNER_TOKEN      Platform Owner JWT token (required)

Setup:
  # Get your Platform Owner token:
  1. Log in to Activepieces as Platform Owner
  2. Open browser DevTools (F12)
  3. Go to Application → Local Storage
  4. Copy the JWT token value
  
  # Set token:
  export PLATFORM_OWNER_TOKEN="your_jwt_token_here"
  
  # Or pass inline:
  PLATFORM_OWNER_TOKEN="token" $0 john-doe john.doe@company.com

EOF
}

# Function to create admin user via API
create_admin_user() {
    local email=$1
    local env_name=$2
    
    print_info "Creating ADMIN user: $email ($env_name)"
    
    # Prepare API request
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
        # Extract invitation link
        local invitation_id=$(echo "$body" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
        local invitation_link="$API_URL/invitation?token=INVITATION_TOKEN&email=$email"
        
        print_success "Created: $email"
        print_info "Environment: $env_name"
        
        # Parse and show invitation details
        if [ -n "$invitation_id" ]; then
            print_info "Invitation ID: $invitation_id"
        fi
        
        echo "$body" | grep -o '"link":"[^"]*"' | head -1 | cut -d'"' -f4 >> "/tmp/admin_group_invitations_$$.txt"
        
        return 0
    else
        print_error "Failed to create user: $email"
        print_error "HTTP Code: $http_code"
        print_error "Response: $body"
        return 1
    fi
}

# Function to generate email variations
generate_emails() {
    local base_email=$1
    local admin_name=$2
    
    # Extract username and domain from base email
    local username="${base_email%@*}"
    local domain="${base_email#*@}"
    
    # Generate 3 email variations
    DEV_EMAIL="${admin_name}-dev@${domain}"
    STAGING_EMAIL="${admin_name}-staging@${domain}"
    PRODUCTION_EMAIL="${admin_name}-production@${domain}"
    
    # Alternative format if base email is provided differently
    # E.g., john.doe@company.com → john.doe+dev@company.com
    if [[ "$base_email" =~ ^[^@]+@(gmail\.com|googlemail\.com)$ ]]; then
        print_info "Gmail detected - using + alias format"
        DEV_EMAIL="${username}+dev@${domain}"
        STAGING_EMAIL="${username}+staging@${domain}"
        PRODUCTION_EMAIL="${username}+production@${domain}"
    fi
}

# Main script
main() {
    echo ""
    print_info "Admin Group Creation Script"
    echo ""
    
    # Check arguments
    if [ $# -lt 2 ]; then
        show_usage
        exit 1
    fi
    
    local admin_name=$1
    local base_email=$2
    
    # Validate email format
    if ! [[ "$base_email" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
        print_error "Invalid email format: $base_email"
        exit 1
    fi
    
    # Check for Platform Owner token
    if [ -z "$PLATFORM_OWNER_TOKEN" ]; then
        print_error "PLATFORM_OWNER_TOKEN environment variable is required"
        echo ""
        print_info "How to get your token:"
        echo "  1. Log in to Activepieces as Platform Owner"
        echo "  2. Open browser DevTools (F12)"
        echo "  3. Go to Application → Local Storage"
        echo "  4. Copy the JWT token value"
        echo "  5. Run: export PLATFORM_OWNER_TOKEN=\"your_token_here\""
        echo ""
        exit 1
    fi
    
    # Generate email variations
    generate_emails "$base_email" "$admin_name"
    
    # Show summary
    print_info "Admin Group: $admin_name"
    print_info "Base Email: $base_email"
    echo ""
    print_info "Will create 3 ADMIN users:"
    echo "  1. $DEV_EMAIL → Development Project"
    echo "  2. $STAGING_EMAIL → Staging Project"
    echo "  3. $PRODUCTION_EMAIL → Production Project"
    echo ""
    
    # Confirm
    read -p "Continue? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        print_warning "Cancelled by user"
        exit 0
    fi
    
    echo ""
    print_info "Creating admin group..."
    echo ""
    
    # Create temporary file for invitation links
    rm -f "/tmp/admin_group_invitations_$$.txt"
    touch "/tmp/admin_group_invitations_$$.txt"
    
    # Create each admin user
    local success_count=0
    
    if create_admin_user "$DEV_EMAIL" "Development"; then
        ((success_count++))
    fi
    echo ""
    
    if create_admin_user "$STAGING_EMAIL" "Staging"; then
        ((success_count++))
    fi
    echo ""
    
    if create_admin_user "$PRODUCTION_EMAIL" "Production"; then
        ((success_count++))
    fi
    echo ""
    
    # Summary
    if [ $success_count -eq 3 ]; then
        print_success "All 3 ADMIN users created successfully!"
        echo ""
        print_info "Next Steps:"
        echo "  1. Accept each invitation to activate the accounts"
        echo "  2. Each admin will automatically get a PERSONAL project"
        echo "  3. Log in as Platform Owner to see all 3 projects"
        echo ""
        print_info "Invitation Links:"
        if [ -s "/tmp/admin_group_invitations_$$.txt" ]; then
            cat "/tmp/admin_group_invitations_$$.txt"
        else
            print_warning "Check your Activepieces UI for invitation links"
            echo "  Owner Dashboard → Users → Copy invitation links"
        fi
        echo ""
        print_info "Save this information:"
        echo ""
        echo "Admin Group: $admin_name"
        echo "─────────────────────────────────────"
        echo "Development:"
        echo "  Email: $DEV_EMAIL"
        echo "  Role: ADMIN"
        echo "  Project: Auto-created (PERSONAL)"
        echo ""
        echo "Staging:"
        echo "  Email: $STAGING_EMAIL"
        echo "  Role: ADMIN"
        echo "  Project: Auto-created (PERSONAL)"
        echo ""
        echo "Production:"
        echo "  Email: $PRODUCTION_EMAIL"
        echo "  Role: ADMIN"
        echo "  Project: Auto-created (PERSONAL)"
        echo ""
    else
        print_error "Only $success_count out of 3 admins were created"
        print_warning "Check errors above and try again"
        exit 1
    fi
    
    # Cleanup
    rm -f "/tmp/admin_group_invitations_$$.txt"
}

# Run main function
main "$@"
