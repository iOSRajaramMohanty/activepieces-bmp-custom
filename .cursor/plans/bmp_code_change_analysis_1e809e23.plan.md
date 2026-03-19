---
name: BMP Code Change Analysis
overview: Comprehensive analysis of all BMP-related code changes across the Activepieces codebase, categorizing them by type (new files vs modifications), impact level (core changes vs additive), and providing a migration strategy to isolate custom code from upstream.
todos:
  - id: review-analysis
    content: Review the categorized changes and confirm accuracy
    status: completed
  - id: decide-approach
    content: "Choose isolation approach: extension package or fork maintenance"
    status: completed
  - id: create-extension-structure
    content: Create packages/extensions/bmp/ directory structure
    status: completed
  - id: move-react-ui-sdk
    content: Move react-ui-sdk to packages/extensions/react-ui-sdk/
    status: completed
  - id: configure-tsconfig-paths
    content: Update tsconfig.base.json with extension path aliases
    status: completed
  - id: setup-gitattributes
    content: Add .gitattributes with merge=ours for BMP files
    status: completed
  - id: enable-merge-driver
    content: Enable git merge.ours.driver
    status: completed
  - id: migrate-organization-module
    content: Move organization entities, services, controllers to extension (deferred)
    status: pending
  - id: migrate-web-components
    content: Move super-admin, organization UI components to extension (deferred)
    status: pending
  - id: implement-core-hooks
    content: Add hook points in core files for extension integration (deferred)
    status: pending
isProject: false
---

# BMP Code Change Analysis and Isolation Plan

## Executive Summary

Your BMP integration consists of **86 new files** (including 40 in react-ui-sdk) and **102 modified source files** across `packages/server`, `packages/web`, `packages/shared`, and the new `packages/react-ui-sdk`. The changes implement:

1. **Multi-tenant Organization System** - Organizations, environments (Dev/Staging/Production), and environment-specific metadata
2. **Extended User Roles** - Added `SUPER_ADMIN` and `OWNER` roles to the existing `ADMIN`, `OPERATOR`, `MEMBER` hierarchy
3. **BMP Piece Integration** - Custom ada-bmp piece with environment-aware API URL configuration
4. **Account Switching** - Stack-based session management for Super Admin → Owner → Admin navigation
5. **UI Customizations** - New routes, sidebars, dialogs for organizations and super admin management
6. **React UI SDK** - New package for embedding Activepieces UI in external Angular applications (bmp-fe-web)

---

## Category 1: New Files (Low Conflict Risk)

These are **purely additive** and rarely cause merge conflicts:

### Server - Organization Module (6 files)

- `packages/server/api/src/app/organization/organization.entity.ts`
- `packages/server/api/src/app/organization/organization.service.ts`
- `packages/server/api/src/app/organization/organization.controller.ts`
- `packages/server/api/src/app/organization/organization.module.ts`
- `packages/server/api/src/app/organization/organization-environment.entity.ts`
- `packages/server/api/src/app/organization/organization-environment.service.ts`

### Server - Super Admin Module (2 files)

- `packages/server/api/src/app/super-admin/super-admin.controller.ts`
- `packages/server/api/src/app/super-admin/super-admin.module.ts`

### Server - Account Switching (2 files)

- `packages/server/api/src/app/account-switching/account-switching-activity.entity.ts`
- `packages/server/api/src/app/account-switching/account-switching-activity.service.ts`

### Server - Database Migrations (7 files)

- `1768457416000-AddAccountSwitchingActivity.ts`
- `1769126400000-AddOrganizationTables.ts`
- `1769127000000-AddOrganizationToUserInvitation.ts`
- `1769127500000-AddMetadataToOrganizationEnvironment.ts`
- `1769127600000-AddProjectIdToOrganization.ts`
- `1769127700000-AddMissingOrganizationEnvironments.ts`
- `1771241733000-AddClientIdToUser.ts`

### Shared Types (3 files)

- `packages/shared/src/lib/organization/index.ts`
- `packages/shared/src/lib/organization/organization.ts`
- `packages/shared/src/lib/organization/organization.request.ts`

### Web - New Pages/Components (12 files)

