#!/bin/bash

# ============================================
# Organization Metadata Configuration Script
# ============================================
# This script helps organization owners/admins
# configure environment-specific metadata
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL="${AP_API_URL:-http://localhost:3000}"
ORG_NAME="${ORG_NAME:-}"
ENVIRONMENT="${ENVIRONMENT:-staging}"

# Default metadata values based on environment
declare -A DEFAULT_API_URLS
DEFAULT_API_URLS[dev]="https://bmpapidev1.cl.bmp.ada-asia.my"
DEFAULT_API_URLS[staging]="https://bmpapistg.cl.bmp.ada-asia.my"
DEFAULT_API_URLS[production]="https://bmpapiprod.cl.bmp.ada-asia.my"

# Print colored output
print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Show usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Configure organization metadata for environment-specific settings.

Options:
    -n, --org-name NAME        Organization name (required)
    -e, --environment ENV      Environment: dev, staging, production (default: staging)
    -u, --api-url URL          Activepieces API URL (default: http://localhost:3000)
    -t, --token TOKEN          Authentication token (or set AP_API_TOKEN env var)
    -a, --ada-api-url URL      ADA BMP API URL (optional, uses default for environment)
    -o, --timeout TIMEOUT      Request timeout in ms (default: 30000)
    -d, --debug                Enable debug mode (default: false)
    -g, --get                  Get current metadata instead of updating
    -h, --help                 Show this help message

Examples:
    # Configure staging metadata
    $0 -n "ABC" -e staging -t "your_token"

    # Configure with custom API URL
    $0 -n "ABC" -e staging -a "https://custom-api.example.com" -t "your_token"

    # Get current metadata
    $0 -n "ABC" -g -t "your_token"

Environment Variables:
    AP_API_URL          Activepieces API base URL
    AP_API_TOKEN        Authentication token
    ORG_NAME            Organization name

EOF
}

# Get organization ID by name
get_organization_id() {
    local org_name="$1"
    local platform_id="${PLATFORM_ID:-}"
    
    if [ -z "$platform_id" ]; then
        print_warning "PLATFORM_ID not set, trying to get first platform..."
        # Try to get platform ID from API or use default
        platform_id=$(curl -s -X GET "${API_BASE_URL}/api/v1/platforms" \
            -H "Authorization: Bearer ${AP_API_TOKEN}" \
            -H "Content-Type: application/json" | jq -r '.id // empty' | head -1)
    fi
    
    if [ -z "$platform_id" ]; then
        print_error "Could not determine platform ID. Please set PLATFORM_ID environment variable."
        exit 1
    fi
    
    local org_id=$(curl -s -X GET "${API_BASE_URL}/api/v1/organizations?platformId=${platform_id}" \
        -H "Authorization: Bearer ${AP_API_TOKEN}" \
        -H "Content-Type: application/json" | \
        jq -r ".data[] | select(.name == \"${org_name}\") | .id")
    
    if [ -z "$org_id" ]; then
        print_error "Organization '${org_name}' not found"
        exit 1
    fi
    
    echo "$org_id"
}

# Get current metadata
get_metadata() {
    local org_id="$1"
    
    print_info "Fetching current metadata for organization..."
    
    local response=$(curl -s -X GET "${API_BASE_URL}/api/v1/organizations/${org_id}" \
        -H "Authorization: Bearer ${AP_API_TOKEN}" \
        -H "Content-Type: application/json")
    
    if echo "$response" | jq -e '.error' > /dev/null 2>&1; then
        print_error "Failed to get metadata: $(echo "$response" | jq -r '.message // .error')"
        exit 1
    fi
    
    echo "$response" | jq '.metadata // {}'
}

