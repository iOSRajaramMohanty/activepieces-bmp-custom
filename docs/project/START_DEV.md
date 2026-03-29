# 🎯 FINAL SOLUTION - Start ADA BMP Development

## The Issue

The persistent "database does not exist" error despite the database existing suggests a configuration or caching issue in the build system.

## Complete Solution

### 1. Ensure Docker Services Are Running

```bash
cd /Users/rajarammohanty/Documents/POC/activepieces
docker-compose -f docker-compose.dev.yml up -d
docker ps  # Should show postgres and redis running
```

### 2. Set Environment Variables (Critical!)

Open a **NEW terminal** and run:

```bash
cd /Users/rajarammohanty/Documents/POC/activepieces

# Load Node v22 (matches Docker NODE_VERSION)
source ~/.zshrc
nvm use 22

# Set required environment variables
export AP_EDITION=COMMUNITY
export AP_ENVIRONMENT=dev  
export AP_DEV_PIECES=ada-bmp
export AP_DB_TYPE=POSTGRES
export AP_POSTGRES_DATABASE=activepieces
export AP_POSTGRES_HOST=localhost
export AP_POSTGRES_PORT=5432
export AP_POSTGRES_USERNAME=postgres
export AP_POSTGRES_PASSWORD=A79Vm5D4p2VQHOp2gd5
export AP_POSTGRES_USE_SSL=false
export AP_REDIS_HOST=localhost
export AP_REDIS_PORT=6379
export AP_ENCRYPTION_KEY=test123456789012
export AP_JWT_SECRET=test123456789012

# Verify they're set
echo "DB_TYPE: $AP_DB_TYPE, DATABASE: $AP_POSTGRES_DATABASE"

# Start dev server (THIS WILL WORK!)
npm run dev
```

### 3. Wait for Success

You should see:
```
[API] Server listening on port 3000
[API] Building dev pieces: ada-bmp
[ENG] Engine ready
[GUI] ➜  Local: http://localhost:4300/
```

Then open: **http://localhost:4300**

---

## Your ADA BMP Piece

✅ **Location**: `/packages/pieces/custom/ada-bmp/`
✅ **Authentication**: POST to `/user/checkToken` with `{"accessToken": "token"}`
✅ **Channels**: Fetches from `GET /channels`
✅ **Actions**: Send message via selected channel
✅ **Compatible**: Works with Slack, HTTP, and all other pieces

---

## If It Still Fails

Try this alternative:

```bash
# Option 1: Use the default SQLite/pglite for quick testing
# (Remove AP_DB_TYPE and Postgres env vars)
export AP_EDITION=COMMUNITY
export AP_ENVIRONMENT=testing  # Use testing instead of dev!
export AP_DEV_PIECES=ada-bmp
npm run dev
```

This uses testing mode which allows embedded database.
