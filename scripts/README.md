# Scripts Directory

Essential scripts for managing the Activepieces development environment.

---

## 🐳 Docker Scripts (4)

### **`clean-build-run.sh`** ⭐ Main Automation
Complete automated Docker build and run process with safety checks:
- **🔍 Checks for conflicting builds** (kills stuck processes automatically)
- Backs up database automatically
- Cleans old containers and images
- Builds custom pieces
- Builds Docker image (no cache)
- Starts all services
- Installs dependencies
- **🔄 Syncs metadata from database** (automatic configuration)
- Validates everything works

**Usage:**
```bash
./scripts/clean-build-run.sh
```

**Time:** 
- Full build: 10-15 minutes

**Output:** Complete Docker environment ready for development

**Safety Features** (Added Jan 29, 2026):
- ✅ Automatically detects and kills stuck `clean-build-run.sh` processes
- ✅ Automatically detects and kills stuck `docker-compose` builds
- ✅ Prevents build conflicts and hung processes
- ✅ Clear feedback on what's being cleaned up


### **`quick-validate.sh`** ✅ Quick Validation
Fast validation of Docker environment (2 minutes):
- Checks containers are healthy
- Verifies web is accessible
- Confirms custom piece is loaded
- Checks for module errors

**Usage:**
```bash
./scripts/quick-validate.sh
```


### **`validate-docker-build.sh`** 🔍 Full Validation
Comprehensive validation with detailed checks (5 minutes):
- Container health with timing
- Piece loading and metadata
- API response times
- Database connection
- Environment variables
- Module error scanning

**Usage:**
```bash
./scripts/validate-docker-build.sh
```


### **`sync-metadata-to-env.sh`** 🔄 Metadata Sync (New!)
Automatically syncs configuration from database metadata to environment variables:
- Queries database for organization/environment metadata
- Extracts ADA_BMP configuration (API_URL, DEBUG, TIMEOUT)
- Updates `.env.dev.backup` file
- Exports as environment variables

**Usage:**
```bash
# Sync from Production environment (default)
./scripts/sync-metadata-to-env.sh

# Sync from specific environment
./scripts/sync-metadata-to-env.sh Development
./scripts/sync-metadata-to-env.sh Staging
```

**When to use:**
- After updating metadata in the database
- Before building Docker containers
- When environment variables are out of sync
- **Automatically called by** `clean-build-run.sh`

**Benefits:**
- ✅ No manual .env.dev.backup editing needed
- ✅ Single source of truth (database)
- ✅ Automatic sync on Docker build
- ✅ Supports multiple environments

---

## 💻 Local Development Scripts (5)

### **`run-dev.sh`** 🚀 Development Server
Starts the local development server with proper environment:
- Loads environment from `.env` file
- Uses Node v20
- Sets up PostgreSQL database mode
- Enables custom pieces (ada-bmp)
- Runs on http://localhost:4300

**Usage:**
```bash
./scripts/run-dev.sh
```

**Prerequisites:**
- `.env` file with your configuration
- PostgreSQL and Redis running (Docker or local)
- Node v20 via nvm


### **`restart-all.sh`** 🔄 Restart Services
Restarts both backend and frontend services:
```bash
./scripts/restart-all.sh
```


### **`stop-all.sh`** 🛑 Stop Services
Stops all running development services:
```bash
./scripts/stop-all.sh
```


### **`check-status.sh`** 📊 Check Status
Checks the status of all running services:
```bash
./scripts/check-status.sh
```


### **`build-pieces.sh`** 🧩 Build Pieces
Builds custom pieces (all, common, or specific):
```bash
# Build specific piece
./scripts/build-pieces.sh ada-bmp

# Build all pieces
./scripts/build-pieces.sh all

# Build common pieces
./scripts/build-pieces.sh common
```

---

## 🔐 Admin Management Script (1)

### **`manage-super-admin.sh`** 👤 Super Admin Management
Interactive script to create and manage super admin accounts:

**Features:**
- Create new super admin (signup + promote)
- Promote existing user to super admin
- List all super admins
- View super admin details
- Demote super admin
- Check access permissions

