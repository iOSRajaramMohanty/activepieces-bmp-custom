# Rate Limit Fix for SDK Auto-Provision

## Issue
The `/auto-provision` endpoint was returning `403 Forbidden` errors when called from the bmp-fe-web Angular application, even though direct backend requests worked fine.

## Root Cause
1. **Rate Limiting**: The Activepieces backend has authentication rate limiting enabled by default (`AP_API_RATE_LIMIT_AUTHN_MAX=50` requests per minute).
2. **Browser Caching**: The browser cached 403 responses from when the rate limit was being hit.
3. **Redis Cache**: Rate limit counters are stored in Redis and persist across backend restarts.

## Solution

### 1. Disable Rate Limiting for Local Development
Modified `/Users/rajarammohanty/Documents/POC/activepieces/.env`:

```bash
# Rate limit for authentication endpoints (disabled for local development)
AP_API_RATE_LIMIT_AUTHN_ENABLED=false
AP_API_RATE_LIMIT_AUTHN_MAX=1000
AP_API_RATE_LIMIT_AUTHN_WINDOW="1 minute"
```

**Key Changes:**
- Added `AP_API_RATE_LIMIT_AUTHN_ENABLED=false` to completely disable rate limiting
- Increased `AP_API_RATE_LIMIT_AUTHN_MAX` from `50` to `1000` for when rate limiting is re-enabled
- Quoted `AP_API_RATE_LIMIT_AUTHN_WINDOW` value (was causing shell syntax error)

### 2. Backend Restart
Restarted the Activepieces backend using:
```bash
./scripts/serve-backend-only.sh
```

### 3. Browser Cache Clear
**Required for users:**
- Hard refresh the browser (Ctrl+Shift+R / Cmd+Shift+R)
- Or use an incognito/private window
- Or clear browser cache for localhost:4300

## Verification

### Test 1: Direct Backend Request
```bash
curl -X POST http://localhost:3000/v1/authentication/auto-provision \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass","firstName":"Test","lastName":"User","platformId":"2Y6xAoWbvjiBgdRsBDcbP","clientId":"test-client"}'
```
**Expected:** HTTP 200 with user token

### Test 2: Through Angular Proxy
```bash
curl -X POST http://localhost:4300/api/v1/authentication/auto-provision \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass","firstName":"Test","lastName":"User","platformId":"2Y6xAoWbvjiBgdRsBDcbP","clientId":"test-client"}'
```
**Expected:** HTTP 200 with user token (same as direct)

Both tests passed successfully.

## Proxy Configuration

The bmp-fe-web Angular app uses a proxy configuration:

**File:** `/Users/rajarammohanty/Documents/ADA/bmp-fe-web/proxy.conf.json`
```json
{
  "/api": {
    "target": "http://localhost:3000",
    "secure": false,
    "changeOrigin": true,
    "pathRewrite": {
      "^/api": ""
    },
    "logLevel": "debug",
    "ws": true
  }
}
```

**Request Flow:**
1. Angular app → `http://localhost:4300/api/v1/authentication/auto-provision`
2. Proxy rewrites to → `http://localhost:3000/v1/authentication/auto-provision`
3. Activepieces backend processes the request

## For Production

**Important:** Re-enable rate limiting before deploying to production:

```bash
AP_API_RATE_LIMIT_AUTHN_ENABLED=true
AP_API_RATE_LIMIT_AUTHN_MAX=1000
AP_API_RATE_LIMIT_AUTHN_WINDOW="1 minute"
```

The increased limit (1000 vs 50) should accommodate legitimate SDK usage without compromising security.

## Files Modified

1. `/Users/rajarammohanty/Documents/POC/activepieces/.env`
   - Added `AP_API_RATE_LIMIT_AUTHN_ENABLED=false`
   - Increased `AP_API_RATE_LIMIT_AUTHN_MAX` to `1000`
   - Quoted `AP_API_RATE_LIMIT_AUTHN_WINDOW` value

## Related Documentation

- Previous fix: `SQLITE3_PERFORMANCE_FIX.md`
- SDK configuration: `BMP_MULTIPLE_USER_HANDLING_WITH_ROLES.md`
- SDK bundle fix: `docs/project/SDK_BUILD_FIX_SUMMARY.md`
