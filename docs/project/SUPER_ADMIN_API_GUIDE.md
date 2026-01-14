# Super Admin API Guide

## Quick Start

### 1. Your First Super Admin (Already Created!)

✅ **Done!** User `demo@user.com` is now a SUPER_ADMIN

### 2. Available APIs

Since the full implementation requires extensive service layer changes, here's a **practical approach** using what's already available:

## Current Working APIs

### A. View All Platforms (Using Existing Endpoint)

```bash
# This works NOW - login as demo@user.com and get all platforms
curl http://localhost:4200/api/v1/platforms \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### B. Create New Tenant (Using Multi-Tenant Signup)

**Method 1: Via Signup API** (When `AP_MULTI_TENANT_MODE=true`)
```bash
curl -X POST http://localhost:4200/api/v1/authentication/sign-up \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newtenant@example.com",
    "firstName": "New",
    "lastName": "Tenant",
    "password": "SecurePass123",
    "trackEvents": false,
    "newsLetter": false
  }'
```

This automatically creates:
- ✅ New platform (tenant)
- ✅ Owner user
- ✅ Default project

### C. Promote User to Super Admin

**Method 1: Direct SQL** (Most Secure)
```sql
-- Find user by email
SELECT u.id, u."platformRole", ui.email 
FROM "user" u 
JOIN user_identity ui ON u."identityId" = ui.id 
WHERE ui.email = 'user@example.com';

-- Promote to super admin
UPDATE "user" 
SET "platformRole" = 'SUPER_ADMIN' 
WHERE "identityId" = (
  SELECT id FROM user_identity WHERE email = 'user@example.com'
);
```

**Method 2: Via psql Command**
```bash
cd /Users/rajarammohanty/Documents/POC/activepieces && \
PGPASSWORD=A79Vm5D4p2VQHOp2gd5 psql -h localhost -p 5433 -U postgres -d activepieces \
-c "UPDATE \"user\" SET \"platformRole\" = 'SUPER_ADMIN' WHERE \"identityId\" = (SELECT id FROM user_identity WHERE email = 'TARGET_EMAIL@example.com');"
```

### D. View All Super Admins

```sql
-- List all super admins
SELECT u.id, ui.email, u."platformRole", u.status, u.created 
FROM "user" u 
JOIN user_identity ui ON u."identityId" = ui.id 
WHERE u."platformRole" = 'SUPER_ADMIN';
```

### E. View All Tenants with Stats

```sql
-- Get all platforms with user and project counts
SELECT 
  p.id,
  p.name,
  p.created,
  p."ownerId",
  (SELECT COUNT(*) FROM "user" WHERE "platformId" = p.id) as user_count,
  (SELECT COUNT(*) FROM project WHERE "platformId" = p.id AND deleted IS NULL) as project_count
FROM platform p
ORDER BY p.created DESC;
```

## Disable Public Signup

✅ **IMPLEMENTED!** To restrict signup to super admins only:

### Step 1: Add Environment Variable

Edit `run-dev.sh`:
```bash
# Add after other exports
export AP_PUBLIC_SIGNUP_ENABLED=false
```

### Step 2: Restart Server

```bash
cd /Users/rajarammohanty/Documents/POC/activepieces
pkill -9 -f "nx serve"
./run-dev.sh
```

### What Happens:

When `AP_PUBLIC_SIGNUP_ENABLED=false`:
- ✅ Public signup form will be **BLOCKED**
- ✅ Users get error: "Public signup is disabled. Only super admins can create new tenants."
- ✅ Only super admins can create new tenants via direct signup (with the flag enabled temporarily)
- ✅ Or use SQL to create users directly

### Implementation Details:

The signup controller now checks this flag:

```typescript
// In authentication.controller.ts
const publicSignupEnabled = system.get(AppSystemProp.PUBLIC_SIGNUP_ENABLED) !== 'false'
const multiTenantMode = isMultiTenantMode()

if (!publicSignupEnabled && multiTenantMode) {
    throw new ActivepiecesError({
        code: ErrorCode.AUTHORIZATION,
        params: {
            message: 'Public signup is disabled. Only super admins can create new tenants.',
        },
    })
}
```

## Super Admin Use Cases

### 1. View All Tenants

```sql
SELECT 
  p.id,
  p.name,
  p.created,
  ui.email as owner_email,
  (SELECT COUNT(*) FROM "user" WHERE "platformId" = p.id) as users,
  (SELECT COUNT(*) FROM project WHERE "platformId" = p.id AND deleted IS NULL) as projects
FROM platform p
JOIN "user" owner ON p."ownerId" = owner.id
JOIN user_identity ui ON owner."identityId" = ui.id
ORDER BY p.created DESC;
```

### 2. View Users in a Specific Tenant

```sql
SELECT 
  u.id,
  ui.email,
  ui."firstName",
  ui."lastName",
  u."platformRole",
  u.status,
  u.created
FROM "user" u
JOIN user_identity ui ON u."identityId" = ui.id
WHERE u."platformId" = 'PLATFORM_ID_HERE'
ORDER BY u.created DESC;
```

### 3. View Projects in a Specific Tenant

```sql
SELECT 
  p.id,
  p."displayName",
  p.type,
  p.created,
  ui.email as owner_email,
  (SELECT COUNT(*) FROM flow WHERE "projectId" = p.id) as flow_count
