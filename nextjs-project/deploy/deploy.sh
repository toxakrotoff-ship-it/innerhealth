#!/usr/bin/env bash
# Deploy Inner Health on VPS: build and start containers.
# Usage: from repo root (nextjs-project): ./deploy/deploy.sh

set -e
cd "$(dirname "$0")/.."

echo "==> Pulling latest code..."
git pull

# Optional: issue/renew TLS certificate and copy it into deploy/nginx/ssl
# Usage example (before running this script):
#   export CERT_DOMAIN=innerhaealth.inetrnet.pp.ru
#   export CERT_EMAIL=you@example.com
if [ -n "${CERT_DOMAIN:-}" ] && [ -n "${CERT_EMAIL:-}" ]; then
  echo "==> Issuing/renewing TLS certificate for ${CERT_DOMAIN} via certbot..."
  if command -v certbot >/dev/null 2>&1; then
    # Standalone mode: certbot binds to :80, so make sure nginx is stopped beforehand.
    sudo certbot certonly --standalone --non-interactive --agree-tos \
      -d "${CERT_DOMAIN}" -m "${CERT_EMAIL}" || echo "WARN: certbot failed, continuing without updating certificate."

    if [ -d "/etc/letsencrypt/live/${CERT_DOMAIN}" ]; then
      echo "==> Copying certificate to deploy/nginx/ssl/ ..."
      mkdir -p deploy/nginx/ssl
      sudo cp "/etc/letsencrypt/live/${CERT_DOMAIN}/fullchain.pem" "deploy/nginx/ssl/fullchain.pem"
      sudo cp "/etc/letsencrypt/live/${CERT_DOMAIN}/privkey.pem" "deploy/nginx/ssl/privkey.pem"
      sudo chmod 600 deploy/nginx/ssl/privkey.pem || true
    else
      echo "WARN: /etc/letsencrypt/live/${CERT_DOMAIN} not found; certificate was not copied."
    fi
  else
    echo "WARN: certbot not installed; skip certificate issuance. Install certbot or unset CERT_DOMAIN/CERT_EMAIL."
  fi
fi

echo "==> Building and starting containers..."
docker compose build --no-cache
docker compose up -d db

echo "==> Waiting for database to be healthy..."
sleep 5

echo "==> Applying migrations (one-off container)..."
docker compose run --rm app npx prisma migrate deploy

echo "==> Starting app and remaining services..."
docker compose up -d

echo "==> Waiting for app to be up..."
sleep 5
docker compose ps

echo "==> Done. App: http://$(hostname -I 2>/dev/null | awk '{print $1}'):80 (or your domain)"
echo "    Set RUN_MIGRATE=1 in .env if you want migrations to run on every container start (optional)."
