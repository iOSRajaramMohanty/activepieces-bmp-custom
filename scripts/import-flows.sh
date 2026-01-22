#!/bin/bash

# ============================================
# Flow Import Script
# ============================================
# Imports all flows from backup directory to a project
# Usage: ./import-flows.sh <email> <password> <backup_dir>
# ============================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

API_URL="${ACTIVEPIECES_URL:-http://localhost:4200}"

print_info() { echo -e "${BLUE}ℹ${NC}  $1"; }
print_success() { echo -e "${GREEN}✓${NC}  $1"; }
print_error() { echo -e "${RED}✗${NC}  $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC}  $1"; }
print_step() { echo -e "${CYAN}▶${NC}  $1"; }

show_usage() {
    cat << EOF
Usage: $0 <email> <password> <backup_dir>

Example:
  $0 abc-dev@demo.com Test@1234 flows/abc_admin_backup

Arguments:
  email       - Target account email (e.g., abc-dev@demo.com)
  password    - Account password
  backup_dir  - Directory containing exported flow JSON files

Environment Variables:
  ACTIVEPIECES_URL - API URL (default: http://localhost:4200)

EOF
}

if [ $# -lt 3 ]; then
    show_usage
    exit 1
fi

EMAIL=$1
PASSWORD=$2
BACKUP_DIR=$3

if [ ! -d "$BACKUP_DIR" ]; then
    print_error "Backup directory not found: $BACKUP_DIR"
    exit 1
fi

print_info "Flow Import Script"
echo ""
print_info "Target: $EMAIL"
print_info "Source: $BACKUP_DIR"
echo ""

# Login and get token
print_step "Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/v1/authentication/sign-in" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('token', ''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
    print_error "Login failed!"
    echo "$LOGIN_RESPONSE"
    exit 1
fi

print_success "Logged in successfully"

# Get project ID
print_step "Getting project ID..."
PROJECTS_RESPONSE=$(curl -s -X GET "$API_URL/api/v1/projects?limit=10" \
    -H "Authorization: Bearer $TOKEN")

PROJECT_ID=$(echo "$PROJECTS_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['data'][0]['id'] if data.get('data') else '')")

if [ -z "$PROJECT_ID" ]; then
    print_error "Could not get project ID"
    exit 1
fi

print_success "Project ID: $PROJECT_ID"
echo ""

# Count flow files
FLOW_FILES=("$BACKUP_DIR"/flow-*.json)
FLOW_COUNT=${#FLOW_FILES[@]}

if [ $FLOW_COUNT -eq 0 ]; then
    print_warning "No flow files found in $BACKUP_DIR"
    exit 0
fi

print_info "Found $FLOW_COUNT flow files to import"
echo ""

# Create log file
LOG_FILE="import_log_$(date +%Y%m%d_%H%M%S).txt"
echo "Flow Import Log - $(date)" > "$LOG_FILE"
echo "Target: $EMAIL" >> "$LOG_FILE"
echo "Project ID: $PROJECT_ID" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

# Import each flow
counter=0
success_count=0
failed_count=0

for flow_file in "${FLOW_FILES[@]}"; do
    ((counter++))
    filename=$(basename "$flow_file")
    
    print_step "Importing $counter/$FLOW_COUNT: $filename"
    
    # Read flow data
    FLOW_DATA=$(cat "$flow_file")
    
    # Extract flow name from data
    FLOW_NAME=$(echo "$FLOW_DATA" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('version',{}).get('displayName','Unnamed'))" 2>/dev/null || echo "Unnamed")
    
    # Import flow
    IMPORT_RESPONSE=$(curl -s -X POST "$API_URL/api/v1/flows" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d "{
            \"projectId\": \"$PROJECT_ID\",
            \"displayName\": \"$FLOW_NAME\"
        }")
    
    FLOW_ID=$(echo "$IMPORT_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('id', ''))" 2>/dev/null)
    
    if [ -z "$FLOW_ID" ]; then
        print_error "Failed to import: $filename"
        echo "  Error: Could not create flow"
        echo "FAILED: $filename - Could not create flow" >> "$LOG_FILE"
        ((failed_count++))
        continue
    fi
    
    # Update flow version with imported data
    VERSION_DATA=$(echo "$FLOW_DATA" | python3 -c "import sys, json; data=json.load(sys.stdin); print(json.dumps(data.get('version', {})))")
    
    UPDATE_RESPONSE=$(curl -s -X POST "$API_URL/api/v1/flows/$FLOW_ID/version" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d "$VERSION_DATA")
    
    # Check if import was successful
    if echo "$UPDATE_RESPONSE" | grep -q '"id"'; then
        print_success "Imported: $FLOW_NAME"
        echo "  Flow ID: $FLOW_ID"
        
        # Extract connections used
        CONNECTIONS=$(echo "$FLOW_DATA" | python3 << 'EOF'
import sys, json
try:
    data = json.load(sys.stdin)
    version = data.get('version', {})
    trigger = version.get('trigger', {})
    
    connections = set()
    
    # Check trigger settings
    if trigger.get('settings'):
        settings = trigger.get('settings', {})
        if isinstance(settings, dict):
            for key, value in settings.items():
                if 'connection' in key.lower() or 'auth' in key.lower():
                    if isinstance(value, dict) and value.get('pieceName'):
                        connections.add(value.get('pieceName', 'Unknown'))
    
    # Check actions
    for action in version.get('actions', []):
        if isinstance(action, dict):
            settings = action.get('settings', {})
            if isinstance(settings, dict):
                for key, value in settings.items():
                    if 'connection' in key.lower() or 'auth' in key.lower():
                        if isinstance(value, dict) and value.get('pieceName'):
                            connections.add(value.get('pieceName', 'Unknown'))
    
    if connections:
        print("Connections:", ", ".join(sorted(connections)))
except:
    pass
EOF
)
        
        if [ -n "$CONNECTIONS" ]; then
            echo "  $CONNECTIONS"
        fi
        
        echo "SUCCESS: $filename -> $FLOW_NAME (ID: $FLOW_ID)" >> "$LOG_FILE"
        ((success_count++))
    else
        print_warning "Imported but may need verification: $FLOW_NAME"
        echo "  Flow ID: $FLOW_ID"
        echo "WARNING: $filename -> $FLOW_NAME (ID: $FLOW_ID)" >> "$LOG_FILE"
        ((success_count++))
    fi
    
    echo ""
done

# Summary
echo ""
echo "═══════════════════════════════════════════════════════════"
print_info "Import Summary"
echo "═══════════════════════════════════════════════════════════"
print_success "Successfully imported: $success_count/$FLOW_COUNT"
if [ $failed_count -gt 0 ]; then
    print_error "Failed: $failed_count/$FLOW_COUNT"
fi
echo ""
print_info "Log saved to: $LOG_FILE"
echo ""

print_warning "IMPORTANT: Next Steps"
echo ""
echo "1. Log in to Activepieces as: $EMAIL"
echo "2. Go to Flows page"
echo "3. For EACH imported flow:"
echo "   - Open the flow"
echo "   - Update ALL connections to Dev versions:"
echo "     • 'ADA BMP' → 'ADA BMP - Dev'"
echo "     • 'Slack' → 'Slack - Dev'"
echo "     • (etc. for all connections)"
echo "   - Save the flow"
echo "   - Test the flow"
echo "   - Enable if needed"
echo ""
print_warning "Flows will NOT work until connections are updated!"
echo ""
