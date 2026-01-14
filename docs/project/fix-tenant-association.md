# Fix Tenant User Association

## Problem
The tenant `test-tenat@demo.com` was created but the user cannot login because `user.platformId` is NULL.

From the logs:
- Platform ID: `JrvBI1bz759zalkBQHWOx`
- Owner ID: `GjzgVZVg3Lel1iRM7VdGj`  
- Email: `test-tenat@demo.com`

## Quick SQL Fix

```sql
-- Verify the issue
SELECT 
    u.id as user_id,
    u."platformId" as current_platform_id,
    ui.email,
    p.id as platform_id,
    p.name as platform_name
FROM "user" u
JOIN user_identity ui ON u."identityId" = ui.id
LEFT JOIN platform p ON p."ownerId" = u.id
WHERE ui.email = 'test-tenat@demo.com';

-- Fix: Update the user's platformId
UPDATE "user"
SET "platformId" = 'JrvBI1bz759zalkBQHWOx'
WHERE id = 'GjzgVZVg3Lel1iRM7VdGj';

-- Verify the fix
SELECT 
    u.id,
    u."platformId",
    u."platformRole",
    ui.email,
    p.name as platform_name
FROM "user" u
JOIN user_identity ui ON u."identityId" = ui.id
LEFT JOIN platform p ON u."platformId" = p.id
WHERE ui.email = 'test-tenat@demo.com';
```

## After Running SQL

Try logging in again:
```bash
curl -s 'http://localhost:3000/v1/authentication/sign-in' \
  -H 'Content-Type: application/json' \
  --data-raw '{"email":"test-tenat@demo.com","password":"Test@1234"}'
```

Should return a valid authentication response with a token.

## Root Cause

The `platformService.create()` method calls `userService.addOwnerToPlatform()` but it seems like this might be failing silently or there's a race condition.

Need to investigate why `addOwnerToPlatform` isn't working in the super-admin controller context.
