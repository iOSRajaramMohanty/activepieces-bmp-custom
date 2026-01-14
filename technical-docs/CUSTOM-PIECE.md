## Create your own custom Piece and use it in the existing UI (Community Edition / ignore EE)

This doc is an **end-to-end, local-dev** guide for:

- Creating a new **custom piece package** inside this repo
- Making it appear in the **existing UI** (without relying on any EE-only features)
- Executing flows that combine **your piece + existing pieces**, and understanding the runtime path

---

### Goal: keep the UI in “CE mode”

Run with **Community Edition** so EE-specific pages/behaviors are not enabled:

- Set `AP_EDITION=COMMUNITY`

(The UI codebase contains some EE integrations, but most EE behavior is gated by flags/edition. For piece development, you don’t need EE.)

---

### How pieces show up in the UI in this repo (important mental model)

In local development, pieces can come from two places:

- **Official pieces synced into the DB** (default behavior; fetched from Activepieces cloud by the server)
- **Dev pieces loaded from your local `dist/` output**, enabled by `AP_DEV_PIECES`

Key behavior:

- When you set `AP_DEV_PIECES=your-piece-name`, the API reads your locally-built piece metadata from:
  - `dist/packages/pieces/**/your-piece-name`
- The worker also treats dev pieces specially (skips caching and rebuilds/watches them).

So the *fastest* local workflow is:

1. Create your piece in `packages/pieces/custom/<your-piece-name>`
2. Set `AP_DEV_PIECES=<your-piece-name>` and run the normal dev stack
3. The UI will list your piece, and flow runs will execute it via the worker+engine

---

### Prerequisites

- Postgres + Redis running locally (or via `docker-compose.dev.yml`)
- Node + Bun installed (this repo uses Nx + Bun)

---

### Step 1: Create a new custom piece package

Use the repo CLI (interactive):

```bash
npm run create-piece
```

When prompted:

- **pieceType**: choose `custom` (recommended to keep your work separate from `community`)
- **pieceName**: use kebab-case (example: `acme-demo`)
- **packageName**: default is fine (example: `@activepieces/piece-acme-demo`)

This generates:

- `packages/pieces/custom/<pieceName>/`
- Nx project name: `pieces-<pieceName>`
- A starter `src/index.ts` using `createPiece(...)`

---

### Step 2: Add an action and/or trigger to your piece

Add an action:

```bash
npm run create-action
```

- **pieceName**: the folder name (example: `acme-demo`)
- Then give an action display name + description

Add a trigger (webhook or polling):

```bash
npm run create-trigger
```

---

### Step 3: Wire your action/trigger into `src/index.ts`

The generator creates the piece, but you must **register** actions/triggers so the UI can show them.

Open:

- `packages/pieces/custom/<pieceName>/src/index.ts`

Import your action/trigger files and add them to the arrays:

```ts
import { createPiece, PieceAuth } from '@activepieces/pieces-framework';
import { myAction } from './lib/actions/my-action';
import { myTrigger } from './lib/triggers/my-trigger';

export const acmeDemo = createPiece({
  displayName: 'Acme Demo',
  auth: PieceAuth.None(), // Use Step 3.1 if you want a reusable token-based connection
  minimumSupportedRelease: '0.36.1',
  logoUrl: 'https://cdn.activepieces.com/pieces/acme-demo.png',
  authors: [],
  actions: [myAction],
  triggers: [myTrigger],
});
```

Notes:

- The **piece package name** comes from `packages/pieces/custom/<pieceName>/package.json` (`name` + `version`).
- The UI discovers actions/triggers by reading the piece metadata produced by `createPiece(...)`.

---

### Step 3.1 (Optional but “Slack-like”): Add a reusable connection using a user token

If you want the UI to create a **Connection** (like Slack does) and your actions/triggers reuse it, you must define **piece auth** (not `PieceAuth.None()`).

For “use my user token to authenticate against my server API”, the most common patterns are:

- **Simple token**: `PieceAuth.SecretText(...)`
- **Token + extra fields** (base URL, tenant, etc.): `PieceAuth.CustomAuth(...)` with `props`

#### Option A: Simple token connection (`PieceAuth.SecretText`)

