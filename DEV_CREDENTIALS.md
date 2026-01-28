# 🔑 Activepieces Development Credentials

## ⭐ **Your Restored SUPER_ADMIN Account** (Recommended)

### Local Development:
```
URL:      http://localhost:4200
Email:    demo@user.com
Password: SuperAdmin2024!
```

### Docker Development:
```
URL:      http://localhost:8080
Email:    demo@user.com
Password: SuperAdmin2024!
```

**Restored from Docker volume with ALL your data:**
- ✅ All 13 users
- ✅ All flows and workflows
- ✅ All connections and configurations
- ✅ Complete production data
- ✅ Custom piece (ada-bmp) visible in BOTH environments

---

## 🔧 **Dev Account** (Auto-created in dev mode)

```
URL:      http://localhost:4200
Email:    dev@ap.com
Password: 12345678
```

**Note:** This account was overwritten during data restoration.

## User Details

| Field | Value |
|-------|-------|
| **Email** | dev@ap.com |
| **Password** | 12345678 |
| **Role** | ADMIN (Platform Administrator) |
| **Status** | ACTIVE |
| **First Name** | Dev |
| **Last Name** | User |

## Notes

- This user is **automatically created** when `AP_ENVIRONMENT=dev` in `.env`
- Created by the dev-seeds script: `packages/server/api/src/app/database/seeds/dev-seeds.ts`
- Has **full administrative access** to the platform
- Can manage all pieces, flows, connections, and settings

## Creating Additional Users

### Via UI:
1. Sign in as `dev@ap.com`
2. Go to Settings → Users
3. Click "Invite User"
4. Enter email and select role

### Via API:
```bash
curl -X POST 'http://localhost:3000/api/v1/authentication/sign-up' \
  -H 'Content-Type: application/json' \
  --data-raw '{
    "email": "newuser@example.com",
    "password": "YourPassword123!",
    "firstName": "First",
    "lastName": "Last"
  }'
```

## Resetting Password

If you forget the password, you can:

1. **Reset via database** (requires PostgreSQL access):
```sql
-- First, get the identity ID
SELECT "identityId" FROM "user" WHERE id = '1Klojxw5DJhYPMvHMTn2K';

-- Then update password (example with bcrypt hash for '12345678')
UPDATE user_identity 
SET password = '$2b$10$...' 
WHERE id = 'XCPk2rra7kab8FhByTaCw';
```

2. **Or recreate the database** (WARNING: deletes all data):
```bash
psql -h localhost -U postgres -c "DROP DATABASE activepieces;"
psql -h localhost -U postgres -c "CREATE DATABASE activepieces;"
./scripts/restart-all.sh  # Dev user will be recreated
```

## Security Notes

⚠️ **IMPORTANT**: These are **development credentials only**!

- **DO NOT use in production**
- Change credentials when deploying to production
- Use strong passwords for production environments
- Consider enabling 2FA for production admin accounts
- Set `AP_ENVIRONMENT=prod` for production deployments

---

**Last Updated**: January 28, 2026 (Docker dev environment added)
