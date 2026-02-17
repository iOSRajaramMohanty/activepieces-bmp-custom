# Permanent SQLite3 Bindings Fix

## Overview
Added automatic sqlite3 bindings setup to development scripts to ensure the native bindings are always properly configured before starting services.

## Problem
The `sqlite3` package compiles native bindings to `build/Release/node_sqlite3.node`, but Node.js looks for them at `lib/binding/node-v137-darwin-arm64/node_sqlite3.node`. This mismatch causes the piece cache to fall back to slower in-memory storage.

## Solution
Added `ensure_sqlite3_bindings()` function to both development scripts that:
1. Checks if bindings already exist (skip if present)
2. Compiles bindings if needed (`npm rebuild sqlite3`)
3. Creates symlink from expected location to actual location

## Modified Scripts

### 1. `/scripts/dev-local.sh`
Added function before `start_all_services()`:

```bash
# Function to ensure sqlite3 bindings are properly set up
ensure_sqlite3_bindings() {
    local sqlite3_dir="$PROJECT_ROOT/node_modules/sqlite3"
    local binding_dir="$sqlite3_dir/lib/binding/node-v137-darwin-arm64"
    local built_binding="$sqlite3_dir/build/Release/node_sqlite3.node"
    
    # Skip if bindings already exist
    if [ -f "$binding_dir/node_sqlite3.node" ]; then
        return 0
    fi
    
    # Check if compiled binding exists
    if [ ! -f "$built_binding" ]; then
        print_info "Compiling sqlite3 native bindings..."
        npm rebuild sqlite3 >/dev/null 2>&1 || true
    fi
    
    # Create symlink if built binding exists
    if [ -f "$built_binding" ]; then
        print_info "Setting up sqlite3 bindings symlink..."
        mkdir -p "$binding_dir"
        ln -sf ../../../build/Release/node_sqlite3.node "$binding_dir/node_sqlite3.node"
        print_success "SQLite3 bindings configured"
    fi
}
```

Called in `start_all_services()`:
```bash
# Ensure sqlite3 bindings are set up (for fast piece cache)
ensure_sqlite3_bindings
```

### 2. `/scripts/serve-backend-only.sh`
Added same function and call before starting backend services.

## Benefits

✅ **Automatic Fix**: Bindings are set up automatically on every start
✅ **Fast**: Skips if already configured (no overhead)
✅ **Reliable**: Works after `npm install`, `bun install`, or cache clearing
✅ **Cross-Platform**: Can be adapted for other architectures (linux, windows)
✅ **No User Action**: Developers don't need to remember manual steps

## How It Works

### Before First Start
1. Script checks if `lib/binding/node-v137-darwin-arm64/node_sqlite3.node` exists
2. Not found → Compiles bindings (if needed)
3. Creates symlink: `lib/binding/.../node_sqlite3.node` → `build/Release/node_sqlite3.node`
4. Continues with normal startup

### On Subsequent Starts
1. Script checks if bindings exist
2. Found → Skip (instant, no overhead)
3. Continues with normal startup

## Testing

```bash
# Test 1: Remove bindings and restart
rm -rf node_modules/sqlite3/lib/binding/
./scripts/dev-local.sh restart

# Test 2: Check bindings were auto-created
ls -la node_modules/sqlite3/lib/binding/node-v137-darwin-arm64/
# Should show: lrwxr-xr-x  1  ...  node_sqlite3.node -> ../../../build/Release/node_sqlite3.node

# Test 3: Verify fast SQLite cache is used
curl http://localhost:3000/v1/flags
ls -lh pieces-cache-db-default.sqlite
# Should show: -rw-r--r--  1  ...  599M  ...  pieces-cache-db-default.sqlite
```

## Architecture Detection (Future Enhancement)

To support other platforms, the function can be enhanced:

```bash
# Detect Node.js ABI version and platform
NODE_ABI=$(node -p "process.versions.modules")
PLATFORM=$(node -p "process.platform")
ARCH=$(node -p "process.arch")

# e.g., node-v137-darwin-arm64, node-v137-linux-x64
binding_dir="$sqlite3_dir/lib/binding/node-v${NODE_ABI}-${PLATFORM}-${ARCH}"
```

## Related Files
- `/scripts/dev-local.sh` - Main development script
- `/scripts/serve-backend-only.sh` - Backend-only script
- `/packages/server/api/src/app/pieces/metadata/local-piece-cache.ts` - Fallback implementation

## Date Implemented
February 17, 2026

## Related Documentation
- `SQLITE3_FIX_SUMMARY.md` - Original fallback implementation
- `SQLITE3_PERFORMANCE_FIX.md` - Manual fix documentation
- `DOCKER_BUILD_FIX.md` - Docker build fix
