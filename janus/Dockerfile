ARG BUILD_FROM=ghcr.io/home-assistant/alpine:3.19
FROM ${BUILD_FROM}

LABEL \
    io.hass.version="1.0.25" \
    io.hass.type="addon" \
    io.hass.arch="aarch64|amd64" \
    org.opencontainers.image.title="Janus" \
    org.opencontainers.image.description="AI-orchestrated residential estate operating system and command deck." \
    org.opencontainers.image.source="https://github.com/tonysafoian/janus-home-app" \
    org.opencontainers.image.licenses="Apache-2.0"

# Install Node.js 20, PostgreSQL 16 server & client, git, and system dependencies
# Runs apk upgrade to patch all base OS and C/C++ runtime libraries (musl, libstdc++, openssl, curl)
RUN (grep -q community /etc/apk/repositories || echo "https://dl-cdn.alpinelinux.org/alpine/v3.19/community" >> /etc/apk/repositories) && \
    apk update && \
    apk upgrade --no-cache && \
    apk add --no-cache \
    nodejs \
    npm \
    git \
    postgresql16 \
    postgresql16-client \
    postgresql16-contrib \
    bash \
    curl \
    jq \
    su-exec && \
    (apk add --no-cache postgresql-pgvector || apk add --no-cache pgvector || true)

WORKDIR /app

# Home Assistant executes docker build with the add-on subdirectory (janus/) as context.
# Build from the tagged release source with fallback to default branch.
ARG BUILD_VERSION="1.0.25"
ARG REPO_URL="https://github.com/tonysafoian/janus-home-app.git"
RUN (git clone --depth 1 --branch "v${BUILD_VERSION#v}" "${REPO_URL}" /tmp/repo 2>/dev/null || \
     git clone --depth 1 --branch "${BUILD_VERSION}" "${REPO_URL}" /tmp/repo 2>/dev/null || \
     git clone --depth 1 "${REPO_URL}" /tmp/repo) && \
    cp -r /tmp/repo/* /app/ && \
    cp -r /tmp/repo/.* /app/ 2>/dev/null || true && \
    rm -rf /tmp/repo

# Install production runtime dependencies only (fast, pure backend, no build tools needed)
RUN npm ci --omit=dev --no-audit --no-fund

# Make startup script executable
RUN chmod a+x /app/janus/run.sh

EXPOSE 5080

CMD [ "/app/janus/run.sh" ]
