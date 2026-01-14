## Activepieces – Technical Architecture & Customization Guide

This doc explains **how the monorepo is structured**, **how a request becomes a flow run**, and the most important **customization points** (backend, UI, pieces, and deployment/runtime config).

### High-level architecture

Activepieces is split into four major layers:

- **UI (builder/admin)**: `packages/react-ui`
- **API server (Fastify)**: `packages/server/api`
- **Worker runtime (BullMQ consumers + engine process orchestration)**: `packages/server/worker`
- **Engine (flow execution + sandbox + pieces runtime)**: `packages/engine`

Data stores / infra dependencies (typical):

- **Postgres**: persistence (TypeORM, migrations)
- **Redis**: job queues + distributed locks + pub/sub/socket adapter
- **Nginx** (in Docker image): serves UI + reverse proxies `/api` to the backend

### Repository layout

At the top-level:

- **Nx monorepo**: `nx.json`, per-project `project.json`
- **TypeScript base config**: `tsconfig.base.json` (defines path aliases)
- **Docker**: `Dockerfile`, `docker-compose.yml`, `docker-compose.dev.yml`
- **Product docs**: `docs/` (Mintlify/MDX docs)

Key packages:

- `packages/react-ui`: Vite + React UI
- `packages/server/api`: Fastify app, modules, controllers, TypeORM, auth, flows, pieces metadata, etc.
- `packages/server/worker`: BullMQ consumers + engine process manager + piece cache managers
- `packages/engine`: executes flows and piece steps; contains sandbox logic
- `packages/shared`: shared DTOs/types/utilities used across UI/server/worker/engine
- `packages/pieces`: built-in community pieces + framework (a large portion of the repo)
- `packages/cli`: developer tooling (create piece/action/trigger, sync pieces, etc.)

### Build & dev workflow (Nx + Bun)

The workspace is configured for **Nx** and uses **Bun** as the package manager (`nx.json` → `cli.packageManager=bun`).

Common scripts (from root `package.json`):

- `npm run dev`: runs UI + API + engine together via Nx
- `npm run serve:frontend`: `nx serve react-ui` (Vite dev server)
- `npm run serve:backend`: `nx serve server-api` (Fastify app)
- `npm run serve:engine`: `nx serve engine`

In local UI dev, Vite proxies `/api` to the backend:

- `packages/react-ui/vite.config.mts` proxies `/api/*` → `http://127.0.0.1:3000/*`

### Runtime boot sequence (server-api)

Entrypoint:

- `packages/server/api/src/main.ts`

The API can start in **two roles** depending on `AP_CONTAINER_TYPE`:

- **App role**: runs app modules/routes; runs DB migrations on startup
- **Worker role**: starts worker websocket logic (flow worker)

Boot phases:

- `main.ts`
  - sets TZ to UTC
  - if “app role”, runs DB migrations under a Redis distributed lock
  - calls `setupServer()`
  - listens on `0.0.0.0:3000`
  - calls `appPostBoot()` and/or `workerPostBoot()` depending on role
- `packages/server/api/src/app/server.ts`
  - creates a base Fastify instance (CORS, multipart, raw body, health module)
  - calls `setupApp(app)` if app role
  - calls `setupWorker(app)` if worker role
- `packages/server/api/src/app/app.ts`
  - registers most REST modules, auth middleware, websocket adapter, job consumers, etc.
  - selects extra modules based on `system.getEdition()` (CE vs EE/CLOUD)
- `packages/server/api/src/app/worker.ts`
  - initializes the flow worker client (connects to API over websockets)

### Worker + queue + engine chain (the “execution path”)

This is the most important end-to-end flow to understand for customization:

1. **UI** calls the **API** (REST/WebSocket) to create/update flows, run flows, manage connections, etc.
2. **API** enqueues work into Redis-backed **BullMQ** queues (and also runs some synchronous operations).
3. **Worker runtime** consumes jobs from BullMQ and coordinates execution.
4. Worker runtime spawns (or reuses) **engine worker processes** to execute “engine operations”.
5. Engine process sends results/progress back to the worker runtime; worker persists state and emits updates.

Concrete code anchors:

- **BullMQ worker**: `packages/server/worker/src/lib/consume/job-queue-worker.ts`
  - A BullMQ `Worker<JobData>` consumes from a queue name (global or per-platform)
  - Supports rate limiting + job schema migration + delaying/resuming flows
- **Flow worker orchestrator**: `packages/server/worker/src/lib/flow-worker.ts`
  - Connects to app via Socket.IO (`appSocket`)
  - Fetches worker settings, warms piece cache, starts BullMQ consumers
- **Engine process pool**: `packages/server/worker/src/lib/compute/process/engine-process-manager.ts`
  - Manages N worker processes, provision/reuse, timeouts, memory/exit handling
  - Recreates workers when dev pieces change (“generation” invalidation)
- **Local engine IPC**: `packages/server/worker/src/lib/compute/engine-runner-socket.ts`
  - Runs a Socket.IO server on port `12345` (path `/worker/ws`)
  - Engine worker processes connect and exchange “engine operations” and responses
