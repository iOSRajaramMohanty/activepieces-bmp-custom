# Build Status and Resolution Strategy

## Current Status

### ✅ Completed
1. **Import Resolution**: Switched to relative imports with `.tsx` extensions
2. **EE Exclusion**: All validation passing
3. **Provider Setup**: Fixed router/provider nesting
4. **Type Fixes**: Fixed ReactUISDKConfig type issue

### ⚠️ Remaining Issue

**Angular Peer Dependencies**: TypeScript can't resolve `@angular/core` and `@angular/common` during build because they're peer dependencies and not installed in the monorepo.

## Solution Options

### Option 1: Add Angular as Dev Dependencies (Recommended)
Add Angular types to SDK's `package.json` devDependencies:
```json
"devDependencies": {
  "@types/react": "^18.2.0",
  "@types/react-dom": "^18.2.0",
  "@angular/core": "^17.0.0",
  "@angular/common": "^17.0.0"
}
```

**Pros**: 
- TypeScript can resolve types during build
- Standard approach for libraries with peer dependencies
- Types available for development

**Cons**: 
- Adds dependencies (but only dev dependencies)

### Option 2: Configure Build to Ignore Angular Errors
Modify `tsconfig.lib.json` to exclude Angular files or use `@ts-ignore` comments.

**Pros**: 
- No additional dependencies

**Cons**: 
- Less type safety
- Not ideal for library development

### Option 3: Use Bundler Instead of tsc
Switch from `@nx/js:tsc` to `@nx/esbuild:esbuild` or `@nx/vite:build`.

**Pros**: 
- Better import resolution
- Handles path mappings correctly
- More flexible

**Cons**: 
- More complex configuration
- May require additional setup

## Recommended Next Steps

1. **Immediate**: Add Angular as dev dependencies (Option 1)
2. **Future**: Consider switching to bundler if more complex import resolution is needed

## Current Import Strategy

Using relative imports with explicit `.tsx` extensions:
```typescript
import { FlowBuilderPage } from '../../react-ui/src/app/routes/flows/id/index.tsx';
```

This works at build time but TypeScript shows errors during type checking (expected).

## Files Modified

- All React component wrappers: Updated to use relative imports with `.tsx` extensions
- `src/utils/react-mount.ts`: Fixed type issue with ReactUISDKConfig
- `tsconfig.lib.json`: Configured for better module resolution
