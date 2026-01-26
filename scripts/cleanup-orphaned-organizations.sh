#!/bin/bash

# Script to find and delete orphaned organizations
# Orphaned = no users, no organization_environment records, no projects

echo "🔍 Checking for orphaned organizations..."
echo ""

# Source .env file if it exists
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Get database connection details
DB_HOST="${AP_POSTGRES_HOST:-localhost}"
DB_PORT="${AP_POSTGRES_PORT:-5433}"
DB_NAME="${AP_POSTGRES_DATABASE:-activepieces}"
DB_USER="${AP_POSTGRES_USERNAME:-activepieces}"
DB_PASSWORD="${AP_POSTGRES_PASSWORD}"

if [ -z "$DB_PASSWORD" ]; then
    echo "❌ Error: AP_POSTGRES_PASSWORD not set in .env"
    exit 1
fi

# Create SQL script
SQL_FILE="/tmp/check_orphaned_orgs_$$.sql"
cat > "$SQL_FILE" << 'SQL'
-- Check for orphaned organizations
SELECT 
    o.id,
    o.name,
    o."platformId",
    o.created,
    (SELECT COUNT(*) FROM "user" u WHERE u."organizationId" = o.id) as user_count,
    (SELECT COUNT(*) FROM organization_environment oe WHERE oe."organizationId" = o.id) as env_count,
    (SELECT COUNT(*) FROM project p WHERE p."organizationId" = o.id) as project_count
FROM organization o
WHERE o."platformId" = (SELECT id FROM platform LIMIT 1)
ORDER BY o.created DESC;
SQL

echo "📊 Organizations in database:"
echo ""

# Run query using PGPASSWORD
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SQL_FILE"

echo ""
echo "🗑️  Finding orphaned organizations (no users, no envs, no projects)..."
echo ""

# Create deletion SQL
DELETE_SQL="/tmp/delete_orphaned_orgs_$$.sql"
cat > "$DELETE_SQL" << 'SQL'
-- Delete orphaned organizations
DELETE FROM organization o
WHERE o."platformId" = (SELECT id FROM platform LIMIT 1)
AND NOT EXISTS (SELECT 1 FROM "user" u WHERE u."organizationId" = o.id)
AND NOT EXISTS (SELECT 1 FROM organization_environment oe WHERE oe."organizationId" = o.id)
AND NOT EXISTS (SELECT 1 FROM project p WHERE p."organizationId" = o.id)
RETURNING o.id, o.name, o.created;
SQL

echo "⚠️  This will delete organizations with:"
echo "   - No users"
echo "   - No organization_environment records"
echo "   - No projects"
echo ""
read -p "Continue with deletion? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelled"
    rm -f "$SQL_FILE" "$DELETE_SQL"
    exit 1
fi

echo "🗑️  Deleting orphaned organizations..."
DELETED=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A -F"," -c "$(cat $DELETE_SQL)")

if [ -n "$DELETED" ]; then
    echo "✅ Deleted orphaned organizations:"
    echo "$DELETED" | while IFS=',' read -r id name created; do
        if [ -n "$id" ]; then
            echo "   - $name (ID: $id, Created: $created)"
        fi
    done
else
    echo "ℹ️  No orphaned organizations found"
fi

# Cleanup
rm -f "$SQL_FILE" "$DELETE_SQL"

echo ""
echo "✅ Done!"
