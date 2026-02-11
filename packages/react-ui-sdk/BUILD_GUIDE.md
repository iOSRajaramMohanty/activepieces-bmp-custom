# React UI SDK Build Guide

This guide explains how to build the React UI SDK bundle for embedding in Angular applications.

## Prerequisites

- Node.js >= 18.19.0
- npm or bun package manager
- Nx CLI (installed via npm)

## Quick Build

From the workspace root (`/Users/rajarammohanty/Documents/POC/activepieces`):

```bash
# Build the SDK bundle
npx nx run react-ui-sdk:bundle

# Or with skip cache (for fresh build)
npx nx run react-ui-sdk:bundle --skip-nx-cache
```

## Output Location

After a successful build, the SDK bundle is located at:

```
dist/packages/react-ui-sdk-bundled/
├── assets/
│   ├── ActivepiecesCreateTodoGuide.png
│   ├── ActivepiecesTodo.png
│   ├── External_Channel_Todo.png
│   └── ada-logo.png
├── index.js          # Main SDK bundle (~12 MB)
├── LICENSE
├── README.md
└── package.json
```

## Copying to Angular App (bmp-fe-web)

After building, copy all SDK files to your Angular project:

```bash
# Copy all SDK files (preserves your custom styles)
cp dist/packages/react-ui-sdk-bundled/index.js /path/to/bmp-fe-web/src/assets/sdk/
cp dist/packages/react-ui-sdk-bundled/LICENSE /path/to/bmp-fe-web/src/assets/sdk/
cp dist/packages/react-ui-sdk-bundled/README.md /path/to/bmp-fe-web/src/assets/sdk/
cp dist/packages/react-ui-sdk-bundled/package.json /path/to/bmp-fe-web/src/assets/sdk/
cp -r dist/packages/react-ui-sdk-bundled/assets/* /path/to/bmp-fe-web/src/assets/sdk/assets/
```

For bmp-fe-web specifically:

```bash
cp dist/packages/react-ui-sdk-bundled/index.js /Users/rajarammohanty/Documents/ADA/bmp-fe-web/src/assets/sdk/
cp dist/packages/react-ui-sdk-bundled/LICENSE /Users/rajarammohanty/Documents/ADA/bmp-fe-web/src/assets/sdk/
cp dist/packages/react-ui-sdk-bundled/README.md /Users/rajarammohanty/Documents/ADA/bmp-fe-web/src/assets/sdk/
cp dist/packages/react-ui-sdk-bundled/package.json /Users/rajarammohanty/Documents/ADA/bmp-fe-web/src/assets/sdk/
cp -r dist/packages/react-ui-sdk-bundled/assets/* /Users/rajarammohanty/Documents/ADA/bmp-fe-web/src/assets/sdk/assets/
```

**Note:** Don't overwrite `bmp-overrides.css` and `styles.css` - these contain your custom BMP styling.

## Full Build Script

Create a script to build and copy in one command:

```bash
#!/bin/bash
# build-sdk.sh

set -e

SDK_SRC="/Users/rajarammohanty/Documents/POC/activepieces"
SDK_DEST="/Users/rajarammohanty/Documents/ADA/bmp-fe-web/src/assets/sdk"

# Build SDK
cd "$SDK_SRC"
npx nx run react-ui-sdk:bundle --skip-nx-cache

# Copy all SDK files to bmp-fe-web (preserving custom styles)
cp dist/packages/react-ui-sdk-bundled/index.js "$SDK_DEST/"
cp dist/packages/react-ui-sdk-bundled/LICENSE "$SDK_DEST/"
cp dist/packages/react-ui-sdk-bundled/README.md "$SDK_DEST/"
cp dist/packages/react-ui-sdk-bundled/package.json "$SDK_DEST/"
cp -r dist/packages/react-ui-sdk-bundled/assets/* "$SDK_DEST/assets/"

echo "SDK built and copied successfully!"
echo "Files in $SDK_DEST:"
ls -la "$SDK_DEST/"
```

## Clean Build

If you encounter caching issues, clean and rebuild:

```bash
# Remove existing dist
rm -rf dist/packages/react-ui-sdk-bundled

# Build fresh
npx nx run react-ui-sdk:bundle --skip-nx-cache
```

## Build Targets

The SDK has two build targets:

| Target | Command | Output | Purpose |
|--------|---------|--------|---------|
| `build` | `npx nx run react-ui-sdk:build` | `dist/packages/react-ui-sdk` | TypeScript library (for npm) |
| `bundle` | `npx nx run react-ui-sdk:bundle` | `dist/packages/react-ui-sdk-bundled` | Webpack bundle (for script tag) |

**Use `bundle` for Angular embedding via script tag.**

## Project Structure

```
packages/react-ui-sdk/
├── src/
│   ├── index.ts              # Main entry (npm package)
│   ├── index.browser.ts      # Browser entry (bundle)
│   ├── react/                # React component wrappers
│   ├── angular/              # Angular adapters
│   ├── providers/            # SDK providers
│   ├── types/                # TypeScript types
│   ├── utils/                # Utilities
│   └── stubs/                # Browser stubs for Node.js modules
├── project.json              # Nx project configuration
├── webpack.config.js         # Webpack bundle config
├── tsconfig.lib.json         # TypeScript config
└── package.json              # Package metadata
```

## Adding Assets

To add new assets (images, fonts) to the SDK bundle:

1. Add the file to `packages/react-ui/src/assets/img/custom/`

2. Update `packages/react-ui-sdk/project.json` bundle target assets:

```json
{
  "glob": "your-file.png",
  "input": "packages/react-ui/src/assets/img/custom",
  "output": "assets"
}
```

3. Rebuild the SDK

## Customizing Styles

BMP style overrides are applied via `bmp-overrides.css` in the Angular app:

```
bmp-fe-web/src/assets/sdk/
├── index.js
├── styles.css         # SDK default styles
├── bmp-overrides.css  # Your custom styles
└── assets/
```

The Angular app loads these in order, with `bmp-overrides.css` taking precedence.

## Troubleshooting

### Build fails with import errors

Ensure the workspace is set up correctly:

```bash
npm install  # or bun install
npx nx reset  # Clear Nx cache
```

### Assets not appearing in bundle

1. Check that assets are listed in `project.json` bundle target
2. Clean and rebuild: `rm -rf dist/packages/react-ui-sdk-bundled && npx nx run react-ui-sdk:bundle`

### TypeScript errors

Run type check first:

```bash
npx nx run react-ui-sdk:build:skip-angular-check
```

### Webpack bundle too large

The bundle is ~12MB due to including all dependencies (React, etc.) for standalone browser usage. This is expected for script tag loading.

## Related Files

- Webpack config: `packages/react-ui-sdk/webpack.config.js`
- Project config: `packages/react-ui-sdk/project.json`
- EE exclusion validator: `packages/react-ui-sdk/scripts/validate-ee-exclusion.ts`