- `packages/web/src/app/routes/platform/organizations/index.tsx`
- `packages/web/src/app/routes/platform/organizations/environment-metadata-dialog.tsx`
- `packages/web/src/app/routes/platform/organizations/organization-environments-section.tsx`
- `packages/web/src/app/routes/platform/super-admin/index.tsx`
- `packages/web/src/app/routes/platform/super-admin/create-tenant-dialog.tsx`
- `packages/web/src/app/routes/platform/owner-dashboard/index.tsx`
- `packages/web/src/app/components/super-admin-layout.tsx`
- `packages/web/src/app/components/switch-back-button.tsx`
- `packages/web/src/app/components/sidebar/super-admin/index.tsx`
- `packages/web/src/app/connections/ada-bmp-environment-select.tsx`
- `packages/web/src/app/guards/platform-default-route.tsx`
- `packages/web/src/features/platform-admin/api/organization-api.ts`
- `packages/web/src/features/platform-admin/api/organization-hooks.ts`
- `packages/web/src/hooks/super-admin-hooks.ts`
- `packages/web/src/lib/super-admin-api.ts`

### Custom Piece (entire directory)

- `packages/pieces/custom/ada-bmp/`* - All files are new

### React UI SDK Package (entire directory - 40 files)

This is a **completely new package** you created for embedding Activepieces UI in external Angular applications:

**Purpose**: Provides Angular components that wrap React UI components from Activepieces, enabling integration into external apps (like bmp-fe-web).

**Key Files**:

- `packages/react-ui-sdk/package.json` - Package definition (MIT licensed, CE only)
- `packages/react-ui-sdk/src/index.ts` - Main exports
- `packages/react-ui-sdk/src/angular/react-ui-wrapper.component.ts` - Angular wrapper
- `packages/react-ui-sdk/src/angular/react-ui-wrapper.module.ts` - Angular module
- `packages/react-ui-sdk/src/react/flow-builder.tsx` - Flow builder component
- `packages/react-ui-sdk/src/react/dashboard.tsx` - Dashboard component
- `packages/react-ui-sdk/src/react/connections.tsx` - Connections component
- `packages/react-ui-sdk/src/react/runs.tsx` - Runs component
- `packages/react-ui-sdk/src/react/templates.tsx` - Templates component
- `packages/react-ui-sdk/src/providers/sdk-providers.tsx` - React providers
- `packages/react-ui-sdk/src/utils/api-config.ts` - API configuration
- `packages/react-ui-sdk/src/stubs/ee-embed-sdk-stub.ts` - EE exclusion stubs
- `packages/react-ui-sdk/scripts/validate-ee-exclusion.ts` - License compliance validation

**Documentation**:

- `packages/react-ui-sdk/README.md` - Usage guide
- `packages/react-ui-sdk/BUILD_GUIDE.md` - Build instructions
- `packages/react-ui-sdk/BMP_OVERRIDES.md` - CSS customization for bmp-fe-web
- `packages/react-ui-sdk/NPM_PACKAGE_USAGE.md` - NPM publishing guide
- `packages/react-ui-sdk/BACKEND_SETUP.md` - Backend configuration

**Configuration**:

- `packages/react-ui-sdk/esbuild.config.js` - ESBuild config
- `packages/react-ui-sdk/webpack.config.js` - Webpack config
- `packages/react-ui-sdk/tsconfig.json` - TypeScript config
- `packages/react-ui-sdk/project.json` - Nx project config

**tsconfig.base.json addition**:

```json
"@activepieces/react-ui-sdk": ["packages/react-ui-sdk/src/index.ts"]
```

**Key Features**:

- CE (Community Edition) only - explicitly excludes EE features
- MIT licensed for external distribution
- Wraps `packages/web` React components for Angular consumption
- Provides `data-ap-view` attributes for CSS scoping in host apps
- Supports Flow Builder, Dashboard, Connections, Runs, Templates views

---

## Category 2: Core Modifications (High Conflict Risk)

These are the files that will **conflict on every merge**:

### Critical Server Files (Modifications to Core Logic)


| File                           | Change Type | BMP-Specific Logic                                                                                                      |
| ------------------------------ | ----------- | ----------------------------------------------------------------------------------------------------------------------- |
| `app-connection-service.ts`    | **Heavy**   | `isBmpPiece()` helper, environment metadata fetch, `organizationEnvironmentService` integration, BMP API URL validation |
| `piece-metadata-controller.ts` | **Heavy**   | `isBmpPiece()` helper, `organizationEnvironmentMetadata` injection, `extractEnvironmentFromConnection()`                |
| `user-service.ts`              | **Heavy**   | Role-based filtering (OWNER logic), organization meta info, `clientId`/`organizationId` fields                          |
| `database-connection.ts`       | **Medium**  | Added `OrganizationEntity`, `OrganizationEnvironmentEntity`, `AccountSwitchingActivityEntity`                           |
| `app.ts`                       | **Light**   | Added `organizationModule`, `superAdminModule` registration                                                             |
| `user-entity.ts`               | **Light**   | Added `organizationId`, `clientId` columns                                                                              |


### Critical Shared Files