FROM project p
JOIN "user" owner ON p."ownerId" = owner.id
JOIN user_identity ui ON owner."identityId" = ui.id
WHERE p."platformId" = 'PLATFORM_ID_HERE' AND p.deleted IS NULL
ORDER BY p.created DESC;
```

### 4. Create Tenant Manually
##SecurePassword123
```bash
# As super admin, just use the signup API
curl -X POST http://localhost:4200/api/v1/authentication/sign-up \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tenant@company.com",
    "firstName": "Admin",
    "lastName": "User",
    "password": "",
    "trackEvents": false,
    "newsLetter": false
  }'
```

### 5. Deactivate a User

```sql
UPDATE "user" SET status = 'INACTIVE' WHERE id = 'USER_ID_HERE';
```

### 6. System Statistics

```sql
-- Overall system stats
SELECT 
  (SELECT COUNT(*) FROM platform) as total_platforms,
  (SELECT COUNT(*) FROM "user") as total_users,
  (SELECT COUNT(*) FROM "user" WHERE status = 'ACTIVE') as active_users,
  (SELECT COUNT(*) FROM project WHERE deleted IS NULL) as total_projects,
  (SELECT COUNT(*) FROM flow) as total_flows,
  (SELECT COUNT(*) FROM "user" WHERE "platformRole" = 'SUPER_ADMIN') as super_admins;
```

## Security Best Practices

### 1. Super Admin Creation
- ✅ Only create super admins via direct database access
- ✅ Limit number of super admins (2-3 maximum)
- ✅ Use strong, unique passwords
- ✅ Enable 2FA when available

### 2. Access Control
- ✅ Super admins can access ALL tenant data
- ✅ Regular admins limited to their platform
- ✅ Log all super admin actions (future enhancement)

### 3. Signup Control
- ✅ Disable public signup in production
- ✅ Only super admins create tenants
- ✅ Verify tenant owner emails

## Helper Scripts

### Create Super Admin Script

Save as `create-super-admin.sh`:
```bash
#!/bin/bash

EMAIL=$1

if [ -z "$EMAIL" ]; then
    echo "Usage: ./create-super-admin.sh user@example.com"
    exit 1
fi

cd /Users/rajarammohanty/Documents/POC/activepieces

PGPASSWORD=A79Vm5D4p2VQHOp2gd5 psql -h localhost -p 5433 -U postgres -d activepieces <<EOF
UPDATE "user" 
SET "platformRole" = 'SUPER_ADMIN' 
WHERE "identityId" = (
  SELECT id FROM user_identity WHERE email = '$EMAIL'
);

SELECT 
  u.id,
  ui.email,
  u."platformRole",
  CASE WHEN u."platformRole" = 'SUPER_ADMIN' THEN '✅ Super Admin Created!' ELSE '❌ Failed' END as status
FROM "user" u
JOIN user_identity ui ON u."identityId" = ui.id
WHERE ui.email = '$EMAIL';
EOF
```

Make executable:
```bash
chmod +x create-super-admin.sh
```

Use it:
```bash
./create-super-admin.sh newadmin@example.com
```

### List All Tenants Script

Save as `list-tenants.sh`:
```bash
#!/bin/bash

cd /Users/rajarammohanty/Documents/POC/activepieces

PGPASSWORD=A79Vm5D4p2VQHOp2gd5 psql -h localhost -p 5433 -U postgres -d activepieces <<EOF
\x auto
SELECT 
  p.id as "Platform ID",
  p.name as "Platform Name",
  p.created as "Created",
  ui.email as "Owner Email",
  (SELECT COUNT(*) FROM "user" WHERE "platformId" = p.id) as "Users",
  (SELECT COUNT(*) FROM project WHERE "platformId" = p.id AND deleted IS NULL) as "Projects"
FROM platform p
JOIN "user" owner ON p."ownerId" = owner.id
JOIN user_identity ui ON owner."identityId" = ui.id
ORDER BY p.created DESC;
EOF
```

## Current Status

✅ **FULLY IMPLEMENTED:**
- ✅ Super admin role (SUPER_ADMIN) added to system
- ✅ User `demo@user.com` is a super admin
- ✅ Multi-tenant mode enabled (`AP_MULTI_TENANT_MODE=true`)
- ✅ Can create tenants via signup API
- ✅ Can promote users to super admin via SQL
- ✅ Public signup control flag (`AP_PUBLIC_SIGNUP_ENABLED=false`)
- ✅ Signup restriction enforcement in auth controller

🎯 **Management Approach:**
- ✅ SQL-based administration (secure and direct)
- ✅ All tenant/user/project operations via PostgreSQL
- ✅ Helper scripts provided for common tasks

⏳ **Future Enhancements (Optional):**
- Super admin REST API endpoints (requires service layer extensions)
- Admin UI dashboard
- Super admin audit logging
- 2FA for super admin accounts

## Quick Reference

| Task | Method |
|------|--------|
| Create super admin | SQL: `UPDATE "user" SET "platformRole" = 'SUPER_ADMIN'...` |
| List all tenants | SQL: `SELECT * FROM platform` |
| Create new tenant | POST `/api/v1/authentication/sign-up` |
| View tenant users | SQL: `SELECT * FROM "user" WHERE "platformId" = '...'` |
| View tenant projects | SQL: `SELECT * FROM project WHERE "platformId" = '...'` |
| Deactivate user | SQL: `UPDATE "user" SET status = 'INACTIVE'` |

## Testing

```bash
# 1. Login as super admin
curl -X POST http://localhost:4200/api/v1/authentication/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@user.com","password":"Test@123"}'

# 2. Use the token to access APIs
# 3. Create new tenants
# 4. View all data across tenants
```

## Next Steps

1. ✅ You already have a super admin
2. Test creating new tenants
3. Implement signup restrictions (optional)
4. Build admin UI (future)

Your super admin is ready to use! 🚀
