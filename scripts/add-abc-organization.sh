#!/bin/bash

# Script to add ABC organization to the database
# This script will create the ABC organization and link all ABC users

echo "🚀 Adding ABC organization to database..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Try to get database connection from .env or environment
if [ -f ".env" ]; then
    # Source .env file properly (handle values with spaces/special chars)
    set -a
    source .env 2>/dev/null || true
    set +a
fi

# Use AP_POSTGRES_* variables if POSTGRES_* are not set
POSTGRES_HOST="${POSTGRES_HOST:-${AP_POSTGRES_HOST:-localhost}}"
POSTGRES_PORT="${POSTGRES_PORT:-${AP_POSTGRES_PORT:-5432}}"
POSTGRES_USERNAME="${POSTGRES_USERNAME:-${AP_POSTGRES_USERNAME:-postgres}}"
POSTGRES_DATABASE="${POSTGRES_DATABASE:-${AP_POSTGRES_DATABASE:-activepieces}}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-${AP_POSTGRES_PASSWORD:-postgres}}"

# Check database connection
if [ -z "$POSTGRES_URL" ] && [ -z "$POSTGRES_HOST" ]; then
    echo "⚠️  Warning: Database environment variables not set"
    echo "   Trying to use default PostgreSQL connection..."
fi

echo "📝 This script will:"
echo "   1. Create 'ABC' organization if it doesn't exist"
echo "   2. Link all users with emails like abc-dev@*, abc-staging@*, abc-production@*"
echo "   3. Link users with names like 'ABC Dev Admin', 'ABC Staging Admin', etc."
echo ""

# Create a temporary SQL file with the actual connection
if [ -n "$POSTGRES_URL" ]; then
    echo "✅ Using POSTGRES_URL connection"
    psql "$POSTGRES_URL" -f scripts/add-abc-organization.sql
elif [ -n "$POSTGRES_HOST" ]; then
    echo "✅ Using PostgreSQL connection: $POSTGRES_HOST:$POSTGRES_PORT/$POSTGRES_DATABASE"
    PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USERNAME" -d "$POSTGRES_DATABASE" -f scripts/add-abc-organization.sql
else
    echo "❌ Error: Could not determine database connection"
    echo ""
    echo "Please set one of:"
    echo "  - POSTGRES_URL (full connection string)"
    echo "  - POSTGRES_HOST, POSTGRES_USERNAME, POSTGRES_DATABASE, POSTGRES_PASSWORD"
    echo ""
    echo "Or run manually:"
    echo "  psql <your-connection-string> -f scripts/add-abc-organization.sql"
    exit 1
fi

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ ABC organization added successfully!"
    echo "   Refresh your browser to see the changes."
else
    echo ""
    echo "❌ Error: Failed to add ABC organization"
    exit 1
fi
