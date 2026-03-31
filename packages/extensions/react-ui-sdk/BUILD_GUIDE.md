# React UI SDK Build Guide

This guide explains how to build the React UI SDK bundle for embedding in Angular (or other) applications.

## Prerequisites

- Node.js >= 18.19.0
- npm or bun package manager
- Nx CLI (installed via npm)

## Quick Build

From the workspace root:

```bash
# 1. Build the SDK bundle
npx nx run react-ui-sdk:bundle

# 2. Fix package.json (required for consumption outside the monorepo)
npx nx run react-ui-sdk:fix-bundle-package

# Or with skip cache (for fresh build)
npx nx run react-ui-sdk:bundle --skip-nx-cache
npx nx run react-ui-sdk:fix-bundle-package --skip-nx-cache
```

**Always run `fix-bundle-package` after `bundle`.** It:

- Sets `main` and `exports` to `./index.js` (bundle output is at root, not in `dist/`).
- For local file-based installs, it can replace monorepo-only dependency specifiers (like `workspace:*`) so the bundle can be installed in non-workspace apps (e.g. Angular).
- For registry publishing (GitHub Packages), it removes monorepo-only deps and adds `publishConfig`.

## Output Location

After a successful build, the SDK bundle is located at:

```
dist/packages/extensions/react-ui-sdk-bundled/
├── assets/
│   ├── ActivepiecesCreateTodoGuide.png
│   ├── ActivepiecesTodo.png
│   ├── External_Channel_Todo.png
│   ├── ada-logo.png
│   └── fonts/           # Inter font woff2 (if added via project.json)
├── locales/             # i18n (ar, de, en, es, fr, ja, nl, pt, ru, zh, zh-TW)
│   ├── ar/translation.json
│   ├── en/translation.json
│   └── ...
├── *.woff2              # Webpack-emitted fonts (hashed names)
├── index.js             # Main SDK bundle (~12 MB, includes inlined styles)
├── LICENSE
├── README.md
└── package.json
```

**Styles:** Tailwind and react-ui global styles are imported in the bundle entry and inlined via style-loader. Host apps do not need to load a separate `styles.css` for the SDK.

---

## Using the SDK from node_modules (Angular)

The recommended approach is to consume the bundle as an npm dependency and copy it into the app at build time.

### 1. In the Activepieces repo (first time and after SDK changes)

```bash
cd /path/to/activepieces
npx nx run react-ui-sdk:bundle
npx nx run react-ui-sdk:fix-bundle-package
```

### 2. In the Angular app

**package.json** – point to the bundled output:

```json
{
  "dependencies": {
    "@activepieces/react-ui-sdk": "file:../activepieces/dist/packages/extensions/react-ui-sdk-bundled"
  }
}
```

Then run `bun install` or `npm install`.

**angular.json** – copy SDK files from node_modules into the build output (e.g. under `/sdk/`):

```json
"assets": [
  { "glob": "index.js", "input": "node_modules/@activepieces/react-ui-sdk", "output": "sdk" },
  { "glob": "*.woff2", "input": "node_modules/@activepieces/react-ui-sdk", "output": "sdk" },
  { "glob": "locales/**/*", "input": "node_modules/@activepieces/react-ui-sdk", "output": "sdk" },
  { "glob": "assets/**/*", "input": "node_modules/@activepieces/react-ui-sdk", "output": "sdk" },
  { "glob": "LICENSE", "input": "node_modules/@activepieces/react-ui-sdk", "output": "sdk" },
  { "glob": "ada-logo.png", "input": "node_modules/@activepieces/react-ui-sdk/assets", "output": "." }
]
```

- `sdk/` holds the script, fonts, locales, and assets so they are served at e.g. `/sdk/index.js`, `/sdk/*.woff2`, `/sdk/assets/...`.
- `ada-logo.png` at root (`.`): the default platform theme returns `/ada-logo.png` for branding; copying it to the app root avoids a 404.

**Before loading the SDK script**, set the base URL so asset paths resolve correctly (webpack’s runtime strips the last path segment from this URL to get `publicPath`):

```typescript
(window as any).__AP_SDK_BASE_PATH__ = window.location.origin + '/sdk/index.js';
```

Then load the script: `<script src="/sdk/index.js">` (or equivalent). After it runs, use `window.__AP_SDK_MODULE__` (e.g. `mountReactComponent`, `Dashboard`, `FlowBuilder`, etc.).

**API and WebSocket proxy** – if the backend runs on another origin (e.g. `http://localhost:3000`), proxy `/api` and enable WebSocket:

```json
// proxy.conf.json
{
  "/api": {
    "target": "http://localhost:3000",
    "secure": false,
    "changeOrigin": true,
    "pathRewrite": { "^/api": "" },
    "ws": true
  }
}
```

Set `apiUrl` to the app origin (e.g. `''` or `window.location.origin`) so that requests go to `/api/...` and are proxied to the backend.

---

## Copying to Angular App (manual / bmp-fe-web)

If you prefer not to use node_modules (e.g. custom deployment or bmp-fe-web), copy the built files manually.

