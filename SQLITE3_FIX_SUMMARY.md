# SQLite3 Bindings Fix for PostgreSQL-Only Environments

## Problem
The backend API was crashing on startup with the error:
```
Error: Could not locate the bindings file
```

This occurred because `sqlite3` native bindings were being loaded at module import time, even though the application was configured to use PostgreSQL exclusively.

## Root Cause
Two locations were importing `sqlite3` at the top level:

1. **`sqlite-connection.ts`**: Had `import 'sqlite3'` at line 7
2. **`local-piece-cache.ts`**: Was importing `@keyv/sqlite` (which depends on `sqlite3`) at the top level

When Node.js loaded these modules, it immediately tried to load the `sqlite3` native bindings, which weren't compiled for the current environment.

## Solution
Implemented **lazy loading** and **graceful fallback** for both locations:

### 1. sqlite-connection.ts
- **Removed**: Top-level `import 'sqlite3'` statement
- **Added**: Lazy `require('sqlite3')` inside `createSqlLiteDataSourceForMigrations()` function
- **Result**: `sqlite3` is only loaded when explicitly calling this function (which is rare - only for SQLite→PGLite migrations)

```typescript
export const createSqlLiteDataSourceForMigrations = (): DataSource => {
    // Lazy import sqlite3 - only load when this function is called
    try {
        require('sqlite3')
    } catch (error) {
        system.globalLogger().warn({ error }, '[createSqlLiteDataSourceForMigrations] sqlite3 not available')
    }
    
    return new DataSource({...})
}
```

### 2. local-piece-cache.ts
- **Wrapped**: `KeyvSqlite` instantiation in a `try-catch` block
- **Added**: Fallback to in-memory `Keyv` store when `sqlite3` bindings are not available
- **Result**: Piece cache works in PostgreSQL environments without requiring `sqlite3`

```typescript
let db: Keyv
try {
    const KeyvSqlite = require('@keyv/sqlite').default || require('@keyv/sqlite')
    db = new Keyv({
        store: new KeyvSqlite({...}),
    })
} catch (err) {
    system.globalLogger().info(
        { err: err instanceof Error ? err.message : String(err) },
        '[localPieceCache] SQLite not available, using in-memory piece cache (cache resets on restart)',
    )
    db = new Keyv() // Fallback to in-memory
}
```

## Files Modified
1. `/packages/server/api/src/app/database/sqlite-connection.ts`
   - Removed top-level `import 'sqlite3'`
   - Added lazy require in `createSqlLiteDataSourceForMigrations()`

2. `/packages/server/api/src/app/pieces/metadata/local-piece-cache.ts`
   - Added try-catch around `KeyvSqlite` instantiation
   - Implemented in-memory fallback

3. `/package.json`
   - Updated `serve:backend` script to include `NX_DAEMON=false` to avoid Nx daemon connection issues

## Testing
After the fix:
- ✅ Backend API starts successfully without `sqlite3` bindings
- ✅ PostgreSQL connection works normally
- ✅ Piece cache uses in-memory storage (with warning logged)
- ✅ All services (Backend, Engine, Frontend) running correctly
- ✅ HTTP API responds to requests (tested `/v1/flags`)

## Verification Commands
```bash
# Check that backend is running
./scripts/dev-local.sh status

# Test API response
curl http://localhost:3000/v1/flags

# Check logs for fallback message
grep "SQLite not available" dev-local.log
```

## Trade-offs
**In-Memory Piece Cache**:
- **Pro**: Backend starts without `sqlite3` bindings
- **Con**: Piece cache resets on restart (acceptable for development)
- **Note**: For production, consider compiling `sqlite3` bindings or using a different cache backend

## Future Improvements
1. Consider using a Redis-based cache for piece metadata in production
2. Remove `sqlite3` dependency entirely once SQLite→PGLite migration path is no longer needed
3. Add environment variable to explicitly disable SQLite support

## Date Fixed
February 16, 2026
