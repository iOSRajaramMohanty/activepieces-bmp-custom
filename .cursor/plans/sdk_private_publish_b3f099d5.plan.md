---
name: SDK Private Publish
overview: Build the `@activepieces/react-ui-sdk` bundle and publish it as a private package to GitHub Packages (npm.pkg.github.com), with both manual local publishing and an automated GitHub Actions workflow.
todos:
  - id: fix-script
    content: "Update fix-bundle-package-json.js to add GitHub Packages publishing metadata (name rename, publishConfig, remove file: deps, set private: false)"
    status: completed
  - id: workflow
    content: Create .github/workflows/publish-sdk.yml with build + publish steps for GitHub Packages
    status: completed
  - id: manual-docs
    content: Update BUILD_GUIDE.md with manual publishing instructions and consumer setup
    status: completed
  - id: verify
    content: Test the build locally and verify the generated package.json is correct for publishing
    status: completed
isProject: false
---

# SDK Private Publish to GitHub Packages

## Context

- **Source**: [packages/extensions/react-ui-sdk/](packages/extensions/react-ui-sdk/) in the monorepo
- **Build commands**: `npx nx run react-ui-sdk:bundle` then `npx nx run react-ui-sdk:fix-bundle-package`
- **Bundle output**: `dist/packages/extensions/react-ui-sdk-bundled/` (self-contained ~12 MB `index.js` + assets)
- **Current package name**: `@activepieces/react-ui-sdk` (v1.0.0)
- **Target registry**: GitHub Packages (`npm.pkg.github.com`)

## Key Decision: Package Scope

GitHub Packages requires the npm scope to match the GitHub owner. Since the repo is `iOSRajaramMohanty/activepieces-bmp-custom`, the published package name must be:

```
@iosrajarammohanty/react-ui-sdk
```

The build-time name stays `@activepieces/react-ui-sdk` internally; we rename it only in the **published** `package.json`.

## Changes Required

### 1. Update `fix-bundle-package-json.js` for publishing

File: [packages/extensions/react-ui-sdk/scripts/fix-bundle-package-json.js](packages/extensions/react-ui-sdk/scripts/fix-bundle-package-json.js)

Extend the existing script to:

- Rename package to `@iosrajarammohanty/react-ui-sdk` (read from env var `SDK_PUBLISH_SCOPE` to keep it configurable)
- Add `publishConfig.registry` pointing to `https://npm.pkg.github.com`
- Remove the `@activepieces/shared` dependency entirely (the webpack bundle is self-contained; `file:` paths break when installed from a registry)
- Set `"private": false` (currently inherited from root which is `true`)
- Add `repository.url` pointing to the `activepieces-bmp-custom` repo

After this change, the published `dist/packages/extensions/react-ui-sdk-bundled/package.json` will look like:

```json
{
  "name": "@iosrajarammohanty/react-ui-sdk",
  "version": "1.0.0",
  "main": "./index.js",
  "exports": { ".": { "import": "./index.js", "require": "./index.js" } },
  "publishConfig": { "registry": "https://npm.pkg.github.com" },
  "private": false,
  "files": ["index.js", "*.woff2", "assets", "locales", "LICENSE", "README.md"]
}
```

### 2. Manual local publishing

Steps a developer runs from the repo root:

```bash
# Build
npx nx run react-ui-sdk:bundle --skip-nx-cache
npx nx run react-ui-sdk:fix-bundle-package --skip-nx-cache

# Authenticate to GitHub Packages (one-time)
echo "//npm.pkg.github.com/:_authToken=YOUR_GITHUB_PAT" >> ~/.npmrc

# Publish
cd dist/packages/extensions/react-ui-sdk-bundled
npm publish
```

The PAT needs `write:packages` scope.

### 3. GitHub Actions workflow

Create: `.github/workflows/publish-sdk.yml`

**Trigger**: `workflow_dispatch` (manual) + push to `main` when `packages/extensions/react-ui-sdk/`** changes

**Job steps**:

1. Checkout code
2. Setup Node.js with `registry-url: https://npm.pkg.github.com`
3. Install dependencies (`bun install`)
4. Build: `npx nx run react-ui-sdk:bundle --skip-nx-cache`
5. Fix package: `npx nx run react-ui-sdk:fix-bundle-package --skip-nx-cache`
6. Publish: `npm publish` from the bundle output directory

**Secrets needed**:

- `GITHUB_TOKEN` (automatic) -- sufficient for GitHub Packages when repo and package scope match

### 4. Consuming the private package

In the consumer app (`bmp-fe-web` or any other):

```bash
# .npmrc in the consumer project
@iosrajarammohanty:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

```json
// package.json
{
  "dependencies": {
    "@iosrajarammohanty/react-ui-sdk": "^1.0.0"
  }
}
```

### 5. Versioning strategy

- Use the existing `version` field in the source `package.json` ([packages/extensions/react-ui-sdk/package.json](packages/extensions/react-ui-sdk/package.json))
- Bump manually before publishing: `npm version patch|minor|major` in the SDK directory
- The `fix-bundle-package-json.js` script reads the source version and copies it to the bundle

## Files to Create/Modify

- **Modify**: `packages/extensions/react-ui-sdk/scripts/fix-bundle-package-json.js` -- add publishing metadata
- **Create**: `.github/workflows/publish-sdk.yml` -- CI/CD workflow
- **Modify**: `packages/extensions/react-ui-sdk/package.json` -- ensure version is correct, keep source name as-is

