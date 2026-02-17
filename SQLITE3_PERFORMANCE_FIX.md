# Performance Fix: SQLite3 Native Bindings Restored

## Issue
After implementing the SQLite3 fallback fix, the backend was using **in-memory piece cache** which caused **slower performance** compared to the original SQLite-based cache.

## Root Cause
The `sqlite3` native bindings were compiled but located in the wrong directory:
- **Compiled at**: `/node_modules/sqlite3/build/Release/node_sqlite3.node`
- **Expected at**: `/node_modules/sqlite3/lib/binding/node-v137-darwin-arm64/node_sqlite3.node`

## Solution
Created a symlink to help `sqlite3` find the compiled bindings:

```bash
cd node_modules/sqlite3
mkdir -p lib/binding/node-v137-darwin-arm64
ln -sf ../../../build/Release/node_sqlite3.node lib/binding/node-v137-darwin-arm64/node_sqlite3.node
```

## Result
✅ **Fast SQLite-based piece cache restored**
- Cache file: `pieces-cache-db-default.sqlite` (599MB)
- No "SQLite not available" fallback message
- Backend startup performance back to normal
- Piece synchronization fast again

## Commands to Fix (if needed again)
```bash
# Rebuild sqlite3 bindings
npm rebuild sqlite3

# Create symlink
cd node_modules/sqlite3
mkdir -p lib/binding/node-v137-darwin-arm64
ln -sf ../../../build/Release/node_sqlite3.node lib/binding/node-v137-darwin-arm64/node_sqlite3.node

# Verify bindings work
node -e "const sqlite3 = require('sqlite3'); console.log('✅ SQLite3 bindings loaded successfully');"
```

## Why the Fallback Code is Still Good
The try-catch fallback in `local-piece-cache.ts` is still valuable because:
1. **Deployment flexibility**: Works in environments where sqlite3 can't be compiled
2. **Graceful degradation**: System still works even if bindings fail
3. **Development safety**: Easier to work with when dependencies break

But now with proper bindings, we get the **fast SQLite cache by default**.

## Date Fixed
February 16, 2026

## Related
- See `SQLITE3_FIX_SUMMARY.md` for the original fallback implementation
