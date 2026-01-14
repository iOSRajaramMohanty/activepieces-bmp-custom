#!/bin/bash
# View All Admins Script for Super Admin
# Usage: ./view-all-admins.sh [role]
# Examples:
#   ./view-all-admins.sh              # View all admins
#   ./view-all-admins.sh SUPER_ADMIN  # View only super admins
#   ./view-all-admins.sh all          # View all users

ROLE=${1:-ADMIN}

cd /Users/rajarammohanty/Documents/POC/activepieces

echo "=========================================="
echo "  ACTIVEPIECES - ADMIN ACCOUNTS"
echo "=========================================="
echo ""

if [ "$ROLE" = "all" ]; then
    echo "📊 Showing ALL users across ALL platforms:"
    echo ""
    PGPASSWORD=A79Vm5D4p2VQHOp2gd5 psql -h localhost -p 5433 -U postgres -d activepieces <<EOF
\x auto
SELECT 
  u.id,
  ui.email,
  ui."firstName" || ' ' || ui."lastName" as full_name,
  u."platformRole" as role,
  p.name as platform,
  u.status,
  u.created,
  u."lastActiveDate" as last_active
FROM "user" u
JOIN user_identity ui ON u."identityId" = ui.id
JOIN platform p ON u."platformId" = p.id
ORDER BY u."platformRole" DESC, u.created DESC;
EOF
elif [ "$ROLE" = "SUPER_ADMIN" ]; then
    echo "👑 Showing SUPER ADMINS only:"
    echo ""
    PGPASSWORD=A79Vm5D4p2VQHOp2gd5 psql -h localhost -p 5433 -U postgres -d activepieces <<EOF
\x auto
SELECT 
  u.id,
  ui.email,
  ui."firstName" || ' ' || ui."lastName" as full_name,
  u.status,
  u.created,
  u."lastActiveDate" as last_active,
  p.name as platform
FROM "user" u
JOIN user_identity ui ON u."identityId" = ui.id
JOIN platform p ON u."platformId" = p.id
WHERE u."platformRole" = 'SUPER_ADMIN'
ORDER BY u.created DESC;
EOF
else
    echo "👥 Showing ADMINS and SUPER ADMINS:"
    echo ""
    PGPASSWORD=A79Vm5D4p2VQHOp2gd5 psql -h localhost -p 5433 -U postgres -d activepieces <<EOF
\x auto
SELECT 
  u.id,
  ui.email,
  ui."firstName" || ' ' || ui."lastName" as full_name,
  u."platformRole" as role,
  p.name as platform,
  u.status,
  u.created,
  u."lastActiveDate" as last_active
FROM "user" u
JOIN user_identity ui ON u."identityId" = ui.id
JOIN platform p ON u."platformId" = p.id
WHERE u."platformRole" IN ('ADMIN', 'SUPER_ADMIN')
ORDER BY u."platformRole" DESC, u.created DESC;
EOF
fi

echo ""
echo "=========================================="
echo "  USER COUNT BY ROLE"
echo "=========================================="
echo ""

PGPASSWORD=A79Vm5D4p2VQHOp2gd5 psql -h localhost -p 5433 -U postgres -d activepieces <<EOF
SELECT 
  u."platformRole" as "Role",
  COUNT(*) as "Total",
  COUNT(CASE WHEN u.status = 'ACTIVE' THEN 1 END) as "Active",
  COUNT(CASE WHEN u.status = 'INACTIVE' THEN 1 END) as "Inactive"
FROM "user" u
GROUP BY u."platformRole"
ORDER BY COUNT(*) DESC;
EOF

echo ""
echo "=========================================="
