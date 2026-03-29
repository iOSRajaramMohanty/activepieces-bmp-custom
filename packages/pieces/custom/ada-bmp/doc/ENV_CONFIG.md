# ADA BMP Environment Configuration

This document explains how to configure the ADA BMP piece using environment variables.

---

## Environment Variables

### `ADA_BMP_API_URL`

**Purpose**: Configure the base URL for the ADA BMP API

**Default**: `https://api.ada-bmp.com`

**Examples**:
```bash
# Production
export ADA_BMP_API_URL=https://api.ada-bmp.com

# Staging
export ADA_BMP_API_URL=https://api-staging.ada-bmp.com

# Development (local)
export ADA_BMP_API_URL=http://localhost:8080

# Development (Docker)
export ADA_BMP_API_URL=http://host.docker.internal:8080
```

### `ADA_BMP_DEBUG`

**Purpose**: Enable debug logging for the ADA BMP piece

**Default**: `false`

**Values**: `true` or `false`

**Example**:
```bash
export ADA_BMP_DEBUG=true
```

### `ADA_BMP_TIMEOUT`

**Purpose**: Set the timeout for API requests (in milliseconds)

**Default**: `30000` (30 seconds)

**Example**:
```bash
export ADA_BMP_TIMEOUT=60000  # 60 seconds
```

### `ADA_BMP_API_VERSION`

**Purpose**: Specify the API version (for future use in headers)

**Default**: `v1`

**Example**:
```bash
export ADA_BMP_API_VERSION=v2
```

---

## How to Set Environment Variables

### Option 1: In Startup Script

Edit `START_CORRECTLY.sh`:

```bash
#!/bin/bash

cd /Users/rajarammohanty/Documents/POC/activepieces

# Load Node v22 (matches Docker NODE_VERSION)
source ~/.zshrc
nvm use 22

# Activepieces Configuration
export AP_EDITION=ce
export AP_ENVIRONMENT=test
export AP_DEV_PIECES=ada-bmp

# ADA BMP Configuration
export ADA_BMP_API_URL=https://api.ada-bmp.com
export ADA_BMP_DEBUG=true
export ADA_BMP_TIMEOUT=30000

echo "🚀 Starting Activepieces with ADA BMP"
echo "   API URL: $ADA_BMP_API_URL"
echo "   Debug: $ADA_BMP_DEBUG"

exec npm run dev
```

### Option 2: In .env File

Create `.env` in the project root:

```bash
# Activepieces Configuration
AP_EDITION=ce
AP_ENVIRONMENT=test
AP_DEV_PIECES=ada-bmp

# ADA BMP Configuration
ADA_BMP_API_URL=https://api.ada-bmp.com
ADA_BMP_DEBUG=true
ADA_BMP_TIMEOUT=30000
ADA_BMP_API_VERSION=v1
```

Then load it before starting:

```bash
source .env
npm run dev
```

### Option 3: In Terminal Session

```bash
export ADA_BMP_API_URL=https://api-staging.ada-bmp.com
export ADA_BMP_DEBUG=true
npm run dev
```

### Option 4: Inline with Command

```bash
ADA_BMP_API_URL=http://localhost:8080 ADA_BMP_DEBUG=true npm run dev
```

---

## Production Deployment

### Docker Compose

Add to `docker-compose.yml`:

```yaml
services:
  activepieces:
    image: activepieces/activepieces:latest
    environment:
      # Activepieces
      AP_EDITION: ce
      AP_ENVIRONMENT: prod
      
      # ADA BMP
      ADA_BMP_API_URL: https://api.ada-bmp.com
      ADA_BMP_DEBUG: false
      ADA_BMP_TIMEOUT: 30000
```

### Kubernetes / Helm

Add to values.yaml:

```yaml
env:
  AP_EDITION: ce
  AP_ENVIRONMENT: prod
  
  # ADA BMP Configuration
  ADA_BMP_API_URL: https://api.ada-bmp.com
  ADA_BMP_DEBUG: "false"
  ADA_BMP_TIMEOUT: "30000"
```

### Environment-Specific Configs

Create different files for each environment:

**`.env.development`**:
```bash
ADA_BMP_API_URL=http://localhost:8080
ADA_BMP_DEBUG=true
ADA_BMP_TIMEOUT=60000
```

**`.env.staging`**:
```bash
ADA_BMP_API_URL=https://api-staging.ada-bmp.com
ADA_BMP_DEBUG=true
ADA_BMP_TIMEOUT=30000
```

**`.env.production`**:
```bash
ADA_BMP_API_URL=https://api.ada-bmp.com
ADA_BMP_DEBUG=false
ADA_BMP_TIMEOUT=30000
```

Load with:
```bash
source .env.production
npm run dev
```

---

## API Endpoints Used

The following endpoints are constructed from the base URL:

| Endpoint | Method | Purpose | Full URL Example |
|----------|--------|---------|------------------|
| `/user/checkToken` | POST | Validate API token | `https://api.ada-bmp.com/user/checkToken` |
| `/channels` | GET | Fetch available channels | `https://api.ada-bmp.com/channels` |
| `/messages/send` | POST | Send a message | `https://api.ada-bmp.com/messages/send` |

---

## Testing Different Environments

### Test with Production API
```bash
export ADA_BMP_API_URL=https://api.ada-bmp.com
npm run dev
```

### Test with Staging API
```bash
export ADA_BMP_API_URL=https://api-staging.ada-bmp.com
npm run dev
```

### Test with Local Mock Server
```bash
# Start your mock server on port 8080
export ADA_BMP_API_URL=http://localhost:8080
export ADA_BMP_DEBUG=true
npm run dev
```

---

## Debug Logging

When `ADA_BMP_DEBUG=true`, you'll see logs like:

```
[ADA-BMP] Validating token { url: 'https://api.ada-bmp.com/user/checkToken' }
[ADA-BMP] Token validation successful
[ADA-BMP] Fetching channels { url: 'https://api.ada-bmp.com/channels' }
[ADA-BMP] Channels fetched successfully { count: 4 }
[ADA-BMP] Sending message { url: 'https://api.ada-bmp.com/messages/send', channel: 'ch-123', recipient: '+1234567890' }
[ADA-BMP] Message sent successfully { status: 200 }
```

---

## Verification

To verify the configuration is working:

1. **Check the logs** when the piece is loaded:
```bash
grep "ADA-BMP" ~/.cursor/projects/.../terminals/*.txt
```

2. **Test token validation**:
   - Open Activepieces UI
   - Add ADA BMP piece
   - Enter token
   - Check debug logs

3. **Verify API URL** is being used:
```bash
echo $ADA_BMP_API_URL
```

---

## Troubleshooting

### Issue: Environment variable not being read

**Solution**: Make sure to export the variable:
```bash
export ADA_BMP_API_URL=https://your-url.com  # ✅ Correct
ADA_BMP_API_URL=https://your-url.com         # ❌ Won't work
```

### Issue: Changes not reflecting

**Solution**: Restart the dev server:
```bash
pkill -f "nx serve"
./START_CORRECTLY.sh
```

### Issue: Still using default URL

**Solution**: Check if the piece is being rebuilt:
```bash
# Clear build cache
rm -rf dist/packages/pieces/custom/ada-bmp

# Restart
npm run dev
```

---

## Configuration File Location

The configuration logic is in:
```
packages/pieces/custom/ada-bmp/src/lib/common/config.ts
```

You can extend it with more configuration options as needed.

---

## Best Practices

1. **Use `.env` files** for local development
2. **Never commit `.env` files** to git (add to `.gitignore`)
3. **Use different URLs** for dev/staging/prod
4. **Enable debug logging** in development
5. **Disable debug logging** in production
6. **Document** any new environment variables
7. **Test** with different URLs before deploying

---

## Summary

✅ **Configurable**: API URL via `ADA_BMP_API_URL`  
✅ **Flexible**: Works with dev, staging, prod  
✅ **Debug**: Optional debug logging  
✅ **Default**: Falls back to production URL  
✅ **Documented**: Clear examples provided  

Your ADA BMP piece is now fully configurable! 🎉
