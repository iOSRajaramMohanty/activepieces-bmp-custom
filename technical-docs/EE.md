## Activepieces – Enterprise Edition (EE) Technical Guide

This doc focuses on “EE code” in this repo: where it lives, how it’s activated, and the main extension points you’ll likely customize when working with Enterprise/CLOUD capabilities.

### What “EE” means in this repository

EE appears in two places:

- **Server EE implementation**: `packages/server/api/src/app/ee/**`
  - This contains Fastify modules/controllers/services/entities for enterprise/cloud capabilities.
- **EE shared packages**: `packages/ee/**`
  - This contains **shared DTOs/types/contracts** (`packages/ee/shared`) and a small **embed SDK** (`packages/ee/ui/embed-sdk`).

These are **not the same**:

- `packages/ee/shared` is primarily **shared types/contracts** referenced by API/UI.
- `packages/server/api/src/app/ee` is the **actual backend implementation**.

### How EE is enabled (edition selection)

Edition is selected via:

- `AP_EDITION` (default `COMMUNITY`)

The API’s `setupApp()` registers additional modules based on edition:

- `packages/server/api/src/app/app.ts` → `switch (edition) { COMMUNITY | ENTERPRISE | CLOUD }`

High-level behavior:

- **COMMUNITY**:
  - Registers community project + community pieces module
  - No platform-level enterprise modules
- **ENTERPRISE**:
  - Registers a subset of EE modules (authn, project members, custom domains, etc.)
  - Enables queue metrics
- **CLOUD**:
  - Registers the most EE modules (billing/plan, platform admin, app credentials, etc.)

Important: the **code is present** in the repo, but modules only activate depending on the edition at runtime.

### EE hooks & “override points”

EE changes behavior by setting hooks in app boot:

- `flagHooks.set(enterpriseFlagsHooks)`
  - Hook implementation: `packages/server/api/src/app/ee/flags/enterprise-flags.hooks.ts`
  - Used to tailor flags per platform (dedicated domain URLs, theme, auth providers enabled, etc.)
- `projectHooks.set(projectEnterpriseHooks)`
  - Located under `packages/server/api/src/app/ee/projects/**` (see `ee-project-hooks`)

Customization implication:

- If you’re adding a new “enterprise-only capability”, the pattern is often:
  - Add module/service under `packages/server/api/src/app/ee/<domain>/`
  - Add a hook or extend an existing hook when behavior must differ per platform/plan
  - Ensure the module is registered only for `ENTERPRISE`/`CLOUD` editions

### EE backend module map (server/api)

The EE backend folder:

- `packages/server/api/src/app/ee/`

Notable subdomains (high-signal):

- **Authentication (enterprise)**: `packages/server/api/src/app/ee/authentication/**`
  - `enterprise-local-authn/` (email/password enterprise/local auth)
  - `federated-authn/` (3rd party auth providers integration)
  - `saml-authn/` (SAML SSO)
  - `otp/` (one-time passwords)
  - `project-role/` (RBAC middleware & role model)
- **Projects & collaboration**: `packages/server/api/src/app/ee/projects/**`
  - project members, roles
  - project releases + git sync
- **Audit logs**: `packages/server/api/src/app/ee/audit-logs/**`
- **API keys**: `packages/server/api/src/app/ee/api-keys/**`
- **Custom domains**: `packages/server/api/src/app/ee/custom-domains/**`
  - `domain-helper.ts` is used broadly to compute public/internal URLs
- **OAuth apps & platform OAuth**: `packages/server/api/src/app/ee/oauth-apps/**` and `app-connections/platform-oauth2-service.ts`
- **Platform/tenant config**: `packages/server/api/src/app/ee/platform/**`
  - Includes plan/billing/credits and platform admin controllers for CLOUD
- **Templates (platform)**: `packages/server/api/src/app/ee/template/**`

The key wiring is in:

- `packages/server/api/src/app/app.ts`
  - This is where the EE modules are conditionally registered by edition.

### EE shared contracts (`packages/ee/shared`)

The EE shared package:

- `packages/ee/shared/src/index.ts`

What it typically contains:

- DTOs and request/response types for:
  - audit events
  - API keys
  - managed authn
  - OAuth apps
  - signing keys
  - templates
  - project membership / roles / releases

Customization guidance:

- If you add a new EE API endpoint that’s used by the UI, prefer adding request/response types to:
  - `packages/ee/shared` (if EE-only), or
  - `packages/shared` (if it must exist across editions)

### UI embed SDK (`packages/ee/ui/embed-sdk`)

This package provides a small SDK intended for embedding:

- `packages/ee/ui/embed-sdk`

It is also referenced by UI aliases:

- `packages/react-ui/vite.config.mts` aliases `ee-embed-sdk` to the local source.

Customization guidance:

- If you’re building an embedded version of the product, this is the place to centralize embedding contracts and APIs.

### Flags in EE (how UI behavior changes per platform)

EE/CLOUD modifies flags dynamically:

- Base flags: `packages/server/api/src/app/flags/flag.service.ts`
- EE overrides: `packages/server/api/src/app/ee/flags/enterprise-flags.hooks.ts`

Examples of platform-specific modifications:

- Which third-party auth providers appear
- Theme/appearance
- Public URLs (especially under custom domains)
- “show community” / “show powered by”

Customization guidance:

- If you need UI behavior to change per tenant/customer, flags are the cleanest cross-cutting mechanism.

### Custom domains (why this is central in EE)

Custom domains affect:

- API public URL calculation
- Webhook URL prefixes
- SAML ACS URL
- Redirect URLs

These are computed via:

- `packages/server/api/src/app/ee/custom-domains/domain-helper.ts`

Customization guidance:

- If you add endpoints that are used in redirects or webhooks, ensure they use domain helper logic so URLs are correct under dedicated domains.

### EE database migrations

EE includes its own migrations:

- `packages/server/api/src/app/ee/database/migrations/**`

These are separate from core migrations and are applied in the same boot process (TypeORM migration runner).

### Practical customization recipes (EE)

- **Add a new enterprise-only module**
  - Create: `packages/server/api/src/app/ee/<feature>/<feature>.module.ts`
  - Register it in `packages/server/api/src/app/app.ts` under `ENTERPRISE` and/or `CLOUD`
  - Add contracts to `packages/ee/shared` if UI consumes it

- **Add new plan/tenant-level behavior**
  - Put the persistent model/config in `packages/server/api/src/app/ee/platform/**`
  - Expose flags or configuration endpoints
  - Use `enterpriseFlagsHooks` to adapt UI behavior per tenant

- **Add enterprise-only auth behavior**
  - Extend `packages/server/api/src/app/ee/authentication/**`
  - Ensure middlewares (authn/authz/RBAC) are consistent with your new principal/role model

