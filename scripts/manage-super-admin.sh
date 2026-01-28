#!/bin/bash
# Super Admin Management Script
# Creates, promotes, and manages super admin accounts

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Database connection details
DB_HOST="localhost"
DB_PORT="5433"
DB_NAME="activepieces"
DB_USER="postgres"
DB_PASSWORD="A79Vm5D4p2VQHOp2gd5"

# API URL
API_URL="http://localhost:4200"

# Function to execute SQL
run_sql() {
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "$1"
}

# Function to execute SQL with output
run_sql_output() {
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "$1"
}

# Function to show menu
show_menu() {
    echo ""
    echo -e "${CYAN}════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}     SUPER ADMIN MANAGEMENT SCRIPT${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${GREEN}1.${NC} Create New Super Admin (Sign up + Promote)"
    echo -e "${GREEN}2.${NC} Promote Existing User to Super Admin"
    echo -e "${GREEN}3.${NC} List All Super Admins"
    echo -e "${GREEN}4.${NC} View Super Admin Details"
    echo -e "${GREEN}5.${NC} Demote Super Admin to Admin"
    echo -e "${GREEN}6.${NC} Check Super Admin Access"
    echo -e "${GREEN}7.${NC} Exit"
    echo ""
    echo -e "${CYAN}════════════════════════════════════════════════════════${NC}"
    echo ""
}

# Function 1: Create new super admin
create_super_admin() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  CREATE NEW SUPER ADMIN${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    read -p "Enter email: " email
    read -sp "Enter password: " password
    echo ""
    read -p "Enter first name: " firstName
    read -p "Enter last name: " lastName
    
    echo ""
    echo -e "${YELLOW}Creating account via API...${NC}"
    
    # Create account via signup API
    response=$(curl -s -X POST "$API_URL/api/v1/authentication/sign-up" \
      -H "Content-Type: application/json" \
      -d "{
        \"email\": \"$email\",
        \"password\": \"$password\",
        \"firstName\": \"$firstName\",
        \"lastName\": \"$lastName\",
        \"trackEvents\": false,
        \"newsLetter\": false
      }")
    
    # Check if signup was successful
    if echo "$response" | grep -q "email"; then
        echo -e "${GREEN}✅ Account created successfully!${NC}"
        
        # Wait a moment for DB to sync
        sleep 2
        
        # Promote to super admin
        echo -e "${YELLOW}Promoting to SUPER_ADMIN...${NC}"
        
        run_sql "UPDATE \"user\" SET \"platformRole\" = 'SUPER_ADMIN' WHERE \"identityId\" = (SELECT id FROM user_identity WHERE email = '$email');"
        
        # Verify
        role=$(run_sql "SELECT u.\"platformRole\" FROM \"user\" u JOIN user_identity ui ON u.\"identityId\" = ui.id WHERE ui.email = '$email';")
        
        if echo "$role" | grep -q "SUPER_ADMIN"; then
            echo ""
            echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
            echo -e "${GREEN}║           ✅ SUPER ADMIN CREATED!                     ║${NC}"
            echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
            echo ""
            echo -e "${CYAN}Credentials:${NC}"
            echo "  Email:    $email"
            echo "  Password: (as entered)"
            echo "  Role:     SUPER_ADMIN"
            echo ""
            echo -e "${CYAN}Access:${NC}"
            echo "  Local:    http://localhost:4200"
            echo "  Docker:   http://localhost:8080"
            echo ""
            echo -e "${YELLOW}Note: This super admin has the SAME access as all other super admins.${NC}"
            echo -e "${YELLOW}      They can access ALL platforms and ALL data.${NC}"
        else
            echo -e "${RED}❌ Failed to promote user to SUPER_ADMIN${NC}"
        fi
    else
        echo -e "${RED}❌ Failed to create account${NC}"
        echo "Response: $response"
    fi
}

# Function 2: Promote existing user
promote_user() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  PROMOTE EXISTING USER TO SUPER ADMIN${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    read -p "Enter user email: " email
    
    # Check if user exists
    user_exists=$(run_sql "SELECT COUNT(*) FROM user_identity WHERE email = '$email';")
    
    if [ "$user_exists" -eq 0 ]; then
        echo -e "${RED}❌ User not found: $email${NC}"
        return
    fi
    
    # Get current role
    current_role=$(run_sql "SELECT u.\"platformRole\" FROM \"user\" u JOIN user_identity ui ON u.\"identityId\" = ui.id WHERE ui.email = '$email';")
    current_role=$(echo "$current_role" | xargs)
    
    echo ""
    echo -e "${CYAN}Current role:${NC} $current_role"
    echo ""
    
    if [ "$current_role" = "SUPER_ADMIN" ]; then
        echo -e "${YELLOW}⚠️  User is already a SUPER_ADMIN${NC}"
        return
    fi
    
    read -p "Are you sure you want to promote this user to SUPER_ADMIN? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        echo -e "${YELLOW}Cancelled.${NC}"
        return
    fi
    
    # Promote user
    run_sql "UPDATE \"user\" SET \"platformRole\" = 'SUPER_ADMIN' WHERE \"identityId\" = (SELECT id FROM user_identity WHERE email = '$email');"
    
    # Verify
    new_role=$(run_sql "SELECT u.\"platformRole\" FROM \"user\" u JOIN user_identity ui ON u.\"identityId\" = ui.id WHERE ui.email = '$email';")
    new_role=$(echo "$new_role" | xargs)
    
    if [ "$new_role" = "SUPER_ADMIN" ]; then
        echo ""
        echo -e "${GREEN}✅ User promoted to SUPER_ADMIN successfully!${NC}"
        echo ""
        echo -e "${CYAN}User:${NC} $email"
        echo -e "${CYAN}New Role:${NC} SUPER_ADMIN"
        echo ""
        echo -e "${YELLOW}Note: This super admin now has FULL access to ALL platforms and data.${NC}"
    else
        echo -e "${RED}❌ Failed to promote user${NC}"
    fi
}

