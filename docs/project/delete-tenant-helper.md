# Delete Tenant Helper Guide

## ⚠️ WARNING: Use with Caution

Deleting a tenant will remove all associated data including:
- The tenant's platform
- All users associated with that platform
- All projects under that platform
- All flows and connections
- All execution history

## Option 1: Delete via SQL (RECOMMENDED for broken tenants)

### Step 1: Find the tenant details

```sql
-- Find the tenant by owner email
SELECT 
    p.id as platform_id,
    p.name as platform_name,
    u.id as owner_id,
    ui.email as owner_email,
    ui.id as identity_id
FROM platform p
JOIN "user" u ON p."ownerId" = u.id
JOIN user_identity ui ON u."identityId" = ui.id
WHERE ui.email = 'test_r_bmp@yopmail.com';
```

### Step 2: Delete in correct order (to avoid foreign key issues)

```sql
-- Replace <platform_id>, <owner_id>, and <identity_id> with values from Step 1

-- 1. Delete all projects associated with the platform
DELETE FROM project WHERE "platformId" = '<platform_id>';

-- 2. Delete all users associated with the platform
DELETE FROM "user" WHERE "platformId" = '<platform_id>';

-- 3. Delete the platform itself
DELETE FROM platform WHERE id = '<platform_id>';

-- 4. Delete the user identity (optional - only if you want to reuse the email)
DELETE FROM user_identity WHERE id = '<identity_id>';
```

### Complete Example for test_r_bmp@yopmail.com:

```sql
-- Step 1: Get the IDs
SELECT 
    p.id as platform_id,
    p.name as platform_name,
    u.id as owner_id,
    ui.email as owner_email,
    ui.id as identity_id
FROM platform p
JOIN "user" u ON p."ownerId" = u.id
JOIN user_identity ui ON u."identityId" = ui.id
WHERE ui.email = 'test_r_bmp@yopmail.com';

-- Step 2: Copy the IDs from the result above, then run:
-- (Replace the placeholder IDs with actual IDs from your query)

BEGIN;

-- Delete projects
DELETE FROM project WHERE "platformId" = 'YOUR_PLATFORM_ID_HERE';

-- Delete users (including the owner)
DELETE FROM "user" WHERE "platformId" = 'YOUR_PLATFORM_ID_HERE';

-- Delete the platform
DELETE FROM platform WHERE id = 'YOUR_PLATFORM_ID_HERE';

-- Delete the identity (so you can reuse the email)
DELETE FROM user_identity WHERE id = 'YOUR_IDENTITY_ID_HERE';

COMMIT;
```

## Option 2: Using Database Client

### If using PostgreSQL client (psql):

1. Connect to your database:
```bash
# Find your database connection string from environment
psql "postgresql://username:password@host:port/database"
```

2. Run the queries from Option 1

### If using a GUI tool (pgAdmin, DBeaver, etc.):

1. Open your database connection
2. Find the database (usually named `activepieces` or similar)
3. Open SQL editor
4. Run the queries from Option 1

## Option 3: Quick Script (creates a one-time delete script)

I can create a backend endpoint for you to delete a tenant. Would you like me to do that?

## After Deletion

Once deleted, you can:
1. Create a new tenant with the same email (since identity was deleted)
2. Or use a completely different email
3. The new tenant will work correctly with the fixed code

## Need Help?

If you're not comfortable with SQL, let me know and I can:
1. Add a "Delete Tenant" button in the Super Admin Dashboard
2. Create a safe backend endpoint with proper validation
3. Help you run the SQL commands step by step

---

## Alternative: Fix Instead of Delete

If you prefer to fix the existing tenant instead of deleting it:

```sql
-- Find the user and platform
SELECT 
    u.id as user_id,
    u."platformId" as current_platform_id,
    p.id as correct_platform_id,
    ui.email
FROM "user" u
JOIN user_identity ui ON u."identityId" = ui.id
JOIN platform p ON p."ownerId" = u.id
WHERE ui.email = 'test_r_bmp@yopmail.com';

-- Update the user's platformId
UPDATE "user" 
SET "platformId" = (
    SELECT p.id 
    FROM platform p 
    WHERE p."ownerId" = "user".id
)
WHERE id = (
    SELECT u.id 
    FROM "user" u 
    JOIN user_identity ui ON u."identityId" = ui.id 
    WHERE ui.email = 'test_r_bmp@yopmail.com'
);
```

After running this, try logging in again with `test_r_bmp@yopmail.com` / `Test@1234`.
