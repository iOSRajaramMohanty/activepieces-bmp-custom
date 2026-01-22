#!/bin/bash

# Script to add organization names for users that don't have them
# This script extracts organization names from user emails/names and creates organizations

echo "🚀 Starting organization name assignment script..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if database connection is available
if [ -z "$POSTGRES_URL" ] && [ -z "$POSTGRES_HOST" ]; then
    echo "⚠️  Warning: Database environment variables not set"
    echo "   Make sure to set POSTGRES_URL or POSTGRES_* variables"
fi

echo "📝 This script will:"
echo "   1. Find users without organizationId"
echo "   2. Extract organization name from email (e.g., 'abc-dev@demo.com' -> 'ABC')"
echo "   3. Create organization if it doesn't exist"
echo "   4. Update user's organizationId"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelled"
    exit 1
fi

# Run the TypeScript script using tsx or ts-node
if command -v tsx &> /dev/null; then
    echo "✅ Using tsx to run the script..."
    tsx packages/server/api/src/app/database/scripts/add-organization-names.ts
elif command -v ts-node &> /dev/null; then
    echo "✅ Using ts-node to run the script..."
    ts-node packages/server/api/src/app/database/scripts/add-organization-names.ts
else
    echo "❌ Error: Neither tsx nor ts-node found. Please install one:"
    echo "   npm install -g tsx"
    echo "   or"
    echo "   npm install -g ts-node"
    exit 1
fi
