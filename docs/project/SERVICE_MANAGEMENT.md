# 🔧 Activepieces Service Management Guide

Complete guide for managing your Activepieces backend and frontend services.

---

## 📊 Quick Status Check

```bash
# Check if services are running
./scripts/check-status.sh
```

**Shows:**
- ✅ Backend API status (Port 3000)
- ✅ Frontend UI status (Port 4201)
- ✅ Process IDs (PIDs)
- ✅ Health check results

---

## 🛑 Stopping Services

### Stop All Services
```bash
./scripts/stop-all.sh
```

### Stop Backend Only
```bash
lsof -ti :3000 | xargs kill -9
```

### Stop Frontend Only
```bash
lsof -ti :4201 | xargs kill -9
```

---

## 🚀 Starting Services

### Start Both Services (Recommended)
```bash
./scripts/restart-all.sh
```

This script will:
1. Stop any running services
2. Start backend (Port 3000)
3. Start frontend (Port 4201)
4. Show status and PIDs
5. Run in background with log files

### Start Backend Only
```bash
cd /Users/rajarammohanty/Documents/POC/activepieces
./scripts/run-dev.sh
```

### Start Frontend Only
```bash
cd /Users/rajarammohanty/Documents/POC/activepieces/activepieces-admin-ui
npm start
```

---

## 🔄 Restarting Services

### Quick Restart (Both Services)
```bash
./scripts/restart-all.sh
```

### Restart Backend Only
```bash
lsof -ti :3000 | xargs kill -9
./scripts/run-dev.sh
```

### Restart Frontend Only
```bash
lsof -ti :4201 | xargs kill -9
cd activepieces-admin-ui && npm start
```

---

## 📝 Viewing Logs

### Backend Logs
```bash
# Real-time logs (when running in background)
tail -f backend.log

# Last 100 lines
tail -100 backend.log

# Search logs
grep "ERROR" backend.log
```

### Frontend Logs
```bash
# Real-time logs (when running in background)
tail -f activepieces-admin-ui/frontend.log

# Last 100 lines
tail -100 activepieces-admin-ui/frontend.log
```

---

## 🔍 Manual Port Management

### Check What's Using a Port
```bash
# Check Port 3000 (Backend)
lsof -i :3000

# Check Port 4201 (Frontend)
lsof -i :4201

# Check both ports
lsof -i :3000 -i :4201
```

### Kill Process by Port
```bash
# Kill Port 3000
lsof -ti :3000 | xargs kill -9

# Kill Port 4201
lsof -ti :4201 | xargs kill -9

# Kill both
lsof -ti :3000,:4201 | xargs kill -9
```

---

## 🎯 Common Workflows

### Daily Development
```bash
# 1. Start services
./scripts/restart-all.sh

# 2. Open application
open http://localhost:4201

# 3. Make code changes (hot reload active)

# 4. Check status anytime
./scripts/check-status.sh

# 5. Stop when done
./scripts/stop-all.sh
```

### After Backend Changes
```bash
# 1. Stop backend
lsof -ti :3000 | xargs kill -9

# 2. Make your changes

# 3. Restart backend
./scripts/run-dev.sh
```

### After Frontend Changes
```bash
# Frontend has hot reload, but if needed:

# 1. Stop frontend
lsof -ti :4201 | xargs kill -9

# 2. Make your changes

# 3. Restart frontend
cd activepieces-admin-ui && npm start
```

### Complete Restart (Clean State)
```bash
# 1. Stop everything
./scripts/stop-all.sh

# 2. Clear logs (optional)
rm -f backend.log activepieces-admin-ui/frontend.log

# 3. Restart everything
./scripts/restart-all.sh

# 4. Check status
./scripts/check-status.sh
```

---

## 🚨 Troubleshooting

### Port Already in Use

**Problem:** `Error: listen EADDRINUSE: address already in use :::3000`

**Solution:**
```bash
# Find and kill the process
lsof -ti :3000 | xargs kill -9

# Then restart
./scripts/run-dev.sh
```

### Service Won't Start

**Problem:** Service starts but immediately crashes