# Function 3: List all super admins
list_super_admins() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  ALL SUPER ADMIN ACCOUNTS${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    run_sql_output "
    SELECT 
        u.id as user_id,
        ui.email,
        u.\"platformRole\" as role,
        u.status,
        u.created::date as created_date
    FROM \"user\" u 
    JOIN user_identity ui ON u.\"identityId\" = ui.id 
    WHERE u.\"platformRole\" = 'SUPER_ADMIN'
    ORDER BY u.created DESC;
    "
    
    # Count
    count=$(run_sql "SELECT COUNT(*) FROM \"user\" WHERE \"platformRole\" = 'SUPER_ADMIN';")
    echo ""
    echo -e "${CYAN}Total Super Admins:${NC} $count"
    echo ""
    echo -e "${YELLOW}Note: All super admins have IDENTICAL access to ALL platforms.${NC}"
}

# Function 4: View super admin details
view_details() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  SUPER ADMIN DETAILS${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    read -p "Enter super admin email: " email
    
    echo ""
    echo -e "${CYAN}User Information:${NC}"
    run_sql_output "
    SELECT 
        u.id,
        ui.email,
        u.\"firstName\" || ' ' || u.\"lastName\" as full_name,
        u.\"platformRole\",
        u.status,
        u.created::date as created_date,
        u.updated::date as updated_date
    FROM \"user\" u 
    JOIN user_identity ui ON u.\"identityId\" = ui.id 
    WHERE ui.email = '$email';
    "
    
    echo ""
    echo -e "${CYAN}Super Admin Permissions:${NC}"
    echo "  ✅ Access ALL platforms (tenants)"
    echo "  ✅ View ALL users across all platforms"
    echo "  ✅ View ALL projects across all platforms"
    echo "  ✅ Access super admin dashboard"
    echo "  ✅ Manage ALL tenant data"
    echo "  ✅ Same access as ALL other super admins"
}

# Function 5: Demote super admin
demote_super_admin() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  DEMOTE SUPER ADMIN TO ADMIN${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    read -p "Enter super admin email to demote: " email
    
    # Check current role
    current_role=$(run_sql "SELECT u.\"platformRole\" FROM \"user\" u JOIN user_identity ui ON u.\"identityId\" = ui.id WHERE ui.email = '$email';")
    current_role=$(echo "$current_role" | xargs)
    
    if [ "$current_role" != "SUPER_ADMIN" ]; then
        echo -e "${RED}❌ User is not a SUPER_ADMIN${NC}"
        return
    fi
    
    echo -e "${YELLOW}⚠️  WARNING: This will remove SUPER_ADMIN privileges!${NC}"
    read -p "Are you sure? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        echo -e "${YELLOW}Cancelled.${NC}"
        return
    fi
    
    # Demote to ADMIN
    run_sql "UPDATE \"user\" SET \"platformRole\" = 'ADMIN' WHERE \"identityId\" = (SELECT id FROM user_identity WHERE email = '$email');"
    
    echo -e "${GREEN}✅ User demoted to ADMIN${NC}"
}

# Function 6: Check super admin access
check_access() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  SUPER ADMIN ACCESS CHECK${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    echo -e "${CYAN}System Statistics:${NC}"
    run_sql_output "
    SELECT 
        (SELECT COUNT(*) FROM \"user\" WHERE \"platformRole\" = 'SUPER_ADMIN') as super_admins,
        (SELECT COUNT(*) FROM platform) as total_platforms,
        (SELECT COUNT(*) FROM \"user\") as total_users,
        (SELECT COUNT(*) FROM project WHERE deleted IS NULL) as total_projects;
    "
    
    echo ""
    echo -e "${CYAN}Super Admin Capabilities:${NC}"
    echo "  ✅ ALL super admins can access ALL platforms"
    echo "  ✅ ALL super admins can view ALL users"
    echo "  ✅ ALL super admins can view ALL projects"
    echo "  ✅ ALL super admins have IDENTICAL permissions"
    echo "  ✅ Super admins are NOT tied to any specific platform"
    echo "  ✅ Super admins have platform-level access (highest)"
}

# Main loop
while true; do
    show_menu
    read -p "Select option (1-7): " choice
    
    case $choice in
        1)
            create_super_admin
            ;;
        2)
            promote_user
            ;;
        3)
            list_super_admins
            ;;
        4)
            view_details
            ;;
        5)
            demote_super_admin
            ;;
        6)
            check_access
            ;;
        7)
            echo ""
            echo -e "${GREEN}Goodbye!${NC}"
            echo ""
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid option. Please select 1-7.${NC}"
            ;;
    esac
    
    echo ""
    read -p "Press Enter to continue..."
done
