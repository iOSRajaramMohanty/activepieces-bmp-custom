# Possibility of Removing EE Code for a Purely Open-Source CE Codebase

## Current Architecture

- **Single monorepo** builds one API/frontend that supports three editions via `AP_EDITION`: `COMMUNITY`, `ENTERPRISE`, `CLOUD`.
- **EE code is always compiled**: All EE modules and `@activepieces/ee-shared` are **statically imported** in `app.ts` and elsewhere. The edition only controls which modules are **registered** at runtime (see `switch (edition)` in `app.ts`). The CE bundle still contains EE code.
- **EE surface area**:
  - **Backend**: `packages/server/api/src/app/ee/` (~100+ files), plus `packages/ee/shared` (types, DTOs, events).
  - **Frontend**: Many features under `react-ui` import from `@activepieces/ee-shared` or call EE-only APIs (alerts, billing, project members, git sync, audit logs, API keys, signing keys, OAuth apps, etc.).
  - **References**: Dozens of files in `server-api`, `react-ui`, and `react-ui-sdk` import `@activepieces/ee-shared` or `./ee/...`.

So today, **CE is not “EE-free”**: it’s the same binary with EE code present but not registered when `AP_EDITION=ce`.

---

## Options to Get a Purely Open-Source CE

### Option 1: CE-Only Build (Keep Repo, Exclude EE from CE Bundle)

**Idea:** At build time, when building for CE, do not include any EE packages or EE code in the bundle.

**Approach:**

1. **Stub `@activepieces/ee-shared` for CE**
   - Add a CE-only package (e.g. `packages/ee-shared-ce-stub`) that exports the same symbols as `@activepieces/ee-shared` but with no-op/empty implementations and types.
   - In CE build, resolve `@activepieces/ee-shared` to this stub (e.g. via tsconfig paths or build alias).

2. **Avoid loading EE server modules in CE**
   - In `app.ts`, **dynamically import** all EE modules only when `edition !== ApEdition.COMMUNITY` (e.g. `const { alertsModule } = await import('./ee/alerts/...')`). So CE build + tree-shaking can drop those chunks.
   - Replace any **synchronous** use of EE-only types (e.g. in shared types or event names) with types that live in `@activepieces/shared` or in the CE stub, so the CE app never depends on the real `ee-shared` or `./ee/` implementation.

3. **Frontend**
   - Use dynamic imports or build-time flags so that EE-only routes and features are not imported when building the “CE” frontend. React UI already has some edition checks; you’d need to ensure no static import pulls in EE code for CE build.

**Pros:** One repo, one codebase; CE build becomes a “slim” variant without EE.  
**Cons:** Refactor of `app.ts` and any file that statically imports EE or ee-shared; need to maintain the CE stub and keep it in sync with ee-shared surface.  
**Effort:** Medium–high (backend + frontend build and imports).

---

### Option 2: Fork / Strip EE Code (Remove EE Entirely from This Repo)

**Idea:** Remove all EE code from the repository and ship only CE. No EE modules, no `ee-shared`, no edition switch for EE/Cloud.

**Approach:**

1. **Delete**
   - `packages/ee/` (ee-shared and any EE UI packages).
   - `packages/server/api/src/app/ee/` (all EE backend modules).

2. **Replace or remove**
   - Every file that imports from `@activepieces/ee-shared` or `./ee/...`:
     - Either remove the feature (if EE-only) or reimplement a CE-only version (e.g. project hooks, flags, app events).
   - In `app.ts`: remove all EE imports and all `app.register(…EE modules…)`; register only CE modules and the few shared modules that are needed for CE (project, community pieces, etc.).
   - In `app.ts`: replace usage of `domainHelper`, `rbacMiddleware`, `projectEnterpriseHooks`, `enterpriseFlagsHooks`, etc., with CE no-ops or simple implementations that don’t depend on EE.

3. **Types and events**
   - Move any types/events that CE still needs from `ee-shared` into `@activepieces/shared` (or a small CE-only shared package).
   - Remove or stub Swagger/OpenAPI definitions that reference EE-only DTOs.

4. **Frontend**
   - Remove or replace all EE-only features (billing, project members, git sync, audit logs, API keys, signing keys, OAuth apps, etc.) so the UI never imports EE code.
   - Remove `@activepieces/ee-shared` from the frontend; use only `@activepieces/shared` and CE APIs.

5. **Tests**
   - Remove or skip EE/Cloud-only tests; keep and fix CE tests.

**Pros:** Result is a single, truly open-source CE codebase with no EE code or dependency.  
**Cons:** Large one-time refactor; you maintain a fork that diverges from upstream (if upstream continues to develop both CE and EE).  
**Effort:** High (many files, types, and behaviors to adjust).

---

### Option 3: Keep Current Model, Rely on Runtime Edition Only

**Idea:** Do not change the codebase; keep building one binary and use `AP_EDITION=ce` so that only CE code paths and CE module registration run. EE code remains in the bundle but is not used in CE.

**Pros:** No refactor; “CE as used today” stays as-is.  
**Cons:** The codebase is not “purely” open source: EE code and ee-shared are still present and shipped; license and compliance may still need to consider EE parts if they are not under the same license as CE.

---

## Recommendation Summary

| Goal | Suggested option |
|------|------------------|
| **Purely open-source CE codebase (no EE code at all)** | **Option 2** (fork/strip) or **Option 1** (CE-only build with stubs and dynamic imports). |
| **Minimal change, CE behavior only** | **Option 3** (keep current model, `AP_EDITION=ce`). |
| **Single repo, smaller CE artifact, no EE at runtime** | **Option 1** (CE-only build). |

**Practical takeaway:**  
- **Option 2** is the only way to have a codebase that literally contains zero EE code.  
- **Option 1** is the way to keep one repo but produce a CE build that does not include (or execute) EE logic and can be treated as open-source-only from a distribution perspective.  
- Both require significant refactoring (imports, types, and build configuration). The exact effort depends on how strict you want to be (e.g. removing every EE reference vs. only ensuring CE build and runtime never load EE).

---

## Key Files to Touch (for Option 1 or 2)

- **Backend**
  - `packages/server/api/src/app/app.ts` – all EE imports and registration.
  - Any file under `packages/server/api/src` that imports from `./ee/` or `@activepieces/ee-shared` (auth, flows, project, tables, app-connection, helper/application-events, etc.).
- **Shared types / events**
  - `packages/ee/shared` – either stub (Option 1) or move needed types to `packages/shared` (Option 2).
- **Frontend**
  - `packages/react-ui` – features that import ee-shared or call EE APIs (alerts, billing, members, project release, platform admin, auth forms, etc.).
  - `packages/react-ui-sdk` – ee-import-validator and any ee-shared usage.
- **Build**
  - Resolving `@activepieces/ee-shared` to a CE stub in CE build (Option 1), or removing it entirely (Option 2).

If you tell me which option you prefer (1: CE-only build, 2: strip EE, or 3: keep as-is), I can outline a concrete step-by-step plan (e.g. “Phase 1: app.ts + ee-shared stub”, “Phase 2: server imports”, “Phase 3: react-ui”) and suggest a first patch set.
