# Super Admin: Create New Tenant Feature

## Overview

This feature allows Super Admins to create new tenants (platforms) directly from the Super Admin Dashboard. The newly created tenant will have its own platform owner with `PlatformRole.ADMIN`.

## Key Features

- **Super Admin Exclusive**: Only users with `PlatformRole.SUPER_ADMIN` can create new tenants
- **New Tenant Owner**: Each tenant created gets a new user with `PlatformRole.ADMIN`
- **Complete Identity Setup**: Creates both `UserIdentity` and `User` records for the tenant owner
- **Automatic Platform Association**: Links the owner to the newly created platform

## Implementation Details

### Backend Changes

#### 1. Super Admin Controller (`packages/server/api/src/app/super-admin/super-admin.controller.ts`)

Added a new `POST /tenants` endpoint:

```typescript
app.post('/tenants', {
    config: {
        security: securityAccess.publicPlatform([PrincipalType.USER]),
    },
    schema: {
        body: CreateTenantRequestBody,
        response: {
            [StatusCodes.CREATED]: Platform,
        },
    },
}, async (request, reply) => {
    const { name, ownerEmail, ownerFirstName, ownerLastName, ownerPassword } = request.body;
    request.log.info({ name, ownerEmail }, '[SuperAdmin] Creating new tenant');

    try {
        // Create identity for the owner
        const identity = await identityService.create({
            email: ownerEmail,
            password: ownerPassword,
            firstName: ownerFirstName,
            lastName: ownerLastName,
            trackEvents: true,
            newsLetter: false,
            provider: UserIdentityProvider.EMAIL,
            verified: true,
        })
        
        // Create user with ADMIN role (owner of the platform)
        const owner = await userService.create({
            identityId: identity.id,
            platformId: null, // Will be set when platform is created
            platformRole: PlatformRole.ADMIN, // Platform owner is ADMIN, not SUPER_ADMIN
        })
        
        // Create the platform
        const platform = await platformService.create({
            ownerId: owner.id,
            name,
        })
        
        // CRITICAL: Associate the owner with the platform
        // This sets user.platformId and ensures the owner can log in
        await userService.addOwnerToPlatform({
            id: owner.id,
            platformId: platform.id,
        })

        request.log.info({
            platformId: platform.id,
            ownerId: owner.id,
            ownerEmail,
        }, '[SuperAdmin] Tenant created successfully')

        return reply.status(StatusCodes.CREATED).send(platform)
    } catch (error) {
        request.log.error({ error, name, ownerEmail }, '[SuperAdmin] Failed to create tenant')
        throw error
    }
})
```

**Request Body Schema**:
```typescript
const CreateTenantRequestBody = Type.Object({
    name: Type.String(),
    ownerEmail: Type.String({ format: 'email' }),
    ownerFirstName: Type.String(),
    ownerLastName: Type.String(),
    ownerPassword: Type.String({ minLength: 6 }),
})
```

### Frontend Changes

#### 1. Super Admin API Service (`packages/react-ui/src/lib/super-admin-api.ts`)

Added `createTenant` method:

```typescript
export const superAdminService = {
  // ... existing methods ...
  
  createTenant: async (request: CreateTenantRequestBody) => {
    const response = await api.post<Platform, CreateTenantRequestBody>(
      `${API_URL}/tenants`,
      request
    );
    return response;
  },
};
```

#### 2. Create Tenant Dialog Component (`packages/react-ui/src/app/routes/super-admin/create-tenant-dialog.tsx`)

New React component with form validation:

- **Fields**:
  - Tenant Name (required)
  - Owner Email (required, email format)
  - Owner First Name (required)
  - Owner Last Name (required)
  - Owner Password (required, min 6 characters)

- **Validation**: Uses `react-hook-form` with `zod` schema validation
- **UI**: Uses `shadcn/ui` Dialog and Form components
- **Success Handling**: Closes dialog and triggers parent refresh on successful creation

#### 3. Super Admin Dashboard (`packages/react-ui/src/app/routes/super-admin/index.tsx`)

Updated dashboard header with "Create New Tenant" button:

```tsx
<DashboardPageHeader
  title={t('Super Admin Dashboard')}
  description={t('Manage all platforms, users, and projects across the system.')}
  actions={
    <CreateTenantDialog onTenantCreated={refetch}>
      <Button>
        <Plus className="size-4 mr-2" />
        {t('Create New Tenant')}
      </Button>
    </CreateTenantDialog>
  }
/>
```

## Authorization Flow

1. **Super Admin Check**: The `/tenants` endpoint uses the same `preHandler` hook that checks if the user has `PlatformRole.SUPER_ADMIN`
2. **No EE Changes**: This feature does NOT modify any EE (Enterprise Edition) files
3. **Separate from Invite**: Unlike the "Invite User" feature, this creates a completely new tenant/platform

## Data Flow

```
User clicks "Create New Tenant"
  ↓
Opens CreateTenantDialog with form
  ↓
User fills in tenant details + owner credentials
  ↓
Form validation (zod schema)
  ↓
POST /api/v1/super-admin/tenants
  ↓
Backend creates:
  1. UserIdentity (with email/password)
  2. User (with PlatformRole.ADMIN)
  3. Platform (tenant)
  4. Associates user with platform
  ↓
Returns created Platform
  ↓
Frontend shows success toast
  ↓
Dashboard refreshes platform list
```

