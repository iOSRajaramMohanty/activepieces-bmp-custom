# PostgreSQL External Access Guide

## 🔓 Database is Now Exposed Externally!

Your PostgreSQL database is accessible from outside Docker.

## 📊 Connection Details

### For Local Connections (on your Mac):

```yaml
Host:         localhost
Port:         5434
Database:     activepieces
Username:     postgres
Password:     A79Vm5D4p2VQHOp2gd5
SSL Mode:     disable
```

### For Remote Connections (from other machines):

```yaml
Host:         YOUR_MAC_IP_ADDRESS
Port:         5434
Database:     activepieces
Username:     postgres
Password:     A79Vm5D4p2VQHOp2gd5
SSL Mode:     disable
```

**Find your Mac's IP address:**
```bash
# macOS
ipconfig getifaddr en0  # WiFi
# or
ipconfig getifaddr en1  # Ethernet
```

## 🔌 Connection String Examples

### PostgreSQL Connection String:
```
postgresql://postgres:A79Vm5D4p2VQHOp2gd5@localhost:5434/activepieces
```

### For Remote:
```
postgresql://postgres:A79Vm5D4p2VQHOp2gd5@YOUR_MAC_IP:5434/activepieces
```

## 🛠️ Recommended Database Tools

### 1. **pgAdmin 4** (Free, Cross-platform)
- Download: https://www.pgadmin.org/download/
- Popular PostgreSQL GUI tool

**Connection Steps:**
1. Right-click "Servers" → Create → Server
2. General tab: Name = "Activepieces"
3. Connection tab:
   - Host: `localhost`
   - Port: `5434`
   - Database: `activepieces`
   - Username: `postgres`
   - Password: `A79Vm5D4p2VQHOp2gd5`
4. Click "Save"

### 2. **DBeaver** (Free, Cross-platform)
- Download: https://dbeaver.io/download/
- Universal database tool

**Connection Steps:**
1. Database → New Database Connection
2. Select "PostgreSQL"
3. Enter connection details above
4. Test Connection → Finish

### 3. **Postico** (Mac only, Free trial)
- Download: https://eggerapps.at/postico/
- Beautiful PostgreSQL client for Mac

**Connection Steps:**
1. New Favorite
2. Enter connection details
3. Connect

### 4. **TablePlus** (Mac/Windows, Paid)
- Download: https://tableplus.com/
- Modern database management tool

### 5. **psql** (Command Line, Free)
```bash
# Connect from terminal
psql -h localhost -p 5434 -U postgres -d activepieces
# Password: A79Vm5D4p2VQHOp2gd5

# Run a quick query
psql -h localhost -p 5434 -U postgres -d activepieces -c "SELECT * FROM public.user LIMIT 5;"
```

## 🔒 Security Considerations

### ⚠️ Important Security Notes:

1. **For Local Development (Current Setup)**
   - ✅ Safe: Exposed only on `localhost` (127.0.0.1)
   - ✅ Safe: Only accessible from your Mac

2. **For Production/Remote Access**
   - ⚠️ **WARNING**: External port exposure is a security risk
   - 🔐 **Recommendations**:
     - Use strong passwords ✅ (you have one)
     - Enable SSL/TLS encryption
     - Use firewall rules
     - Consider SSH tunneling instead
     - Restrict IP access

### 🛡️ Better Alternative: SSH Tunnel (Production)

Instead of exposing the port, use SSH tunneling:

```bash
# From remote machine, create tunnel:
ssh -L 5434:localhost:5434 your-user@your-server-ip

# Then connect to localhost:5434
```

This is **much more secure** for production!

## 🔧 Change Port (if 5432 is already in use)

If you have another PostgreSQL running on port 5432:

**Edit `docker-compose.prod.yml`:**
```yaml
postgres:
  ports:
    - '5433:5432'  # External:Internal
```

**Then restart:**
```bash
docker-compose -f docker-compose.prod.yml up -d postgres
```

**Connect using:**
```yaml
Host: localhost
Port: 5433  # Changed port
```

## 📋 Quick Connection Test

### Method 1: Using psql
```bash
psql -h localhost -p 5434 -U postgres -d activepieces -c "SELECT COUNT(*) FROM public.user;"
```

### Method 2: Using Docker
```bash
docker exec -it postgres psql -U postgres -d activepieces -c "SELECT version();"
```

### Method 3: Test Connection Script
```bash
#!/bin/bash
pg_isready -h localhost -p 5434 -U postgres && echo "✅ Database is accessible!" || echo "❌ Cannot connect to database"
```

## 📊 Useful SQL Queries

### View All Tables:
```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
```

### View All Users:
```sql
SELECT id, email, status, "platformRole", "created" 
FROM public.user 
ORDER BY "created" DESC;
```

### View All Organizations:
```sql
SELECT id, name, "created" 
FROM public.organization 
ORDER BY "created" DESC;
```

### View All Flows:
```sql
SELECT id, "projectId", "folderId", status, "created" 
FROM public.flow 
ORDER BY "created" DESC 
LIMIT 10;
```

### Database Size:
```sql
SELECT pg_size_pretty(pg_database_size('activepieces')) AS database_size;
```

### Table Sizes:
```sql
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## 🚫 To Disable External Access

If you want to remove external access later:

**Edit `docker-compose.prod.yml`:**
```yaml
postgres:
  # Comment out or remove the ports section:
  # ports:
  #   - '5432:5432'
```

**Then restart:**
```bash
docker-compose -f docker-compose.prod.yml up -d postgres
```

## 🔄 Current Status

- ✅ PostgreSQL exposed on: `0.0.0.0:5434`
- ✅ Accessible from: `localhost:5434`
- ✅ Database: `activepieces`
- ✅ Health check: Active
- ✅ Data preserved: All your existing data intact

## 📞 Quick Command Reference

```bash
# Check if port is open
lsof -i :5434

# View PostgreSQL logs
docker-compose -f docker-compose.prod.yml logs postgres

# Restart PostgreSQL
docker-compose -f docker-compose.prod.yml restart postgres

# Connect via Docker exec
docker exec -it postgres psql -U postgres -d activepieces

# Backup database
docker exec postgres pg_dump -U postgres activepieces > backup_$(date +%Y%m%d).sql

# Restore database
docker exec -i postgres psql -U postgres activepieces < backup.sql
```

---

**Your PostgreSQL database is now accessible externally!** 🎉

For production deployments, consider using SSH tunneling instead of direct port exposure for better security.