```ts
import { createPiece, PieceAuth } from '@activepieces/pieces-framework';
import { myAction } from './lib/actions/my-action';

export const myServerAuth = PieceAuth.SecretText({
  displayName: 'User Token',
  description: 'Paste your user token for My Server.',
  required: true,
  // Recommended: validate by calling your API
  validate: async ({ auth }) => {
    // return { valid: true } if token works; else { valid: false, error: '...' }
    return { valid: true };
  },
});

export const acmeDemo = createPiece({
  displayName: 'Acme Demo',
  auth: myServerAuth,
  minimumSupportedRelease: '0.36.1',
  logoUrl: 'https://cdn.activepieces.com/pieces/acme-demo.png',
  authors: [],
  actions: [myAction],
  triggers: [],
});
```

How it behaves:

- The UI will prompt users to create a **connection** for your piece by entering the token once.
- Your action/trigger code receives the token via `context.auth`.

#### Option B: Token + base URL (`PieceAuth.CustomAuth`)

```ts
import { createPiece, PieceAuth, Property } from '@activepieces/pieces-framework';

export const myServerAuth = PieceAuth.CustomAuth({
  description: 'Connect to My Server using your user token.',
  required: true,
  props: {
    baseUrl: Property.ShortText({
      displayName: 'Base URL',
      required: true,
      description: 'Example: https://api.mycompany.com',
    }),
    token: PieceAuth.SecretText({
      displayName: 'User Token',
      required: true,
    }),
  },
  validate: async ({ auth }) => {
    return { valid: true };
  },
});
```

---

### Step 3.2 (Slack-like): Add a Custom API Call action that reuses the token

If you want a Slack-style **Custom API Call** action in your piece (so users can call your endpoints after they connect), use `createCustomApiCallAction` from `@activepieces/pieces-common`.

Important detail (based on the implementation in this repo):

- `baseUrl(auth)` is mainly used when the user enters a **relative path** (e.g. `/users/me`).
- The user can also paste a **full URL** (e.g. `https://server2.mycompany.com/users/me`).
- Your `authMapping` still injects `Authorization: Bearer <token>` in both cases.

That means your “one token → multiple servers” requirement is supported: users can call different servers by using a **full URL**.

#### Example A: token-only connection (`PieceAuth.SecretText`)

```ts
import { createCustomApiCallAction } from '@activepieces/pieces-common';
import { PieceAuth } from '@activepieces/pieces-framework';

export const myServerAuth = PieceAuth.SecretText({
  displayName: 'User Token',
  required: true,
});

export const myServerCustomApiCall = createCustomApiCallAction({
  // Default base URL (used for relative paths like /me)
  baseUrl: () => 'https://api.mycompany.com',
  auth: myServerAuth,
  // Saved connection -> injected headers
  authMapping: async (auth) => ({
    Authorization: `Bearer ${auth}`,
  }),
});
```

Finally, register it in your piece `src/index.ts` by adding it to the `actions: [...]` array.


### Step 4: Make your piece appear in the UI (AP_DEV_PIECES)

Set these env vars (minimum recommended for CE dev):

- `AP_EDITION=COMMUNITY`
- `AP_CONTAINER_TYPE=WORKER_AND_APP` (default; runs app+worker in the same `server-api` process)
- `AP_ENVIRONMENT=dev`
- `AP_DEV_PIECES=<pieceName>`

Example:

```bash
export AP_EDITION=COMMUNITY
export AP_ENVIRONMENT=dev
export AP_DEV_PIECES=acme-demo
```

Then start the dev stack:

```bash
npm run dev
```

What should happen:

- The server’s “worker mode” starts a watcher that builds your piece and rebuilds on changes.
- The API includes your dev piece metadata (from `dist/`) in piece listing endpoints.
- The UI can now select your piece in the flow builder.

---

### Step 5: Build flows using your piece + existing pieces

In the UI:

1. Create a new flow
2. Pick a trigger:
   - If you want an easy “always works” trigger, use the built-in **Webhook** piece (official).
3. Add action steps:
   - Add your custom piece action
   - Add other existing official actions (e.g., Slack, HTTP, etc.)
4. Save / publish and run the flow

#### If an “existing piece” is missing in your local UI

Normally, official pieces are synced by the backend automatically. If you don’t see a piece you expect:

- Option A (recommended): let the backend sync official pieces (default `AP_PIECES_SYNC_MODE=OFFICIAL_AUTO`)
- Option B (local-only): add the piece to `AP_DEV_PIECES` and build it from the repo:
  - `AP_DEV_PIECES=acme-demo,webhook,slack`
  - The worker will build/watch all listed pieces (this can be slower with many pieces)

---

### How your piece code is executed (end-to-end runtime path)

When a flow uses your piece and you run it:

1. **UI** calls the **API** to create/update/publish the flow and to request a run.
2. **API** enqueues work into **Redis/BullMQ** queues.
3. **Worker runtime** consumes the job and prepares “engine operations”.
4. Worker runtime fetches piece metadata (including your dev piece) and spawns/reuses an **engine worker process**.
5. The **engine** loads the piece module from the piece’s `directoryPath` and executes:
   - Trigger logic (for polling/webhook handling)
   - Action `run()` functions for each step
6. Results/progress come back to the worker runtime and are persisted/returned to the API/UI.

The important implication:

- Your piece’s `run()` code executes in the **engine process**, not in the UI and not directly in the API process.

---

---

### Using your token connection inside actions (how to call your server APIs)

Your action `run()` receives the connection in `context.auth`.

#### If you used `PieceAuth.SecretText`

`context.auth` is a **string token**.

```ts
import { createAction } from '@activepieces/pieces-framework';
import { httpClient, HttpMethod, AuthenticationType } from '@activepieces/pieces-common';

export const pingMyServer = createAction({
  name: 'pingMyServer',
  displayName: 'Ping My Server',
  description: 'Calls /me using the configured user token.',
  props: {},
  async run(context) {
    const token = context.auth as string;
    const res = await httpClient.sendRequest({
      method: HttpMethod.GET,
      url: `https://api.mycompany.com/me`,
      authentication: {
        type: AuthenticationType.BEARER_TOKEN,
        token,
      },
    });
    return res.body;
  },
});
```

#### If you used `PieceAuth.CustomAuth`

`context.auth` is an **object** containing your props (example: `{ baseUrl, token }`).

```ts
import { createAction } from '@activepieces/pieces-framework';
import { httpClient, HttpMethod, AuthenticationType } from '@activepieces/pieces-common';

export const pingMyServer = createAction({
  name: 'pingMyServer',
  displayName: 'Ping My Server',
  description: 'Calls /me using the configured base URL + token.',
  props: {},
  async run(context) {
    const auth = context.auth as { baseUrl: string; token: string };
    const baseUrl = auth.baseUrl.replace(/\/$/, '');
    const res = await httpClient.sendRequest({
      method: HttpMethod.GET,
      url: `${baseUrl}/me`,
      authentication: {
        type: AuthenticationType.BEARER_TOKEN,
        token: auth.token,
      },
    });
    return res.body;
  },
});
```

### Troubleshooting

#### “My piece doesn’t show up in the UI”

Check:

- `AP_EDITION=COMMUNITY` (fine either way, but keeps UI CE-only)
- `AP_DEV_PIECES` includes the **folder name** (example `acme-demo`)
- Your piece builds into:
  - `dist/packages/pieces/custom/<pieceName>/`
- Your `package.json` has a valid `name` and `version`
- Your `src/index.ts` exports a valid `createPiece(...)` instance and includes actions/triggers arrays

#### “My action/trigger exists but doesn’t appear”

Usually means you created the file but didn’t register it in the piece:

- Ensure `actions: [ ... ]` and/or `triggers: [ ... ]` includes your exports in `src/index.ts`

#### “The flow run fails when it hits my step”

Common causes:

- Throwing errors inside `run()` without handling
- Missing required props validation
- Using Node APIs that are restricted by the chosen execution mode

Start with logs from the worker/engine and verify the step input/output.

---

### Suggested “hello world” flow for testing

- Trigger: **Webhook** (official)
- Step 1: your piece action (log/transform payload)
- Step 2: **HTTP** or **Slack** (official) to confirm the output is usable by other pieces

This validates that:

- Your piece appears in UI
- Your piece executes in the engine
- Outputs from your piece can be consumed by other pieces in the same flow

---
