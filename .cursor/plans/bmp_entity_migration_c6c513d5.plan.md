---
name: BMP Entity Migration
overview: Keep BMP-specific TypeORM entity definitions in core (due to TypeScript rootDir constraints) but mark them as BMP-specific and protect with .gitattributes. No database impact.
todos:
  - id: create-entities-folder
    content: Create entities folder in extension with index.ts
    status: cancelled
  - id: copy-entity-files
    content: Copy 3 entity files to extension and fix imports
    status: cancelled
  - id: update-tsconfig
    content: Add path alias for entities
    status: cancelled
  - id: update-db-connection
    content: Update database-connection.ts to import from extension
    status: cancelled
  - id: update-service-imports
    content: Update all service files that import entities
    status: cancelled
  - id: remove-original-files
    content: Remove original entity files from core
    status: cancelled
  - id: validate-migration
    content: TypeScript check, server startup, API tests
    status: completed
isProject: false
---

# BMP Entity Migration Plan - REVISED

## Status: COMPLETED WITH REVISED APPROACH

## Original Plan

Move 3 BMP-specific TypeORM entity files from core to the extensions folder.

## What Was Attempted

1. Created `packages/extensions/bmp/src/server/entities/` directory
2. Copied all 3 entity files with local `database-common.ts`
3. Added path alias `@activepieces/ext-bmp/entities` to tsconfig
4. Updated all service imports to use the new path

## Why Full Migration Failed

**TypeScript `rootDir` Constraint**: The server package's TypeScript configuration (`packages/server/api/tsconfig.app.json`) sets `rootDir: "."` which prevents importing TypeScript files from outside the package directory during compilation.

Error encountered:

```
TS2307: Cannot find module '@activepieces/ext-bmp/entities' or its corresponding type declarations.
```

Even with path aliases configured, the TypeScript compiler cannot include files outside `rootDir` in the compilation unit.

## Final Solution: Keep Entities in Core

Instead of moving entities, we:

1. **Added documentation comments** to each entity file marking them as BMP-specific
2. **Verified `.gitattributes` protection** - entities are covered by existing patterns:
  - `packages/server/api/src/app/organization/** merge=ours`
  - `packages/server/api/src/app/account-switching/** merge=ours`
3. **Validated all APIs work correctly**

## Final Entity Locations


| Entity                           | Location                                                                             | Protection                  |
| -------------------------------- | ------------------------------------------------------------------------------------ | --------------------------- |
| `OrganizationEntity`             | `packages/server/api/src/app/organization/organization.entity.ts`                    | `.gitattributes merge=ours` |
| `OrganizationEnvironmentEntity`  | `packages/server/api/src/app/organization/organization-environment.entity.ts`        | `.gitattributes merge=ours` |
| `AccountSwitchingActivityEntity` | `packages/server/api/src/app/account-switching/account-switching-activity.entity.ts` | `.gitattributes merge=ours` |


## Why This Is Acceptable

1. **Entities are just schema definitions** - No business logic, just column/index definitions
2. **Database unchanged** - Moving entity files would NOT change the database
3. **Protected from upstream** - `.gitattributes` prevents overwriting during merges
4. **All business logic IS in extensions** - Controllers, services, hooks are properly separated

## Validation Results

All APIs pass:

- GET /v1/super-admin/platforms ✅
- GET /v1/super-admin/tenants ✅
- GET /v1/super-admin/stats ✅
- POST /v1/super-admin/tenants/switch ✅
- GET /v1/organizations ✅
- POST /v1/organizations/check-admin ✅

## Lessons Learned

TypeORM entities in a monorepo must remain within the same TypeScript compilation unit as the code that uses them. Cross-package entity imports require either:

1. Pre-compiled packages (npm/dist)
2. Shared rootDir configuration
3. Keeping entities in the consuming package

For BMP, option 3 with `.gitattributes` protection is the pragmatic choice.