## Testing Instructions

### Prerequisites
1. Backend running on `http://localhost:3000`
2. Frontend running on `http://localhost:4300`
3. Logged in as Super Admin (`demo@user.com`)

### Steps to Test

1. **Navigate to Super Admin Dashboard**:
   - Go to user dropdown (top-right)
   - Click "Platform Admin"
   - Click "Super Admin Dashboard" from sidebar

2. **Create a New Tenant**:
   - Click "Create New Tenant" button
   - Fill in the form:
     - Tenant Name: `New Test Tenant`
     - Owner Email: `tenant-owner@example.com`
     - Owner First Name: `Test`
     - Owner Last Name: `Owner`
     - Owner Password: `password123`
   - Click "Create Tenant"

3. **Verify Creation**:
   - Check success toast appears
   - New tenant should appear in the platforms list
   - Owner email should be visible in the platform details

4. **Verify Owner Can Login**:
   - Log out from Super Admin
   - Sign in with:
     - Email: `tenant-owner@example.com`
     - Password: `password123`
   - Navigate to user dropdown
   - Verify "Platform Admin" option is available (confirms `PlatformRole.ADMIN`)

### Expected Results

✅ New tenant created successfully  
✅ Owner can log in with provided credentials  
✅ Owner has `PlatformRole.ADMIN`  
✅ Owner is associated with the new platform  
✅ Super Admin can see the new tenant in the dashboard  

### Verification with cURL

```bash
# Get Bearer token from browser DevTools (Network tab)
TOKEN="your-super-admin-token"

# Create a new tenant
curl -X POST http://localhost:3000/api/v1/super-admin/tenants \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Tenant via cURL",
    "ownerEmail": "curl-tenant@example.com",
    "ownerFirstName": "cURL",
    "ownerLastName": "Test",
    "ownerPassword": "securepass123"
  }'

# Expected response: HTTP 201 with Platform object
```

## Files Modified

### Backend
- `packages/server/api/src/app/super-admin/super-admin.controller.ts` - Added POST /tenants endpoint

### Frontend
- `packages/react-ui/src/lib/super-admin-api.ts` - Added createTenant method
- `packages/react-ui/src/app/routes/super-admin/create-tenant-dialog.tsx` - NEW: Create Tenant dialog component
- `packages/react-ui/src/app/routes/super-admin/index.tsx` - Added "Create New Tenant" button

## Notes

- **No EE Modifications**: As per requirement, no changes were made to EE (Enterprise Edition) files
- **Super Admin Exclusive Power**: This feature is exclusively for Super Admins, separate from regular Platform Admin capabilities
- **Platform Owner Role**: New tenant owners get `PlatformRole.ADMIN`, NOT `PlatformRole.SUPER_ADMIN`
- **Identity Provider**: Uses `UserIdentityProvider.EMAIL` for the owner's authentication
- **Verified by Default**: Owner accounts are created with `verified: true`

## Troubleshooting

### Issue: "Something went wrong, please try again later" when logging in
**Cause**: The tenant owner's user account was not properly associated with the platform (missing `platformId`).

**Solution**: 
1. **For new tenants**: Create a fresh tenant using the fixed version - the user will be properly associated.
2. **For existing broken tenants**: You need to manually update the database:
   ```sql
   -- Find the user and platform
   SELECT u.id as user_id, u.email, p.id as platform_id, p.name 
   FROM "user" u 
   LEFT JOIN user_identity ui ON u."identityId" = ui.id
   LEFT JOIN platform p ON p."ownerId" = u.id
   WHERE ui.email = 'test_r_bmp@yopmail.com';
   
   -- Update the user's platformId
   UPDATE "user" SET "platformId" = '<platform_id_from_above>' 
   WHERE id = '<user_id_from_above>';
   ```

### Issue: "Cannot find name 'UserIdentityProvider'"
**Solution**: Import from `@activepieces/shared`:
```typescript
import { UserIdentityProvider } from '@activepieces/shared'
```

### Issue: "Object literal may only specify known properties, and 'status' does not exist"
**Solution**: Remove `status` field from `userService.create()` call. The service automatically sets `status: UserStatus.ACTIVE`.

### Issue: Backend not compiling
**Solution**: 
1. Check for TypeScript errors: `tail -f backend.log | grep error`
2. Kill and restart: `pkill -f run-dev.sh && ./run-dev.sh`
3. Wait for compilation (can take 30-60 seconds)

### Issue: Backend crashes with "Daemon closed the connection"
**Solution**: This is a common Nx watch mode issue. Simply restart:
```bash
./scripts/stop-all.sh
./run-dev.sh
# Wait 30-60 seconds for compilation
```

## Success Criteria

✅ Backend compiles without errors  
✅ Frontend compiles without errors  
✅ Super Admin can access "Create New Tenant" button  
✅ Form validation works correctly  
✅ New tenant is created with all required data  
✅ Owner can log in with provided credentials  
✅ Owner has correct `PlatformRole.ADMIN` role  
✅ No modifications to EE files  

---

**Status**: ✅ **COMPLETE AND TESTED**

**Last Updated**: January 13, 2026  
**Implementation Date**: January 13, 2026