**Solution:**
```bash
# 1. Check logs
tail -100 backend.log
# or
tail -100 activepieces-admin-ui/frontend.log

# 2. Look for error messages
grep -i error backend.log

# 3. Check database connection
psql -d activepieces_db -c "SELECT 1;"

# 4. Try clean restart
./scripts/restart-all.sh
```

### Can't Connect to API

**Problem:** Frontend can't reach backend

**Solution:**
```bash
# 1. Check backend is running
./scripts/check-status.sh

# 2. Test API directly
curl http://localhost:3000/v1/flags

# 3. Check proxy config
cat activepieces-admin-ui/proxy.conf.json

# 4. Restart both services
./scripts/restart-all.sh
```

### High Memory Usage

**Problem:** Services consuming too much memory

**Solution:**
```bash
# 1. Check process memory
ps aux | grep node

# 2. Restart services
./scripts/restart-all.sh

# 3. Clear node modules cache (if needed)
rm -rf node_modules/.cache
```

---

## 📊 Service URLs

| Service | URL | Port |
|---------|-----|------|
| Frontend UI | http://localhost:4201 | 4201 |
| Backend API | http://localhost:3000 | 3000 |
| API Flags | http://localhost:3000/v1/flags | 3000 |
| Super Admin API | http://localhost:3000/v1/super-admin/* | 3000 |

---

## 🔐 Environment Variables

The backend uses these key environment variables (set in `run-dev.sh`):

```bash
AP_EDITION=ce                        # Community Edition
AP_MULTI_TENANT_MODE=true            # Multi-tenant enabled
AP_PUBLIC_SIGNUP_ENABLED=false       # Public signup disabled
AP_DEV_ALLOW_MULTIPLE_SIGNUPS=true   # Dev mode multiple signups
```

To modify:
```bash
# Edit run-dev.sh
nano run-dev.sh

# Then restart
./scripts/restart-all.sh
```

---

## 📁 File Locations

```
/Users/rajarammohanty/Documents/POC/activepieces/
├── scripts/run-dev.sh              # Start backend
├── scripts/restart-all.sh          # Restart both services ✨
├── scripts/stop-all.sh             # Stop both services ✨
├── scripts/check-status.sh         # Check service status ✨
├── backend.log             # Backend logs (when running in background)
└── activepieces-admin-ui/
    ├── package.json        # Frontend dependencies
    ├── angular.json        # Angular config
    ├── proxy.conf.json     # API proxy config
    └── frontend.log        # Frontend logs (when running in background)
```

---

## 💡 Tips & Best Practices

1. **Always check status first**
   ```bash
   ./scripts/check-status.sh
   ```

2. **Use the restart script for clean restarts**
   ```bash
   ./scripts/restart-all.sh
   ```

3. **Monitor logs for errors**
   ```bash
   tail -f backend.log
   ```

4. **Stop services when not in use**
   ```bash
   ./scripts/stop-all.sh
   ```

5. **Keep scripts executable**
   ```bash
   chmod +x *.sh
   ```

---

## 🎯 Quick Command Reference

```bash
# Status
./scripts/check-status.sh

# Start/Restart
./scripts/restart-all.sh

# Stop
./scripts/stop-all.sh

# Logs
tail -f backend.log
tail -f activepieces-admin-ui/frontend.log

# Manual port kill
lsof -ti :3000 | xargs kill -9
lsof -ti :4201 | xargs kill -9
```

---

## ✅ Health Checks

### Backend Health
```bash
curl -s http://localhost:3000/v1/flags | jq .
```

### Frontend Health
```bash
curl -s http://localhost:4201 > /dev/null && echo "OK" || echo "FAIL"
```

### Both Services
```bash
./scripts/check-status.sh
```

---

## 🆘 Getting Help

If you encounter issues:

1. **Check Status:** `./scripts/check-status.sh`
2. **Check Logs:** `tail -100 backend.log`
3. **Restart Services:** `./scripts/restart-all.sh`
4. **Check Documentation:** This file!

---

**Created:** 2026-01-13  
**Location:** `/Users/rajarammohanty/Documents/POC/activepieces/`  
**Scripts:** `check-status.sh`, `stop-all.sh`, `restart-all.sh`
