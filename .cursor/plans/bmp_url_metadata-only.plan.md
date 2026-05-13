---
name: ""
overview: ""
todos: []
isProject: false
---

# BMP API URL: metadata-only (no `.env` for `ADA_BMP_API_URL` / `AP_SANDBOX_PROPAGATED_ENV_VARS`)

## User goal

- Do **not** rely on `ADA_BMP_API_URL` in `.env`.
- Do **not** rely on `AP_SANDBOX_PROPAGATED_ENV_VARS=ADA_BMP_API_URL` in `.env`.
- Tenant owners configure BMP endpoints via **Organization → Environments → metadata** (`ADA_BMP_API_URL` per environment, with org-level merge as implemented in the piece).

## Why `AP_SANDBOX_PROPAGATED_ENV_VARS` exists (unrelated to “tenant config”)

Flow steps that run inside the worker **sandbox** get a **restricted** environment. The worker builds that env in `[packages/server/worker/src/lib/execute/create-sandbox-for-job.ts](packages/server/worker/src/lib/execute/create-sandbox-for-job.ts)`: it only copies host `process.env` keys that are **listed** in `AP_SANDBOX_PROPAGATED_ENV_VARS` (comma-separated names).

So historically:

- If ada-bmp’s `**getBaseUrl` fell back to `process.env.ADA_BMP_API_URL`**, that variable had to exist on the **worker** host **and** be **propagated** into the sandbox, or the piece would not see it during execution.
- Hence docs like `[docs/project/ADA_BMP_SETUP.md](docs/project/ADA_BMP_SETUP.md)` recommended both `ADA_BMP_API_URL` and `AP_SANDBOX_PROPAGATED_ENV_VARS=ADA_BMP_API_URL`.

That pairing is a **workaround for env-based URL resolution**, not a requirement of BMP metadata design.

## After moving to metadata-only URLs

- Runtime URL comes from `**fetchMetadata` → merged metadata → `getBaseUrl(metadata, auth)`** (no host `.env` read).
- The sandbox does **not** need `ADA_BMP_API_URL` in its env for BMP URL discovery.
- Therefore `**AP_SANDBOX_PROPAGATED_ENV_VARS` should not need to include `ADA_BMP_API_URL`** for ada-bmp (unless some other code path still reads that env inside the sandbox—grep after implementation).

**Note:** `AP_SANDBOX_PROPAGATED_ENV_VARS` remains a **general Activepieces** feature for other vars you intentionally expose to sandboxed code; it is not BMP-specific.

## Implementation (unchanged intent, aligned with no `.env`)

1. **Remove** `process.env.ADA_BMP_API_URL` fallback from `[getBaseUrl](packages/pieces/custom/ada-bmp/src/lib/common/config.ts)` so URL is **only** from resolved metadata (or throw the existing configuration error).
2. **Align connection validation** with piece merge: in `[engineValidateAuth](packages/server/api/src/app/app-connection/app-connection-service/app-connection-service.ts)`, merge org-level `ADA_BMP_API_URL` when the selected environment row has no URL (same semantics as `fetchMetadata`).
3. **Update** `[ada-bmp` `auth.ts](packages/pieces/custom/ada-bmp/src/lib/common/auth.ts)` comments: validate-time URL comes from `**environmentMetadata` injected into `process.env` by the engine** for that job—not from requiring a tenant `.env` file.
4. **Docs cleanup**: update `[docs/project/ADA_BMP_SETUP.md](docs/project/ADA_BMP_SETUP.md)` (and any Heroku/helm snippets that hard-code `AP_SANDBOX_PROPAGATED_ENV_VARS=ADA_BMP_API_URL`) to describe metadata-first setup and mark env-based URL + propagation as **legacy / optional dev-only** if we keep a gated escape hatch, or remove those sections if we drop escape hatch entirely.
5. **Bump** `@activepieces/piece-ada-bmp` patch version after `getBaseUrl` change.
6. `**npm run lint-dev`** before done.

## Optional (explicit user preference: no `.env`)

- **Do not** add `ADA_BMP_ALLOW_ENV_URL` unless you later need a single-tenant dev escape hatch; user preference is strict metadata.

## Verification

- Flow execution with sandbox: BMP actions use URLs from org/env metadata only; worker `.env` has no `ADA_BMP_API_URL` and `AP_SANDBOX_PROPAGATED_ENV_VARS` does not list it → still works.
- Connection save without metadata URL → clear validation error.
- Org-only URL + empty Production row → save succeeds after merge in `engineValidateAuth`.