# Update metadata
update_metadata() {
    local org_id="$1"
    local metadata_json="$2"
    
    print_info "Updating organization metadata..."
    
    local response=$(curl -s -X PATCH "${API_BASE_URL}/api/v1/organizations/${org_id}" \
        -H "Authorization: Bearer ${AP_API_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{\"metadata\": ${metadata_json}}")
    
    if echo "$response" | jq -e '.error' > /dev/null 2>&1; then
        print_error "Failed to update metadata: $(echo "$response" | jq -r '.message // .error')"
        exit 1
    fi
    
    print_success "Metadata updated successfully!"
    echo "$response" | jq '.metadata'
}

# Main function
main() {
    local get_only=false
    local ada_api_url=""
    local timeout=30000
    local debug=false
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -n|--org-name)
                ORG_NAME="$2"
                shift 2
                ;;
            -e|--environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            -u|--api-url)
                API_BASE_URL="$2"
                shift 2
                ;;
            -t|--token)
                AP_API_TOKEN="$2"
                shift 2
                ;;
            -a|--ada-api-url)
                ada_api_url="$2"
                shift 2
                ;;
            -o|--timeout)
                timeout="$2"
                shift 2
                ;;
            -d|--debug)
                debug=true
                shift
                ;;
            -g|--get)
                get_only=true
                shift
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done
    
    # Validate required parameters
    if [ -z "$ORG_NAME" ]; then
        print_error "Organization name is required. Use -n or --org-name"
        usage
        exit 1
    fi
    
    if [ -z "$AP_API_TOKEN" ]; then
        print_error "Authentication token is required. Use -t or set AP_API_TOKEN"
        usage
        exit 1
    fi
    
    # Validate environment
    if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|production)$ ]]; then
        print_error "Invalid environment: $ENVIRONMENT. Must be: dev, staging, or production"
        exit 1
    fi
    
    print_info "Configuration:"
    echo "  Organization: $ORG_NAME"
    echo "  Environment: $ENVIRONMENT"
    echo "  API URL: $API_BASE_URL"
    echo ""
    
    # Get organization ID
    print_info "Looking up organization ID..."
    ORG_ID=$(get_organization_id "$ORG_NAME")
    print_success "Found organization ID: $ORG_ID"
    echo ""
    
    # If get-only, just fetch and display
    if [ "$get_only" = true ]; then
        print_info "Current metadata:"
        get_metadata "$ORG_ID" | jq '.'
        exit 0
    fi
    
    # Determine ADA API URL
    if [ -z "$ada_api_url" ]; then
        ada_api_url="${DEFAULT_API_URLS[$ENVIRONMENT]}"
        print_info "Using default API URL for $ENVIRONMENT: $ada_api_url"
    else
        print_info "Using custom API URL: $ada_api_url"
    fi
    
    # Build metadata JSON
    local metadata_json=$(jq -n \
        --arg api_url "$ada_api_url" \
        --argjson timeout "$timeout" \
        --argjson debug "$debug" \
        '{
            ADA_BMP_API_URL: $api_url,
            ADA_BMP_TIMEOUT: $timeout,
            ADA_BMP_DEBUG: $debug
        }')
    
    # Get current metadata and merge
    print_info "Fetching current metadata to preserve existing fields..."
    local current_metadata=$(get_metadata "$ORG_ID")
    
    # Merge metadata (new values override old ones)
    local merged_metadata=$(echo "$current_metadata" | jq --argjson new "$metadata_json" '. + $new')
    
    # Update metadata
    update_metadata "$ORG_ID" "$(echo "$merged_metadata" | jq -c '.')"
    
    print_success "Configuration complete!"
    echo ""
    print_info "Updated metadata:"
    echo "$merged_metadata" | jq '.'
}

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    print_error "jq is required but not installed. Please install jq:"
    echo "  macOS: brew install jq"
    echo "  Ubuntu/Debian: sudo apt-get install jq"
    echo "  CentOS/RHEL: sudo yum install jq"
    exit 1
fi

# Check if curl is installed
if ! command -v curl &> /dev/null; then
    print_error "curl is required but not installed."
    exit 1
fi

# Run main function
main "$@"