After building (and running `fix-bundle-package`), copy all SDK files into your project:

```bash
mkdir -p /path/to/bmp-fe-web/src/assets/sdk/{assets,locales}
cp dist/packages/extensions/react-ui-sdk-bundled/index.js /path/to/bmp-fe-web/src/assets/sdk/
cp dist/packages/extensions/react-ui-sdk-bundled/*.woff2 /path/to/bmp-fe-web/src/assets/sdk/ 2>/dev/null || true
cp -r dist/packages/extensions/react-ui-sdk-bundled/assets/* /path/to/bmp-fe-web/src/assets/sdk/assets/
cp -r dist/packages/extensions/react-ui-sdk-bundled/locales/* /path/to/bmp-fe-web/src/assets/sdk/locales/
```

For bmp-fe-web specifically:

```bash
mkdir -p /Users/rajarammohanty/Documents/ADA/bmp-fe-web/src/assets/sdk/{assets,locales} && \
cp dist/packages/extensions/react-ui-sdk-bundled/index.js /Users/rajarammohanty/Documents/ADA/bmp-fe-web/src/assets/sdk/ && \
cp dist/packages/extensions/react-ui-sdk-bundled/*.woff2 /Users/rajarammohanty/Documents/ADA/bmp-fe-web/src/assets/sdk/ 2>/dev/null || true && \
cp -r dist/packages/extensions/react-ui-sdk-bundled/assets/* /Users/rajarammohanty/Documents/ADA/bmp-fe-web/src/assets/sdk/assets/ && \
cp -r dist/packages/extensions/react-ui-sdk-bundled/locales/* /Users/rajarammohanty/Documents/ADA/bmp-fe-web/src/assets/sdk/locales/
```

**Note:** Don’t overwrite `bmp-overrides.css` or other custom styles you maintain in the host app. See [BMP_OVERRIDES.md](./BMP_OVERRIDES.md) for how to customize the Connections page (and other SDK views) from bmp-fe-web using `bmp-overrides.css`.

## Full Build Script (manual copy)

Example script to build and copy in one command:

```bash
#!/bin/bash
# build-sdk.sh

set -e

SDK_SRC="/Users/rajarammohanty/Documents/POC/activepieces"
SDK_DEST="/Users/rajarammohanty/Documents/ADA/bmp-fe-web/src/assets/sdk"

cd "$SDK_SRC"
npx nx run react-ui-sdk:bundle --skip-nx-cache
npx nx run react-ui-sdk:fix-bundle-package

mkdir -p "$SDK_DEST/assets" "$SDK_DEST/locales"
cp dist/packages/extensions/react-ui-sdk-bundled/index.js "$SDK_DEST/"
cp dist/packages/extensions/react-ui-sdk-bundled/*.woff2 "$SDK_DEST/" 2>/dev/null || true
cp -r dist/packages/extensions/react-ui-sdk-bundled/assets/* "$SDK_DEST/assets/"
cp -r dist/packages/extensions/react-ui-sdk-bundled/locales/* "$SDK_DEST/locales/"

echo "SDK built and copied successfully!"
ls -la "$SDK_DEST/"
```

## Clean Build

If you encounter caching issues, clean and rebuild:

```bash
rm -rf dist/packages/extensions/react-ui-sdk-bundled
npx nx run react-ui-sdk:bundle --skip-nx-cache
npx nx run react-ui-sdk:fix-bundle-package
```

---

## Publish privately to GitHub Packages (recommended)

GitHub Packages requires the npm scope to match your GitHub username/org.

### 1. Build the bundle

```bash
npx nx run react-ui-sdk:bundle --skip-nx-cache
SDK_PUBLISH_SCOPE=iosrajarammohanty \
SDK_PUBLISH_REGISTRY=https://npm.pkg.github.com \
SDK_PUBLISH_REPO_URL=https://github.com/iOSRajaramMohanty/activepieces-bmp-custom.git \
  npx nx run react-ui-sdk:fix-bundle-package --skip-nx-cache
```

### 2. Publish (manual/local)

Create a GitHub PAT with **write:packages**.

```bash
echo "@iosrajarammohanty:registry=https://npm.pkg.github.com" >> ~/.npmrc
echo "//npm.pkg.github.com/:_authToken=YOUR_GITHUB_PAT" >> ~/.npmrc

cd dist/packages/extensions/react-ui-sdk-bundled
npm publish
```

### 3. Consume in another project

In the consumer project `.npmrc`:

```bash
@iosrajarammohanty:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_PAT
```

In `package.json`:

```json
{
  "dependencies": {
    "@iosrajarammohanty/react-ui-sdk": "^1.0.0"
  }
}
```

### 4. Auto-publish via GitHub Actions

A CI workflow (`.github/workflows/publish-sdk.yml`) automatically builds and publishes to GitHub Packages on every push to `main` that touches `packages/extensions/react-ui-sdk/**`.

