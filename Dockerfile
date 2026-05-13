FROM ubuntu:22.04 AS base

# Set environment variables early for better layer caching
ENV LANG=en_US.UTF-8 \
    LANGUAGE=en_US:en \
    LC_ALL=en_US.UTF-8 \
    NX_DAEMON=false \
    NX_NO_CLOUD=true \
    DEBIAN_FRONTEND=noninteractive \
    NODE_VERSION=22.15.0

# System dependencies (Node from official tarball — not NodeSource node_20.x, which can jump past this patch)
# isolated-vm: on linux/arm64 there are often no prebuilds; isolated-vm@6.x fails from-source (v8::SourceLocation).
# Use 5.0.4 for Docker — engine code only uses Isolate/Context/ExternalCopy (compatible with 5.x).
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        xz-utils \
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
        curl \
        ca-certificates \
        iptables \
        libcap-dev && \
    sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen && \
    locale-gen en_US.UTF-8 && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Pinned Node.js (must match NODE_VERSION)
RUN export ARCH=$(uname -m) && \
    if [ "$ARCH" = "x86_64" ]; then NODE_ARCH=x64; \
    elif [ "$ARCH" = "aarch64" ]; then NODE_ARCH=arm64; \
    else echo "Unsupported arch: $ARCH" && exit 1; fi && \
    curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz" -o /tmp/node.tar.xz && \
    tar -xJf /tmp/node.tar.xz -C /usr/local --strip-components=1 && \
    rm /tmp/node.tar.xz && \
    node -v && \
    npm install -g yarn && \
    yarn config set python /usr/bin/python3

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
    typescript@4.9.4 \
    esbuild@0.25.0

    

# Prebuild isolated-vm@5.0.4 into Bun install cache (arm64 Docker has no usable 6.x prebuilds)
RUN --mount=type=cache,target=/root/.bun/install/cache \
    mkdir -p /tmp/bun-install && cd /tmp/bun-install && bun init -y >/dev/null 2>&1 || true && bun install isolated-vm@5.0.4 && rm -rf /tmp/bun-install
# # Install isolated-vm globally (needed for sandboxes)
# RUN --mount=type=cache,target=/root/.npm \
#     cd /usr/src && npm install --no-fund --no-audit isolated-vm@6.0.2

### STAGE 1: Build ###
FROM base AS build

WORKDIR /usr/src/app

# Copy only dependency files first for better layer caching
COPY .npmrc package.json bun.lock bunfig.toml ./
COPY packages/ ./packages/

# Do a fresh install (ignore lockfile) to allow resolving latest compatible versions
RUN --mount=type=cache,target=/root/.bun/install/cache \
    rm -f bun.lock && bun install

# Copy remaining source code (turbo config, etc.)
COPY . .

# Build frontend, engine, server API, and worker
# vite.config.mts reads AP_BMP_ENABLED from a root .env file (loadRootEnv) and process.env.
# .dockerignore excludes .env files from the build context, so we create one here.
RUN echo "AP_BMP_ENABLED=true" > .env && \
    AP_BMP_ENABLED=true npx turbo run build --filter=web --filter=@activepieces/engine --filter=api --filter=worker

# Generate migration manifest (ordered list of migration names) for image-tag-based rollback
# esbuild bundles into dist/packages/server/api/main.js — individual module files
# are not available, so we write an empty manifest. Rollback by image tag is not
# affected in practice because migrations run forward on startup.
RUN mkdir -p packages/server/api/dist/src && \
    echo '[]' > packages/server/api/dist/src/migration-manifest.json

# BMP piece: build directly with tsc — all dependencies (shared, framework, common) are already
# compiled by turbo. Bypasses the nx prebuild target whose redundant bun install causes
# EEXIST symlink conflicts with the already-populated node_modules.
RUN cd packages/pieces/custom/ada-bmp && \
    npx tsc -p tsconfig.lib.json && \
    cp package.json dist/ && \
    cd /usr/src/app && \
    mkdir -p dist/packages/pieces/custom/ada-bmp && \
    cp -a packages/pieces/custom/ada-bmp/dist/. dist/packages/pieces/custom/ada-bmp/

