#!/bin/bash

# Script to build community pieces for Activepieces
# Usage: ./build-pieces.sh [all|common|<piece-name>]

set -e  # Exit on error

cd /Users/rajarammohanty/Documents/POC/activepieces

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# List of commonly used pieces
COMMON_PIECES=(
    "slack"
    "google-sheets"
    "gmail"
    "google-drive"
    "google-calendar"
    "notion"
    "airtable"
    "hubspot"
    "salesforce"
    "stripe"
    "mailchimp"
    "trello"
    "asana"
    "github"
    "discord"
    "telegram-bot"
    "openai"
    "anthropic"
    "twilio"
    "sendgrid"
)

build_piece() {
    local piece=$1
    echo -e "${BLUE}📦 Building pieces-${piece}...${NC}"
    npx nx build pieces-${piece}
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Successfully built pieces-${piece}${NC}"
    else
        echo -e "${YELLOW}⚠️  Failed to build pieces-${piece} (might not exist or have dependencies issues)${NC}"
    fi
    echo ""
}

case "${1:-common}" in
    all)
        echo -e "${BLUE}🚀 Building ALL community pieces... This may take a while!${NC}"
        echo ""
        
        # Get list of all community pieces
        for dir in packages/pieces/community/*/; do
            if [ -d "$dir" ]; then
                piece=$(basename "$dir")
                # Skip special directories
                if [[ "$piece" != "common" && "$piece" != "framework" ]]; then
                    build_piece "$piece"
                fi
            fi
        done
        ;;
        
    common)
        echo -e "${BLUE}🚀 Building commonly used pieces...${NC}"
        echo -e "${YELLOW}Pieces: ${COMMON_PIECES[@]}${NC}"
        echo ""
        
        for piece in "${COMMON_PIECES[@]}"; do
            build_piece "$piece"
        done
        ;;
        
    list)
        echo -e "${BLUE}📋 Available community pieces:${NC}"
        echo ""
        ls -1 packages/pieces/community/ | grep -v "common\|framework" | head -50
        echo ""
        echo -e "${YELLOW}... and many more! Use 'ls packages/pieces/community/' to see all${NC}"
        ;;
        
    *)
        # Build specific piece
        build_piece "$1"
        ;;
esac

echo -e "${GREEN}🎉 Build complete!${NC}"