**Usage:**
```bash
./scripts/manage-super-admin.sh
```

**What it does:**
- Creates super admins with FULL platform access
- ALL super admins have IDENTICAL permissions
- Can access ALL platforms, users, and projects
- Not tied to any specific tenant

**Example - Create New Super Admin:**
```bash
./scripts/manage-super-admin.sh
# Select option 1
# Enter email, password, name
# ✅ Super admin created with full access!
```

**Example - Promote Existing User:**
```bash
./scripts/manage-super-admin.sh
# Select option 2
# Enter user email
# ✅ User promoted to super admin!
```

**Important:**
- All super admins have the SAME access level
- Super admins can access ALL tenant data
- Recommended: Keep 2-3 super admins maximum
- Super admins are platform-level (highest privilege)

---

## 🎯 Quick Reference

### First Time Setup (Docker)
```bash
# Complete automated setup
./scripts/clean-build-run.sh

# Validate it worked
./scripts/quick-validate.sh
```

### Daily Development (Local)
```bash
# Start development
./scripts/run-dev.sh

# Check if running
./scripts/check-status.sh

# Restart if needed
./scripts/restart-all.sh

# Stop when done
./scripts/stop-all.sh
```

### After Code Changes
```bash
# Rebuild custom piece
./scripts/build-pieces.sh ada-bmp

# Restart services
./scripts/restart-all.sh
```

### Docker Rebuild
```bash
# Clean rebuild with validation
./scripts/clean-build-run.sh
```

---

## 📝 Notes

- **All scripts run from project root**: `./scripts/script-name.sh`
- **Docker scripts require**: Docker & Docker Compose installed
- **Local dev scripts require**: Node v20, nvm, PostgreSQL, Redis
- **Environment config**: Use `.env` file for local development
- **Database backups**: Automatically created in `~/activepieces_backup_*.sql`

---

## 🔧 Environment Setup

### PostgreSQL & Redis: Local vs Docker

| Mode | Config File | PostgreSQL | Redis | Frontend |
|------|-------------|------------|-------|----------|
| **Local dev** (`dev-local.sh`, `restart-all.sh`, `run-dev.sh`) | `.env` | `localhost:5433` (auto-started via `docker-compose.local-db.yml` if needed) | `localhost:6379` | `http://localhost:4300` |
| **Docker build** (`docker-compose.dev.yml`) | `.env.dev.backup` | Container `postgres-dev` (host port 5434) | Container `redis-dev` (host port 6380) | `http://localhost:8080` |

**Local dev**: If Postgres/Redis aren't running, `dev-local.sh` and `restart-all.sh` auto-start them via `docker-compose.local-db.yml` using your existing data volume. Manual control: `./scripts/dev-local.sh db-start` / `./scripts/dev-local.sh db-stop`.

### For local development (`run-dev.sh`, `dev-local.sh`), create a `.env` file:

```bash
# Copy example
cp .env.example .env

# Edit with your settings (existing PostgreSQL + Redis)
nano .env
```

**Key variables for local dev (existing data visible on FE 4300):**
- `AP_POSTGRES_HOST` - `localhost` (existing DB)
- `AP_POSTGRES_PORT` - `5433` (existing DB with your data)
- `AP_REDIS_HOST` - `localhost` (existing Redis)
- `AP_REDIS_PORT` - `6379` (or your existing Redis port)
- `AP_DEV_PIECES` - Custom pieces to load (e.g., `ada-bmp`)

---

## 🆕 Recent Updates

### January 29, 2026
- **`sync-metadata-to-env.sh`** (NEW): Automatic database metadata sync
  - Syncs ADA_BMP configuration from database to environment variables
  - Eliminates manual .env.dev.backup editing
  - Single source of truth for configuration
  - Integrated into `clean-build-run.sh`

- **`clean-build-run.sh`**: Enhanced with safety checks and auto-sync
  - Added automatic detection and cleanup of stuck build processes
  - Integrated metadata sync from database (Phase 6.5)
  - Prevents build conflicts from hung processes
  - Safer and more reliable execution

---

**Last Updated:** January 29, 2026  
**Scripts Count:** 11 files (10 scripts + 1 README)
