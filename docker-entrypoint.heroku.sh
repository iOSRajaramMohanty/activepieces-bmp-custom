#!/bin/sh

# Set default values if not provided
export AP_APP_TITLE="${AP_APP_TITLE:-Activepieces}"
export AP_FAVICON_URL="${AP_FAVICON_URL:-https://cdn.activepieces.com/brand/favicon.ico}"

# Heroku provides PORT environment variable
export PORT="${PORT:-80}"

# Debug: Print environment variables
echo "AP_APP_TITLE: $AP_APP_TITLE"
echo "AP_FAVICON_URL: $AP_FAVICON_URL"
echo "PORT: $PORT (Heroku assigned port)"

# Process environment variables in index.html BEFORE starting services
envsubst '${AP_APP_TITLE} ${AP_FAVICON_URL}' < /usr/share/nginx/html/index.html > /usr/share/nginx/html/index.html.tmp && \
mv /usr/share/nginx/html/index.html.tmp /usr/share/nginx/html/index.html

# Generate nginx config with PORT from environment
echo "Generating nginx config for port $PORT..."
envsubst '${PORT}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

# Start Nginx server
echo "Starting nginx on port $PORT..."
nginx -g "daemon off;" &

# Start backend server
if [ "$AP_CONTAINER_TYPE" = "APP" ] && [ "$AP_PM2_ENABLED" = "true" ]; then
    echo "Starting backend server with PM2 (APP mode)"
    pm2-runtime start dist/packages/server/api/main.cjs --name "activepieces-app" --node-args="--enable-source-maps" -i 0
else
    echo "Starting backend server with Node.js (WORKER mode or default)"
    node --enable-source-maps dist/packages/server/api/main.cjs
fi
