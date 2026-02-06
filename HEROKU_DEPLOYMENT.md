# Heroku Deployment Guide - Activepieces with Custom Pieces

This guide covers deploying your Activepieces instance with the custom `ada-bmp` piece to Heroku using Container Registry.

## Prerequisites

- ✅ Heroku CLI installed
- ✅ Docker running locally
- ✅ Git repository initialized
- ✅ Heroku account (free tier works for testing)

## Step 1: Initial Setup

```bash
# Login to Heroku
heroku login

# Login to Container Registry
heroku container:login

# Create a new Heroku app
heroku create your-activepieces-app

# Or use existing app
# heroku git:remote -a your-existing-app-name

# Set stack to container
heroku stack:set container -a your-activepieces-app
```

## Step 2: Add Required Add-ons

### PostgreSQL Database

```bash
# Add Heroku Postgres (free tier: hobby-dev)
heroku addons:create heroku-postgresql:essential-0

# Check database credentials
heroku config:get DATABASE_URL
```

### Redis Cache

```bash
# Add Heroku Redis (free tier: hobby-dev)
heroku addons:create heroku-redis:hobby-dev

# Check Redis credentials
heroku config:get REDIS_URL
```

## Step 3: Set Environment Variables

Generate secure keys:
```bash
# Generate encryption key
openssl rand -hex 32

# Generate JWT secret
openssl rand -hex 32
```

Set required environment variables:

```bash
# Core Configuration
heroku config:set AP_ENVIRONMENT=prod
heroku config:set AP_EDITION=ce

# Security Keys (use generated values above)
heroku config:set AP_ENCRYPTION_KEY=<your-generated-32-byte-hex>
heroku config:set AP_JWT_SECRET=<your-generated-32-byte-hex>

# Database (Heroku Postgres automatically sets DATABASE_URL)
# Map DATABASE_URL to Activepieces variables
heroku config:set AP_POSTGRES_URL=$(heroku config:get DATABASE_URL)

# Alternatively, if you need individual components:
# heroku config:set AP_POSTGRES_HOST=<from DATABASE_URL>
# heroku config:set AP_POSTGRES_PORT=5432
# heroku config:set AP_POSTGRES_DATABASE=<from DATABASE_URL>
# heroku config:set AP_POSTGRES_USERNAME=<from DATABASE_URL>
# heroku config:set AP_POSTGRES_PASSWORD=<from DATABASE_URL>
heroku config:set AP_POSTGRES_USE_SSL=true

# Redis (Heroku Redis automatically sets REDIS_URL)
heroku config:set AP_REDIS_URL=$(heroku config:get REDIS_URL)

# Queue Mode
heroku config:set AP_QUEUE_MODE=REDIS

# Frontend URL (use your Heroku app URL)
heroku config:set AP_FRONTEND_URL=https://your-activepieces-app.herokuapp.com

# Custom Pieces
heroku config:set AP_PIECES_SOURCE=FILE
heroku config:set AP_PIECES_PATH=/usr/src/app/packages/pieces/custom

# ADA BMP Configuration
heroku config:set ADA_BMP_DEBUG=false
heroku config:set ADA_BMP_API_URL=https://bmpapi.bmp.ada-asia.my
heroku config:set ADA_BMP_TIMEOUT=30000
heroku config:set AP_SANDBOX_PROPAGATED_ENV_VARS=ADA_BMP_API_URL

# Webhook Secrets (if using Slack)
heroku config:set AP_APP_WEBHOOK_SECRETS='{"@activepieces/piece-slack": {"webhookSecret": "your-slack-webhook-secret"}}'

# Telemetry (optional - disable for privacy)
heroku config:set AP_TELEMETRY_ENABLED=false
```

## Step 4: Deploy to Heroku

### Option A: Using Git Push (Recommended)

```bash
# Add heroku.yml to git
git add heroku.yml Dockerfile.heroku nginx.heroku.conf.template docker-entrypoint.heroku.sh

# Commit changes
git commit -m "Add Heroku deployment configuration"

# Push to Heroku
git push heroku main

# Or if your branch is named differently:
# git push heroku your-branch:main
```

### Option B: Using Heroku CLI

```bash
# Build and push the Docker image
heroku container:push web

# Release the image
heroku container:release web
```

## Step 5: Scale and Monitor

```bash
# Scale to 1 dyno (free tier allows 1)
heroku ps:scale web=1

# Check dyno status
heroku ps

# View logs
heroku logs --tail

# Check app info
heroku apps:info
```

## Step 6: Access Your Application

```bash
# Open the app in browser
heroku open

# Your app will be available at:
# https://your-activepieces-app.herokuapp.com
```

## Important Notes

### Memory Requirements

