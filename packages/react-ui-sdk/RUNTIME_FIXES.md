# Runtime Fixes Applied

## Issues Fixed

### 1. ✅ API URL Configuration
**Problem**: React UI was using `window.location.origin` (Angular app URL: `http://localhost:4200`) instead of the configured Activepieces backend URL (`http://localhost:3000`).

**Solution**:
- Updated `packages/react-ui/src/lib/api.ts` to check for `__AP_SDK_CONFIG__` first before falling back to `window.location.origin`
- Ensured SDK wrapper component sets the config in `ngOnInit` before React components mount
- Config is set in both `window.__AP_SDK_CONFIG__` and sessionStorage

**Files Modified**:
- `packages/react-ui/src/lib/api.ts` - Added SDK config check
- `packages/react-ui-sdk/src/angular/react-ui-wrapper.component.ts` - Set config early in lifecycle

### 2. ✅ Module "path" Externalized Warning
**Problem**: `mime-types` package (used by axios/form-data) tries to use Node.js `path` module which doesn't exist in browser.

**Solution**:
- Created browser-compatible `path` module stub at `packages/react-ui-sdk/src/stubs/path-stub.js`
- Configured webpack to replace `path` module imports with the stub
- Stub provides minimal `extname`, `basename`, `dirname`, `join`, `resolve` functions

**Files Created**:
- `packages/react-ui-sdk/src/stubs/path-stub.js` - Browser-compatible path utilities

**Files Modified**:
- `packages/react-ui-sdk/webpack.config.js` - Added path module replacement

## Testing

After rebuilding the bundle:
1. Restart Angular dev server
2. Open browser console
3. Verify:
   - ✅ No "Module path externalized" warnings
   - ✅ API calls go to `http://localhost:3000/api/v1/flags` (not `localhost:4200`)
   - ✅ React UI components render successfully

## Next Steps

If API 500 errors persist:
1. Verify Activepieces backend is running on `http://localhost:3000`
2. Check backend logs for the actual error
3. Verify authentication token is valid
4. Check CORS configuration if needed