| File                  | Change Type | BMP-Specific Logic                                                            |
| --------------------- | ----------- | ----------------------------------------------------------------------------- |
| `user.ts`             | **Medium**  | Added `SUPER_ADMIN`, `OWNER` enum values; `organizationId`, `clientId` fields |
| `engine-operation.ts` | **Light**   | Added `environmentMetadata` and `organizationEnvironmentMetadata` properties  |


### Critical Web Files


| File                        | Change Type | BMP-Specific Logic                                                                     |
| --------------------------- | ----------- | -------------------------------------------------------------------------------------- |
| `authentication-session.ts` | **Heavy**   | Account switching stack (`pushSwitchSession`, `popSwitchSession`, `getSwitchBackText`) |
| `platform-routes.tsx`       | **Medium**  | Added routes for `/super-admin`, `/owner-dashboard`, `/platform/organizations`         |
| `invite-user-dialog.tsx`    | **Heavy**   | Organization selection, environment selection for ADMIN invites                        |
| `sidebar-user.tsx`          | **Medium**  | Switch back button logic for account switching                                         |


---

## Category 3: Minor/Logging Modifications (Low Risk)

These are small additions that are unlikely to conflict but should be tracked:

- `create-edit-connection-dialog.tsx` - OAuth2 logging for debugging
- `cloud-oauth2-service.ts` - Logging statements
- Various UI components - Mostly style/layout tweaks

---

## Key BMP Concepts Implemented

### 1. Organization Hierarchy

```
Platform
  └── Organization (e.g., "ABC")
        ├── Environment: Dev
        │     ├── Admin User (project owner)
        │     ├── metadata: { ADA_BMP_API_URL: "..." }
        │     └── Project
        ├── Environment: Staging
        │     └── ...
        └── Environment: Production
              └── ...
```

### 2. Role Hierarchy

```
SUPER_ADMIN (cross-platform)
  └── OWNER (tenant owner, per platform)
        └── ADMIN (environment admin, has personal project)
              ├── OPERATOR
              └── MEMBER
```

### 3. Environment Metadata Flow

```
Organization → OrganizationEnvironment → metadata.ADA_BMP_API_URL
  ↓
Connection validation (app-connection-service.ts)
  ↓
Engine execution (piece-helper.ts injects to process.env)
  ↓
BMP Piece reads process.env.ADA_BMP_API_URL
```

---

## Files to Track for Each Feature

### Feature: BMP Piece Environment Integration

- `packages/server/api/src/app/app-connection/app-connection-service/app-connection-service.ts`
- `packages/server/api/src/app/pieces/metadata/piece-metadata-controller.ts`
- `packages/server/engine/src/lib/helper/piece-helper.ts`
- `packages/shared/src/lib/automation/engine/engine-operation.ts`

### Feature: Organization/Multi-tenant

- `packages/server/api/src/app/organization/*` (all new files)
- `packages/shared/src/lib/organization/*` (all new files)
- `packages/server/api/src/app/database/database-connection.ts`
- `packages/server/api/src/app/user/user-service.ts`
- `packages/server/api/src/app/user/user-entity.ts`
- `packages/shared/src/lib/core/user/user.ts`

### Feature: Super Admin & Account Switching

- `packages/server/api/src/app/super-admin/*` (all new files)
- `packages/server/api/src/app/account-switching/*` (all new files)
- `packages/web/src/lib/authentication-session.ts`
- `packages/web/src/app/routes/platform/super-admin/*`
- `packages/web/src/app/routes/platform/owner-dashboard/*`

### Feature: User Invitation with Organization

- `packages/server/api/src/app/user-invitations/user-invitation.service.ts`
- `packages/server/api/src/app/user-invitations/user-invitation.entity.ts`
- `packages/web/src/features/members/components/invite-user/invite-user-dialog.tsx`
- `packages/shared/src/lib/management/invitations/index.ts`

### Feature: React UI SDK (for bmp-fe-web integration)

- `packages/react-ui-sdk/*` (entire new package - 40 files)
- `tsconfig.base.json` - Added path alias `@activepieces/react-ui-sdk`

---

## Recommended Isolation Strategy

### Proposed Extension Folder Structure

