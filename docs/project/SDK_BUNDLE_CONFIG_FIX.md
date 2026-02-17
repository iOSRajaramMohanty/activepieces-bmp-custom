# React UI SDK Bundle Configuration Fix

## Problem

The `react-ui-sdk:bundle` target was failing with the following error:

```
TypeError: Cannot read properties of undefined (reading 'data')
at findProjectsNpmDependencies
at createPackageJson
```

This occurred when:
- `generatePackageJson: true` was set in the bundle target
- The workspace contained `file:` protocol dependencies (e.g., `"@activepieces/pieces-framework": "file:packages/pieces/community/framework"`)
- Nx's dependency graph analysis couldn't properly parse the `file:` protocol

## Root Cause

Nx's `generatePackageJson` option analyzes the dependency graph to create a `package.json` file with all dependencies. When it encounters `file:` protocol dependencies, it attempts to read metadata (`data` property) from the dependency graph node, but this property is `undefined` for file-based dependencies, causing the build to crash.

## Solution

### 1. Disable `generatePackageJson` for Bundle Target

The bundle target creates a standalone browser bundle with all dependencies bundled together. A `package.json` is not needed for browser bundles (unlike the `build` target which produces an npm package).

**Changed in:** `packages/react-ui-sdk/project.json`

```json
{
  "targets": {
    "bundle": {
      "options": {
        "generatePackageJson": false  // Changed from true
      }
    }
  }
}
```

### 2. Automated Validation Script

Created a validation script that runs before every bundle build to ensure the configuration is correct and auto-fix it if needed.

**File:** `packages/react-ui-sdk/scripts/validate-bundle-config.js`

This script:
- Checks if `generatePackageJson` is set to `true` in the bundle target
- Automatically sets it to `false` if found
- Provides clear console output about what it's doing
- Exits with error code if validation fails

### 3. Integrated into Build Process

The validation is integrated as a dependency of the bundle target:

```json
{
  "targets": {
    "bundle": {
      "dependsOn": [
        "^build",
        "validate-no-ee-imports",
        "validate-bundle-config"  // Added this
      ]
    }
  }
}
```

## How It Prevents Future Issues

1. **Automatic Detection**: Every time someone runs `nx run react-ui-sdk:bundle`, the validation script runs first
2. **Auto-Fix**: If the configuration is incorrect (e.g., after a merge or manual edit), the script automatically fixes it
3. **Clear Feedback**: The script provides clear console output about what it's checking and fixing
4. **Zero Manual Intervention**: Developers don't need to remember or manually check the configuration

## Testing the Fix

### Test 1: Normal Bundle
```bash
npx nx run react-ui-sdk:bundle
```
Expected output includes:
```
🔍 Validating react-ui-sdk bundle configuration...
✅ Bundle configuration is correct (generatePackageJson: false)
✅ Bundle configuration validation complete
```

### Test 2: Auto-Fix Verification
Simulate the bug and verify auto-fix:
```bash
# Simulate the bug by setting generatePackageJson to true
node -e "
const fs = require('fs');
const path = 'packages/react-ui-sdk/project.json';
const content = JSON.parse(fs.readFileSync(path, 'utf8'));
content.targets.bundle.options.generatePackageJson = true;
fs.writeFileSync(path, JSON.stringify(content, null, 2) + '\n');
"

# Run validation - should auto-fix
npx nx run react-ui-sdk:validate-bundle-config
```
Expected output:
```
⚠️  Found generatePackageJson: true in bundle target
📝 Setting generatePackageJson: false (browser bundles don't need package.json)
✅ Updated project.json successfully
```

## Why This Approach Works

1. **Browser bundles don't need package.json**: The webpack bundle includes all dependencies and is meant to be loaded via `<script>` tag
2. **Prevents Nx dependency graph issues**: By disabling `generatePackageJson`, Nx doesn't need to analyze file: protocol dependencies
3. **Self-healing**: The validation script auto-fixes the configuration, so developers can't accidentally break it
4. **Zero maintenance**: Once set up, it requires no manual intervention

## Related Files

- `packages/react-ui-sdk/project.json` - Bundle target configuration
- `packages/react-ui-sdk/scripts/validate-bundle-config.js` - Validation script
- `packages/react-ui-sdk/webpack.config.js` - Webpack bundler configuration

## Additional Notes

- The `build` target (for npm package) still uses `generatePackageJson: true` - this is correct and necessary
- Only the `bundle` target (for browser bundle) uses `generatePackageJson: false`
- The deprecation warning about `generatePackageJson` for library projects is also addressed by this fix