The free dyno has **512MB RAM**, which may not be enough for Activepieces with sandbox execution. Consider:

- **Hobby dyno ($7/month)**: 512MB RAM
- **Standard-1X ($25/month)**: 512MB RAM
- **Standard-2X ($50/month)**: 1GB RAM (Recommended minimum)
- **Performance-M ($250/month)**: 2.5GB RAM (Ideal)

Check dyno types:
```bash
heroku ps:type
```

Upgrade dyno:
```bash
heroku ps:type standard-2x
```

### Ephemeral Filesystem

Heroku dynos have ephemeral filesystems - files written to disk are lost on restart. This affects:

1. **Cache directory** (`/usr/src/app/cache`) - Flow sandbox caches
2. **Uploaded files** - Consider using S3 for file storage

To use S3 for file storage:
```bash
heroku config:set AP_FILE_STORAGE_LOCATION=S3
heroku config:set AP_S3_BUCKET=your-bucket-name
heroku config:set AP_S3_ACCESS_KEY_ID=your-access-key
heroku config:set AP_S3_SECRET_ACCESS_KEY=your-secret-key
heroku config:set AP_S3_REGION=us-east-1
```

### Database Migrations

Activepieces runs migrations automatically on startup. First deployment will take longer.

### SSL/TLS

Heroku provides free SSL for `*.herokuapp.com` domains. For custom domains:

```bash
# Add custom domain
heroku domains:add www.yourdomain.com

# Heroku will provide DNS target - add CNAME record in your DNS

# SSL is automatic with Heroku's ACM
```

## Troubleshooting

### App Crashes on Startup

```bash
# Check logs
heroku logs --tail

# Common issues:
# 1. Missing environment variables
heroku config

# 2. Database not accessible
heroku pg:info

# 3. Memory issues
heroku ps:type standard-2x
```

### Database Connection Issues

```bash
# Verify DATABASE_URL is set
heroku config:get DATABASE_URL

# Test database connection
heroku pg:psql

# Check SSL requirement
heroku config:set AP_POSTGRES_USE_SSL=true
```

### Redis Connection Issues

```bash
# Verify REDIS_URL is set
heroku config:get REDIS_URL

# Check Redis status
heroku redis:info
```

### Build Failures

```bash
# Check build logs
heroku builds

# View specific build
heroku builds:info <build-id>

# Common fixes:
# 1. Ensure Dockerfile.heroku exists
# 2. Ensure heroku.yml is committed
# 3. Check Docker build locally first
```

## Monitoring and Maintenance

### View Application Metrics

```bash
# Open metrics dashboard
heroku dashboard

# Or visit: https://dashboard.heroku.com/apps/your-app/metrics
```

### Database Backups

```bash
# Create manual backup
heroku pg:backups:capture

# List backups
heroku pg:backups

# Download backup
heroku pg:backups:download
```

### Update Application

```bash
# Make changes to code
git add .
git commit -m "Update application"

# Deploy
git push heroku main

# Or rebuild container
heroku container:push web
heroku container:release web
```

## Cost Estimate (Monthly)

| Resource | Free Tier | Recommended |
|----------|-----------|-------------|
| **Dyno** | Free (sleeps after 30min) | Standard-2X ($50) |
| **Postgres** | Free (10k rows) | Essential-0 ($5) or higher |
| **Redis** | Free (25MB) | Premium-0 ($15) or higher |
| **Total** | $0 | ~$70/month |

## Security Best Practices

1. ✅ Use strong encryption keys (generated with openssl)
2. ✅ Enable SSL (`AP_POSTGRES_USE_SSL=true`)
3. ✅ Don't commit sensitive values to git
4. ✅ Use Heroku config vars for secrets
5. ✅ Regularly rotate encryption keys in production
6. ✅ Enable Heroku's Automated Certificate Management (ACM)
7. ✅ Monitor logs for suspicious activity

## Next Steps

After successful deployment:

1. **Create first user** - Visit your app and sign up
2. **Test custom piece** - Create a flow using the `ada-bmp` piece
3. **Set up monitoring** - Use Heroku metrics or external APM
4. **Configure webhooks** - Update webhook URLs in external services
5. **Set up backups** - Schedule regular database backups

## Support and Resources

- [Heroku Container Registry Documentation](https://devcenter.heroku.com/articles/container-registry-and-runtime)
- [Heroku Postgres Documentation](https://devcenter.heroku.com/articles/heroku-postgresql)
- [Heroku Redis Documentation](https://devcenter.heroku.com/articles/heroku-redis)
- [Activepieces Documentation](https://www.activepieces.com/docs)

---

**Need help?** Check the troubleshooting section or review Heroku logs with `heroku logs --tail`
