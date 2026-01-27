# Production Setup Status

## ✅ What's Already Configured

### 1. Security Keys (✅ DONE)
- ✅ `AP_ENCRYPTION_KEY`: Secure 32-byte hex key generated
- ✅ `AP_JWT_SECRET`: Secure 32-byte hex key generated
- ✅ `AP_POSTGRES_PASSWORD`: Strong password set
- ✅ `AP_REDIS_PASSWORD`: Secure password generated

### 2. Environment (✅ DONE)
- ✅ `AP_ENVIRONMENT=prod`
- ✅ `AP_EDITION=ce`

### 3. Custom Pieces (✅ DONE)
- ✅ `AP_PIECES_SOURCE=FILE`
- ✅ `AP_PIECES_PATH=/usr/src/app/packages/pieces/custom`
- ✅ Your `ada-bmp` piece will be loaded automatically

### 4. ADA BMP Configuration (✅ DONE)
- ✅ `ADA_BMP_DEBUG=false` (production mode)
- ✅ `ADA_BMP_TIMEOUT=30000`
- ✅ `ADA_BMP_API_URL=https://bmpapistgjkt.cl.bmp.ada-asia.my` (production API)

### 5. Database & Redis (✅ DONE)
- ✅ PostgreSQL configured with secure password
- ✅ Redis configured with password authentication
- ✅ SSL enabled for database

## ⚠️ What You Need to Customize

### 1. Frontend URL (REQUIRED)
**Current:** `https://your-production-domain.com`

**Options:**
- If you have a domain: `https://activepieces.yourcompany.com`
- If testing locally: `http://localhost:8080` (or keep your ngrok URL temporarily)
- If using IP: `http://YOUR_SERVER_IP:8080`

**Update in `.env.production` line 64:**
```bash
AP_FRONTEND_URL=https://your-actual-domain.com
```

### 2. Webhook Secrets (OPTIONAL)
Only needed if using Slack or other pieces requiring webhooks.

**Current:** `your-webhook-secret`

## 📋 Quick Checklist

- [x] Secure encryption keys generated
- [x] Strong passwords set
- [x] Production environment configured
- [x] Custom piece configured
- [x] BMP API URL set to production
- [ ] **Frontend URL updated** ⬅️ **YOU NEED TO DO THIS**
- [ ] Webhook secrets (if needed)

## 🚀 Next Steps

### Step 1: Update Frontend URL

Choose your deployment scenario:

**Option A: Local/Testing**
```bash
# For testing on your Mac
AP_FRONTEND_URL=http://localhost:8080
```

**Option B: Production Domain**
```bash
# For production with domain
AP_FRONTEND_URL=https://activepieces.yourcompany.com
```

**Option C: Server IP**
```bash
# For production with IP address
AP_FRONTEND_URL=http://YOUR_SERVER_IP:8080
```

### Step 2: Copy to .env

After updating the frontend URL:
```bash
cp .env.production .env
```

### Step 3: Deploy with Enhanced Configuration

```bash
# Stop current containers
docker-compose down

# Build with enhanced production config
docker-compose -f docker-compose.prod.yml build

# Start with health checks and resource limits
docker-compose -f docker-compose.prod.yml up -d

# Watch the startup
docker-compose -f docker-compose.prod.yml logs -f activepieces
```

### Step 4: Verify Deployment

```bash
# Check health status (should show "healthy")
docker ps

# Verify custom piece loaded
docker logs activepieces | grep ada-bmp

# Test health endpoint
curl http://localhost:8080/api/v1/health
```

## 🎯 What's Your Deployment Scenario?

Tell me which scenario and I'll help you complete the setup:

1. **Testing locally on Mac** - Use localhost
2. **Production server with domain** - Use your domain name
3. **Production server with IP only** - Use IP address
4. **Using ngrok/tunnel temporarily** - Keep ngrok URL for now

## 📊 Production Features Enabled

With the enhanced `docker-compose.prod.yml`:

✅ **Health Checks**: Docker monitors service health
✅ **Resource Limits**: 
  - Activepieces: 4GB memory, 2 CPUs
  - PostgreSQL: 2GB memory, 1 CPU
  - Redis: 1GB memory, 0.5 CPU
✅ **Redis Security**: Password authentication enabled
✅ **Log Rotation**: Max 10MB × 3 files per service
✅ **Auto-restart**: Services restart on failure
✅ **Custom Piece**: Your `ada-bmp` included and ready

## 🔍 Generated Credentials

**IMPORTANT: Save these somewhere secure!**

```
AP_ENCRYPTION_KEY=26c23485df13fef62d0c3dd08d81a6e3588639b65f6b2e0366630fc1c0b899c7
AP_JWT_SECRET=93b9de6630016e594e15a70d2edc901e29a25ac3f1e8d91dbf74a8621edf5459
AP_POSTGRES_PASSWORD=pgProd_A79Vm5D4p2VQHOp2gd5_2026
AP_REDIS_PASSWORD=44Sq4sZkDExQnmuLpnfthqdhCytglkN9
```

⚠️ **Never commit `.env` to git!** (Already in .gitignore)
