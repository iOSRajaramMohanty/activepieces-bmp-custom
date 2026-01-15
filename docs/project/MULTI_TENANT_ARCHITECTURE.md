# Multi-Tenant Architecture Documentation

## Table of Contents
1. [Overview](#overview)
2. [Role Hierarchy](#role-hierarchy)
3. [Account Structure](#account-structure)
4. [Project Visibility Rules](#project-visibility-rules)
5. [Invitation Flow](#invitation-flow)
6. [Account Switching](#account-switching)
7. [Implementation Details](#implementation-details)
8. [API Endpoints](#api-endpoints)
9. [Database Schema](#database-schema)

---

## Overview

The Multi-Tenant system provides a hierarchical structure for managing organizations, users, and projects with strict role-based access control.

### Key Principles
- **Super Admin**: Manages all tenants (owners), no personal projects
- **Owner (Tenant)**: Manages their organization, no personal projects
- **Admin**: Manages operators/members, personal projects visible to all team members
- **Operator/Member**: Works under admin's projects, can create flows

---

## Role Hierarchy

```
SUPER_ADMIN (Top Level)
    │
    ├── Owner 1 (Tenant)
    │   ├── Admin 1
    │   │   ├── Operator 1
    │   │   ├── Operator 2
    │   │   └── Member 1
    │   └── Admin 2
    │       ├── Operator 3
    │       └── Member 2
    │
    └── Owner 2 (Tenant)
        └── Admin 3
            └── Member 3
```

### Role Definitions

#### 1. SUPER_ADMIN
- **Capabilities**:
  - Create new tenants (owners)
  - View all tenants and their data
  - Switch into any owner's account
  - Delete tenants
  - View system-wide statistics
- **Restrictions**:
  - No personal projects
  - Cannot create flows directly
  - Cannot be invited to any tenant

#### 2. OWNER (Tenant)
- **Capabilities**:
  - Invite admins to their platform
  - View all projects and flows in their platform
  - View flows created by operators/members under admin projects
  - Manage platform settings
  - **Switch between admin accounts** (view as admin)
  - Switch back to owner account
- **Restrictions**:
  - No personal projects
  - Cannot create flows directly
  - Cannot be invited by super admin (created by super admin)

#### 3. ADMIN
- **Capabilities**:
  - Invite operators and members
  - Create personal projects (visible to all team members)
  - Create flows in their projects
  - View flows created by operators/members in their projects
- **Restrictions**:
  - Cannot invite other admins
  - Personal projects are automatically visible to operators/members

#### 4. OPERATOR
- **Capabilities**:
  - Create flows in admin's projects
  - View admin's projects and flows
  - View flows created by other operators/members
- **Restrictions**:
  - Cannot create projects
  - Cannot invite users

#### 5. MEMBER
- **Capabilities**:
  - Create flows in admin's projects
  - View admin's projects and flows
  - View flows created by other operators/members
- **Restrictions**:
  - Cannot create projects
  - Cannot invite users

---

## Account Structure

### Super Admin Account
```
Super Admin Account
├── No Personal Projects
├── Tenant Management Dashboard
│   ├── View All Tenants
│   ├── Create New Tenant
│   ├── Delete Tenant
│   └── Switch to Tenant Account
└── System Statistics
```

### Owner (Tenant) Account
```
Owner Account
├── No Personal Projects
├── Platform Dashboard
│   ├── View All Projects (Admin Projects)
│   ├── View All Flows
│   │   ├── Admin Created Flows
│   │   └── Operator/Member Created Flows
│   ├── Invite Admin
│   └── Platform Settings
└── Admin Management
    └── View/Manage Admins
```

### Admin Account
```
Admin Account
├── Personal Projects (Visible to Operators/Members)
│   ├── Project 1
│   │   ├── Admin's Flows
│   │   ├── Operator 1's Flows
│   │   ├── Operator 2's Flows
│   │   └── Member 1's Flows
│   └── Project 2
│       └── ...
├── Invite Operators/Members
└── Team Management
```

### Operator/Member Account
```
Operator/Member Account
├── View Admin's Projects
│   ├── Project 1
│   │   ├── View All Flows
│   │   └── Create New Flow
│   └── Project 2
│       └── ...
└── My Created Flows
```

---

## Project Visibility Rules

### Rule 1: Super Admin
- **Can See**: All tenant platforms, all projects, all flows
- **Cannot Create**: Personal projects or flows
- **Access Method**: Switch into owner account

### Rule 2: Owner (Tenant)
- **Can See**: 
  - All admin projects in their platform
  - All flows in admin projects
  - Flows created by operators/members
- **Cannot Create**: Personal projects or flows
- **Default Visibility**: All admin projects are visible

### Rule 3: Admin
- **Can See**: 
  - Their own personal projects (automatically visible to operators/members)
  - All flows in their projects (including operator/member created flows)
- **Can Create**: Personal projects and flows
- **Default Visibility**: Personal projects are automatically visible to all operators/members in the platform

### Rule 4: Operator/Member
- **Can See**: 
  - All admin's personal projects
  - All flows in admin's projects
  - Flows created by other operators/members
- **Can Create**: Flows in admin's projects
- **Cannot Create**: Projects
- **Default Visibility**: All admin's personal projects are visible

### Project Type Rules
```
PERSONAL Projects:
- Created by: Admin only
- Visible to: Owner, Admin (creator), All Operators/Members in platform
- Purpose: Team collaboration workspace

TEAM Projects:
- Not used in this architecture (all projects are admin's personal projects)
```

---

## Invitation Flow

### Flow 1: Super Admin → Owner (Tenant)
```
1. Super Admin creates tenant via UI
   - Provides: Tenant name, Owner email, Owner name, Password
   - System creates:
     - New Platform (Tenant)
     - Owner User (PlatformRole: ADMIN)
     - Owner Identity
     - NO Personal Project
   
2. Owner receives credentials
   - Can login immediately
   - Sees empty platform dashboard
```

### Flow 2: Owner → Admin
```
1. Owner invites admin
   - Email: admin@example.com
   - Platform Role: ADMIN
   - Type: PLATFORM invitation
   
2. Admin receives invitation email
   - Clicks invitation link
   - Accepts invitation (status: ACCEPTED)
   
3. Admin signs up
   - Creates account with email/password
   - System creates:
     - User with PlatformRole: ADMIN
     - Personal Project (default: "Admin's Project")
     - Project is automatically visible to all platform members
```

### Flow 3: Admin → Operator/Member
```
1. Admin invites operator/member
   - Email: operator@example.com
   - Platform Role: OPERATOR or MEMBER
   - Type: PLATFORM invitation
   
2. Operator/Member receives invitation email
   - Clicks invitation link
   - Accepts invitation (status: ACCEPTED)
   
3. Operator/Member signs up
   - Creates account with email/password
   - System creates:
     - User with PlatformRole: OPERATOR or MEMBER
     - NO Personal Project
     - Can immediately see admin's projects
     - Can create flows in admin's projects
```

---

## Account Switching

### Super Admin → Owner Account
```
1. Super Admin navigates to Tenant Management
2. Selects a tenant
3. Clicks "Switch to Tenant Account"
4. System:
   - Stores current super admin session
   - Switches context to owner account
   - Shows owner's dashboard
5. Super Admin can:
   - View owner's projects
   - View all flows
   - See flows created by operators/members
   - Cannot create projects/flows (owner restrictions)
```

### Owner → Admin Account (Optional)
```
1. Owner navigates to Admin Management
2. Selects an admin
3. Clicks "View as Admin" (if needed)
4. System switches context to admin account
5. Owner can see admin's perspective
```

### Back to Super Admin
```
1. User clicks "Back to Super Admin" button
2. System:
   - Restores super admin session
   - Returns to super admin dashboard
   - Clears tenant context
```

### Back to Owner Account
```
1. Owner (switched to admin) clicks "Back to Owner Account" button
2. System:
   - Restores owner session
   - Returns to owner dashboard
   - Clears admin context
```

### Implementation Details for Switching
```typescript
// Session Storage for Super Admin → Owner
{
  originalPrincipal: SuperAdminPrincipal,
  switchedTo: OwnerPrincipal,
  switchType: 'SUPER_ADMIN_TO_OWNER'
}

// Session Storage for Owner → Admin
{
  originalPrincipal: OwnerPrincipal,
  switchedTo: AdminPrincipal,
  switchType: 'OWNER_TO_ADMIN'
}

// API Endpoints
POST /v1/super-admin/switch-to-tenant/:tenantId
POST /v1/super-admin/switch-back
POST /v1/platform/switch-to-admin/:adminId
POST /v1/platform/switch-back-to-owner
```

---

## Implementation Details

### 1. Project Creation Rules

#### Admin Creates Project
```typescript
// When admin creates a project
{
  type: ProjectType.PERSONAL,
  ownerId: adminUserId,
  platformId: platformId,
  visibility: 'PLATFORM_WIDE' // Automatic
}

// Result: Project visible to:
// - Owner
// - Admin (creator)
// - All Operators/Members in platform
```

#### Operator/Member Cannot Create Projects
```typescript
// Validation in project creation endpoint
if (user.platformRole === PlatformRole.OPERATOR || 
    user.platformRole === PlatformRole.MEMBER) {
  throw new ActivepiecesError({
    code: ErrorCode.AUTHORIZATION,
    params: { message: 'Operators and Members cannot create projects' }
  })
}
```

### 2. Project Visibility Filter

#### For Owner
```typescript
// Owner sees all admin projects
const projects = await projectService.list({
  platformId: owner.platformId,
  // Filter: All PERSONAL projects owned by admins
  filter: {
    type: ProjectType.PERSONAL,
    ownerRole: PlatformRole.ADMIN
  }
})
```

#### For Admin
```typescript
// Admin sees their own projects
const projects = await projectService.list({
  platformId: admin.platformId,
  ownerId: admin.id // Only their projects
})
```

#### For Operator/Member
```typescript
// Operator/Member sees all admin's personal projects
const projects = await projectService.list({
  platformId: operator.platformId,
  // Filter: All PERSONAL projects owned by admins in same platform
  filter: {
    type: ProjectType.PERSONAL,
    ownerRole: PlatformRole.ADMIN,
    platformId: operator.platformId
  }
})
```

### 3. Flow Creation Rules

#### Admin Creates Flow
```typescript
// Admin can create flows in their projects
if (user.platformRole === PlatformRole.ADMIN) {
  // Check: user owns the project
  const project = await projectService.getOneOrThrow(projectId)
  if (project.ownerId !== user.id) {
    throw new ActivepiecesError({
      code: ErrorCode.AUTHORIZATION,
      params: { message: 'Admin can only create flows in their own projects' }
    })
  }
}
```

#### Operator/Member Creates Flow
```typescript
// Operator/Member can create flows in admin's projects
if (user.platformRole === PlatformRole.OPERATOR || 
    user.platformRole === PlatformRole.MEMBER) {
  // Check: project is admin's personal project in same platform
  const project = await projectService.getOneOrThrow(projectId)
  const projectOwner = await userService.getOneOrFail({ id: project.ownerId })
  
  if (projectOwner.platformRole !== PlatformRole.ADMIN ||
      project.platformId !== user.platformId ||
      project.type !== ProjectType.PERSONAL) {
    throw new ActivepiecesError({
      code: ErrorCode.AUTHORIZATION,
      params: { message: 'Can only create flows in admin personal projects' }
    })
  }
}
```

### 4. Super Admin Account Switching

#### Switch to Tenant
```typescript
async switchToTenant(tenantId: string, superAdminId: string) {
  // Get tenant owner
  const platform = await platformService.getOneOrThrow(tenantId)
  const owner = await userService.getOneOrFail({ id: platform.ownerId })
  
  // Create switched session
  const switchedSession = {
    originalPrincipal: superAdminPrincipal,
    switchedTo: ownerPrincipal,
    switchType: 'SUPER_ADMIN_TO_OWNER',
    timestamp: Date.now()
  }
  
  // Return owner's authentication token
  return authenticationUtils.getProjectAndToken({
    userId: owner.id,
    platformId: platform.id,
    projectId: null // Owner has no projects
  })
}
```

#### Switch Back
```typescript
async switchBackToSuperAdmin(switchedSession: SwitchedSession) {
  // Restore super admin session
  return authenticationUtils.getProjectAndToken({
    userId: switchedSession.originalPrincipal.id,
    platformId: null, // Super admin has no platform
    projectId: null
  })
}
```

---

## API Endpoints

### Super Admin Endpoints

#### Create Tenant
```
POST /v1/super-admin/tenants
Body: {
  name: string,
  ownerEmail: string,
  ownerFirstName: string,
  ownerLastName: string,
  ownerPassword: string
}
Response: Platform
```

#### List All Tenants
```
GET /v1/super-admin/tenants
Response: SeekPage<Platform>
```

#### Switch to Tenant Account
```
POST /v1/super-admin/tenants/:tenantId/switch
Response: AuthenticationResponse (Owner's token)
```

#### Switch Back to Super Admin
```
POST /v1/super-admin/switch-back
Response: AuthenticationResponse (Super Admin's token)
```

#### View Tenant Projects
```
GET /v1/super-admin/tenants/:tenantId/projects
Response: SeekPage<Project>
```

### Owner Endpoints

#### Invite Admin
```
POST /v1/user-invitations
Body: {
  email: string,
  type: "PLATFORM",
  platformRole: "ADMIN"
}
Response: UserInvitationWithLink
```

#### View All Projects
```
GET /v1/projects
Response: SeekPage<Project>
// Returns all admin personal projects
```

#### View All Flows
```
GET /v1/flows
Response: SeekPage<Flow>
// Returns all flows in admin projects
```

### Admin Endpoints

#### Create Personal Project
```
POST /v1/projects
Body: {
  displayName: string,
  type: "PERSONAL"
}
Response: Project
// Automatically visible to all operators/members
```

#### Invite Operator/Member
```
POST /v1/user-invitations
Body: {
  email: string,
  type: "PLATFORM",
  platformRole: "OPERATOR" | "MEMBER"
}
Response: UserInvitationWithLink
```

### Operator/Member Endpoints

#### View Admin Projects
```
GET /v1/projects
Response: SeekPage<Project>
// Returns all admin personal projects
```

#### Create Flow in Admin Project
```
POST /v1/flows
Body: {
  projectId: string, // Must be admin's personal project
  displayName: string,
  ...
}
Response: Flow
```

---

## Database Schema

### User Table
```sql
CREATE TABLE "user" (
  id VARCHAR PRIMARY KEY,
  "platformId" VARCHAR,
  "platformRole" VARCHAR NOT NULL, -- SUPER_ADMIN, ADMIN, OPERATOR, MEMBER
  "identityId" VARCHAR NOT NULL,
  status VARCHAR,
  created TIMESTAMP,
  updated TIMESTAMP
);

-- Constraints:
-- SUPER_ADMIN: platformId = NULL
-- OWNER: platformRole = ADMIN, platformId = their platform
-- ADMIN: platformRole = ADMIN, platformId = owner's platform
-- OPERATOR/MEMBER: platformRole = OPERATOR/MEMBER, platformId = owner's platform
```

### Platform Table
```sql
CREATE TABLE platform (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  "ownerId" VARCHAR NOT NULL, -- References user.id (ADMIN role)
  created TIMESTAMP,
  updated TIMESTAMP
);
```

### Project Table
```sql
CREATE TABLE project (
  id VARCHAR PRIMARY KEY,
  "displayName" VARCHAR NOT NULL,
  type VARCHAR NOT NULL, -- PERSONAL (only type used)
  "ownerId" VARCHAR NOT NULL, -- References user.id (ADMIN role)
  "platformId" VARCHAR NOT NULL,
  created TIMESTAMP,
  updated TIMESTAMP
);

-- Rules:
-- Only ADMIN can create projects
-- Projects are type PERSONAL
-- Projects are visible to all platform members
```

### Flow Table
```sql
CREATE TABLE flow (
  id VARCHAR PRIMARY KEY,
  "projectId" VARCHAR NOT NULL, -- References project.id
  "displayName" VARCHAR NOT NULL,
  "createdBy" VARCHAR NOT NULL, -- References user.id
  created TIMESTAMP,
  updated TIMESTAMP
);

-- Rules:
-- ADMIN can create flows in their projects
-- OPERATOR/MEMBER can create flows in admin's projects
-- Owner can view all flows
```

### User Invitation Table
```sql
CREATE TABLE user_invitation (
  id VARCHAR PRIMARY KEY,
  email VARCHAR NOT NULL,
  type VARCHAR NOT NULL, -- PLATFORM
  "platformId" VARCHAR NOT NULL,
  "platformRole" VARCHAR, -- ADMIN, OPERATOR, MEMBER
  status VARCHAR NOT NULL, -- PENDING, ACCEPTED
  created TIMESTAMP,
  updated TIMESTAMP
);
```

---

## Summary

### Key Features
1. ✅ Super Admin creates tenants (owners)
2. ✅ Owner invites admins
3. ✅ Admin invites operators/members
4. ✅ Admin's personal projects visible to all team members
5. ✅ Operators/members can create flows in admin's projects
6. ✅ Owner can view all projects and flows
7. ✅ Super Admin can switch into owner accounts
8. ✅ No personal projects for Super Admin and Owner

### Restrictions
- ❌ Super Admin: No personal projects, no flows
- ❌ Owner: No personal projects, no flows
- ❌ Operator/Member: No projects, can only create flows
- ✅ Admin: Can create projects and flows

### Visibility Matrix

| Role | Own Projects | Admin Projects | Admin Flows | Operator/Member Flows |
|------|-------------|----------------|-------------|------------------------|
| Super Admin | ❌ | ✅ (via switch) | ✅ (via switch) | ✅ (via switch) |
| Owner | ❌ | ✅ | ✅ | ✅ |
| Admin | ✅ | ✅ (own only) | ✅ | ✅ |
| Operator/Member | ❌ | ✅ | ✅ | ✅ |

---

## Next Steps

1. Implement project visibility filters
2. Implement account switching for Super Admin
3. Update invitation flow to enforce role hierarchy
4. Add validation for project/flow creation based on roles
5. Update UI to reflect role-based capabilities
6. Add tests for all role-based scenarios