**How it works:**
- Builds the SDK bundle, runs `fix-bundle-package` with the publish env vars, then runs `npm publish`.
- If the version in `package.json` was **already published**, the workflow **succeeds silently** (skips publish with a notice instead of failing).
- Uses the automatic `GITHUB_TOKEN` for auth (no extra secrets needed).

**To publish a new version:**
1. Bump `version` in `packages/extensions/react-ui-sdk/package.json` (e.g. `1.0.1` -> `1.0.2`).
2. Commit and push to `main`.
3. The workflow publishes the new version automatically.

**To trigger manually** (without a code change): go to **Actions** > **Publish React UI SDK (Private)** > **Run workflow**.

## Build Targets

| Target | Command | Output | Purpose |
|--------|---------|--------|---------|
| `build` | `npx nx run react-ui-sdk:build` | `dist/packages/react-ui-sdk` | TypeScript library (for npm) |
| `bundle` | `npx nx run react-ui-sdk:bundle` | `dist/packages/extensions/react-ui-sdk-bundled` | Webpack bundle (script tag) |
| `fix-bundle-package` | `npx nx run react-ui-sdk:fix-bundle-package` | (mutates bundle `package.json`) | Fix `main` and `@activepieces/shared` for external apps |

**Use `bundle` + `fix-bundle-package` for Angular (or any host) embedding via script tag.**

## Project Structure

```
packages/react-ui-sdk/
├── src/
│   ├── index.ts                 # Main entry (npm package)
│   ├── index.browser.ts         # Browser entry (no Angular)
│   ├── index.browser.entry.ts   # Bundle entry (sets locales path, imports styles)
│   ├── react/                   # React component wrappers
│   ├── angular/                 # Angular adapters
│   ├── providers/               # SDK providers
│   ├── types/                   # TypeScript types
│   ├── utils/                   # Utilities
│   ├── stubs/                   # Browser stubs for Node.js modules
│   └── scripts/
│       └── fix-bundle-package-json.js
├── project.json                 # Nx project configuration
├── webpack.config.js            # Webpack bundle config
├── tsconfig.lib.json            # TypeScript config
└── package.json                 # Package metadata
```

## Adding Assets

To add new assets (images, fonts) to the SDK bundle:

1. Add the file under `packages/react-ui/src/assets/` (e.g. `img/custom/` or `assets/fonts/`).
2. Update `packages/react-ui-sdk/project.json` bundle target `assets` with the appropriate `glob`, `input`, and `output`.
3. Rebuild: `npx nx run react-ui-sdk:bundle` and `fix-bundle-package` if needed.

## Customizing Styles

The bundle uses **style-loader**: Tailwind, theme variables, and Inter fonts are inlined and injected into the document when the script runs. There is no separate stylesheet file; changing how styles are loaded (e.g. extracting CSS) would require changing the SDK webpack config in this repo.

**Default stylesheet:** The inlined CSS includes Tailwind utilities, `@theme` and `:root`/`.dark` CSS variables (e.g. `--primary`, `--background`, `--foreground`, `--radius`), Inter `@font-face`, and component styles. Host apps can override these variables or load their own CSS **after** the SDK script to match their UI.

For full details (CSS variables to override, scoping, fonts, and examples), see **[Default stylesheet and customizing the UI](./NPM_PACKAGE_USAGE.md#default-stylesheet-and-customizing-the-ui)** in [NPM_PACKAGE_USAGE.md](./NPM_PACKAGE_USAGE.md).

## Troubleshooting

### Build fails with import errors

```bash
npm install   # or bun install
npx nx reset  # Clear Nx cache
```

### Assets (fonts, images) 404 in host app

- Ensure the host sets `window.__AP_SDK_BASE_PATH__` to the **full script URL** (e.g. `https://example.com/sdk/index.js`) before loading the script, so webpack’s `publicPath` becomes the correct base (e.g. `https://example.com/sdk/`).
- Ensure all needed globs are copied (e.g. `index.js`, `*.woff2`, `locales/**/*`, `assets/**/*`).

### `/ada-logo.png` 404

The default platform theme returns `/ada-logo.png`. Either copy `ada-logo.png` from the bundle’s `assets/` to the host app’s root (e.g. via assets config) or change the platform branding to use another URL.

### WebSocket connection failed

If the backend is on another origin, enable WebSocket proxying: in the proxy config for `/api`, set `"ws": true` and restart the dev server.

### `workspace dependency "@activepieces/shared" not found` in host app

Run `fix-bundle-package` after `bundle` so the bundled `package.json` uses `file:../../../packages/shared` instead of `workspace:*` for `@activepieces/shared`.

### TypeScript errors

```bash
npx nx run react-ui-sdk:build:skip-angular-check
```

### Webpack bundle too large

The bundle is ~12 MB because it includes React, react-ui, and dependencies for standalone browser use. This is expected for script-tag loading.

## Related Files

- Webpack config: `packages/react-ui-sdk/webpack.config.js`
- Project config: `packages/react-ui-sdk/project.json`
- Fix script: `packages/react-ui-sdk/scripts/fix-bundle-package-json.js`
- EE exclusion validator: `packages/react-ui-sdk/scripts/validate-ee-exclusion.ts`
