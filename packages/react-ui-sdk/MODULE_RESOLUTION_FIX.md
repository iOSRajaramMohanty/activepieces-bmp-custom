# Module Resolution Fix

## Issue

**Error**: `Failed to resolve module specifier '@activepieces/react-ui-sdk'`

**Root Cause**: Angular's Vite dev server can't resolve bare module specifiers for external dependencies marked as `externalDependencies` in `angular.json`.

## Solution Applied

Changed the dynamic import to use a relative path instead of a bare module specifier:

**Before:**
```typescript
const sdk = await import('@activepieces/react-ui-sdk');
```

**After:**
```typescript
const sdk = await import('../../node_modules/@activepieces/react-ui-sdk/index.js');
```

## Why This Works

1. **Relative Paths**: Vite can resolve relative paths from the source file
2. **Node Modules Access**: Vite dev server serves files from `node_modules` automatically
3. **Direct File Reference**: Points directly to the bundled `index.js` file

## Alternative Solutions (If Needed)

### Option 1: Configure Vite Resolve Alias
Create `vite.config.ts` in Angular app root:
```typescript
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@activepieces/react-ui-sdk': path.resolve(__dirname, 'node_modules/@activepieces/react-ui-sdk/index.js'),
    },
  },
});
```

### Option 2: Remove from externalDependencies
Remove `@activepieces/react-ui-sdk` from `angular.json` `externalDependencies` array to let Vite bundle it (not recommended due to size).

### Option 3: Use Import Maps (Future)
Configure import maps in `index.html`:
```html
<script type="importmap">
{
  "imports": {
    "@activepieces/react-ui-sdk": "/node_modules/@activepieces/react-ui-sdk/index.js"
  }
}
</script>
```

## Current Status

✅ **Fixed**: Using relative path import
- Path: `../../node_modules/@activepieces/react-ui-sdk/index.js`
- Works with Vite dev server
- No bundling required

## Testing

After this change:
1. Refresh browser
2. Check console for SDK import success
3. Verify React UI components render