```
packages/extensions/
├── bmp/                              # BMP-specific extension
│   ├── server/                       # Server-side BMP code
│   │   ├── organization/             # Organization module
│   │   │   ├── organization.entity.ts
│   │   │   ├── organization.service.ts
│   │   │   ├── organization.controller.ts
│   │   │   ├── organization.module.ts
│   │   │   ├── organization-environment.entity.ts
│   │   │   └── organization-environment.service.ts
│   │   ├── super-admin/              # Super admin module
│   │   │   ├── super-admin.controller.ts
│   │   │   └── super-admin.module.ts
│   │   ├── account-switching/        # Account switching
│   │   │   ├── account-switching-activity.entity.ts
│   │   │   └── account-switching-activity.service.ts
│   │   ├── hooks/                    # Hook implementations
│   │   │   ├── connection.hooks.ts   # BMP connection validation
│   │   │   ├── user.hooks.ts         # User metadata enrichment
│   │   │   └── engine.hooks.ts       # Environment metadata injection
│   │   └── index.ts                  # Extension entry point
│   ├── web/                          # Web/UI BMP code
│   │   ├── routes/
│   │   │   ├── organizations/
│   │   │   ├── super-admin/
│   │   │   └── owner-dashboard/
│   │   ├── components/
│   │   │   ├── super-admin-layout.tsx
│   │   │   ├── switch-back-button.tsx
│   │   │   └── ada-bmp-environment-select.tsx
│   │   ├── hooks/
│   │   │   └── super-admin-hooks.ts
│   │   └── api/
│   │       ├── organization-api.ts
│   │       └── organization-hooks.ts
│   ├── shared/                       # Shared BMP types
│   │   └── organization/
│   │       ├── organization.ts
│   │       └── organization.request.ts
│   ├── migrations/                   # BMP database migrations
│   ├── package.json
│   └── tsconfig.json
│
└── react-ui-sdk/                     # Shared React UI SDK (can be used by any extension)
    ├── src/
    │   ├── angular/                  # Angular wrappers
    │   ├── react/                    # React component wrappers
    │   ├── providers/
    │   ├── stubs/
    │   ├── types/
    │   ├── utils/
    │   └── index.ts
    ├── scripts/
    ├── package.json
    ├── tsconfig.json
    ├── esbuild.config.js
    ├── BUILD_GUIDE.md
    ├── BMP_OVERRIDES.md
    └── README.md
```

### Approach: Create `packages/extensions/` with BMP and SDK

1. **Create `packages/extensions/bmp/`** - Move all BMP-specific server/web code
2. **Create `packages/extensions/react-ui-sdk/`** - Move SDK (shared, reusable by other extensions)
3. **Create hook system in core** for:
  - Connection validation (`validateBmpConnection`)
  - User metadata enrichment (`enrichUserMetadata`)
  - Engine environment injection (`injectEnvironmentMetadata`)
4. **Use feature flag** `AP_BMP_ENABLED` to conditionally load BMP extension
5. **Add `.gitattributes`** with `merge=ours` for extension paths:

```
   packages/extensions/** merge=ours
   packages/pieces/custom/** merge=ours
   

```

### tsconfig.base.json Path Updates

```json
{
  "paths": {
    "@activepieces/ext-bmp": ["packages/extensions/bmp/src/index.ts"],
    "@activepieces/ext-bmp/*": ["packages/extensions/bmp/src/*"],
    "@activepieces/react-ui-sdk": ["packages/extensions/react-ui-sdk/src/index.ts"],
    "@activepieces/piece-ada-bmp": ["packages/pieces/custom/ada-bmp/src/index.ts"]
  }
}
```

### Files That Must Stay Modified in Core

Even with hooks, some minimal core changes are unavoidable:

1. `**user.ts**` (shared) - `SUPER_ADMIN`, `OWNER` enum values
2. `**user-entity.ts**` - `organizationId`, `clientId` columns
3. `**database-connection.ts**` - Entity registration (can be dynamic via extension loader)
4. `**app.ts**` - Module registration (conditional based on `AP_BMP_ENABLED`)
5. `**engine-operation.ts**` - Type definitions for metadata fields

### Benefits of This Structure

1. **Clear separation** - BMP code is isolated from core Activepieces
2. **Reusable SDK** - `react-ui-sdk` can be used independently or by other extensions
3. **Minimal merge conflicts** - Only hook registration points in core
4. **Feature flag control** - BMP features can be enabled/disabled via environment
5. **Easy maintenance** - All custom code in one predictable location

---

## Next Steps

1. Review this analysis to confirm all changes are correctly categorized
2. Confirm the extension folder structure above
3. Implement in phases:
  - Phase 1: Create `packages/extensions/` directory structure
  - Phase 2: Move `react-ui-sdk` to `packages/extensions/react-ui-sdk/`
  - Phase 3: Create hook infrastructure in core
  - Phase 4: Move BMP server modules to `packages/extensions/bmp/server/`
  - Phase 5: Move BMP web components to `packages/extensions/bmp/web/`
  - Phase 6: Configure feature flag and dynamic loading
  - Phase 7: Update `.gitattributes` for merge protection
  - Phase 8: Test full system with extension enabled/disabled