- **Engine entrypoint**: `packages/engine/src/main.ts`
  - Initializes a “worker socket” client if `WORKER_ID` is set
  - Reports uncaught errors back over the socket and exits with codes
- **Engine internals**: `packages/engine/src/lib/**`
  - Flow execution: `lib/handler/flow-executor.ts` and related executors
  - Pieces loading: `lib/helper/piece-loader.ts`
  - Sandbox implementations: `lib/core/code/*`

### Editions: COMMUNITY vs ENTERPRISE vs CLOUD (high-level)

Server-side edition is selected via:

- `AP_EDITION` (default is `COMMUNITY`)

Edition gates which modules/controllers are registered inside `setupApp()`:

- `packages/server/api/src/app/app.ts` → `switch (edition) { COMMUNITY | ENTERPRISE | CLOUD }`

EE/CLOUD also set additional hooks:

- `flagHooks.set(enterpriseFlagsHooks)` and `projectHooks.set(projectEnterpriseHooks)`

See the dedicated EE doc for more detail: `./EE.md`.

### Configuration model (environment variables)

The API reads env vars via the `system` helper:

- `packages/server/api/src/app/helper/system/system.ts`

It uses default values plus `AP_*` env vars:

- `packages/server/shared/src/lib/system-props.ts`

Important controlling env vars to know first:

- **AP_CONTAINER_TYPE**: `WORKER`, `APP`, `WORKER_AND_APP` (default `WORKER_AND_APP`)
- **AP_EDITION**: `COMMUNITY`, `ENTERPRISE`, `CLOUD` (default `COMMUNITY`)
- **AP_ENVIRONMENT**: dev/prod (default `prod`)
- **Postgres**: `AP_POSTGRES_*` or `AP_POSTGRES_URL`
- **Redis**: `AP_REDIS_*` or `AP_REDIS_URL`
- **Execution mode**: `AP_EXECUTION_MODE` (sandbox behavior; see engine & worker)
- **Dev pieces**: `AP_DEV_PIECES` (comma-separated), triggers dev hot-building behavior

### Database layer (TypeORM + migrations)

The API uses TypeORM migrations:

- Migrations: `packages/server/api/src/app/database/migration/**`
- Migration datasource: `packages/server/api/src/app/database/migration-data-source.ts`
- Nx command helper: `packages/server/api/project.json` target `db-migration`

In app mode, migrations are applied on startup under a Redis distributed lock:

- `packages/server/api/src/main.ts`

Customization guidance:

- If you add/modify TypeORM entities, generate a migration and keep schema drift clean.

### Pieces system (how integrations are added)

Pieces are TypeScript packages under:

- `packages/pieces/community/**` (huge set of integrations)
- `packages/pieces/community/framework/**` (pieces framework)

During development, you can run only specific pieces:

- Set `AP_DEV_PIECES=slack,google-sheets,...`
- The worker watches those piece folders and rebuilds them on file changes:
  - `packages/server/worker/src/lib/cache/pieces/development/dev-pieces-builder.ts`

Customization options:

- **Add/modify pieces**: implement under `packages/pieces/community/<piece-name>/`
- **Add your own piece package**: use the CLI scaffolding from `packages/cli`:
  - `npm run create-piece`
  - `npm run create-action`
  - `npm run create-trigger`

### UI customization (react-ui)

Project:

- `packages/react-ui`

Key dev behavior:

- Vite dev server proxies `/api` to backend (`:3000`)
- UI title/favicon are templated for production builds via Vite HTML plugin:
  - `packages/react-ui/vite.config.mts`

Customization strategies:

- Feature flags are delivered from the API via flags endpoints; see `flagService`:
  - `packages/server/api/src/app/flags/flag.service.ts`
- Some EE-only UI building blocks are wired as aliases even in UI tooling:
  - `packages/react-ui/vite.config.mts` contains aliases for `@activepieces/ee-shared` and `ee-embed-sdk`

### Deployment model (Docker)

Local prod-like deployment:

- `docker-compose.yml` runs:
  - `activepieces` container (image includes UI + API)
  - `postgres`
  - `redis`
  - `.env` file supplies `AP_*` variables (not committed here)

Docker image is a multi-stage build (`Dockerfile`):

- Builds `react-ui` and `server-api`
- Bundles engine artifacts and server artifacts into the runtime image
- Runs Nginx to serve UI and reverse proxy API

### Common customization playbook (recommended)

If you want to “customize Activepieces”, decide which layer you’re changing:

- **Branding/UI/UX**: `packages/react-ui`
- **Business logic / API behavior**: `packages/server/api/src/app/**`
- **Execution semantics / performance / sandboxing**: `packages/server/worker/**` and `packages/engine/**`
- **Integrations**: `packages/pieces/**`

For backend customization, the safest approach is usually:

1. Add a new module/controller under `packages/server/api/src/app/<domain>/`
2. Register it in `setupApp()` in `packages/server/api/src/app/app.ts`
3. Add DTOs/types in `packages/shared` (so UI + server share contracts)
4. Add DB entities/migrations if needed
5. Expose UI changes that call the new endpoint

