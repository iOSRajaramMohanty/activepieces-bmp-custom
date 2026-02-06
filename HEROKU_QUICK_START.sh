#!/bin/bash
# Heroku Quick Deploy Script for Activepieces
# This script automates the Heroku deployment process

set -e  # Exit on error

echo "🚀 Activepieces Heroku Deployment Script"
echo "=========================================="
echo ""

# Check prerequisites
command -v heroku >/dev/null 2>&1 || { echo "❌ Heroku CLI not installed. Install from: https://devcenter.heroku.com/articles/heroku-cli"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker not installed"; exit 1; }
command -v git >/dev/null 2>&1 || { echo "❌ Git not installed"; exit 1; }

echo "✅ Prerequisites check passed"
echo ""

# App name
read -p "Enter your Heroku app name (e.g., my-activepieces): " APP_NAME

if [ -z "$APP_NAME" ]; then
    echo "❌ App name cannot be empty"
    exit 1
fi

echo ""
echo "📦 Creating Heroku app: $APP_NAME"
heroku create "$APP_NAME" || echo "App may already exist, continuing..."

echo ""
echo "🔧 Setting stack to container"
heroku stack:set container -a "$APP_NAME"

echo ""
echo "📊 Adding PostgreSQL add-on (Essential-0 - $5/month)"
heroku addons:create heroku-postgresql:essential-0 -a "$APP_NAME" || echo "Postgres may already exist"

echo ""
echo "🔴 Adding Redis add-on (Hobby-dev - Free)"
heroku addons:create heroku-redis:hobby-dev -a "$APP_NAME" || echo "Redis may already exist"

echo ""
echo "🔐 Generating security keys..."
ENCRYPTION_KEY=$(openssl rand -hex 32)
JWT_SECRET=$(openssl rand -hex 32)

echo "Generated keys (save these securely!):"
echo "AP_ENCRYPTION_KEY=$ENCRYPTION_KEY"
echo "AP_JWT_SECRET=$JWT_SECRET"
echo ""

echo "⚙️  Setting environment variables..."

# Core config
heroku config:set AP_ENVIRONMENT=prod -a "$APP_NAME"
heroku config:set AP_EDITION=ce -a "$APP_NAME"

# Security
heroku config:set AP_ENCRYPTION_KEY="$ENCRYPTION_KEY" -a "$APP_NAME"
heroku config:set AP_JWT_SECRET="$JWT_SECRET" -a "$APP_NAME"

# Database
DATABASE_URL=$(heroku config:get DATABASE_URL -a "$APP_NAME")
heroku config:set AP_POSTGRES_URL="$DATABASE_URL" -a "$APP_NAME"
heroku config:set AP_POSTGRES_USE_SSL=true -a "$APP_NAME"
heroku config:set AP_DB_TYPE=POSTGRES -a "$APP_NAME"

# Redis
REDIS_URL=$(heroku config:get REDIS_URL -a "$APP_NAME")
heroku config:set AP_REDIS_URL="$REDIS_URL" -a "$APP_NAME"
heroku config:set AP_QUEUE_MODE=REDIS -a "$APP_NAME"

# Frontend URL
heroku config:set AP_FRONTEND_URL="https://$APP_NAME.herokuapp.com" -a "$APP_NAME"

# Custom pieces
heroku config:set AP_PIECES_SOURCE=FILE -a "$APP_NAME"
heroku config:set AP_PIECES_PATH=/usr/src/app/packages/pieces/custom -a "$APP_NAME"

# ADA BMP
heroku config:set ADA_BMP_DEBUG=false -a "$APP_NAME"
heroku config:set ADA_BMP_API_URL=https://bmpapi.bmp.ada-asia.my -a "$APP_NAME"
heroku config:set ADA_BMP_TIMEOUT=30000 -a "$APP_NAME"
heroku config:set AP_SANDBOX_PROPAGATED_ENV_VARS=ADA_BMP_API_URL -a "$APP_NAME"

# Telemetry
heroku config:set AP_TELEMETRY_ENABLED=false -a "$APP_NAME"

echo ""
echo "✅ Environment variables set successfully"

echo ""
echo "📝 Adding Heroku files to git..."
git add heroku.yml Dockerfile.heroku nginx.heroku.conf.template docker-entrypoint.heroku.sh HEROKU_DEPLOYMENT.md HEROKU_QUICK_START.sh 2>/dev/null || true

echo ""
read -p "Commit and deploy now? (y/n): " DEPLOY_NOW

if [[ $DEPLOY_NOW =~ ^[Yy]$ ]]; then
    echo "💾 Committing changes..."
    git commit -m "Add Heroku deployment configuration" || echo "Nothing to commit"
    
    echo ""
    echo "🚢 Deploying to Heroku (this will take 10-15 minutes)..."
    git push heroku main || git push heroku master
    
    echo ""
    echo "⚡ Scaling to 1 dyno..."
    heroku ps:scale web=1 -a "$APP_NAME"
    
    echo ""
    echo "📊 Checking status..."
    heroku ps -a "$APP_NAME"
    
    echo ""
    echo "✅ Deployment complete!"
    echo ""
    echo "🌐 Your app is available at: https://$APP_NAME.herokuapp.com"
    echo ""
    echo "📝 Next steps:"
    echo "  1. View logs: heroku logs --tail -a $APP_NAME"
    echo "  2. Open app: heroku open -a $APP_NAME"
    echo "  3. Monitor: https://dashboard.heroku.com/apps/$APP_NAME"
    echo ""
    echo "⚠️  IMPORTANT: Save these credentials securely:"
    echo "  AP_ENCRYPTION_KEY=$ENCRYPTION_KEY"
    echo "  AP_JWT_SECRET=$JWT_SECRET"
else
    echo ""
    echo "📝 Deployment skipped. To deploy manually:"
    echo "  1. git commit -m 'Add Heroku config'"
    echo "  2. git push heroku main"
    echo "  3. heroku ps:scale web=1 -a $APP_NAME"
fi

echo ""
echo "📚 For detailed documentation, see: HEROKU_DEPLOYMENT.md"
