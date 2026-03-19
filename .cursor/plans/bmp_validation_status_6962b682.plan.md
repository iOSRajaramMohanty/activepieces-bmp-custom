---
name: BMP Validation Status
overview: Summary of validated features, pending items, and core file modifications for the BMP code separation project.
todos:
  - id: future-entity-migration
    content: "[FUTURE] Move TypeORM entities from core to extension with database migration strategy"
    status: pending
isProject: false
---

# BMP Code Separation - Validation Status Report

## Validated Features (Working)

### Backend Server


| Feature                                   | Status    | Notes                                         |
| ----------------------------------------- | --------- | --------------------------------------------- |
| Server startup with AP_BMP_ENABLED=true   | Validated | BMP modules registered correctly              |
| Server startup with AP_BMP_ENABLED=false  | Validated | BMP modules skipped                           |
| Organization APIs (/v1/organizations)     | Validated | CRUD operations working                       |
| Organization Environments APIs            | Validated | Initialize, list, update metadata             |
| Super Admin APIs (/v1/super-admin)        | Validated | Platform/tenant management                    |
| Account Switching (SUPER_ADMIN to OWNER)  | Validated | Token exchange working                        |
| Account Switching (OWNER to ADMIN)        | Validated | Platform switch working                       |
| BMP Piece Options (dropdown loading)      | Validated | Fixed organizationEnvironmentMetadata passing |
| App Connections with environment metadata | Validated | ADA_BMP_API_URL correctly injected            |
| Auth Hooks (isPrivilegedRole)             | Validated | SUPER_ADMIN, OWNER, ADMIN checks              |
| Connection Hooks (isBmpPiece)             | Validated | BMP piece detection working                   |


### Frontend Web


| Feature                                          | Status    | Notes                                 |
| ------------------------------------------------ | --------- | ------------------------------------- |
| SUPER_ADMIN default route (/super-admin)         | Validated | BMP route working                     |
| OWNER default route (/owner-dashboard)           | Validated | BMP route working                     |
| ADMIN/MEMBER default route (/projects/.../flows) | Validated | Fixed to use project flows            |
| Platform sidebar (BMP items conditional)         | Validated | Items hidden when BMP disabled        |
| Super Admin sidebar                              | Validated | Shows for privileged roles            |
| Navigation loop prevention                       | Validated | Fixed Suspense boundaries             |
| WebSocket reconnection                           | Validated | Fixed Strict Mode handling            |
| SVG icon rendering (cx attribute)                | Validated | Fixed motion.circle initial state     |
| Loading states (Suspense)                        | Validated | LoadingScreen shown during data fetch |


### React UI SDK


| Feature                            | Status    | Notes                  |
| ---------------------------------- | --------- | ---------------------- |
| SDK bundle build                   | Validated | 12.9 MB bundle created |
| SDK package linking                | Validated | Linked to bmp-fe-web   |
| Angular app compilation            | Validated | No errors              |
| SDK script serving (/sdk/index.js) | Validated | Available via proxy    |
| API proxy configuration            | Validated | /api to localhost:3000 |
| Auto-provision endpoint            | Validated | Token exchange working |


### Custom Piece (ada-bmp)


| Feature                        | Status    | Notes                         |
| ------------------------------ | --------- | ----------------------------- |
| Piece loading (AP_DEV_PIECES)  | Validated | Piece appears in UI           |
| Environment metadata injection | Validated | ADA_BMP_API_URL available     |
| Channel dropdown options       | Validated | Fixed worker metadata passing |


---

## Pending Validation

### Future Phase (Entity Migration)


| Item                                             | Status  | Notes                 |
| ------------------------------------------------ | ------- | --------------------- |
| Move OrganizationEntity to extension             | Pending | After full validation |
| Move OrganizationEnvironmentEntity to extension  | Pending | After full validation |
| Move AccountSwitchingActivityEntity to extension | Pending | After full validation |
| Database migration strategy                      | Pending | Needs planning        |
| Foreign key handling (organizationId)            | Pending | Needs planning        |


### Optional Items (Not Critical)


| Item                               | Status    | Notes                            |
| ---------------------------------- | --------- | -------------------------------- |
| getNodesBounds deprecation warning | Not Fixed | React Flow warning, not blocking |
| path.extname browser warning       | Not Fixed | Third-party dependency, harmless |


---

## Core Files Modified (18 files)

### Server Package (9 files)

1. `packages/server/api/src/app/app.ts` - Conditional BMP module loading
2. `packages/server/api/src/app/app-connection/app-connection-service/app-connection-service.ts` - Hook integration
3. `packages/server/api/src/app/app-connection/app-connection.controller.ts` - isBmpPiece check
4. `packages/server/api/src/app/authentication/authentication-utils.ts` - authHooks usage
5. `packages/server/api/src/app/core/security/v2/authz/authorize.ts` - authHooks usage
6. `packages/server/api/src/app/helper/system-validator.ts` - BMP prop validators
7. `packages/server/api/src/app/helper/system/system-props.ts` - BMP_ENABLED props
8. `packages/server/api/src/app/trigger/app-event-routing/app-event-routing.module.ts` - Type fix
9. `packages/server/worker/src/lib/execute/jobs/execute-property.ts` - organizationEnvironmentMetadata passing

### Web Package (9 files)

1. `packages/web/src/app/components/sidebar/platform/index.tsx` - Conditional BMP items
2. `packages/web/src/app/components/sidebar/super-admin/index.tsx` - BMP check
3. `packages/web/src/app/components/super-admin-layout.tsx` - Suspense wrapper
4. `packages/web/src/app/guards/default-route.tsx` - BMP routing logic
5. `packages/web/src/app/guards/platform-default-route.tsx` - BMP route integration
6. `packages/web/src/app/routes/platform-routes.tsx` - Route filtering
7. `packages/web/src/components/icons/settings2.tsx` - SVG fix
8. `packages/web/src/components/providers/socket-provider.tsx` - Strict Mode fix
9. `packages/web/vite.config.mts` - VITE_BMP_ENABLED env loading

---

## New Core Files Created (3 files)

1. `packages/server/api/src/app/app-connection/connection-hooks.ts` - Hook factory
2. `packages/server/api/src/app/authentication/auth-hooks.ts` - Hook factory
3. `packages/web/src/app/routes/bmp-routes.ts` - BMP route utilities

---

## Extension Files (12 files in packages/extensions/bmp/)

- Package config and main exports
- Server hooks, services, controllers (facade pattern)
- Web routes, components, API, hooks (re-exports)

---

## Root Config Files Modified (4 files)

1. `.env` / `.env.dev` - AP_BMP_ENABLED=true
2. `tsconfig.base.json` - BMP path aliases
3. `bun.lock` - Dependency lock
4. `package-lock.json` - Dependency lock

---

## Summary Statistics


| Category                | Count  |
| ----------------------- | ------ |
| Core files modified     | 18     |
| New core files created  | 3      |
| Extension files         | 12     |
| Root config files       | 4      |
| **Total files changed** | **37** |
| Features validated      | 25+    |
| Pending (future phase)  | 5      |


