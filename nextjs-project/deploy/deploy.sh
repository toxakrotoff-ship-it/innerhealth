#!/usr/bin/env bash
# Deploy Inner Health on VPS: build and start containers.
# Usage: from repo root (nextjs-project): ./deploy/deploy.sh

set -e
cd "$(dirname "$0")/.."

echo "==> Pulling latest code..."
git pull

echo "==> Building and starting containers..."
docker compose build --no-cache
docker compose up -d

echo "==> Waiting for app to be up..."
sleep 5
docker compose ps

echo "==> Done. App: http://$(hostname -I 2>/dev/null | awk '{print $1}'):80 (or your domain)"
echo "    Migrations run automatically on start (RUN_MIGRATE=1)."
