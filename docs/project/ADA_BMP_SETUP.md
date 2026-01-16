# ADA BMP Custom Piece - Permanent Configuration Guide

## Overview
This guide documents the permanent configuration for the ADA BMP custom piece to work correctly with custom API endpoints.

## Problem
Custom pieces in Activepieces run in sandboxed environments. By default, environment variables are **not** accessible to code running inside these sandboxes. This caused the ADA BMP piece to fail validation because it couldn't access the `ADA_BMP_API_URL` environment variable.

## Solution

### Required Environment Variables

Add these variables to **BOTH** of the following files:
1. `.env` (root directory)
2. `packages/server/api/.env`

```bash
# ADA BMP API Configuration
ADA_BMP_API_URL=https://bmpapidev2.cl.bmp.ada-asia.my

# Propagate ADA_BMP_API_URL to sandbox (REQUIRED for pieces to access it)
AP_SANDBOX_PROPAGATED_ENV_VARS=ADA_BMP_API_URL
```

### Explanation

#### 1. `ADA_BMP_API_URL`
- **Purpose**: The actual API endpoint URL for ADA BMP
- **Used by**: The custom piece code (`process.env.ADA_BMP_API_URL`)
- **Required**: Yes
- **Format**: Without `AP_` prefix
- **Note**: This is the ONLY ADA_BMP_API_URL you need. `AP_ADA_BMP_API_URL` is NOT used.

#### 2. `AP_SANDBOX_PROPAGATED_ENV_VARS`
- **Purpose**: Tells Activepieces which environment variables to make available inside sandboxed piece execution
- **Format**: Comma-separated list of variable names (without `AP_` prefix)
- **Required**: Yes
- **Example**: `AP_SANDBOX_PROPAGATED_ENV_VARS=ADA_BMP_API_URL,OTHER_VAR,ANOTHER_VAR`

### How It Works

1. **Build Time**: When you run `npm run build-piece ada-bmp`, the piece reads from `packages/server/api/.env`
2. **Runtime**: When the backend starts, it reads environment variables
3. **Sandbox Execution**: When a piece executes:
   - The worker reads `AP_SANDBOX_PROPAGATED_ENV_VARS` to get the list of variables to propagate
   - For each variable in that list, it copies the value from `process.env[varName]` into the sandbox
   - The piece code can now access `process.env.ADA_BMP_API_URL`

### File Locations

```
activepieces/
├── .env                           # Add variables here
├── packages/
│   └── server/
│       └── api/
│           └── .env               # Add variables here
└── packages/
    └── pieces/
        └── custom/
            └── ada-bmp/
                └── src/
                    └── lib/
                        └── common/
                            └── config.ts  # Reads ADA_BMP_API_URL
```

## Step-by-Step Setup Instructions

### 1. Update Environment Files

**File: `.env` (root)**
```bash
# Add at the end of the file:

# ADA BMP API Configuration
ADA_BMP_API_URL=https://bmpapidev2.cl.bmp.ada-asia.my
AP_SANDBOX_PROPAGATED_ENV_VARS=ADA_BMP_API_URL
```

**File: `packages/server/api/.env`**
```bash
# Add at the end of the file:

# ADA BMP API Configuration
ADA_BMP_API_URL=https://bmpapidev2.cl.bmp.ada-asia.my
AP_SANDBOX_PROPAGATED_ENV_VARS=ADA_BMP_API_URL
```

### 2. Rebuild the Piece
```bash
npm run build-piece ada-bmp
```

### 3. Restart Services
```bash
./scripts/restart-all.sh
```

### 4. Verify Configuration
After services start, test the connection in the UI. Check logs for:
```
[ADA-BMP Config] Using ADA_BMP_API_URL from environment: https://bmpapidev2.cl.bmp.ada-asia.my
[ADA-BMP] ===== TOKEN VALIDATION START =====
[ADA-BMP] URL: https://bmpapidev2.cl.bmp.ada-asia.my/user/checkToken
```

## Changing the API URL

To change the API endpoint in the future:

1. Update `ADA_BMP_API_URL` in both `.env` files
2. Restart services: `./scripts/restart-all.sh`
3. No need to rebuild the piece unless you change the code

## Adding More Custom Environment Variables

If your piece needs additional environment variables:

1. Add the variable to both `.env` files:
   ```bash
   MY_CUSTOM_VAR=value
   ```

2. Add it to the propagation list:
   ```bash
   AP_SANDBOX_PROPAGATED_ENV_VARS=ADA_BMP_API_URL,MY_CUSTOM_VAR
   ```

3. Restart services

## Troubleshooting

### Connection Still Failing
1. Check both `.env` files have the variables
2. Verify `AP_SANDBOX_PROPAGATED_ENV_VARS` includes `ADA_BMP_API_URL`
3. Restart services completely: `./scripts/stop-all.sh` then `./scripts/restart-all.sh`
4. Check logs: `tail -f backend.log | grep ADA-BMP`

### Environment Variable Not Found in Logs
Look for this log message:
```
[ADA-BMP Config] ADA_BMP_API_URL not found in environment, using default
```

If you see this, the variable is not being propagated. Verify:
- `AP_SANDBOX_PROPAGATED_ENV_VARS=ADA_BMP_API_URL` is in both `.env` files
- Services have been restarted after adding the variables

### Wrong URL Being Used
Check the log for:
```
[ADA-BMP Config] Final base URL: <URL>
```

If it shows the wrong URL:
- Verify `ADA_BMP_API_URL` value in `.env` files
- Restart services
- Clear cache: `rm -rf .nx/cache && ./scripts/restart-all.sh`

## Version Control

### What to Commit
- `.env.example` (template with placeholders)
- This documentation file

### What NOT to Commit
- `.env` (contains actual credentials/URLs)
- `packages/server/api/.env` (contains actual credentials/URLs)

### Recommended `.env.example`
Create a template for other developers:

**File: `.env.example`**
```bash
# ADA BMP Configuration
# Set the API endpoint for ADA BMP
ADA_BMP_API_URL=https://your-ada-bmp-api-url.com

# Propagate environment variables to sandbox
# Add any custom env vars your pieces need (comma-separated)
AP_SANDBOX_PROPAGATED_ENV_VARS=ADA_BMP_API_URL
```

## Summary

✅ **Permanent Fix Applied**
- Environment variables configured in both `.env` files
- Sandbox propagation enabled via `AP_SANDBOX_PROPAGATED_ENV_VARS`
- ADA BMP piece can now access the custom API URL

✅ **Future-Proof**
- Easy to change API URL (just update `.env` and restart)
- Easy to add more custom variables
- Works consistently across restarts and rebuilds

✅ **Documentation**
- This guide documents the setup for future reference
- Includes troubleshooting steps
- Version control guidelines included
