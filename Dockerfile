FROM ubuntu:22.04 AS base
# FROM node:24.14.0-bullseye-slim AS base

# Set environment variables early for better layer caching
ENV LANG=en_US.UTF-8 \
    LANGUAGE=en_US:en \
    LC_ALL=en_US.UTF-8 \
    NX_DAEMON=false \
    NX_NO_CLOUD=true \
    DEBIAN_FRONTEND=noninteractive \
    NODE_VERSION=20.19.1

# Install Node.js and system dependencies in a single layer
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        gnupg && \
    mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && \
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list && \
    apt-get update && \
    apt-get install -y --no-install-recommends \
        nodejs \
        openssh-client \
        python3 \
        g++ \
        build-essential \
        git \
        poppler-utils \
        poppler-data \
        procps \
        locales \
        unzip \
        libcap-dev && \
    sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen && \
    locale-gen en_US.UTF-8 && \
    npm install -g yarn && \
    yarn config set python /usr/bin/python3 && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

RUN export ARCH=$(uname -m) && \
    if [ "$ARCH" = "x86_64" ]; then \
      curl -fSL https://github.com/oven-sh/bun/releases/download/bun-v1.3.1/bun-linux-x64-baseline.zip -o bun.zip; \
    elif [ "$ARCH" = "aarch64" ]; then \
      curl -fSL https://github.com/oven-sh/bun/releases/download/bun-v1.3.1/bun-linux-aarch64.zip -o bun.zip; \
    fi

RUN unzip bun.zip \
    && mv bun-*/bun /usr/local/bin/bun \
    && chmod +x /usr/local/bin/bun \
    && rm -rf bun.zip bun-*

RUN bun --version

# Install global npm packages in a single layer
RUN --mount=type=cache,target=/root/.npm \
    npm install -g --no-fund --no-audit \
    node-gyp \
    npm@11.11.0 \
    pm2@6.0.10 \
    typescript@4.9.4

# Install isolated-vm globally (needed for sandboxes)
RUN --mount=type=cache,target=/root/.bun/install/cache \
    mkdir -p /tmp/bun-install && cd /tmp/bun-install && bun init -y >/dev/null 2>&1 || true && bun install isolated-vm@6.0.2 && rm -rf /tmp/bun-install

### STAGE 1: Build ###
FROM base AS build

WORKDIR /usr/src/app

# Copy only dependency files first for better layer caching
COPY .npmrc package.json bun.lock bunfig.toml ./
COPY packages/ ./packages/
# Include local workspace packages referenced as file: deps so bun can resolve them
COPY packages/pieces/community/framework ./packages/pieces/community/framework
COPY packages/shared ./packages/shared

# Do a fresh install (ignore lockfile) to allow resolving latest compatible versions
RUN --mount=type=cache,target=/root/.bun/install/cache \
    rm -f bun.lock && bun install

# Copy remaining source code (turbo config, etc.)
COPY . .

# Build frontend, engine, and server API
RUN npx turbo run build --filter=web --filter=@activepieces/engine --filter=api

# Remove piece directories not needed at runtime (keeps only the 4 pieces api imports)
# Then regenerate bun.lock so it matches the trimmed workspace
RUN rm -rf packages/pieces/core packages/pieces/custom && \
    find packages/pieces/community -mindepth 1 -maxdepth 1 -type d \
      ! -name slack \
      ! -name square \
      ! -name facebook-leads \
      ! -name intercom \
      -exec rm -rf {} + && \
    rm -f bun.lock && bun install

### STAGE 2: Run ###
FROM base AS run

WORKDIR /usr/src/app

# Install Nginx and gettext in a single layer with cache mount
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && \
    apt-get install -y --no-install-recommends nginx gettext

# Copy static configuration files first (better layer caching)
COPY nginx.react.conf /etc/nginx/nginx.conf
COPY --from=build /usr/src/app/packages/server/api/src/assets/default.cf /usr/local/etc/isolate
COPY docker-entrypoint.sh .

# Create all necessary directories in one layer
RUN mkdir -p \
    /usr/src/app/dist/packages/server \
    /usr/src/app/dist/packages/engine \
    /usr/src/app/dist/packages/shared \
    /usr/src/app/dist/packages/pieces/custom \
    /usr/src/app/dist/packages/pieces/community/framework \
    /usr/src/app/dist/packages/pieces/community/common && \
    chmod +x docker-entrypoint.sh && \
    rm -f /usr/src/package.json || true

# Copy built artifacts from build stage
COPY --from=build /usr/src/app/package.json .
COPY --from=build /usr/src/app/tsconfig.base.json .
COPY --from=build /usr/src/app/nx.json .
COPY --from=build /usr/src/app/LICENSE .
COPY --from=build /usr/src/app/dist/packages/engine/ ./dist/packages/engine/
COPY --from=build /usr/src/app/dist/packages/server/ ./dist/packages/server/
COPY --from=build /usr/src/app/dist/packages/shared/ ./dist/packages/shared/
# Ensure built pieces (community + custom) are available at runtime for linking
COPY --from=build /usr/src/app/dist/packages/pieces/community/ ./dist/packages/pieces/community/
COPY --from=build /usr/src/app/dist/packages/pieces/custom/ ./dist/packages/pieces/custom/
COPY --from=build /usr/src/app/packages ./packages

# Copy built engine
COPY --from=build /usr/src/app/dist/packages/engine/ ./dist/packages/engine/

# Regenerate lockfile and install production dependencies (pieces were trimmed from workspace)
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --production

# Copy frontend files to Nginx document root
COPY --from=build /usr/src/app/dist/packages/web /usr/share/nginx/html/

LABEL service=activepieces

ENTRYPOINT ["./docker-entrypoint.sh"]
EXPOSE 80
