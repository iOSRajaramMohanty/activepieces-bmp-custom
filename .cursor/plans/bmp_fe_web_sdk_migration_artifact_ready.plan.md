---
name: BMP-FE-WEB SDK Migration (Artifact-Ready)
overview: "Migrate bmp-fe-web to the new SDK loading pattern (like angular-test-app), keep auth/connection and BMP overrides unchanged, and implement so that switching from local file: path to a published artifact URL requires only a package.json dependency change."
todos:
  - id: sdk-loading
    content: Update activepieces.component.ts - script from /sdk/index.js, set __AP_SDK_BASE_PATH__ and __AP_SDK_CONFIG__ before load, remove SDK stylesheet load, keep bmp-overrides load
    status: completed
  - id: artifact-ready
    content: Ensure no code or config references install path; angular.json uses only node_modules/@activepieces/react-ui-sdk
    status: completed
  - id: postinstall
    content: Simplify or remove postinstall that copies to src/assets/sdk so install is identical for file vs artifact
    status: completed
  - id: css-merge
    content: Add missing layout/selectors from angular-test-app to bmp-overrides.css using BMP colors
    status: completed
  - id: doc-swap
    content: Document one-line package.json swap for artifact (optional README or comment)
    status: completed
isProject: false
---

# BMP-FE-WEB SDK Migration (Artifact-Ready)

## Goal

1. Align bmp-fe-web SDK integration with angular-test-app (script path `/sdk/index.js`, config before load, no separate SDK stylesheet).
2. Keep auth/connection flow and BMP overrides unchanged.
3. **Make the integration artifact-ready:** switching from local `file:` path to a published artifact URL must require **only** changing the dependency in `package.json`; no application code or build config may depend on where the SDK was installed from.

---

## Artifact-Ready Rules (Must Follow)

- **Application code** must not reference the Activepieces repo path, `file:`, or any absolute path to the SDK. Only use:
  - Runtime URLs derived from the app origin and a fixed path (e.g. `/sdk/index.js`, `styles/bmp-overrides.css`).
  - The global `window.__AP_SDK_BASE_PATH__` and `window.__AP_SDK_CONFIG__` (set by the component).
- **angular.json** must reference only the package name: `node_modules/@activepieces/react-ui-sdk`. It must not reference `../../POC/activepieces` or any path outside the project. Asset copies must be from `node_modules/@activepieces/react-ui-sdk` to output `sdk` (or equivalent).
- **package.json** is the **only** place that specifies where the SDK comes from (local path vs artifact). Swapping to artifact must be a one-line change:
  - Today (local): `"@activepieces/react-ui-sdk": "file:../../POC/activepieces/dist/packages/react-ui-sdk-bundled"`
  - Future (artifact): `"@activepieces/react-ui-sdk": "<artifact-url-or-version>"` (e.g. `"1.2.3"` or `"https://your-registry/..."`)
- **postinstall** (if kept) must only copy from `node_modules/@activepieces/react-ui-sdk`; it must not reference the repo path. Prefer removing or simplifying postinstall so the app relies on angular.json copy to `/sdk/`; then install behavior is identical for file vs artifact.

After implementation, changing the local path to an artifact URL will work by only editing `package.json` and running `npm install` / `bun install`.

---

## Implementation Summary

### 1. SDK loading (bmp-fe-web component)

- **Script:** Load from `/sdk/index.js` (not `assets/sdk/index.js`). Set `(window as any).__AP_SDK_BASE_PATH__ = window.location.origin + '/sdk/index.js'` before loading the script.
- **Config:** Set `(window as any).__AP_SDK_CONFIG__` (and optionally localStorage token/projectId) **before** calling the logic that loads the script (same order as angular-test-app).
- **SDK stylesheet:** Do **not** load `assets/sdk/styles.css`; the bundled SDK inlines styles. Load only `styles/bmp-overrides.css` after the script (or once after SDK load).
- **Auth/connection:** Leave `exchangeToken`, `ensureOrganizationSetup`, `ensureBmpConnection`, and all BMP API/key usage unchanged.

### 2. angular.json

- Keep copying from `node_modules/@activepieces/react-ui-sdk` to output `sdk` (index.js, *.woff2, locales, assets, LICENSE). No path to the Activepieces repo.
- Keep copying `src/styles/bmp-overrides.css` to `styles/`.

### 3. package.json

- Keep a single dependency entry for `@activepieces/react-ui-sdk`. For artifact, replace the value only:
  - Local: `"file:../../POC/activepieces/dist/packages/react-ui-sdk-bundled"`
  - Artifact: `"<version>"` or `"<artifact-url>"`.
- **postinstall:** Remove or simplify so it does not copy SDK into `src/assets/sdk` (so the app uses only the angular.json copy to `sdk/`). If any copy is kept, it must use only `node_modules/@activepieces/react-ui-sdk`.
- **@activepieces/shared:** If the published SDK bundle is self-contained, you may remove this when moving to artifact; otherwise keep and point to artifact if needed.

### 4. CSS overrides

- Keep `bmp-overrides.css` as the single override file; preserve all BMP colors and fonts.
- Add any missing layout/structural selectors from angular-test-app’s styles.css using BMP design tokens (no purple/angular-test-app variables).

### 5. Documentation (optional)

- Add a short comment or README note: “To use the SDK from your artifact, set `@activepieces/react-ui-sdk` in package.json to your artifact URL/version and run install. No other code changes required.”

---

## Verification

- With **local** dependency: `npm install` / `ng build`; app loads SDK from `/sdk/index.js`; auth and BMP overrides work.
- After switching to **artifact** dependency (same package name and structure): change only `package.json`; run install and build; behavior is the same.