# Remove piece directories not needed at runtime (keeps community pieces api imports + ada-bmp)
# packages/server/api lists @activepieces/piece-ada-bmp as workspace:* — do not delete ada-bmp
# Then production install + prune dev-only stores + pino-pretty for AP_LOG_PRETTY (runtime copies node_modules from here)
RUN rm -rf packages/pieces/core && \
    find packages/pieces/custom -mindepth 1 -maxdepth 1 -type d \
      ! -name ada-bmp \
      -exec rm -rf {} + && \
    find packages/pieces/community -mindepth 1 -maxdepth 1 -type d \
      ! -name slack \
      ! -name square \
      ! -name facebook-leads \
      ! -name intercom \
      -exec rm -rf {} + && \
    rm -f bun.lock && bun install && \
    bun install --production && \
    bun add pino-pretty@13.0.0 --no-save && \
    find node_modules/.bun -mindepth 1 -maxdepth 1 -type d \( \
      -name 'ace-builds@*' -o -name 'lucide-react@*' -o -name '@faker-js+faker@*' -o \
      -name 'turbo-linux-*' -o -name 'turbo@*' -o -name '@nx+nx-linux-*' -o -name '@nx+nx-*' -o \
      -name 'typescript@*' -o -name 'lottie-web@*' -o -name '@angular+core@*' -o \
      -name '@angular+common@*' -o -name 'posthog-js@*' -o -name 'date-fns-jalali@*' \
    \) -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -name "*.d.ts" -type f -delete 2>/dev/null || true && \
    find node_modules -name "*.map" -type f -delete 2>/dev/null || true && \
    find node_modules -name "*.md" -type f -delete 2>/dev/null || true

### STAGE 2: Run (slim — no Bun, no build toolchain) ###
FROM node:22-bookworm-slim AS run

ENV LANG=C.UTF-8 \
    LC_ALL=C.UTF-8 \
    DEBIAN_FRONTEND=noninteractive \
    NX_DAEMON=false \
    NX_NO_CLOUD=true

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        poppler-utils \
        poppler-data \
        procps \
        libcap2 \
        && apt-get clean && rm -rf /var/lib/apt/lists/*

RUN npm install -g --no-fund --no-audit pm2@6.0.10

WORKDIR /usr/src/app

COPY --from=build /usr/src/app/packages/server/api/src/assets/default.cf /usr/local/etc/isolate
COPY docker-entrypoint.sh .
RUN mkdir -p \
    /usr/src/app/dist/packages/engine \
    /usr/src/app/dist/packages/pieces/custom \
    /usr/src/app/dist/packages/web && \
    chmod +x docker-entrypoint.sh && \
    rm -f /usr/src/package.json || true

COPY --from=build /usr/src/app/package.json .
COPY --from=build /usr/src/app/tsconfig.base.json .
COPY --from=build /usr/src/app/nx.json .
COPY --from=build /usr/src/app/LICENSE .
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist/packages/engine/ ./dist/packages/engine/
COPY --from=build /usr/src/app/dist/packages/pieces/custom/ ./dist/packages/pieces/custom/
COPY --from=build /usr/src/app/packages/server ./packages/server
COPY --from=build /usr/src/app/packages/shared ./packages/shared
COPY --from=build /usr/src/app/packages/pieces ./packages/pieces
COPY --from=build /usr/src/app/dist/packages/pieces/custom/ada-bmp/ ./packages/pieces/custom/ada-bmp/dist/

# Copy workspace package.json files (needed for bun workspace resolution)
COPY --from=build /usr/src/app/packages ./packages

# Copy built engine
# COPY --from=build /usr/src/app/dist/packages/engine/ ./dist/packages/engine/

# Copy bun from build stage (needed to resolve workspace:* protocol in package.json files)
COPY --from=build /usr/local/bin/bun /usr/local/bin/bun

# Install production dependencies
# RUN --mount=type=cache,target=/root/.bun/install/cache \
#     bun install --production

# Copy frontend files
COPY --from=build /usr/src/app/dist/packages/web ./dist/packages/web/

LABEL service=activepieces

ENTRYPOINT ["./docker-entrypoint.sh"]
EXPOSE 80
