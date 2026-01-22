#!/bin/bash

# ============================================
# Flow Export Script
# ============================================
# Exports all flows from a project via API
# Usage: ./export-flows.sh <email> <password>
# ============================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

API_URL="${ACTIVEPIECES_URL:-http://localhost:4200}"
EXPORT_DIR="flows/abc_admin_backup"

print_info() { echo -e "${BLUE}ℹ${NC}  $1"; }
print_success() { echo -e "${GREEN}✓${NC}  $1"; }
print_error() { echo -e "${RED}✗${NC}  $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC}  $1"; }

if [ $# -lt 2 ]; then
    echo "Usage: $0 <email> <password>"
    echo ""
    echo "Example:"
    echo "  $0 abc_admin@demo.com Test@1234"
    exit 1
fi

EMAIL=$1
PASSWORD=$2

print_info "Logging in as $EMAIL..."

# Get authentication token
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
print_info "Getting project ID..."
PROJECTS_RESPONSE=$(curl -s -X GET "$API_URL/api/v1/projects?limit=10" \
    -H "Authorization: Bearer $TOKEN")

PROJECT_ID=$(echo "$PROJECTS_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['data'][0]['id'] if data.get('data') else '')")

if [ -z "$PROJECT_ID" ]; then
    print_error "Could not get project ID"
    exit 1
fi

print_success "Project ID: $PROJECT_ID"

# Get all flows
print_info "Fetching flows..."
FLOWS_RESPONSE=$(curl -s -X GET "$API_URL/api/v1/flows?projectId=$PROJECT_ID&limit=100" \
    -H "Authorization: Bearer $TOKEN")

# Create export directory
mkdir -p "$EXPORT_DIR"

# Count flows
FLOW_COUNT=$(echo "$FLOWS_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data.get('data', [])))")

print_success "Found $FLOW_COUNT flows"
echo ""

if [ "$FLOW_COUNT" -eq 0 ]; then
    print_warning "No flows to export"
    exit 0
fi

# Export each flow
print_info "Exporting flows..."
echo ""

counter=1
echo "$FLOWS_RESPONSE" | python3 << 'EOF'
import sys, json, os, re

data = json.load(sys.stdin)
flows = data.get('data', [])

for idx, flow in enumerate(flows, 1):
    flow_id = flow['id']
    version = flow.get('version', {})
    flow_name = version.get('displayName', f'unnamed-flow-{idx}')
    status = flow.get('status', 'UNKNOWN')
    
    # Sanitize filename
    safe_name = re.sub(r'[^\w\-]', '-', flow_name.lower())
    safe_name = re.sub(r'-+', '-', safe_name)
    safe_name = safe_name.strip('-')
    
    filename = f"flow-{idx:02d}-{safe_name}.json"
    
    print(f"{flow_id}|{flow_name}|{status}|{filename}")
EOF

echo ""

# Export each flow one by one
echo "$FLOWS_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); [print(f['id']) for f in data.get('data', [])]" | while read flow_id; do
    # Get flow details with full version
    FLOW_DATA=$(curl -s -X GET "$API_URL/api/v1/flows/$flow_id" \
        -H "Authorization: Bearer $TOKEN")
    
    # Get flow name for filename
    FLOW_NAME=$(echo "$FLOW_DATA" | python3 -c "import sys, json, re; data=json.load(sys.stdin); name=data.get('version',{}).get('displayName','unnamed'); safe=re.sub(r'[^\w\-]','-',name.lower()); safe=re.sub(r'-+','-',safe).strip('-'); print(safe)")
    
    filename="$EXPORT_DIR/flow-$(printf %02d $counter)-$FLOW_NAME.json"
    
    echo "$FLOW_DATA" > "$filename"
    
    print_success "Exported: $(basename $filename)"
    
    ((counter++))
done

echo ""
print_success "Export complete!"
print_info "Files saved to: $EXPORT_DIR/"
echo ""
ls -lh "$EXPORT_DIR/"/*.json 2>/dev/null | awk '{print "  ", $9, "("$5")"}'
