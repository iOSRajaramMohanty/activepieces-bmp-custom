# Production Deployment Guide for Activepieces with Custom Pieces

This guide explains how to deploy your Activepieces instance with the custom `ada-bmp` piece to production.

## ✅ What Works in Production

Your custom `ada-bmp` piece is **fully compatible with production**. It's included in the Docker image and will work exactly as it does in development.

## 🔄 Key Differences: Development vs Production

| Aspect | Development (`AP_ENVIRONMENT=dev`) | Production (`AP_ENVIRONMENT=prod`) |
|--------|-----------------------------------|-----------------------------------|
| Custom Pieces | `AP_DEV_PIECES=ada-bmp` (hot reload) | `AP_PIECES_SOURCE=FILE` (stable) |
| Security Keys | Weak keys OK | **Must use strong random keys** |
| Debug Logging | Verbose | Minimal |
| Hot Reload | Enabled | Disabled |
| SSL | Optional | **Recommended** |

## 📝 Step-by-Step Production Deployment

### Step 1: Prepare Production Environment File

```bash
# Copy the production template
cp .env.production .env

# Generate secure encryption keys
openssl rand -hex 32  # Use this for AP_ENCRYPTION_KEY
openssl rand -hex 32  # Use this for AP_JWT_SECRET
```

Edit `.env` and replace:
- `GENERATE_32_BYTE_HEX_KEY_HERE` with generated keys
- `CHANGE_ME_TO_STRONG_PASSWORD` with strong passwords
- `https://your-production-domain.com` with your actual domain
- `ADA_BMP_API_URL` with your production API URL

### Step 2: Update Key Environment Variables

**Required changes in `.env`:**

```bash
# Core Configuration
AP_ENVIRONMENT=prod

# Custom Pieces (PRODUCTION MODE)
AP_PIECES_SOURCE=FILE
AP_PIECES_PATH=/usr/src/app/packages/pieces/custom

# Remove this line (only for dev):
# AP_DEV_PIECES=ada-bmp

# Security (Generate new keys!)
AP_ENCRYPTION_KEY=<your-generated-32-byte-hex-key>
AP_JWT_SECRET=<your-generated-32-byte-hex-key>

# Database (Use strong password!)
AP_POSTGRES_PASSWORD=<your-strong-password>
AP_POSTGRES_USE_SSL=true

# Redis (Add password for security)
AP_REDIS_PASSWORD=<your-redis-password>

# Frontend URL (Your production domain)
AP_FRONTEND_URL=https://your-production-domain.com

# ADA BMP Configuration
ADA_BMP_DEBUG=false
ADA_BMP_API_URL=https://bmpapistgjkt.cl.bmp.ada-asia.my
```

### Step 3: Update docker-compose.yml for Production

Your current `docker-compose.yml` is already production-ready with:
- ✅ `restart: unless-stopped` (auto-restart on failure)
- ✅ Persistent volumes for data
- ✅ Proper networking

Optional: Add Redis password support:

```yaml
redis:
  image: 'redis:7.0.7'
  container_name: redis
  restart: unless-stopped
  command: redis-server --requirepass ${AP_REDIS_PASSWORD}  # Add this line
  volumes:
    - 'redis_data:/data'
  networks:
    - activepieces
```

### Step 4: Build and Deploy

```bash
# Build the production image
docker-compose build

# Start the services
docker-compose up -d

# Check logs
docker-compose logs -f activepieces
```

### Step 5: Verify Production Deployment

Check that your custom piece is loaded:

```bash
docker-compose logs activepieces | grep -i "ada-bmp"
```

You should see:
```
Found piece directory: /usr/src/app/packages/pieces/custom/ada-bmp
```

**But NOT** this warning (this is dev-only):
```
[WARNING]: This is only shows pieces specified in AP_DEV_PIECES
```

## 🔒 Production Security Checklist

- [ ] Changed `AP_ENVIRONMENT` to `prod`
- [ ] Generated new random `AP_ENCRYPTION_KEY` (32 bytes hex)
- [ ] Generated new random `AP_JWT_SECRET` (32 bytes hex)
- [ ] Set strong `AP_POSTGRES_PASSWORD`
- [ ] Set strong `AP_REDIS_PASSWORD`
- [ ] Updated `AP_FRONTEND_URL` to production domain
- [ ] Enabled SSL (`AP_POSTGRES_USE_SSL=true`)
- [ ] Set `ADA_BMP_DEBUG=false`
- [ ] Updated `ADA_BMP_API_URL` to production endpoint
- [ ] Removed or secured database port exposure (5433)
- [ ] Set up SSL certificate (Let's Encrypt/Cloudflare)
- [ ] Configured firewall rules
- [ ] Set up backup strategy for postgres_data volume

## 🚀 How Custom Pieces Work in Production

In production mode:

1. **No Hot Reload**: Changes require rebuild and restart
2. **File-Based Loading**: Pieces loaded from `/usr/src/app/packages/pieces/custom/`
3. **Built into Image**: Your `ada-bmp` piece is baked into the Docker image
4. **Stable**: No dev warnings or debug output
5. **Performance**: Optimized for production use

## 📦 Your Custom Piece is Included

The Dockerfile already includes your custom piece:

```dockerfile
# Line 118 of Dockerfile
COPY --from=build /usr/src/app/packages ./packages
```

This copies `/packages/pieces/custom/ada-bmp/` into the production image.

## 🔄 Updating Your Custom Piece in Production

When you update the `ada-bmp` piece:

```bash
# 1. Make your changes to the piece
# 2. Rebuild the image
docker-compose build

# 3. Restart with new image
docker-compose down
docker-compose up -d

# 4. Verify
docker-compose logs -f activepieces
```

## 🌐 Exposing to Internet

For production, you'll need:

1. **Domain Name**: Point to your server's IP
2. **Reverse Proxy**: Nginx or Traefik with SSL
3. **SSL Certificate**: Let's Encrypt (free) or commercial

Example Nginx configuration:

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 📊 Monitoring in Production

Monitor your custom piece:

```bash
# Check if piece is loaded
docker-compose exec activepieces ls -la /usr/src/app/packages/pieces/custom/ada-bmp

# View real-time logs
docker-compose logs -f activepieces | grep -i bmp

# Check resource usage
docker stats activepieces
```

## 🔧 Troubleshooting Production

**Issue**: Custom piece not found
```bash
# Solution: Verify piece is in the image
docker-compose exec activepieces ls -la /usr/src/app/packages/pieces/custom/
```

**Issue**: Environment variables not working
```bash
# Solution: Check if propagated correctly
docker-compose exec activepieces env | grep ADA_BMP
```

## 📝 Production Best Practices

1. **Version Control**: Tag your Docker images
   ```bash
   docker tag activepieces:local activepieces:v1.0.0
   ```

2. **Backups**: Regular database backups
   ```bash
   docker exec postgres pg_dump -U postgres activepieces > backup.sql
   ```

3. **Monitoring**: Set up alerts for failures

4. **Updates**: Plan maintenance windows for updates

5. **Testing**: Test piece changes in staging before production

## ✅ Your Setup is Production-Ready!

Your Docker configuration with the custom `ada-bmp` piece is already production-ready. Just update the environment variables as described above and deploy!

---

**Need Help?** Check the logs:
```bash
docker-compose logs -f activepieces
```
