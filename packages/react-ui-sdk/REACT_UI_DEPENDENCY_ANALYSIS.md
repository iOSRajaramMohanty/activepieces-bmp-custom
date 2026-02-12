# react-ui-sdk vs react-ui: Dependency Analysis

## Summary

**react-ui-sdk is not independent from react-ui.** It has a **strong source/build-time dependency** on the `react-ui` package. The **bundled output** is self-contained (no runtime dependency on react-ui). The **react-ui** package has optional **SDK-aware** behavior but no dependency on react-ui-sdk.

---

## 1. react-ui-sdk → react-ui (source / build)

### 1.1 Source imports (all from `../../react-ui/src/...`)

| File | Imports from react-ui |
|------|------------------------|
| `src/providers/sdk-providers.tsx` | i18n, ThemeProvider, TooltipProvider, EmbeddingProvider, SocketProvider, Toaster |
| `src/react/dashboard.tsx` | FlowsPage, AppConnectionsPage, RunsPage, TodosPage, ApTablesPage, ApTableEditorPage, ApTableStateProvider, FlowBuilderPage, BuilderLayout, ProjectDashboardLayout |
| `src/react/flow-builder.tsx` | FlowBuilderPage |
| `src/react/connections.tsx` | AppConnectionsPage |
| `src/react/runs.tsx` | RunsPage, FlowRunPage |
| `src/react/templates.tsx` | TemplatesPage |

### 1.2 Build configuration

- **Webpack** (`webpack.config.js`): Resolves `../react-ui/src` and `@` → `react-ui/src`. All those imports are **bundled** into `dist/packages/react-ui-bundled/index.js`. No external dependency on `react-ui` in the bundle.
- **project.json (bundle target)**: Copies assets from `packages/react-ui/src/assets/img/custom` (e.g. `ada-logo.png`) into the bundle output.

### 1.3 package.json

- **dependencies**: Only `@activepieces/shared` and `rxjs`. **No** `@activepieces/react-ui` or `react-ui`.
- So: **published npm package does not declare react-ui**; the SDK is intended to be consumed via the **bundled** build, which inlines react-ui code.

### 1.4 Conclusion (react-ui-sdk side)

- **At build time**: The monorepo must have `packages/react-ui` present; the bundle step pulls in react-ui source and assets.
- **At runtime (bundled)**: The file `dist/packages/react-ui-sdk-bundled/index.js` is **self-contained**; the host app does **not** need to install or load react-ui.
- **At runtime (unbundled lib)**: If you published the unbundled library build, consumers would not have react-ui and the relative imports would break; the SDK is effectively **designed to be used as the bundle**.

---

## 2. react-ui → SDK awareness (no dependency on react-ui-sdk)

react-ui contains **optional** logic that checks `window.__AP_SDK_CONFIG__` (set by the SDK). This is used for:

- **api base URL** (`packages/react-ui/src/lib/api.ts`)
- **Socket connection** (`packages/react-ui/src/components/socket-provider.tsx`)
- **Theme** (`packages/react-ui/src/components/theme-provider.tsx`)
- **Embedding** (`packages/react-ui/src/components/embed-provider.tsx`)
- **Page title** (`packages/react-ui/src/app/components/page-title.tsx`)

react-ui does **not** import or depend on react-ui-sdk; it only reads a global when present. So:

- **react-ui can run standalone** (e.g. in the main app) without the SDK.
- **When embedded via react-ui-sdk**, the SDK sets `__AP_SDK_CONFIG__` and react-ui adapts (API URL, auth, theme, etc.).

---

## 3. How to make react-ui-sdk “fully independent” of react-ui (if desired)

To make the SDK independent in **source** as well:

1. **Copy or re-export only what you need** from react-ui into react-ui-sdk (e.g. a dedicated “sdk-ui” set of components and providers), and maintain that copy, **or**
2. **Publish `@activepieces/react-ui` (or a slim “react-ui-core”) as an npm dependency** of react-ui-sdk and import from the package instead of `../../react-ui/src/...`. Then the SDK would depend on that package at both build and install time.

Until one of these is done, **react-ui-sdk remains dependent on the monorepo’s `packages/react-ui` at build time**, and the **bundled artifact** is the only way to use it without having react-ui as a separate runtime dependency.
