# Enhanced Development Environment Guide

## 🚀 Your Enhanced Dev Setup is Ready!

The `docker-compose.dev.yml` is now configured with production-like features but optimized for development.

## ✨ What's New in Enhanced Dev Environment:

### 1. **Full Activepieces Stack**
- ✅ Activepieces application included
- ✅ PostgreSQL database
- ✅ Redis cache
- ✅ All running in Docker

### 2. **Health Checks**
- ✅ Monitor service health automatically
- ✅ Docker knows when services are ready
- ✅ Auto-restart on failures

### 3. **Hot Reload for Custom Pieces**
- ✅ Volume mounted: `./packages/pieces/custom` → container
- ✅ Changes to `ada-bmp` piece are picked up automatically
- ✅ No rebuild needed for piece development

### 4. **Resource Limits (Lighter than Production)**
- Activepieces: 3GB memory, 2 CPUs
- PostgreSQL: 1GB memory, 0.5 CPU
- Redis: 512MB memory, 0.25 CPU

### 5. **Development-Friendly**
- Redis exposed on port 6379 (for debugging)
- PostgreSQL exposed on port 5433
- No Redis password (easier dev)
- Separate data volumes (won't conflict with production)

## 📊 Service Details

### Activepieces (Dev)
```yaml
Container:  activepieces-dev
Port:       8080 → 80
Image:      activepieces:dev
Health:     /api/v1/health
Environment: AP_ENVIRONMENT=dev
Custom Pieces: Hot reload enabled (ada-bmp)
```

### PostgreSQL (Dev)
```yaml
Container:  postgres-dev
Port:       5433 → 5432 (different from prod's 5434)
Database:   activepieces
Username:   postgres
Password:   A79Vm5D4p2VQHOp2gd5
Volume:     postgres_data_dev
```

### Redis (Dev)
```yaml
Container:  redis-dev
Port:       6379 → 6379
Password:   None (dev mode)
Volume:     redis_data_dev
```

## 🎯 Quick Start

### Start Development Environment:
```bash
# Start all services
docker-compose -f docker-compose.dev.yml up -d

# Watch logs
docker-compose -f docker-compose.dev.yml logs -f

# Watch only Activepieces logs
docker-compose -f docker-compose.dev.yml logs -f activepieces
```

### Stop Development Environment:
```bash
docker-compose -f docker-compose.dev.yml down
```

### Rebuild After Code Changes:
```bash
# Rebuild image
docker-compose -f docker-compose.dev.yml build

# Restart with new image
docker-compose -f docker-compose.dev.yml up -d
```

## 🔄 Dev vs Production Comparison

| Feature | Development | Production |
|---------|------------|------------|
| **Image Tag** | `activepieces:dev` | `activepieces:production` |
| **Environment** | `AP_ENVIRONMENT=dev` | `AP_ENVIRONMENT=prod` |
| **PostgreSQL Port** | `5433` | `5434` |
| **Redis Port** | `6379` (exposed) | Internal only |
| **Redis Password** | No | Yes |
| **Custom Pieces** | Hot reload | Pre-built |
| **Resources** | Lighter (3GB) | Heavier (4GB) |
| **Data Volumes** | `postgres_data_dev` | `postgres_data` |
| **Network** | `activepieces-dev` | `activepieces` |
| **Dev Warnings** | Shown | Hidden |

## 📝 Database Access (Dev)

### Connection Details:
```yaml
Host:         localhost
Port:         5433          # Dev uses 5433
Database:     activepieces
Username:     postgres
Password:     A79Vm5D4p2VQHOp2gd5
```

### Connection String:
```
postgresql://postgres:A79Vm5D4p2VQHOp2gd5@localhost:5433/activepieces
```

### Connect via psql:
```bash
psql -h localhost -p 5433 -U postgres -d activepieces
```

## 🛠️ Development Workflow

### 1. Start Dev Environment:
```bash
docker-compose -f docker-compose.dev.yml up -d
```

### 2. Develop Your Custom Piece:
```bash
# Edit files in packages/pieces/custom/ada-bmp/
# Changes are automatically synced to the container

# Watch logs to see piece reloading
docker-compose -f docker-compose.dev.yml logs -f activepieces
```

### 3. Test Changes:
- Access UI: http://localhost:8080
- Your `ada-bmp` piece changes are picked up automatically
- No need to rebuild Docker image

### 4. Debug Database:
```bash
# Connect to dev database
psql -h localhost -p 5433 -U postgres -d activepieces

# Or use pgAdmin/DBeaver with port 5433
```

### 5. Debug Redis:
```bash
# Connect to Redis CLI
docker exec -it redis-dev redis-cli

# Monitor Redis commands
docker exec -it redis-dev redis-cli MONITOR
```

## 🔧 Useful Commands

### Check Health Status:
```bash
docker ps --format "table {{.Names}}\t{{.Status}}"
```

### View All Logs:
```bash
docker-compose -f docker-compose.dev.yml logs -f
```

### Restart Single Service:
```bash
docker-compose -f docker-compose.dev.yml restart activepieces
```

### Clean Start (Remove Volumes):
```bash
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up -d
```

### Check Resource Usage:
```bash
docker stats activepieces-dev postgres-dev redis-dev
```

## 🎨 Custom Piece Hot Reload

Your `ada-bmp` piece is mounted as a volume:
```yaml
volumes:
  - ./packages/pieces/custom:/usr/src/app/packages/pieces/custom
```

**This means:**
1. ✅ Edit files in `packages/pieces/custom/ada-bmp/`
2. ✅ Changes appear in container immediately
3. ✅ Activepieces watches for changes
4. ✅ Piece reloads automatically
5. ❌ No Docker rebuild needed!

### Watch for Changes:
```bash
# In one terminal, watch logs
docker-compose -f docker-compose.dev.yml logs -f activepieces | grep ada-bmp

# In another terminal, edit your piece
cd packages/pieces/custom/ada-bmp/
# Edit files...
```

## 🐛 Debugging

### Access Container Shell:
```bash
# Activepieces container
docker exec -it activepieces-dev /bin/bash

# PostgreSQL container
docker exec -it postgres-dev /bin/bash

# Redis container
docker exec -it redis-dev /bin/sh
```

### Check Environment Variables:
```bash
docker exec activepieces-dev env | grep AP_
```

### Verify Custom Piece:
```bash
docker exec activepieces-dev ls -la /usr/src/app/packages/pieces/custom/ada-bmp
```

## 🔄 Switching Between Dev and Production

### Run Development:
```bash
docker-compose -f docker-compose.dev.yml up -d
```

### Run Production:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Run Both (Different Ports & Networks):
```bash
# They use different:
# - Container names (activepieces-dev vs activepieces)
# - Ports (5433 vs 5434)
# - Networks (activepieces-dev vs activepieces)
# - Volumes (postgres_data_dev vs postgres_data)

# So they won't conflict!
docker-compose -f docker-compose.dev.yml up -d
docker-compose -f docker-compose.prod.yml up -d
```

## 📦 Data Isolation

Dev and Production use **separate volumes**:

```bash
# Development volumes
postgres_data_dev
redis_data_dev

# Production volumes
postgres_data
redis_data
```

**This means:**
- ✅ Dev and prod data are completely separate
- ✅ Can run both environments simultaneously
- ✅ Testing in dev won't affect production
- ✅ Can reset dev data without touching production

## 🎯 Environment File

Development uses: `.env.dev.backup`

**Key Settings:**
- `AP_ENVIRONMENT=dev` ← Development mode
- `AP_DEV_PIECES=ada-bmp` ← Hot reload enabled
- `AP_POSTGRES_HOST=postgres-dev` ← Dev database
- `AP_REDIS_HOST=redis-dev` ← Dev Redis

## ⚠️ Troubleshooting

### Services Won't Start:
```bash
# Check logs
docker-compose -f docker-compose.dev.yml logs

# Check health
docker ps
```

### Port Conflicts:
```bash
# Check what's using port 8080
lsof -i :8080

# Check what's using port 5433
lsof -i :5433
```

### Custom Piece Not Loading:
```bash
# Verify volume mount
docker exec activepieces-dev ls -la /usr/src/app/packages/pieces/custom/

# Check logs
docker-compose -f docker-compose.dev.yml logs activepieces | grep ada-bmp
```

### Reset Development Environment:
```bash
# Stop and remove everything including volumes
docker-compose -f docker-compose.dev.yml down -v

# Start fresh
docker-compose -f docker-compose.dev.yml up -d
```

## 🚀 Next Steps

1. **Start Dev Environment:**
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

2. **Access Application:**
   - UI: http://localhost:8080
   - Database: localhost:5433

3. **Develop Your Piece:**
   - Edit: `packages/pieces/custom/ada-bmp/`
   - Watch logs to see changes reload

4. **Test Changes:**
   - Changes are live immediately
   - No rebuild needed

## 📚 Additional Resources

- **Production Setup**: See `PRODUCTION_DEPLOYMENT.md`
- **Database Access**: See `DATABASE_ACCESS.md`
- **Docker Changes**: See `DOCKER_PRODUCTION_CHANGES.md`

---

**Your enhanced development environment is ready!** 🎉

Start developing with:
```bash
docker-compose -f docker-compose.dev.yml up -d
```
