#!/usr/bin/env bash
# Deploy Inner Health on VPS: build and start containers.
# Usage: from repo root (nextjs-project): ./deploy/deploy.sh

set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Pulling latest code..."
git fetch --prune origin
CURRENT_BRANCH="$(git branch --show-current)"
if [ -z "${CURRENT_BRANCH}" ]; then
  echo "ERROR: Unable to detect current git branch."
  exit 1
fi
if ! git merge-base --is-ancestor "HEAD" "origin/${CURRENT_BRANCH}"; then
  echo "ERROR: Local branch has commits not in origin/${CURRENT_BRANCH}. Resolve manually before deploy."
  exit 1
fi
git pull --ff-only origin "${CURRENT_BRANCH}"

# Optional: issue/renew TLS certificate and copy it into deploy/nginx/ssl.
# Usage example (before running this script):
#   export CERT_DOMAINS="innerhaealth.inetrnet.pp.ru sprintpower.inetrnet.pp.ru www.sprintpower.inetrnet.pp.ru"
#   export CERT_EMAIL=you@example.com
# Backward compatibility: CERT_DOMAIN is still supported for a single domain.
DOMAINS_INPUT="${CERT_DOMAINS:-${CERT_DOMAIN:-}}"
if [ -n "${DOMAINS_INPUT}" ] && [ -n "${CERT_EMAIL:-}" ]; then
  DOMAINS_NORMALIZED="$(echo "${DOMAINS_INPUT}" | tr ',' ' ')"
  FIRST_DOMAIN="$(echo "${DOMAINS_NORMALIZED}" | awk '{print $1}')"
  CERTBOT_DOMAIN_ARGS=""
  for d in ${DOMAINS_NORMALIZED}; do
    CERTBOT_DOMAIN_ARGS="${CERTBOT_DOMAIN_ARGS} -d ${d}"
  done

  echo "==> Issuing/renewing TLS certificate for: ${DOMAINS_NORMALIZED}"
  if command -v certbot >/dev/null 2>&1; then
    # Standalone mode: certbot binds to :80, so make sure nginx is stopped beforehand.
    # shellcheck disable=SC2086
    sudo certbot certonly --standalone --non-interactive --agree-tos \
      ${CERTBOT_DOMAIN_ARGS} -m "${CERT_EMAIL}" || echo "WARN: certbot failed, continuing without updating certificate."

    if [ -d "/etc/letsencrypt/live/${FIRST_DOMAIN}" ]; then
      echo "==> Copying certificate to deploy/nginx/ssl/ ..."
      mkdir -p deploy/nginx/ssl
      sudo cp "/etc/letsencrypt/live/${FIRST_DOMAIN}/fullchain.pem" "deploy/nginx/ssl/fullchain.pem"
      sudo cp "/etc/letsencrypt/live/${FIRST_DOMAIN}/privkey.pem" "deploy/nginx/ssl/privkey.pem"
      sudo chmod 600 deploy/nginx/ssl/privkey.pem || true
    else
      echo "WARN: /etc/letsencrypt/live/${FIRST_DOMAIN} not found; certificate was not copied."
    fi
  else
    echo "WARN: certbot not installed; skip certificate issuance. Install certbot or unset CERT_DOMAINS/CERT_EMAIL."
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

echo "==> Reloading nginx with current config..."
docker compose up -d --force-recreate nginx

echo "==> Waiting for app to be up..."
sleep 5
docker compose ps

echo "==> Done. App: http://$(hostname -I 2>/dev/null | awk '{print $1}'):80 (or your domain)"
echo "    Set RUN_MIGRATE=1 in .env if you want migrations to run on every container start (optional)."
