# Fork scope: editions, extensions, and what you can trim

Use this with [docs/chatbot-feature.md](./chatbot-feature.md) and the inventory plan. **Edition and ship-set are your decisions**; this file maps where those decisions live in code.

## Editions (`AP_EDITION`)

Runtime behavior is gated by edition and flags (e.g. `ApEdition`, `ApFlagId` in `@activepieces/shared`, consumed in `packages/web` and `packages/server/api`).

| Rough target | Implication |
|----------------|---------------|
| **Community (CE)** self-host | Default OSS paths; EE-only routes and UI should stay unreachable or stubbed. |
| **Enterprise (EE)** self-host | [`packages/server/api/src/app/ee/`](../packages/server/api/src/app/ee/) active: SSO, SAML, SCIM, platform admin patterns, appearance when plan allows. |
| **Cloud** | Branding, billing, and cloud-only services as implemented upstream. |

Removing EE is a **cross-cutting project** (server, web, shared contracts, embed validators)—not a single-folder delete. See internal checklists under `.cursor/plans/` if your fork tracks that work.

## Server: enterprise tree

- **Path:** [`packages/server/api/src/app/ee/`](../packages/server/api/src/app/ee/)
- **Role:** Enterprise-only modules (see [`packages/server/AGENTS.md`](../packages/server/AGENTS.md)).
- **Trim:** Only after imports, feature flags, and tests are reconciled for a CE-only build.

## Extensions (`packages/extensions/*`)

These **are** npm workspaces (root [`package.json`](../package.json) includes `packages/extensions/*`).

| Package | Role | Trim when |
|---------|------|-----------|
| **react-ui-sdk** | Webpack/browser bundle of embedded UI | You never embed Activepieces UI in a host app. |
| **bmp** | BMP-specific integration | You do not ship BMP. |
| **chatbot-sdk** | Embeddable chatbot widget | You do not expose the public chatbot API from third-party origins. |
| **ee-embed-sdk** (if present) | Enterprise embed | CE-only SKU with no embed product. |

## `packages/react-ui` (parallel UI tree)

- **Path:** [`packages/react-ui/`](../packages/react-ui/)
- **Role:** Fork / BMP overlay; **not** a root workspace package, but still referenced by `tsconfig.base.json`, i18next parser, embed SDK aliases, and some Docker/Heroku docs—see [`packages/react-ui/README.md`](../packages/react-ui/README.md).
- **Trim:** Do not remove without following that README’s migration list.

## `packages/web` vs `packages/react-ui`

- **Primary product UI:** `packages/web` (Vite app, Nx `web` project).
- **Overlay / alternate entry:** `packages/react-ui` when your fork maintains dual UI trees.

Align **Dockerfile / CI** `nx run …` project names with whichever UI you actually build (`web`, `react-ui`, or both).

## Community pieces

- **Path:** `packages/pieces/community/*`
- **Trim:** Only for a **slim private fork** (high maintenance: version bumps, licensing, CI).

## Local cruft (safe to ignore in git)

See root [`.gitignore`](../.gitignore): build dirs, `.turbo`, `.nx`, `node_modules`, Playwright output, and **`.cursor/plans/`** for IDE-generated plans.
